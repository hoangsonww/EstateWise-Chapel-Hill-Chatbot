/**
 * Supervisor — classifies user intent, builds DAG execution plans, runs
 * them in dependency-aware topological order, and synthesizes final responses.
 */

import { randomUUID } from "node:crypto";
import { AgentRegistry } from "./agent-registry.js";
import {
  AgentError,
  AgentErrorType,
  ExecutionPlan,
  ExecutionStep,
  MODEL_CONFIGS,
  TaskResult,
  type ModelId,
} from "./types.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The result of intent classification. */
export interface ClassifiedIntent {
  intent: string;
  confidence: number;
  entities: {
    locations: string[];
    prices: Array<{ min?: number; max?: number }>;
    propertyTypes: string[];
    features: string[];
  };
  suggestedAgents: string[];
  requiresMultiStep: boolean;
}

/** Configuration for the supervisor. */
export interface SupervisorConfig {
  registry: AgentRegistry;
  maxBudgetUsd: number;
  maxPlanSteps: number;
  timeoutMs: number;
}

/** Result returned by the supervisor after handling a full request. */
export interface SupervisorResult {
  intent: ClassifiedIntent;
  plan: ExecutionPlan;
  agentResults: Map<string, TaskResult>;
  synthesizedResponse: string;
  totalCostUsd: number;
  totalDurationMs: number;
}

// ---------------------------------------------------------------------------
// Intent patterns
// ---------------------------------------------------------------------------

interface IntentPattern {
  intent: string;
  keywords: string[];
  agents: string[];
  multiStep: boolean;
}

const INTENT_PATTERNS: IntentPattern[] = [
  {
    intent: "property-search",
    keywords: ["find", "search", "look for", "show me", "listing", "available", "homes for sale", "houses"],
    agents: ["property-search"],
    multiStep: false,
  },
  {
    intent: "market-analysis",
    keywords: ["market", "trend", "forecast", "analysis", "appreciation", "depreciation", "median", "average price"],
    agents: ["market-analyst", "data-enrichment"],
    multiStep: true,
  },
  {
    intent: "property-comparison",
    keywords: ["compare", "versus", "vs", "difference", "better", "which one", "side by side"],
    agents: ["property-search", "market-analyst"],
    multiStep: true,
  },
  {
    intent: "recommendation",
    keywords: ["recommend", "suggest", "best", "top", "ideal", "perfect", "should i", "what would you"],
    agents: ["recommendation", "property-search"],
    multiStep: true,
  },
  {
    intent: "financial-analysis",
    keywords: ["mortgage", "affordability", "afford", "monthly payment", "interest rate", "down payment", "loan", "finance"],
    agents: ["market-analyst", "data-enrichment"],
    multiStep: true,
  },
  {
    intent: "neighborhood-info",
    keywords: ["neighborhood", "area", "school", "commute", "crime", "walkability", "nearby", "amenities"],
    agents: ["data-enrichment", "property-search"],
    multiStep: true,
  },
  {
    intent: "property-detail",
    keywords: ["detail", "about this", "tell me more", "specifics", "features of", "zpid", "property id"],
    agents: ["property-search", "data-enrichment"],
    multiStep: false,
  },
  {
    intent: "greeting",
    keywords: ["hello", "hi", "hey", "good morning", "good afternoon", "help", "what can you"],
    agents: ["conversation-mgr"],
    multiStep: false,
  },
  {
    intent: "clarification",
    keywords: ["what do you mean", "clarify", "can you explain", "i don't understand", "huh", "not sure"],
    agents: ["conversation-mgr"],
    multiStep: false,
  },
  {
    intent: "follow-up",
    keywords: ["also", "and", "what about", "how about", "another", "more", "else", "additionally"],
    agents: ["conversation-mgr", "property-search"],
    multiStep: false,
  },
];

// ---------------------------------------------------------------------------
// Entity extraction helpers
// ---------------------------------------------------------------------------

