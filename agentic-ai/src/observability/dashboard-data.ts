/**
 * Dashboard data provider: aggregates metrics, costs, and traces
 * into a single snapshot for UI consumption.
 */

import type { MetricsRegistry } from "./metrics.js";
import type { CostTracker, CostEntry } from "./cost-tracker.js";
import type { Tracer } from "./tracer.js";

export interface DashboardSnapshot {
  timestamp: number;
  metrics: Array<{
    type: string;
    name: string;
    description: string;
    value: unknown;
  }>;
  costSummary: {
    totalCostUsd: number;
    byAgent: Record<string, number>;
    byModel: Record<string, number>;
    dailyCostUsd: number;
    optimizationSuggestions: string[];
  };
  traceCount: number;
  recentErrors: Array<{
    traceId: string;
    spanId: string;
    name: string;
    error: string;
  }>;
}

export class DashboardDataProvider {
  constructor(
    private readonly metricsRegistry: MetricsRegistry,
    private readonly costTracker: CostTracker,
    private readonly tracer: Tracer,
  ) {}

  /**
   * Build a point-in-time snapshot of all observability data.
   */
  getSnapshot(): DashboardSnapshot {
    const metrics = this.metricsRegistry.getAll();

    const costSummary = {
      totalCostUsd: this.costTracker.getTotalCost(),
      byAgent: this.costTracker.getCostByAgent(),
      byModel: this.costTracker.getCostByModel(),
      dailyCostUsd: this.costTracker.getDailyCost(),
      optimizationSuggestions: this.costTracker.getOptimizationSuggestions(),
    };

    const traceIds = this.tracer.getAllTraces();
    const traceCount = traceIds.length;

    const recentErrors: DashboardSnapshot["recentErrors"] = [];
    for (const traceId of traceIds.slice(-20)) {
      const spans = this.tracer.getTrace(traceId);
      if (!spans) continue;
      for (const span of spans) {
        if (span.status === "error") {
          recentErrors.push({
            traceId,
            spanId: span.spanId,
            name: span.name,
            error:
              typeof span.attributes["error"] === "string"
                ? span.attributes["error"]
                : span.attributes["error.message"]
                  ? String(span.attributes["error.message"])
                  : "Unknown error",
          });
        }
      }
    }

    return {
      timestamp: Date.now(),
      metrics,
      costSummary,
      traceCount,
      recentErrors: recentErrors.slice(-20),
    };
  }
}
