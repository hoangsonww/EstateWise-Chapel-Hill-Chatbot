import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import {
  getGeminiModelCandidates,
  getRotatedModelCandidates,
  runWithGeminiModelFallback,
} from "./geminiModels.service";
import lib from "../utils/lib";
import {
  queryPropertiesAsString,
  queryProperties,
  RawQueryResult,
} from "../scripts/queryProperties";
import { isNeo4jEnabled } from "../graph/neo4j.client";
import { getSimilarByZpid } from "../graph/graph.service";

/**
 * Chain-of-Thought prompt to guide the models.
 * Instructs the model to produce step-by-step reasoning before the final answer.
 */
const COT_PROMPT = `Let's think step by step. Show your chain of thought before the final answer.`;

/**
 * Hidden Chain-of-Thought prefix for internal reasoning.
 * Instructs the model to think step-by-step internally without exposing reasoning.
 */
const HIDDEN_COT = `
You will think through this request step-by-step internally;
You do not need to explain your reasoning to the user, just make sure that your responses
are of high quality.
`.trim();

/**
 * Utility to wrap any system instruction with the hidden CoT prefix.
 */
function wrapWithHiddenCoT(mainInstruction: string): string {
  return `${HIDDEN_COT}\n\n${mainInstruction}`;
}

/**
 * Function to perform K-Means clustering on a set of data points. It
 * assigns each data point to one of k clusters based on the
 * Euclidean distance to the cluster centroids.
 *
 * It will return the cluster assignments for each data point.
 *
 * Under the hood, Pinecone queries also use kNN. So, by using both
 * kNN and K-Means in our code, we can achieve a more efficient and
 * effective clustering process.
 *
 * @param data - 2D array of data points (each point is an array of numbers)
 * @param k - number of clusters
 * @param maxIter - maximum number of iterations for convergence
 * @return - object containing the cluster assignments for each data point
 */
function kmeans(
  data: number[][],
  k: number,
  maxIter = 20,
): { clusters: number[] } {
  const n = data.length;
  if (n === 0 || k <= 0) {
    return { clusters: [] };
  }
  const dims = data[0].length;
  // initialize centroids picking first k points (or fewer if n < k)
  let centroids = data.slice(0, Math.min(k, n)).map((v) => v.slice());
  // if n < k, pad centroids by repeating last
  while (centroids.length < k) {
    centroids.push(data[data.length - 1].slice());
  }
  const assignments = new Array(n).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // assignment step
    for (let i = 0; i < n; i++) {
      let minDist = Infinity;
      let cluster = 0;
      for (let c = 0; c < k; c++) {
        let dist = 0;
        for (let d = 0; d < dims; d++) {
          const diff = data[i][d] - centroids[c][d];
          dist += diff * diff;
        }
        if (dist < minDist) {
          minDist = dist;
          cluster = c;
        }
      }
      if (assignments[i] !== cluster) {
        assignments[i] = cluster;
        changed = true;
      }
    }
    // if no assignment changed, we've converged
    if (!changed) break;
    // update step
    const sums = Array(k)
      .fill(0)
      .map(() => Array(dims).fill(0));
    const counts = Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < dims; d++) {
        sums[c][d] += data[i][d];
      }
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) {
        for (let d = 0; d < dims; d++) {
          centroids[c][d] = sums[c][d] / counts[c];
        }
      }
    }
  }

  return { clusters: assignments };
}

const CLUSTER_COUNT = 4;

// context object so we can cache and reuse pinecone results
export interface EstateWiseContext {
  rawResults?: RawQueryResult[];
  propertyContext?: string;
}

/**
 * Chat with EstateWise Assistant using Google Gemini AI.
 * This uses a Mixture-of-Experts (MoE) with Reinforcement Learning
 * to generate more informed responses. Includes a kMeans clustering
 * algorithm (with norm.) to group properties based on their features.
 *
 * Note: When deployed on Vercel, this may cause a timeout due to
 * Vercel's 60s limit, and our approach requires at least 6 AI
 * calls (6 experts + 1 merger).
 *
 * @param history - The conversation history, including previous messages.
 * @param message - The new message to send.
 * @param userContext - Additional context provided by the user.
 * @param expertWeights - Weights for each expert to influence their responses.
 */
