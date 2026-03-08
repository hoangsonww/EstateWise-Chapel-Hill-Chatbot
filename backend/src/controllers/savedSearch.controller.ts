import { Response } from "express";
import { AuthRequest } from "../middleware/auth.middleware";
import { SavedSearchService } from "../services/savedSearch.service";

const service = new SavedSearchService();

export async function createSavedSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const result = await service.create(userId, req.body);
  res.status(201).json(result);
}

export async function getSavedSearches(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const results = await service.listForUser(userId);
  res.json(results);
}

export async function getSavedSearchById(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const result = await service.getById(req.params.id, userId);
  res.json(result);
}

export async function updateSavedSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  const result = await service.update(req.params.id, userId, req.body);
  res.json(result);
}

export async function deleteSavedSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  await service.delete(req.params.id, userId);
  res.json({ message: "Saved search deleted successfully" });
}

export async function runSavedSearch(
  req: AuthRequest,
  res: Response,
): Promise<void> {
  const userId = req.user?.id;
  // Ensure the search exists and belongs to this user before running
  await service.getById(req.params.id, userId);
  // Dynamic import avoids issues when Pinecone/Gemini env vars are absent
  const { runAlertJob } = await import("../jobs/alertJob");
  await runAlertJob();
  res.json({ message: "Alert job triggered for your saved searches" });
}
