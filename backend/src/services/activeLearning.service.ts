import { ActiveLearningExample, ReviewerConsensus } from "../models/ActiveLearning.model";
import InferenceLog from "../models/InferenceLog.model";

/**
 * Configuration for active learning sampling
 */
interface SamplingConfig {
  maxSamplesPerDay: number;
  priorityThreshold: number;
  diversityWeight: number;
  recentnessWeight: number;
  minConfidenceGap: number;
}

/**
 * Default sampling configuration
 */
const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  maxSamplesPerDay: 50, // Maximum examples to sample per day
  priorityThreshold: 0.5, // Minimum priority score to consider
  diversityWeight: 0.3, // Weight for query diversity
  recentnessWeight: 0.2, // Weight for recent examples
  minConfidenceGap: 0.1, // Minimum confidence gap for interesting examples
};

/**
 * Service for sampling and prioritizing examples for human review
 */
export class ActiveLearningService {
  private config: SamplingConfig;

  constructor(config: Partial<SamplingConfig> = {}) {
    this.config = { ...DEFAULT_SAMPLING_CONFIG, ...config };
  }

  /**
   * Samples high-value examples for human review using various strategies
   */
  public async sampleExamplesForReview(limit: number = 20): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check how many examples we've already sampled today
    const todaySampleCount = await ActiveLearningExample.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });

    const remainingSlots = Math.max(0, this.config.maxSamplesPerDay - todaySampleCount);
    const actualLimit = Math.min(limit, remainingSlots);

    if (actualLimit === 0) {
      return [];
    }

    // Get pending examples sorted by priority
    const pendingExamples = await ActiveLearningExample.find({
      status: "pending",
      priorityScore: { $gte: this.config.priorityThreshold },
    })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(actualLimit * 2) // Get more candidates for diversity filtering
      .populate("inferenceLogId");

    // Apply diversity filtering and final selection
    const selectedExamples = this.applyDiversityFiltering(pendingExamples, actualLimit);

    // Update status to 'in_review' for selected examples
    const selectedIds = selectedExamples.map((ex) => ex._id);
    await ActiveLearningExample.updateMany(
      { _id: { $in: selectedIds } },
      { $set: { status: "in_review" } }
    );

    return selectedExamples;
  }

  /**
   * Gets the review queue for human reviewers
   */
  public async getReviewQueue(
    status: "pending" | "in_review" | "reviewed" = "in_review",
    limit: number = 20
  ) {
    return await ActiveLearningExample.find({ status })
      .sort({ priorityScore: -1, createdAt: -1 })
      .limit(limit)
      .populate("inferenceLogId");
  }

  /**
   * Submits a human review for an example
   */
  public async submitReview(data: {
    exampleId: string;
    reviewerId: string;
    correctedIntent: string;
    correctedResponse?: string;
    confidence: number; // 1-5 scale
    reviewNotes?: string;
  }) {
    const example = await ActiveLearningExample.findById(data.exampleId);
    if (!example) {
      throw new Error("Example not found");
    }

    // Update the example with review data
    example.status = "reviewed";
    example.reviewedBy = data.reviewerId;
    example.reviewedAt = new Date();
    example.correctedIntent = data.correctedIntent;
    example.correctedResponse = data.correctedResponse;
    example.reviewerConfidence = data.confidence;
    example.reviewNotes = data.reviewNotes;
    example.version += 1;

    await example.save();

    // Check if multiple reviews exist for consensus tracking
    await this.handleConsensusTracking(data.exampleId, {
      reviewerId: data.reviewerId,
      correctedIntent: data.correctedIntent,
      correctedResponse: data.correctedResponse,
      confidence: data.confidence,
      reviewNotes: data.reviewNotes,
      timestamp: new Date(),
    });

    return example;
  }

  /**
   * Handles consensus tracking for multiple reviewers
   */
  private async handleConsensusTracking(
    exampleId: string,
    review: {
      reviewerId: string;
      correctedIntent: string;
      correctedResponse?: string;
      confidence: number;
      reviewNotes?: string;
      timestamp: Date;
    }
  ) {
    let consensus = await ReviewerConsensus.findOne({ exampleId });

    if (!consensus) {
      consensus = new ReviewerConsensus({
        exampleId,
        reviews: [review],
        isResolved: true, // Single review is considered resolved
      });
    } else {
      // Add the new review
      consensus.reviews.push(review);

      // Check for conflicts and resolve if needed
      await this.resolveConsensus(consensus);
    }

    await consensus.save();
  }

  /**
   * Resolves consensus when multiple reviews exist
   */
  private async resolveConsensus(consensus: any) {
    const reviews = consensus.reviews;
    const intents = reviews.map((r: any) => r.correctedIntent);
    const uniqueIntents = [...new Set(intents)];

    if (uniqueIntents.length === 1) {
      // Perfect agreement
      consensus.consensusIntent = uniqueIntents[0];
      consensus.consensusConfidence = reviews.reduce((sum: number, r: any) => sum + r.confidence, 0) / reviews.length;
      consensus.resolutionMethod = "majority";
      consensus.isResolved = true;
    } else {
      // Conflict exists - use majority rule or escalate
      const intentCounts = intents.reduce((acc: any, intent: string) => {
        acc[intent] = (acc[intent] || 0) + 1;
        return acc;
      }, {});

      const sortedIntents = Object.entries(intentCounts).sort(([, a], [, b]) => (b as number) - (a as number));
      const majorityIntent = sortedIntents[0][0];
      const majorityCount = sortedIntents[0][1] as number;

      if (majorityCount > reviews.length / 2) {
        // Clear majority exists
        consensus.consensusIntent = majorityIntent;
        consensus.resolutionMethod = "majority";
        consensus.isResolved = true;
      } else {
        // No clear majority - needs escalation
        consensus.resolutionMethod = "escalation";
        consensus.isResolved = false;
      }
    }
  }

  /**
   * Applies diversity filtering to avoid sampling too many similar examples
   */
  private applyDiversityFiltering(candidates: any[], targetCount: number): any[] {
    if (candidates.length <= targetCount) {
      return candidates;
    }

    const selected: any[] = [];
    const remaining = [...candidates];

    // Always select the highest priority example first
    selected.push(remaining.shift()!);

    // Select remaining examples based on diversity and priority
    while (selected.length < targetCount && remaining.length > 0) {
      let bestCandidate = null;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        const diversityScore = this.calculateDiversityScore(candidate, selected);
        const priorityScore = candidate.priorityScore;
        
        // Combined score: priority + diversity
        const combinedScore = priorityScore * (1 - this.config.diversityWeight) + 
                             diversityScore * this.config.diversityWeight;

        if (combinedScore > bestScore) {
          bestScore = combinedScore;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate) {
        selected.push(bestCandidate);
        const index = remaining.indexOf(bestCandidate);
        remaining.splice(index, 1);
      } else {
        break;
      }
    }

    return selected;
  }

  /**
   * Calculates diversity score for a candidate relative to already selected examples
   */
  private calculateDiversityScore(candidate: any, selected: any[]): number {
    if (selected.length === 0) {
      return 1.0;
    }

    let totalSimilarity = 0;
    const candidateQuery = candidate.userQuery.toLowerCase();

    for (const selectedExample of selected) {
      const selectedQuery = selectedExample.userQuery.toLowerCase();
      const similarity = this.calculateTextSimilarity(candidateQuery, selectedQuery);
      totalSimilarity += similarity;
    }

    const avgSimilarity = totalSimilarity / selected.length;
    return 1 - avgSimilarity; // Higher diversity = lower similarity
  }

  /**
   * Simple text similarity calculation using word overlap
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Gets statistics about the active learning pipeline
   */
  public async getActiveLearningStats(timeRange?: { start: Date; end: Date }) {
    const query: any = {};
    if (timeRange) {
      query.createdAt = { $gte: timeRange.start, $lte: timeRange.end };
    }

    const [exampleStats, consensusStats] = await Promise.all([
      ActiveLearningExample.aggregate([
        { $match: query },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            avgPriority: { $avg: "$priorityScore" },
            avgConfidence: { $avg: "$metadata.originalConfidence" },
          },
        },
      ]),
      ReviewerConsensus.aggregate([
        {
          $group: {
            _id: "$resolutionMethod",
            count: { $sum: 1 },
            resolvedCount: { $sum: { $cond: ["$isResolved", 1, 0] } },
          },
        },
      ]),
    ]);

    return {
      examples: exampleStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = {
          count: stat.count,
          avgPriority: stat.avgPriority,
          avgConfidence: stat.avgConfidence,
        };
        return acc;
      }, {}),
      consensus: consensusStats.reduce((acc: any, stat: any) => {
        acc[stat._id] = {
          count: stat.count,
          resolvedCount: stat.resolvedCount,
        };
        return acc;
      }, {}),
    };
  }

  /**
   * Gets validated examples ready for training data integration
   */
  public async getValidatedExamples(limit: number = 100) {
    return await ActiveLearningExample.find({
      status: "reviewed",
      reviewerConfidence: { $gte: 3 }, // Only high-confidence reviews
    })
      .sort({ reviewedAt: -1 })
      .limit(limit)
      .populate("inferenceLogId");
  }

  /**
   * Marks examples as integrated into training data
   */
  public async markExamplesAsIntegrated(exampleIds: string[]) {
    await ActiveLearningExample.updateMany(
      { _id: { $in: exampleIds } },
      { 
        $set: { 
          "metadata.integrated": true,
          "metadata.integratedAt": new Date()
        }
      }
    );
  }
}