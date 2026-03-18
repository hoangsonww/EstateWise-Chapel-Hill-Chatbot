/**
 * @fileoverview MCP resource definitions for the EstateWise context-engineering system.
 *
 * Resources are read-only, URI-addressed data providers that MCP clients can
 * subscribe to. Each resource returns a JSON payload describing a subsystem's
 * current state.
 *
 * URI scheme: `context://<subsystem>/<resource>`
 */

import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import type { ContextMetrics } from "../monitoring/ContextMetrics.js";
import { NodeType } from "../graph/types.js";

// ---------------------------------------------------------------------------
// Resource definition interface
// ---------------------------------------------------------------------------

/** A single MCP resource definition. */
export interface ContextResourceDef {
  /** MCP resource URI (may contain `{type}` placeholder for dynamic resources). */
  uri: string;
  /** Human-readable name for the resource. */
  name: string;
  /** Description shown to agents and MCP clients. */
  description: string;
  /** MIME type of the resource content. */
  mimeType: string;
  /**
   * Handler that returns the resource content as a UTF-8 string.
   * For dynamic URIs, `params` contains the extracted path segments.
   */
  read: (params?: Record<string, string>) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create the set of MCP resources for the context-engineering system.
 *
 * @param graph   - The live KnowledgeGraph instance.
 * @param kb      - The live KnowledgeBase instance.
 * @param metrics - The live ContextMetrics instance.
 * @returns Array of ContextResourceDef objects ready for registration.
 */
export function createContextResources(
  graph: KnowledgeGraph,
  kb: KnowledgeBase,
  metrics: ContextMetrics,
): ContextResourceDef[] {
  return [
    // -------------------------------------------------------------------------
    // context://graph/stats
    // -------------------------------------------------------------------------
    {
      uri: "context://graph/stats",
      name: "Graph Statistics",
      description:
        "Current knowledge-graph topology statistics: node/edge counts, type distributions, avg degree, and density.",
      mimeType: "application/json",
      read: async () => {
        const stats = graph.getStats();
        return JSON.stringify(
          {
            resource: "context://graph/stats",
            timestamp: new Date().toISOString(),
            ...stats,
          },
          null,
          2,
        );
      },
    },

    // -------------------------------------------------------------------------
    // context://kb/stats
    // -------------------------------------------------------------------------
    {
      uri: "context://kb/stats",
      name: "Knowledge Base Statistics",
      description:
        "Current knowledge-base statistics: document count, chunk count, total token estimate, and source breakdown.",
      mimeType: "application/json",
      read: async () => {
        const stats = kb.getStats();
        return JSON.stringify(
          {
            resource: "context://kb/stats",
            timestamp: new Date().toISOString(),
            ...stats,
          },
          null,
          2,
        );
      },
    },

    // -------------------------------------------------------------------------
    // context://metrics/snapshot
    // -------------------------------------------------------------------------
    {
      uri: "context://metrics/snapshot",
      name: "Metrics Snapshot",
      description:
        "Full point-in-time snapshot of all context-engineering subsystem metrics including graph, KB, context assembly, and ingestion statistics.",
      mimeType: "application/json",
      read: async () => {
        const snapshot = metrics.getSnapshot();
        return JSON.stringify(
          {
            resource: "context://metrics/snapshot",
            ...snapshot,
          },
          null,
          2,
        );
      },
    },

    // -------------------------------------------------------------------------
    // context://graph/nodes/{type}
    // -------------------------------------------------------------------------
    {
      uri: "context://graph/nodes/{type}",
      name: "Graph Nodes by Type",
      description:
        "All graph nodes of a given NodeType. Pass the type as the last URI segment (e.g. context://graph/nodes/Property).",
      mimeType: "application/json",
      read: async (params) => {
        const typeStr = params?.["type"] ?? "Entity";
        // Validate that the requested type exists in the NodeType enum
        const validTypes = Object.values(NodeType) as string[];
        const resolvedType = validTypes.includes(typeStr) ? typeStr : "Entity";

        const nodes = graph.findNodes((n) => n.type === resolvedType);

        return JSON.stringify(
          {
            resource: `context://graph/nodes/${typeStr}`,
            timestamp: new Date().toISOString(),
            requestedType: typeStr,
            resolvedType,
            count: nodes.length,
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
              createdAt: n.metadata.createdAt,
              source: n.metadata.source,
              tags: n.metadata.tags,
              degree: graph.getDegree(n.id),
              properties: n.properties,
            })),
          },
          null,
          2,
        );
      },
    },
  ];
}
