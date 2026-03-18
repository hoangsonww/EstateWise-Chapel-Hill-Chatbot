/**
 * @fileoverview ContextMetrics — singleton metrics collector for the context-engineering system.
 *
 * Records time-stamped MetricsEvents in a bounded rolling window and exposes
 * aggregated snapshots, per-metric time-series, and a JSON serialisation suitable
 * for REST API responses and the D3 dashboard.
 */

import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import type { ContextMetricsSnapshot, MetricsEvent } from "./types.js";

// ---------------------------------------------------------------------------
// Internal event record (adds timestamp to MetricsEvent)
// ---------------------------------------------------------------------------

interface TimestampedEvent extends MetricsEvent {
  /** ISO-8601 timestamp at which the event was recorded. */
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// ContextMetrics
// ---------------------------------------------------------------------------

/** Maximum number of events kept in the rolling window. */
const MAX_EVENTS = 1000;

/**
 * Singleton-capable metrics collector.
 *
 * Usage:
 *   const metrics = new ContextMetrics(graph, kb);
 *   metrics.record({ type: "ingestion", durationMs: 42, itemCount: 3 });
 *   const snap = metrics.getSnapshot();
 */
export class ContextMetrics {
  private readonly _graph: KnowledgeGraph;
  private readonly _kb: KnowledgeBase;
  /** Rolling window of up to MAX_EVENTS recorded events. */
  private _events: TimestampedEvent[] = [];

  constructor(graph: KnowledgeGraph, kb: KnowledgeBase) {
    this._graph = graph;
    this._kb = kb;
  }

  // -------------------------------------------------------------------------
  // Recording
  // -------------------------------------------------------------------------

  /**
   * Record a single metrics event.
   * When the rolling window reaches MAX_EVENTS the oldest event is discarded.
   *
   * @param event - The event to record.
   */
  record(event: MetricsEvent): void {
    const stamped: TimestampedEvent = {
      ...event,
      recordedAt: new Date().toISOString(),
    };
    this._events.push(stamped);
    if (this._events.length > MAX_EVENTS) {
      this._events.shift();
    }
  }

  // -------------------------------------------------------------------------
  // Snapshot
  // -------------------------------------------------------------------------

  /**
   * Compute and return a full point-in-time snapshot of all subsystem metrics.
   *
   * Graph and knowledge-base stats are read live from the respective stores.
   * Context, ingestion, and cache stats are derived from the rolling event window.
   *
   * @returns A ContextMetricsSnapshot.
   */
  getSnapshot(): ContextMetricsSnapshot {
    return {
      timestamp: new Date().toISOString(),
      graph: this._buildGraphStats(),
      knowledgeBase: this._buildKbStats(),
      context: this._buildContextStats(),
      ingestion: this._buildIngestionStats(),
    };
  }

  // -------------------------------------------------------------------------
  // Time-series
  // -------------------------------------------------------------------------

  /**
   * Return time-series data points for a specific metric within an optional
   * rolling time window.
   *
   * Supported metric names:
   *   - `context_assembly`  — duration per assembly
   *   - `ingestion`         — duration per ingestion
   *   - `search`            — duration per search
   *   - `traversal`         — duration per traversal
   *   - `cache_hit_rate`    — 1 for cache_hit events, 0 for cache_miss
   *   - `token_count`       — tokenCount from events that carry it
   *   - `item_count`        — itemCount from events that carry it
   *
   * @param metric   - Name of the metric to plot.
   * @param windowMs - Optional rolling window in ms. Default: all events.
   * @returns Array of { timestamp, value } points ordered from oldest to newest.
   */
  getTimeSeries(
    metric: string,
    windowMs?: number,
  ): Array<{ timestamp: string; value: number }> {
    const cutoff = windowMs
      ? new Date(Date.now() - windowMs).toISOString()
      : null;

    const filtered = cutoff
      ? this._events.filter((e) => e.recordedAt >= cutoff)
      : this._events;

    return filtered
      .filter((e) => this._matchesMetric(e, metric))
      .map((e) => ({
        timestamp: e.recordedAt,
        value: this._extractValue(e, metric),
      }));
  }

  // -------------------------------------------------------------------------
  // Utilities
  // -------------------------------------------------------------------------

  /**
   * Clear the event rolling window. Does not affect live graph/KB state.
   */
  reset(): void {
    this._events = [];
  }

  /**
   * Serialize the current snapshot to a plain JSON-safe object.
   *
   * @returns The snapshot as a plain object.
   */
  toJSON(): object {
    return this.getSnapshot();
  }

