/**
 * EstateWise Prompt Engineering System — barrel export.
 *
 * Re-exports all prompt infrastructure: versioning, grounding, cache strategy,
 * system prompts, Zod schemas, and templates.
 */

// Core infrastructure
export {
  PromptRegistry,
  type PromptVersion,
  type PromptMetrics,
} from "./versioning.js";

export {
  GROUNDING_RULES,
  GROUNDING_SYSTEM_BLOCK,
  GroundingValidator,
  type GroundingViolation,
} from "./grounding.js";

export {
  buildCachedPromptLayers,
  estimateCacheSavings,
  type CachedMessage,
  type PromptLayerConfig,
} from "./cache-strategy.js";

// System prompts (named exports)
export { SUPERVISOR_SYSTEM_PROMPT } from "./system/supervisor.js";
export { PROPERTY_SEARCH_SYSTEM_PROMPT } from "./system/property-search.js";
export { MARKET_ANALYST_SYSTEM_PROMPT } from "./system/market-analyst.js";
export { DATA_ENRICHMENT_SYSTEM_PROMPT } from "./system/data-enrichment.js";
export { RECOMMENDATION_SYSTEM_PROMPT } from "./system/recommendation.js";
export { CONVERSATION_MANAGER_SYSTEM_PROMPT } from "./system/conversation-manager.js";
export { QUALITY_REVIEWER_SYSTEM_PROMPT } from "./system/quality-reviewer.js";

// Zod schemas (star exports)
export * from "./schemas/intent-output.js";
export * from "./schemas/property-response.js";
export * from "./schemas/market-analysis.js";
export * from "./schemas/recommendation-output.js";

// Templates (star exports)
export * from "./templates/chain-of-thought.js";
export * from "./templates/prefilling.js";
