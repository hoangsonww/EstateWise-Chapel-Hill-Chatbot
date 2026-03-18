/**
 * @fileoverview Individual scoring functions used by the context Ranker.
 *
 * Each function returns a normalised score in [0, 1]. They are designed to be
 * combined as a weighted blend — see `scoreCombined` for the default weights.
 */

import { ContextPriority } from "../types.js";
import type { ContextItem } from "../types.js";

/** Half-life constant for recency decay: 30 minutes in milliseconds. */
const RECENCY_HALF_LIFE_MS = 30 * 60 * 1000;

/** Maximum age after which the recency score saturates at 0 (24 hours). */
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Weights used by `scoreCombined` when none are overridden. */
export const DEFAULT_COMBINED_WEIGHTS = {
  relevance: 0.4,
  recency: 0.3,
  importance: 0.3,
} as const;

// ---------------------------------------------------------------------------
// Recency scoring
// ---------------------------------------------------------------------------

/**
 * Scores how recently a context item was produced.
 *
 * Uses an exponential decay model: items produced now score 1.0, items at
 * `RECENCY_HALF_LIFE_MS` score ~0.5, and items older than `MAX_AGE_MS` score 0.
 *
 * @param timestamp - ISO 8601 timestamp string from the context item.
 * @returns Recency score in [0, 1].
 */
export function scoreRecency(timestamp: string): number {
  const ageMs = Date.now() - new Date(timestamp).getTime();
  if (ageMs <= 0) return 1;
  if (ageMs >= MAX_AGE_MS) return 0;
  // Exponential decay: score = 0.5^(age / halfLife)
  return Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);
}

// ---------------------------------------------------------------------------
// Relevance scoring
// ---------------------------------------------------------------------------

/**
 * Scores how relevant a context item is to a free-text query.
 *
 * Blends the item's pre-computed `relevanceScore` (from the originating
 * provider's retrieval step) with a lightweight keyword overlap check against
 * the item content. The provider score carries more weight since it was
 * computed with full TF-IDF or embedding machinery.
 *
 * @param item  - The context item to score.
 * @param query - The current user / agent query string.
 * @returns Relevance score in [0, 1].
 */
export function scoreRelevance(item: ContextItem, query: string): number {
  const providerScore = Math.min(1, Math.max(0, item.relevanceScore));

  if (!query.trim()) return providerScore;

  const queryTokens = _tokenize(query);
  const contentTokens = new Set(_tokenize(item.content));

  const overlap =
    queryTokens.length > 0
      ? queryTokens.filter((qt) => contentTokens.has(qt)).length /
        queryTokens.length
      : 0;

  // 70% provider score (embedding/TF-IDF based) + 30% direct keyword overlap.
  return providerScore * 0.7 + overlap * 0.3;
}

// ---------------------------------------------------------------------------
// Importance scoring
// ---------------------------------------------------------------------------

/**
 * Scores the inherent importance of a context item regardless of the query.
 *
 * Factors:
 * - Priority tier (Critical=1.0, High=0.75, Medium=0.5, Low=0.25, Background=0)
 * - Optional `importance` metadata value from the originating provider.
 *
 * @param item - The context item to score.
 * @returns Importance score in [0, 1].
 */
export function scoreImportance(item: ContextItem): number {
  const priorityScore = _priorityToScore(item.priority);

  // Check for a numeric importance value surfaced by providers (e.g. graph importance).
  const metaImportance =
    typeof item.metadata["importance"] === "number"
      ? Math.min(1, Math.max(0, item.metadata["importance"] as number))
      : null;

  if (metaImportance !== null) {
    // Blend priority tier (60%) with node/document importance metadata (40%).
    return priorityScore * 0.6 + metaImportance * 0.4;
  }

  return priorityScore;
}

// ---------------------------------------------------------------------------
// Combined scoring
// ---------------------------------------------------------------------------

/**
 * Computes a weighted combination of recency, relevance, and importance scores.
 *
 * Default weights: relevance=0.4, recency=0.3, importance=0.3.
 * Weights are automatically normalised to sum to 1 if they do not already.
 *
 * @param item    - The context item to score.
 * @param query   - The current query string.
 * @param weights - Optional weight overrides.
 * @returns Combined score in [0, 1].
 */
export function scoreCombined(
  item: ContextItem,
  query: string,
  weights: { relevance?: number; recency?: number; importance?: number } = {},
): number {
  const w = {
    relevance: weights.relevance ?? DEFAULT_COMBINED_WEIGHTS.relevance,
    recency: weights.recency ?? DEFAULT_COMBINED_WEIGHTS.recency,
    importance: weights.importance ?? DEFAULT_COMBINED_WEIGHTS.importance,
  };

  // Normalise weights to sum to 1.
  const total = w.relevance + w.recency + w.importance;
  if (total === 0) return 0;
  const wRel = w.relevance / total;
  const wRec = w.recency / total;
  const wImp = w.importance / total;

  const rel = scoreRelevance(item, query);
  const rec = scoreRecency(item.timestamp);
  const imp = scoreImportance(item);

  return wRel * rel + wRec * rec + wImp * imp;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Converts a ContextPriority enum value to a normalised [0, 1] score. */
function _priorityToScore(priority: ContextPriority): number {
  switch (priority) {
    case ContextPriority.Critical:
      return 1.0;
    case ContextPriority.High:
      return 0.75;
    case ContextPriority.Medium:
      return 0.5;
    case ContextPriority.Low:
      return 0.25;
    case ContextPriority.Background:
    default:
      return 0.0;
  }
}

/** Lowercases and splits text into alphanumeric tokens. */
function _tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\W]+/)
    .filter((t) => t.length > 1 && t.length < 30);
}
