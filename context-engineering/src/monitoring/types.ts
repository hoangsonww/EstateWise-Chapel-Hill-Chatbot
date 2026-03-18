/**
 * @fileoverview Type definitions for the EstateWise context-engineering metrics system.
 *
 * Provides strongly-typed snapshots and event records used by ContextMetrics
 * to collect, aggregate, and expose system health data.
 */

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

/**
 * Point-in-time snapshot of all context-engineering subsystem metrics.
 * Returned by ContextMetrics.getSnapshot() and served via the /metrics endpoint.
 */
export interface ContextMetricsSnapshot {
  /** ISO-8601 timestamp of when the snapshot was taken. */
  timestamp: string;

  /** Knowledge-graph statistics. */
  graph: {
    /** Total number of nodes currently in the graph. */
    nodeCount: number;
    /** Total number of directed edges currently in the graph. */
    edgeCount: number;
    /** Node counts partitioned by NodeType string key. */
    nodesByType: Record<string, number>;
    /** Edge counts partitioned by EdgeType string key. */
    edgesByType: Record<string, number>;
    /** Mean degree (in + out) across all nodes. */
    avgDegree: number;
    /** Graph density: actual edges / max possible edges. */
    density: number;
  };

  /** Knowledge-base statistics. */
  knowledgeBase: {
    /** Total number of documents stored. */
    documentCount: number;
    /** Total number of chunks stored across all documents. */
    chunkCount: number;
    /** Aggregate estimated token count across all chunks. */
    totalTokens: number;
    /** Document counts partitioned by sourceType string key. */
    sourceBreakdown: Record<string, number>;
  };

  /** Context-assembly statistics. */
  context: {
    /** Cumulative number of context assemblies performed since last reset. */
    totalAssemblies: number;
    /** Rolling average assembly duration in milliseconds. */
    avgAssemblyTimeMs: number;
    /** Rolling average number of tokens used per assembly. */
    avgTokensUsed: number;
    /** Rolling average of the budget utilisation ratio (tokens used / max tokens) as a percent. */
    avgBudgetUsedPercent: number;
    /** Cache hit rate in [0, 1]: hits / (hits + misses). */
    cacheHitRate: number;
    /** Per-provider call statistics. */
    providerBreakdown: Record<
      string,
      {
        /** Number of times this provider has been called. */
        calls: number;
        /** Average number of context items returned per call. */
        avgItems: number;
        /** Average provider execution time in milliseconds. */
        avgTimeMs: number;
      }
    >;
  };

  /** Ingestion pipeline statistics. */
  ingestion: {
    /** Total number of sources successfully ingested since last reset. */
    totalIngested: number;
    /** Total number of non-fatal ingestion errors since last reset. */
    totalErrors: number;
    /** Rolling average ingestion duration in milliseconds. */
    avgIngestionTimeMs: number;
    /** Ingested source counts partitioned by IngestionSource.type. */
    sourceBreakdown: Record<string, number>;
  };
}

// ---------------------------------------------------------------------------
// Event
// ---------------------------------------------------------------------------

/**
 * A single metrics event recorded by a subsystem.
 * Events are collected in a rolling window by ContextMetrics.
 */
export interface MetricsEvent {
  /** The operation that produced this event. */
  type:
    | "context_assembly"
    | "ingestion"
    | "search"
    | "traversal"
    | "cache_hit"
    | "cache_miss";
  /**
   * For context_assembly events: the provider that was called.
   * For other events: optional identifier of the subsystem.
   */
  provider?: string;
  /** Wall-clock duration of the operation in milliseconds. */
  durationMs: number;
  /** Number of items produced (chunks, nodes, edges, documents, etc.). */
  itemCount?: number;
  /** Estimated or exact token count for the produced items. */
  tokenCount?: number;
  /** Any additional event-specific data. */
  metadata?: Record<string, unknown>;
}
