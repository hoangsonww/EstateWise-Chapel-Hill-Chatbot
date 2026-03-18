/**
 * @fileoverview Type definitions for the EstateWise Knowledge Base system.
 *
 * Provides strongly-typed interfaces for documents, chunks, search operations,
 * and embedding configuration used throughout the knowledge base layer.
 */

/** A full document stored in the knowledge base with its content split into searchable chunks. */
export interface KBDocument {
  /** Unique document identifier (UUID v4). */
  id: string;
  /** Human-readable title for the document. */
  title: string;
  /** Full raw text content of the document. */
  content: string;
  /** Origin identifier (URL, agent name, tool name, user ID, etc.). */
  source: string;
  /** Categorical type describing where this document originated. */
  sourceType:
    | "property"
    | "conversation"
    | "document"
    | "tool_result"
    | "agent_output"
    | "system";
  /** Ordered array of content chunks derived from this document. */
  chunks: KBChunk[];
  /** Structured metadata about this document. */
  metadata: DocumentMetadata;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
  /** ISO 8601 last-update timestamp. */
  updatedAt: string;
}

/**
 * A single searchable fragment of a parent document with its embedding vector.
 * Chunks are the atomic unit of retrieval in the knowledge base.
 */
export interface KBChunk {
  /** Unique chunk identifier (UUID v4). */
  id: string;
  /** Reference to the parent document ID. */
  documentId: string;
  /** The text content of this chunk, possibly with overlap from adjacent chunks. */
  content: string;
  /** Dense embedding vector produced by the configured embedder. */
  embedding: number[];
  /** Zero-based position of this chunk within the document. */
  position: number;
  /** Estimated token count for this chunk's content. */
  tokenCount: number;
  /** Arbitrary key-value metadata attached to this chunk at ingestion time. */
  metadata: Record<string, unknown>;
}

/** Structured metadata attached to every KBDocument. */
export interface DocumentMetadata {
  /** Optional authoring identity (user, agent, system). */
  author?: string;
  /** Free-form tag strings for categorisation and filtering. */
  tags: string[];
  /** BCP 47 language tag (e.g. "en", "es"). Defaults to "en" when absent. */
  language?: string;
  /** Aggregate relevance score assigned by the last search that surfaced this document. */
  relevanceScore?: number;
  /** Running count of how many times this document has been accessed in search results. */
  accessCount: number;
  /** ISO 8601 timestamp of the most recent access. */
  lastAccessedAt?: string;
}

/** Configuration for a single knowledge base search operation. */
export interface SearchOptions {
  /**
   * Retrieval strategy to use:
   * - "semantic"        – pure cosine similarity over embeddings
   * - "keyword"         – TF-IDF keyword frequency matching
   * - "hybrid"          – weighted combination of semantic + keyword
   * - "graph_enhanced"  – hybrid plus knowledge-graph traversal boost
   */
  strategy: "semantic" | "keyword" | "hybrid" | "graph_enhanced";
  /** Maximum number of results to return. Defaults to 10. */
  limit?: number;
  /** Minimum similarity score threshold in [0, 1]. Results below this are excluded. */
  threshold?: number;
  /** Optional field-level filters applied before scoring. */
  filters?: SearchFilter[];
  /** When true, recency of document creation boosts the ranking score. */
  boostRecent?: boolean;
  /** When true, frequently accessed documents receive a ranking boost. */
  boostFrequent?: boolean;
}

/** A predicate that restricts the document or chunk set before scoring. */
export interface SearchFilter {
  /** Dot-separated path to the field on KBDocument or DocumentMetadata (e.g. "metadata.tags"). */
  field: string;
  /**
   * Comparison operator:
   * - "eq"       – strict equality
   * - "ne"       – not-equal
   * - "gt"       – greater-than (numeric)
   * - "lt"       – less-than (numeric)
   * - "contains" – substring or array inclusion
   * - "in"       – value is one of an array
   */
  operator: "eq" | "ne" | "gt" | "lt" | "contains" | "in";
  /** The comparison target value. Must be compatible with the operator. */
  value: unknown;
}

/** A single ranked result returned from a knowledge base search. */
export interface SearchResult {
  /** The matched chunk. */
  chunk: KBChunk;
  /** The parent document of the matched chunk. */
  document: KBDocument;
  /** Normalised similarity / relevance score in [0, 1]. Higher is more relevant. */
  score: number;
  /** The strategy that produced this result ("semantic", "keyword", etc.). */
  strategy: string;
  /** Optional list of highlighted text snippets from the chunk content. */
  highlights?: string[];
}

/** Configuration passed to an Embedder instance at construction time. */
export interface EmbedderConfig {
  /** Size of the output embedding vectors. Default is 128 for the built-in TF-IDF embedder. */
  dimensions: number;
  /** Optional model identifier used by an external embedding provider. */
  model?: string;
}

/**
 * Signature for an external embedding function (e.g. OpenAI text-embedding-3-small).
 * Accepts a batch of strings and returns a parallel array of dense vectors.
 */
export type EmbedFunction = (texts: string[]) => Promise<number[][]>;
