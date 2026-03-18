/**
 * @fileoverview Multi-strategy retrieval engine for the EstateWise Knowledge Base.
 *
 * Implements semantic (dense vector), keyword (sparse TF-IDF), and hybrid
 * retrieval over a flat array of KBChunks. All public methods return results
 * sorted by score descending and normalised to [0, 1].
 */

import { Embedder } from "./Embedder.js";
import type {
  KBChunk,
  KBDocument,
  SearchOptions,
  SearchFilter,
  SearchResult,
} from "./types.js";

/** @internal Per-chunk scoring record used during hybrid merging. */
interface ScoredChunk {
  chunk: KBChunk;
  semanticScore: number;
  keywordScore: number;
}

/**
 * Stateless retrieval engine used internally by KnowledgeBase.
 *
 * Each search method is independent and accepts the full chunk list so that
 * callers can filter the list before passing it in.
 */
export class Retriever {
  // ---------------------------------------------------------------------------
  // Public strategy methods
  // ---------------------------------------------------------------------------

  /**
   * Ranks chunks by cosine similarity between the query embedding and each
   * chunk's stored embedding vector.
   *
   * @param query      - Pre-computed embedding for the search query.
   * @param chunks     - Candidate chunks to rank.
   * @param documents  - Document map for resolving parent docs.
   * @param limit      - Maximum number of results to return.
   * @param options    - Full search options for filter and boost application.
   * @returns Ranked results, highest scoring first.
   */
  semanticSearch(
    query: number[],
    chunks: KBChunk[],
    documents: Map<string, KBDocument>,
    limit: number,
    options?: Partial<SearchOptions>,
  ): SearchResult[] {
    const filtered = this._applyFilters(
      chunks,
      documents,
      options?.filters ?? [],
    );

    const scored = filtered.map((chunk) => ({
      chunk,
      score: Embedder.cosineSimilarity(query, chunk.embedding),
    }));

    return this._finalise(scored, documents, "semantic", limit, options);
  }

  /**
   * Ranks chunks using a TF-IDF keyword overlap score between the query tokens
   * and each chunk's content. Does not require pre-computed embeddings.
   *
   * @param queryText  - Raw query string.
   * @param chunks     - Candidate chunks to rank.
   * @param documents  - Document map for resolving parent docs.
   * @param limit      - Maximum number of results to return.
   * @param options    - Full search options for filter and boost application.
   * @returns Ranked results, highest scoring first.
   */
  keywordSearch(
    queryText: string,
    chunks: KBChunk[],
    documents: Map<string, KBDocument>,
    limit: number,
    options?: Partial<SearchOptions>,
  ): SearchResult[] {
    const filtered = this._applyFilters(
      chunks,
      documents,
      options?.filters ?? [],
    );
    const queryTokens = this._tokenize(queryText);

    if (queryTokens.length === 0) {
      return [];
    }

    // Build IDF over the filtered chunk corpus.
    const df = this._buildDF(filtered);
    const N = filtered.length || 1;

    const scored = filtered.map((chunk) => {
      const score = this._tfidfScore(queryTokens, chunk.content, df, N);
      return { chunk, score };
    });

    return this._finalise(scored, documents, "keyword", limit, options);
  }