  // -------------------------------------------------------------------------
  // Private stat builders
  // -------------------------------------------------------------------------

  private _buildGraphStats(): ContextMetricsSnapshot["graph"] {
    const stats = this._graph.getStats();
    return {
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      nodesByType: stats.nodesByType,
      edgesByType: stats.edgesByType,
      avgDegree: stats.avgDegree,
      density: stats.density,
    };
  }

  private _buildKbStats(): ContextMetricsSnapshot["knowledgeBase"] {
    const stats = this._kb.getStats();
    return {
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      totalTokens: stats.totalTokens,
      sourceBreakdown: stats.sourceBreakdown,
    };
  }

  private _buildContextStats(): ContextMetricsSnapshot["context"] {
    const assemblies = this._events.filter(
      (e) => e.type === "context_assembly",
    );
    const hits = this._events.filter((e) => e.type === "cache_hit").length;
    const misses = this._events.filter((e) => e.type === "cache_miss").length;
    const total = hits + misses;

    const avgAssemblyTimeMs = this._avg(assemblies.map((e) => e.durationMs));
    const avgTokensUsed = this._avg(
      assemblies.map((e) => e.tokenCount ?? 0).filter((v) => v > 0),
    );
    const budgetPercents = assemblies
      .map((e) => (e.metadata?.budgetUsedPercent as number | undefined) ?? 0)
      .filter((v) => v > 0);
    const avgBudgetUsedPercent = this._avg(budgetPercents);

    // Per-provider breakdown
    const providerBreakdown: ContextMetricsSnapshot["context"]["providerBreakdown"] =
      {};
    for (const e of assemblies) {
      const p = e.provider ?? "unknown";
      if (!providerBreakdown[p]) {
        providerBreakdown[p] = { calls: 0, avgItems: 0, avgTimeMs: 0 };
      }
      providerBreakdown[p].calls++;
    }
    // Compute averages per provider
    for (const [providerName, pStats] of Object.entries(providerBreakdown)) {
      const provEvents = assemblies.filter(
        (e) => (e.provider ?? "unknown") === providerName,
      );
      pStats.avgTimeMs = this._avg(provEvents.map((e) => e.durationMs));
      pStats.avgItems = this._avg(provEvents.map((e) => e.itemCount ?? 0));
    }

    return {
      totalAssemblies: assemblies.length,
      avgAssemblyTimeMs,
      avgTokensUsed,
      avgBudgetUsedPercent,
      cacheHitRate: total > 0 ? hits / total : 0,
      providerBreakdown,
    };
  }

  private _buildIngestionStats(): ContextMetricsSnapshot["ingestion"] {
    const ingestions = this._events.filter((e) => e.type === "ingestion");
    const totalErrors = ingestions.reduce(
      (sum, e) => sum + ((e.metadata?.errorCount as number | undefined) ?? 0),
      0,
    );
    const sourceBreakdown: Record<string, number> = {};
    for (const e of ingestions) {
      const src = String(e.metadata?.sourceType ?? "unknown");
      sourceBreakdown[src] = (sourceBreakdown[src] ?? 0) + 1;
    }

    return {
      totalIngested: ingestions.length,
      totalErrors,
      avgIngestionTimeMs: this._avg(ingestions.map((e) => e.durationMs)),
      sourceBreakdown,
    };
  }

  // -------------------------------------------------------------------------
  // Time-series helpers
  // -------------------------------------------------------------------------

  private _matchesMetric(e: TimestampedEvent, metric: string): boolean {
    switch (metric) {
      case "context_assembly":
        return e.type === "context_assembly";
      case "ingestion":
        return e.type === "ingestion";
      case "search":
        return e.type === "search";
      case "traversal":
        return e.type === "traversal";
      case "cache_hit_rate":
        return e.type === "cache_hit" || e.type === "cache_miss";
      case "token_count":
        return e.tokenCount != null;
      case "item_count":
        return e.itemCount != null;
      default:
        return false;
    }
  }

  private _extractValue(e: TimestampedEvent, metric: string): number {
    switch (metric) {
      case "cache_hit_rate":
        return e.type === "cache_hit" ? 1 : 0;
      case "token_count":
        return e.tokenCount ?? 0;
      case "item_count":
        return e.itemCount ?? 0;
      default:
        return e.durationMs;
    }
  }

  // -------------------------------------------------------------------------
  // Math utility
  // -------------------------------------------------------------------------

  /** Returns the arithmetic mean of an array, or 0 for an empty array. */
  private _avg(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
}
