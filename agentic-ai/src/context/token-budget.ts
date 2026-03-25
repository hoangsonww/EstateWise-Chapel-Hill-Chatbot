/**
 * Token budget management for context window allocation.
 * Dynamically allocates token budgets across system prompt, static context,
 * RAG results, conversation history, tool buffers, and generation.
 */

export interface TokenAllocation {
  system: number;
  staticContext: number;
  rag: number;
  conversation: number;
  toolBuffer: number;
  generation: number;
  total: number;
}

export interface TokenBudgetConfig {
  maxTokens: number;
  compactThreshold?: number;
  baseSystemTokens?: number;
  baseStaticTokens?: number;
  baseRagTokens?: number;
  baseConversationTokens?: number;
  baseToolBufferTokens?: number;
  baseGenerationTokens?: number;
}

const DEFAULT_CONFIG: Required<TokenBudgetConfig> = {
  maxTokens: 128_000,
  compactThreshold: 0.85,
  baseSystemTokens: 2_000,
  baseStaticTokens: 1_000,
  baseRagTokens: 4_000,
  baseConversationTokens: 3_000,
  baseToolBufferTokens: 5_000,
  baseGenerationTokens: 4_000,
};

export class TokenBudgetManager {
  private readonly config: Required<TokenBudgetConfig>;
  private usedTokens = 0;

  constructor(config?: Partial<TokenBudgetConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Compute a dynamic token allocation based on conversation length.
   * Longer conversations get more conversation budget at the expense of
   * static context and tool buffer.
   */
  getAllocation(conversationLength: number): TokenAllocation {
    const system = this.config.baseSystemTokens;
    const staticContext = this.config.baseStaticTokens;
    const rag = this.config.baseRagTokens;
    const toolBuffer = this.config.baseToolBufferTokens;
    const generation = this.config.baseGenerationTokens;

    // Scale conversation budget: base + 500 tokens per 10 messages
    const conversationBonus = Math.floor(conversationLength / 10) * 500;
    const conversation = this.config.baseConversationTokens + conversationBonus;

    const total = system + staticContext + rag + conversation + toolBuffer + generation;

    return { system, staticContext, rag, conversation, toolBuffer, generation, total };
  }

  /**
   * Record token usage for the current request.
   */
  trackUsage(tokens: number): void {
    this.usedTokens += tokens;
  }

  /**
   * Returns true when usage exceeds the compact threshold (default 85%).
   */
  shouldCompact(): boolean {
    return this.getUtilization() >= this.config.compactThreshold;
  }

  /**
   * Current utilization ratio (0..1+).
   */
  getUtilization(): number {
    if (this.config.maxTokens <= 0) return 0;
    return this.usedTokens / this.config.maxTokens;
  }

  /**
   * How many tokens remain before hitting the max.
   */
  getRemainingBudget(): number {
    return Math.max(0, this.config.maxTokens - this.usedTokens);
  }

  /**
   * Rough token estimate: character count divided by 4.
   */
  estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Trim text to fit within a given token budget.
   * Cuts from the end and appends an ellipsis marker.
   */
  trimToFit(text: string, maxTokens: number): string {
    const estimated = this.estimateTokens(text);
    if (estimated <= maxTokens) return text;
    const maxChars = maxTokens * 4;
    return text.slice(0, maxChars - 20) + "\n... [trimmed]";
  }
}
