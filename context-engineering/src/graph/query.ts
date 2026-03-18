/**
 * Fluent query builder for the EstateWise knowledge graph.
 *
 * Usage example:
 * ```ts
 * const result = query(graph)
 *   .match(NodeType.Property)
 *   .where({ "properties.price": { $gt: 500000 } })
 *   .traverse(EdgeType.SIMILAR_TO, { maxDepth: 2 })
 *   .orderBy("metadata.importance", "desc")
 *   .limit(10)
 *   .execute();
 * ```
 */

import { KnowledgeGraph } from "./KnowledgeGraph.js";
import { bfs } from "./traversal.js";
import {
  type GraphNode,
  type GraphEdge,
  type QueryResult,
  type TraversalOptions,
  NodeType,
  EdgeType,
} from "./types.js";

// ---------------------------------------------------------------------------
// Filter operator types
// ---------------------------------------------------------------------------

/** Supported filter operators. */
export type FilterOperator =
  | { $gt: number }
  | { $lt: number }
  | { $gte: number }
  | { $lte: number }
  | { $eq: unknown }
  | { $ne: unknown }
  | { $contains: string }
  | { $in: unknown[] };

/** A filter map: field-path → operator object or a literal equality value. */
export type FilterMap = Record<string, FilterOperator | unknown>;

// ---------------------------------------------------------------------------
// Field-path resolver
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated path against an object.
 * E.g. "properties.price" against a GraphNode returns node.properties.price.
 */
