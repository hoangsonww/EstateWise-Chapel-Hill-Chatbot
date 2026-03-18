/**
 * @fileoverview MCP tool definitions for the EstateWise context-engineering system.
 *
 * Provides ten context tools that can be registered with any MCP server following
 * the ToolDef pattern used by the main EstateWise MCP server. Each tool handler
 * returns `{ content: [{ type: "text", text: JSON.stringify(result) }] }`.
 *
 * Usage:
 *   const tools = createContextTools(graph, kb, engine);
 *   tools.forEach(tool => registerTool(server, tool));
 */

import { z } from "zod";
import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import { NodeType } from "../graph/types.js";
import type { ContextEngine } from "../context/ContextEngine.js";

// ---------------------------------------------------------------------------
// Tool definition interface (mirrors the pattern in the main MCP server)
// ---------------------------------------------------------------------------

/** Schema map accepted by the MCP server tool registry. */
type ZodShapeMap = Record<string, z.ZodTypeAny>;

/** MCP tool return envelope. */
export interface McpContent {
  type: "text" | "image" | "resource";
  text: string;
}

/** Standard MCP tool response. */
export interface McpToolResponse {
  content: McpContent[];
}

/** Definition of a single context engineering MCP tool. */
export interface ContextToolDef {
  /** Globally unique tool name (dot-namespaced). */
  name: string;
  /** Human-readable description shown to agents. */
  description: string;
  /** Zod schema map describing the tool's input arguments. */
  schema: ZodShapeMap;
  /** Handler function called with validated arguments. */
  handler: (args: Record<string, unknown>) => Promise<McpToolResponse>;
}

// ---------------------------------------------------------------------------
// Helper — wrap a result in the MCP content envelope
// ---------------------------------------------------------------------------

function ok(data: unknown): McpToolResponse {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): McpToolResponse {
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
  };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create all ten context engineering MCP tools wired to the given instances.
 *
 * @param graph  - The live KnowledgeGraph instance.
 * @param kb     - The live KnowledgeBase instance.
 * @param engine - The live ContextEngine instance.
 * @returns Array of ContextToolDef objects ready for registration.
 */
