import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     SavedSearch:
 *       type: object
 *       description: A saved property search with optional alert configuration.
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier of the saved search.
 *           example: 60d0fe4f5311236168a109ca
 *         userId:
 *           type: string
 *           description: ID of the owning user.
 *           example: 60d0fe4f5311236168a109cb
 *         name:
 *           type: string
 *           description: Human-readable label for this search.
 *           example: "2BR under 500k Chapel Hill"
 *         query:
 *           type: string
 *           description: Raw search query string.
 *           example: "2 bedroom under 500000 Chapel Hill"
 *         filters:
 *           type: object
 *           description: Structured filter metadata (optional, passed through as-is).
 *         frequency:
 *           type: string
 *           enum: [hourly, daily, custom]
 *           description: How often the alert job should re-run this search.
 *           example: daily
 *         alertTypes:
 *           type: array
 *           items:
 *             type: string
 *             enum: [new_match, price_drop, status_change]
 *           description: Which events generate notifications.
 *         lastRunAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp of the last alert job run.
 *         lastResultIds:
 *           type: array
 *           items:
 *             type: string
 *           description: Snapshot of zpid/ids from the last run, used for diff.
 *         priceDropPercent:
 *           type: number
 *           description: Minimum price-drop percentage that triggers an alert (0-100).
 *           example: 5
 *         priceDropAmount:
 *           type: number
 *           description: Minimum price-drop dollar amount that triggers an alert.
 *           example: 10000
 *       required:
 *         - userId
 *         - name
 *         - query
 */

export interface ISavedSearch extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  query: string;
  filters?: Record<string, unknown>;
  frequency: "hourly" | "daily" | "custom";
  alertTypes: Array<"new_match" | "price_drop" | "status_change">;
  lastRunAt?: Date;
  lastResultIds: string[];
  priceDropPercent?: number;
  priceDropAmount?: number;
}

const SavedSearchSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    filters: {
      type: Schema.Types.Mixed,
      default: {},
    },
    frequency: {
      type: String,
      enum: ["hourly", "daily", "custom"],
      default: "daily",
    },
    alertTypes: {
      type: [String],
      enum: ["new_match", "price_drop", "status_change"],
      default: ["new_match"],
    },
    lastRunAt: {
      type: Date,
      default: null,
    },
    lastResultIds: {
      type: [String],
      default: [],
    },
    priceDropPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    priceDropAmount: {
      type: Number,
      min: 0,
      default: null,
    },
  },
  { timestamps: true },
);

// Cap per user – index used for the uniqueness check + listing
SavedSearchSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model<ISavedSearch>("SavedSearch", SavedSearchSchema);