function resolvePath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((cur, key) => {
    if (cur !== null && cur !== undefined && typeof cur === "object") {
      return (cur as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

/**
 * Determine whether `value` satisfies the filter spec.
 */
function matchesOperator(
  value: unknown,
  spec: FilterOperator | unknown,
): boolean {
  if (spec === null || spec === undefined || typeof spec !== "object") {
    return value === spec;
  }

  const s = spec as Record<string, unknown>;

  if ("$gt" in s)
    return typeof value === "number" && value > (s["$gt"] as number);
  if ("$lt" in s)
    return typeof value === "number" && value < (s["$lt"] as number);
  if ("$gte" in s)
    return typeof value === "number" && value >= (s["$gte"] as number);
  if ("$lte" in s)
    return typeof value === "number" && value <= (s["$lte"] as number);
  if ("$eq" in s) return value === s["$eq"];
  if ("$ne" in s) return value !== s["$ne"];
  if ("$contains" in s)
    return (
      typeof value === "string" && value.includes(s["$contains"] as string)
    );
  if ("$in" in s)
    return Array.isArray(s["$in"]) && (s["$in"] as unknown[]).includes(value);

  // Fall back to deep equality for unknown spec shapes
  return value === spec;
}

/**
 * Return true if `node` matches every filter entry.
 */
function nodeMatchesFilter(node: GraphNode, filter: FilterMap): boolean {
  for (const [path, spec] of Object.entries(filter)) {
    const value = resolvePath(node, path);
    if (!matchesOperator(value, spec)) return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

type SortDirection = "asc" | "desc";

function compareNodes(
  a: GraphNode,
  b: GraphNode,
  field: string,
  dir: SortDirection,
): number {
  const av = resolvePath(a, field);
  const bv = resolvePath(b, field);

  let cmp = 0;
  if (typeof av === "number" && typeof bv === "number") {
    cmp = av - bv;
  } else if (typeof av === "string" && typeof bv === "string") {
    cmp = av.localeCompare(bv);
  } else if (av === undefined || av === null) {
    cmp = 1;
  } else if (bv === undefined || bv === null) {
    cmp = -1;
  }

  return dir === "asc" ? cmp : -cmp;
}

// ---------------------------------------------------------------------------
// Internal query state
// ---------------------------------------------------------------------------

interface QueryState {
  nodeType: NodeType | null;
  filter: FilterMap;
  traversalEdgeType: EdgeType | null;
  traversalOptions: TraversalOptions;
  sortField: string | null;
  sortDir: SortDirection;
  limitN: number;
  offsetN: number;
}

// ---------------------------------------------------------------------------
// QueryBuilder
// ---------------------------------------------------------------------------

/**
 * Immutable-ish fluent query builder.
 * Each method returns `this` so calls can be chained.
 * Call `.execute()`, `.count()`, or `.ids()` to materialise.
 */
export class QueryBuilder {
  private readonly graph: KnowledgeGraph;
  private readonly state: QueryState;

  constructor(graph: KnowledgeGraph, state?: Partial<QueryState>) {
    this.graph = graph;
    this.state = {
      nodeType: null,
      filter: {},
      traversalEdgeType: null,
      traversalOptions: {},
      sortField: null,
      sortDir: "asc",
      limitN: Infinity,
      offsetN: 0,
      ...(state ?? {}),
    };
  }

  private clone(patch: Partial<QueryState>): QueryBuilder {
    return new QueryBuilder(this.graph, { ...this.state, ...patch });
  }

  // -------------------------------------------------------------------------
  // Builder methods
  // -------------------------------------------------------------------------

  /**
   * Restrict the initial match to nodes of the given type.
   * If omitted, all node types are eligible.
   */
  match(nodeType?: NodeType): QueryBuilder {
    return this.clone({ nodeType: nodeType ?? null });
  }

  /**
   * Apply a property filter to matched nodes.
   * Multiple calls merge filters (AND semantics).
   *
   * Supported operators:
   *   `{ $gt: n }`, `{ $lt: n }`, `{ $gte: n }`, `{ $lte: n }`,
   *   `{ $eq: v }`, `{ $ne: v }`, `{ $contains: s }`, `{ $in: [v...] }`
   *
   * @example `.where({ "properties.price": { $gt: 500000 } })`
   * @example `.where({ "metadata.importance": { $gte: 0.8 } })`
   */
  where(filter: FilterMap): QueryBuilder {
    return this.clone({ filter: { ...this.state.filter, ...filter } });
  }

  /**
   * After matching nodes, expand the result by following edges of `edgeType`
   * up to `options.maxDepth` hops.  Reached nodes are merged into the result.
   * If `edgeType` is omitted all edge types are followed.
   */
  traverse(edgeType?: EdgeType, options?: TraversalOptions): QueryBuilder {
    return this.clone({
      traversalEdgeType: edgeType ?? null,
      traversalOptions: options ?? {},
    });
  }

  /**
   * Sort the result nodes by a dot-separated field path.
   * @param field     - E.g. "metadata.importance" or "properties.price".
   * @param direction - "asc" (default) or "desc".
   */
  orderBy(field: string, direction: SortDirection = "asc"): QueryBuilder {
    return this.clone({ sortField: field, sortDir: direction });
  }

  /**
   * Limit the number of nodes returned.
   */
  limit(n: number): QueryBuilder {
    return this.clone({ limitN: n });
  }

  /**
   * Skip the first `n` nodes after sorting.
   */
  offset(n: number): QueryBuilder {
    return this.clone({ offsetN: n });
  }

  // -------------------------------------------------------------------------
  // Terminal methods
  // -------------------------------------------------------------------------

  /**
   * Execute the query and return a full QueryResult with nodes, edges, and metadata.
   */
  execute(): QueryResult {
    const start = Date.now();

    // 1. Match
    let candidates: GraphNode[];
    if (this.state.nodeType !== null) {
      candidates = this.graph.getNodesByType(this.state.nodeType);
    } else {
      candidates = this.graph.getNodes();
    }
    const nodesScanned = candidates.length;

    // 2. Filter
    if (Object.keys(this.state.filter).length > 0) {
      candidates = candidates.filter((n) =>
        nodeMatchesFilter(n, this.state.filter),
      );
    }

    // 3. Traverse from matched nodes if requested
    let resultNodeIds: Set<string> = new Set(candidates.map((n) => n.id));

    if (
      this.state.traversalEdgeType !== null ||
      Object.keys(this.state.traversalOptions).length > 0
    ) {
      const traversalOpts: TraversalOptions = {
        ...this.state.traversalOptions,
        edgeTypes: this.state.traversalEdgeType
          ? [
              this.state.traversalEdgeType,
              ...(this.state.traversalOptions.edgeTypes ?? []),
            ]
          : this.state.traversalOptions.edgeTypes,
      };

      for (const startId of Array.from(resultNodeIds)) {
        const reached = bfs(this.graph, startId, traversalOpts);
        for (const id of reached) resultNodeIds.add(id);
      }
    }

    // Resolve node objects
    let nodes: GraphNode[] = Array.from(resultNodeIds)
      .map((id) => this.graph.getNode(id))
      .filter((n): n is GraphNode => n !== undefined);

    // 4. Sort
    if (this.state.sortField !== null) {
      const field = this.state.sortField;
      const dir = this.state.sortDir;
      nodes = nodes.sort((a, b) => compareNodes(a, b, field, dir));
    }

    // 5. Offset + Limit
    const end = isFinite(this.state.limitN)
      ? this.state.offsetN + this.state.limitN
      : undefined;
    nodes = nodes.slice(this.state.offsetN, end);

    // 6. Collect edges induced by result nodes
    const nodeIdSet = new Set(nodes.map((n) => n.id));
    const edges: GraphEdge[] = this.graph
      .getEdges()
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target));

    return {
      nodes,
      edges,
      metadata: {
        executionTimeMs: Date.now() - start,
        nodesScanned,
        edgesScanned: this.graph.getEdges().length,
      },
    };
  }

  /**
   * Execute the query and return only the count of matching nodes
   * (after filter, traverse, offset, and limit).
   */
  count(): number {
    return this.execute().nodes.length;
  }

  /**
   * Execute the query and return only the node IDs.
   */
  ids(): string[] {
    return this.execute().nodes.map((n) => n.id);
  }
}

// ---------------------------------------------------------------------------
// Factory function
// ---------------------------------------------------------------------------

/**
 * Create a new QueryBuilder for the given graph.
 *
 * @example
 * ```ts
 * const result = query(graph)
 *   .match(NodeType.Concept)
 *   .where({ "metadata.importance": { $gte: 0.8 } })
 *   .orderBy("metadata.importance", "desc")
 *   .limit(5)
 *   .execute();
 * ```
 */
export function query(graph: KnowledgeGraph): QueryBuilder {
  return new QueryBuilder(graph);
}
