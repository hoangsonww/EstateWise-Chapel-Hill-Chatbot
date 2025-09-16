import { Request, Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { CommuteProfileService, CreateCommuteProfileDto, UpdateCommuteProfileDto } from "../services/commuteProfile.service";

/**
 * Create a new commute profile
 * 
 * @param req - The request object containing profile data
 * @param res - The response object
 */
export const createCommuteProfile = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profileData: CreateCommuteProfileDto = req.body;

    // Validate input data
    const validationErrors = CommuteProfileService.validateProfileData(profileData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    // Create the profile
    const profile = await CommuteProfileService.createProfile(req.user.id, profileData);

    res.status(201).json({
      message: "Commute profile created successfully",
      profile,
    });
  } catch (error: any) {
    // Handle duplicate profile name error
    if (error.code === 11000 && error.keyPattern?.name) {
      return res.status(409).json({ 
        error: "A profile with this name already exists for your account" 
      });
    }
    
    console.error("Error creating commute profile:", error);
    res.status(500).json({ error: "Failed to create commute profile" });
  }
};

/**
 * Get all commute profiles for the authenticated user
 * 
 * @param req - The request object
 * @param res - The response object
 */
export const getCommuteProfiles = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const profiles = await CommuteProfileService.getUserProfiles(req.user.id);

    res.json({
      message: "Commute profiles retrieved successfully",
      profiles,
      count: profiles.length,
    });
  } catch (error) {
    console.error("Error retrieving commute profiles:", error);
    res.status(500).json({ error: "Failed to retrieve commute profiles" });
  }
};

/**
 * Get a specific commute profile by ID
 * 
 * @param req - The request object with profile ID in params
 * @param res - The response object
 */
export const getCommuteProfile = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    // Check if the profile exists and belongs to the user
    const profile = await CommuteProfileService.getProfileById(id, req.user.id);

    if (!profile) {
      return res.status(404).json({ error: "Commute profile not found" });
    }

    res.json({
      message: "Commute profile retrieved successfully",
      profile,
    });
  } catch (error) {
    console.error("Error retrieving commute profile:", error);
    res.status(500).json({ error: "Failed to retrieve commute profile" });
  }
};

/**
 * Update a commute profile
 * 
 * @param req - The request object with profile ID in params and update data in body
 * @param res - The response object
 */
export const updateCommuteProfile = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;
    const updateData: UpdateCommuteProfileDto = req.body;

    // Validate input data
    const validationErrors = CommuteProfileService.validateProfileData(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        error: "Validation failed", 
        details: validationErrors 
      });
    }

    // Check if profile exists and belongs to the user
    const existingProfile = await CommuteProfileService.getProfileById(id, req.user.id);
    if (!existingProfile) {
      return res.status(404).json({ error: "Commute profile not found" });
    }

    // Update the profile
    const updatedProfile = await CommuteProfileService.updateProfile(id, req.user.id, updateData);

    if (!updatedProfile) {
      return res.status(404).json({ error: "Commute profile not found" });
    }

    res.json({
      message: "Commute profile updated successfully",
      profile: updatedProfile,
    });
  } catch (error: any) {
    // Handle duplicate profile name error
    if (error.code === 11000 && error.keyPattern?.name) {
      return res.status(409).json({ 
        error: "A profile with this name already exists for your account" 
      });
    }

    console.error("Error updating commute profile:", error);
    res.status(500).json({ error: "Failed to update commute profile" });
  }
};

/**
 * Delete a commute profile
 * 
 * @param req - The request object with profile ID in params
 * @param res - The response object
 */
export const deleteCommuteProfile = async (req: AuthRequest, res: Response) => {
  try {
    // Check if user is authenticated
    if (!req.user?.id) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    // Check if profile exists and belongs to the user
    const existingProfile = await CommuteProfileService.getProfileById(id, req.user.id);
    if (!existingProfile) {
      return res.status(404).json({ error: "Commute profile not found" });
    }

    // Delete the profile
    const deleted = await CommuteProfileService.deleteProfile(id, req.user.id);

    if (!deleted) {
      return res.status(404).json({ error: "Commute profile not found" });
    }

    res.json({
      message: "Commute profile deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting commute profile:", error);
    res.status(500).json({ error: "Failed to delete commute profile" });
  }
};