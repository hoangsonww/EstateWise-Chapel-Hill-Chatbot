/**
 * @fileoverview ContextEngine — orchestrates multi-provider context assembly
 * for EstateWise AI agents.
 *
 * The engine collects context items from all registered providers, ranks them
 * using the combined Ranker strategy, and allocates them into a token-budgeted
 * window. The resulting AssembledContext is ready for direct injection into
 * an agent system prompt.
 */

import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import { ContextWindow } from "./ContextWindow.js";
import { Ranker } from "./ranking/Ranker.js";
import {
  GraphProvider,
  DocumentProvider,
  ConversationProvider,
  ToolResultProvider,
} from "./providers/index.js";
import { ContextSource } from "./types.js";
import type {
  AssembledContext,
  ContextAssemblyRequest,
  ContextItem,
  ContextProvider,
  ContextWindowConfig,
  ConversationTurn,
} from "./types.js";
import { ContextPriority } from "./types.js";

/**
 * Mapping from agent role name to a tuned ContextWindowConfig.
 * These overrides let specialist agents receive differently shaped context.
 */
const AGENT_WINDOW_CONFIGS: Record<string, Partial<ContextWindowConfig>> = {
  GraphAnalyst: { maxTokens: 6000, reservedTokens: 1500 },
  PropertyAnalyst: { maxTokens: 10000, reservedTokens: 2500 },
  MarketAnalyst: { maxTokens: 8000, reservedTokens: 2000 },
  NeighbourhoodExpert: { maxTokens: 7000, reservedTokens: 1800 },
  ComplianceChecker: { maxTokens: 6000, reservedTokens: 1500 },
  Orchestrator: { maxTokens: 12000, reservedTokens: 3000 },
};

/** Configuration for the ContextEngine. */
export interface ContextEngineConfig {
  /** Token window configuration. */
  window: ContextWindowConfig;
  /** Whether to cache identical query results for 30 seconds. Default: true. */
  enableCache?: boolean;
}

/** Simplified assembled context shape for external consumers. */
export interface SimpleAssembledContext {
  /** All context items included in the window. */
  items: Array<{
    source: string;
    type: string;
    priority: number;
    tokenCount: number;
    content: string;
  }>;
  /** Total token count of all included items. */
  tokenCount: number;
  /** ISO-8601 timestamp when assembly completed. */
  assembledAt: string;
}

/** Input for `ContextEngine.assemble()` — simplified convenience API. */
export interface AssembleInput {
  /** User or agent query driving relevance. */
  query: string;
  /** Agent role identifier for filtering/weighting. */
  agentRole?: string;
  /** Max token budget. Overrides engine config if provided. */
  maxTokens?: number;
}

// ---------------------------------------------------------------------------
// Simple token counter
// ---------------------------------------------------------------------------

const CHARS_PER_TOKEN = 4;

function countTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// ---------------------------------------------------------------------------
// ContextEngine
// ---------------------------------------------------------------------------

/**
 * Assembles token-budgeted context windows for EstateWise AI agents.
 *
 * Works with any KnowledgeGraph and KnowledgeBase implementation.
 * Additional ContextProviders can be registered to pull from custom sources.
 */
export class ContextEngine {
  private readonly _graph: KnowledgeGraph;
  private readonly _kb: KnowledgeBase;
  private readonly _config: ContextEngineConfig;
  private readonly _providers: Map<string, ContextProvider> = new Map();
  private readonly _ranker: Ranker;
  private readonly _toolResultProvider: ToolResultProvider;
  private readonly _cache = new Map<
    string,
    { result: SimpleAssembledContext; expiresAt: number }
  >();
  private _initialized = false;

  constructor(
    graph: KnowledgeGraph,
    kb: KnowledgeBase,
    config?: Partial<ContextEngineConfig>,
  ) {
    this._graph = graph;
    this._kb = kb;
    this._ranker = new Ranker();
    this._toolResultProvider = new ToolResultProvider();
    this._config = {
      window: {
        maxTokens: config?.window?.maxTokens ?? 8000,
        reservedTokens: config?.window?.reservedTokens ?? 2000,
        allocationStrategy: config?.window?.allocationStrategy ?? "adaptive",
      },
      enableCache: config?.enableCache ?? true,
    };
  }

  // -------------------------------------------------------------------------
  // Lifecycle
  // -------------------------------------------------------------------------

  /**
   * Initialises the engine and its dependencies.
   *
   * Ensures the KnowledgeBase is seeded and registers all built-in providers.
   * Safe to call multiple times — subsequent calls are no-ops.
   */
  async initialize(): Promise<void> {
    if (this._initialized) return;
    this._initialized = true;

    await this._kb.initialize();

    // Register built-in providers in priority order.
    this.registerProvider(new GraphProvider(this._graph));
    this.registerProvider(new DocumentProvider(this._kb));
    this.registerProvider(new ConversationProvider());
    this.registerProvider(this._toolResultProvider);
  }

