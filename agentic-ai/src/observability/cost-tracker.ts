/**
 * Observability-layer cost tracker for per-agent, per-model,
 * and daily cost analysis with optimization suggestions.
 */

import { randomUUID } from "node:crypto";

export interface CostEntry {
  id: string;
  timestamp: number;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  metadata?: Record<string, unknown>;
}

export interface CostSummary {
  totalCostUsd: number;
  entryCount: number;
  byAgent: Record<string, number>;
  byModel: Record<string, number>;
}

export class CostTracker {
  private readonly entries: CostEntry[] = [];

  /**
   * Record a cost event.
   */
  record(params: {
    agentId: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    metadata?: Record<string, unknown>;
  }): CostEntry {
    const entry: CostEntry = {
      id: randomUUID(),
      timestamp: Date.now(),
      ...params,
    };
    this.entries.push(entry);
    return entry;
  }

  /**
   * Get total cost across all entries.
   */
  getTotalCost(): number {
    return this.entries.reduce((sum, e) => sum + e.costUsd, 0);
  }

  /**
   * Get cost breakdown by agent ID.
   */
  getCostByAgent(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const entry of this.entries) {
      result[entry.agentId] = (result[entry.agentId] ?? 0) + entry.costUsd;
    }
    return result;
  }

  /**
   * Get cost breakdown by model.
   */
  getCostByModel(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const entry of this.entries) {
      result[entry.model] = (result[entry.model] ?? 0) + entry.costUsd;
    }
    return result;
  }

  /**
   * Get cost for a specific calendar day (YYYY-MM-DD) or today.
   */
  getDailyCost(dateStr?: string): number {
    const target = dateStr ?? new Date().toISOString().slice(0, 10);
    return this.entries
      .filter(
        (e) => new Date(e.timestamp).toISOString().slice(0, 10) === target,
      )
      .reduce((sum, e) => sum + e.costUsd, 0);
  }

  /**
   * Analyze cost patterns and return optimization suggestions.
   * Flags Opus overuse (>40% of total cost from Opus models).
   */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const byModel = this.getCostByModel();
    const total = this.getTotalCost();

    if (total === 0) return suggestions;

    // Flag Opus overuse
    let opusCost = 0;
    for (const [model, cost] of Object.entries(byModel)) {
      if (model.toLowerCase().includes("opus")) {
        opusCost += cost;
      }
    }
    if (opusCost / total > 0.4) {
      suggestions.push(
        `Opus models account for ${((opusCost / total) * 100).toFixed(1)}% of total cost. ` +
          `Consider routing simpler tasks to Sonnet or Haiku to reduce spend.`,
      );
    }

    // Flag single-agent dominance
    const byAgent = this.getCostByAgent();
    for (const [agent, cost] of Object.entries(byAgent)) {
      if (cost / total > 0.5) {
        suggestions.push(
          `Agent "${agent}" accounts for ${((cost / total) * 100).toFixed(1)}% of total cost. ` +
            `Review its prompt size and call frequency.`,
        );
      }
    }

    // Flag high daily spend
    const dailyCost = this.getDailyCost();
    if (dailyCost > 10) {
      suggestions.push(
        `Daily cost is $${dailyCost.toFixed(2)}. Consider caching or batching to reduce API calls.`,
      );
    }

    return suggestions;
  }

  /**
   * Get the most recent N entries.
   */
  getRecentEntries(limit = 50): CostEntry[] {
    return this.entries.slice(-limit);
  }

  /**
   * Remove entries older than the given timestamp.
   */
  clearOlderThan(timestampMs: number): number {
    const before = this.entries.length;
    const cutoffIdx = this.entries.findIndex((e) => e.timestamp >= timestampMs);
    if (cutoffIdx < 0) {
      const count = this.entries.length;
      this.entries.length = 0;
      return count;
    }
    if (cutoffIdx > 0) {
      this.entries.splice(0, cutoffIdx);
    }
    return before - this.entries.length;
  }
}
