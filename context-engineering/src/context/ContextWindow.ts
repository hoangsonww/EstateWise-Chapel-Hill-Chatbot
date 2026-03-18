/**
 * @fileoverview Token budget manager for the EstateWise Context Engine.
 *
 * ContextWindow enforces a hard token budget across context items using a
 * priority-based allocation strategy. Critical items are always included first;
 * within each priority tier items are ordered by relevance score descending.
 * When a single item only partially fits, its content is trimmed to preserve
 * as much information as possible within the remaining budget.
 */

import { ContextPriority } from "./types.js";
import type { ContextItem, ContextWindowConfig } from "./types.js";

/** Approximate characters per token (GPT-family average). Used when tokenCount is 0. */
const CHARS_PER_TOKEN = 4;

/**
 * Manages the token budget for a single context assembly pass.
 *
 * After constructing with a configuration, call `allocate()` to receive the
 * subset of items that fit within the available budget. The window can be
 * reset and reused for successive assemblies.
 */
export class ContextWindow {
  private readonly config: ContextWindowConfig;
  private usedTokens = 0;

  constructor(config: ContextWindowConfig) {
    this.config = config;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Allocates context items within the available token budget.
   *
   * Items are consumed in priority order (Critical → Background). Within each
   * tier, items with higher relevance scores are preferred. The last item to be
   * processed may be partially trimmed if only a fraction of its budget remains.
   *
   * Calling `allocate()` resets the internal usage counter so the same window
   * instance can be reused across multiple assembly requests.
   *
   * @param items - Candidate context items (any order).
   * @returns The subset of items that fit within the budget, in priority order.
   */
  allocate(items: ContextItem[]): ContextItem[] {
    this.reset();

    const available = this._availableBudget();
    if (available <= 0) return [];

    // Sort into priority tiers, then by relevance within each tier.
    const sorted = this._sort(items);
    const result: ContextItem[] = [];

    for (const item of sorted) {
      const tokens = this._countTokens(item);

      if (this.usedTokens + tokens <= available) {
        // Item fits completely.
        this.usedTokens += tokens;
        result.push(item);
      } else {
        // Try to fit a trimmed version.
        const remaining = available - this.usedTokens;
        if (remaining >= 20) {
          // Only bother trimming if at least 20 tokens remain.
          const trimmed = this._trimItem(item, remaining);
          if (trimmed !== null) {
            this.usedTokens += this._countTokens(trimmed);
            result.push(trimmed);
          }
        }
        // Budget exhausted — stop processing.
        break;
      }
    }

    return result;
  }

  /**
   * Returns whether a specific item would fit in the current remaining budget
   * without being trimmed.
   *
   * @param item - The context item to check.
   */
  canFit(item: ContextItem): boolean {
    return this._countTokens(item) <= this._availableBudget() - this.usedTokens;
  }

  /**
   * Returns the number of tokens still available in the window.
   */
  getRemainingTokens(): number {
    return Math.max(0, this._availableBudget() - this.usedTokens);
  }

  /**
   * Returns current token usage statistics for the window.
   */
  getUsage(): { used: number; total: number; percentage: number } {
    const total = this._availableBudget();
    const used = this.usedTokens;
    return {
      used,
      total,
      percentage: total > 0 ? Math.round((used / total) * 100) : 0,
    };
  }

  /**
   * Resets the token usage counter so the window can be reused.
   * Does not modify the configuration.
   */
  reset(): void {
    this.usedTokens = 0;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /** Available token budget after deducting reserved tokens. */
  private _availableBudget(): number {
    return Math.max(0, this.config.maxTokens - this.config.reservedTokens);
  }

  /**
   * Returns the token count for an item. Uses `tokenCount` when non-zero,
   * otherwise estimates from character length.
   */
  private _countTokens(item: ContextItem): number {
    return item.tokenCount > 0
      ? item.tokenCount
      : Math.ceil(item.content.length / CHARS_PER_TOKEN);
  }

  /**
   * Sorts items by descending priority, then by descending relevance score
   * within the same priority tier.
   */
  private _sort(items: ContextItem[]): ContextItem[] {
    // Map priority enum values to sort keys (higher = earlier).
    const priorityOrder: Record<ContextPriority, number> = {
      [ContextPriority.Critical]: 4,
      [ContextPriority.High]: 3,
      [ContextPriority.Medium]: 2,
      [ContextPriority.Low]: 1,
      [ContextPriority.Background]: 0,
    };

    return [...items].sort((a, b) => {
      const pa = priorityOrder[a.priority] ?? 0;
      const pb = priorityOrder[b.priority] ?? 0;
      if (pa !== pb) return pb - pa;
      return b.relevanceScore - a.relevanceScore;
    });
  }

  /**
   * Creates a new context item with its content trimmed to fit within
   * `targetTokens`. Returns `null` if trimming would leave less than 20 tokens.
   */
  private _trimItem(
    item: ContextItem,
    targetTokens: number,
  ): ContextItem | null {
    if (targetTokens < 20) return null;

    const maxChars = targetTokens * CHARS_PER_TOKEN;
    if (item.content.length <= maxChars) return item;

    const trimmedContent = item.content.slice(0, maxChars - 3) + "...";
    return {
      ...item,
      content: trimmedContent,
      tokenCount: targetTokens,
      metadata: { ...item.metadata, trimmed: true },
    };
  }
}
