/**
 * KnowledgeGraph — enterprise-grade in-memory graph engine for EstateWise.
 *
 * Architecture
 * ─────────────
 *  • Nodes stored in Map<id, GraphNode>
 *  • Edges stored in Map<id, GraphEdge>
 *  • Adjacency maintained via two Maps of Sets:
 *      outgoing: Map<sourceId, Set<edgeId>>
 *      incoming: Map<targetId, Set<edgeId>>
 *  • EventEmitter3 for typed event emission
 *  • seed() pre-populates EstateWise domain knowledge so the graph is never empty
 */

import EventEmitter from "eventemitter3";
import { v4 as uuidv4 } from "uuid";
import {
  type GraphNode,
  type GraphEdge,
  type NodeMetadata,
  type EdgeMetadata,
  type GraphSnapshot,
  type GraphStats,
  type TraversalOptions,
  NodeType,
  EdgeType,
  GraphEvent,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function makeNodeMeta(source: string, importance = 0.5): NodeMetadata {
  const now = nowIso();
  return {
    createdAt: now,
    updatedAt: now,
    source,
    version: 1,
    tags: [],
    importance,
  };
}

function makeEdgeMeta(source: string, confidence = 1.0): EdgeMetadata {
  const now = nowIso();
  return { createdAt: now, updatedAt: now, source, confidence };
}

// ---------------------------------------------------------------------------
// EventEmitter types
// ---------------------------------------------------------------------------

type GraphEvents = {
  [GraphEvent.NodeAdded]: [node: GraphNode];
  [GraphEvent.NodeUpdated]: [node: GraphNode];
  [GraphEvent.NodeRemoved]: [nodeId: string];
  [GraphEvent.EdgeAdded]: [edge: GraphEdge];
  [GraphEvent.EdgeUpdated]: [edge: GraphEdge];
  [GraphEvent.EdgeRemoved]: [edgeId: string];
  [GraphEvent.GraphCleared]: [];
  [GraphEvent.GraphSynced]: [stats: GraphStats];
  [GraphEvent.SubgraphExtracted]: [nodeIds: string[]];
};

// ---------------------------------------------------------------------------
// Main class
// ---------------------------------------------------------------------------

/**
 * In-memory, event-driven knowledge graph.
 *
 * Always contains at least the EstateWise domain seed data.
 * Every public mutation emits a typed event so consumers can react
 * (e.g. debounced Neo4j sync, cache invalidation, UI updates).
 */
export class KnowledgeGraph extends EventEmitter<GraphEvents> {
  private readonly _nodes = new Map<string, GraphNode>();
  private readonly _edges = new Map<string, GraphEdge>();

  /** outgoing[sourceId] = Set of edge IDs */
  private readonly _outgoing = new Map<string, Set<string>>();
  /** incoming[targetId] = Set of edge IDs */
  private readonly _incoming = new Map<string, Set<string>>();

  constructor() {
    super();
    this.seed();
  }

  // -------------------------------------------------------------------------
  // Node CRUD
  // -------------------------------------------------------------------------

  /**
   * Add a node to the graph.
   * If a node with the same ID already exists it is silently overwritten.
   * @returns The added node.
   */
  addNode(
    node: Omit<GraphNode, "metadata"> & { metadata?: Partial<NodeMetadata> },
  ): GraphNode {
    const full: GraphNode = {
      ...node,
      metadata: {
        ...makeNodeMeta("user"),
        ...(node.metadata ?? {}),
      },
    };
    this._nodes.set(full.id, full);
    if (!this._outgoing.has(full.id)) this._outgoing.set(full.id, new Set());
    if (!this._incoming.has(full.id)) this._incoming.set(full.id, new Set());
    this.emit(GraphEvent.NodeAdded, full);
    return full;
  }

  /**
   * Update an existing node with a partial patch.
   * The version counter and updatedAt timestamp are bumped automatically.
   * @throws If the node does not exist.
   */
  updateNode(id: string, patch: Partial<Omit<GraphNode, "id">>): GraphNode {
    const existing = this._nodes.get(id);
    if (!existing) throw new Error(`Node not found: ${id}`);
    const updated: GraphNode = {
      ...existing,
      ...patch,
      id, // never mutate the ID
      metadata: {
        ...existing.metadata,
        ...(patch.metadata ?? {}),
        updatedAt: nowIso(),
        version: existing.metadata.version + 1,
      },
    };
    this._nodes.set(id, updated);
    this.emit(GraphEvent.NodeUpdated, updated);
    return updated;
  }

  /**
   * Remove a node and all edges incident to it.
   * @returns true if the node was present and removed.
   */
  removeNode(id: string): boolean {
    if (!this._nodes.has(id)) return false;

    // Remove all edges that touch this node
    const allEdgeIds = new Set([
      ...(this._outgoing.get(id) ?? []),
      ...(this._incoming.get(id) ?? []),
    ]);
    for (const eid of allEdgeIds) {
      this._removeEdgeById(eid, /* silent */ false);
    }

    this._nodes.delete(id);
    this._outgoing.delete(id);
    this._incoming.delete(id);
    this.emit(GraphEvent.NodeRemoved, id);
    return true;
  }

  /** Look up a node by ID. Returns undefined if absent. */
  getNode(id: string): GraphNode | undefined {
    return this._nodes.get(id);
  }

  /** Returns true if the node exists. */
  hasNode(id: string): boolean {
    return this._nodes.has(id);
  }

  /** Return all nodes as an array. */
  getNodes(): GraphNode[] {
    return Array.from(this._nodes.values());
  }

  /** Return all nodes whose type matches the given NodeType. */
  getNodesByType(type: NodeType): GraphNode[] {
    return this.getNodes().filter((n) => n.type === type);
  }

  /**
   * Find nodes matching an arbitrary predicate.
   * @param predicate - Return true to include the node.
   */
  findNodes(predicate: (node: GraphNode) => boolean): GraphNode[] {
    return this.getNodes().filter(predicate);
  }

  // -------------------------------------------------------------------------
  // Edge CRUD
  // -------------------------------------------------------------------------

  /**
   * Add a directed edge between two existing nodes.
   * If either endpoint does not exist an error is thrown.
   * @returns The added edge.
   */
  addEdge(
    edge: Omit<GraphEdge, "id" | "metadata"> & {
      id?: string;
      metadata?: Partial<EdgeMetadata>;
    },
  ): GraphEdge {
    if (!this._nodes.has(edge.source)) {
      throw new Error(`Source node not found: ${edge.source}`);
    }
    if (!this._nodes.has(edge.target)) {
      throw new Error(`Target node not found: ${edge.target}`);
    }
    const id = edge.id ?? uuidv4();
    const full: GraphEdge = {
      ...edge,
      id,
      metadata: {
        ...makeEdgeMeta("user"),
        ...(edge.metadata ?? {}),
      },
    };
    this._edges.set(id, full);

    // Maintain adjacency
    let out = this._outgoing.get(edge.source);
    if (!out) {
      out = new Set();
      this._outgoing.set(edge.source, out);
    }
    out.add(id);

    let inc = this._incoming.get(edge.target);
    if (!inc) {
      inc = new Set();
      this._incoming.set(edge.target, inc);
    }
    inc.add(id);

    this.emit(GraphEvent.EdgeAdded, full);
    return full;
  }

  /**
   * Update an existing edge with a partial patch.
   * @throws If the edge does not exist.
   */
  updateEdge(id: string, patch: Partial<Omit<GraphEdge, "id">>): GraphEdge {
    const existing = this._edges.get(id);
    if (!existing) throw new Error(`Edge not found: ${id}`);
    const updated: GraphEdge = {
      ...existing,
      ...patch,
      id,
      metadata: {
        ...existing.metadata,
        ...(patch.metadata ?? {}),
        updatedAt: nowIso(),
      },
    };
    this._edges.set(id, updated);
    this.emit(GraphEvent.EdgeUpdated, updated);
    return updated;
  }

  /**
   * Remove an edge by ID.
   * @returns true if the edge was present and removed.
   */
  removeEdge(id: string): boolean {
    return this._removeEdgeById(id, true);
  }

  private _removeEdgeById(id: string, emit: boolean): boolean {
    const edge = this._edges.get(id);
    if (!edge) return false;
    this._outgoing.get(edge.source)?.delete(id);
    this._incoming.get(edge.target)?.delete(id);
    this._edges.delete(id);
    if (emit) this.emit(GraphEvent.EdgeRemoved, id);
    return true;
  }

  /** Look up an edge by ID. Returns undefined if absent. */
  getEdge(id: string): GraphEdge | undefined {
    return this._edges.get(id);
  }

  /** Returns true if the edge exists. */
  hasEdge(id: string): boolean {
    return this._edges.has(id);
  }

  /** Return all edges as an array. */
  getEdges(): GraphEdge[] {
    return Array.from(this._edges.values());
  }

  /**
   * Return all edges whose source is `fromId` and target is `toId`.
   * Direction is exact (source→target).
   */
  getEdgesBetween(fromId: string, toId: string): GraphEdge[] {
    const ids = this._outgoing.get(fromId) ?? new Set<string>();
    return Array.from(ids)
      .map((eid) => this._edges.get(eid)!)
      .filter((e) => e.target === toId);
  }

  /**
   * Find edges matching an arbitrary predicate.
   * @param predicate - Return true to include the edge.
   */
  findEdges(predicate: (edge: GraphEdge) => boolean): GraphEdge[] {
    return this.getEdges().filter(predicate);
  }

  // -------------------------------------------------------------------------
  // Neighbourhood / degree helpers
  // -------------------------------------------------------------------------

  /**
   * Return neighbour node IDs reachable from `nodeId`.
   * @param direction - "outgoing" follows source→target, "incoming" follows target→source, "both" follows either.
   * @param options   - Optional traversal options applied to edge filtering.
   */
  getNeighbors(
    nodeId: string,
    direction: TraversalOptions["direction"] = "both",
  ): string[] {
    const seen = new Set<string>();

    if (direction === "outgoing" || direction === "both") {
      for (const eid of this._outgoing.get(nodeId) ?? []) {
        const e = this._edges.get(eid);
        if (e) seen.add(e.target);
      }
    }
    if (direction === "incoming" || direction === "both") {
      for (const eid of this._incoming.get(nodeId) ?? []) {
        const e = this._edges.get(eid);
        if (e) seen.add(e.source);
      }
    }
    return Array.from(seen);
  }

  /** Total degree (in-degree + out-degree) of a node. */
  getDegree(nodeId: string): number {
    return this.getInDegree(nodeId) + this.getOutDegree(nodeId);
  }

  /** Number of edges whose target is this node. */
  getInDegree(nodeId: string): number {
    return this._incoming.get(nodeId)?.size ?? 0;
  }

  /** Number of edges whose source is this node. */
  getOutDegree(nodeId: string): number {
    return this._outgoing.get(nodeId)?.size ?? 0;
  }

  // -------------------------------------------------------------------------
  // Adjacency access (used by traversal algorithms)
  // -------------------------------------------------------------------------

  /** @internal Read-only view of the outgoing adjacency map. */
  get outgoing(): ReadonlyMap<string, ReadonlySet<string>> {
    return this._outgoing;
  }

  /** @internal Read-only view of the incoming adjacency map. */
  get incoming(): ReadonlyMap<string, ReadonlySet<string>> {
    return this._incoming;
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /** Compute and return aggregate statistics for the current graph state. */
  getStats(): GraphStats {
    const nodeCount = this._nodes.size;
    const edgeCount = this._edges.size;

    const nodesByType: Record<string, number> = {};
    for (const n of this._nodes.values()) {
      nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const e of this._edges.values()) {
      edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
    }

    const totalDegree = Array.from(this._nodes.keys()).reduce(
      (sum, id) => sum + this.getDegree(id),
      0,
    );
    const avgDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    const maxEdges = nodeCount > 1 ? nodeCount * (nodeCount - 1) : 1;
    const density = edgeCount / maxEdges;

    const connectedComponents = this._countConnectedComponents();

    return {
      nodeCount,
      edgeCount,
      nodesByType,
      edgesByType,
      avgDegree,
      density,
      connectedComponents,
    };
  }

  private _countConnectedComponents(): number {
    const visited = new Set<string>();
    let count = 0;
    for (const id of this._nodes.keys()) {
      if (!visited.has(id)) {
        count++;
        const queue = [id];
        while (queue.length > 0) {
          const cur = queue.shift()!;
          if (visited.has(cur)) continue;
          visited.add(cur);
          for (const nb of this.getNeighbors(cur, "both")) {
            if (!visited.has(nb)) queue.push(nb);
          }
        }
      }
    }
    return count;
  }

  // -------------------------------------------------------------------------
  // Serialisation
  // -------------------------------------------------------------------------

  /**
   * Serialise the full graph to a snapshot object suitable for JSON storage.
   */
  toSnapshot(): GraphSnapshot {
    return {
      version: "1.0.0",
      timestamp: nowIso(),
      nodes: Array.from(this._nodes.values()),
      edges: Array.from(this._edges.values()),
      stats: this.getStats(),
    };
  }

  /**
   * Restore graph state from a previously serialised snapshot.
   * The existing graph is REPLACED — use `merge()` to combine.
   */
  fromSnapshot(snapshot: GraphSnapshot): void {
    this.clear(/* silent */ true);
    for (const node of snapshot.nodes) {
      this._nodes.set(node.id, node);
      if (!this._outgoing.has(node.id)) this._outgoing.set(node.id, new Set());
      if (!this._incoming.has(node.id)) this._incoming.set(node.id, new Set());
    }
    for (const edge of snapshot.edges) {
      this._edges.set(edge.id, edge);
      let out = this._outgoing.get(edge.source);
      if (!out) {
        out = new Set();
        this._outgoing.set(edge.source, out);
      }
      out.add(edge.id);
      let inc = this._incoming.get(edge.target);
      if (!inc) {
        inc = new Set();
        this._incoming.set(edge.target, inc);
      }
      inc.add(edge.id);
    }
    this.emit(GraphEvent.GraphSynced, this.getStats());
  }

  // -------------------------------------------------------------------------
  // Graph operations
  // -------------------------------------------------------------------------

  /**
   * Remove all nodes and edges.
   * @param silent - When true, the GraphCleared event is suppressed (used internally by fromSnapshot).
   */
  clear(silent = false): void {
    this._nodes.clear();
    this._edges.clear();
    this._outgoing.clear();
    this._incoming.clear();
    if (!silent) this.emit(GraphEvent.GraphCleared);
  }

  /**
   * Merge another graph into this one.
   * Existing nodes/edges are overwritten by those in `other` when IDs collide.
   */
  merge(other: KnowledgeGraph): void {
    for (const node of other.getNodes()) {
      this._nodes.set(node.id, node);
      if (!this._outgoing.has(node.id)) this._outgoing.set(node.id, new Set());
      if (!this._incoming.has(node.id)) this._incoming.set(node.id, new Set());
    }
    for (const edge of other.getEdges()) {
      this._edges.set(edge.id, edge);
      let out = this._outgoing.get(edge.source);
      if (!out) {
        out = new Set();
        this._outgoing.set(edge.source, out);
      }
      out.add(edge.id);
      let inc = this._incoming.get(edge.target);
      if (!inc) {
        inc = new Set();
        this._incoming.set(edge.target, inc);
      }
      inc.add(edge.id);
    }
  }

  /**
   * Extract a subgraph containing only the specified nodes and all edges
   * whose both endpoints are in that set.
   * @param nodeIds - IDs of nodes to include.
   * @returns A new KnowledgeGraph instance with those nodes and induced edges.
   *          The new graph is NOT seeded — it reflects exactly the subset requested.
   */
  getSubgraph(nodeIds: string[]): KnowledgeGraph {
    const set = new Set(nodeIds);
    // Create an empty graph without triggering seed() by initialising fields directly
    // before assigning to a KnowledgeGraph reference (avoids the constructor call).
    const sub: KnowledgeGraph = Object.create(
      KnowledgeGraph.prototype,
    ) as KnowledgeGraph;
    // Initialise EventEmitter3 internals manually (compatible with EE3 v5)
    (sub as unknown as Record<string, unknown>)["_events"] = Object.create(
      null,
    ) as Record<string, unknown>;
    (sub as unknown as Record<string, unknown>)["_eventsCount"] = 0;
    (sub as unknown as { _nodes: Map<string, GraphNode> })["_nodes"] =
      new Map();
    (sub as unknown as { _edges: Map<string, GraphEdge> })["_edges"] =
      new Map();
    (sub as unknown as { _outgoing: Map<string, Set<string>> })["_outgoing"] =
      new Map();
    (sub as unknown as { _incoming: Map<string, Set<string>> })["_incoming"] =
      new Map();

    for (const id of set) {
      const node = this._nodes.get(id);
      if (node) {
        sub["_nodes"].set(id, node);
        sub["_outgoing"].set(id, new Set());
        sub["_incoming"].set(id, new Set());
      }
    }
    for (const edge of this._edges.values()) {
      if (set.has(edge.source) && set.has(edge.target)) {
        sub["_edges"].set(edge.id, edge);
        sub["_outgoing"].get(edge.source)!.add(edge.id);
        sub["_incoming"].get(edge.target)!.add(edge.id);
      }
    }
    sub.emit(GraphEvent.SubgraphExtracted, nodeIds);
    return sub;
  }

  // -------------------------------------------------------------------------
  // Domain seed data
  // -------------------------------------------------------------------------

  /**
   * Populate the graph with EstateWise domain knowledge.
   * Creates ~30 nodes and ~50 edges covering concepts, topics, agents, tools, and workflows.
   * Called automatically by the constructor when the graph is empty.
   * Calling it again on a non-empty graph is a no-op.
   */
  seed(): void {
    if (this._nodes.size > 0) return;

    const now = nowIso();
    const meta = (importance: number, tags: string[]): NodeMetadata => ({
      createdAt: now,
      updatedAt: now,
      source: "seed",
      version: 1,
      tags,
      importance,
    });
    const emeta = (confidence: number): EdgeMetadata => ({
      createdAt: now,
      updatedAt: now,
      source: "seed",
      confidence,
    });

    // ------------------------------------------------------------------
    // Helper — add without triggering the addNode event flood at startup
    // ------------------------------------------------------------------
    const n = (
      id: string,
      type: NodeType,
      label: string,
      importance: number,
      tags: string[],
      props: Record<string, unknown> = {},
    ): void => {
      const node: GraphNode = {
        id,
        type,
        label,
        properties: props,
        metadata: meta(importance, tags),
      };
      this._nodes.set(id, node);
      this._outgoing.set(id, new Set());
      this._incoming.set(id, new Set());
    };

    const e = (
      sourceId: string,
      targetId: string,
      type: EdgeType,
      weight: number,
      confidence = 1.0,
      props: Record<string, unknown> = {},
    ): void => {
      const id = uuidv4();
      const edge: GraphEdge = {
        id,
        source: sourceId,
        target: targetId,
        type,
        weight,
        properties: props,
        metadata: emeta(confidence),
      };
      this._edges.set(id, edge);
      this._outgoing.get(sourceId)!.add(id);
      this._incoming.get(targetId)!.add(id);
    };

    // ------------------------------------------------------------------
    // Concept nodes — real-estate domain knowledge
    // ------------------------------------------------------------------
    n(
      "concept:property-valuation",
      NodeType.Concept,
      "Property Valuation",
      0.95,
      ["valuation", "pricing"],
    );
    n("concept:market-analysis", NodeType.Concept, "Market Analysis", 0.95, [
      "market",
      "analytics",
    ]);
    n("concept:mortgage", NodeType.Concept, "Mortgage Calculator", 0.9, [
      "finance",
      "mortgage",
    ]);
    n("concept:investment-roi", NodeType.Concept, "Investment ROI", 0.88, [
      "investment",
      "finance",
    ]);
    n("concept:comparable-sales", NodeType.Concept, "Comparable Sales", 0.85, [
      "valuation",
      "comps",
    ]);
    n(
      "concept:price-per-sqft",
      NodeType.Concept,
      "Price Per Square Foot",
      0.8,
      ["pricing", "metrics"],
    );
    n("concept:days-on-market", NodeType.Concept, "Days on Market", 0.78, [
      "market",
      "metrics",
    ]);
    n(
      "concept:appreciation-rate",
      NodeType.Concept,
      "Appreciation Rate",
      0.82,
      ["investment", "market"],
    );
    n("concept:property-tax", NodeType.Concept, "Property Tax", 0.75, [
      "finance",
      "tax",
    ]);
    n("concept:hoa-fees", NodeType.Concept, "HOA Fees", 0.7, [
      "finance",
      "hoa",
    ]);
    n("concept:school-district", NodeType.Concept, "School District", 0.8, [
      "neighborhood",
      "schools",
    ]);
    n("concept:crime-rate", NodeType.Concept, "Crime Rate", 0.78, [
      "neighborhood",
      "safety",
    ]);
    n("concept:walk-score", NodeType.Concept, "Walk Score", 0.75, [
      "neighborhood",
      "walkability",
    ]);
    n("concept:commute-time", NodeType.Concept, "Commute Time", 0.77, [
      "neighborhood",
      "commute",
    ]);

    // ------------------------------------------------------------------
    // Topic nodes
    // ------------------------------------------------------------------
    n("topic:residential", NodeType.Topic, "Residential Real Estate", 0.95, [
      "real-estate",
      "residential",
    ]);
    n("topic:commercial", NodeType.Topic, "Commercial Real Estate", 0.88, [
      "real-estate",
      "commercial",
    ]);
    n("topic:market-trends", NodeType.Topic, "Market Trends", 0.9, [
      "market",
      "trends",
    ]);
    n("topic:financial-planning", NodeType.Topic, "Financial Planning", 0.85, [
      "finance",
      "planning",
    ]);
    n(
      "topic:neighborhood-analysis",
      NodeType.Topic,
      "Neighborhood Analysis",
      0.88,
      ["neighborhood", "analysis"],
    );
    n("topic:property-search", NodeType.Topic, "Property Search", 0.92, [
      "search",
      "properties",
    ]);

    // ------------------------------------------------------------------
    // Agent nodes — one per AI agent in the agentic-ai runtime
    // ------------------------------------------------------------------
    n("agent:planner", NodeType.Agent, "Planner", 0.95, [
      "agent",
      "orchestration",
    ]);
    n("agent:coordinator", NodeType.Agent, "Coordinator", 0.93, [
      "agent",
      "orchestration",
    ]);
    n("agent:graph-analyst", NodeType.Agent, "GraphAnalyst", 0.88, [
      "agent",
      "graph",
    ]);
    n("agent:property-analyst", NodeType.Agent, "PropertyAnalyst", 0.9, [
      "agent",
      "properties",
    ]);
    n("agent:map-analyst", NodeType.Agent, "MapAnalyst", 0.85, [
      "agent",
      "map",
    ]);
    n("agent:reporter", NodeType.Agent, "Reporter", 0.82, [
      "agent",
      "reporting",
    ]);
    n("agent:finance-analyst", NodeType.Agent, "FinanceAnalyst", 0.87, [
      "agent",
      "finance",
    ]);
    n("agent:zpid-finder", NodeType.Agent, "ZpidFinder", 0.8, [
      "agent",
      "search",
    ]);
    n("agent:analytics-analyst", NodeType.Agent, "AnalyticsAnalyst", 0.83, [
      "agent",
      "analytics",
    ]);
    n("agent:dedupe-ranking", NodeType.Agent, "DedupeRanking", 0.78, [
      "agent",
      "dedup",
    ]);
    n("agent:compliance", NodeType.Agent, "Compliance", 0.85, [
      "agent",
      "compliance",
    ]);

    // ------------------------------------------------------------------
    // Tool nodes — key MCP tools
    // ------------------------------------------------------------------
    n("tool:graph-similar", NodeType.Tool, "graph.similar", 0.88, [
      "tool",
      "graph",
    ]);
    n("tool:graph-explain", NodeType.Tool, "graph.explain", 0.85, [
      "tool",
      "graph",
    ]);
    n("tool:properties-search", NodeType.Tool, "properties.search", 0.92, [
      "tool",
      "search",
    ]);
    n("tool:properties-lookup", NodeType.Tool, "properties.lookup", 0.9, [
      "tool",
      "properties",
    ]);
    n(
      "tool:analytics-summarize",
      NodeType.Tool,
      "analytics.summarizeSearch",
      0.87,
      ["tool", "analytics"],
    );
    n("tool:finance-mortgage", NodeType.Tool, "finance.mortgage", 0.88, [
      "tool",
      "finance",
    ]);
    n("tool:map-link-zpids", NodeType.Tool, "map.linkForZpids", 0.83, [
      "tool",
      "map",
    ]);

    // ------------------------------------------------------------------
    // Workflow nodes
    // ------------------------------------------------------------------
    n(
      "workflow:property-search",
      NodeType.Workflow,
      "Property Search Flow",
      0.92,
      ["workflow", "search"],
    );
    n(
      "workflow:market-research",
      NodeType.Workflow,
      "Market Research Flow",
      0.9,
      ["workflow", "market"],
    );
    n(
      "workflow:financial-analysis",
      NodeType.Workflow,
      "Financial Analysis Flow",
      0.88,
      ["workflow", "finance"],
    );
    n(
      "workflow:compliance-check",
      NodeType.Workflow,
      "Compliance Check Flow",
      0.85,
      ["workflow", "compliance"],
    );

    // ------------------------------------------------------------------
    // Concept ↔ Topic relationships
    // ------------------------------------------------------------------
    e(
      "concept:property-valuation",
      "topic:residential",
      EdgeType.PART_OF,
      0.95,
    );
    e(
      "concept:comparable-sales",
      "concept:property-valuation",
      EdgeType.RELATED_TO,
      0.9,
    );
    e(
      "concept:price-per-sqft",
      "concept:property-valuation",
      EdgeType.RELATED_TO,
      0.88,
    );
    e(
      "concept:days-on-market",
      "concept:market-analysis",
      EdgeType.RELATED_TO,
      0.85,
    );
    e(
      "concept:appreciation-rate",
      "concept:market-analysis",
      EdgeType.RELATED_TO,
      0.87,
    );
    e("concept:market-analysis", "topic:market-trends", EdgeType.PART_OF, 0.9);
    e("concept:mortgage", "topic:financial-planning", EdgeType.PART_OF, 0.92);
    e(
      "concept:investment-roi",
      "topic:financial-planning",
      EdgeType.PART_OF,
      0.88,
    );
    e(
      "concept:property-tax",
      "topic:financial-planning",
      EdgeType.RELATED_TO,
      0.8,
    );
    e(
      "concept:hoa-fees",
      "topic:financial-planning",
      EdgeType.RELATED_TO,
      0.75,
    );
    e(
      "concept:school-district",
      "topic:neighborhood-analysis",
      EdgeType.PART_OF,
      0.85,
    );
    e(
      "concept:crime-rate",
      "topic:neighborhood-analysis",
      EdgeType.PART_OF,
      0.82,
    );
    e(
      "concept:walk-score",
      "topic:neighborhood-analysis",
      EdgeType.PART_OF,
      0.8,
    );
    e(
      "concept:commute-time",
      "topic:neighborhood-analysis",
      EdgeType.PART_OF,
      0.78,
    );
    e("topic:property-search", "topic:residential", EdgeType.RELATED_TO, 0.85);
    e(
      "concept:investment-roi",
      "concept:appreciation-rate",
      EdgeType.DEPENDS_ON,
      0.83,
    );
    e(
      "concept:investment-roi",
      "concept:property-tax",
      EdgeType.DEPENDS_ON,
      0.75,
    );
    e("concept:investment-roi", "concept:hoa-fees", EdgeType.DEPENDS_ON, 0.7);

    // ------------------------------------------------------------------
    // Agent capabilities — HAS_CAPABILITY → Tool
    // ------------------------------------------------------------------
    e("agent:planner", "agent:coordinator", EdgeType.PRECEDES, 0.95);
    e("agent:coordinator", "agent:graph-analyst", EdgeType.PRECEDES, 0.9);
    e("agent:coordinator", "agent:property-analyst", EdgeType.PRECEDES, 0.9);
    e("agent:coordinator", "agent:map-analyst", EdgeType.PRECEDES, 0.85);
    e("agent:coordinator", "agent:finance-analyst", EdgeType.PRECEDES, 0.85);
    e("agent:coordinator", "agent:compliance", EdgeType.PRECEDES, 0.82);
    e("agent:coordinator", "agent:reporter", EdgeType.PRECEDES, 0.88);

    e(
      "agent:graph-analyst",
      "tool:graph-similar",
      EdgeType.HAS_CAPABILITY,
      0.95,
    );
    e(
      "agent:graph-analyst",
      "tool:graph-explain",
      EdgeType.HAS_CAPABILITY,
      0.9,
    );
    e(
      "agent:property-analyst",
      "tool:properties-search",
      EdgeType.HAS_CAPABILITY,
      0.95,
    );
    e(
      "agent:property-analyst",
      "tool:properties-lookup",
      EdgeType.HAS_CAPABILITY,
      0.92,
    );
    e(
      "agent:analytics-analyst",
      "tool:analytics-summarize",
      EdgeType.HAS_CAPABILITY,
      0.9,
    );
    e(
      "agent:finance-analyst",
      "tool:finance-mortgage",
      EdgeType.HAS_CAPABILITY,
      0.95,
    );
    e(
      "agent:map-analyst",
      "tool:map-link-zpids",
      EdgeType.HAS_CAPABILITY,
      0.88,
    );
    e(
      "agent:zpid-finder",
      "tool:properties-search",
      EdgeType.HAS_CAPABILITY,
      0.85,
    );
    e(
      "agent:dedupe-ranking",
      "tool:analytics-summarize",
      EdgeType.HAS_CAPABILITY,
      0.75,
    );

    // ------------------------------------------------------------------
    // Workflow → Agent: USES
    // ------------------------------------------------------------------
    e("workflow:property-search", "agent:planner", EdgeType.USES, 0.95);
    e("workflow:property-search", "agent:zpid-finder", EdgeType.USES, 0.9);
    e(
      "workflow:property-search",
      "agent:property-analyst",
      EdgeType.USES,
      0.92,
    );
    e("workflow:property-search", "agent:dedupe-ranking", EdgeType.USES, 0.8);
    e("workflow:property-search", "agent:reporter", EdgeType.USES, 0.85);

    e("workflow:market-research", "agent:planner", EdgeType.USES, 0.95);
    e("workflow:market-research", "agent:graph-analyst", EdgeType.USES, 0.92);
    e(
      "workflow:market-research",
      "agent:analytics-analyst",
      EdgeType.USES,
      0.88,
    );
    e("workflow:market-research", "agent:reporter", EdgeType.USES, 0.82);

    e("workflow:financial-analysis", "agent:planner", EdgeType.USES, 0.95);
    e(
      "workflow:financial-analysis",
      "agent:finance-analyst",
      EdgeType.USES,
      0.95,
    );
    e(
      "workflow:financial-analysis",
      "agent:property-analyst",
      EdgeType.USES,
      0.85,
    );
    e("workflow:financial-analysis", "agent:reporter", EdgeType.USES, 0.8);

    e("workflow:compliance-check", "agent:planner", EdgeType.USES, 0.9);
    e("workflow:compliance-check", "agent:compliance", EdgeType.USES, 0.95);
    e("workflow:compliance-check", "agent:reporter", EdgeType.USES, 0.82);

    // ------------------------------------------------------------------
    // Tool → Concept: PRODUCES / MENTIONS
    // ------------------------------------------------------------------
    e(
      "tool:graph-similar",
      "concept:comparable-sales",
      EdgeType.PRODUCES,
      0.92,
    );
    e(
      "tool:properties-search",
      "concept:property-valuation",
      EdgeType.MENTIONS,
      0.85,
    );
    e(
      "tool:analytics-summarize",
      "concept:market-analysis",
      EdgeType.PRODUCES,
      0.9,
    );
    e("tool:finance-mortgage", "concept:mortgage", EdgeType.PRODUCES, 0.95);
    e("tool:map-link-zpids", "concept:commute-time", EdgeType.MENTIONS, 0.75);
  }
}
