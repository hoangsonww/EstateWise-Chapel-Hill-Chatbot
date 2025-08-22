import { IntentType, IntentClassificationResult } from "./intentClassification.service";

/**
 * Disambiguation service for handling ambiguous user queries
 * and managing clarification conversations.
 */

export interface DisambiguationContext {
  originalMessage: string;
  classificationResult: IntentClassificationResult;
  clarificationAttempts: number;
  timestamp: Date;
}

export interface DisambiguationResponse {
  needsClarification: boolean;
  clarificationMessage?: string;
  suggestedActions?: Array<{
    text: string;
    intent: IntentType;
    usePropertyData: boolean;
  }>;
  fallbackIntent?: IntentType;
}

export class DisambiguationService {
  private maxClarificationAttempts: number = 2;
  private pendingDisambiguations: Map<string, DisambiguationContext> = new Map();

  constructor() {}

  /**
   * Handle potential disambiguation based on intent classification result
   */
  handleDisambiguation(
    userMessage: string,
    classificationResult: IntentClassificationResult,
    conversationId?: string
  ): DisambiguationResponse {
    
    if (!classificationResult.needsDisambiguation) {
      return {
        needsClarification: false,
        fallbackIntent: classificationResult.primaryIntent
      };
    }

    // Check if we've already tried to clarify this conversation
    const existingContext = conversationId ? this.pendingDisambiguations.get(conversationId) : null;
    
    if (existingContext && existingContext.clarificationAttempts >= this.maxClarificationAttempts) {
      // Fall back to best guess after max attempts
      return {
        needsClarification: false,
        fallbackIntent: classificationResult.primaryIntent
      };
    }

    // Create disambiguation context
    const context: DisambiguationContext = {
      originalMessage: userMessage,
      classificationResult,
      clarificationAttempts: (existingContext?.clarificationAttempts || 0) + 1,
      timestamp: new Date()
    };

    if (conversationId) {
      this.pendingDisambiguations.set(conversationId, context);
    }

    // Generate clarification response
    const clarificationMessage = this.generateClarificationMessage(classificationResult);
    const suggestedActions = this.generateSuggestedActions(classificationResult);

    return {
      needsClarification: true,
      clarificationMessage,
      suggestedActions,
    };
  }

  /**
   * Resolve disambiguation based on user's clarification response
   */
  resolveDisambiguation(
    userResponse: string,
    conversationId: string
  ): { resolvedIntent: IntentType; usePropertyData: boolean } | null {
    
    const context = this.pendingDisambiguations.get(conversationId);
    if (!context) {
      return null;
    }

    // Simple keyword matching for clarification responses
    const response = userResponse.toLowerCase().trim();
    
    // Check for specific intent indicators in response
    if (response.includes('property') || response.includes('apartment') || response.includes('see')) {
      this.pendingDisambiguations.delete(conversationId);
      return { resolvedIntent: IntentType.PROPERTY_INQUIRY, usePropertyData: true };
    }

    if (response.includes('tour') || response.includes('schedule') || response.includes('visit')) {
      this.pendingDisambiguations.delete(conversationId);
      return { resolvedIntent: IntentType.SCHEDULING_REQUEST, usePropertyData: true };
    }

    if (response.includes('process') || response.includes('apply') || response.includes('pay')) {
      this.pendingDisambiguations.delete(conversationId);
      return { resolvedIntent: IntentType.PROCESS_INQUIRY, usePropertyData: false };
    }

    if (response.includes('compare') || response.includes('trend') || response.includes('difference')) {
      this.pendingDisambiguations.delete(conversationId);
      return { resolvedIntent: IntentType.COMPARISON_REQUEST, usePropertyData: true };
    }

    // If response doesn't clearly resolve, try to match against alternative intents
    const alternatives = context.classificationResult.alternativeIntents;
    if (alternatives.length > 0) {
      // Use highest confidence alternative
      const bestAlternative = alternatives.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      this.pendingDisambiguations.delete(conversationId);
      return { 
        resolvedIntent: bestAlternative.intent, 
        usePropertyData: this.shouldUsePropertyData(bestAlternative.intent)
      };
    }

    // Increment attempts and return null to continue disambiguation
    context.clarificationAttempts++;
    this.pendingDisambiguations.set(conversationId, context);
    
    return null;
  }

