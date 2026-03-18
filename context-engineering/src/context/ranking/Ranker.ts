/**
 * @fileoverview Context item ranking engine for the EstateWise Context Engine.
 *
 * Applies one of four ranking strategies to an array of ContextItems and
 * returns them sorted by score descending. All scores are normalised to [0, 1]
 * before sorting so strategies are comparable.
 */

import type { ContextItem } from "../types.js";
import {
  scoreRecency,
  scoreRelevance,
  scoreImportance,
  scoreCombined,
  DEFAULT_COMBINED_WEIGHTS,
} from "./strategies.js";

/**
 * The ranking strategy to apply:
 * - "recency"    — sorts by how recently the item was produced.
 * - "relevance"  — sorts by semantic/keyword relevance to the query.
 * - "importance" — sorts by priority tier and provider-assigned importance.
 * - "combined"   — weighted blend of recency (0.3) + relevance (0.4) + importance (0.3).
 */
export type RankingStrategy =
  | "recency"
  | "relevance"
  | "importance"
  | "combined";

/**
 * Optional weight overrides for the "combined" strategy.
 * Values do not need to sum to 1 — they are normalised internally.
 */
export interface CombinedWeights {
  relevance?: number;
  recency?: number;
  importance?: number;
}

/**
 * Ranks an array of context items using the specified strategy.
 *
 * This class is stateless; every `rank()` call is independent and does not
 * mutate the input array.
 *
 * @example
 * ```typescript
 * const ranker = new Ranker();
 * const ranked = ranker.rank(items, query, "combined");
 * ```
 */
export class Ranker {
  /**
   * Ranks `items` according to the given strategy and query, returning a new
   * array sorted by computed score descending. The original array is not mutated.
   *
   * @param items    - Context items to rank (any order).
   * @param query    - The current user / agent query string used for relevance scoring.
   * @param strategy - Ranking strategy to apply. Defaults to "combined".
   * @param weights  - Optional weight overrides for the "combined" strategy.
   * @returns A new array of context items sorted by score descending.
   */
  rank(
    items: ContextItem[],
    query: string,
    strategy: RankingStrategy = "combined",
    weights?: CombinedWeights,
  ): ContextItem[] {
    if (items.length === 0) return [];

    const scored: Array<{ item: ContextItem; score: number }> = items.map(
      (item) => ({
        item,
        score: this._computeScore(item, query, strategy, weights),
      }),
    );

    return scored
      .sort((a, b) => b.score - a.score)
      .map(({ item, score }) => ({
        ...item,
        // Write the final computed score back into relevanceScore so
        // downstream consumers (e.g. ContextWindow) see the ranked value.
        relevanceScore: score,
      }));
  }

  /**
   * Scores a single context item using the specified strategy.
   *
   * @param item     - Context item to score.
   * @param query    - Current query string.
   * @param strategy - Ranking strategy.
   * @param weights  - Optional combined-strategy weight overrides.
   * @returns Normalised score in [0, 1].
   */
  scoreItem(
    item: ContextItem,
    query: string,
    strategy: RankingStrategy = "combined",
    weights?: CombinedWeights,
  ): number {
    return this._computeScore(item, query, strategy, weights);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Dispatches to the correct scoring function based on strategy. */
  private _computeScore(
    item: ContextItem,
    query: string,
    strategy: RankingStrategy,
    weights?: CombinedWeights,
  ): number {
    switch (strategy) {
      case "recency":
        return scoreRecency(item.timestamp);

      case "relevance":
        return scoreRelevance(item, query);

      case "importance":
        return scoreImportance(item);

      case "combined":
      default: {
        // Spread into plain `number` variables to avoid literal-type inference
        // from the `as const` declaration on DEFAULT_COMBINED_WEIGHTS.
        const wRel: number =
          weights?.relevance ?? DEFAULT_COMBINED_WEIGHTS.relevance;
        const wRec: number =
          weights?.recency ?? DEFAULT_COMBINED_WEIGHTS.recency;
        const wImp: number =
          weights?.importance ?? DEFAULT_COMBINED_WEIGHTS.importance;
        return scoreCombined(item, query, {
          relevance: wRel,
          recency: wRec,
          importance: wImp,
        });
      }
    }
  }
}
