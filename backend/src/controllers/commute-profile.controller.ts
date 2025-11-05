import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { CommuteProfileService } from "../services/commuteProfile.service";
import {
  CreateCommuteProfileDto,
  UpdateCommuteProfileDto,
} from "../dto/commute-profile.dto";

// Create service instance
const commuteProfileService = new CommuteProfileService();

/**
 * Create a new commute profile
 * POST /api/commute-profiles
 */
export const createCommuteProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Create profile
  const profile = await commuteProfileService.createProfile(
    req.user.id,
    req.body as CreateCommuteProfileDto,
  );

  res.status(201).json(profile);
};

/**
 * Get all commute profiles for the authenticated user
 * GET /api/commute-profiles
 */
export const getCommuteProfiles = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Get profiles
  const profiles = await commuteProfileService.getProfilesByUserId(
    req.user.id,
  );

  res.json(profiles);
};

/**
 * Get a specific commute profile by ID
 * GET /api/commute-profiles/:id
 */
export const getCommuteProfileById = async (
  req: AuthRequest,
  res: Response,
) => {
  const id = req.params?.id;

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Get profile
  const profile = await commuteProfileService.getProfileById(id, req.user.id);

  res.json(profile);
};

/**
 * Update a commute profile
 * PUT /api/commute-profiles/:id
 */
export const updateCommuteProfile = async (req: AuthRequest, res: Response) => {
  const id = req.params?.id;

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Update profile
  const profile = await commuteProfileService.updateProfile(
    id,
    req.user.id,
    req.body as UpdateCommuteProfileDto,
  );

  res.json(profile);
};

/**
 * Delete a commute profile
 * DELETE /api/commute-profiles/:id
 */
export const deleteCommuteProfile = async (req: AuthRequest, res: Response) => {
  const id = req.params?.id;

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  // Delete profile
  await commuteProfileService.deleteProfile(id, req.user.id);

  res.json({ message: "Commute profile deleted successfully" });
};
