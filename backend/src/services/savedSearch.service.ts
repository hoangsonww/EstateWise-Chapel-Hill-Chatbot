import mongoose from "mongoose";
import SavedSearch, { ISavedSearch } from "../models/SavedSearch.model";
import {
  CreateSavedSearchDto,
  UpdateSavedSearchDto,
  SavedSearchResponseDto,
} from "../dto/saved-search.dto";
import {
  validateCreateSavedSearch,
  validateUpdateSavedSearch,
} from "../validations/saved-search.validation";
import { AppError } from "../utils/AppError";

const MAX_SAVED_SEARCHES_PER_USER = 20;

function toDto(s: ISavedSearch): SavedSearchResponseDto {
  return {
    _id: (s as any)._id?.toString() ?? "",
    userId: (s as any).userId?.toString() ?? "",
    name: s.name,
    query: s.query,
    filters: s.filters,
    frequency: s.frequency,
    alertTypes: s.alertTypes,
    lastRunAt: s.lastRunAt ? s.lastRunAt.toISOString() : null,
    lastResultIds: s.lastResultIds,
    priceDropPercent: s.priceDropPercent ?? null,
    priceDropAmount: s.priceDropAmount ?? null,
    createdAt: (s as any).createdAt?.toISOString?.() ?? "",
    updatedAt: (s as any).updatedAt?.toISOString?.() ?? "",
  };
}

export class SavedSearchService {
  /** Creates a new saved search for the user. */
  async create(
    userId: string,
    data: CreateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const validation = validateCreateSavedSearch(data);
    if (!validation.isValid) {
      throw AppError.badRequest("Validation failed", validation.errors);
    }

    const count = await SavedSearch.countDocuments({
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (count >= MAX_SAVED_SEARCHES_PER_USER) {
      throw AppError.unprocessableEntity(
        `Maximum of ${MAX_SAVED_SEARCHES_PER_USER} saved searches allowed per user`,
      );
    }

    const doc = await SavedSearch.create({
      userId: new mongoose.Types.ObjectId(userId),
      name: data.name,
      query: data.query,
      filters: data.filters ?? {},
      frequency: data.frequency ?? "daily",
      alertTypes: data.alertTypes ?? ["new_match"],
      priceDropPercent: data.priceDropPercent ?? null,
      priceDropAmount: data.priceDropAmount ?? null,
    });
    return toDto(doc);
  }

  /** Returns all saved searches for a user, newest first. */
  async listForUser(userId: string): Promise<SavedSearchResponseDto[]> {
    const docs = await SavedSearch.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).sort({ createdAt: -1 });
    return docs.map(toDto);
  }

  /** Returns a single saved search, enforcing ownership. */
  async getById(
    searchId: string,
    userId: string,
  ): Promise<SavedSearchResponseDto> {
    const doc = await SavedSearch.findOne({
      _id: new mongoose.Types.ObjectId(searchId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (!doc) throw AppError.notFound("Saved search not found");
    return toDto(doc);
  }

  /** Updates an existing saved search. */
  async update(
    searchId: string,
    userId: string,
    data: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const validation = validateUpdateSavedSearch(data);
    if (!validation.isValid) {
      throw AppError.badRequest("Validation failed", validation.errors);
    }

    const doc = await SavedSearch.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(searchId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      { $set: data },
      { new: true },
    );
    if (!doc) throw AppError.notFound("Saved search not found");
    return toDto(doc);
  }

  /** Deletes a saved search. */
  async delete(searchId: string, userId: string): Promise<void> {
    const result = await SavedSearch.deleteOne({
      _id: new mongoose.Types.ObjectId(searchId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      throw AppError.notFound("Saved search not found");
    }
  }

  /**
   * Updates the snapshot after a successful alert-job run. Internal use only
   * (called by the alert job).
   */
  async updateSnapshot(
    searchId: string,
    resultIds: string[],
  ): Promise<void> {
    await SavedSearch.updateOne(
      { _id: new mongoose.Types.ObjectId(searchId) },
      { $set: { lastRunAt: new Date(), lastResultIds: resultIds } },
    );
  }

  /**
   * Returns all saved searches that are due to run.
   * "hourly" → run every time the hourly tick fires.
   * "daily"  → run if lastRunAt is null or > 23 h ago.
   * "custom" → same threshold as daily for now.
   */
  async getDue(): Promise<ISavedSearch[]> {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const dayAgo = new Date(Date.now() - 23 * 60 * 60 * 1000);

    return SavedSearch.find({
      $or: [
        // Hourly: overdue if last run > 1h ago (or never)
        {
          frequency: "hourly",
          $or: [{ lastRunAt: null }, { lastRunAt: { $lte: hourAgo } }],
        },
        // Daily/custom: overdue if last run > 23h ago (or never)
        {
          frequency: { $in: ["daily", "custom"] },
          $or: [{ lastRunAt: null }, { lastRunAt: { $lte: dayAgo } }],
        },
      ],
    });
  }
}
