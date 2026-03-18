/**
 * @fileoverview Text embedding implementation for the EstateWise Knowledge Base.
 *
 * Provides a built-in TF-IDF based embedder that requires no external API, as well
 * as an optional hook to substitute any external embedding function (e.g. OpenAI).
 * Hash-based dimensionality reduction keeps vectors at a fixed size regardless of
 * vocabulary growth.
 */

import type { EmbedFunction, EmbedderConfig } from "./types.js";

const DEFAULT_DIMENSIONS = 128;

/**
 * Lightweight text embedder used by the knowledge base.
 *
 * When no external embed function is supplied the class falls back to a
 * hash-projection TF-IDF implementation that is fully synchronous and
 * requires no network calls. This is sufficient for keyword-dense real-estate
 * content and keeps the package self-contained.
 */
export class Embedder {
  private readonly dimensions: number;
  private readonly externalEmbed: EmbedFunction | null;
  /** Running IDF corpus: term → document-frequency count. */
  private readonly df: Map<string, number> = new Map();
  /** Total number of documents seen so far, used to compute IDF. */
  private docCount = 0;

  constructor(config?: Partial<EmbedderConfig>, externalEmbed?: EmbedFunction) {
    this.dimensions = config?.dimensions ?? DEFAULT_DIMENSIONS;
    this.externalEmbed = externalEmbed ?? null;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Embeds a single string into a dense vector of `dimensions` floats.
   *
   * @param text - Raw text to embed.
   * @returns A normalised embedding vector.
   */
  async embed(text: string): Promise<number[]> {
    const batch = await this.embedBatch([text]);
    return batch[0];
  }

  /**
   * Embeds multiple strings in a single batch for efficiency.
   *
   * When an external embed function was provided at construction time it is
   * called here. Otherwise the built-in TF-IDF projector is used.
   *
   * @param texts - Array of raw strings to embed.
   * @returns Parallel array of embedding vectors.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (this.externalEmbed !== null) {
      return this.externalEmbed(texts);
    }
    return texts.map((t) => this._tfidfEmbed(t));
  }

  /**
   * Computes the cosine similarity between two equal-length vectors.
   *
   * @param a - First vector.
   * @param b - Second vector.
   * @returns Similarity score in [-1, 1]. Returns 0 for zero-magnitude vectors.
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Produces a TF-IDF embedding for a single text using hash-based projection.
   *
   * Steps:
   *   1. Tokenise the text.
   *   2. Update the corpus document-frequency table.
   *   3. Compute per-term TF-IDF weights.
   *   4. Project weights into a fixed-dimension space via a signed hash trick.
   *   5. L2-normalise the resulting vector.
   */
  private _tfidfEmbed(text: string): number[] {
    const tokens = this._tokenize(text);
    if (tokens.length === 0) return new Array<number>(this.dimensions).fill(0);

    // Compute term frequencies for this document.
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }

    // Update corpus DF (treat every call as a new document for online learning).
    this.docCount += 1;
    for (const term of tf.keys()) {
      this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }

    // Project TF-IDF weights into the fixed-size vector.
    const vector = new Array<number>(this.dimensions).fill(0);
    const N = Math.max(this.docCount, 1);

    for (const [term, count] of tf) {
      const tfScore = count / tokens.length;
      const idf = Math.log(N / ((this.df.get(term) ?? 1) + 1)) + 1;
      const weight = tfScore * idf;

      // Signed hash trick: two independent hash projections per term.
      const h1 = this._hash(term) % this.dimensions;
      const h2 = this._hash(term + "_2") % this.dimensions;
      const sign = this._hash(term + "_sign") % 2 === 0 ? 1 : -1;

      vector[Math.abs(h1)] += weight * sign;
      vector[Math.abs(h2)] += weight * sign * 0.5;
    }

    return this._l2Normalize(vector);
  }

  /** Tokenises text by lowercasing and splitting on non-alphanumeric boundaries. */
  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\W]+/)
      .filter((t) => t.length > 1 && t.length < 30);
  }

  /** Fast deterministic integer hash (FNV-1a variant, 32-bit). */
  private _hash(s: string): number {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h);
  }

  /** L2-normalises a vector in place and returns it. */
  private _l2Normalize(v: number[]): number[] {
    const mag = Math.sqrt(v.reduce((acc, x) => acc + x * x, 0));
    if (mag === 0) return v;
    return v.map((x) => x / mag);
  }
}
