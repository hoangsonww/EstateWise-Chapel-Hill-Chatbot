import mongoose, { Document, Schema } from "mongoose";

/**
 * @swagger
 * components:
 *   schemas:
 *     CommuteDestination:
 *       type: object
 *       description: A single commute destination with location and preferences
 *       properties:
 *         label:
 *           type: string
 *           description: A descriptive label for this destination
 *           example: "Work Office"
 *         lat:
 *           type: number
 *           description: Latitude coordinate
 *           example: 35.9132
 *         lng:
 *           type: number
 *           description: Longitude coordinate
 *           example: -79.0558
 *         mode:
 *           type: string
 *           enum: [drive, transit, bike, walk]
 *           description: Preferred transportation mode
 *           example: "drive"
 *         window:
 *           type: string
 *           pattern: "^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$"
 *           description: Time window in HH:MM-HH:MM format
 *           example: "08:00-09:30"
 *         maxMinutes:
 *           type: number
 *           description: Maximum commute time in minutes (overrides global if set)
 *           minimum: 1
 *           maximum: 180
 *           example: 45
 *       required:
 *         - label
 *         - lat
 *         - lng
 *         - mode
 *         - window
 *     CommuteProfile:
 *       type: object
 *       description: A user's commute profile containing multiple destinations and preferences
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier for the commute profile
 *           example: "60d0fe4f5311236168a109ca"
 *         userId:
 *           type: string
 *           description: ID of the user who owns this profile
 *           example: "60d0fe4f5311236168a109cb"
 *         name:
 *           type: string
 *           description: Name of the commute profile
 *           example: "Daily Work Commute"
 *         destinations:
 *           type: array
 *           description: List of commute destinations (1-3 allowed)
 *           minItems: 1
 *           maxItems: 3
 *           items:
 *             $ref: "#/components/schemas/CommuteDestination"
 *         maxMinutes:
 *           type: number
 *           description: Global maximum commute time in minutes (can be overridden per destination)
 *           minimum: 1
 *           maximum: 180
 *           example: 60
 *         combine:
 *           type: string
 *           enum: [intersect, union]
 *           description: How to combine results from multiple destinations
 *           default: intersect
 *           example: "intersect"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the profile was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the profile was last updated
 *       required:
 *         - userId
 *         - name
 *         - destinations
 */

/**
 * Interface for a single commute destination
 */
export interface ICommuteDestination {
  label: string;
  lat: number;
  lng: number;
  mode: "drive" | "transit" | "bike" | "walk";
  window: string; // HH:MM-HH:MM format
  maxMinutes?: number;
}

/**
 * Interface for the CommuteProfile document
 */
export interface ICommuteProfile extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  destinations: ICommuteDestination[];
  maxMinutes?: number;
  combine: "intersect" | "union";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Schema for a single commute destination
 */
const CommuteDestinationSchema = new Schema<ICommuteDestination>({
  label: {
    type: String,
    required: [true, "Destination label is required"],
    trim: true,
    maxlength: [100, "Destination label cannot exceed 100 characters"],
  },
  lat: {
    type: Number,
    required: [true, "Latitude is required"],
    min: [-90, "Latitude must be between -90 and 90"],
    max: [90, "Latitude must be between -90 and 90"],
  },
  lng: {
    type: Number,
    required: [true, "Longitude is required"],
    min: [-180, "Longitude must be between -180 and 180"],
    max: [180, "Longitude must be between -180 and 180"],
  },
  mode: {
    type: String,
    required: [true, "Transportation mode is required"],
    enum: {
      values: ["drive", "transit", "bike", "walk"],
      message: "Mode must be one of: drive, transit, bike, walk",
    },
  },
  window: {
    type: String,
    required: [true, "Time window is required"],
    validate: {
      validator: function (v: string) {
        const timeWindowRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        return timeWindowRegex.test(v);
      },
      message: "Time window must be in HH:MM-HH:MM format (e.g., 08:00-17:30)",
    },
  },
  maxMinutes: {
    type: Number,
    min: [1, "Maximum minutes must be at least 1"],
    max: [180, "Maximum minutes cannot exceed 180"],
  },
}, { _id: false });

/**
 * Schema for the CommuteProfile model
 */
const CommuteProfileSchema = new Schema<ICommuteProfile>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
    index: true,
  },
  name: {
    type: String,
    required: [true, "Profile name is required"],
    trim: true,
    maxlength: [100, "Profile name cannot exceed 100 characters"],
  },
  destinations: {
    type: [CommuteDestinationSchema],
    required: [true, "At least one destination is required"],
    validate: {
      validator: function (v: ICommuteDestination[]) {
        return v.length >= 1 && v.length <= 3;
      },
      message: "A profile must have between 1 and 3 destinations",
    },
  },
  maxMinutes: {
    type: Number,
    min: [1, "Maximum minutes must be at least 1"],
    max: [180, "Maximum minutes cannot exceed 180"],
  },
  combine: {
    type: String,
    enum: {
      values: ["intersect", "union"],
      message: "Combine method must be either 'intersect' or 'union'",
    },
    default: "intersect",
  },
}, {
  timestamps: true,
});

// Create compound index for efficient user queries
CommuteProfileSchema.index({ userId: 1, updatedAt: -1 });

// Ensure unique profile names per user
CommuteProfileSchema.index({ userId: 1, name: 1 }, { unique: true });

export default mongoose.model<ICommuteProfile>("CommuteProfile", CommuteProfileSchema);