function extractLocations(text: string): string[] {
  const locations: string[] = [];
  // Match "in <Location>" or "near <Location>" patterns
  const locPatterns = [
    /(?:in|near|around|close to)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*(?:,\s*[A-Z]{2})?)/g,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*),\s*([A-Z]{2})\b/g,
  ];
  for (const pattern of locPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const loc = match[1]?.trim();
      if (loc && loc.length > 1 && !["I", "The", "A", "An", "My", "And", "Or", "But"].includes(loc)) {
        locations.push(match[2] ? `${loc}, ${match[2]}` : loc);
      }
    }
  }
  // Deduplicate
  return [...new Set(locations)];
}

function extractPrices(text: string): Array<{ min?: number; max?: number }> {
  const prices: Array<{ min?: number; max?: number }> = [];
  // Range: "$X - $Y" or "$X to $Y"
  const rangePattern = /\$\s?([\d,]+(?:\.\d+)?)\s*(?:[-–]|to)\s*\$\s?([\d,]+(?:\.\d+)?)/gi;
  let match;
  while ((match = rangePattern.exec(text)) !== null) {
    const min = parseFloat(match[1].replace(/,/g, ""));
    const max = parseFloat(match[2].replace(/,/g, ""));
    if (Number.isFinite(min) && Number.isFinite(max)) {
      prices.push({ min, max });
    }
  }
  // Single: "under $X" / "below $X"
  const underPattern = /(?:under|below|less than|max|up to)\s*\$\s?([\d,]+(?:\.\d+)?)/gi;
  while ((match = underPattern.exec(text)) !== null) {
    const max = parseFloat(match[1].replace(/,/g, ""));
    if (Number.isFinite(max)) prices.push({ max });
  }
  // Single: "over $X" / "above $X"
  const overPattern = /(?:over|above|more than|at least|min|minimum)\s*\$\s?([\d,]+(?:\.\d+)?)/gi;
  while ((match = overPattern.exec(text)) !== null) {
    const min = parseFloat(match[1].replace(/,/g, ""));
    if (Number.isFinite(min)) prices.push({ min });
  }
  return prices;
}

function extractPropertyTypes(text: string): string[] {
  const types: string[] = [];
  const lower = text.toLowerCase();
  const typeMap: Record<string, string> = {
    house: "house",
    home: "house",
    condo: "condo",
    condominium: "condo",
    townhouse: "townhouse",
    townhome: "townhouse",
    apartment: "apartment",
    "multi-family": "multi-family",
    multifamily: "multi-family",
    duplex: "multi-family",
    land: "land",
    lot: "land",
    "mobile home": "mobile-home",
    manufactured: "mobile-home",
    commercial: "commercial",
  };
  for (const [keyword, type] of Object.entries(typeMap)) {
    if (lower.includes(keyword) && !types.includes(type)) {
      types.push(type);
    }
  }
  return types;
}

function extractFeatures(text: string): string[] {
  const features: string[] = [];
  const lower = text.toLowerCase();
  const featureKeywords = [
    "pool", "garage", "garden", "basement", "attic", "fireplace",
    "balcony", "patio", "deck", "waterfront", "view", "renovated",
    "new construction", "open floor plan", "hardwood", "granite",
    "stainless", "smart home", "solar", "ev charger", "fence",
    "walk-in closet", "en suite", "master suite",
  ];
  // Bed/bath patterns
  const bedMatch = lower.match(/(\d+)\s*(?:bed|br|bedroom)/);
  if (bedMatch) features.push(`${bedMatch[1]}-bed`);
  const bathMatch = lower.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba|bathroom)/);
  if (bathMatch) features.push(`${bathMatch[1]}-bath`);
  // Sq ft
  const sqftMatch = lower.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/);
  if (sqftMatch) features.push(`${sqftMatch[1]}-sqft`);

  for (const kw of featureKeywords) {
    if (lower.includes(kw)) features.push(kw);
  }
  return features;
}

// ---------------------------------------------------------------------------
// Supervisor
// ---------------------------------------------------------------------------

/** The supervisor orchestrates the full lifecycle of a user request. */
export class Supervisor {
  private readonly config: SupervisorConfig;

  constructor(config: SupervisorConfig) {
    this.config = config;
  }