export function createContextTools(
  graph: KnowledgeGraph,
  kb: KnowledgeBase,
  engine: ContextEngine,
): ContextToolDef[] {
  return [
    // -------------------------------------------------------------------------
    // 1. context.search
    // -------------------------------------------------------------------------
    {
      name: "context.search",
      description:
        "Search the knowledge base and graph for context relevant to a query. " +
        "Returns ranked documents and graph nodes matching the query string.",
      schema: {
        query: z.string().describe("Natural-language search query"),
        strategy: z
          .enum(["semantic", "keyword", "hybrid", "graph_enhanced"])
          .optional()
          .describe("Retrieval strategy"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Maximum number of results (default 10)"),
      },
      handler: async (args) => {
        try {
          const query = args["query"] as string;
          const strategy =
            (args["strategy"] as
              | "semantic"
              | "keyword"
              | "hybrid"
              | "graph_enhanced"
              | undefined) ?? "hybrid";
          const limit = (args["limit"] as number | undefined) ?? 10;

          const [kbResults, graphNodes] = await Promise.all([
            kb.search(query, { strategy, limit }),
            Promise.resolve(
              graph
                .findNodes(
                  (n) =>
                    n.label.toLowerCase().includes(query.toLowerCase()) ||
                    JSON.stringify(n.properties)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .slice(0, limit),
            ),
          ]);

          return ok({
            query,
            strategy,
            kbResults: kbResults.map((r) => ({
              score: r.score,
              title: r.document.title,
              source: r.document.source,
              excerpt: r.chunk.content.slice(0, 300),
              highlights: r.highlights,
            })),
            graphNodes: graphNodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
              properties: n.properties,
            })),
            totalKbHits: kbResults.length,
            totalGraphHits: graphNodes.length,
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 2. context.assembleForAgent
    // -------------------------------------------------------------------------
    {
      name: "context.assembleForAgent",
      description:
        "Assemble a complete context window for an agent given its role and current query. " +
        "Returns a token-budgeted context package ready for injection into a system prompt.",
      schema: {
        agentRole: z
          .string()
          .describe(
            "Agent role identifier (e.g. 'property-analyst', 'market-analyst')",
          ),
        query: z.string().describe("The current user query or agent goal"),
        maxTokens: z
          .number()
          .int()
          .min(500)
          .max(128000)
          .optional()
          .describe("Maximum token budget (default 4000)"),
      },
      handler: async (args) => {
        try {
          const agentRole = args["agentRole"] as string;
          const query = args["query"] as string;
          const maxTokens = (args["maxTokens"] as number | undefined) ?? 4000;

          const assembled = await engine.assemble({
            query,
            agentRole,
            maxTokens,
          });

          return ok({
            agentRole,
            query,
            tokenBudget: maxTokens,
            tokensUsed: assembled.tokenCount,
            itemCount: assembled.items.length,
            items: assembled.items.map((item) => ({
              source: item.source,
              type: item.type,
              priority: item.priority,
              tokenCount: item.tokenCount,
              content: item.content.slice(0, 500),
            })),
            assembledAt: assembled.assembledAt,
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 3. context.graphTraverse
    // -------------------------------------------------------------------------
    {
      name: "context.graphTraverse",
      description:
        "Traverse the knowledge graph starting from a node ID, following edges up to a given depth. " +
        "Returns all reachable nodes and traversed edges.",
      schema: {
        startNodeId: z.string().describe("ID of the starting node"),
        edgeTypes: z
          .array(z.string())
          .optional()
          .describe("Restrict traversal to these edge types"),
        maxDepth: z
          .number()
          .int()
          .min(1)
          .max(6)
          .optional()
          .describe("Maximum hop depth (default 2)"),
        direction: z
          .enum(["outgoing", "incoming", "both"])
          .optional()
          .describe("Edge direction to follow"),
      },
      handler: async (args) => {
        try {
          const startNodeId = args["startNodeId"] as string;
          const edgeTypes = args["edgeTypes"] as string[] | undefined;
          const maxDepth = (args["maxDepth"] as number | undefined) ?? 2;
          const direction =
            (args["direction"] as
              | "outgoing"
              | "incoming"
              | "both"
              | undefined) ?? "both";

          const startNode = graph.getNode(startNodeId);
          if (!startNode) {
            return err(`Node not found: ${startNodeId}`);
          }

          // BFS traversal
          const visitedNodes = new Map<string, typeof startNode>();
          const visitedEdges = new Map<
            string,
            ReturnType<typeof graph.getEdge>
          >();
          const queue: Array<{ nodeId: string; depth: number }> = [
            { nodeId: startNodeId, depth: 0 },
          ];

          while (queue.length > 0) {
            const item = queue.shift()!;
            if (visitedNodes.has(item.nodeId)) continue;

            const node = graph.getNode(item.nodeId);
            if (!node) continue;
            visitedNodes.set(item.nodeId, node);

            if (item.depth >= maxDepth) continue;

            // Collect adjacent edges
            const outEdges =
              direction !== "incoming"
                ? graph.findEdges((e) => e.source === item.nodeId)
                : [];
            const inEdges =
              direction !== "outgoing"
                ? graph.findEdges((e) => e.target === item.nodeId)
                : [];

            for (const edge of [...outEdges, ...inEdges]) {
              if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
              visitedEdges.set(edge.id, edge);
              const nextId =
                edge.source === item.nodeId ? edge.target : edge.source;
              if (!visitedNodes.has(nextId)) {
                queue.push({ nodeId: nextId, depth: item.depth + 1 });
              }
            }
          }

          const nodes = Array.from(visitedNodes.values());
          const edges = Array.from(visitedEdges.values()).filter(Boolean);

          return ok({
            startNodeId,
            maxDepth,
            direction,
            edgeTypes: edgeTypes ?? "all",
            nodeCount: nodes.length,
            edgeCount: edges.length,
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
            })),
            edges: edges.map(
              (e) =>
                e && {
                  id: e.id,
                  source: e.source,
                  target: e.target,
                  type: e.type,
                  weight: e.weight,
                },
            ),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 4. context.graphQuery
    // -------------------------------------------------------------------------
    {
      name: "context.graphQuery",
      description:
        "Query the knowledge graph with optional type and property filters. " +
        "Returns matching nodes and their neighbour counts.",
      schema: {
        nodeType: z
          .string()
          .optional()
          .describe(
            "Filter by node type (e.g. 'Property', 'Concept', 'Agent')",
          ),
        filters: z
          .record(z.unknown())
          .optional()
          .describe("Property filter map (key: value exact match)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Maximum nodes to return (default 50)"),
      },
      handler: async (args) => {
        try {
          const nodeType = args["nodeType"] as string | undefined;
          const filters = args["filters"] as
            | Record<string, unknown>
            | undefined;
          const limit = (args["limit"] as number | undefined) ?? 50;

          const nodes = graph
            .findNodes((n) => {
              if (nodeType && n.type !== nodeType) return false;
              if (filters) {
                for (const [key, value] of Object.entries(filters)) {
                  if (n.properties[key] !== value) return false;
                }
              }
              return true;
            })
            .slice(0, limit);

          return ok({
            nodeType: nodeType ?? "all",
            filters: filters ?? {},
            resultCount: nodes.length,
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
              properties: n.properties,
              degree: graph.getDegree(n.id),
            })),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 5. context.ingest
    // -------------------------------------------------------------------------
    {
      name: "context.ingest",
      description:
        "Ingest a new document or data payload into the knowledge system. " +
        "Creates graph nodes and a knowledge-base entry from the provided content.",
      schema: {
        type: z
          .enum([
            "property",
            "conversation",
            "document",
            "tool_result",
            "agent_output",
          ])
          .describe("Source type"),
        title: z.string().describe("Human-readable title for the document"),
        content: z.string().describe("Full text content to ingest"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Optional classification tags"),
      },
      handler: async (args) => {
        try {
          const type = args["type"] as "document";
          const title = args["title"] as string;
          const content = args["content"] as string;
          const tags = (args["tags"] as string[] | undefined) ?? [];

          // Add directly to KB without going through the full Ingester
          // (the Ingester requires type-specific parsers; for generic content
          //  the KB addDocument call is the most direct path)
          const doc = await kb.addDocument({
            title,
            content,
            source: `mcp:context.ingest:${Date.now()}`,
            sourceType: type,
            metadata: { author: "mcp-tool", tags, accessCount: 0 },
          });

          // Also create a Document node in the graph
          const nodeLabel = `Document:${title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}`;
          const existing = graph.findNodes((n) => n.label === nodeLabel);
          if (existing.length === 0) {
            const { v4: uuidv4 } = await import("uuid");
            graph.addNode({
              id: uuidv4(),
              type: NodeType.Document,
              label: nodeLabel,
              properties: {
                title,
                docId: doc.id,
                tags,
                wordCount: content.split(/\s+/).length,
              },
              metadata: { source: "mcp-tool", importance: 0.5, tags },
            });
          }

          return ok({
            ingested: true,
            docId: doc.id,
            title,
            chunkCount: doc.chunks.length,
            sourceType: type,
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 6. context.getStats
    // -------------------------------------------------------------------------
    {
      name: "context.getStats",
      description:
        "Get current metrics and statistics about the context-engineering system: " +
        "graph topology, knowledge base size, and token counts.",
      schema: {},
      handler: async (_args) => {
        try {
          const graphStats = graph.getStats();
          const kbStats = kb.getStats();

          return ok({
            graph: {
              nodeCount: graphStats.nodeCount,
              edgeCount: graphStats.edgeCount,
              nodesByType: graphStats.nodesByType,
              edgesByType: graphStats.edgesByType,
              avgDegree: Number(graphStats.avgDegree.toFixed(3)),
              density: Number(graphStats.density.toFixed(6)),
            },
            knowledgeBase: {
              documentCount: kbStats.documentCount,
              chunkCount: kbStats.chunkCount,
              totalTokens: kbStats.totalTokens,
              sourceBreakdown: kbStats.sourceBreakdown,
            },
            timestamp: new Date().toISOString(),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 7. context.getGraphOverview
    // -------------------------------------------------------------------------
    {
      name: "context.getGraphOverview",
      description:
        "Get a full graph overview with all nodes and edges formatted for D3 / Vis.js visualisation.",
      schema: {
        limit: z
          .number()
          .int()
          .min(10)
          .max(2000)
          .optional()
          .describe("Maximum nodes to include (default 500)"),
      },
      handler: async (args) => {
        try {
          const limit = (args["limit"] as number | undefined) ?? 500;
          const nodes = graph.getNodes().slice(0, limit);
          const nodeIds = new Set(nodes.map((n) => n.id));
          const edges = graph
            .getEdges()
            .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

          return ok({
            nodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
              tags: n.metadata.tags,
              properties: n.properties,
            })),
            edges: edges.map((e) => ({
              id: e.id,
              source: e.source,
              target: e.target,
              type: e.type,
              weight: e.weight,
            })),
            stats: graph.getStats(),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 8. context.findRelated
    // -------------------------------------------------------------------------
    {
      name: "context.findRelated",
      description:
        "Find graph nodes related to a concept or keyword by label and property search, " +
        "then expand to their neighbours.",
      schema: {
        concept: z
          .string()
          .describe("Concept or keyword to find related nodes for"),
        maxDepth: z
          .number()
          .int()
          .min(1)
          .max(4)
          .optional()
          .describe("Neighbour expansion depth (default 1)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum related nodes (default 20)"),
      },
      handler: async (args) => {
        try {
          const concept = (args["concept"] as string).toLowerCase();
          const maxDepth = (args["maxDepth"] as number | undefined) ?? 1;
          const limit = (args["limit"] as number | undefined) ?? 20;

          // Find seed nodes matching the concept
          const seeds = graph.findNodes(
            (n) =>
              n.label.toLowerCase().includes(concept) ||
              String(n.properties["name"] ?? "")
                .toLowerCase()
                .includes(concept),
          );

          const related = new Map<string, (typeof seeds)[0]>();
          for (const seed of seeds.slice(0, 5)) {
            related.set(seed.id, seed);
            if (maxDepth >= 1) {
              const neighbors = graph.getNeighbors(seed.id, "both");
              for (const nid of neighbors.slice(0, limit)) {
                const node = graph.getNode(nid);
                if (node) related.set(node.id, node);
              }
            }
          }

          const results = Array.from(related.values()).slice(0, limit);

          return ok({
            concept,
            seedCount: seeds.length,
            relatedCount: results.length,
            nodes: results.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              importance: n.metadata.importance,
              degree: graph.getDegree(n.id),
            })),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 9. context.getNodeDetail
    // -------------------------------------------------------------------------
    {
      name: "context.getNodeDetail",
      description:
        "Get detailed information about a specific graph node, including all properties, " +
        "metadata, and optionally its immediate neighbours.",
      schema: {
        nodeId: z.string().describe("Node ID to look up"),
        includeNeighbors: z
          .boolean()
          .optional()
          .describe(
            "When true, include immediate neighbour nodes (default false)",
          ),
      },
      handler: async (args) => {
        try {
          const nodeId = args["nodeId"] as string;
          const includeNeighbors =
            (args["includeNeighbors"] as boolean | undefined) ?? false;

          const node = graph.getNode(nodeId);
          if (!node) {
            return err(`Node not found: ${nodeId}`);
          }

          const result: Record<string, unknown> = {
            id: node.id,
            type: node.type,
            label: node.label,
            properties: node.properties,
            metadata: node.metadata,
            degree: graph.getDegree(nodeId),
            inDegree: graph.getInDegree(nodeId),
            outDegree: graph.getOutDegree(nodeId),
            edges: graph
              .findEdges((e) => e.source === nodeId || e.target === nodeId)
              .map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                type: e.type,
                weight: e.weight,
              })),
          };

          if (includeNeighbors) {
            const neighborIds = graph.getNeighbors(nodeId, "both");
            result["neighbors"] = neighborIds
              .map((id) => graph.getNode(id))
              .filter(Boolean)
              .map((n) => n && { id: n.id, type: n.type, label: n.label });
          }

          return ok(result);
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },

    // -------------------------------------------------------------------------
    // 10. context.getTimeline
    // -------------------------------------------------------------------------
    {
      name: "context.getTimeline",
      description:
        "Get a timeline of recently created graph nodes and KB documents, ordered newest first.",
      schema: {
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum timeline entries (default 20)"),
      },
      handler: async (_args) => {
        try {
          const limit = (_args["limit"] as number | undefined) ?? 20;

          const nodes = graph
            .getNodes()
            .sort((a, b) =>
              b.metadata.createdAt.localeCompare(a.metadata.createdAt),
            )
            .slice(0, limit);

          const kbStats = kb.getStats();

          return ok({
            limit,
            recentNodes: nodes.map((n) => ({
              id: n.id,
              type: n.type,
              label: n.label,
              createdAt: n.metadata.createdAt,
              source: n.metadata.source,
              importance: n.metadata.importance,
            })),
            kbSummary: {
              documentCount: kbStats.documentCount,
              chunkCount: kbStats.chunkCount,
              totalTokens: kbStats.totalTokens,
            },
            generatedAt: new Date().toISOString(),
          });
        } catch (e) {
          return err(e instanceof Error ? e.message : String(e));
        }
      },
    },
  ];
}
