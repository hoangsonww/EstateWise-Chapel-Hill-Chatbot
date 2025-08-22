import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     ActiveLearningExample:
 *       type: object
 *       description: Ambiguous examples selected for human review in active learning
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the active learning example
 *         inferenceLogId:
 *           type: string
 *           description: Reference to the original inference log
 *         userQuery:
 *           type: string
 *           description: The original user query
 *         originalPredictions:
 *           type: object
 *           description: Original expert predictions and confidence scores
 *         contextSnippet:
 *           type: string
 *           description: Relevant context for the query
 *         samplingReason:
 *           type: string
 *           description: Why this example was selected for review
 *         priorityScore:
 *           type: number
 *           description: Priority score for review ordering
 *         status:
 *           type: string
 *           enum: [pending, in_review, reviewed, rejected]
 *           description: Current status of the review
 *         reviewedBy:
 *           type: string
 *           description: ID of the reviewer who labeled this example
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           description: When the review was completed
 *         correctedIntent:
 *           type: string
 *           description: Human-corrected intent classification
 *         correctedResponse:
 *           type: string
 *           description: Human-corrected response (optional)
 *         reviewerConfidence:
 *           type: number
 *           description: Reviewer's confidence in the correction (1-5 scale)
 *         reviewNotes:
 *           type: string
 *           description: Additional notes from the reviewer
 *         version:
 *           type: number
 *           description: Version number for tracking changes
 *         metadata:
 *           type: object
 *           description: Additional metadata for the example
 *       required:
 *         - inferenceLogId
 *         - userQuery
 *         - originalPredictions
 *         - samplingReason
 *         - priorityScore
 *     
 *     ReviewerConsensus:
 *       type: object
 *       description: Tracks consensus among multiple reviewers for conflict resolution
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the consensus record
 *         exampleId:
 *           type: string
 *           description: Reference to the active learning example
 *         reviews:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               reviewerId:
 *                 type: string
 *               correctedIntent:
 *                 type: string
 *               confidence:
 *                 type: number
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *         consensusIntent:
 *           type: string
 *           description: Final consensus intent after conflict resolution
 *         consensusConfidence:
 *           type: number
 *           description: Confidence in the consensus decision
 *         resolutionMethod:
 *           type: string
 *           description: How the consensus was reached (majority, expert, discussion)
 */

/**
 * Individual review from a human reviewer
 */
export interface IReview {
  reviewerId: string;
  correctedIntent: string;
  correctedResponse?: string;
  confidence: number; // 1-5 scale
  reviewNotes?: string;
  timestamp: Date;
}

/**
 * Represents an ambiguous example selected for human review
 */
export interface IActiveLearningExample extends Document {
  inferenceLogId: mongoose.Types.ObjectId;
  userQuery: string;
  originalPredictions: {
    expert: string;
    response: string;
    confidenceScore: number;
  }[];
  contextSnippet?: string;
  samplingReason: string;
  priorityScore: number;
  status: "pending" | "in_review" | "reviewed" | "rejected";
  reviewedBy?: string;
  reviewedAt?: Date;
  correctedIntent?: string;
  correctedResponse?: string;
  reviewerConfidence?: number;
  reviewNotes?: string;
  version: number;
  metadata: {
    originalConfidence: number;
    ambiguityScore: number;
    queryComplexity: number;
    domainCategory?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Represents consensus tracking for conflict resolution
 */
export interface IReviewerConsensus extends Document {
  exampleId: mongoose.Types.ObjectId;
  reviews: IReview[];
  consensusIntent?: string;
  consensusResponse?: string;
  consensusConfidence?: number;
  resolutionMethod?: "majority" | "expert" | "discussion" | "escalation";
  isResolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for individual reviews
 */
const ReviewSchema: Schema = new Schema({
  reviewerId: { type: String, required: true },
  correctedIntent: { type: String, required: true },
  correctedResponse: { type: String },
  confidence: { type: Number, required: true, min: 1, max: 5 },
  reviewNotes: { type: String },
  timestamp: { type: Date, default: Date.now },
});

/**
 * Schema for active learning examples
 */
const ActiveLearningExampleSchema: Schema = new Schema(
  {
    inferenceLogId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InferenceLog",
      required: true,
      index: true,
    },
    userQuery: { type: String, required: true, index: "text" },
    originalPredictions: [
      {
        expert: { type: String, required: true },
        response: { type: String, required: true },
        confidenceScore: { type: Number, required: true },
      },
    ],
    contextSnippet: { type: String },
    samplingReason: { type: String, required: true },
    priorityScore: { type: Number, required: true, index: true },
    status: {
      type: String,
      enum: ["pending", "in_review", "reviewed", "rejected"],
      default: "pending",
      index: true,
    },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },
    correctedIntent: { type: String },
    correctedResponse: { type: String },
    reviewerConfidence: { type: Number, min: 1, max: 5 },
    reviewNotes: { type: String },
    version: { type: Number, default: 1 },
    metadata: {
      originalConfidence: { type: Number, required: true },
      ambiguityScore: { type: Number, required: true },
      queryComplexity: { type: Number },
      domainCategory: { type: String },
    },
  },
  {
    timestamps: true,
    collection: "active_learning_examples",
  }
);

/**
 * Schema for reviewer consensus
 */
const ReviewerConsensusSchema: Schema = new Schema(
  {
    exampleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ActiveLearningExample",
      required: true,
      unique: true,
    },
    reviews: [ReviewSchema],
    consensusIntent: { type: String },
    consensusResponse: { type: String },
    consensusConfidence: { type: Number },
    resolutionMethod: {
      type: String,
      enum: ["majority", "expert", "discussion", "escalation"],
    },
    isResolved: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    collection: "reviewer_consensus",
  }
);

// Compound indexes for efficient querying
ActiveLearningExampleSchema.index({ status: 1, priorityScore: -1 });
ActiveLearningExampleSchema.index({ samplingReason: 1, status: 1 });
ActiveLearningExampleSchema.index({ createdAt: -1, status: 1 });

ReviewerConsensusSchema.index({ isResolved: 1, "reviews.timestamp": -1 });

export const ActiveLearningExample = mongoose.model<IActiveLearningExample>(
  "ActiveLearningExample",
  ActiveLearningExampleSchema
);

export const ReviewerConsensus = mongoose.model<IReviewerConsensus>(
  "ReviewerConsensus",
  ReviewerConsensusSchema
);