import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

/**
 * Enhanced intent classification system for EstateWise chatbot.
 * Provides detailed intent categories, confidence scoring, and disambiguation support.
 */

export enum IntentType {
  PROPERTY_INQUIRY = "PROPERTY_INQUIRY",
  PROCESS_INQUIRY = "PROCESS_INQUIRY", 
  COMPARISON_REQUEST = "COMPARISON_REQUEST",
  SCHEDULING_REQUEST = "SCHEDULING_REQUEST",
  GENERAL_INFO = "GENERAL_INFO",
  GREETING = "GREETING",
  UNCLEAR = "UNCLEAR"
}

export interface IntentClassificationResult {
  primaryIntent: IntentType;
  confidence: number;
  alternativeIntents: Array<{ intent: IntentType; confidence: number }>;
  needsDisambiguation: boolean;
  usePropertyData: boolean;
  suggestedClarifications?: string[];
}

export interface IntentExample {
  text: string;
  intent: IntentType;
  usePropertyData: boolean;
}

/**
 * Training examples for intent classification to improve accuracy
 * and handle edge cases mentioned in the issue.
 */
const INTENT_EXAMPLES: IntentExample[] = [
  // Property Inquiry Examples
  { text: "What is the rent?", intent: IntentType.PROPERTY_INQUIRY, usePropertyData: true },
  { text: "Show me apartments", intent: IntentType.PROPERTY_INQUIRY, usePropertyData: true },
  { text: "What properties are available?", intent: IntentType.PROPERTY_INQUIRY, usePropertyData: true },
  { text: "Tell me about the apartments", intent: IntentType.PROPERTY_INQUIRY, usePropertyData: true },
  { text: "How much does a 2 bedroom cost?", intent: IntentType.PROPERTY_INQUIRY, usePropertyData: true },
  
  // Process Inquiry Examples  
  { text: "How do I pay rent?", intent: IntentType.PROCESS_INQUIRY, usePropertyData: false },
  { text: "What is the application process?", intent: IntentType.PROCESS_INQUIRY, usePropertyData: false },
  { text: "How do I apply for an apartment?", intent: IntentType.PROCESS_INQUIRY, usePropertyData: false },
  { text: "What documents do I need?", intent: IntentType.PROCESS_INQUIRY, usePropertyData: false },
  
  // Scheduling Request Examples
  { text: "Schedule a tour of the apartments", intent: IntentType.SCHEDULING_REQUEST, usePropertyData: true },
  { text: "Book a viewing", intent: IntentType.SCHEDULING_REQUEST, usePropertyData: true },
  { text: "Can I see the property?", intent: IntentType.SCHEDULING_REQUEST, usePropertyData: true },
  { text: "Set up an appointment", intent: IntentType.SCHEDULING_REQUEST, usePropertyData: true },
  
  // Comparison Request Examples
  { text: "Compare these apartments", intent: IntentType.COMPARISON_REQUEST, usePropertyData: true },
  { text: "Show me price trends", intent: IntentType.COMPARISON_REQUEST, usePropertyData: true },
  { text: "What are the differences between properties?", intent: IntentType.COMPARISON_REQUEST, usePropertyData: true },
  
  // General Info Examples
  { text: "Tell me about the neighborhood", intent: IntentType.GENERAL_INFO, usePropertyData: false },
  { text: "What is Chapel Hill like?", intent: IntentType.GENERAL_INFO, usePropertyData: false },
  { text: "Are there good schools nearby?", intent: IntentType.GENERAL_INFO, usePropertyData: false },
  
  // Greeting Examples
  { text: "Hello", intent: IntentType.GREETING, usePropertyData: false },
  { text: "Hi there", intent: IntentType.GREETING, usePropertyData: false },
  { text: "Good morning", intent: IntentType.GREETING, usePropertyData: false },
];

