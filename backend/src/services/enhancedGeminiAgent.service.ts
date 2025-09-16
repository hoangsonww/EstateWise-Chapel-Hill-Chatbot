import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from "@google/generative-ai";
import {
  queryProperties,
  queryPropertiesAsString,
  RawQueryResult,
} from "../scripts/queryProperties";
import { chatWithEstateWise, EstateWiseContext } from "./geminiChat.service";
import { IntentClassificationService, IntentType } from "./intentClassification.service";
import { DisambiguationService } from "./disambiguation.service";
import { IntentTelemetryService } from "./intentTelemetry.service";

interface DecisionPayload {
  usePropertyData: boolean;
}

// Initialize services as singletons
let intentClassificationService: IntentClassificationService | null = null;
let disambiguationService: DisambiguationService | null = null;
let telemetryService: IntentTelemetryService | null = null;

function getIntentServices(apiKey: string) {
  if (!intentClassificationService) {
    intentClassificationService = new IntentClassificationService(apiKey);
  }
  if (!disambiguationService) {
    disambiguationService = new DisambiguationService();
  }
  if (!telemetryService) {
    telemetryService = new IntentTelemetryService();
  }
  return { intentClassificationService, disambiguationService, telemetryService };
}

/**
 * Enhanced agent response that includes disambiguation support
 */
export interface EnhancedAgentResponse {
  finalText: string;
  expertViews: Record<string, string>;
  needsDisambiguation?: boolean;
  clarificationMessage?: string;
  suggestedActions?: Array<{
    text: string;
    intent: IntentType;
    usePropertyData: boolean;
  }>;
  intentClassification?: {
    primaryIntent: IntentType;
    confidence: number;
    alternativeIntents: Array<{ intent: IntentType; confidence: number }>;
  };
}

/**
 * Top-level agent that first determines whether we need to
 * fetch RAG data (property listings from Pinecone). If so,
 * it retrieves that data and injects it into the downstream
 * Mixture-of-Experts pipeline; if not, it calls the experts
 * without any RAG context.
 *
 * Now enhanced with sophisticated intent classification,
 * confidence scoring, and disambiguation support.
 *
 * @param prompt         The user's latest message
 * @param userContext    Any additional context you want to pass through
 * @param expertWeights  Weights for each expert in the MoE
 * @param conversationId Optional conversation ID for disambiguation tracking
 */
export async function runEnhancedEstateWiseAgent(
  prompt: string,
  userContext: string = "",
  expertWeights: Record<string, number> = {},
  conversationId?: string,
): Promise<EnhancedAgentResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment");
  }

  const startTime = Date.now();
  const { intentClassificationService, disambiguationService, telemetryService } = getIntentServices(apiKey);

  // --- 1) Enhanced Intent Classification ---
  let classificationResult;
  try {
    classificationResult = await intentClassificationService.classifyIntent(prompt);
  } catch (error) {
    console.error("Intent classification failed, falling back to legacy method:", error);
    // Fallback to legacy simple decision
    return await legacyDecisionLogic(prompt, userContext, expertWeights);
  }

  const responseTime = Date.now() - startTime;
  
  // --- 2) Log telemetry ---
  const telemetryId = telemetryService.logClassification(
    prompt,
    classificationResult,
    responseTime,
    conversationId
  );

  // --- 3) Check for disambiguation needs ---
  if (classificationResult.needsDisambiguation && conversationId) {
    const disambiguationResponse = disambiguationService.handleDisambiguation(
      prompt,
      classificationResult,
      conversationId
    );

    if (disambiguationResponse.needsClarification) {
      return {
        finalText: disambiguationResponse.clarificationMessage || "Could you please clarify what you're looking for?",
        expertViews: {},
        needsDisambiguation: true,
        clarificationMessage: disambiguationResponse.clarificationMessage,
        suggestedActions: disambiguationResponse.suggestedActions,
        intentClassification: {
          primaryIntent: classificationResult.primaryIntent,
          confidence: classificationResult.confidence,
          alternativeIntents: classificationResult.alternativeIntents
        }
      };
    }
  }

  // --- 4) Check if this is a disambiguation resolution ---
  if (conversationId && disambiguationService.hasPendingDisambiguation(conversationId)) {
    const resolution = disambiguationService.resolveDisambiguation(prompt, conversationId);
    if (resolution) {
      // Update telemetry with successful disambiguation
      telemetryService.logDisambiguationResolution(telemetryId, true, resolution.resolvedIntent);
      
      // Use resolved intent to determine property data usage
      classificationResult.primaryIntent = resolution.resolvedIntent;
      classificationResult.usePropertyData = resolution.usePropertyData;
    } else {
      // Disambiguation attempt failed, continue with original classification
      telemetryService.logDisambiguationResolution(telemetryId, false);
    }
  }

  // --- 5) Fetch RAG data based on intent classification ---
  let propertyContext = "";
  let rawResults: RawQueryResult[] = [];
  
  if (classificationResult.usePropertyData) {
    [propertyContext, rawResults] = await Promise.all([
      queryPropertiesAsString(prompt, 50),
      queryProperties(prompt, 50),
    ]);
  }

  // --- 6) Build merged userContext object ---
  const mergedPropertyContext = classificationResult.usePropertyData
    ? `${userContext}

      --- PROPERTY DATA START ---
      ${propertyContext}
      --- PROPERTY DATA END ---
      
      Intent Classification: ${classificationResult.primaryIntent} (confidence: ${classificationResult.confidence.toFixed(2)})
      `
    : userContext;

  const estateWiseContext: EstateWiseContext = {
    propertyContext: mergedPropertyContext,
    rawResults: classificationResult.usePropertyData ? rawResults : undefined,
  };

  // --- 7) Kick off the Mixture-of-Experts pipeline ---
  const chatResult = await chatWithEstateWise(
    [{ role: "user", parts: [{ text: prompt }] }],
    prompt,
    estateWiseContext,
    expertWeights,
  );

  return {
    finalText: chatResult.finalText,
    expertViews: chatResult.expertViews,
    needsDisambiguation: false,
    intentClassification: {
      primaryIntent: classificationResult.primaryIntent,
      confidence: classificationResult.confidence,
      alternativeIntents: classificationResult.alternativeIntents
    }
  };
}

