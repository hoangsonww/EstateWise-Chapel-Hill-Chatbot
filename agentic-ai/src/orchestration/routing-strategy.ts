/**
 * Routing Strategy — evaluates whether a user request should be handled as
 * a single-turn response or routed through the full agentic loop.
 */

import { ExecutionMode } from "./types.js";

/** Input signals used to make the routing decision. */
export interface RoutingSignals {
  /** Number of distinct tools the intent would likely require. */
  toolCount: number;
  /** Confidence score from intent classification (0–1). */
  intentConfidence: number;
  /** How many turns deep the current conversation is. */
  conversationDepth: number;
  /** Number of upstream data dependencies (e.g., enrichment, web lookups). */
  dataDependencies: number;
  /** Level of ambiguity in the user query (0 = crystal clear, 1 = very ambiguous). */
  ambiguityLevel: number;
}

/** Weights applied to each routing signal. */
interface RoutingWeights {
  toolCount: number;
  intentConfidence: number;
  conversationDepth: number;
  dataDependencies: number;
  ambiguityLevel: number;
}

const DEFAULT_WEIGHTS: RoutingWeights = {
  toolCount: 0.30,
  intentConfidence: -0.20,
  conversationDepth: 0.10,
  dataDependencies: 0.25,
  ambiguityLevel: 0.15,
};

/** Threshold above which the agentic path is selected. */
const AGENTIC_THRESHOLD = 0.45;

/** Evaluation result with the decision and supporting details. */
export interface RoutingDecision {
  mode: ExecutionMode;
  score: number;
  threshold: number;
  breakdown: Record<string, number>;
}

/** Evaluates routing signals and decides single-turn vs. agentic. */
export class RoutingStrategy {
  private weights: RoutingWeights;
  private threshold: number;

  constructor(
    weights?: Partial<RoutingWeights>,
    threshold?: number,
  ) {
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.threshold = threshold ?? AGENTIC_THRESHOLD;
  }

  /** Evaluate the routing signals and return a decision. */
  evaluate(signals: RoutingSignals): RoutingDecision {
    // Normalize each signal to 0–1 range
    const normalized = {
      toolCount: Math.min(signals.toolCount / 5, 1),
      intentConfidence: signals.intentConfidence,
      conversationDepth: Math.min(signals.conversationDepth / 10, 1),
      dataDependencies: Math.min(signals.dataDependencies / 4, 1),
      ambiguityLevel: signals.ambiguityLevel,
    };

    // Compute weighted score
    const breakdown: Record<string, number> = {};
    let score = 0;

    for (const key of Object.keys(this.weights) as Array<keyof RoutingWeights>) {
      const contribution = normalized[key] * this.weights[key];
      breakdown[key] = contribution;
      score += contribution;
    }

    // Clamp to [0, 1]
    score = Math.max(0, Math.min(1, score));

    return {
      mode: score >= this.threshold ? "agentic" : "single_turn",
      score,
      threshold: this.threshold,
      breakdown,
    };
  }
}