  // -------------------------------------------------------------------------
  // Provider registry
  // -------------------------------------------------------------------------

  /**
   * Registers a context provider with the engine. If a provider with the same
   * name is already registered it is replaced, allowing callers to override
   * built-in providers with custom implementations.
   *
   * @param provider - ContextProvider to register.
   */
  registerProvider(provider: ContextProvider): void {
    this._providers.set(provider.name, provider);
  }

  /**
   * Removes a provider from the registry by name.
   *
   * @param name - The provider name to remove.
   * @returns `true` if a provider was found and removed.
   */
  unregisterProvider(name: string): boolean {
    return this._providers.delete(name);
  }

  /**
   * Returns the names of all currently registered providers.
   */
  getProviderNames(): string[] {
    return Array.from(this._providers.keys());
  }

  // -------------------------------------------------------------------------
  // Tool result cache
  // -------------------------------------------------------------------------

  /**
   * Adds a tool invocation result to the internal cache so it can be surfaced
   * as context in future assembly requests.
   *
   * @param toolName - MCP tool name (e.g. "properties.search").
   * @param args     - Arguments that were passed to the tool call.
   * @param result   - Stringified result returned by the tool.
   */
  addToolResult(
    toolName: string,
    args: Record<string, unknown>,
    result: string,
  ): void {
    this._toolResultProvider.addResult(toolName, args, result);
  }

  // -------------------------------------------------------------------------
  // Assemble (simplified API used by MCP tools and API handlers)
  // -------------------------------------------------------------------------

  /**
   * Assemble a token-budgeted context for the given input.
   *
   * Queries the knowledge base and graph for relevant content, ranks items by
   * relevance, and packs them into the token budget.
   *
   * @param input - Query, agent role, and optional token override.
   * @returns A SimpleAssembledContext ready for prompt injection.
   */
  async assemble(input: AssembleInput): Promise<SimpleAssembledContext> {
    const maxTokens = input.maxTokens ?? this._config.window.maxTokens;
    const cacheKey = `${input.query}:${input.agentRole}:${maxTokens}`;

    // Check cache
    if (this._config.enableCache) {
      const cached = this._cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
      }
    }

    const startMs = Date.now();
    const items: SimpleAssembledContext["items"] = [];
    let usedTokens = 0;
    const budget = maxTokens - this._config.window.reservedTokens;

    // ---- Knowledge Base items ----
    try {
      const kbResults = await this._kb.search(input.query, {
        strategy: "hybrid",
        limit: 10,
      });

      for (const r of kbResults) {
        const tokenCount = r.chunk.tokenCount || countTokens(r.chunk.content);
        if (usedTokens + tokenCount > budget) break;
        items.push({
          source: r.document.source,
          type: "knowledge_base",
          priority: ContextPriority.High,
          tokenCount,
          content: r.chunk.content,
        });
        usedTokens += tokenCount;
      }
    } catch {
      // Non-fatal — KB may not be initialized yet
    }

    // ---- Graph items (top importance nodes) ----
    try {
      const q = input.query.toLowerCase();
      const graphNodes = this._graph
        .findNodes(
          (n) =>
            n.label.toLowerCase().includes(q) ||
            String(n.properties["name"] ?? "")
              .toLowerCase()
              .includes(q),
        )
        .sort((a, b) => b.metadata.importance - a.metadata.importance)
        .slice(0, 5);

      for (const node of graphNodes) {
        const content = `[${node.type}] ${node.label}: ${JSON.stringify(node.properties)}`;
        const tokenCount = countTokens(content);
        if (usedTokens + tokenCount > budget) break;
        items.push({
          source: `graph:${node.id}`,
          type: "knowledge_graph",
          priority: ContextPriority.Medium,
          tokenCount,
          content,
        });
        usedTokens += tokenCount;
      }
    } catch {
      // Non-fatal
    }

    // ---- Custom provider items ----
    for (const [, provider] of this._providers) {
      try {
        const request: ContextAssemblyRequest = { query: input.query };
        const providerItems = await provider.getContext(request);
        for (const item of providerItems) {
          const tokenCount = item.tokenCount || countTokens(item.content);
          if (usedTokens + tokenCount > budget) break;
          items.push({
            source: String(item.source),
            type: provider.name,
            priority: item.priority,
            tokenCount,
            content: item.content,
          });
          usedTokens += tokenCount;
        }
      } catch {
        // Non-fatal
      }
    }

    const result: SimpleAssembledContext = {
      items,
      tokenCount: usedTokens,
      assembledAt: new Date().toISOString(),
    };

    // Cache for 30 seconds
    if (this._config.enableCache) {
      this._cache.set(cacheKey, { result, expiresAt: Date.now() + 30_000 });
    }