  /**
   * Check if there's a pending disambiguation for a conversation
   */
  hasPendingDisambiguation(conversationId: string): boolean {
    return this.pendingDisambiguations.has(conversationId);
  }

  /**
   * Clear pending disambiguation for a conversation
   */
  clearDisambiguation(conversationId: string): void {
    this.pendingDisambiguations.delete(conversationId);
  }

  /**
   * Get pending disambiguation context
   */
  getDisambiguationContext(conversationId: string): DisambiguationContext | null {
    return this.pendingDisambiguations.get(conversationId) || null;
  }

  private generateClarificationMessage(classificationResult: IntentClassificationResult): string {
    if (classificationResult.suggestedClarifications && classificationResult.suggestedClarifications.length > 0) {
      return classificationResult.suggestedClarifications[0];
    }

    // Generate based on primary and alternative intents
    const primary = classificationResult.primaryIntent;
    const alternatives = classificationResult.alternativeIntents;

    if (alternatives.length === 0) {
      return "I'm not quite sure what you're looking for. Could you please be more specific?";
    }

    const intentLabels: Record<IntentType, string> = {
      [IntentType.PROPERTY_INQUIRY]: "see available properties",
      [IntentType.PROCESS_INQUIRY]: "learn about rental processes",
      [IntentType.SCHEDULING_REQUEST]: "schedule a property tour",
      [IntentType.COMPARISON_REQUEST]: "compare properties or see trends",
      [IntentType.GENERAL_INFO]: "get general area information",
      [IntentType.GREETING]: "chat",
      [IntentType.UNCLEAR]: "clarify your request"
    };

    const primaryLabel = intentLabels[primary] || "help with your request";
    const altLabel = intentLabels[alternatives[0]?.intent] || "something else";

    return `I can help you ${primaryLabel} or ${altLabel}. Which would you prefer?`;
  }

  private generateSuggestedActions(classificationResult: IntentClassificationResult): Array<{
    text: string;
    intent: IntentType;
    usePropertyData: boolean;
  }> {
    const actions: Array<{ text: string; intent: IntentType; usePropertyData: boolean }> = [];

    // Add primary intent action
    actions.push({
      text: this.getActionText(classificationResult.primaryIntent),
      intent: classificationResult.primaryIntent,
      usePropertyData: this.shouldUsePropertyData(classificationResult.primaryIntent)
    });

    // Add alternative intent actions
    classificationResult.alternativeIntents.forEach(alt => {
      actions.push({
        text: this.getActionText(alt.intent),
        intent: alt.intent,
        usePropertyData: this.shouldUsePropertyData(alt.intent)
      });
    });

    return actions.slice(0, 3); // Limit to 3 actions to avoid overwhelming user
  }

  private getActionText(intent: IntentType): string {
    const actionTexts: Record<IntentType, string> = {
      [IntentType.PROPERTY_INQUIRY]: "Show me available properties",
      [IntentType.PROCESS_INQUIRY]: "Explain the rental process",
      [IntentType.SCHEDULING_REQUEST]: "Schedule a property tour",
      [IntentType.COMPARISON_REQUEST]: "Compare properties and show trends",
      [IntentType.GENERAL_INFO]: "Tell me about the area",
      [IntentType.GREETING]: "Just saying hello",
      [IntentType.UNCLEAR]: "Something else"
    };

    return actionTexts[intent] || "Help with this";
  }

  private shouldUsePropertyData(intent: IntentType): boolean {
    return [
      IntentType.PROPERTY_INQUIRY,
      IntentType.COMPARISON_REQUEST,
      IntentType.SCHEDULING_REQUEST
    ].includes(intent);
  }

  /**
   * Set maximum clarification attempts
   */
  setMaxClarificationAttempts(max: number): void {
    this.maxClarificationAttempts = Math.max(1, max);
  }

  /**
   * Clean up old disambiguation contexts (call periodically)
   */
  cleanupOldContexts(maxAgeMinutes: number = 30): void {
    const now = new Date();
    const cutoffTime = new Date(now.getTime() - maxAgeMinutes * 60 * 1000);

    for (const [id, context] of this.pendingDisambiguations.entries()) {
      if (context.timestamp < cutoffTime) {
        this.pendingDisambiguations.delete(id);
      }
    }
  }
}