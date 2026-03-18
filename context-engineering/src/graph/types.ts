/**
 * Core type definitions for the EstateWise knowledge graph engine.
 * All enumerations, interfaces, and type aliases used across the graph module.
 */

// ---------------------------------------------------------------------------
// Node types
// ---------------------------------------------------------------------------

/** Discriminated set of node categories used across the knowledge graph. */
export enum NodeType {
  Property = "Property",
  Concept = "Concept",
  Entity = "Entity",
  Topic = "Topic",
  Document = "Document",
  Conversation = "Conversation",
  Agent = "Agent",
  Tool = "Tool",
  Workflow = "Workflow",
  Neighborhood = "Neighborhood",
  ZipCode = "ZipCode",
  MarketSegment = "MarketSegment",
}

// ---------------------------------------------------------------------------
// Edge types
// ---------------------------------------------------------------------------

/** Discriminated set of relationship types used as edge labels. */
export enum EdgeType {
  SIMILAR_TO = "SIMILAR_TO",
  RELATED_TO = "RELATED_TO",
  BELONGS_TO = "BELONGS_TO",
  MENTIONS = "MENTIONS",
  DERIVED_FROM = "DERIVED_FROM",
  DEPENDS_ON = "DEPENDS_ON",
  LINKS_TO = "LINKS_TO",
  PART_OF = "PART_OF",
  USES = "USES",
  PRODUCES = "PRODUCES",
  IN_NEIGHBORHOOD = "IN_NEIGHBORHOOD",
  IN_ZIP = "IN_ZIP",
  HAS_CAPABILITY = "HAS_CAPABILITY",
  PRECEDES = "PRECEDES",
}

// ---------------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------------

/** A vertex in the knowledge graph. */
export interface GraphNode {
  /** Unique identifier (UUID or stable slug). */
  id: string;
  /** Semantic category of this node. */
  type: NodeType;
  /** Human-readable display label. */
  label: string;
  /** Arbitrary domain-specific properties. */
  properties: Record<string, unknown>;
  /** System metadata managed by the graph engine. */
  metadata: NodeMetadata;
  /** Optional dense vector embedding for similarity search. */
  embedding?: number[];
}

/** System-managed metadata attached to every node. */
export interface NodeMetadata {
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
  /** String identifying the data source (e.g. "seed", "neo4j", "user"). */
  source: string;
  /** Monotonically increasing mutation counter. */
  version: number;
  /** Freeform classification tags. */
  tags: string[];
  /** Salience score in [0, 1]. Higher means more important. */
  importance: number;
}

// ---------------------------------------------------------------------------
// Edge
// ---------------------------------------------------------------------------

/** A directed, weighted relationship between two nodes. */
export interface GraphEdge {
  /** Unique identifier (UUID). */
  id: string;
  /** ID of the source node. */
  source: string;
  /** ID of the target node. */
  target: string;
  /** Semantic relationship type. */
  type: EdgeType;
  /**
   * Strength of the relationship in [0, 1].
   * Used as a cost in path-finding (higher weight = stronger = cheaper).
   */
  weight: number;
  /** Arbitrary domain-specific edge properties. */
  properties: Record<string, unknown>;
  /** System metadata managed by the graph engine. */
  metadata: EdgeMetadata;
}

/** System-managed metadata attached to every edge. */
export interface EdgeMetadata {
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-update timestamp. */
  updatedAt: string;
  /** String identifying the data source. */
  source: string;
  /** Confidence score in [0, 1] that the relationship is correct. */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Graph events
// ---------------------------------------------------------------------------

/** Event names emitted by KnowledgeGraph. */
export enum GraphEvent {
  NodeAdded = "node:added",
  NodeUpdated = "node:updated",
  NodeRemoved = "node:removed",
  EdgeAdded = "edge:added",
  EdgeUpdated = "edge:updated",
  EdgeRemoved = "edge:removed",
  GraphCleared = "graph:cleared",
  GraphSynced = "graph:synced",
  SubgraphExtracted = "subgraph:extracted",
}

// ---------------------------------------------------------------------------
// Traversal
// ---------------------------------------------------------------------------

/** Options that control graph traversal algorithms. */
export interface TraversalOptions {
  /** Maximum number of hops from the start node. Default: unlimited. */
  maxDepth?: number;
  /** Restrict traversal to only these edge types. */
  edgeTypes?: EdgeType[];
  /** Restrict traversal to only these node types. */
  nodeTypes?: NodeType[];
  /** Skip edges whose weight is strictly below this threshold. */
  minWeight?: number;
  /** Stop after visiting this many nodes. */
  maxNodes?: number;
  /** Direction of edges to follow. Default: "both". */
  direction?: "outgoing" | "incoming" | "both";
}

// ---------------------------------------------------------------------------
// Query results
// ---------------------------------------------------------------------------

/** Result returned by a QueryBuilder or algorithm that produces a subgraph. */
export interface QueryResult {
  /** Matched / reachable nodes. */
  nodes: GraphNode[];
  /** Matched / traversed edges. */
  edges: GraphEdge[];
  /** Optional ordered paths found during traversal. */
  paths?: GraphPath[];
  /** Execution diagnostics. */
  metadata: {
    executionTimeMs: number;
    nodesScanned: number;
    edgesScanned: number;
  };
}

/** An ordered walk through the graph. */
export interface GraphPath {
  /** Node IDs in traversal order (inclusive of start and end). */
  nodes: string[];
  /** Edge IDs in traversal order. */
  edges: string[];
  /** Sum of edge weights along the path. */
  totalWeight: number;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/** Complete serialisable snapshot of a KnowledgeGraph instance. */
export interface GraphSnapshot {
  /** Schema / format version string. */
  version: string;
  /** ISO-8601 timestamp of when the snapshot was taken. */
  timestamp: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: GraphStats;
}

/** Aggregate statistics describing the current state of the graph. */
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  /** Counts per NodeType string key. */
  nodesByType: Record<string, number>;
  /** Counts per EdgeType string key. */
  edgesByType: Record<string, number>;
  /** Mean degree (in + out) across all nodes. */
  avgDegree: number;
  /** Graph density: actual edges / max possible edges. */
  density: number;
  /** Number of weakly connected components. */
  connectedComponents: number;
}

// ---------------------------------------------------------------------------
// Algorithm outputs
// ---------------------------------------------------------------------------

/** Per-node PageRank score. */
export interface PageRankResult {
  nodeId: string;
  score: number;
}

/** A cluster of nodes produced by community detection. */
export interface Community {
  /** Zero-based integer community identifier. */
  id: number;
  /** IDs of member nodes. */
  members: string[];
  size: number;
}
