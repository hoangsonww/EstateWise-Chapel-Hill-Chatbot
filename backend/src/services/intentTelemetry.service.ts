import { IntentType, IntentClassificationResult } from "./intentClassification.service";
import { DisambiguationContext } from "./disambiguation.service";

/**
 * Telemetry service for monitoring intent classification performance
 * and collecting feedback for continuous improvement.
 */

export interface IntentTelemetryEvent {
  id: string;
  timestamp: Date;
  userMessage: string;
  classificationResult: IntentClassificationResult;
  actualIntent?: IntentType; // Set when user feedback is received
  disambiguationUsed: boolean;
  disambiguationSuccess?: boolean;
  userFeedback?: 'positive' | 'negative';
  responseTime: number;
  conversationId?: string;
}

export interface IntentMetrics {
  totalClassifications: number;
  accuracyRate: number;
  disambiguationRate: number;
  disambiguationSuccessRate: number;
  confidenceDistribution: Record<string, number>;
  intentDistribution: Record<IntentType, number>;
  topMisclassifications: Array<{
    userMessage: string;
    predicted: IntentType;
    actual: IntentType;
    count: number;
  }>;
  averageResponseTime: number;
}

export interface FeedbackEvent {
  classificationId: string;
  actualIntent: IntentType;
  feedback: 'positive' | 'negative';
  userComment?: string;
  timestamp: Date;
}

export class IntentTelemetryService {
  private events: Map<string, IntentTelemetryEvent> = new Map();
  private feedbackEvents: FeedbackEvent[] = [];
  private maxEvents: number = 10000;

  constructor() {}

  /**
   * Log an intent classification event
   */
  logClassification(
    userMessage: string,
    classificationResult: IntentClassificationResult,
    responseTime: number,
    conversationId?: string
  ): string {
    const eventId = this.generateEventId();
    const event: IntentTelemetryEvent = {
      id: eventId,
      timestamp: new Date(),
      userMessage,
      classificationResult,
      disambiguationUsed: classificationResult.needsDisambiguation,
      responseTime,
      conversationId,
    };

    this.events.set(eventId, event);
    this.pruneOldEvents();

    return eventId;
  }

  /**
   * Log disambiguation resolution
   */
  logDisambiguationResolution(
    classificationId: string,
    success: boolean,
    resolvedIntent?: IntentType
  ): void {
    const event = this.events.get(classificationId);
    if (event) {
      event.disambiguationSuccess = success;
      if (resolvedIntent) {
        event.actualIntent = resolvedIntent;
      }
    }
  }

  /**
   * Record user feedback on intent classification
   */
  recordFeedback(
    classificationId: string,
    actualIntent: IntentType,
    feedback: 'positive' | 'negative',
    userComment?: string
  ): void {
    const event = this.events.get(classificationId);
    if (event) {
      event.actualIntent = actualIntent;
      event.userFeedback = feedback;
    }

    this.feedbackEvents.push({
      classificationId,
      actualIntent,
      feedback,
      userComment,
      timestamp: new Date(),
    });

    this.pruneFeedbackEvents();
  }

  /**
   * Get comprehensive metrics about intent classification performance
   */
  getMetrics(): IntentMetrics {
    const events = Array.from(this.events.values());
    const eventsWithFeedback = events.filter(e => e.actualIntent !== undefined);

    // Calculate accuracy rate
    const correctClassifications = eventsWithFeedback.filter(
      e => e.classificationResult.primaryIntent === e.actualIntent
    ).length;
    const accuracyRate = eventsWithFeedback.length > 0 
      ? correctClassifications / eventsWithFeedback.length 
      : 0;

    // Calculate disambiguation metrics
    const disambiguationEvents = events.filter(e => e.disambiguationUsed);
    const disambiguationRate = events.length > 0 
      ? disambiguationEvents.length / events.length 
      : 0;
    
    const successfulDisambiguations = disambiguationEvents.filter(
      e => e.disambiguationSuccess === true
    ).length;
    const disambiguationSuccessRate = disambiguationEvents.length > 0
      ? successfulDisambiguations / disambiguationEvents.length
      : 0;

    // Calculate confidence distribution
    const confidenceDistribution: Record<string, number> = {
      'very_low': 0,    // 0.0 - 0.3
      'low': 0,         // 0.3 - 0.5
      'medium': 0,      // 0.5 - 0.7
      'high': 0,        // 0.7 - 0.9
      'very_high': 0,   // 0.9 - 1.0
    };

    events.forEach(event => {
      const confidence = event.classificationResult.confidence;
      if (confidence < 0.3) confidenceDistribution.very_low++;
      else if (confidence < 0.5) confidenceDistribution.low++;
      else if (confidence < 0.7) confidenceDistribution.medium++;
      else if (confidence < 0.9) confidenceDistribution.high++;
      else confidenceDistribution.very_high++;
    });

    // Calculate intent distribution
    const intentDistribution: Record<IntentType, number> = {} as Record<IntentType, number>;
    Object.values(IntentType).forEach(intent => {
      intentDistribution[intent] = 0;
    });

    events.forEach(event => {
      intentDistribution[event.classificationResult.primaryIntent]++;
    });

    // Find top misclassifications
    const misclassifications: Record<string, { userMessage: string; predicted: IntentType; actual: IntentType; count: number }> = {};
    
    eventsWithFeedback
      .filter(e => e.classificationResult.primaryIntent !== e.actualIntent)
      .forEach(event => {
        const key = `${event.userMessage}|${event.classificationResult.primaryIntent}|${event.actualIntent}`;
        if (misclassifications[key]) {
          misclassifications[key].count++;
        } else {
          misclassifications[key] = {
            userMessage: event.userMessage,
            predicted: event.classificationResult.primaryIntent,
            actual: event.actualIntent!,
            count: 1,
          };
        }
      });

    const topMisclassifications = Object.values(misclassifications)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate average response time
    const averageResponseTime = events.length > 0
      ? events.reduce((sum, e) => sum + e.responseTime, 0) / events.length
      : 0;

    return {
      totalClassifications: events.length,
      accuracyRate,
      disambiguationRate,
      disambiguationSuccessRate,
      confidenceDistribution,
      intentDistribution,
      topMisclassifications,
      averageResponseTime,
    };
  }

