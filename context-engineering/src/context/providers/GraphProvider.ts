/**
 * @fileoverview Graph-sourced context provider for the EstateWise Context Engine.
 *
 * Queries the in-memory KnowledgeGraph to surface nodes and their relationships
 * that are relevant to the current user query. Nodes are prioritised by their
 * PageRank-equivalent importance score so the most structurally significant
 * concepts and agents appear first in the context window.
 */

import { randomUUID } from "crypto";
import { KnowledgeGraph } from "../../graph/KnowledgeGraph.js";
import { query } from "../../graph/query.js";
import type { GraphNode, GraphEdge } from "../../graph/types.js";
import { ContextSource, ContextPriority } from "../types.js";
import type {
  ContextItem,
  ContextProvider,
  ContextAssemblyRequest,
} from "../types.js";

/** Maximum number of graph nodes to include in a single context assembly pass. */
const MAX_NODES = 15;
/** Minimum importance threshold for a node to be considered. */
const MIN_IMPORTANCE = 0.6;
/** Maximum edge traversal hops from matched nodes. */
const TRAVERSAL_DEPTH = 2;
/** Approximate characters per token for context item estimation. */
const CHARS_PER_TOKEN = 4;

/**
 * Provides context items sourced from the EstateWise KnowledgeGraph.
 *
 * For each assembly request the provider:
 * 1. Searches nodes whose labels or tags match query tokens.
 * 2. Traverses outgoing and incoming edges up to `TRAVERSAL_DEPTH` hops.
 * 3. Formats nodes and their most relevant relationships as text.
 * 4. Ranks items by node importance (PageRank proxy) descending.
 */
export class GraphProvider implements ContextProvider {
  readonly name = "graph";
  readonly priority = ContextPriority.High;

  private readonly graph: KnowledgeGraph;

  constructor(graph: KnowledgeGraph) {
    this.graph = graph;
  }

  /**
   * Fetches relevant graph nodes and relationship context for the given query.
   *
   * @param request - The full assembly request including the query string.
   * @returns Context items representing graph nodes and their relationships.
   */
  async getContext(request: ContextAssemblyRequest): Promise<ContextItem[]> {
    const tokens = this._tokenize(request.query);
    if (tokens.length === 0) return [];

    // Find nodes whose label or tags contain at least one query token.
    const matchedNodes = this._findRelevantNodes(tokens);
    if (matchedNodes.length === 0) return [];

    // Expand matched nodes by traversing their neighbours.
    const expandedIds = new Set<string>(matchedNodes.map((n) => n.id));
    for (const node of matchedNodes) {
      const neighbours = this.graph.getNeighbors(node.id, "both");
      neighbours
        .slice(0, TRAVERSAL_DEPTH * 5)
        .forEach((id) => expandedIds.add(id));
    }

    // Collect all expanded nodes and sort by importance descending.
    const allNodes: GraphNode[] = Array.from(expandedIds)
      .map((id) => this.graph.getNode(id))
      .filter(
        (n): n is GraphNode =>
          n !== undefined && n.metadata.importance >= MIN_IMPORTANCE,
      )
      .sort((a, b) => b.metadata.importance - a.metadata.importance)
      .slice(0, MAX_NODES);

    // Build a set of edges induced by the collected node set for relationship text.
    const nodeIdSet = new Set(allNodes.map((n) => n.id));
    const inducedEdges = this.graph
      .getEdges()
      .filter((e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target))
      .slice(0, 30);

    // Format into context items.
    const items: ContextItem[] = [];
    const now = new Date().toISOString();

    for (const node of allNodes) {
      const isDirectMatch = matchedNodes.some((m) => m.id === node.id);
      const relevanceScore = this._computeRelevance(node, tokens);
      const content = this._formatNode(node, inducedEdges);

      items.push({
        id: randomUUID(),
        content,
        source: ContextSource.KnowledgeGraph,
        relevanceScore,
        tokenCount: Math.ceil(content.length / CHARS_PER_TOKEN),
        priority: isDirectMatch ? ContextPriority.High : ContextPriority.Medium,
        metadata: {
          nodeId: node.id,
          nodeType: node.type,
          importance: node.metadata.importance,
          tags: node.metadata.tags,
        },
        timestamp: now,
      });
    }

    // Sort by relevance descending.
    return items.sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  /** Finds graph nodes whose label or tags contain any of the query tokens. */
  private _findRelevantNodes(tokens: string[]): GraphNode[] {
    return query(this.graph)
      .orderBy("metadata.importance", "desc")
      .limit(50)
      .execute()
      .nodes.filter((node) => {
        const labelTokens = this._tokenize(node.label);
        const tagTokens = node.metadata.tags.flatMap((t) => this._tokenize(t));
        const allTokens = new Set([...labelTokens, ...tagTokens]);
        return tokens.some((qt) => allTokens.has(qt));
      })
      .slice(0, 10);
  }

  /**
   * Computes a relevance score in [0, 1] combining token overlap with
   * the node's importance score.
   */
  private _computeRelevance(node: GraphNode, queryTokens: string[]): number {
    const labelTokens = new Set(this._tokenize(node.label));
    const tagTokens = new Set(
      node.metadata.tags.flatMap((t) => this._tokenize(t)),
    );
    const allTokens = new Set([...labelTokens, ...tagTokens]);

    const overlap = queryTokens.filter((qt) => allTokens.has(qt)).length;
    const overlapScore =
      queryTokens.length > 0 ? overlap / queryTokens.length : 0;

    // Blend overlap (60%) with importance (40%) for final relevance.
    return overlapScore * 0.6 + node.metadata.importance * 0.4;
  }

  /**
   * Formats a graph node and its immediately induced edges into a
   * human-readable context string for the LLM.
   */
  private _formatNode(node: GraphNode, edges: GraphEdge[]): string {
    const lines: string[] = [
      `[Graph Node: ${node.type}] ${node.label}`,
      `Tags: ${node.metadata.tags.join(", ") || "none"}`,
      `Importance: ${node.metadata.importance.toFixed(2)}`,
    ];

    // Add notable properties (skip internal/empty values).
    const propEntries = Object.entries(node.properties)
      .filter(([, v]) => v !== null && v !== undefined && v !== "")
      .slice(0, 5);
    if (propEntries.length > 0) {
      lines.push(
        `Properties: ${propEntries.map(([k, v]) => `${k}=${String(v)}`).join(", ")}`,
      );
    }

    // Add outgoing relationships from this node.
    const nodeEdges = edges.filter((e) => e.source === node.id).slice(0, 5);
    if (nodeEdges.length > 0) {
      const relText = nodeEdges
        .map((e) => {
          const target = this.graph.getNode(e.target);
          return target
            ? `${e.type} → ${target.label}`
            : `${e.type} → (${e.target})`;
        })
        .join("; ");
      lines.push(`Relationships: ${relText}`);
    }

    return lines.join("\n");
  }

  /** Lowercases and splits text into alphanumeric tokens. */
  private _tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/[\s\W_-]+/)
      .filter((t) => t.length > 1);
  }
}
