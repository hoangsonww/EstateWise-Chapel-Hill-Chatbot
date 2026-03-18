/**
 * @fileoverview Type definitions for the EstateWise Context Engine.
 *
 * Provides strongly-typed interfaces and enumerations for context items,
 * providers, window management, and the assembled context payload delivered
 * to AI agents.
 */

/** A single unit of contextual information that can be placed into an agent context window. */
export interface ContextItem {
  /** Unique identifier for this context item (UUID v4). */
  id: string;
  /** The text content that will be injected into the context window. */
  content: string;
  /** Origin of this context item. */
  source: ContextSource;
  /** Normalised relevance score in [0, 1] relative to the current query. */
  relevanceScore: number;
  /** Estimated token count for the content string. */
  tokenCount: number;
  /** Priority level used for budget allocation and eviction ordering. */
  priority: ContextPriority;
  /** Arbitrary metadata bag for provider-specific annotations. */
  metadata: Record<string, unknown>;
  /** ISO 8601 timestamp when this context item was produced. */
  timestamp: string;
}

/** Categorical origin of a context item. */
export enum ContextSource {
  KnowledgeGraph = "knowledge_graph",
  KnowledgeBase = "knowledge_base",
  Conversation = "conversation",
  ToolResult = "tool_result",
  SystemPrompt = "system_prompt",
  UserPreference = "user_preference",
}

/**
 * Numeric priority levels for context window budget allocation.
 * Higher numbers take precedence. Critical items are never evicted.
 */
export enum ContextPriority {
  /** Safety rules, platform system prompts — never evicted. */
  Critical = 4,
  /** Directly relevant graph/KB results for the current query. */
  High = 3,
  /** Related context, recent conversation turns. */
  Medium = 2,
  /** Background knowledge, older conversation history. */
  Low = 1,
  /** Lowest priority — evicted first when budget is tight. */
  Background = 0,
}

/** Configuration for the context window token budget manager. */
export interface ContextWindowConfig {
  /** Total token budget for the assembled context (system + conversation + context + response). */
  maxTokens: number;
  /**
   * Tokens reserved for the system prompt boilerplate and model response headroom.
   * The available context budget is `maxTokens - reservedTokens`.
   */
  reservedTokens: number;
  /**
   * Strategy for allocating remaining tokens across context items:
   * - "priority"     — fills Critical→High→Medium→Low→Background in order
   * - "proportional" — allocates proportional slices to each priority tier
   * - "adaptive"     — uses priority as a baseline but adapts to relevance scores
   */
  allocationStrategy: "priority" | "proportional" | "adaptive";
  /** Optional per-provider hard token limits (provider name → max tokens). */
  providerBudgets?: Record<string, number>;
}

/** Input payload for a context assembly operation. */
export interface ContextAssemblyRequest {
  /** The user or agent query that drives relevance scoring. */
  query: string;
  /** Recent conversation history to include as context. */
  conversationHistory?: ConversationTurn[];
  /** Names of tools currently active in the agent session (for ToolResultProvider). */
  activeTools?: string[];
  /** Persisted user preferences to inject as context. */
  userPreferences?: Record<string, unknown>;
  /** Override the default max token budget for this request. */
  maxTokens?: number;
}

/** A single turn in a multi-turn conversation. */
export interface ConversationTurn {
  /** Speaker role for this turn. */
  role: "user" | "assistant" | "system" | "tool";
  /** Text content of the turn. */
  content: string;
  /** ISO 8601 timestamp of the turn. */
  timestamp: string;
  /** For role "tool": the name of the tool that produced this result. */
  toolName?: string;
  /** Pre-computed token count for the content, if known. */
  tokenCount?: number;
}

/** The fully assembled context payload delivered to an agent. */
export interface AssembledContext {
  /** Ordered list of context items included in the window, priority-descending. */
  items: ContextItem[];
  /** Total tokens consumed by all included items. */
  totalTokens: number;
  /** Percentage of available budget consumed (0–100). */
  budgetUsed: number;
  /** Per-provider breakdown of item count and token usage. */
  providerBreakdown: Record<string, { items: number; tokens: number }>;
  /** Metadata about the assembly process for observability. */
  metadata: {
    /** Wall-clock time to assemble, in milliseconds. */
    assemblyTimeMs: number;
    /** Total items collected across all providers before filtering. */
    itemsConsidered: number;
    /** Items that fit within the token budget. */
    itemsIncluded: number;
    /** Items that were ranked but did not fit in the budget. */
    itemsEvicted: number;
  };
}

/**
 * Interface that all context providers must implement.
 * Each provider is responsible for a specific data source.
 */
export interface ContextProvider {
  /** Unique name identifying this provider (e.g. "graph", "kb", "conversation"). */
  name: string;
  /** Default priority tier applied to items produced by this provider. */
  priority: ContextPriority;
  /**
   * Fetches context items relevant to the given assembly request.
   *
   * @param request - The full assembly request including query and history.
   * @returns A (possibly empty) list of context items.
   */
  getContext(request: ContextAssemblyRequest): Promise<ContextItem[]>;
}
