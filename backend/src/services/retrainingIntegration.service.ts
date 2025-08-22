import { ActiveLearningService } from "./activeLearning.service";
import { ConfidenceTrackingService } from "./confidenceTracking.service";

/**
 * Configuration for retraining integration
 */
interface RetrainingConfig {
  minExamplesForRetraining: number;
  minReviewerConfidence: number;
  retrainingSchedule: "manual" | "daily" | "weekly";
  validationSplitRatio: number;
}

/**
 * Default retraining configuration
 */
const DEFAULT_RETRAINING_CONFIG: RetrainingConfig = {
  minExamplesForRetraining: 50, // Minimum examples needed to trigger retraining
  minReviewerConfidence: 3, // Minimum reviewer confidence (1-5 scale)
  retrainingSchedule: "weekly", // How often to check for retraining
  validationSplitRatio: 0.2, // 20% for validation
};

/**
 * Structure for training data
 */
export interface TrainingExample {
  id: string;
  userQuery: string;
  correctedIntent: string;
  correctedResponse?: string;
  originalPredictions: {
    expert: string;
    response: string;
    confidenceScore: number;
  }[];
  metadata: {
    originalConfidence: number;
    ambiguityScore: number;
    reviewerConfidence: number;
    contextSnippet?: string;
    timestamp: Date;
  };
}

/**
 * Service for integrating active learning outputs into retraining pipeline
 */
export class RetrainingIntegrationService {
  private config: RetrainingConfig;
  private activeLearningService: ActiveLearningService;
  private confidenceTracker: ConfidenceTrackingService;

  constructor(
    config: Partial<RetrainingConfig> = {},
    activeLearningService?: ActiveLearningService,
    confidenceTracker?: ConfidenceTrackingService
  ) {
    this.config = { ...DEFAULT_RETRAINING_CONFIG, ...config };
    this.activeLearningService = activeLearningService || new ActiveLearningService();
    this.confidenceTracker = confidenceTracker || new ConfidenceTrackingService();
  }

  /**
   * Checks if retraining should be triggered based on available validated examples
   */
  public async shouldTriggerRetraining(): Promise<{
    shouldRetrain: boolean;
    reason: string;
    availableExamples: number;
    recommendedAction: string;
  }> {
    const validatedExamples = await this.activeLearningService.getValidatedExamples(
      this.config.minExamplesForRetraining * 2
    );

    const highConfidenceExamples = validatedExamples.filter(
      (example: any) => example.reviewerConfidence >= this.config.minReviewerConfidence
    );

    const shouldRetrain = highConfidenceExamples.length >= this.config.minExamplesForRetraining;

    return {
      shouldRetrain,
      reason: shouldRetrain
        ? `${highConfidenceExamples.length} high-confidence examples available`
        : `Only ${highConfidenceExamples.length} examples available (need ${this.config.minExamplesForRetraining})`,
      availableExamples: highConfidenceExamples.length,
      recommendedAction: shouldRetrain
        ? "Proceed with retraining"
        : "Continue collecting examples or lower threshold",
    };
  }

