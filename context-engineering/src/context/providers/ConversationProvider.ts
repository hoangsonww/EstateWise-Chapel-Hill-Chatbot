/**
 * @fileoverview Conversation history provider for the EstateWise Context Engine.
 *
 * Converts recent conversation turns from the assembly request into typed
 * context items. More recent turns receive higher priority so the agent
 * always has fresh conversational context at the top of its window.
 */

import { randomUUID } from "crypto";
import { ContextSource, ContextPriority } from "../types.js";
import type {
  ContextItem,
  ContextProvider,
  ContextAssemblyRequest,
  ConversationTurn,
} from "../types.js";

/** Maximum number of conversation turns to include per request. */
const MAX_TURNS = 20;
/** Approximate characters per token for estimation. */
const CHARS_PER_TOKEN = 4;

/**
 * Provides context items sourced from the current conversation history.
 *
 * Turn recency is translated into priority: the most recent user and
 * assistant turns receive Medium priority; older turns receive Low or
 * Background priority. System turns are always elevated to High.
 * Tool turns are treated as Medium regardless of age.
 */
export class ConversationProvider implements ContextProvider {
  readonly name = "conversation";
  readonly priority = ContextPriority.Medium;

  /**
   * Extracts conversation turns from the request and returns them as
   * typed context items, newest first.
   *
   * @param request - The full assembly request. Uses `conversationHistory`.
   * @returns Ordered context items from conversation history (newest first).
   */
  async getContext(request: ContextAssemblyRequest): Promise<ContextItem[]> {
    const history = request.conversationHistory;
    if (!history || history.length === 0) return [];

    // Take the most recent MAX_TURNS turns (already in chronological order).
    const turns = history.slice(-MAX_TURNS);

    return (
      turns
        .map((turn, idx) => this._turnToContextItem(turn, idx, turns.length))
        // Reverse so newest turns appear first (highest relevance).
        .reverse()
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Converts a single conversation turn into a ContextItem.
   *
   * @param turn       - The conversation turn.
   * @param idx        - Zero-based index within the sliced history window.
   * @param total      - Total number of turns in the window.
   * @returns A ContextItem representing this turn.
   */
  private _turnToContextItem(
    turn: ConversationTurn,
    idx: number,
    total: number,
  ): ContextItem {
    const content = this._formatTurn(turn);
    const tokenCount =
      turn.tokenCount ?? Math.ceil(content.length / CHARS_PER_TOKEN);

    // Recency: idx = 0 is oldest, idx = total-1 is newest.
    const recencyRatio = total > 1 ? idx / (total - 1) : 1;
    // relevanceScore blends recency with a turn-type boost.
    const typeBoost =
      turn.role === "user" ? 0.1 : turn.role === "system" ? 0.2 : 0;
    const relevanceScore = Math.min(1, recencyRatio * 0.85 + typeBoost);

    const priority = this._priorityForTurn(turn, recencyRatio);

    return {
      id: randomUUID(),
      content,
      source: ContextSource.Conversation,
      relevanceScore,
      tokenCount,
      priority,
      metadata: {
        role: turn.role,
        toolName: turn.toolName,
        recencyRatio,
      },
      timestamp: turn.timestamp,
    };
  }

  /**
   * Determines the ContextPriority for a conversation turn based on its role
   * and position in the history window.
   */
  private _priorityForTurn(
    turn: ConversationTurn,
    recencyRatio: number,
  ): ContextPriority {
    if (turn.role === "system") return ContextPriority.High;
    if (turn.role === "tool") return ContextPriority.Medium;
    if (recencyRatio >= 0.75) return ContextPriority.Medium;
    if (recencyRatio >= 0.4) return ContextPriority.Low;
    return ContextPriority.Background;
  }

  /** Formats a conversation turn into a labelled text block for the LLM. */
  private _formatTurn(turn: ConversationTurn): string {
    const prefix =
      turn.role === "tool"
        ? `[Tool Result: ${turn.toolName ?? "unknown"}]`
        : `[${turn.role.charAt(0).toUpperCase()}${turn.role.slice(1)}]`;
    return `${prefix}\n${turn.content.trim()}`;
  }
}
