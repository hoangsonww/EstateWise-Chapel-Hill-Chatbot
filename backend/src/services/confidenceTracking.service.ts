import InferenceLog, { IExpertPrediction, IInferenceLog } from "../models/InferenceLog.model";
import { ActiveLearningExample } from "../models/ActiveLearning.model";

/**
 * Configuration for ambiguity detection heuristics
 */
interface AmbiguityConfig {
  lowConfidenceThreshold: number;
  nearEqualScoreThreshold: number;
  minExpertAgreement: number;
  complexityScoreThreshold: number;
}

/**
 * Default configuration for ambiguity detection
 */
const DEFAULT_AMBIGUITY_CONFIG: AmbiguityConfig = {
  lowConfidenceThreshold: 0.6, // Below this is considered low confidence
  nearEqualScoreThreshold: 0.15, // Difference between top 2 experts
  minExpertAgreement: 0.7, // Minimum agreement between experts
  complexityScoreThreshold: 0.8, // Above this is considered complex
};

/**
 * Result of confidence analysis
 */
export interface ConfidenceAnalysis {
  overallConfidence: number;
  isAmbiguous: boolean;
  ambiguityReason?: string;
  ambiguityScore: number;
  expertAgreement: number;
  topExpertConfidence: number;
  secondTopExpertConfidence: number;
  scoreVariance: number;
}

/**
 * Service for tracking inference confidence and detecting ambiguous examples
 */
export class ConfidenceTrackingService {
  private config: AmbiguityConfig;

  constructor(config: Partial<AmbiguityConfig> = {}) {
    this.config = { ...DEFAULT_AMBIGUITY_CONFIG, ...config };
  }

  /**
   * Analyzes expert predictions to determine confidence and detect ambiguity
   */
  public analyzeConfidence(expertPredictions: IExpertPrediction[]): ConfidenceAnalysis {
    const confidenceScores = expertPredictions.map((p) => p.confidenceScore);
    
    // Calculate overall confidence metrics
    const averageConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
    const maxConfidence = Math.max(...confidenceScores);
    const minConfidence = Math.min(...confidenceScores);
    const scoreVariance = this.calculateVariance(confidenceScores);
    
    // Sort predictions by confidence (descending)
    const sortedPredictions = [...expertPredictions].sort((a, b) => b.confidenceScore - a.confidenceScore);
    const topExpertConfidence = sortedPredictions[0]?.confidenceScore || 0;
    const secondTopExpertConfidence = sortedPredictions[1]?.confidenceScore || 0;
    
    // Calculate expert agreement (how close are the top scores)
    const expertAgreement = 1 - (maxConfidence - minConfidence);
    
    // Detect ambiguity using multiple heuristics
    const ambiguityAnalysis = this.detectAmbiguity({
      averageConfidence,
      topExpertConfidence,
      secondTopExpertConfidence,
      expertAgreement,
      scoreVariance,
    });

    return {
      overallConfidence: averageConfidence,
      isAmbiguous: ambiguityAnalysis.isAmbiguous,
      ambiguityReason: ambiguityAnalysis.reason,
      ambiguityScore: ambiguityAnalysis.score,
      expertAgreement,
      topExpertConfidence,
      secondTopExpertConfidence,
      scoreVariance,
    };
  }

  /**
   * Logs an inference with confidence tracking
   */
  public async logInference(data: {
    conversationId?: string;
    userId?: string;
    userQuery: string;
    expertPredictions: IExpertPrediction[];
    finalResponse: string;
    contextSnippet?: string;
    metadata?: any;
  }): Promise<IInferenceLog> {
    const confidenceAnalysis = this.analyzeConfidence(data.expertPredictions);
    
    const inferenceLog = new InferenceLog({
      conversationId: data.conversationId,
      userId: data.userId,
      userQuery: data.userQuery,
      expertPredictions: data.expertPredictions,
      finalResponse: data.finalResponse,
      confidenceScore: confidenceAnalysis.overallConfidence,
      isAmbiguous: confidenceAnalysis.isAmbiguous,
      ambiguityReason: confidenceAnalysis.ambiguityReason,
      contextSnippet: data.contextSnippet,
      metadata: {
        ...data.metadata,
        queryComplexity: this.calculateQueryComplexity(data.userQuery),
        responseLatency: data.expertPredictions.reduce((sum, p) => sum + p.processingTime, 0),
      },
      timestamp: new Date(),
    });

    const savedLog = await inferenceLog.save();

    // If ambiguous, consider for active learning
    if (confidenceAnalysis.isAmbiguous) {
      await this.considerForActiveLearning(savedLog, confidenceAnalysis);
    }

    return savedLog;
  }

  /**
   * Updates inference log with user feedback
   */
  public async updateWithFeedback(
    inferenceLogId: string,
    feedback: "up" | "down"
  ): Promise<void> {
    await InferenceLog.findByIdAndUpdate(inferenceLogId, {
      userFeedback: feedback,
    });

    // If negative feedback on an ambiguous example, increase priority for review
    if (feedback === "down") {
      const inferenceLog = await InferenceLog.findById(inferenceLogId);
      if (inferenceLog?.isAmbiguous) {
        await ActiveLearningExample.findOneAndUpdate(
          { inferenceLogId },
          { $inc: { priorityScore: 0.2 } }
        );
      }
    }
  }