  /**
   * Prepares training data from validated examples
   */
  public async prepareTrainingData(): Promise<{
    trainingExamples: TrainingExample[];
    validationExamples: TrainingExample[];
    statistics: {
      totalExamples: number;
      trainingCount: number;
      validationCount: number;
      avgReviewerConfidence: number;
      intentDistribution: Record<string, number>;
    };
  }> {
    const validatedExamples = await this.activeLearningService.getValidatedExamples(1000);

    // Filter for high-confidence examples
    const highConfidenceExamples = validatedExamples.filter(
      (example: any) => example.reviewerConfidence >= this.config.minReviewerConfidence
    );

    // Convert to training format
    const trainingExamples: TrainingExample[] = highConfidenceExamples.map((example: any) => ({
      id: example._id.toString(),
      userQuery: example.userQuery,
      correctedIntent: example.correctedIntent,
      correctedResponse: example.correctedResponse,
      originalPredictions: example.originalPredictions,
      metadata: {
        originalConfidence: example.metadata.originalConfidence,
        ambiguityScore: example.metadata.ambiguityScore,
        reviewerConfidence: example.reviewerConfidence,
        contextSnippet: example.contextSnippet,
        timestamp: example.reviewedAt || example.createdAt,
      },
    }));

    // Split into training and validation sets
    const shuffled = this.shuffleArray([...trainingExamples]);
    const splitIndex = Math.floor(shuffled.length * (1 - this.config.validationSplitRatio));
    const training = shuffled.slice(0, splitIndex);
    const validation = shuffled.slice(splitIndex);

    // Calculate statistics
    const intentDistribution = trainingExamples.reduce((acc, example) => {
      acc[example.correctedIntent] = (acc[example.correctedIntent] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgReviewerConfidence =
      trainingExamples.reduce((sum, ex) => sum + ex.metadata.reviewerConfidence, 0) /
      trainingExamples.length;

    return {
      trainingExamples: training,
      validationExamples: validation,
      statistics: {
        totalExamples: trainingExamples.length,
        trainingCount: training.length,
        validationCount: validation.length,
        avgReviewerConfidence,
        intentDistribution,
      },
    };
  }

  /**
   * Creates an ambiguity-focused validation slice for evaluation
   */
  public async createAmbiguityValidationSlice(): Promise<{
    ambiguousExamples: TrainingExample[];
    nonAmbiguousExamples: TrainingExample[];
    statistics: {
      ambiguousCount: number;
      nonAmbiguousCount: number;
      avgOriginalConfidence: number;
      commonAmbiguityReasons: Record<string, number>;
    };
  }> {
    const { trainingExamples, validationExamples } = await this.prepareTrainingData();
    const allExamples = [...trainingExamples, ...validationExamples];

    // Separate ambiguous from non-ambiguous examples
    const ambiguousExamples = allExamples.filter(
      (example) => example.metadata.originalConfidence < 0.7 || example.metadata.ambiguityScore > 0.3
    );

    const nonAmbiguousExamples = allExamples.filter(
      (example) => example.metadata.originalConfidence >= 0.7 && example.metadata.ambiguityScore <= 0.3
    );

    // Get ambiguity reasons from inference logs
    const InferenceLog = (await import("../models/InferenceLog.model")).default;
    const ambiguityReasons = await InferenceLog.aggregate([
      { 
        $match: { 
          isAmbiguous: true,
          ambiguityReason: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$ambiguityReason",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const commonAmbiguityReasons = ambiguityReasons.reduce((acc: Record<string, number>, reason: any) => {
      acc[reason._id] = reason.count;
      return acc;
    }, {});

    const avgOriginalConfidence =
      ambiguousExamples.reduce((sum, ex) => sum + ex.metadata.originalConfidence, 0) /
      (ambiguousExamples.length || 1);

    return {
      ambiguousExamples,
      nonAmbiguousExamples,
      statistics: {
        ambiguousCount: ambiguousExamples.length,
        nonAmbiguousCount: nonAmbiguousExamples.length,
        avgOriginalConfidence,
        commonAmbiguityReasons,
      },
    };
  }

  /**
   * Processes retraining results and updates system metrics
   */
  public async processRetrainingResults(results: {
    modelVersion: string;
    trainingAccuracy: number;
    validationAccuracy: number;
    ambiguitySliceAccuracy: number;
    trainingDate: Date;
    examplesUsed: string[];
  }): Promise<void> {
    try {
      // Mark examples as integrated
      await this.activeLearningService.markExamplesAsIntegrated(results.examplesUsed);

      // Log retraining metrics (could be expanded to store in a dedicated metrics collection)
      console.log("Retraining completed:", {
        modelVersion: results.modelVersion,
        trainingAccuracy: results.trainingAccuracy,
        validationAccuracy: results.validationAccuracy,
        ambiguitySliceAccuracy: results.ambiguitySliceAccuracy,
        trainingDate: results.trainingDate,
        examplesCount: results.examplesUsed.length,
      });

      // Could add more sophisticated tracking here:
      // - Store metrics in database
      // - Update model performance tracking
      // - Trigger notifications for significant improvements
      // - Update confidence thresholds based on performance

    } catch (error) {
      console.error("Error processing retraining results:", error);
      throw error;
    }
  }

  /**
   * Gets retraining pipeline statistics and recommendations
   */
  public async getRetrainingStats(): Promise<{
    pipeline: {
      readyForRetraining: boolean;
      availableExamples: number;
      requiredExamples: number;
      lastRetrainingDate?: Date;
    };
    quality: {
      avgReviewerConfidence: number;
      consensusRate: number;
      ambiguityReduction: number;
    };
    recommendations: string[];
  }> {
    const retrainingCheck = await this.shouldTriggerRetraining();
    const { statistics } = await this.prepareTrainingData();
    const confidenceStats = await this.confidenceTracker.getConfidenceStats();

    // Calculate consensus rate (simplified - could be more sophisticated)
    const activeLearningStats = await this.activeLearningService.getActiveLearningStats();
    const totalReviewed = Object.values(activeLearningStats.examples).reduce(
      (sum: number, stat: any) => sum + (stat.count || 0), 0
    );
    const consensusRate = totalReviewed > 0 ? 0.85 : 0; // Placeholder - real implementation would calculate

    // Calculate ambiguity reduction (placeholder)
    const ambiguityReduction = confidenceStats.totalInferences > 0 
      ? 1 - (confidenceStats.ambiguousCount / confidenceStats.totalInferences)
      : 0;

    const recommendations: string[] = [];
    
    if (!retrainingCheck.shouldRetrain) {
      recommendations.push("Continue collecting examples to reach retraining threshold");
    }
    
    if (statistics.avgReviewerConfidence < 3.5) {
      recommendations.push("Focus on improving reviewer confidence through better guidelines");
    }
    
    if (ambiguityReduction < 0.7) {
      recommendations.push("Consider adjusting ambiguity detection thresholds");
    }

    return {
      pipeline: {
        readyForRetraining: retrainingCheck.shouldRetrain,
        availableExamples: retrainingCheck.availableExamples,
        requiredExamples: this.config.minExamplesForRetraining,
        // lastRetrainingDate would come from a retraining log
      },
      quality: {
        avgReviewerConfidence: statistics.avgReviewerConfidence || 0,
        consensusRate,
        ambiguityReduction,
      },
      recommendations,
    };
  }

  /**
   * Utility function to shuffle an array
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}