/**
 * Chain-of-thought steering templates and complexity assessment.
 * Controls extended thinking budget based on task complexity.
 */

/**
 * Task complexity levels that determine thinking budget allocation.
 */
export type TaskComplexity = "low" | "medium" | "high" | "critical";

/**
 * Configuration for Claude's extended thinking feature based on complexity.
 */
export interface ThinkingConfig {
  complexity: TaskComplexity;
  budgetTokens: number;
  steeringPrompt: string;
  shouldUseThinking: boolean;
}

/**
 * Complexity scoring criteria and their weights.
 */
interface ComplexitySignal {
  name: string;
  weight: number;
  test: (query: string) => boolean;
}

const COMPLEXITY_SIGNALS: ComplexitySignal[] = [
  {
    name: "multi_location",
    weight: 2,
    test: (q) => {
      const locationPatterns = /\b(?:and|vs\.?|versus|compared? to|or)\b/i;
      const locationTerms = q.match(/\b(?:in|near|around)\s+[A-Z]/g);
      return locationPatterns.test(q) && (locationTerms?.length ?? 0) >= 2;
    },
  },
  {
    name: "financial_analysis",
    weight: 3,
    test: (q) =>
      /\b(?:mortgage|roi|return|investment|afford|cash flow|cap rate|appreciation|amortization)\b/i.test(
        q,
      ),
  },
  {
    name: "comparison_request",
    weight: 2,
    test: (q) =>
      /\b(?:compare|better|worse|pros and cons|trade-?offs?|versus|vs\.?)\b/i.test(
        q,
      ),
  },
  {
    name: "multi_criteria",
    weight: 1,
    test: (q) => {
      const criteria = [
        /\b\d+\s*bed/i,
        /\b\d+\s*bath/i,
        /\$[\d,]+/,
        /\b(?:pool|garage|yard|basement|fireplace)\b/i,
        /\b(?:school|commute|walkab|transit)\b/i,
        /\b(?:sqft|square feet|sq ft)\b/i,
      ];
      return criteria.filter((c) => c.test(q)).length >= 3;
    },
  },
  {
    name: "temporal_analysis",
    weight: 2,
    test: (q) =>
      /\b(?:trend|over time|past \d+|historical|forecast|predict|year-over-year|yoy)\b/i.test(
        q,
      ),
  },
  {
    name: "subjective_features",
    weight: 1,
    test: (q) =>
      /\b(?:quiet|charming|modern|cozy|spacious|luxury|starter|family-friendly|up-and-coming)\b/i.test(
        q,
      ),
  },
  {
    name: "long_query",
    weight: 1,
    test: (q) => q.split(/\s+/).length > 40,
  },
  {
    name: "multi_step",
    weight: 3,
    test: (q) =>
      /\b(?:then|after that|also|additionally|and then|first .* then)\b/i.test(
        q,
      ),
  },
];

/**
 * Assess the complexity of a user query to determine thinking budget.
 *
 * @param query - The user's natural-language query.
 * @returns The assessed complexity level.
 */
export function assessComplexity(query: string): TaskComplexity {
  let score = 0;
  for (const signal of COMPLEXITY_SIGNALS) {
    if (signal.test(query)) {
      score += signal.weight;
    }
  }

  if (score >= 8) return "critical";
  if (score >= 5) return "high";
  if (score >= 2) return "medium";
  return "low";
}

/**
 * Get the full thinking configuration for a given complexity level.
 *
 * @param complexity - The complexity level (or a query string to auto-assess).
 * @returns ThinkingConfig with budget and steering prompt.
 */
export function getThinkingConfig(
  complexity: TaskComplexity | string,
): ThinkingConfig {
  const resolved: TaskComplexity =
    complexity === "low" ||
    complexity === "medium" ||
    complexity === "high" ||
    complexity === "critical"
      ? complexity
      : assessComplexity(complexity);

  const configs: Record<TaskComplexity, Omit<ThinkingConfig, "complexity">> = {
    low: {
      budgetTokens: 1024,
      shouldUseThinking: false,
      steeringPrompt:
        "Respond directly and concisely. No extended reasoning needed.",
    },
    medium: {
      budgetTokens: 4096,
      shouldUseThinking: true,
      steeringPrompt: `Before responding, briefly consider:
1. What data sources are needed?
2. Are there any ambiguities in the request?
3. What is the most helpful response structure?`,
    },
    high: {
      budgetTokens: 10240,
      shouldUseThinking: true,
      steeringPrompt: `Think step by step before responding:
1. Break down the request into sub-tasks.
2. Identify which agents and tools are needed for each sub-task.
3. Consider dependencies between sub-tasks.
4. Plan the optimal execution order.
5. Anticipate what follow-up questions the user might have.
6. Consider edge cases and data gaps.`,
    },
    critical: {
      budgetTokens: 32768,
      shouldUseThinking: true,
      steeringPrompt: `This is a complex, multi-faceted request. Conduct thorough analysis:
1. Decompose into all constituent sub-problems.
2. For each sub-problem, identify the optimal agent, required tools, and expected output.
3. Map all dependencies and identify parallelizable work.
4. Consider multiple approaches and select the best strategy.
5. Plan for data gaps — what will you do if a source is unavailable?
6. Think about how to present the combined results coherently.
7. Identify potential contradictions between data sources.
8. Consider the user's likely follow-up needs and preemptively address them.`,
    },
  };

  const config = configs[resolved];
  return { complexity: resolved, ...config };
}

/**
 * Chain-of-thought steering template that can be prepended to any agent's
 * task instruction to guide its reasoning process.
 */
export const COT_STEERING_TEMPLATE = `<thinking_instructions>
You have been given a task that benefits from structured reasoning. Before
producing your final output, work through the following steps internally:

1. UNDERSTAND: Restate the core question or task in your own words.
2. PLAN: List the steps you need to take and the data you need to gather.
3. EXECUTE: Work through each step, noting intermediate findings.
4. VERIFY: Check your work against the grounding rules. Are all claims supported?
5. SYNTHESIZE: Combine findings into a coherent response.
6. REVIEW: Read your response as if you were the user. Is it complete, accurate,
   and actionable?

If at any point you realize you lack data to answer confidently, say so explicitly
rather than filling the gap with assumptions.
</thinking_instructions>` as const;
