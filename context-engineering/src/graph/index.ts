/**
 * Public API for the EstateWise knowledge graph engine.
 *
 * Re-exports everything from the five sub-modules so consumers can import
 * from a single entry point:
 *
 *   import { KnowledgeGraph, query, NodeType, bfs, Neo4jSyncManager } from "./graph/index.js";
 */

// Core types — enums, interfaces, utility types
export * from "./types.js";

// Main graph class
export { KnowledgeGraph } from "./KnowledgeGraph.js";

// Traversal algorithms
export {
  bfs,
  dfs,
  shortestPath,
  allPaths,
  pageRank,
  communityDetection,
  connectedComponents,
  betweennessCentrality,
  neighborhoodExpansion,
  type PageRankOptions,
} from "./traversal.js";

// Fluent query builder
export {
  query,
  QueryBuilder,
  type FilterOperator,
  type FilterMap,
} from "./query.js";

// Neo4j sync
export { Neo4jSyncManager, type Neo4jSyncConfig } from "./neo4j-sync.js";
