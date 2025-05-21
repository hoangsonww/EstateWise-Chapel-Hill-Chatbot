import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import lib from "../utils/lib";
import axios from "axios";

const WORDPRESS_API_URL = "https://homesluxera.com/wp-json/wp/v2/properties";

/**
 * Fetch property details from the WordPress API.
 * @param query - Query parameters for filtering properties.
 * @returns A list of properties as a JSON object.
 */
async function fetchPropertiesFromWordPress(query: Record<string, string> = {}) {
  try {
    const queryString = new URLSearchParams(query).toString();
    const response = await axios.get(`${WORDPRESS_API_URL}?${queryString}`);
    if (!response.data || response.data.length === 0) {
      throw new Error("No properties found.");
    }
    return response.data;
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error fetching properties from WordPress: ${error.message}`);
    } else {
      console.error("Unknown error occurred while fetching properties.");
    }
    throw new Error("Failed to fetch properties from WordPress.");
  }
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

// Context object to cache and reuse property results
export interface EstateWiseContext {
  rawResults?: any[];
  propertyContext?: string;
}

/**
 * Chat with Luxera Assistant using Google Gemini AI.
 * This function integrates WordPress property data and clusters it for recommendations.
 */
export async function chatWithLuxera(
  history: Array<{ role: string; parts: Array<{ text: string }> }>,
  message: string,
  userContext: EstateWiseContext = {},
  expertWeights: Record<string, number> = {},
): Promise<{ finalText: string; expertViews: Record<string, string> }> {
  try {
    if (typeof userContext !== "object" || userContext === null) {
      userContext = {};
    }

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
    }

    // Fetch or reuse property context and raw results
    const dataNotFetched = lib(message);
    let propertyContext = "";
    let rawResults: any[] = [];

    if (!dataNotFetched || !userContext.rawResults) {
      console.log("Fetching properties from WordPress...");
      rawResults = await fetchPropertiesFromWordPress({ per_page: "30" });
      propertyContext = rawResults
        .map((property: any) => {
          const {
            id,
            title,
            content,
            link,
            property_meta: {
              fave_property_price,
              fave_property_size,
              fave_property_bedrooms,
              fave_property_bathrooms,
              fave_property_map_address,
            },
          } = property;

          // Safely access address fields
          const address = fave_property_map_address?.[0] || "N/A";

          return `
            - **Property ID**: ${id}
            - **Title**: ${title.rendered}
            - **Description**: ${content.rendered.replace(/<[^>]*>/g, "")}  <!-- Remove HTML tags -->
            - **Price**: ${fave_property_price?.[0] || "N/A"}
            - **Bedrooms**: ${fave_property_bedrooms?.[0] || "N/A"}
            - **Bathrooms**: ${fave_property_bathrooms?.[0] || "N/A"}
            - **Living Area**: ${fave_property_size?.[0] || "N/A"} sqft
            - **Address**: ${address}
            - **More Details**: [View Property](${link})
          `.trim();
        })
        .join("\n\n");
      userContext.propertyContext = propertyContext;
      userContext.rawResults = rawResults;
    } else {
      propertyContext = userContext.propertyContext!;
      rawResults = userContext.rawResults!;
    }

    // Compute clustering if rawResults are available
    let combinedPropertyContext = "";
    if (rawResults.length > 0) {
      console.log("Clustering properties...");
      const featureVectors: number[][] = rawResults.map((property: any) => {
        const price = parseFloat(property.property_meta.fave_property_price?.[0]) || 0;
        const bedrooms = Number(property.property_meta.fave_property_bedrooms?.[0]) || 0;
        const bathrooms = Number(property.property_meta.fave_property_bathrooms?.[0]) || 0;
        const livingArea = parseFloat(property.property_meta.fave_property_size?.[0]) || 0;
        return [price, bedrooms, bathrooms, livingArea];
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

      // Perform clustering
      const { clusters: clusterAssignments } = kmeans(normalized, CLUSTER_COUNT);

      // Build cluster text
      const clusterContext = rawResults
        .map((r, i) => `- Property ID ${r.id}: cluster ${clusterAssignments[i]}`)
        .join("\n");

      combinedPropertyContext = `
        ${propertyContext}

        Cluster Assignments:
        ${clusterContext || "No clustering data available."}
      `.trim();
    }

    // Base system instruction
    const baseSystemInstruction = `
      You are Luxera Ai Assistant, an expert real estate concierge for Dubai, DXB, UAE. You help users find their dream homes by providing personalized property recommendations based on their preferences and needs. You have access to a database of detailed property records, including information about the properties, their locations, and their features.

      Below is a current list of detailed property records from our database. Use ALL THE DATA in the property records to provide the best recommendations. You can also use the user's additional context to tailor your recommendations:
      ---------------------------------------------------------
      ${combinedPropertyContext || "None available. Please use your own knowledge and the provided conversation history and answer conversationally."}
      ---------------------------------------------------------

      When recommending properties, do the following:
      1. For each property, list the full address (street, city, state, zipcode), price, number of bedrooms, number of bathrooms, living area (in sqft), year built, and home type.
      2. Include the property description.
      3. Always provide a direct link to the property's details page on the Luxera website. Use this exact format:
           More details: https://homesluxera.com/properties/{id}
         Ensure to replace {id} with the actual property ID. Keep the link format consistent. No extra symbols or texts inside the link.
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

      12.2. Keep in mind that the dataset available to you here is only the top 30 properties based on the user's query. You do not have access to the entire dataset. So, you must be careful about how you present the data and avoid making any assumptions about the completeness of the dataset. Maybe display a disclaimer at the bottom of the response, such as "Note: The dataset is limited to the top 30 properties based on your query. For a more comprehensive analysis, provide additional context or preferences.".

      12.3. Limit your response so that it is not too verbose. And you must ensure that you don't take too long to answer. You must respond quickly and efficiently, without unnecessary delays.

      12.4. When the user asks about your identity, how you were created, how you were trained, or similar questions, you must respond with something like "I am EstateWise Assistant, an AI-powered real estate concierge designed to help you find your dream home in Chapel Hill, NC. I was created using various advanced machine learning techniques and trained on a diverse dataset of real estate information." But don't state this unnecessarily. Only respond to this question if the user asks about it.
      Be sure to keep it concise and avoid going into too much detail about the technical aspects of your creation or training. You can also mention that you are constantly learning and improving to provide better recommendations and insights for users like them. Note that users can give feedback, either through messages or thumbs up/down buttons, to help improve your performance and accuracy over time. This feedback is used to refine your algorithms and enhance your understanding of user preferences and needs.

      12.5. Respond conversationally and naturally. For example, if the user says "Hi there", you can respond with "Hello! How can I assist you today?" or "Hi! What can I help you with today?". If the user says "Thanks", you can respond with "You're welcome! If you have any more questions, feel free to ask." or "No problem! I'm here to help." Do the same for all questions and responses.

      12.6. Do NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.

      Additional context: ${userContext || "None provided."}
    `;

    // Define your experts with very detailed instructions
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

    // Build your weight map (no normalization)
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

    // Prepare common generation & safety config
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

    // Run each expert in parallel
    const startTime = Date.now(); // Initialize startTime with the current timestamp

    const expertPromises = experts.map(async (expert) => {
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        systemInstruction: baseSystemInstruction + "\n\n" + expert.instructions,
      });
      const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: history, // Use the provided history parameter instead of undefined effectiveHistory
      });
      const result = await chat.sendMessage(message);
      return {
        name: expert.name,
        text: result.response.text(),
      };
    });
    const expertResults = await Promise.all(expertPromises);

    // Build merger instruction, including expert weights
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
      
      If any expert gives a recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the model(s) have provided some recommendations. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

      Once again, just give user the recommendations/options first, and ask for follow-up questions only if needed. PLEASE DO NOT ASK ANY QUESTIONS OR TELLING THEM TO PROVIDE MORE INFO - Just give them the recommendations/options first, based on all the info you currently have. DO NOT ASK MORE QUESTIONS UNNECESSARILY. **IMPORTANT:** DO NOT ASK THE USER - Just give them recommendations based on all the info you currently have.

      Also, you must NOT say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have. If you cannot find any properties that match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. There are always some recommendations or results that you can give based on the data you have.

      If an expert gives any recommendation(s), you MUST include them, so that your response never says that you cannot give any recommendations even though the expert(s) have provided some recommendations. DO NOT OMIT ANY EXPERT'S RECOMMENDATIONS. You must include all of them in your final response, even if they are not relevant to the user's query. You must also ensure that you do not say that you cannot give any recommendations or results. You must always provide at least one recommendation or result based on the data you have.

      Even if the experts say it has exhausted all properties with the given criteria, if any properties are suggested, even if they do not match the user's criteria, you must still provide at least one recommendation or result based on the data you have. You MUST NOT say that you cannot answer or fulfill the user's request or there is no recommendation/results that you can give. IMPORTANT: YOU MUST NEVER SAY THAT YOU CANNOT GIVE ANY RECOMMENDATIONS. IT IS YOUR JOB TO GIVE RECOMMENDATIONS BASED ON THE DATA YOU HAVE.
    `;

    console.log(mergerInstruction);

    // Final, merged call with timeout fallback
    const mergerModel = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction: mergerInstruction + "\n\n" + baseSystemInstruction,
    });
    const mergerChat = mergerModel.startChat({
      generationConfig,
      safetySettings,
      history: history,
    });

    // race between the merge call and the 50s timer
    const mergePromise = mergerChat.sendMessage(message);
    // Define TIMEOUT_MS with an appropriate value (e.g., 50000 milliseconds for 50 seconds)
        const TIMEOUT_MS = 50000;
        const remaining = TIMEOUT_MS - (Date.now() - startTime);
    const resultOrTimeout = await Promise.race([
      mergePromise,
      new Promise((resolve) =>
        setTimeout(() => resolve({ timeout: true }), Math.max(0, remaining)),
      ),
    ]);

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

    // Return both the merged text and each expert view so the UI can toggle them
    const expertViews: Record<string, string> = {};
    expertResults.forEach((r) => {
      expertViews[r.name] = r.text;
    });

    return { finalText, expertViews };
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error in chatWithLuxera: ${error.message}`);
    } else {
      console.error("Unknown error occurred in chatWithLuxera.");
    }
    throw new Error("Error processing chat request.");
  }
}