export async function chatWithEstateWise(
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  message: string,
  userContext: EstateWiseContext = {},
  expertWeights: Record<string, number> = {},
): Promise<{ finalText: string; expertViews: Record<string, string> }> {
  if (typeof userContext !== "object" || userContext === null) {
    userContext = {};
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const modelCandidates = await getGeminiModelCandidates(apiKey);
  const startTime = Date.now();
  const TIMEOUT_MS = 50_000; // 50 seconds

  // ─── SPEED OPT: TRIM LONG HISTORIES ─────────────────────────────────
  const MAX_HISTORY = 20;
  const effectiveHistory = history.slice(-MAX_HISTORY);

  // ─── 1) Fetch or skip property context and raw results ───────────────────
  const dataNotFetched = lib(message);
  let propertyContext: string;
  let rawResults: RawQueryResult[];

  if (!dataNotFetched || !userContext.rawResults) {
    try {
      [propertyContext, rawResults] = await Promise.all([
        queryPropertiesAsString(message, 50),
        queryProperties(message, 50),
      ]);
      userContext.propertyContext = propertyContext;
      userContext.rawResults = rawResults;
    } catch (err: any) {
      console.error("Error fetching property data:", err);
      if (err?.message?.includes("rate limit") || err?.status === 429) {
        throw new Error(
          "Rate limit reached with Google AI API. Please try again in a moment.",
        );
      } else if (err?.message?.toLowerCase().includes("pinecone")) {
        throw new Error("Error with property database. Please try again.");
      } else {
        throw new Error("Error fetching property data. Please try again.");
      }
    }
  } else {
    propertyContext = userContext.propertyContext!;
    rawResults = userContext.rawResults!;
  }

  // ─── 1.5) Only compute clustering if we have rawResults ────────────────
  let combinedPropertyContext: string;
  if (rawResults.length > 0) {
    const featureVectors: number[][] = rawResults.map((r) => {
      const m = r.metadata;
      const price =
        typeof m.price === "number"
          ? m.price
          : parseFloat(String(m.price).replace(/[^0-9.-]+/g, "")) || 0;
      const bedrooms = Number(m.bedrooms) || 0;
      const bathrooms = Number(m.bathrooms) || 0;
      const livingArea =
        typeof m.livingArea === "string"
          ? parseFloat(m.livingArea.replace(/[^0-9.]/g, "")) || 0
          : Number(m.livingArea) || 0;
      const yearBuilt = Number(m.yearBuilt) || 0;
      return [price, bedrooms, bathrooms, livingArea, yearBuilt];
    });

    // Normalize feature vectors
    const dims = featureVectors[0]?.length ?? 0;
    const mins = Array(dims).fill(Infinity);
    const maxs = Array(dims).fill(-Infinity);
    featureVectors.forEach((vec) =>
      vec.forEach((val, i) => {
        if (val < mins[i]) mins[i] = val;
        if (val > maxs[i]) maxs[i] = val;
      }),
    );
    const normalized = featureVectors.map((vec) =>
      vec.map((val, i) =>
        maxs[i] === mins[i] ? 0 : (val - mins[i]) / (maxs[i] - mins[i]),
      ),
    );

    // Cluster
    const { clusters: clusterAssignments } = kmeans(normalized, CLUSTER_COUNT);

    // Build cluster text
    const clusterContext = rawResults
      .map((r, i) => `- Property ID ${r.id}: cluster ${clusterAssignments[i]}`)
      .join("\n");

    // Optionally fetch graph-based similar properties for explainability
    let graphContext = "";
    try {
      if (isNeo4jEnabled()) {
        const top = rawResults[0]?.metadata?.zpid;
        if (top != null) {
          const similars = await getSimilarByZpid(Number(top), 5);
          if (similars.length) {
            const lines = similars.map((s, i) => {
              const a = s.property;
              const addr = [a.streetAddress, a.city, a.state, a.zipcode]
                .filter(Boolean)
                .join(", ");
              const why = s.reasons.length
                ? ` (because: ${s.reasons.join(", ")})`
                : "";
              return `${i + 1}. ${addr} — $${a.price ?? "N/A"}${why}`;
            });
            graphContext = `\nGraph Similarities (top 5):\n${lines.join("\n")}`;
          }
        }
      }
    } catch (_) {
      // Graph is optional; ignore errors
    }

    combinedPropertyContext = `
      ${propertyContext}

      Cluster Assignments:
      ${clusterContext}
      ${graphContext}
    `.trim();
  } else {
    combinedPropertyContext = "";
  }

  // ─── 2) Base system instruction (used for all experts) ─────────────────
  const baseSystemInstruction = `
    You are EstateWise Assistant, an expert real estate concierge for Chapel Hill, NC, USA. You help users find their dream homes by providing personalized property recommendations based on their preferences and needs. You have access to a database of detailed property records, including information about the properties, their locations, and their features.

    Below is a current list of detailed property records from our database. Use ALL THE DATA in the property records to provide the best recommendations. You can also use the user's additional context to tailor your recommendations:
    ---------------------------------------------------------
    ${combinedPropertyContext || "None available. Please use your own knowledge and the provided conversation history and answer conversationally."}
    ---------------------------------------------------------

    When recommending properties, do the following:
    1. For each property, list the full address (street, city, state, zipcode), price, number of bedrooms, number of bathrooms, living area (in sqft), year built, and home type.
    2. Include the property description.
    3. Always provide a direct link to the property's Zillow page using its Zillow id. Use this exact format:
         More details: https://www.zillow.com/homedetails/{zpid}_zpid/
       Ensure to replace {zpid} with the actual Zillow id. Keep the link format consistent. No extra symbols or texts inside the link. Do NOT add a '\\\\' before the '_zpid'. PLEASE DO NOT ADD \\\\ BEFORE THE '_zpid'.
    4. Present your answer in a clear, numbered list so the user can easily see all options.
    5. Use the property data to create engaging, detailed, and actionable recommendations. Present a top few options first, and then provide additional options based on the user's preferences and feedback.
    6. If the user provides additional context or preferences, adjust your recommendations accordingly.
    7. Format your responses in a way that is easy to read and understand. Use structures like bullet points, tables, or numbered lists where appropriate.
    7.1. DO NOT ask the user. Just give them the recommendations/options first, and ask for follow-up questions only if needed. DO NOT ask more questions unnecessarily. DO NOT ASK ANY QUESTIONS OR TELLING THEM TO PROVIDE MORE INFO - Just give them the recommendations/options first, based on all the info you currently have.
    7.2. You MUST use the conversation history to provide context and tailor your recommendations.
    7.3. Give a table whenever possible to present the data in a clear and organized manner. Use markdown tables for better readability.
    7.4. In the case the data misses some values, or N/A values, just try to answer the user to the best of your ability. Give all the available information that you have. Don't say you cannot answer or fulfill the user's request. Just give them the best answer you can based on the data you have. Also tell the user to ask more specific questions if they want more details or data.
    7.5. Never says you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give.

    8. **Whenever** the user asks for a comparison, distribution, or trend (e.g. “show me price trends”, “how many bedrooms?”, “compare year built”), you **must** append a valid Chart.js spec in its own code block tagged \`chart-spec\`.

    9. Here’s a minimal chart example you should follow exactly:

    \`\`\`chart-spec
    {
      "type": "bar",
      "data": {
        "labels": ["2 beds","3 beds","4 beds"],
        "datasets":[
          {
            "label":"Number of Homes",
            "data":[12, 8, 5]
          }
        ]
      },
      "options": {
        "responsive": true,
        "plugins": { "legend": { "position": "top" } }
      }
    }
    \`\`\`

    - **Do not** include any extra text or markdown in that block—only the raw JSON.
    - If no chart is needed, simply omit the block.
    - Ensure that you give a valid JSON object in the block, and all the charts are valid Chart.js specs. This is very important because the UI will parse this JSON and render it. If the JSON is invalid, it will break the UI.
    - Make sure to use the correct chart type and data format for each chart. You can refer to the Chart.js documentation for more details on how to create different types of charts and their respective data formats.
    - Ensure that you generate at least 1 chart related to the properties recommendations that you provide, and one chart related to the entire data that you were provided with.

    10. **Allowed chart types:** you may only ever output one of the built-in Chart.js types:
     \`"bar"\`, \`"line"\`, \`"pie"\`, \`"doughnut"\`, \`"radar"\`, \`"polarArea"\`, \`"bubble"\`, or \`"scatter"\`.
     – If you need a “histogram,” use \`"bar"\` with full-width bars (set \`categoryPercentage\` and \`barPercentage\` to 1).
     – All trend-lines (e.g. price vs. area) must be \`"line"\`.

    11. Every time you list properties, you must generate at least one relevant chart. Use the data you have to create a chart that is relevant to the properties listed.

    12. Make sure your responses, while detailed, are concise and to the point. Avoid unnecessary verbosity or repetition. And must not be too long. And avoid asking additional questions. Just give user the recommendations/options first, and ask for follow-up questions only if needed.

    12.1. Do NOT take too long to respond. Time is of the essence. You must respond quickly and efficiently, without unnecessary delays.

    12.2. Keep in mind that the dataset available to you here is only the top 50 properties based on the user's query. You do not have access to the entire dataset. So, you must be careful about how you present the data and avoid making any assumptions about the completeness of the dataset. Maybe display a disclaimer at the bottom of the response, such as "Note: The dataset is limited to the top 50 properties based on your query. For a more comprehensive analysis, provide additional context or preferences.".

    12.3. Limit your response so that it is not too verbose. And you must ensure that you don't take too long to answer. You must respond quickly and efficiently, without unnecessary delays.

    12.4. When the user asks about your identity, how you were created, how you were trained, or similar questions, you must respond with something like "I am EstateWise Assistant, an AI-powered real estate concierge designed to help you find your dream home in Chapel Hill, NC. I was created using various advanced machine learning techniques and trained on a diverse dataset of real estate information." But don't state this unnecessarily. Only respond to this question if the user asks about it.
    Be sure to keep it concise and avoid going into too much detail about the technical aspects of your creation or training. You can also mention that you are constantly learning and improving to provide better recommendations and insights for users like them. Note that users can give feedback, either through messages or thumbs up/down buttons, to help improve your performance and accuracy over time. This feedback is used to refine your algorithms and enhance your understanding of user preferences and needs.

    12.5. Respond conversationally and naturally. For example, if the user says "Hi there", you can respond with "Hello! How can I assist you today?" or "Hi! What can I help you with today?". If the user says "Thanks", you can respond with "You're welcome! If you have any more questions, feel free to ask." or "No problem! I'm here to help." Do the same for all questions and responses.

    12.6. Do NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.

    Additional context: ${userContext || "None provided."}
  `;

  // ─── 3) Define your experts with very detailed instructions ────────────────
  const experts = [
    {
      name: "Data Analyst",
      instructions: `
        You are the Data Analyst. Focus on extracting statistics, distributions, and trends in the property data. Provide breakdowns (avg price, bedroom counts, area distributions) and, when relevant, include a Chart.js code block showing these metrics. Keep language concise and data-driven.
      `.trim(),
    },
    {
      name: "Lifestyle Concierge",
      instructions: `
        You are the Lifestyle Concierge. Emphasize lifestyle fit—nearby schools, parks, restaurants, commute times, and community vibes. Do not overload with raw numbers; frame features in terms of daily living and comfort.
      `.trim(),
    },
    {
      name: "Financial Advisor",
      instructions: `
        You are the Financial Advisor. Highlight price trends, mortgage/payment estimates, ROI potential, tax implications, and any financing options. Provide bullet points on cost analysis and include a chart if illustrating financial comparisons.
      `.trim(),
    },
    {
      name: "Neighborhood Expert",
      instructions: `
        You are the Neighborhood Expert. Provide insights on safety, demographic trends, noise levels, walkability scores, and future development. Use tables or bullets for clarity; charts only if showing comparative ratings.
      `.trim(),
    },
    {
      name: "Cluster Analyst",
      instructions: `
        You are the Cluster Analyst. You have clustered the available homes into ${CLUSTER_COUNT} groups based on features (price, beds, baths, living area, year built). Generate a Chart.js \`scatter\` spec (in a \`chart-spec\` code block) plotting living area (x-axis) vs. price (y-axis), with each cluster as a separate dataset, and title each dataset "Cluster {index}". Then, summarize in bullet points the key characteristics of each cluster (e.g., "Cluster 0: mostly high-price, large homes"). NEVER says things like "No Data" for any cluster. You must ensure your clusters are meaningful and relevant to the user's query.
      `.trim(),
    },
  ];

  // ─── 4) Build your weight map (no normalization) ─────────────────────────
  const CLUSTER_KEY = "Cluster Analyst";
  const weights: Record<string, number> = {};

  // fix cluster at 1
  weights[CLUSTER_KEY] = 1;

  // clamp every other expert’s weight into [0.1,2.0], defaulting to 1
  experts.forEach((e) => {
    if (e.name === CLUSTER_KEY) return;
    const raw = expertWeights[e.name] ?? 1;
    weights[e.name] = Math.min(Math.max(raw, 0.1), 2.0);
  });

  // ─── 5) Prepare common generation & safety config ─────────────────────────
  const genAI = new GoogleGenerativeAI(apiKey);
  const generationConfig = {
    temperature: 1,
    topP: 0.95,
    topK: 64,
    maxOutputTokens: 8192,
  };
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_NONE,
    },
  ];

  // ─── 6) Run each expert in parallel ─────────────────────────────────────
  const expertPromises = experts.map(async (expert) => {
    const systemInstruction = wrapWithHiddenCoT(
      baseSystemInstruction + "\n\n" + expert.instructions,
    );
    const result = await runWithGeminiModelFallback(
      modelCandidates,
      async (modelName) => {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });
        const chat = model.startChat({
          generationConfig,
          safetySettings,
          history: effectiveHistory,
        });
        return chat.sendMessage(message);
      },
    );
    return {
      name: expert.name,
      text: result.response.text(),
    };
  });

  let expertResults;
  try {
    expertResults = await Promise.all(expertPromises);
  } catch (err: any) {
    console.error("Error from Google AI API:", err);
    if (err?.message?.includes("rate limit") || err?.status === 429) {
      throw new Error(
        "Rate limit reached with Google AI API. Please try again in a moment.",
      );
    } else {
      throw new Error("Error with Google AI API. Please try again.");
    }
  }

  // ─── 7) Build merger instruction, including expert weights ──────────────
  const mergerInstruction = `
    You are the EstateWise Master Agent. You have now received input from five specialized agents.

    Use their responses to create a **coherent** and **concise** recommendation for the user. Focus on answering the user's queries in a natural and conversational manner, while also ensuring that the response is informative and engaging.

    Below are their responses along with their relative weights (importance):

    ${expertResults
      .map(
        (r) => `**${r.name}** (weight: ${weights[r.name].toFixed(2)}):
    ${r.text}`,
      )
      .join("\n\n")}

    Now, synthesize these five expert opinions into **one unified** final recommendation for the user. Follow all of the original EstateWise instructions (including numbering, full property details, chart-spec blocks when needed, concise format, and no extra markdown around charts). Use the expert weights to prioritize which insights to emphasize, but produce a single cohesive response exactly as the user expects from EstateWise Assistant.

    If any expert gives a conflicting or contradictory answer, you must resolve it in a way that is consistent with the overall context and the user's needs. For example, if one or more model(s) does not give any recommendations, you must still provide a recommendation based on the other models' responses. Never say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give.
    
    If any expert gives a recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the expert(s) have provided some recommendations. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

    Once again, just give user the recommendations/options first, and ask for follow-up questions only if needed. PLEASE DO NOT ASK ANY QUESTIONS OR TELLING THEM TO PROVIDE MORE INFO - Just give them the recommendations/options first, based on all the info you currently have. DO NOT ASK MORE QUESTIONS UNNECESSARILY. **IMPORTANT:** DO NOT ASK THE USER - Just give them recommendations based on all the info you currently have.

    Also, you must NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. There are always some recommendations or results that you can give based on the data you have.

    If an expert gives any recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the expert(s) have provided some recommendations. DO NOT OMIT ANY EXPERT'S RECOMMENDATIONS. You must include all of them in your final response, even if they are not relevant to the user's query. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

    Even if the experts say it has exhausted all properties with the given criteria, if any properties are suggested, even if they do not match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.
  `;

  // ─── 8) Final, merged call with timeout fallback ─────────────────────────
  const resultOrTimeout = await runWithGeminiModelFallback(
    modelCandidates,
    async (modelName) => {
      const mergerModel = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: wrapWithHiddenCoT(
          mergerInstruction + "\n\n" + baseSystemInstruction,
        ),
      });
      const mergerChat = mergerModel.startChat({
        generationConfig,
        safetySettings,
        history: effectiveHistory,
      });

      // race between the merge call and the 50s timer
      const mergePromise = mergerChat.sendMessage(message);
      const remaining = TIMEOUT_MS - (Date.now() - startTime);
      return Promise.race([
        mergePromise,
        new Promise((resolve) =>
          setTimeout(() => resolve({ timeout: true }), Math.max(0, remaining)),
        ),
      ]);
    },
  );

  let finalText: string;
  if ((resultOrTimeout as any).timeout) {
    // timed out → pick highest‐weight expert
    const best = expertResults.reduce((a, b) =>
      weights[b.name] > weights[a.name] ? b : a,
    );
    finalText = `${best.text}`;
  } else {
    finalText = (resultOrTimeout as any).response.text();
  }

  // ─── 9) Return both the merged text and each expert view so the UI can toggle them
  const expertViews: Record<string, string> = {};
  expertResults.forEach((r) => {
    expertViews[r.name] = r.text;
  });

  return { finalText, expertViews };
}