    return result;
  }

  // -------------------------------------------------------------------------
  // Full assembly API (for ContextProvider ecosystem)
  // -------------------------------------------------------------------------

  /**
   * Assembles a full context payload for the given request.
   *
   * Steps:
   * 1. Collect items from all providers in parallel.
   * 2. Rank all collected items using the "combined" strategy.
   * 3. Allocate items within the token budget.
   * 4. Return AssembledContext with full observability metadata.
   *
   * @param request - The assembly request describing the query and context.
   * @returns Fully assembled context ready for LLM injection.
   */
  async assembleContext(
    request: ContextAssemblyRequest,
  ): Promise<AssembledContext> {
    const startMs = Date.now();
    const maxTokens = request.maxTokens ?? this._config.window.maxTokens;

    const windowCfg: ContextWindowConfig = {
      ...this._config.window,
      maxTokens,
    };

    // 1. Collect from all providers in parallel.
    const settled = await Promise.allSettled(
      Array.from(this._providers.values()).map(async (provider) => {
        const items = await provider.getContext(request);
        return { name: provider.name, items };
      }),
    );

    const allItems: ContextItem[] = [];
    for (const result of settled) {
      if (result.status === "fulfilled") {
        allItems.push(...result.value.items);
      }
      // Provider errors are silently swallowed so one failure never blocks
      // the full assembly. In production these should be emitted to a logger.
    }

    const itemsConsidered = allItems.length;

    // 2. Rank using the combined strategy.
    const ranked = this._ranker.rank(allItems, request.query, "combined");

    // 3. Allocate within token budget.
    const ctxWindow = new ContextWindow(windowCfg);
    const allocated = ctxWindow.allocate(ranked);
    const usage = ctxWindow.getUsage();

    // 4. Per-provider breakdown.
    const providerBreakdown: Record<string, { items: number; tokens: number }> =
      {};
    for (const item of allocated) {
      const key = this._sourceToProviderKey(item.source);
      const existing = providerBreakdown[key] ?? { items: 0, tokens: 0 };
      providerBreakdown[key] = {
        items: existing.items + 1,
        tokens: existing.tokens + item.tokenCount,
      };
    }

    return {
      items: allocated,
      totalTokens: usage.used,
      budgetUsed: usage.percentage,
      providerBreakdown,
      metadata: {
        assemblyTimeMs: Date.now() - startMs,
        itemsConsidered,
        itemsIncluded: allocated.length,
        itemsEvicted: itemsConsidered - allocated.length,
      },
    };
  }

  /**
   * Convenience method for assembling context tuned for a specific agent role.
   *
   * Applies agent-specific token budget overrides and accepts an optional
   * conversation history shortcut.
   *
   * @param agentRole           - The agent role name (e.g. "PropertyAnalyst").
   * @param query               - The current user or internal query.
   * @param conversationHistory - Optional recent conversation turns.
   * @returns Assembled context tailored for the specified agent role.
   */
  async getContextForAgent(
    agentRole: string,
    query: string,
    conversationHistory?: ConversationTurn[],
  ): Promise<AssembledContext> {
    const agentCfg = AGENT_WINDOW_CONFIGS[agentRole];
    const maxTokens = agentCfg?.maxTokens ?? this._config.window.maxTokens;
    return this.assembleContext({ query, conversationHistory, maxTokens });
  }

  /**
   * Formats assembled context items into a single string for LLM prompt injection.
   *
   * Items are separated by a horizontal rule for readability.
   *
   * @param assembled - The assembled context payload.
   * @returns A multi-line formatted string of all context items.
   */
  formatForPrompt(assembled: AssembledContext): string {
    if (assembled.items.length === 0) return "";
    return assembled.items
      .map((item) => item.content.trim())
      .filter(Boolean)
      .join("\n\n---\n\n");
  }

  /**
   * Returns diagnostic information about the current engine state.
   */
  getEngineStats(): {
    providers: string[];
    toolCacheSize: number;
    kbStats: ReturnType<KnowledgeBase["getStats"]>;
    graphStats: ReturnType<KnowledgeGraph["getStats"]>;
    initialized: boolean;
  } {
    return {
      providers: this.getProviderNames(),
      toolCacheSize: this._toolResultProvider.getCacheSize(),
      kbStats: this._kb.getStats(),
      graphStats: this._graph.getStats(),
      initialized: this._initialized,
    };
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /** Maps a ContextSource enum value to a human-readable provider breakdown key. */
  private _sourceToProviderKey(source: ContextSource): string {
    switch (source) {
      case ContextSource.KnowledgeGraph:
        return "graph";
      case ContextSource.KnowledgeBase:
        return "kb";
      case ContextSource.Conversation:
        return "conversation";
      case ContextSource.ToolResult:
        return "tool_result";
      case ContextSource.SystemPrompt:
        return "system";
      case ContextSource.UserPreference:
        return "user_preference";
      default:
        return "unknown";
    }
  }
}
