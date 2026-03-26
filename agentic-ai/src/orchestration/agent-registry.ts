/**
 * Agent Registry — central catalog for agent definitions, circuit breakers,
 * capability-based lookup, fallback resolution, and health tracking.
 */

import { randomUUID } from "node:crypto";
import {
  AgentDefinition,
  AgentError,
  AgentErrorType,
  AgentMetrics,
  CircuitBreakerConfig,
  CircuitBreakerState,
  CostTier,
  DEFAULT_CIRCUIT_BREAKER,
  DEFAULT_RETRY_POLICY,
  MODEL_CONFIGS,
  type ModelId,
} from "./types.js";

// ---------------------------------------------------------------------------
// Circuit Breaker
// ---------------------------------------------------------------------------

/** Per-agent circuit breaker implementing CLOSED / OPEN / HALF_OPEN semantics. */
export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureAt = 0;
  private halfOpenAttempts = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER, ...config };
  }

  getState(): CircuitBreakerState {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - this.lastFailureAt;
      if (elapsed >= this.config.resetTimeoutMs) {
        this.state = "HALF_OPEN";
        this.halfOpenAttempts = 0;
      }
    }
    return this.state;
  }

  isAllowed(): boolean {
    const current = this.getState();
    if (current === "CLOSED") return true;
    if (current === "HALF_OPEN") {
      return this.halfOpenAttempts < this.config.halfOpenMaxAttempts;
    }
    return false;
  }

  recordSuccess(): void {
    if (this.state === "HALF_OPEN") {
      this.state = "CLOSED";
      this.failureCount = 0;
      this.halfOpenAttempts = 0;
    }
    this.successCount++;
  }

  recordFailure(): void {
    this.failureCount++;
    this.lastFailureAt = Date.now();

    if (this.state === "HALF_OPEN") {
      this.halfOpenAttempts++;
      this.state = "OPEN";
      return;
    }

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = "OPEN";
    }
  }

  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureAt = 0;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  getSuccessCount(): number {
    return this.successCount;
  }
}

// ---------------------------------------------------------------------------
// Agent Registry
// ---------------------------------------------------------------------------