  /**
   * Get events that need human review (low confidence, negative feedback, etc.)
   */
  getEventsForReview(): IntentTelemetryEvent[] {
    return Array.from(this.events.values())
      .filter(event => 
        event.classificationResult.confidence < 0.5 ||
        event.userFeedback === 'negative' ||
        (event.disambiguationUsed && event.disambiguationSuccess === false)
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 50); // Return top 50 events for review
  }

  /**
   * Generate training data from validated feedback
   */
  getTrainingData(): Array<{ text: string; intent: IntentType; confidence: number }> {
    return this.feedbackEvents
      .filter(feedback => feedback.feedback === 'positive')
      .map(feedback => {
        const event = this.events.get(feedback.classificationId);
        if (event) {
          return {
            text: event.userMessage,
            intent: feedback.actualIntent,
            confidence: 1.0 // High confidence for validated examples
          };
        }
        return null;
      })
      .filter(item => item !== null) as Array<{ text: string; intent: IntentType; confidence: number }>;
  }

  /**
   * Detect spikes in classification errors
   */
  detectErrorSpikes(timeWindowMinutes: number = 60, errorThreshold: number = 0.3): boolean {
    const now = new Date();
    const windowStart = new Date(now.getTime() - timeWindowMinutes * 60 * 1000);
    
    const recentEvents = Array.from(this.events.values())
      .filter(event => event.timestamp >= windowStart);
    
    if (recentEvents.length < 10) {
      return false; // Not enough data to detect spikes
    }

    const recentErrors = recentEvents.filter(event => 
      event.userFeedback === 'negative' ||
      (event.disambiguationUsed && event.disambiguationSuccess === false) ||
      event.classificationResult.confidence < 0.3
    );

    const errorRate = recentErrors.length / recentEvents.length;
    return errorRate > errorThreshold;
  }

  /**
   * Get confusion matrix for intent classification
   */
  getConfusionMatrix(): Record<IntentType, Record<IntentType, number>> {
    const matrix: Record<IntentType, Record<IntentType, number>> = {} as Record<IntentType, Record<IntentType, number>>;
    
    // Initialize matrix
    Object.values(IntentType).forEach(predicted => {
      matrix[predicted] = {} as Record<IntentType, number>;
      Object.values(IntentType).forEach(actual => {
        matrix[predicted][actual] = 0;
      });
    });

    // Fill matrix with actual vs predicted data
    Array.from(this.events.values())
      .filter(event => event.actualIntent !== undefined)
      .forEach(event => {
        const predicted = event.classificationResult.primaryIntent;
        const actual = event.actualIntent!;
        matrix[predicted][actual]++;
      });

    return matrix;
  }

  private generateEventId(): string {
    return `intent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private pruneOldEvents(): void {
    if (this.events.size > this.maxEvents) {
      const sortedEvents = Array.from(this.events.entries())
        .sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toRemove = sortedEvents.slice(0, this.events.size - this.maxEvents);
      toRemove.forEach(([id]) => this.events.delete(id));
    }
  }

  private pruneFeedbackEvents(): void {
    if (this.feedbackEvents.length > 1000) {
      this.feedbackEvents = this.feedbackEvents
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 1000);
    }
  }

  /**
   * Export data for external analysis
   */
  exportData(): {
    events: IntentTelemetryEvent[];
    feedback: FeedbackEvent[];
    metrics: IntentMetrics;
  } {
    return {
      events: Array.from(this.events.values()),
      feedback: [...this.feedbackEvents],
      metrics: this.getMetrics(),
    };
  }

  /**
   * Clear all telemetry data
   */
  clearData(): void {
    this.events.clear();
    this.feedbackEvents = [];
  }
}