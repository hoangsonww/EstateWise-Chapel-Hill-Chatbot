/**
 * Graph traversal algorithms for the EstateWise knowledge graph.
 *
 * All functions operate on a KnowledgeGraph instance and respect TraversalOptions
 * where applicable (edge type filtering, node type filtering, min-weight, direction).
 * They do NOT mutate the graph.
 */

import { KnowledgeGraph } from "./KnowledgeGraph.js";
import {
  type GraphPath,
  type TraversalOptions,
  type PageRankResult,
  type Community,
  type GraphEdge,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Retrieve edges incident on `nodeId` according to the traversal direction,
 * filtered by edgeTypes and minWeight from `options`.
 */
function incidentEdges(
  graph: KnowledgeGraph,
  nodeId: string,
  options: TraversalOptions,
): GraphEdge[] {
  const direction = options.direction ?? "both";
  const minWeight = options.minWeight ?? 0;
  const edgeTypeSet = options.edgeTypes ? new Set(options.edgeTypes) : null;

  const edgeIds = new Set<string>();

  if (direction === "outgoing" || direction === "both") {
    for (const eid of graph.outgoing.get(nodeId) ?? []) edgeIds.add(eid);
  }
  if (direction === "incoming" || direction === "both") {
    for (const eid of graph.incoming.get(nodeId) ?? []) edgeIds.add(eid);
  }

  const edges: GraphEdge[] = [];
  for (const eid of edgeIds) {
    const e = graph.getEdge(eid);
    if (!e) continue;
    if (e.weight < minWeight) continue;
    if (edgeTypeSet && !edgeTypeSet.has(e.type)) continue;
    edges.push(e);
  }
  return edges;
}

/**
 * Given an edge and the node we arrived from, return the neighbour node ID.
 */
function neighborOf(edge: GraphEdge, fromId: string): string {
  return edge.source === fromId ? edge.target : edge.source;
}

/**
 * Check whether a node passes the nodeTypes filter in options.
 */
function passesNodeFilter(
  graph: KnowledgeGraph,
  nodeId: string,
  options: TraversalOptions,
): boolean {
  if (!options.nodeTypes || options.nodeTypes.length === 0) return true;
  const node = graph.getNode(nodeId);
  if (!node) return false;
  return options.nodeTypes.includes(node.type);
}

// ---------------------------------------------------------------------------
// BFS
// ---------------------------------------------------------------------------

/**
 * Breadth-first search starting from `startId`.
 *
 * @param graph   - The knowledge graph to search.
 * @param startId - ID of the start node.
 * @param options - Optional traversal constraints.
 * @returns Array of visited node IDs in BFS discovery order (startId first).
 */
export function bfs(
  graph: KnowledgeGraph,
  startId: string,
  options: TraversalOptions = {},
): string[] {
  if (!graph.hasNode(startId)) return [];

  const maxDepth = options.maxDepth ?? Infinity;
  const maxNodes = options.maxNodes ?? Infinity;

  const visited = new Set<string>();
  const result: string[] = [];
  const queue: Array<{ id: string; depth: number }> = [
    { id: startId, depth: 0 },
  ];

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (visited.has(item.id)) continue;
    if (!passesNodeFilter(graph, item.id, options)) continue;

    visited.add(item.id);
    result.push(item.id);
    if (result.length >= maxNodes) break;

    if (item.depth >= maxDepth) continue;

    for (const edge of incidentEdges(graph, item.id, options)) {
      const nb = neighborOf(edge, item.id);
      if (!visited.has(nb)) {
        queue.push({ id: nb, depth: item.depth + 1 });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// DFS
// ---------------------------------------------------------------------------

/**
 * Depth-first search starting from `startId`.
 *
 * @param graph   - The knowledge graph to search.
 * @param startId - ID of the start node.
 * @param options - Optional traversal constraints.
 * @returns Array of visited node IDs in DFS discovery order (startId first).
 */
export function dfs(
  graph: KnowledgeGraph,
  startId: string,
  options: TraversalOptions = {},
): string[] {
  if (!graph.hasNode(startId)) return [];

  const maxDepth = options.maxDepth ?? Infinity;
  const maxNodes = options.maxNodes ?? Infinity;

  const visited = new Set<string>();
  const result: string[] = [];

  const stack: Array<{ id: string; depth: number }> = [
    { id: startId, depth: 0 },
  ];

  while (stack.length > 0) {
    const item = stack.pop()!;
    if (visited.has(item.id)) continue;
    if (!passesNodeFilter(graph, item.id, options)) continue;

    visited.add(item.id);
    result.push(item.id);
    if (result.length >= maxNodes) break;

    if (item.depth >= maxDepth) continue;

    for (const edge of incidentEdges(graph, item.id, options)) {
      const nb = neighborOf(edge, item.id);
      if (!visited.has(nb)) {
        stack.push({ id: nb, depth: item.depth + 1 });
      }
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Dijkstra's shortest path
// ---------------------------------------------------------------------------

/**
 * Find the shortest (minimum cost) path between two nodes using Dijkstra's algorithm.
 * Cost is defined as `1 - edge.weight` so that higher-weight edges are cheaper to traverse.
 *
 * @param graph   - The knowledge graph.
 * @param fromId  - Start node ID.
 * @param toId    - Target node ID.
 * @param options - Optional traversal constraints.
 * @returns GraphPath if reachable, or null if no path exists.
 */
export function shortestPath(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string,
  options: TraversalOptions = {},
): GraphPath | null {
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) return null;
  if (fromId === toId) {
    return { nodes: [fromId], edges: [], totalWeight: 0 };
  }

  // dist[nodeId] = best cost found so far
  const dist = new Map<string, number>();
  // prev[nodeId] = { fromNode, viaEdge }
  const prev = new Map<string, { node: string; edge: string }>();

  for (const node of graph.getNodes()) {
    dist.set(node.id, Infinity);
  }
  dist.set(fromId, 0);

  // Simple priority queue via sorted array (adequate for graph sizes in this domain)
  const pq: Array<{ id: string; cost: number }> = [{ id: fromId, cost: 0 }];

  while (pq.length > 0) {
    pq.sort((a, b) => a.cost - b.cost);
    const { id: current, cost: currentCost } = pq.shift()!;

    if (current === toId) break;
    if (currentCost > (dist.get(current) ?? Infinity)) continue;

    for (const edge of incidentEdges(graph, current, options)) {
      const nb = neighborOf(edge, current);
      const edgeCost = 1 - edge.weight; // invert weight to get cost
      const newCost = currentCost + edgeCost;

      if (newCost < (dist.get(nb) ?? Infinity)) {
        dist.set(nb, newCost);
        prev.set(nb, { node: current, edge: edge.id });
        pq.push({ id: nb, cost: newCost });
      }
    }
  }

  if (!prev.has(toId) && fromId !== toId) return null;

  // Reconstruct path
  const nodeIds: string[] = [];
  const edgeIds: string[] = [];
  let current = toId;

  while (current !== fromId) {
    nodeIds.unshift(current);
    const p = prev.get(current);
    if (!p) return null; // disconnected
    edgeIds.unshift(p.edge);
    current = p.node;
  }
  nodeIds.unshift(fromId);

  const totalWeight = edgeIds.reduce((sum, eid) => {
    return sum + (graph.getEdge(eid)?.weight ?? 0);
  }, 0);

  return { nodes: nodeIds, edges: edgeIds, totalWeight };
}

// ---------------------------------------------------------------------------
// All paths (DFS enumeration)
// ---------------------------------------------------------------------------

/**
 * Enumerate all simple paths from `fromId` to `toId` up to `maxDepth` hops.
 * WARNING: can be expensive on dense graphs — use a sensible maxDepth.
 *
 * @param graph    - The knowledge graph.
 * @param fromId   - Start node ID.
 * @param toId     - Target node ID.
 * @param maxDepth - Maximum path length (number of edges). Default: 5.
 * @returns Array of GraphPath objects.
 */
export function allPaths(
  graph: KnowledgeGraph,
  fromId: string,
  toId: string,
  maxDepth = 5,
): GraphPath[] {
  if (!graph.hasNode(fromId) || !graph.hasNode(toId)) return [];

  const results: GraphPath[] = [];

  function recurse(
    currentId: string,
    visitedNodes: Set<string>,
    pathNodes: string[],
    pathEdges: string[],
    depth: number,
  ): void {
    if (depth > maxDepth) return;
    if (currentId === toId && pathNodes.length > 1) {
      const totalWeight = pathEdges.reduce(
        (s, eid) => s + (graph.getEdge(eid)?.weight ?? 0),
        0,
      );
      results.push({
        nodes: [...pathNodes],
        edges: [...pathEdges],
        totalWeight,
      });
      return;
    }

    for (const edge of incidentEdges(graph, currentId, {})) {
      const nb = neighborOf(edge, currentId);
      if (visitedNodes.has(nb)) continue;

      visitedNodes.add(nb);
      pathNodes.push(nb);
      pathEdges.push(edge.id);

      recurse(nb, visitedNodes, pathNodes, pathEdges, depth + 1);

      pathNodes.pop();
      pathEdges.pop();
      visitedNodes.delete(nb);
    }
  }

  const visited = new Set<string>([fromId]);
  recurse(fromId, visited, [fromId], [], 0);
  return results;
}

// ---------------------------------------------------------------------------
// PageRank
// ---------------------------------------------------------------------------

/** Options for the PageRank algorithm. */
export interface PageRankOptions {
  /** Damping factor (default: 0.85). */
  dampingFactor?: number;
  /** Number of iterations to run (default: 100). */
  iterations?: number;
  /** Convergence tolerance — stop early if max delta < tol (default: 1e-6). */
  tolerance?: number;
}

/**
 * Compute PageRank scores for every node in the graph.
 * Returns results sorted descending by score.
 *
 * @param graph   - The knowledge graph.
 * @param options - PageRank hyperparameters.
 * @returns Array of PageRankResult, highest-scoring node first.
 */
export function pageRank(
  graph: KnowledgeGraph,
  options: PageRankOptions = {},
): PageRankResult[] {
  const d = options.dampingFactor ?? 0.85;
  const maxIter = options.iterations ?? 100;
  const tol = options.tolerance ?? 1e-6;

  const nodes = graph.getNodes();
  const n = nodes.length;
  if (n === 0) return [];

  const initial = 1 / n;
  const scores = new Map<string, number>();
  for (const node of nodes) scores.set(node.id, initial);

  for (let iter = 0; iter < maxIter; iter++) {
    const next = new Map<string, number>();
    for (const node of nodes) next.set(node.id, (1 - d) / n);

    for (const node of nodes) {
      const outEdges = Array.from(graph.outgoing.get(node.id) ?? [])
        .map((eid) => graph.getEdge(eid))
        .filter((e): e is GraphEdge => e !== undefined);

      if (outEdges.length === 0) {
        // Dangling node — distribute evenly
        const share = ((scores.get(node.id) ?? 0) * d) / n;
        for (const n2 of nodes) {
          next.set(n2.id, (next.get(n2.id) ?? 0) + share);
        }
      } else {
        const totalWeight = outEdges.reduce((s, e) => s + e.weight, 0) || 1;
        for (const edge of outEdges) {
          const contribution =
            (scores.get(node.id) ?? 0) * d * (edge.weight / totalWeight);
          next.set(edge.target, (next.get(edge.target) ?? 0) + contribution);
        }
      }
    }

    // Check convergence
    let maxDelta = 0;
    for (const node of nodes) {
      maxDelta = Math.max(
        maxDelta,
        Math.abs((next.get(node.id) ?? 0) - (scores.get(node.id) ?? 0)),
      );
    }
    for (const [id, score] of next) scores.set(id, score);
    if (maxDelta < tol) break;
  }

  return nodes
    .map((node) => ({ nodeId: node.id, score: scores.get(node.id) ?? 0 }))
    .sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// Label propagation community detection
// ---------------------------------------------------------------------------

/**
 * Detect communities using the Label Propagation Algorithm (LPA).
 * Each node starts with a unique label; on each iteration every node
 * adopts the most frequent label among its neighbours.
 *
 * @param graph - The knowledge graph.
 * @returns Array of Community objects.
 */
export function communityDetection(graph: KnowledgeGraph): Community[] {
  const nodes = graph.getNodes();
  if (nodes.length === 0) return [];

  // Each node starts as its own community (label = index)
  const label = new Map<string, number>();
  nodes.forEach((n, i) => label.set(n.id, i));

  const maxIter = 50;
  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    // Shuffle node order each iteration to break ties randomly
    const shuffled = [...nodes].sort(() => Math.random() - 0.5);

    for (const node of shuffled) {
      const neighbors = graph.getNeighbors(node.id, "both");
      if (neighbors.length === 0) continue;

      // Count neighbour labels
      const freq = new Map<number, number>();
      for (const nb of neighbors) {
        const l = label.get(nb) ?? -1;
        freq.set(l, (freq.get(l) ?? 0) + 1);
      }

      // Pick the most frequent label (tie-break: lower label wins)
      let bestLabel = label.get(node.id) ?? 0;
      let bestCount = 0;
      for (const [lbl, count] of freq) {
        if (count > bestCount || (count === bestCount && lbl < bestLabel)) {
          bestCount = count;
          bestLabel = lbl;
        }
      }

      if (bestLabel !== label.get(node.id)) {
        label.set(node.id, bestLabel);
        changed = true;
      }
    }

    if (!changed) break;
  }

  // Group nodes by label
  const groups = new Map<number, string[]>();
  for (const [nodeId, lbl] of label) {
    if (!groups.has(lbl)) groups.set(lbl, []);
    groups.get(lbl)!.push(nodeId);
  }

  let communityId = 0;
  const communities: Community[] = [];
  for (const members of groups.values()) {
    communities.push({ id: communityId++, members, size: members.length });
  }
  return communities.sort((a, b) => b.size - a.size);
}

// ---------------------------------------------------------------------------
// Connected components (union-find / BFS-based)
// ---------------------------------------------------------------------------

/**
 * Find all weakly connected components treating edges as undirected.
 *
 * @param graph - The knowledge graph.
 * @returns Array of arrays, each inner array contains node IDs in one component.
 *          Largest component first.
 */
export function connectedComponents(graph: KnowledgeGraph): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const node of graph.getNodes()) {
    if (visited.has(node.id)) continue;

    const component: string[] = [];
    const queue = [node.id];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      component.push(cur);
      for (const nb of graph.getNeighbors(cur, "both")) {
        if (!visited.has(nb)) queue.push(nb);
      }
    }
    components.push(component);
  }

  return components.sort((a, b) => b.length - a.length);
}

// ---------------------------------------------------------------------------
// Betweenness centrality
// ---------------------------------------------------------------------------

/**
 * Compute betweenness centrality scores for all nodes using Brandes' algorithm
 * (adapted for directed graphs treated as undirected for counting paths).
 *
 * @param graph - The knowledge graph.
 * @returns Map from nodeId to betweenness score (unnormalised).
 */
export function betweennessCentrality(
  graph: KnowledgeGraph,
): Map<string, number> {
  const nodes = graph.getNodes();
  const cb = new Map<string, number>();
  for (const node of nodes) cb.set(node.id, 0);

  for (const s of nodes) {
    const stack: string[] = [];
    const pred = new Map<string, string[]>();
    const sigma = new Map<string, number>();
    const dist = new Map<string, number>();

    for (const node of nodes) {
      pred.set(node.id, []);
      sigma.set(node.id, 0);
      dist.set(node.id, -1);
    }
    sigma.set(s.id, 1);
    dist.set(s.id, 0);

    const queue: string[] = [s.id];
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);
      for (const nb of graph.getNeighbors(v, "both")) {
        // First visit
        if ((dist.get(nb) ?? -1) < 0) {
          queue.push(nb);
          dist.set(nb, (dist.get(v) ?? 0) + 1);
        }
        if ((dist.get(nb) ?? 0) === (dist.get(v) ?? 0) + 1) {
          sigma.set(nb, (sigma.get(nb) ?? 0) + (sigma.get(v) ?? 0));
          pred.get(nb)!.push(v);
        }
      }
    }

    const delta = new Map<string, number>();
    for (const node of nodes) delta.set(node.id, 0);

    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of pred.get(w) ?? []) {
        const sigmaV = sigma.get(v) ?? 1;
        const sigmaW = sigma.get(w) ?? 1;
        const d = (sigmaV / sigmaW) * (1 + (delta.get(w) ?? 0));
        delta.set(v, (delta.get(v) ?? 0) + d);
      }
      if (w !== s.id) {
        cb.set(w, (cb.get(w) ?? 0) + (delta.get(w) ?? 0));
      }
    }
  }

  return cb;
}