/**
 * Original agent function maintained for backward compatibility
 * Will be updated to use the enhanced version internally
 */
export async function runEstateWiseAgent(
  prompt: string,
  userContext: string = "",
  expertWeights: Record<string, number> = {},
): Promise<{ finalText: string; expertViews: Record<string, string> }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment");
  }

  // Try enhanced agent first, fallback to legacy if needed
  try {
    const result = await runEnhancedEstateWiseAgent(prompt, userContext, expertWeights);
    return {
      finalText: result.finalText,
      expertViews: result.expertViews
    };
  } catch (error) {
    console.error("Enhanced agent failed, using legacy:", error);
    return await legacyDecisionLogic(prompt, userContext, expertWeights);
  }
}

/**
 * Legacy decision logic as fallback
 */
async function legacyDecisionLogic(
  prompt: string,
  userContext: string,
  expertWeights: Record<string, number>
): Promise<{ finalText: string; expertViews: Record<string, string> }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY!;
  const genAI = new GoogleGenerativeAI(apiKey);

  // Original simple decision logic
  const decisionInstruction =
    'Read the user\'s message and reply **exactly** one JSON object with a boolean field "usePropertyData": either {"usePropertyData":true} or {"usePropertyData":false}. No other text.';

  const decisionModel = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-lite",
    systemInstruction: decisionInstruction,
  });

  const generationConfig = {
    temperature: 0.0,
    topP: 1,
    topK: 1,
    maxOutputTokens: 16,
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

  const decisionChat = decisionModel.startChat({
    generationConfig,
    safetySettings,
    history: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const decisionResult = await decisionChat.sendMessage("");
  let usePropertyData = false;
  try {
    const parsed = JSON.parse(
      decisionResult.response.text(),
    ) as DecisionPayload;
    usePropertyData = Boolean(parsed.usePropertyData);
  } catch {
    usePropertyData = false;
  }

  // Fetch RAG data if needed
  let propertyContext = "";
  let rawResults: RawQueryResult[] = [];
  if (usePropertyData) {
    [propertyContext, rawResults] = await Promise.all([
      queryPropertiesAsString(prompt, 50),
      queryProperties(prompt, 50),
    ]);
  }

  const mergedPropertyContext = usePropertyData
    ? `${userContext}

      --- PROPERTY DATA START ---
      ${propertyContext}
      --- PROPERTY DATA END ---
      `
    : userContext;

  const estateWiseContext: EstateWiseContext = {
    propertyContext: mergedPropertyContext,
    rawResults: usePropertyData ? rawResults : undefined,
  };

  const chatResult = await chatWithEstateWise(
    [{ role: "user", parts: [{ text: prompt }] }],
    prompt,
    estateWiseContext,
    expertWeights,
  );

  return {
    finalText: chatResult.finalText,
    expertViews: chatResult.expertViews,
  };
}

// Export telemetry service for monitoring endpoints
export function getIntentTelemetryService(): IntentTelemetryService | null {
  return telemetryService;
}

// Export disambiguation service for conversation management
export function getDisambiguationService(): DisambiguationService | null {
  return disambiguationService;
}