  /**
   * Handle an end-to-end request: classify, plan, execute, synthesize.
   *
   * The `executeAgent` callback is invoked for each step — the supervisor
   * does not embed LLM client logic itself, keeping it testable.
   */
  async handleRequest(
    userMessage: string,
    executeAgent: (agentId: string, task: string) => Promise<TaskResult>,
  ): Promise<SupervisorResult> {
    const startTime = Date.now();

    // 1. Classify intent
    const intent = this.classifyIntent(userMessage);

    // 2. Build execution plan
    let plan = this.buildExecutionPlan(intent, userMessage);

    // 3. Budget check
    if (plan.totalEstimatedCostUsd > this.config.maxBudgetUsd) {
      plan = this.optimizePlanForBudget(plan);
    }

    // 4. Execute plan
    const agentResults = await this.executePlan(plan, executeAgent);

    // 5. Synthesize response
    const synthesized = this.synthesizeResponse(intent, agentResults);

    const totalCostUsd = Array.from(agentResults.values()).reduce(
      (sum, r) => sum + r.metadata.costUsd,
      0,
    );

    return {
      intent,
      plan,
      agentResults,
      synthesizedResponse: synthesized,
      totalCostUsd,
      totalDurationMs: Date.now() - startTime,
    };
  }

  // -----------------------------------------------------------------------
  // Classification
  // -----------------------------------------------------------------------

