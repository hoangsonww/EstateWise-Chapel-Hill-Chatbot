/**
 * @fileoverview Main barrel export for the @estatewise/context-engineering package.
 *
 * Re-exports all public classes, types, and factory functions. Consumers can
 * import everything they need from this single entry point:
 *
 * @example
 * ```typescript
 * import {
 *   createContextSystem,
 *   KnowledgeGraph,
 *   KnowledgeBase,
 *   ContextEngine,
 *   Ingester,
 *   ContextMetrics,
 *   createContextRouter,
 *   createContextTools,
 * } from "@estatewise/context-engineering";
 * ```
 */

// ---------------------------------------------------------------------------
// Core subsystem classes
// ---------------------------------------------------------------------------

export { KnowledgeGraph } from "./graph/index.js";
export { KnowledgeBase } from "./knowledge-base/index.js";
export {
  ContextEngine,
  type ContextEngineConfig,
  type SimpleAssembledContext,
  type AssembleInput,
} from "./context/ContextEngine.js";
export { ContextWindow } from "./context/ContextWindow.js";
export { Ingester } from "./ingestion/index.js";
export { ContextMetrics } from "./monitoring/index.js";

// ---------------------------------------------------------------------------
// API and MCP factories
// ---------------------------------------------------------------------------

export { createContextRouter } from "./api/router.js";
export {
  createContextTools,
  type ContextToolDef,
  type McpToolResponse,
  type McpContent,
} from "./mcp/tools.js";
export {
  createContextResources,
  type ContextResourceDef,
} from "./mcp/resources.js";

// ---------------------------------------------------------------------------
// Convenience factory
// ---------------------------------------------------------------------------

export {
  createContextSystem,
  type ContextSystem,
  type ContextSystemConfig,
  type Neo4jConfig,
} from "./factory.js";

// ---------------------------------------------------------------------------
// Type re-exports — graph
// ---------------------------------------------------------------------------

export type {
  GraphNode,
  GraphEdge,
  NodeMetadata,
  EdgeMetadata,
  TraversalOptions,
  QueryResult,
  GraphPath,
  GraphSnapshot,
  GraphStats,
  PageRankResult,
  Community,
} from "./graph/types.js";

export { NodeType, EdgeType, GraphEvent } from "./graph/types.js";

// ---------------------------------------------------------------------------
// Type re-exports — knowledge base
// ---------------------------------------------------------------------------

export type {
  KBDocument,
  KBChunk,
  DocumentMetadata,
  SearchOptions,
  SearchFilter,
  SearchResult,
  EmbedderConfig,
  EmbedFunction,
} from "./knowledge-base/types.js";

// ---------------------------------------------------------------------------
// Type re-exports — context engine
// ---------------------------------------------------------------------------

export type {
  ContextItem,
  AssembledContext,
  ContextAssemblyRequest,
  ConversationTurn,
  ContextProvider,
  ContextWindowConfig,
} from "./context/types.js";

export { ContextSource, ContextPriority } from "./context/types.js";

// ---------------------------------------------------------------------------
// Type re-exports — ingestion
// ---------------------------------------------------------------------------

export type {
  IngestionSource,
  IngestionResult,
  IngestionError,
  IngestionPipeline,
  ParsedData,
} from "./ingestion/types.js";

// ---------------------------------------------------------------------------
// Type re-exports — monitoring
// ---------------------------------------------------------------------------

export type {
  ContextMetricsSnapshot,
  MetricsEvent,
} from "./monitoring/types.js";