/**
 * Streaming version of chatWithEstateWise that yields tokens as they are generated.
 * This is an async generator function that yields chunks of the response.
 */
export async function* chatWithEstateWiseStreaming(
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  message: string,
  userContext: EstateWiseContext = {},
  expertWeights: Record<string, number> = {},
): AsyncGenerator<
  | { type: "token"; token: string }
  | { type: "expertViews"; expertViews: Record<string, string> }
  | { type: "error"; error: string }
> {
  if (typeof userContext !== "object" || userContext === null) {
    userContext = {};
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    yield {
      type: "error",
      error: "Missing GOOGLE_AI_API_KEY in environment variables",
    };
    return;
  }

  const modelCandidates = await getGeminiModelCandidates(apiKey);
  const MAX_HISTORY = 20;
  const effectiveHistory = history.slice(-MAX_HISTORY);

  try {
    // ─── 1) Fetch or skip property context and raw results ───────────────────
    const dataNotFetched = lib(message);
    let propertyContext: string;
    let rawResults: RawQueryResult[];

    if (!dataNotFetched || !userContext.rawResults) {
      try {
        [propertyContext, rawResults] = await Promise.all([
          queryPropertiesAsString(message, 50),
          queryProperties(message, 50),
        ]);
        userContext.propertyContext = propertyContext;
        userContext.rawResults = rawResults;
      } catch (err: any) {
        console.error("Error fetching property data:", err);
        if (err?.message?.includes("rate limit") || err?.status === 429) {
          yield {
            type: "error" as const,
            error:
              "Rate limit reached with Google AI API. Please try again in a moment.",
          };
        } else if (err?.message?.toLowerCase().includes("pinecone")) {
          yield {
            type: "error" as const,
            error: "Error with property database. Please try again.",
          };
        } else {
          yield {
            type: "error" as const,
            error: "Error fetching property data. Please try again.",
          };
        }
        return;
      }
    } else {
      propertyContext = userContext.propertyContext!;
      rawResults = userContext.rawResults!;
    }

    // ─── 1.5) Only compute clustering if we have rawResults ────────────────
    let combinedPropertyContext: string;
    if (rawResults.length > 0) {
      const featureVectors: number[][] = rawResults.map((r) => {
        const m = r.metadata;
        const price =
          typeof m.price === "number"
            ? m.price
            : parseFloat(String(m.price).replace(/[^0-9.-]+/g, "")) || 0;
        const bedrooms = Number(m.bedrooms) || 0;
        const bathrooms = Number(m.bathrooms) || 0;
        const livingArea =
          typeof m.livingArea === "string"
            ? parseFloat(m.livingArea.replace(/[^0-9.]/g, "")) || 0
            : Number(m.livingArea) || 0;
        const yearBuilt = Number(m.yearBuilt) || 0;
        return [price, bedrooms, bathrooms, livingArea, yearBuilt];
      });

      const dims = featureVectors[0]?.length ?? 0;
      const mins = Array(dims).fill(Infinity);
      const maxs = Array(dims).fill(-Infinity);
      featureVectors.forEach((vec) =>
        vec.forEach((val, i) => {
          if (val < mins[i]) mins[i] = val;
          if (val > maxs[i]) maxs[i] = val;
        }),
      );
      const normalized = featureVectors.map((vec) =>
        vec.map((val, i) =>
          maxs[i] === mins[i] ? 0 : (val - mins[i]) / (maxs[i] - mins[i]),
        ),
      );

      const { clusters: clusterAssignments } = kmeans(
        normalized,
        CLUSTER_COUNT,
      );

      const clusterContext = rawResults
        .map(
          (r, i) => `- Property ID ${r.id}: cluster ${clusterAssignments[i]}`,
        )
        .join("\n");

      let graphContext = "";
      try {
        if (isNeo4jEnabled()) {
          const top = rawResults[0]?.metadata?.zpid;
          if (top != null) {
            const similars = await getSimilarByZpid(Number(top), 5);
            if (similars.length) {
              const lines = similars.map((s, i) => {
                const a = s.property;
                const addr = [a.streetAddress, a.city, a.state, a.zipcode]
                  .filter(Boolean)
                  .join(", ");
                const why = s.reasons.length
                  ? ` (because: ${s.reasons.join(", ")})`
                  : "";
                return `${i + 1}. ${addr} — $${a.price ?? "N/A"}${why}`;
              });
              graphContext = `\nGraph Similarities (top 5):\n${lines.join("\n")}`;
            }
          }
        }
      } catch (_) {
        // Graph is optional; ignore errors
      }

      combinedPropertyContext = `
        ${propertyContext}

        Cluster Assignments:
        ${clusterContext}
        ${graphContext}
      `.trim();
    } else {
      combinedPropertyContext = "";
    }

    // ─── 2) Base system instruction (used for all experts) ─────────────────
    const baseSystemInstruction = `
      You are EstateWise Assistant, an expert real estate concierge for Chapel Hill, NC, USA. You help users find their dream homes by providing personalized property recommendations based on their preferences and needs. You have access to a database of detailed property records, including information about the properties, their locations, and their features.

      Below is a current list of detailed property records from our database. Use ALL THE DATA in the property records to provide the best recommendations. You can also use the user's additional context to tailor your recommendations:
      ---------------------------------------------------------
      ${combinedPropertyContext || "None available. Please use your own knowledge and the provided conversation history and answer conversationally."}
      ---------------------------------------------------------

      When recommending properties, do the following:
      1. For each property, list the full address (street, city, state, zipcode), price, number of bedrooms, number of bathrooms, living area (in sqft), year built, and home type.
      2. Include the property description.
      3. Always provide a direct link to the property's Zillow page using its Zillow id. Use this exact format:
           More details: https://www.zillow.com/homedetails/{zpid}_zpid/
         Ensure to replace {zpid} with the actual Zillow id. Keep the link format consistent. No extra symbols or texts inside the link. Do NOT add a '\\\\' before the '_zpid'. PLEASE DO NOT ADD \\\\ BEFORE THE '_zpid'.
      4. Present your answer in a clear, numbered list so the user can easily see all options.
      5. Use the property data to create engaging, detailed, and actionable recommendations. Present a top few options first, and then provide additional options based on the user's preferences and feedback.
      6. If the user provides additional context or preferences, adjust your recommendations accordingly.
      7. Format your responses in a way that is easy to read and understand. Use structures like bullet points, tables, or numbered lists where appropriate.
      7.1. DO NOT ask the user. Just give them the recommendations/options first, and ask for follow-up questions only if needed. DO NOT ask more questions unnecessarily. DO NOT ASK ANY QUESTIONS OR TELLING THEM TO PROVIDE MORE INFO - Just give them the recommendations/options first, based on all the info you currently have.
      7.2. You MUST use the conversation history to provide context and tailor your recommendations.
      7.3. Give a table whenever possible to present the data in a clear and organized manner. Use markdown tables for better readability.
      7.4. In the case the data misses some values, or N/A values, just try to answer the user to the best of your ability. Give all the available information that you have. Don't say you cannot answer or fulfill the user's request. Just give them the best answer you can based on the data you have. Also tell the user to ask more specific questions if they want more details or data.
      7.5. Never says you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give.

      8. **Whenever** the user asks for a comparison, distribution, or trend (e.g. "show me price trends", "how many bedrooms?", "compare year built"), you **must** append a valid Chart.js spec in its own code block tagged \`chart-spec\`.

      9. Here's a minimal chart example you should follow exactly:

      \`\`\`chart-spec
      {
        "type": "bar",
        "data": {
          "labels": ["2 beds","3 beds","4 beds"],
          "datasets":[
            {
              "label":"Number of Homes",
              "data":[12, 8, 5]
            }
          ]
        },
        "options": {
          "responsive": true,
          "plugins": { "legend": { "position": "top" } }
        }
      }
      \`\`\`

      - **Do not** include any extra text or markdown in that block—only the raw JSON.
      - If no chart is needed, simply omit the block.
      - Ensure that you give a valid JSON object in the block, and all the charts are valid Chart.js specs. This is very important because the UI will parse this JSON and render it. If the JSON is invalid, it will break the UI.
      - Make sure to use the correct chart type and data format for each chart. You can refer to the Chart.js documentation for more details on how to create different types of charts and their respective data formats.
      - Ensure that you generate at least 1 chart related to the properties recommendations that you provide, and one chart related to the entire data that you were provided with.

      10. **Allowed chart types:** you may only ever output one of the built-in Chart.js types:
       \`"bar"\`, \`"line"\`, \`"pie"\`, \`"doughnut"\`, \`"radar"\`, \`"polarArea"\`, \`"bubble"\`, or \`"scatter"\`.
       – If you need a "histogram," use \`"bar"\` with full-width bars (set \`categoryPercentage\` and \`barPercentage\` to 1).
       – All trend-lines (e.g. price vs. area) must be \`"line"\`.

      11. Every time you list properties, you must generate at least one relevant chart. Use the data you have to create a chart that is relevant to the properties listed.

      12. Make sure your responses, while detailed, are concise and to the point. Avoid unnecessary verbosity or repetition. And must not be too long. And avoid asking additional questions. Just give user the recommendations/options first, and ask for follow-up questions only if needed.

      12.1. Do NOT take too long to respond. Time is of the essence. You must respond quickly and efficiently, without unnecessary delays.

      12.2. Keep in mind that the dataset available to you here is only the top 50 properties based on the user's query. You do not have access to the entire dataset. So, you must be careful about how you present the data and avoid making any assumptions about the completeness of the dataset. Maybe display a disclaimer at the bottom of the response, such as "Note: The dataset is limited to the top 50 properties based on your query. For a more comprehensive analysis, provide additional context or preferences.".

      12.3. Limit your response so that it is not too verbose. And you must ensure that you don't take too long to answer. You must respond quickly and efficiently, without unnecessary delays.

      12.4. When the user asks about your identity, how you were created, how you were trained, or similar questions, you must respond with something like "I am EstateWise Assistant, an AI-powered real estate concierge designed to help you find your dream home in Chapel Hill, NC. I was created using various advanced machine learning techniques and trained on a diverse dataset of real estate information." But don't state this unnecessarily. Only respond to this question if the user asks about it.
      Be sure to keep it concise and avoid going into too much detail about the technical aspects of your creation or training. You can also mention that you are constantly learning and improving to provide better recommendations and insights for users like them. Note that users can give feedback, either through messages or thumbs up/down buttons, to help improve your performance and accuracy over time. This feedback is used to refine your algorithms and enhance your understanding of user preferences and needs.

      12.5. Respond conversationally and naturally. For example, if the user says "Hi there", you can respond with "Hello! How can I assist you today?" or "Hi! What can I help you with today?". If the user says "Thanks", you can respond with "You're welcome! If you have any more questions, feel free to ask." or "No problem! I'm here to help." Do the same for all questions and responses.

      12.6. Do NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.

      Additional context: ${userContext || "None provided."}
    `;

    // ─── 3) Define your experts with very detailed instructions ────────────────
    const experts = [
      {
        name: "Data Analyst",
        instructions: `
          You are the Data Analyst. Focus on extracting statistics, distributions, and trends in the property data. Provide breakdowns (avg price, bedroom counts, area distributions) and, when relevant, include a Chart.js code block showing these metrics. Keep language concise and data-driven.
        `.trim(),
      },
      {
        name: "Lifestyle Concierge",
        instructions: `
          You are the Lifestyle Concierge. Emphasize lifestyle fit—nearby schools, parks, restaurants, commute times, and community vibes. Do not overload with raw numbers; frame features in terms of daily living and comfort.
        `.trim(),
      },
      {
        name: "Financial Advisor",
        instructions: `
          You are the Financial Advisor. Highlight price trends, mortgage/payment estimates, ROI potential, tax implications, and any financing options. Provide bullet points on cost analysis and include a chart if illustrating financial comparisons.
        `.trim(),
      },
      {
        name: "Neighborhood Expert",
        instructions: `
          You are the Neighborhood Expert. Provide insights on safety, demographic trends, noise levels, walkability scores, and future development. Use tables or bullets for clarity; charts only if showing comparative ratings.
        `.trim(),
      },
      {
        name: "Cluster Analyst",
        instructions: `
          You are the Cluster Analyst. You have clustered the available homes into ${CLUSTER_COUNT} groups based on features (price, beds, baths, living area, year built). Generate a Chart.js \`scatter\` spec (in a \`chart-spec\` code block) plotting living area (x-axis) vs. price (y-axis), with each cluster as a separate dataset, and title each dataset "Cluster {index}". Then, summarize in bullet points the key characteristics of each cluster (e.g., "Cluster 0: mostly high-price, large homes"). NEVER says things like "No Data" for any cluster. You must ensure your clusters are meaningful and relevant to the user's query.
        `.trim(),
      },
    ];

    // ─── 4) Build weight map (no normalization) ─────────────────────────
    const CLUSTER_KEY = "Cluster Analyst";
    const weights: Record<string, number> = {};

    weights[CLUSTER_KEY] = 1;

    experts.forEach((e) => {
      if (e.name === CLUSTER_KEY) return;
      const raw = expertWeights[e.name] ?? 1;
      weights[e.name] = Math.min(Math.max(raw, 0.1), 2.0);
    });

    // ─── 5) Prepare common generation & safety config ─────────────────────────
    const genAI = new GoogleGenerativeAI(apiKey);
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
    };
    const safetySettings = [
      {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_NONE,
      },
    ];

    // ─── 6) Run each expert in parallel (non-streaming for expert views) ─────
    const expertPromises = experts.map(async (expert) => {
      const systemInstruction = wrapWithHiddenCoT(
        baseSystemInstruction + "\n\n" + expert.instructions,
      );
      const result = await runWithGeminiModelFallback(
        modelCandidates,
        async (modelName) => {
          const model = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction,
          });
          const chat = model.startChat({
            generationConfig,
            safetySettings,
            history: effectiveHistory,
          });
          return chat.sendMessage(message);
        },
      );
      return {
        name: expert.name,
        text: result.response.text(),
      };
    });

    let expertResults;
    try {
      expertResults = await Promise.all(expertPromises);
    } catch (err: any) {
      console.error("Error from Google AI API:", err);
      if (err?.message?.includes("rate limit") || err?.status === 429) {
        yield {
          type: "error" as const,
          error:
            "Rate limit reached with Google AI API. Please try again in a moment.",
        };
      } else {
        yield {
          type: "error" as const,
          error: "Error with Google AI API. Please try again.",
        };
      }
      return;
    }

    // ─── 7) Build merger instruction, including expert weights ──────────────
    const mergerInstruction = `
      You are the EstateWise Master Agent. You have now received input from five specialized agents.

      Use their responses to create a **coherent** and **concise** recommendation for the user. Focus on answering the user's queries in a natural and conversational manner, while also ensuring that the response is informative and engaging.

      Below are their responses along with their relative weights (importance):

      ${expertResults
        .map(
          (r) => `**${r.name}** (weight: ${weights[r.name].toFixed(2)}):
      ${r.text}`,
        )
        .join("\n\n")}

      Now, synthesize these five expert opinions into **one unified** final recommendation for the user. Follow all of the original EstateWise instructions (including numbering, full property details, chart-spec blocks when needed, concise format, and no extra markdown around charts). Use the expert weights to prioritize which insights to emphasize, but produce a single cohesive response exactly as the user expects from EstateWise Assistant.

      If any expert gives a conflicting or contradictory answer, you must resolve it in a way that is consistent with the overall context and the user's needs. For example, if one or more model(s) does not give any recommendations, you must still provide a recommendation based on the other models' responses. Never say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give.
      
      If any expert gives a recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the expert(s) have provided some recommendations. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

      Once again, just give user the recommendations/options first, and ask for follow-up questions only if needed. PLEASE DO NOT ASK ANY QUESTIONS OR TELLING THEM TO PROVIDE MORE INFO - Just give them the recommendations/options first, based on all the info you currently have. DO NOT ASK MORE QUESTIONS UNNECESSARILY. **IMPORTANT:** DO NOT ASK THE USER - Just give them recommendations based on all the info you currently have.

      Also, you must NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. There are always some recommendations or results that you can give based on the data you have.

      If an expert gives any recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the expert(s) have provided some recommendations. DO NOT OMIT ANY EXPERT'S RECOMMENDATIONS. You must include all of them in your final response, even if they are not relevant to the user's query. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

      Even if the experts say it has exhausted all properties with the given criteria, if any properties are suggested, even if they do not match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.
    `;

    // ─── 8) Stream the merged response ─────────────────────────────────────
    try {
      let streamed = false;
      const rotatedCandidates = getRotatedModelCandidates(modelCandidates);
      let lastError: unknown;

      for (const modelName of rotatedCandidates) {
        try {
          const mergerModel = genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: wrapWithHiddenCoT(
              mergerInstruction + "\n\n" + baseSystemInstruction,
            ),
          });
          const mergerChat = mergerModel.startChat({
            generationConfig,
            safetySettings,
            history: effectiveHistory,
          });
          const result = await mergerChat.sendMessageStream(message);

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              streamed = true;
              yield { type: "token" as const, token: chunkText };
            }
          }

          lastError = undefined;
          break;
        } catch (err) {
          lastError = err;
          if (streamed) {
            throw err;
          }
        }
      }

      if (lastError) {
        throw lastError;
      }

      // Send expert views after streaming completes
      const expertViews: Record<string, string> = {};
      expertResults.forEach((r) => {
        expertViews[r.name] = r.text;
      });

      yield { type: "expertViews" as const, expertViews };
    } catch (err: any) {
      console.error("Streaming error:", err);
      if (err?.message?.includes("rate limit") || err?.status === 429) {
        yield {
          type: "error" as const,
          error:
            "Rate limit reached with Google AI API. Please try again in a moment.",
        };
        return;
      }
      // On other errors, use highest-weight expert
      const best = expertResults.reduce((a, b) =>
        weights[b.name] > weights[a.name] ? b : a,
      );
      yield { type: "token" as const, token: best.text };

      const expertViews: Record<string, string> = {};
      expertResults.forEach((r) => {
        expertViews[r.name] = r.text;
      });
      yield { type: "expertViews" as const, expertViews };
    }
  } catch (error: any) {
    console.error("Streaming error:", error);
    if (error?.message?.includes("rate limit") || error?.status === 429) {
      yield {
        type: "error" as const,
        error:
          "Rate limit reached with Google AI API. Please try again in a moment.",
      };
    } else if (error?.message?.toLowerCase().includes("pinecone")) {
      yield {
        type: "error" as const,
        error: "Error with property database. Please try again.",
      };
    } else {
      yield {
        type: "error" as const,
        error: "Error processing your request. Please try again.",
      };
    }
  }
}