  classifyIntent(text: string): ClassifiedIntent {
    const lower = text.toLowerCase();

    let bestIntent: IntentPattern | undefined;
    let bestScore = 0;

    for (const pattern of INTENT_PATTERNS) {
      let score = 0;
      for (const kw of pattern.keywords) {
        if (lower.includes(kw)) {
          score += kw.length; // Longer keyword matches get higher score
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIntent = pattern;
      }
    }

    if (!bestIntent) {
      bestIntent = INTENT_PATTERNS.find((p) => p.intent === "greeting")!;
      bestScore = 1;
    }

    // Confidence: ratio of matched keyword chars to total text length, capped at 0.99
    const maxPossibleScore = bestIntent.keywords.reduce((s, kw) => s + kw.length, 0);
    const confidence = Math.min(0.99, maxPossibleScore > 0 ? bestScore / maxPossibleScore : 0.5);

    return {
      intent: bestIntent.intent,
      confidence,
      entities: {
        locations: extractLocations(text),
        prices: extractPrices(text),
        propertyTypes: extractPropertyTypes(text),
        features: extractFeatures(text),
      },
      suggestedAgents: bestIntent.agents,
      requiresMultiStep: bestIntent.multiStep,
    };
  }

  // -----------------------------------------------------------------------
  // Planning
  // -----------------------------------------------------------------------

  buildExecutionPlan(intent: ClassifiedIntent, userMessage: string): ExecutionPlan {
    const planId = randomUUID();
    const steps: ExecutionStep[] = [];
    const agentIds = intent.suggestedAgents.slice(0, this.config.maxPlanSteps);

    // Build steps with dependency edges: sequential order for multi-step
    let prevStepId: string | undefined;
    for (let i = 0; i < agentIds.length; i++) {
      const agentId = agentIds[i];
      const agent = this.config.registry.get(agentId);
      if (!agent) continue;

      const stepId = randomUUID();
      const estimatedCost = this.estimateAgentCost(agent.modelId);

      steps.push({
        stepId,
        agentId,
        taskDescription: this.buildTaskDescription(agentId, intent, userMessage),
        dependencies: prevStepId && intent.requiresMultiStep ? [prevStepId] : [],
        estimatedCostUsd: estimatedCost,
        estimatedDurationMs: agent.timeoutMs / 2,
        priority: agentIds.length - i, // First agent = highest priority
        optional: i > 0, // Only the primary agent is required
        status: "pending",
      });

      prevStepId = stepId;
    }

    // Always add quality reviewer at the end for multi-step plans
    if (intent.requiresMultiStep && steps.length > 0) {
      const reviewer = this.config.registry.get("quality-reviewer");
      if (reviewer) {
        const reviewStepId = randomUUID();
        steps.push({
          stepId: reviewStepId,
          agentId: "quality-reviewer",
          taskDescription: `Review the outputs of [${agentIds.join(", ")}] for accuracy, hallucinations, and compliance`,
          dependencies: [steps[steps.length - 1].stepId],
          estimatedCostUsd: this.estimateAgentCost("haiku"),
          estimatedDurationMs: 15_000,
          priority: 0,
          optional: true,
          status: "pending",
        });
      }
    }

    const totalEstimatedCostUsd = steps.reduce((s, step) => s + step.estimatedCostUsd, 0);
    const totalEstimatedDurationMs = steps.reduce((s, step) => s + step.estimatedDurationMs, 0);

    return {
      planId,
      intent: intent.intent,
      mode: intent.requiresMultiStep ? "agentic" : "single_turn",
      steps,
      totalEstimatedCostUsd,
      totalEstimatedDurationMs,
      createdAt: Date.now(),
      budgetLimitUsd: this.config.maxBudgetUsd,
    };
  }

  // -----------------------------------------------------------------------
  // Execution (topological sort with parallel by dependency level)
  // -----------------------------------------------------------------------

  async executePlan(
    plan: ExecutionPlan,
    executeAgent: (agentId: string, task: string) => Promise<TaskResult>,
  ): Promise<Map<string, TaskResult>> {
    const results = new Map<string, TaskResult>();
    const levels = this.topologicalLevels(plan.steps);

    for (const level of levels) {
      const promises = level.map(async (step) => {
        // Check that all dependencies succeeded
        const depsOk = step.dependencies.every((depId) => {
          const depStep = plan.steps.find((s) => s.stepId === depId);
          return depStep?.status === "completed";
        });

        if (!depsOk && step.dependencies.length > 0) {
          step.status = "cancelled";
          const failResult: TaskResult = {
            success: false,
            error: new AgentError({
              type: AgentErrorType.DEPENDENCY_FAILURE,
              message: `Dependencies not met for step ${step.stepId}`,
              agentId: step.agentId,
            }),
            metadata: {
              taskId: step.stepId,
              agentId: step.agentId,
              status: "cancelled",
              createdAt: Date.now(),
              attempt: 0,
              inputTokens: 0,
              outputTokens: 0,
              costUsd: 0,
              durationMs: 0,
            },
            toolCalls: [],
          };
          results.set(step.stepId, failResult);
          return;
        }

        step.status = "running";
        try {
          const result = await executeAgent(step.agentId, step.taskDescription);
          step.status = result.success ? "completed" : "failed";
          step.result = result;
          results.set(step.stepId, result);
        } catch (err) {
          step.status = "failed";
          const failResult: TaskResult = {
            success: false,
            error: new AgentError({
              type: AgentErrorType.EXTERNAL_API_FAILURE,
              message: err instanceof Error ? err.message : String(err),
              agentId: step.agentId,
              cause: err instanceof Error ? err : undefined,
            }),
            metadata: {
              taskId: step.stepId,
              agentId: step.agentId,
              status: "failed",
              createdAt: Date.now(),
              attempt: 1,
              inputTokens: 0,
              outputTokens: 0,
              costUsd: 0,
              durationMs: 0,
            },
            toolCalls: [],
          };
          results.set(step.stepId, failResult);
        }
      });

      await Promise.allSettled(promises);
    }

    return results;
  }

  // -----------------------------------------------------------------------
  // Budget optimization
  // -----------------------------------------------------------------------

  optimizePlanForBudget(plan: ExecutionPlan): ExecutionPlan {
    const optimizedSteps = plan.steps.map((step) => {
      const agent = this.config.registry.get(step.agentId);
      if (!agent) return step;

      // Try to find a cheaper fallback
      const fallback = this.config.registry.findHealthyFallback(step.agentId);
      if (fallback && fallback.id !== step.agentId) {
        return {
          ...step,
          agentId: fallback.id,
          estimatedCostUsd: this.estimateAgentCost(fallback.modelId),
        };
      }
      return step;
    });

    const totalEstimatedCostUsd = optimizedSteps.reduce(
      (s, step) => s + step.estimatedCostUsd,
      0,
    );

    return {
      ...plan,
      steps: optimizedSteps,
      totalEstimatedCostUsd,
    };
  }

  // -----------------------------------------------------------------------
  // Synthesis
  // -----------------------------------------------------------------------

  synthesizeResponse(
    intent: ClassifiedIntent,
    results: Map<string, TaskResult>,
  ): string {
    const parts: string[] = [];
    const successes: string[] = [];
    const failures: string[] = [];

    for (const [stepId, result] of results) {
      if (result.success && result.data) {
        successes.push(
          typeof result.data === "string" ? result.data : JSON.stringify(result.data),
        );
      } else if (result.error) {
        failures.push(`[${result.metadata.agentId}]: ${result.error.message}`);
      }
    }

    if (successes.length > 0) {
      parts.push(successes.join("\n\n"));
    }

    if (failures.length > 0 && successes.length === 0) {
      parts.push(
        "I encountered some issues while processing your request:\n" +
          failures.map((f) => `- ${f}`).join("\n"),
      );
    }

    if (parts.length === 0) {
      parts.push(
        "I understood your request but wasn't able to produce a result. Could you try rephrasing?",
      );
    }

    return parts.join("\n\n");
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  estimatePlanCost(plan: ExecutionPlan): number {
    return plan.steps.reduce((s, step) => s + step.estimatedCostUsd, 0);
  }

  private estimateAgentCost(modelId: ModelId): number {
    const cfg = MODEL_CONFIGS[modelId];
    // Assume average 2000 input + 1000 output tokens per call
    return ((2000 * cfg.inputCostPer1M + 1000 * cfg.outputCostPer1M) / 1_000_000);
  }

  private buildTaskDescription(
    agentId: string,
    intent: ClassifiedIntent,
    userMessage: string,
  ): string {
    const entitySummary: string[] = [];
    if (intent.entities.locations.length > 0) {
      entitySummary.push(`Locations: ${intent.entities.locations.join(", ")}`);
    }
    if (intent.entities.prices.length > 0) {
      const priceStrs = intent.entities.prices.map((p) => {
        if (p.min && p.max) return `$${p.min.toLocaleString()} - $${p.max.toLocaleString()}`;
        if (p.max) return `up to $${p.max.toLocaleString()}`;
        if (p.min) return `from $${p.min.toLocaleString()}`;
        return "";
      }).filter(Boolean);
      entitySummary.push(`Prices: ${priceStrs.join(", ")}`);
    }
    if (intent.entities.propertyTypes.length > 0) {
      entitySummary.push(`Property types: ${intent.entities.propertyTypes.join(", ")}`);
    }
    if (intent.entities.features.length > 0) {
      entitySummary.push(`Features: ${intent.entities.features.join(", ")}`);
    }
    const entityBlock = entitySummary.length > 0
      ? `\nExtracted entities:\n${entitySummary.join("\n")}`
      : "";

    switch (agentId) {
      case "property-search":
      case "property-search-lite":
        return `Search for properties matching the user's criteria.\nUser query: "${userMessage}"${entityBlock}`;
      case "market-analyst":
      case "market-analyst-lite":
        return `Analyze market conditions relevant to the user's query.\nUser query: "${userMessage}"${entityBlock}`;
      case "data-enrichment":
        return `Enrich the available data with external sources and graph relationships.\nUser query: "${userMessage}"${entityBlock}`;
      case "recommendation":
        return `Generate personalized property recommendations.\nUser query: "${userMessage}"${entityBlock}`;
      case "conversation-mgr":
        return `Respond to the user's conversational message.\nUser query: "${userMessage}"`;
      case "quality-reviewer":
        return `Review preceding agent outputs for accuracy and compliance.\nOriginal query: "${userMessage}"`;
      default:
        return `Process the user's request.\nUser query: "${userMessage}"${entityBlock}`;
    }
  }

  private topologicalLevels(steps: ExecutionStep[]): ExecutionStep[][] {
    const levels: ExecutionStep[][] = [];
    const resolved = new Set<string>();
    let remaining = [...steps];

    while (remaining.length > 0) {
      const currentLevel: ExecutionStep[] = [];
      const nextRemaining: ExecutionStep[] = [];

      for (const step of remaining) {
        const depsResolved = step.dependencies.every((d) => resolved.has(d));
        if (depsResolved) {
          currentLevel.push(step);
        } else {
          nextRemaining.push(step);
        }
      }

      // Safety: if nothing could be resolved, we have a cycle — break out
      if (currentLevel.length === 0) {
        // Add remaining as a final level to avoid infinite loop
        levels.push(nextRemaining);
        break;
      }

      levels.push(currentLevel);
      for (const step of currentLevel) {
        resolved.add(step.stepId);
      }
      remaining = nextRemaining;
    }

    return levels;
  }
}
