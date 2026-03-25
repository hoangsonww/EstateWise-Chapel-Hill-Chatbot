/**
 * Cost Budget Manager — tracks spend, enforces limits, and suggests
 * optimizations to keep agent runs within budget.
 */

import { BudgetAlertLevel, CostBudget, MODEL_CONFIGS, type ModelId } from "./types.js";

/** Manages cost budgets across daily and session windows. */
export class CostBudgetManager {
  private budget: CostBudget;

  constructor(overrides?: Partial<CostBudget>) {
    this.budget = {
      dailyLimitUsd: 10,
      sessionLimitUsd: 2,
      perRequestLimitUsd: 0.5,
      warningThresholdPercent: 70,
      criticalThresholdPercent: 90,
      currentDailySpendUsd: 0,
      currentSessionSpendUsd: 0,
      lastResetAt: Date.now(),
      ...overrides,
    };
  }

  /** Record a cost event and update running totals. */
  recordCost(amountUsd: number): void {
    this.budget.currentDailySpendUsd += amountUsd;
    this.budget.currentSessionSpendUsd += amountUsd;
  }

  /** Check whether a projected cost fits within both session and daily budgets. */
  canAfford(estimatedCostUsd: number): boolean {
    return (
      this.budget.currentSessionSpendUsd + estimatedCostUsd <=
        this.budget.sessionLimitUsd &&
      this.budget.currentDailySpendUsd + estimatedCostUsd <=
        this.budget.dailyLimitUsd &&
      estimatedCostUsd <= this.budget.perRequestLimitUsd
    );
  }

  /** Estimate cost for a given model and token volumes. */
  estimateCost(
    modelId: ModelId,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const cfg = MODEL_CONFIGS[modelId];
    return (
      (inputTokens * cfg.inputCostPer1M + outputTokens * cfg.outputCostPer1M) /
      1_000_000
    );
  }

  /**
   * Suggest a cheaper model if the requested one would exceed budget.
   * Returns the original model if it fits, or the cheapest alternative.
   */
  suggestDowngrade(
    requestedModelId: ModelId,
    inputTokens: number,
    outputTokens: number,
  ): ModelId {
    const cost = this.estimateCost(requestedModelId, inputTokens, outputTokens);
    if (this.canAfford(cost)) return requestedModelId;

    const tiers: ModelId[] = ["haiku", "sonnet", "opus"];
    for (const tier of tiers) {
      const altCost = this.estimateCost(tier, inputTokens, outputTokens);
      if (this.canAfford(altCost)) return tier;
    }
    // Even haiku doesn't fit — return it anyway as the cheapest option
    return "haiku";
  }

  /** Determine the current alert level based on daily spend. */
  getAlertLevel(): BudgetAlertLevel {
    const pct =
      (this.budget.currentDailySpendUsd / this.budget.dailyLimitUsd) * 100;
    if (pct >= 100) return "exceeded";
    if (pct >= this.budget.criticalThresholdPercent) return "critical";
    if (pct >= this.budget.warningThresholdPercent) return "warning";
    return "none";
  }

  /** Return a snapshot of the current budget state. */
  getBudgetStatus(): CostBudget & { alertLevel: BudgetAlertLevel; dailyRemainingUsd: number; sessionRemainingUsd: number } {
    return {
      ...this.budget,
      alertLevel: this.getAlertLevel(),
      dailyRemainingUsd: Math.max(
        0,
        this.budget.dailyLimitUsd - this.budget.currentDailySpendUsd,
      ),
      sessionRemainingUsd: Math.max(
        0,
        this.budget.sessionLimitUsd - this.budget.currentSessionSpendUsd,
      ),
    };
  }

  /** Generate actionable optimization suggestions based on current spend. */
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const alert = this.getAlertLevel();

    if (alert === "exceeded" || alert === "critical") {
      suggestions.push("Switch all agents to haiku to minimize remaining spend");
      suggestions.push("Reduce max iterations per agent loop to 5");
      suggestions.push("Disable optional quality-review steps");
    } else if (alert === "warning") {
      suggestions.push(
        "Consider downgrading premium agents (opus) to sonnet for non-critical tasks",
      );
      suggestions.push("Enable aggressive context compaction to reduce input tokens");
    }

    if (this.budget.currentSessionSpendUsd > this.budget.sessionLimitUsd * 0.5) {
      suggestions.push("Session is over 50% spent — batch remaining queries if possible");
    }

    return suggestions;
  }

  /** Reset daily counters (typically called at midnight or on demand). */
  resetDaily(): void {
    this.budget.currentDailySpendUsd = 0;
    this.budget.currentSessionSpendUsd = 0;
    this.budget.lastResetAt = Date.now();
  }
}