export class IntentClassificationService {
  private genAI: GoogleGenerativeAI;
  private confidenceThreshold: number = 0.7;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  /**
   * Classify user intent with confidence scoring and disambiguation detection
   */
  async classifyIntent(userMessage: string): Promise<IntentClassificationResult> {
    const systemInstruction = this.buildClassificationPrompt();
    
    const model = this.genAI.getGenerativeModel({
      model: "gemini-2.0-flash-lite",
      systemInstruction,
    });

    const generationConfig = {
      temperature: 0.1, // Low temperature for consistent classification
      topP: 1,
      topK: 1,
      maxOutputTokens: 200,
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

    try {
      const chat = model.startChat({
        generationConfig,
        safetySettings,
      });

      const result = await chat.sendMessage(userMessage);
      const response = result.response.text();
      
      return this.parseClassificationResult(response, userMessage);
    } catch (error) {
      console.error("Intent classification failed:", error);
      // Fallback to simple heuristic classification
      return this.fallbackClassification(userMessage);
    }
  }

  /**
   * Generate disambiguation questions for unclear intents
   */
  generateClarificationQuestions(userMessage: string, alternativeIntents: IntentType[]): string[] {
    const clarifications: string[] = [];

    if (alternativeIntents.includes(IntentType.PROPERTY_INQUIRY) && 
        alternativeIntents.includes(IntentType.SCHEDULING_REQUEST)) {
      clarifications.push("Would you like to see available properties or schedule a tour?");
    }

    if (alternativeIntents.includes(IntentType.PROPERTY_INQUIRY) && 
        alternativeIntents.includes(IntentType.PROCESS_INQUIRY)) {
      clarifications.push("Are you asking about property details or the rental process?");
    }

    if (alternativeIntents.includes(IntentType.COMPARISON_REQUEST) && 
        alternativeIntents.includes(IntentType.PROPERTY_INQUIRY)) {
      clarifications.push("Would you like to see specific properties or compare different options?");
    }

    if (clarifications.length === 0) {
      clarifications.push("Could you please clarify what you're looking for?");
    }

    return clarifications;
  }

  private buildClassificationPrompt(): string {
    const examplesText = INTENT_EXAMPLES
      .map(ex => `"${ex.text}" -> ${ex.intent} (confidence: high)`)
      .join('\n');

    return `You are an expert intent classifier for a real estate chatbot. Analyze user messages and classify them into specific intent categories.

Available Intent Types:
- PROPERTY_INQUIRY: User wants to see properties, ask about rent, availability, features
- PROCESS_INQUIRY: User asks about rental processes, applications, payments, procedures  
- COMPARISON_REQUEST: User wants to compare properties or see trends/analysis
- SCHEDULING_REQUEST: User wants to schedule tours, viewings, appointments
- GENERAL_INFO: User asks about neighborhoods, areas, general information
- GREETING: Basic greetings and pleasantries
- UNCLEAR: Intent is ambiguous or unclear

Training Examples:
${examplesText}

Analyze the user message and respond with EXACTLY this JSON format:
{
  "primaryIntent": "INTENT_TYPE",
  "confidence": 0.85,
  "alternativeIntents": [
    {"intent": "ALTERNATIVE_INTENT", "confidence": 0.15}
  ],
  "usePropertyData": true/false,
  "reasoning": "brief explanation"
}

Rules:
1. Confidence should be 0.0-1.0
2. If confidence < 0.7, consider it ambiguous
3. Include up to 2 alternative intents if confidence is low
4. usePropertyData = true for PROPERTY_INQUIRY, COMPARISON_REQUEST, SCHEDULING_REQUEST
5. usePropertyData = false for PROCESS_INQUIRY, GENERAL_INFO, GREETING
6. Focus on distinguishing between similar intents like "What is the rent?" vs "How do I pay rent?"`;
  }

  private parseClassificationResult(response: string, userMessage: string): IntentClassificationResult {
    try {
      const parsed = JSON.parse(response);
      
      const confidence = Math.max(0, Math.min(1, parsed.confidence || 0));
      const needsDisambiguation = confidence < this.confidenceThreshold;
      
      const result: IntentClassificationResult = {
        primaryIntent: parsed.primaryIntent || IntentType.UNCLEAR,
        confidence,
        alternativeIntents: parsed.alternativeIntents || [],
        needsDisambiguation,
        usePropertyData: parsed.usePropertyData || false,
      };

      if (needsDisambiguation) {
        const altIntents = result.alternativeIntents.map(alt => alt.intent);
        result.suggestedClarifications = this.generateClarificationQuestions(userMessage, altIntents);
      }

      return result;
    } catch (error) {
      console.error("Failed to parse intent classification response:", error);
      return this.fallbackClassification(userMessage);
    }
  }

  private fallbackClassification(userMessage: string): IntentClassificationResult {
    const message = userMessage.toLowerCase().trim();
    
    // Simple keyword-based fallback
    if (message.includes('rent') && (message.includes('pay') || message.includes('how'))) {
      return {
        primaryIntent: IntentType.PROCESS_INQUIRY,
        confidence: 0.6,
        alternativeIntents: [{ intent: IntentType.PROPERTY_INQUIRY, confidence: 0.4 }],
        needsDisambiguation: true,
        usePropertyData: false,
        suggestedClarifications: ["Are you asking about property details or the rental process?"]
      };
    }

    if (message.includes('tour') || message.includes('schedule') || message.includes('visit')) {
      return {
        primaryIntent: IntentType.SCHEDULING_REQUEST,
        confidence: 0.8,
        alternativeIntents: [],
        needsDisambiguation: false,
        usePropertyData: true,
      };
    }

    if (message.includes('apartment') || message.includes('property') || message.includes('rent')) {
      return {
        primaryIntent: IntentType.PROPERTY_INQUIRY,
        confidence: 0.7,
        alternativeIntents: [],
        needsDisambiguation: false,
        usePropertyData: true,
      };
    }

    // Default to unclear intent
    return {
      primaryIntent: IntentType.UNCLEAR,
      confidence: 0.3,
      alternativeIntents: [],
      needsDisambiguation: true,
      usePropertyData: false,
      suggestedClarifications: ["Could you please clarify what you're looking for?"]
    };
  }

  /**
   * Set the confidence threshold for disambiguation
   */
  setConfidenceThreshold(threshold: number): void {
    this.confidenceThreshold = Math.max(0, Math.min(1, threshold));
  }

  /**
   * Get current confidence threshold
   */
  getConfidenceThreshold(): number {
    return this.confidenceThreshold;
  }
}