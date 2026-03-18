/**
 * @fileoverview Tool result cache provider for the EstateWise Context Engine.
 *
 * Maintains an in-memory ring buffer of the most recent MCP tool invocation
 * results and surfaces relevant ones as context items for each assembly request.
 * Relevance is determined by simple keyword overlap between the query and
 * the tool name plus result content.
 */

import { randomUUID } from "crypto";
import { ContextSource, ContextPriority } from "../types.js";
import type {
  ContextItem,
  ContextProvider,
  ContextAssemblyRequest,
} from "../types.js";

/** Maximum number of tool results retained in the cache at any time. */
const MAX_CACHE_SIZE = 50;
/** Maximum number of tool results surfaced per assembly request. */
const MAX_RESULTS_PER_REQUEST = 5;
/** Minimum keyword overlap score to include a tool result. */
const MIN_RELEVANCE = 0.1;
/** Approximate characters per token for estimation. */
const CHARS_PER_TOKEN = 4;

/** An individual cached tool invocation record. */
interface CachedToolResult {
  /** Unique entry ID. */
  id: string;
  /** Name of the MCP tool that was called. */
  toolName: string;
  /** Serialised input arguments to the tool call. */
  args: Record<string, unknown>;
  /** Serialised string output from the tool. */
  result: string;
  /** ISO 8601 timestamp of when the result was cached. */
  timestamp: string;
}

/**
 * Caches recent tool call results and serves relevant ones as context items.
 *
 * The cache operates as a FIFO queue: when the cache reaches `MAX_CACHE_SIZE`
 * entries the oldest entry is evicted to make room for the newest. Relevance
 * is scored using token overlap between the current query and both the tool
 * name and result content, avoiding any external API calls.
 */
export class ToolResultProvider implements ContextProvider {
  readonly name = "tool_result";
  readonly priority = ContextPriority.Medium;

  private readonly cache: CachedToolResult[] = [];

  /**
   * Adds a tool result to the cache.
   *
   * When the cache is full the oldest entry is evicted before adding the new one.
   *
   * @param toolName - The MCP tool name (e.g. "properties.search").
   * @param args     - The arguments that were passed to the tool.
   * @param result   - The stringified result returned by the tool.
   */
  addResult(
    toolName: string,
    args: Record<string, unknown>,
    result: string,
  ): void {
    if (this.cache.length >= MAX_CACHE_SIZE) {
      this.cache.shift(); // evict oldest
    }
    this.cache.push({
      id: randomUUID(),
      toolName,
      args,
      result,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Returns cached tool results that are relevant to the current query.
   * Results are sorted by relevance descending and limited to `MAX_RESULTS_PER_REQUEST`.
   *
   * @param request - The full assembly request. Uses `query` and `activeTools`.
   * @returns Relevant cached tool results as context items.
   */
  async getContext(request: ContextAssemblyRequest): Promise<ContextItem[]> {
    if (this.cache.length === 0) return [];

    const queryTokens = this._tokenize(request.query);
    const activeToolNames = new Set(request.activeTools ?? []);
    const now = new Date().toISOString();

    const scored = this.cache
      .map((entry) => {
        const relevance = this._scoreRelevance(
          entry,
          queryTokens,
          activeToolNames,
        );
        return { entry, relevance };
      })
      .filter(({ relevance }) => relevance >= MIN_RELEVANCE)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, MAX_RESULTS_PER_REQUEST);

    return scored.map(({ entry, relevance }) => {
      const content = this._formatEntry(entry);
      return {
        id: randomUUID(),
        content,
        source: ContextSource.ToolResult,
        relevanceScore: relevance,
        tokenCount: Math.ceil(content.length / CHARS_PER_TOKEN),
        priority: ContextPriority.Medium,
        metadata: {
          toolName: entry.toolName,
          cachedAt: entry.timestamp,
          args: entry.args,
        },
        timestamp: now,
      };
    });
  }

  /**
   * Returns the current number of entries in the tool result cache.
   */
  getCacheSize(): number {
    return this.cache.length;
  }

  /**
   * Clears all entries from the tool result cache.
   */
  clearCache(): void {
    this.cache.length = 0;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Scores the relevance of a cached result against the current query.
   *
   * Factors considered:
   * - Keyword overlap between query tokens and tool name tokens (40%).
   * - Keyword overlap between query tokens and result content tokens (50%).
   * - Boost if the tool is in the active tool set (10%).
   */
  private _scoreRelevance(
    entry: CachedToolResult,
    queryTokens: string[],
    activeTools: Set<string>,
  ): number {
    if (queryTokens.length === 0) return 0;

    const nameTokens = new Set(this._tokenize(entry.toolName));
    const resultTokens = new Set(this._tokenize(entry.result.slice(0, 500)));

    const nameOverlap =
      queryTokens.filter((qt) => nameTokens.has(qt)).length /
      queryTokens.length;
    const resultOverlap =
      queryTokens.filter((qt) => resultTokens.has(qt)).length /
      queryTokens.length;
    const activeBias = activeTools.has(entry.toolName) ? 0.1 : 0;

    return Math.min(1, nameOverlap * 0.4 + resultOverlap * 0.5 + activeBias);
  }

  /** Formats a cached tool result entry as a labelled text block. */
  private _formatEntry(entry: CachedToolResult): string {
    const argStr =
      Object.keys(entry.args).length > 0
        ? Object.entries(entry.args)
            .slice(0, 5)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(", ")
        : "none";

    const preview =
      entry.result.length > 500
        ? entry.result.slice(0, 500) + "…"
        : entry.result;

    return [
      `[Tool Result: ${entry.toolName}]`,
      `Args: ${argStr}`,
      `Result: ${preview}`,
    ].join("\n");
  }

  /** Lowercases and splits text into alphanumeric tokens. */
  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\W_.]+/)
      .filter((t) => t.length > 1 && t.length < 30);
  }
}
