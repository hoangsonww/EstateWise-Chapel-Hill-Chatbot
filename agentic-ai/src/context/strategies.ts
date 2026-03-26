/**
 * Context strategies for different agent roles and conversation patterns.
 * Each strategy defines how to allocate and compose the context window.
 */

export interface ContextWindow {
  systemPrompt: string;
  staticContext: string;
  ragContext: string;
  conversationHistory: string;
  toolBuffer: string;
}

export interface StrategyInput {
  systemPrompt: string;
  staticContext: string;
  ragResults: string;
  messages: Array<{ role: string; content: string; turn: number }>;
  summary: string | null;
  tokenBudget: number;
}

export interface ContextStrategy {
  name: string;
  description: string;
  compose(input: StrategyInput): ContextWindow;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function trimText(text: string, maxTokens: number): string {
  const estimated = estimateTokens(text);
  if (estimated <= maxTokens) return text;
  const maxChars = maxTokens * 4;
  return text.slice(0, maxChars - 20) + "\n... [trimmed]";
}

// ── Strategy Implementations ────────────────────────────────────

/**
 * Sliding window: keep the most recent N messages that fit the budget.
 */
export const slidingWindowStrategy: ContextStrategy = {
  name: "sliding-window",
  description: "Keep the most recent messages that fit the token budget",
  compose(input: StrategyInput): ContextWindow {
    const systemBudget = Math.floor(input.tokenBudget * 0.15);
    const staticBudget = Math.floor(input.tokenBudget * 0.05);
    const ragBudget = Math.floor(input.tokenBudget * 0.2);
    const convBudget = Math.floor(input.tokenBudget * 0.5);
    const toolBudget = Math.floor(input.tokenBudget * 0.1);

    const msgs = input.messages.slice();
    const convLines: string[] = [];
    let used = 0;
    for (let i = msgs.length - 1; i >= 0; i--) {
      const line = `[${msgs[i].role}] ${msgs[i].content}`;
      const cost = estimateTokens(line);
      if (used + cost > convBudget) break;
      convLines.unshift(line);
      used += cost;
    }

    return {
      systemPrompt: trimText(input.systemPrompt, systemBudget),
      staticContext: trimText(input.staticContext, staticBudget),
      ragContext: trimText(input.ragResults, ragBudget),
      conversationHistory: convLines.join("\n"),
      toolBuffer: "",
    };
  },
};

/**
 * Summarize + recent: use summary for older context, full text for recent messages.
 */
export const summarizeRecentStrategy: ContextStrategy = {
  name: "summarize-recent",
  description: "Combine summary of older messages with full recent messages",
  compose(input: StrategyInput): ContextWindow {
    const systemBudget = Math.floor(input.tokenBudget * 0.15);
    const staticBudget = Math.floor(input.tokenBudget * 0.05);
    const ragBudget = Math.floor(input.tokenBudget * 0.2);
    const convBudget = Math.floor(input.tokenBudget * 0.5);
    const toolBudget = Math.floor(input.tokenBudget * 0.1);

    const summaryPart = input.summary ? `[Summary] ${input.summary}\n` : "";
    const recentMessages = input.messages.slice(-5);
    const recentText = recentMessages
      .map((m) => `[${m.role}] ${m.content}`)
      .join("\n");
    const fullConv = summaryPart + recentText;

    return {
      systemPrompt: trimText(input.systemPrompt, systemBudget),
      staticContext: trimText(input.staticContext, staticBudget),
      ragContext: trimText(input.ragResults, ragBudget),
      conversationHistory: trimText(fullConv, convBudget),
      toolBuffer: "",
    };
  },
};

/**
 * Entity-anchored: prioritize messages referencing tracked entities.
 */
export const entityAnchoredStrategy: ContextStrategy = {
  name: "entity-anchored",
  description: "Prioritize messages that reference tracked entities",
  compose(input: StrategyInput): ContextWindow {
    const systemBudget = Math.floor(input.tokenBudget * 0.15);
    const staticBudget = Math.floor(input.tokenBudget * 0.05);
    const ragBudget = Math.floor(input.tokenBudget * 0.2);
    const convBudget = Math.floor(input.tokenBudget * 0.5);

    // Always include last 3 messages + any that mention entities (from summary)
    const recent = input.messages.slice(-3);
    const older = input.messages.slice(0, -3);

    // If we have a summary, entity references are there; include summary and recent
    const summaryPart = input.summary
      ? `[Entity Context] ${input.summary}\n`
      : "";
    const recentText = recent.map((m) => `[${m.role}] ${m.content}`).join("\n");
    const olderRelevant = older
      .filter((m) => input.summary && m.content.length > 50)
      .slice(-3)
      .map((m) => `[${m.role}] ${m.content}`)
      .join("\n");
    const fullConv = [summaryPart, olderRelevant, recentText]
      .filter(Boolean)
      .join("\n");

    return {
      systemPrompt: trimText(input.systemPrompt, systemBudget),
      staticContext: trimText(input.staticContext, staticBudget),
      ragContext: trimText(input.ragResults, ragBudget),
      conversationHistory: trimText(fullConv, convBudget),
      toolBuffer: "",
    };
  },
};

/**
 * RAG-first: allocate 60% of the budget to RAG results.
 */
export const ragFirstStrategy: ContextStrategy = {
  name: "rag-first",
  description: "Allocate 60% of the token budget to RAG results",
  compose(input: StrategyInput): ContextWindow {
    const systemBudget = Math.floor(input.tokenBudget * 0.1);
    const staticBudget = Math.floor(input.tokenBudget * 0.05);
    const ragBudget = Math.floor(input.tokenBudget * 0.6);
    const convBudget = Math.floor(input.tokenBudget * 0.2);
    const toolBudget = Math.floor(input.tokenBudget * 0.05);

    const recentMessages = input.messages.slice(-5);
    const convText = recentMessages
      .map((m) => `[${m.role}] ${m.content}`)
      .join("\n");

    return {
      systemPrompt: trimText(input.systemPrompt, systemBudget),
      staticContext: trimText(input.staticContext, staticBudget),
      ragContext: trimText(input.ragResults, ragBudget),
      conversationHistory: trimText(convText, convBudget),
      toolBuffer: "",
    };
  },
};

/**
 * Hierarchical: topic summaries for old context, rolling summary for mid,
 * full text for recent messages.
 */
export const hierarchicalStrategy: ContextStrategy = {
  name: "hierarchical",
  description:
    "Topics for old context, summary for mid-range, full text for recent",
  compose(input: StrategyInput): ContextWindow {
    const systemBudget = Math.floor(input.tokenBudget * 0.15);
    const staticBudget = Math.floor(input.tokenBudget * 0.05);
    const ragBudget = Math.floor(input.tokenBudget * 0.2);
    const convBudget = Math.floor(input.tokenBudget * 0.5);

    const msgs = input.messages;
    const recent = msgs.slice(-5);
    const mid = msgs.slice(-15, -5);
    const old = msgs.slice(0, -15);

    // Old: just topic markers
    const oldTopics =
      old.length > 0
        ? `[Topics from ${old.length} earlier messages] ${input.summary ?? "(no summary)"}\n`
        : "";

    // Mid: condensed one-liners
    const midText = mid
      .map((m) => `[${m.role}:t${m.turn}] ${m.content.slice(0, 120)}`)
      .join("\n");
    const midSection = midText ? `[Mid-range context]\n${midText}\n` : "";

    // Recent: full text
    const recentText = recent.map((m) => `[${m.role}] ${m.content}`).join("\n");

    const fullConv = [oldTopics, midSection, recentText]
      .filter(Boolean)
      .join("\n");

    return {
      systemPrompt: trimText(input.systemPrompt, systemBudget),
      staticContext: trimText(input.staticContext, staticBudget),
      ragContext: trimText(input.ragResults, ragBudget),
      conversationHistory: trimText(fullConv, convBudget),
      toolBuffer: "",
    };
  },
};

// ── Strategy Registry ───────────────────────────────────────────

export const STRATEGIES: Record<string, ContextStrategy> = {
  "sliding-window": slidingWindowStrategy,
  "summarize-recent": summarizeRecentStrategy,
  "entity-anchored": entityAnchoredStrategy,
  "rag-first": ragFirstStrategy,
  hierarchical: hierarchicalStrategy,
};

/**
 * Map agent role IDs to their preferred context strategy.
 */
export function getStrategyForAgent(agentId: string): ContextStrategy {
  const mapping: Record<string, string> = {
    planner: "hierarchical",
    coordinator: "summarize-recent",
    "context-engineer": "rag-first",
    "graph-analyst": "entity-anchored",
    "property-analyst": "rag-first",
    "map-analyst": "sliding-window",
    "finance-analyst": "summarize-recent",
    "zpid-finder": "sliding-window",
    "analytics-analyst": "rag-first",
    "ranker-analyst": "entity-anchored",
    "compliance-analyst": "hierarchical",
    reporter: "summarize-recent",
  };

  const strategyName = mapping[agentId] ?? "sliding-window";
  return STRATEGIES[strategyName] ?? slidingWindowStrategy;
}
