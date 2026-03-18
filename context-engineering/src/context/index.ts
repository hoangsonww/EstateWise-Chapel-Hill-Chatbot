/**
 * @fileoverview Barrel export for the EstateWise Context Engine package.
 *
 * Re-exports all public types, providers, ranking utilities, the ContextWindow,
 * and the main ContextEngine class so consumers can import from a single path.
 *
 * @example
 * ```typescript
 * import {
 *   ContextEngine,
 *   ContextWindow,
 *   Ranker,
 *   ContextSource,
 *   ContextPriority,
 *   type AssembledContext,
 * } from "./context/index.js";
 * ```
 */

// Main orchestrator
export { ContextEngine } from "./ContextEngine.js";
export type {
  ContextEngineConfig,
  SimpleAssembledContext,
  AssembleInput,
} from "./ContextEngine.js";

// Token budget manager
export { ContextWindow } from "./ContextWindow.js";

// Core types and enums
export type {
  ContextItem,
  AssembledContext,
  ContextAssemblyRequest,
  ConversationTurn,
  ContextProvider,
  ContextWindowConfig,
} from "./types.js";
export { ContextSource, ContextPriority } from "./types.js";

// Providers
export {
  GraphProvider,
  DocumentProvider,
  ConversationProvider,
  ToolResultProvider,
} from "./providers/index.js";

// Ranking utilities
export { Ranker } from "./ranking/Ranker.js";
export type { RankingStrategy, CombinedWeights } from "./ranking/Ranker.js";
export {
  scoreRecency,
  scoreRelevance,
  scoreImportance,
  scoreCombined,
  DEFAULT_COMBINED_WEIGHTS,
} from "./ranking/strategies.js";