/** Centralized registry for agent definitions with health tracking. */
export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  private breakers = new Map<string, CircuitBreaker>();
  private metrics = new Map<string, AgentMetrics>();
  private latencies = new Map<string, number[]>();

  // -- CRUD -----------------------------------------------------------------

  register(agent: AgentDefinition): void {
    this.agents.set(agent.id, agent);
    if (!this.breakers.has(agent.id)) {
      this.breakers.set(agent.id, new CircuitBreaker());
    }
    if (!this.metrics.has(agent.id)) {
      this.metrics.set(agent.id, this.emptyMetrics(agent.id));
    }
    if (!this.latencies.has(agent.id)) {
      this.latencies.set(agent.id, []);
    }
  }

  deregister(agentId: string): boolean {
    this.breakers.delete(agentId);
    this.metrics.delete(agentId);
    this.latencies.delete(agentId);
    return this.agents.delete(agentId);
  }

  get(agentId: string): AgentDefinition | undefined {
    return this.agents.get(agentId);
  }

  getOrThrow(agentId: string): AgentDefinition {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new AgentError({
        type: AgentErrorType.DEPENDENCY_FAILURE,
        message: `Agent "${agentId}" is not registered`,
        agentId,
        recoverable: false,
      });
    }
    return agent;
  }

  listAll(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  // -- Capability Lookup ----------------------------------------------------

  findAgentsByCapability(capability: string): AgentDefinition[] {
    return this.listAll().filter((a) =>
      a.capabilities.some((c) =>
        c.toLowerCase().includes(capability.toLowerCase()),
      ),
    );
  }

  findBestAgentForTask(
    capability: string,
    preferredTier?: CostTier,
  ): AgentDefinition | undefined {
    const candidates = this.findAgentsByCapability(capability).filter((a) =>
      this.isHealthy(a.id),
    );
    if (candidates.length === 0) return undefined;

    if (preferredTier) {
      const tierMatch = candidates.find((a) => a.costTier === preferredTier);
      if (tierMatch) return tierMatch;
    }

    // Pick by highest capability relevance then lowest cost
    return candidates.sort((a, b) => {
      const aCost = MODEL_CONFIGS[a.modelId].inputCostPer1M;
      const bCost = MODEL_CONFIGS[b.modelId].inputCostPer1M;
      return aCost - bCost;
    })[0];
  }

  findCheapestCapableAgent(capability: string): AgentDefinition | undefined {
    const candidates = this.findAgentsByCapability(capability).filter((a) =>
      this.isHealthy(a.id),
    );
    if (candidates.length === 0) return undefined;
    return candidates.sort((a, b) => {
      const aCost = MODEL_CONFIGS[a.modelId].inputCostPer1M;
      const bCost = MODEL_CONFIGS[b.modelId].inputCostPer1M;
      return aCost - bCost;
    })[0];
  }

  // -- Health ---------------------------------------------------------------

  isHealthy(agentId: string): boolean {
    const breaker = this.breakers.get(agentId);
    return breaker ? breaker.isAllowed() : false;
  }

  getCircuitBreakerState(agentId: string): CircuitBreakerState {
    const breaker = this.breakers.get(agentId);
    return breaker ? breaker.getState() : "OPEN";
  }

  recordSuccess(agentId: string, latencyMs: number, costUsd: number): void {
    const breaker = this.breakers.get(agentId);
    breaker?.recordSuccess();

    const m = this.metrics.get(agentId);
    if (m) {
      m.totalRequests++;
      m.successCount++;
      m.lastRequestAt = Date.now();
      m.averageCostUsd = this.runningAvg(
        m.averageCostUsd,
        costUsd,
        m.totalRequests,
      );

      const lats = this.latencies.get(agentId) ?? [];
      lats.push(latencyMs);
      if (lats.length > 100) lats.shift();
      this.latencies.set(agentId, lats);

      m.averageLatencyMs = lats.reduce((s, v) => s + v, 0) / lats.length;
      m.p95LatencyMs = this.percentile(lats, 0.95);
      m.errorRatePercent =
        m.totalRequests > 0 ? (m.failureCount / m.totalRequests) * 100 : 0;
      m.uptimePercent =
        m.totalRequests > 0 ? (m.successCount / m.totalRequests) * 100 : 100;
      m.circuitBreakerState = this.getCircuitBreakerState(agentId);
    }
  }

  recordFailure(agentId: string, latencyMs: number): void {
    const breaker = this.breakers.get(agentId);
    breaker?.recordFailure();

    const m = this.metrics.get(agentId);
    if (m) {
      m.totalRequests++;
      m.failureCount++;
      m.lastRequestAt = Date.now();

      const lats = this.latencies.get(agentId) ?? [];
      lats.push(latencyMs);
      if (lats.length > 100) lats.shift();
      this.latencies.set(agentId, lats);

      m.averageLatencyMs = lats.reduce((s, v) => s + v, 0) / lats.length;
      m.p95LatencyMs = this.percentile(lats, 0.95);
      m.errorRatePercent =
        m.totalRequests > 0 ? (m.failureCount / m.totalRequests) * 100 : 0;
      m.uptimePercent =
        m.totalRequests > 0 ? (m.successCount / m.totalRequests) * 100 : 100;
      m.circuitBreakerState = this.getCircuitBreakerState(agentId);
    }
  }

  // -- Fallback -------------------------------------------------------------

  resolveFallbackChain(agentId: string, maxDepth = 3): AgentDefinition[] {
    const chain: AgentDefinition[] = [];
    const visited = new Set<string>();
    let currentId: string | undefined = agentId;

    while (currentId && chain.length < maxDepth && !visited.has(currentId)) {
      visited.add(currentId);
      const agent = this.agents.get(currentId);
      if (!agent) break;
      chain.push(agent);
      currentId = agent.fallbackAgentId;
    }

    return chain;
  }

  findHealthyFallback(agentId: string): AgentDefinition | undefined {
    const chain = this.resolveFallbackChain(agentId);
    return chain.find((a) => this.isHealthy(a.id) && a.id !== agentId);
  }

  // -- Metrics --------------------------------------------------------------

  getMetrics(agentId: string): AgentMetrics | undefined {
    return this.metrics.get(agentId);
  }

  getAllMetrics(): AgentMetrics[] {
    return Array.from(this.metrics.values());
  }

  resetCircuitBreaker(agentId: string): void {
    this.breakers.get(agentId)?.reset();
    const m = this.metrics.get(agentId);
    if (m) m.circuitBreakerState = "CLOSED";
  }

  // -- Helpers --------------------------------------------------------------

  private runningAvg(prev: number, next: number, count: number): number {
    if (count <= 1) return next;
    return prev + (next - prev) / count;
  }

  private percentile(values: number[], pct: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.ceil(pct * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
  }

  private emptyMetrics(agentId: string): AgentMetrics {
    return {
      agentId,
      totalRequests: 0,
      successCount: 0,
      failureCount: 0,
      averageLatencyMs: 0,
      averageCostUsd: 0,
      p95LatencyMs: 0,
      lastRequestAt: 0,
      circuitBreakerState: "CLOSED",
      errorRatePercent: 0,
      uptimePercent: 100,
    };
  }
}

// ---------------------------------------------------------------------------
// Default Registry Factory
// ---------------------------------------------------------------------------

function makeAgent(
  overrides: Partial<AgentDefinition> & {
    id: string;
    name: string;
    modelId: ModelId;
  },
): AgentDefinition {
  const model = MODEL_CONFIGS[overrides.modelId];
  return {
    description: "",
    systemPrompt: "",
    capabilities: [],
    tools: [],
    costTier:
      overrides.modelId === "haiku"
        ? "low"
        : overrides.modelId === "sonnet"
          ? "medium"
          : "premium",
    maxTokenBudget: model.contextWindow,
    retryPolicy: { ...DEFAULT_RETRY_POLICY },
    timeoutMs: 120_000,
    tags: [],
    intentParameters: {
      priorities: [],
      tradeoffRules: [],
      escalationThresholds: [],
      qualityGates: [],
    },
    ...overrides,
  };
}

/**
 * Creates a fully-populated registry with the nine default EstateWise agents.
 */
export function createDefaultRegistry(): AgentRegistry {
  const reg = new AgentRegistry();

  reg.register(
    makeAgent({
      id: "supervisor",
      name: "Supervisor",
      modelId: "sonnet",
      description: "Top-level request classifier and execution planner",
      capabilities: [
        "classification",
        "planning",
        "orchestration",
        "synthesis",
      ],
      tools: [],
      costTier: "medium",
      timeoutMs: 60_000,
      tags: ["core"],
      intentParameters: {
        priorities: ["accuracy", "latency", "cost-efficiency"],
        tradeoffRules: [
          {
            name: "speed-vs-depth",
            prefer: "speed",
            over: "exhaustive-analysis",
            rationale: "Users expect sub-3s classification",
          },
        ],
        escalationThresholds: [
          {
            condition: "ambiguous-intent",
            metric: "confidence",
            threshold: 0.4,
            escalateTo: "conversation-mgr",
          },
        ],
        qualityGates: [
          {
            name: "intent-confidence",
            check: "confidence >= 0.5",
            failAction: "retry",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "property-search",
      name: "Property Search",
      modelId: "sonnet",
      description:
        "Searches and filters property listings based on user criteria",
      capabilities: ["property-search", "filtering", "listing-retrieval"],
      tools: ["properties.search", "properties.lookup", "properties.filter"],
      costTier: "medium",
      fallbackAgentId: "property-search-lite",
      tags: ["search", "core"],
      intentParameters: {
        priorities: ["recall", "relevance", "freshness"],
        tradeoffRules: [
          {
            name: "recall-vs-precision",
            prefer: "recall",
            over: "precision",
            rationale: "Better to show more results than miss relevant ones",
          },
        ],
        escalationThresholds: [
          {
            condition: "no-results",
            metric: "resultCount",
            threshold: 0,
            escalateTo: "supervisor",
          },
        ],
        qualityGates: [
          {
            name: "result-relevance",
            check: "top-3 relevance >= 0.6",
            failAction: "warn",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "property-search-lite",
      name: "Property Search Lite",
      modelId: "haiku",
      description:
        "Lightweight property search fallback for cost-sensitive or high-volume queries",
      capabilities: ["property-search", "filtering"],
      tools: ["properties.search", "properties.lookup"],
      costTier: "low",
      tags: ["search", "fallback"],
      intentParameters: {
        priorities: ["cost-efficiency", "speed"],
        tradeoffRules: [],
        escalationThresholds: [],
        qualityGates: [],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "market-analyst",
      name: "Market Analyst",
      modelId: "opus",
      description:
        "Deep market analysis with trend detection, comparisons, and forecasting",
      capabilities: [
        "market-analysis",
        "trend-detection",
        "forecasting",
        "comparison",
      ],
      tools: [
        "analytics.summarizeSearch",
        "analytics.groupByZip",
        "web.search",
        "web.fetch",
      ],
      costTier: "premium",
      fallbackAgentId: "market-analyst-lite",
      timeoutMs: 180_000,
      tags: ["analysis", "premium"],
      intentParameters: {
        priorities: ["analytical-depth", "data-grounding", "accuracy"],
        tradeoffRules: [
          {
            name: "depth-vs-cost",
            prefer: "analytical-depth",
            over: "cost-efficiency",
            rationale:
              "Users requesting market analysis expect thorough answers",
          },
        ],
        escalationThresholds: [
          {
            condition: "stale-data",
            metric: "dataAgeHours",
            threshold: 72,
            escalateTo: "data-enrichment",
          },
        ],
        qualityGates: [
          {
            name: "citation-check",
            check: "all claims have data backing",
            failAction: "retry",
          },
          {
            name: "hallucination-guard",
            check: "no fabricated statistics",
            failAction: "block",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "market-analyst-lite",
      name: "Market Analyst Lite",
      modelId: "sonnet",
      description: "Cost-effective market analysis for common queries",
      capabilities: ["market-analysis", "comparison"],
      tools: ["analytics.summarizeSearch", "analytics.groupByZip"],
      costTier: "medium",
      tags: ["analysis", "fallback"],
      intentParameters: {
        priorities: ["cost-efficiency", "speed", "accuracy"],
        tradeoffRules: [],
        escalationThresholds: [],
        qualityGates: [
          {
            name: "basic-accuracy",
            check: "no fabricated statistics",
            failAction: "warn",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "conversation-mgr",
      name: "Conversation Manager",
      modelId: "haiku",
      description:
        "Handles clarifications, greetings, follow-ups, and multi-turn state",
      capabilities: ["conversation", "clarification", "greeting", "follow-up"],
      tools: [],
      costTier: "low",
      timeoutMs: 30_000,
      tags: ["core", "conversation"],
      intentParameters: {
        priorities: ["responsiveness", "naturalness", "context-preservation"],
        tradeoffRules: [
          {
            name: "speed-vs-depth",
            prefer: "speed",
            over: "depth",
            rationale: "Conversational turns should feel instant",
          },
        ],
        escalationThresholds: [],
        qualityGates: [],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "data-enrichment",
      name: "Data Enrichment",
      modelId: "sonnet",
      description:
        "Enriches property data with external sources, web lookups, and graph relationships",
      capabilities: ["data-enrichment", "web-lookup", "graph-query"],
      tools: [
        "web.search",
        "web.fetch",
        "graph.explain",
        "graph.similar",
        "context.search",
      ],
      costTier: "medium",
      tags: ["enrichment"],
      intentParameters: {
        priorities: ["data-completeness", "freshness", "accuracy"],
        tradeoffRules: [
          {
            name: "freshness-vs-cost",
            prefer: "freshness",
            over: "cost",
            rationale: "Stale enrichment data misleads users",
          },
        ],
        escalationThresholds: [],
        qualityGates: [
          {
            name: "source-verification",
            check: "all enrichment has source attribution",
            failAction: "warn",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "recommendation",
      name: "Recommendation Engine",
      modelId: "sonnet",
      description:
        "Generates personalized property recommendations based on preferences and history",
      capabilities: ["recommendation", "personalization", "ranking"],
      tools: [
        "properties.search",
        "graph.similar",
        "analytics.summarizeSearch",
      ],
      costTier: "medium",
      tags: ["recommendation"],
      intentParameters: {
        priorities: ["personalization", "relevance", "diversity"],
        tradeoffRules: [
          {
            name: "relevance-vs-diversity",
            prefer: "relevance",
            over: "diversity",
            rationale: "Top recommendations should be highly relevant",
          },
        ],
        escalationThresholds: [],
        qualityGates: [
          {
            name: "diversity-check",
            check: "recommendations span >= 2 neighborhoods",
            failAction: "warn",
          },
        ],
      },
    }),
  );

  reg.register(
    makeAgent({
      id: "quality-reviewer",
      name: "Quality Reviewer",
      modelId: "haiku",
      description:
        "Reviews agent outputs for accuracy, hallucinations, and compliance before delivery",
      capabilities: [
        "quality-review",
        "hallucination-detection",
        "compliance-check",
      ],
      tools: [],
      costTier: "low",
      timeoutMs: 30_000,
      tags: ["quality", "review"],
      intentParameters: {
        priorities: ["accuracy", "safety", "compliance"],
        tradeoffRules: [
          {
            name: "thoroughness-vs-latency",
            prefer: "thoroughness",
            over: "latency",
            rationale: "Quality gates must not be rushed",
          },
        ],
        escalationThresholds: [
          {
            condition: "hallucination-detected",
            metric: "hallucinationScore",
            threshold: 0.3,
            escalateTo: "supervisor",
          },
        ],
        qualityGates: [
          {
            name: "factual-accuracy",
            check: "no unsupported claims",
            failAction: "block",
          },
          {
            name: "fair-housing",
            check: "no discriminatory language",
            failAction: "block",
          },
        ],
      },
    }),
  );

  return reg;
}