  /**
   * Detects ambiguity using multiple heuristics
   */
  private detectAmbiguity(metrics: {
    averageConfidence: number;
    topExpertConfidence: number;
    secondTopExpertConfidence: number;
    expertAgreement: number;
    scoreVariance: number;
  }): { isAmbiguous: boolean; reason?: string; score: number } {
    const reasons: string[] = [];
    let ambiguityScore = 0;

    // Heuristic 1: Low overall confidence
    if (metrics.averageConfidence < this.config.lowConfidenceThreshold) {
      reasons.push("low_confidence");
      ambiguityScore += 0.3;
    }

    // Heuristic 2: Near-equal top scores (close competition between experts)
    const scoreDifference = metrics.topExpertConfidence - metrics.secondTopExpertConfidence;
    if (scoreDifference < this.config.nearEqualScoreThreshold) {
      reasons.push("near_equal_scores");
      ambiguityScore += 0.4;
    }

    // Heuristic 3: Low expert agreement (high variance in scores)
    if (metrics.expertAgreement < this.config.minExpertAgreement) {
      reasons.push("low_expert_agreement");
      ambiguityScore += 0.2;
    }

    // Heuristic 4: High score variance
    if (metrics.scoreVariance > 0.1) {
      reasons.push("high_score_variance");
      ambiguityScore += 0.1;
    }

    const isAmbiguous = ambiguityScore > 0.3; // Threshold for considering ambiguous

    return {
      isAmbiguous,
      reason: reasons.length > 0 ? reasons.join(", ") : undefined,
      score: Math.min(ambiguityScore, 1.0),
    };
  }

  /**
   * Considers an ambiguous inference for active learning
   */
  private async considerForActiveLearning(
    inferenceLog: IInferenceLog,
    confidenceAnalysis: ConfidenceAnalysis
  ): Promise<void> {
    // Check if already exists
    const existing = await ActiveLearningExample.findOne({
      inferenceLogId: inferenceLog._id,
    });

    if (existing) {
      return; // Already considered
    }

    // Calculate priority score based on multiple factors
    const priorityScore = this.calculatePriorityScore(inferenceLog, confidenceAnalysis);

    // Only add if priority score is above threshold
    if (priorityScore > 0.5) {
      const activeLearningExample = new ActiveLearningExample({
        inferenceLogId: inferenceLog._id,
        userQuery: inferenceLog.userQuery,
        originalPredictions: inferenceLog.expertPredictions.map((p) => ({
          expert: p.expert,
          response: p.response,
          confidenceScore: p.confidenceScore,
        })),
        contextSnippet: inferenceLog.contextSnippet,
        samplingReason: confidenceAnalysis.ambiguityReason || "ambiguous_inference",
        priorityScore,
        metadata: {
          originalConfidence: confidenceAnalysis.overallConfidence,
          ambiguityScore: confidenceAnalysis.ambiguityScore,
          queryComplexity: inferenceLog.metadata?.queryComplexity || 0,
        },
      });

      await activeLearningExample.save();
    }
  }

  /**
   * Calculates priority score for active learning consideration
   */
  private calculatePriorityScore(
    inferenceLog: IInferenceLog,
    confidenceAnalysis: ConfidenceAnalysis
  ): number {
    let score = 0;

    // Base score from ambiguity
    score += confidenceAnalysis.ambiguityScore * 0.4;

    // Boost for very low confidence
    if (confidenceAnalysis.overallConfidence < 0.4) {
      score += 0.2;
    }

    // Boost for high expert disagreement
    if (confidenceAnalysis.expertAgreement < 0.5) {
      score += 0.2;
    }

    // Boost for complex queries
    const queryComplexity = inferenceLog.metadata?.queryComplexity || 0;
    if (queryComplexity > 0.7) {
      score += 0.1;
    }

    // Boost for recent examples (recency bias)
    const hoursSinceCreation = (Date.now() - inferenceLog.timestamp.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation < 24) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Calculates query complexity based on various factors
   */
  private calculateQueryComplexity(query: string): number {
    let complexity = 0;

    // Length factor
    complexity += Math.min(query.length / 200, 0.3);

    // Question words and complexity indicators
    const complexWords = ["compare", "difference", "versus", "vs", "better", "recommend", "suggest", "pros", "cons"];
    const questionWords = ["what", "how", "why", "when", "where", "which", "should"];
    
    const lowerQuery = query.toLowerCase();
    complexWords.forEach((word) => {
      if (lowerQuery.includes(word)) complexity += 0.1;
    });
    
    questionWords.forEach((word) => {
      if (lowerQuery.includes(word)) complexity += 0.05;
    });

    // Multiple sentences
    const sentences = query.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    if (sentences.length > 1) {
      complexity += sentences.length * 0.1;
    }

    return Math.min(complexity, 1.0);
  }

  /**
   * Calculates variance of an array of numbers
   */
  private calculateVariance(numbers: number[]): number {
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDifferences = numbers.map((num) => Math.pow(num - mean, 2));
    return squaredDifferences.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  /**
   * Gets statistics about confidence tracking
   */
  public async getConfidenceStats(timeRange?: { start: Date; end: Date }) {
    const query: any = {};
    if (timeRange) {
      query.timestamp = { $gte: timeRange.start, $lte: timeRange.end };
    }

    const stats = await InferenceLog.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalInferences: { $sum: 1 },
          ambiguousCount: { $sum: { $cond: ["$isAmbiguous", 1, 0] } },
          avgConfidence: { $avg: "$confidenceScore" },
          lowConfidenceCount: {
            $sum: { $cond: [{ $lt: ["$confidenceScore", this.config.lowConfidenceThreshold] }, 1, 0] },
          },
          thumbsDownCount: { $sum: { $cond: [{ $eq: ["$userFeedback", "down"] }, 1, 0] } },
        },
      },
    ]);

    return stats[0] || {
      totalInferences: 0,
      ambiguousCount: 0,
      avgConfidence: 0,
      lowConfidenceCount: 0,
      thumbsDownCount: 0,
    };
  }
}