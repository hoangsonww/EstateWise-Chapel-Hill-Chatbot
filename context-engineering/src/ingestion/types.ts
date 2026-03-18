/**
 * @fileoverview Type definitions for the EstateWise ingestion pipeline.
 *
 * Describes the contract between data sources (property listings, conversations,
 * documents, tool results, agent outputs, Neo4j exports) and the in-memory
 * KnowledgeGraph + KnowledgeBase stores.
 */

// ---------------------------------------------------------------------------
// Source
// ---------------------------------------------------------------------------

/** Discriminated union of all data sources that can be ingested. */
export interface IngestionSource {
  /** Identifies the shape of `data` and selects the appropriate parser. */
  type:
    | "property"
    | "conversation"
    | "document"
    | "tool_result"
    | "agent_output"
    | "neo4j";
  /** The raw payload from the source system. Shape depends on `type`. */
  data: unknown;
  /** Optional caller-provided metadata merged into every artifact created. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Result
// ---------------------------------------------------------------------------

/** Aggregate outcome returned after processing one or more IngestionSources. */
export interface IngestionResult {
  /** Number of new graph nodes created during this ingestion pass. */
  nodesCreated: number;
  /** Number of new graph edges created during this ingestion pass. */
  edgesCreated: number;
  /** Number of new KB documents created during this ingestion pass. */
  documentsCreated: number;
  /** Total number of chunks stored across all new documents. */
  chunksCreated: number;
  /** Non-fatal errors collected while processing sources. */
  errors: IngestionError[];
  /** Wall-clock duration of the ingestion pass in milliseconds. */
  durationMs: number;
}

/** A non-fatal error encountered while ingesting a single source. */
export interface IngestionError {
  /** Human-readable identifier of the failing source (e.g. property ZPID, doc title). */
  source: string;
  /** Error message. */
  message: string;
  /** Optional serialised data that triggered the error for diagnostics. */
  data?: unknown;
}

// ---------------------------------------------------------------------------
// Pipeline contract
// ---------------------------------------------------------------------------

/** Contract that every domain-specific parser must implement. */
export interface IngestionPipeline {
  /** Stable name used to identify this parser in logs and metrics. */
  name: string;
  /**
   * Transform a raw IngestionSource into a structured ParsedData payload.
   * The Ingester will then persist the returned artifacts.
   *
   * @param source - The source to parse.
   * @returns Parsed nodes, edges, and documents ready for storage.
   */
  parse(source: IngestionSource): Promise<ParsedData>;
}

// ---------------------------------------------------------------------------
// Intermediate representation
// ---------------------------------------------------------------------------

/**
 * Intermediate representation produced by a parser.
 * The Ingester writes each field into the appropriate store.
 */
export interface ParsedData {
  /**
   * Graph nodes to create or upsert.
   * Each entry maps onto a KnowledgeGraph addNode call.
   */
  nodes: Array<{
    /** Node type string (must match a NodeType enum key). */
    type: string;
    /** Human-readable display label. */
    label: string;
    /** Domain-specific properties stored on the node. */
    properties: Record<string, unknown>;
    /** Optional importance score in [0, 1]. Defaults to 0.5. */
    importance?: number;
  }>;
  /**
   * Graph edges to create.
   * The Ingester resolves source/target IDs by label lookup before adding.
   */
  edges: Array<{
    /** Label of the source node (used for ID resolution). */
    sourceLabel: string;
    /** Label of the target node (used for ID resolution). */
    targetLabel: string;
    /** Edge relationship type string (must match an EdgeType enum key). */
    type: string;
    /** Optional strength of the relationship in [0, 1]. Defaults to 0.7. */
    weight?: number;
    /** Optional domain-specific edge properties. */
    properties?: Record<string, unknown>;
  }>;
  /**
   * Knowledge-base documents to store.
   * Each entry maps onto a KnowledgeBase addDocument call.
   */
  documents: Array<{
    /** Document title shown in search results. */
    title: string;
    /** Full text content that will be chunked and embedded. */
    content: string;
    /** Logical origin identifier (e.g. "property:12345", "conv:abc"). */
    source: string;
    /** Categorical source type for filtering. */
    sourceType: string;
    /** Optional free-form tags for categorisation. */
    tags?: string[];
  }>;
}