  /**
   * Combines semantic and keyword scores into a single weighted hybrid score.
   *
   * @param queryText       - Raw query string.
   * @param queryEmbedding  - Pre-computed embedding for the query.
   * @param chunks          - Candidate chunks to rank.
   * @param documents       - Document map for resolving parent docs.
   * @param limit           - Maximum number of results to return.
   * @param semanticWeight  - Weight given to semantic score in [0, 1]. Keyword
   *                          receives `1 - semanticWeight`. Defaults to 0.65.
   * @param options         - Full search options for filter and boost application.
   * @returns Ranked results, highest scoring first.
   */
  hybridSearch(
    queryText: string,
    queryEmbedding: number[],
    chunks: KBChunk[],
    documents: Map<string, KBDocument>,
    limit: number,
    semanticWeight = 0.65,
    options?: Partial<SearchOptions>,
  ): SearchResult[] {
    const filtered = this._applyFilters(
      chunks,
      documents,
      options?.filters ?? [],
    );
    const queryTokens = this._tokenize(queryText);
    const keywordWeight = 1 - semanticWeight;

    const df = this._buildDF(filtered);
    const N = filtered.length || 1;

    const scoredMap = new Map<string, ScoredChunk>();

    for (const chunk of filtered) {
      const semanticScore = Embedder.cosineSimilarity(
        queryEmbedding,
        chunk.embedding,
      );
      const keywordScore =
        queryTokens.length > 0
          ? this._tfidfScore(queryTokens, chunk.content, df, N)
          : 0;

      scoredMap.set(chunk.id, { chunk, semanticScore, keywordScore });
    }

    const scored = Array.from(scoredMap.values()).map(
      ({ chunk, semanticScore, keywordScore }) => ({
        chunk,
        score: semanticScore * semanticWeight + keywordScore * keywordWeight,
      }),
    );

    return this._finalise(scored, documents, "hybrid", limit, options);
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Applies the list of SearchFilters to the chunk set, returning only chunks
   * whose parent document satisfies all filters.
   */
  private _applyFilters(
    chunks: KBChunk[],
    documents: Map<string, KBDocument>,
    filters: SearchFilter[],
  ): KBChunk[] {
    if (filters.length === 0) return chunks;

    return chunks.filter((chunk) => {
      const doc = documents.get(chunk.documentId);
      if (!doc) return false;

      return filters.every((filter) => {
        const value = this._resolvePath(
          doc as unknown as Record<string, unknown>,
          filter.field,
        );
        return this._evalFilter(value, filter.operator, filter.value);
      });
    });
  }

  /** Resolves a dot-separated field path on an object. */
  private _resolvePath(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce<unknown>((acc, key) => {
      if (acc !== null && typeof acc === "object") {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /** Evaluates a single filter predicate. */
  private _evalFilter(
    fieldValue: unknown,
    operator: SearchFilter["operator"],
    filterValue: unknown,
  ): boolean {
    switch (operator) {
      case "eq":
        return fieldValue === filterValue;
      case "ne":
        return fieldValue !== filterValue;
      case "gt":
        return typeof fieldValue === "number" && typeof filterValue === "number"
          ? fieldValue > filterValue
          : false;
      case "lt":
        return typeof fieldValue === "number" && typeof filterValue === "number"
          ? fieldValue < filterValue
          : false;
      case "contains":
        if (Array.isArray(fieldValue)) return fieldValue.includes(filterValue);
        if (typeof fieldValue === "string" && typeof filterValue === "string") {
          return fieldValue.toLowerCase().includes(filterValue.toLowerCase());
        }
        return false;
      case "in":
        return Array.isArray(filterValue)
          ? filterValue.includes(fieldValue)
          : false;
      default:
        return true;
    }
  }

  /**
   * Applies optional boost factors, clamps scores to [0, 1], applies threshold
   * filtering, sorts descending, and assembles SearchResult objects.
   */
  private _finalise(
    scored: Array<{ chunk: KBChunk; score: number }>,
    documents: Map<string, KBDocument>,
    strategy: string,
    limit: number,
    options?: Partial<SearchOptions>,
  ): SearchResult[] {
    const threshold = options?.threshold ?? 0;
    const now = Date.now();

    // Apply optional boost factors.
    const boosted = scored.map(({ chunk, score }) => {
      let finalScore = score;
      const doc = documents.get(chunk.documentId);
      if (!doc) return { chunk, score: finalScore };

      if (options?.boostRecent) {
        const ageMs = now - new Date(doc.createdAt).getTime();
        // Recency decay: 1.0 at 0 days, ~0.5 at 30 days.
        const recency = Math.exp(-ageMs / (30 * 24 * 3600 * 1000));
        finalScore = finalScore * 0.85 + recency * 0.15;
      }

      if (options?.boostFrequent) {
        // Frequency boost: log(1 + accessCount) normalised to add up to ~15%.
        const freq = Math.min(Math.log1p(doc.metadata.accessCount) / 10, 0.15);
        finalScore = Math.min(1, finalScore + freq);
      }

      return { chunk, score: Math.min(1, Math.max(0, finalScore)) };
    });

    return boosted
      .filter(({ score }) => score >= threshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ chunk, score }) => {
        const doc = documents.get(chunk.documentId)!;
        return {
          chunk,
          document: doc,
          score,
          strategy,
          highlights: this._extractHighlights(chunk.content),
        };
      });
  }

  /** Builds document-frequency counts over a chunk corpus (per unique token per chunk). */
  private _buildDF(chunks: KBChunk[]): Map<string, number> {
    const df = new Map<string, number>();
    for (const chunk of chunks) {
      const unique = new Set(this._tokenize(chunk.content));
      for (const term of unique) {
        df.set(term, (df.get(term) ?? 0) + 1);
      }
    }
    return df;
  }

  /** Computes a TF-IDF score for a set of query tokens against a chunk's content. */
  private _tfidfScore(
    queryTokens: string[],
    content: string,
    df: Map<string, number>,
    N: number,
  ): number {
    const contentTokens = this._tokenize(content);
    if (contentTokens.length === 0) return 0;

    const tf = new Map<string, number>();
    for (const t of contentTokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
    }

    let score = 0;
    for (const qt of queryTokens) {
      const termTF = (tf.get(qt) ?? 0) / contentTokens.length;
      const idf = Math.log(N / ((df.get(qt) ?? 0) + 1)) + 1;
      score += termTF * idf;
    }

    // Normalise by the number of query tokens so scores are in a comparable range.
    return Math.min(1, score / queryTokens.length);
  }

  /** Lowercases and splits text into alphanumeric tokens. */
  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\W]+/)
      .filter((t) => t.length > 1 && t.length < 30);
  }

  /** Extracts a short highlighted snippet from chunk content (first 150 chars). */
  private _extractHighlights(content: string): string[] {
    const trimmed = content.trim();
    return trimmed.length > 0
      ? [trimmed.slice(0, 150) + (trimmed.length > 150 ? "…" : "")]
      : [];
  }
}
