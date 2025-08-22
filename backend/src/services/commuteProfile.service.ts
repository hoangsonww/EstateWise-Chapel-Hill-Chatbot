import CommuteProfile, { ICommuteProfile, ICommuteDestination } from "../models/CommuteProfile.model";
import { Types } from "mongoose";

/**
 * Data transfer object for creating a commute profile
 */
export interface CreateCommuteProfileDto {
  name: string;
  destinations: ICommuteDestination[];
  maxMinutes?: number;
  combine?: "intersect" | "union";
}

/**
 * Data transfer object for updating a commute profile
 */
export interface UpdateCommuteProfileDto {
  name?: string;
  destinations?: ICommuteDestination[];
  maxMinutes?: number;
  combine?: "intersect" | "union";
}

/**
 * Service class for commute profile operations
 */
export class CommuteProfileService {
  /**
   * Create a new commute profile for a user
   */
  static async createProfile(userId: string, data: CreateCommuteProfileDto): Promise<ICommuteProfile> {
    const profile = new CommuteProfile({
      userId: new Types.ObjectId(userId),
      ...data,
    });

    return await profile.save();
  }

  /**
   * Get all commute profiles for a user
   */
  static async getUserProfiles(userId: string): Promise<ICommuteProfile[]> {
    return await CommuteProfile.find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  /**
   * Get a specific commute profile by ID
   */
  static async getProfileById(profileId: string, userId?: string): Promise<ICommuteProfile | null> {
    const query: any = { _id: new Types.ObjectId(profileId) };
    if (userId) {
      query.userId = new Types.ObjectId(userId);
    }

    return await CommuteProfile.findOne(query).exec();
  }

  /**
   * Update a commute profile
   */
  static async updateProfile(
    profileId: string, 
    userId: string, 
    data: UpdateCommuteProfileDto
  ): Promise<ICommuteProfile | null> {
    return await CommuteProfile.findOneAndUpdate(
      { 
        _id: new Types.ObjectId(profileId), 
        userId: new Types.ObjectId(userId) 
      },
      { $set: data },
      { new: true, runValidators: true }
    ).exec();
  }

  /**
   * Delete a commute profile
   */
  static async deleteProfile(profileId: string, userId: string): Promise<boolean> {
    const result = await CommuteProfile.deleteOne({ 
      _id: new Types.ObjectId(profileId), 
      userId: new Types.ObjectId(userId) 
    }).exec();

    return result.deletedCount > 0;
  }

  /**
   * Check if a profile belongs to a specific user
   */
  static async isProfileOwner(profileId: string, userId: string): Promise<boolean> {
    const profile = await CommuteProfile.findOne({
      _id: new Types.ObjectId(profileId),
      userId: new Types.ObjectId(userId),
    }).exec();

    return profile !== null;
  }

  /**
   * Validate commute profile data
   */
  static validateProfileData(data: CreateCommuteProfileDto | UpdateCommuteProfileDto): string[] {
    const errors: string[] = [];

    // Validate destinations if provided
    if (data.destinations) {
      if (data.destinations.length < 1 || data.destinations.length > 3) {
        errors.push("A profile must have between 1 and 3 destinations");
      }

      data.destinations.forEach((dest, index) => {
        if (!dest.label || dest.label.trim().length === 0) {
          errors.push(`Destination ${index + 1}: Label is required`);
        }

        if (typeof dest.lat !== "number" || dest.lat < -90 || dest.lat > 90) {
          errors.push(`Destination ${index + 1}: Latitude must be between -90 and 90`);
        }

        if (typeof dest.lng !== "number" || dest.lng < -180 || dest.lng > 180) {
          errors.push(`Destination ${index + 1}: Longitude must be between -180 and 180`);
        }

        if (!["drive", "transit", "bike", "walk"].includes(dest.mode)) {
          errors.push(`Destination ${index + 1}: Mode must be one of: drive, transit, bike, walk`);
        }

        const timeWindowRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!dest.window || !timeWindowRegex.test(dest.window)) {
          errors.push(`Destination ${index + 1}: Time window must be in HH:MM-HH:MM format`);
        }

        if (dest.maxMinutes !== undefined && (dest.maxMinutes < 1 || dest.maxMinutes > 180)) {
          errors.push(`Destination ${index + 1}: Maximum minutes must be between 1 and 180`);
        }
      });
    }

    // Validate global maxMinutes if provided
    if (data.maxMinutes !== undefined && (data.maxMinutes < 1 || data.maxMinutes > 180)) {
      errors.push("Global maximum minutes must be between 1 and 180");
    }

    // Validate combine method if provided
    if (data.combine !== undefined && !["intersect", "union"].includes(data.combine)) {
      errors.push("Combine method must be either 'intersect' or 'union'");
    }

    return errors;
  }
}