/**
 * @fileoverview Knowledge-base-sourced context provider for the EstateWise Context Engine.
 *
 * Delegates to the KnowledgeBase's hybrid search to find document chunks that
 * are semantically and lexically relevant to the current query, then wraps
 * the top results as ContextItems ready for budget allocation.
 */

import { randomUUID } from "crypto";
import { KnowledgeBase } from "../../knowledge-base/KnowledgeBase.js";
import { ContextSource, ContextPriority } from "../types.js";
import type {
  ContextItem,
  ContextProvider,
  ContextAssemblyRequest,
} from "../types.js";

/** Maximum KB search results to surface per assembly request. */
const MAX_KB_RESULTS = 8;
/** Minimum score a KB result must have to be included (0–1). */
const MIN_KB_SCORE = 0.15;
/** Approximate characters per token for estimation. */
const CHARS_PER_TOKEN = 4;

/**
 * Provides context items sourced from the EstateWise KnowledgeBase.
 *
 * Uses hybrid (semantic + keyword) retrieval with a configurable score
 * threshold so only genuinely relevant chunks enter the context window.
 * System-sourced documents (domain seed content) are elevated to High
 * priority; user-contributed documents default to Medium.
 */
export class DocumentProvider implements ContextProvider {
  readonly name = "kb";
  readonly priority = ContextPriority.High;

  private readonly kb: KnowledgeBase;

  constructor(kb: KnowledgeBase) {
    this.kb = kb;
  }

  /**
   * Searches the knowledge base and returns matching chunks as context items.
   *
   * @param request - The full assembly request. Only `query` is used here.
   * @returns Up to `MAX_KB_RESULTS` context items from matched KB chunks.
   */
  async getContext(request: ContextAssemblyRequest): Promise<ContextItem[]> {
    if (!request.query.trim()) return [];

    const results = await this.kb.search(request.query, {
      strategy: "hybrid",
      limit: MAX_KB_RESULTS,
      threshold: MIN_KB_SCORE,
    });

    const now = new Date().toISOString();

    return results.map((result) => {
      const content = this._formatChunk(
        result.chunk.content,
        result.document.title,
      );
      const isSystem = result.document.sourceType === "system";

      return {
        id: randomUUID(),
        content,
        source: ContextSource.KnowledgeBase,
        relevanceScore: result.score,
        tokenCount: Math.ceil(content.length / CHARS_PER_TOKEN),
        priority: isSystem ? ContextPriority.High : ContextPriority.Medium,
        metadata: {
          documentId: result.document.id,
          documentTitle: result.document.title,
          chunkId: result.chunk.id,
          chunkPosition: result.chunk.position,
          sourceType: result.document.sourceType,
          searchStrategy: result.strategy,
          tags: result.document.metadata.tags,
        },
        timestamp: now,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /**
   * Formats a chunk's content with its parent document title for readability
   * in the context window.
   */
  private _formatChunk(chunkContent: string, documentTitle: string): string {
    return `[Knowledge Base: ${documentTitle}]\n${chunkContent.trim()}`;
  }
}
