/**
 * Anthropic-style prompt caching strategy for EstateWise.
 * Builds layered message arrays with cache_control breakpoints to minimize
 * redundant token processing across turns.
 */

/**
 * A single message in the prompt layer structure.
 */
export interface CachedMessage {
  role: "system" | "user" | "assistant";
  content: string;
  cache_control?: { type: "ephemeral" };
}

/**
 * Configuration for the six prompt layers.
 */
export interface PromptLayerConfig {
  systemPrompt: string;
  staticContext?: string;
  ragContext?: string;
  conversationHistory?: Array<{ role: "user" | "assistant"; content: string }>;
  recentMessages?: Array<{ role: "user" | "assistant"; content: string }>;
  taskInstruction: string;
}

/**
 * Builds a layered prompt array with strategic cache_control breakpoints.
 *
 * Layer 1 (System)      - Cached: stable system prompt, rarely changes
 * Layer 2 (Static)      - Cached: grounding rules, schemas, agent roster
 * Layer 3 (RAG)         - Cached: retrieved documents / knowledge base context
 * Layer 4 (History)     - Cached: older conversation turns (context window)
 * Layer 5 (Recent)      - NOT cached: last 1-2 turns, changes every request
 * Layer 6 (Task)        - NOT cached: current user instruction / query
 *
 * @param config - The layer configuration.
 * @returns Array of messages with cache_control annotations.
 */
export function buildCachedPromptLayers(
  config: PromptLayerConfig,
): CachedMessage[] {
  const messages: CachedMessage[] = [];

  // Layer 1: System prompt (cached)
  messages.push({
    role: "system",
    content: config.systemPrompt,
    cache_control: { type: "ephemeral" },
  });

  // Layer 2: Static context (cached)
  if (config.staticContext) {
    messages.push({
      role: "user",
      content: `<static_context>\n${config.staticContext}\n</static_context>`,
      cache_control: { type: "ephemeral" },
    });
  }

  // Layer 3: RAG context (cached)
  if (config.ragContext) {
    messages.push({
      role: "user",
      content: `<rag_context>\n${config.ragContext}\n</rag_context>`,
      cache_control: { type: "ephemeral" },
    });
  }

  // Layer 4: Conversation history (cached)
  if (config.conversationHistory && config.conversationHistory.length > 0) {
    for (const msg of config.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
    // Mark the last history message as cache boundary
    const lastHistory = messages[messages.length - 1];
    lastHistory.cache_control = { type: "ephemeral" };
  }

  // Layer 5: Recent messages (NOT cached — changes every turn)
  if (config.recentMessages) {
    for (const msg of config.recentMessages) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Layer 6: Task instruction (NOT cached — unique per request)
  messages.push({
    role: "user",
    content: config.taskInstruction,
  });

  return messages;
}

/**
 * Estimates token savings from caching for a given prompt configuration.
 *
 * @param config - The layer configuration.
 * @returns Object with estimated total tokens, cached tokens, savings ratio.
 */
export function estimateCacheSavings(config: PromptLayerConfig): {
  totalTokensEstimate: number;
  cachedTokensEstimate: number;
  uncachedTokensEstimate: number;
  savingsRatio: number;
  estimatedCostReductionPercent: number;
} {
  // Rough estimate: 1 token ~ 4 chars for English text
  const CHARS_PER_TOKEN = 4;

  const systemTokens = Math.ceil(config.systemPrompt.length / CHARS_PER_TOKEN);
  const staticTokens = config.staticContext
    ? Math.ceil(config.staticContext.length / CHARS_PER_TOKEN)
    : 0;
  const ragTokens = config.ragContext
    ? Math.ceil(config.ragContext.length / CHARS_PER_TOKEN)
    : 0;
  const historyTokens = config.conversationHistory
    ? Math.ceil(
        config.conversationHistory
          .map((m) => m.content.length)
          .reduce((a, b) => a + b, 0) / CHARS_PER_TOKEN,
      )
    : 0;
  const recentTokens = config.recentMessages
    ? Math.ceil(
        config.recentMessages
          .map((m) => m.content.length)
          .reduce((a, b) => a + b, 0) / CHARS_PER_TOKEN,
      )
    : 0;
  const taskTokens = Math.ceil(
    config.taskInstruction.length / CHARS_PER_TOKEN,
  );

  const cachedTokensEstimate =
    systemTokens + staticTokens + ragTokens + historyTokens;
  const uncachedTokensEstimate = recentTokens + taskTokens;
  const totalTokensEstimate = cachedTokensEstimate + uncachedTokensEstimate;

  const savingsRatio =
    totalTokensEstimate > 0 ? cachedTokensEstimate / totalTokensEstimate : 0;

  // Anthropic charges 90% less for cache hits on input tokens
  const estimatedCostReductionPercent = savingsRatio * 90;

  return {
    totalTokensEstimate,
    cachedTokensEstimate,
    uncachedTokensEstimate,
    savingsRatio: Math.round(savingsRatio * 1000) / 1000,
    estimatedCostReductionPercent:
      Math.round(estimatedCostReductionPercent * 10) / 10,
  };
}