// ---------------------------------------------------------------------------
// Neighbourhood expansion
// ---------------------------------------------------------------------------

/**
 * Starting from a set of seed node IDs, expand outward `depth` hops and
 * return all reached nodes and their connecting edges as a subgraph.
 *
 * @param graph   - The knowledge graph.
 * @param nodeIds - Initial seed node IDs.
 * @param depth   - Number of hops to expand. Default: 1.
 * @param options - Optional traversal constraints.
 * @returns A new KnowledgeGraph subgraph (never mutates the source graph).
 */
export function neighborhoodExpansion(
  graph: KnowledgeGraph,
  nodeIds: string[],
  depth = 1,
  options: TraversalOptions = {},
): KnowledgeGraph {
  const frontier = new Set<string>(nodeIds.filter((id) => graph.hasNode(id)));
  const allVisited = new Set<string>(frontier);

  for (let d = 0; d < depth; d++) {
    const nextFrontier = new Set<string>();
    for (const nodeId of frontier) {
      for (const edge of incidentEdges(graph, nodeId, options)) {
        const nb = neighborOf(edge, nodeId);
        if (!allVisited.has(nb) && passesNodeFilter(graph, nb, options)) {
          nextFrontier.add(nb);
          allVisited.add(nb);
        }
      }
    }
    frontier.clear();
    for (const id of nextFrontier) frontier.add(id);
    if (frontier.size === 0) break;
  }

  return graph.getSubgraph(Array.from(allVisited));
}
