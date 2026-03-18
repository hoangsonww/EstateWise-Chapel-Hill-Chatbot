import { z } from "zod";
import { httpGetCached as httpGet, httpPost, qs } from "../core/http.js";
import { config } from "../core/config.js";
import type { ToolDef } from "../core/registry.js";

/** Resolve the base URL for the context engineering API. */
function contextBaseUrl(): string {
  return process.env.CONTEXT_API_BASE_URL || config.apiBaseUrl;
}

/** Context engineering tools for knowledge base search, graph navigation, and context assembly. */
export const contextTools: ToolDef[] = [
  {
    name: "context.search",
    description:
      "Search the context engineering knowledge base using semantic, keyword, or hybrid strategy.",
    schema: {
      query: z.string(),
      strategy: z.enum(["semantic", "keyword", "hybrid"]).optional(),
      limit: z.number().optional(),
    },
    handler: async (args: any) => {
      const { query, strategy, limit } = args as {
        query: string;
        strategy?: "semantic" | "keyword" | "hybrid";
        limit?: number;
      };
      const data = await httpGet(
        `/api/context/kb/search${qs({ q: query, strategy, limit })}`,
        { baseUrl: contextBaseUrl() },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "context.graphOverview",
    description: "Get the context knowledge graph overview for visualization.",
    schema: {
      limit: z.number().optional(),
    },
    handler: async (args: any) => {
      const { limit } = args as { limit?: number };
      const data = await httpGet(`/api/context/graph${qs({ limit })}`, {
        baseUrl: contextBaseUrl(),
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "context.findRelated",
    description:
      "Find related knowledge nodes for a concept by traversing the context graph.",
    schema: {
      query: z.string(),
      maxDepth: z.number().optional(),
      limit: z.number().optional(),
    },
    handler: async (args: any) => {
      const { query, maxDepth, limit } = args as {
        query: string;
        maxDepth?: number;
        limit?: number;
      };
      const data = await httpGet(
        `/api/context/graph/search${qs({ q: query, maxDepth, limit })}`,
        { baseUrl: contextBaseUrl() },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "context.assembleContext",
    description:
      "Assemble a full context window for an agent query, optionally scoped to a specific agent role and token budget.",
    schema: {
      query: z.string(),
      agentRole: z.string().optional(),
      maxTokens: z.number().optional(),
    },
    handler: async (args: any) => {
      const { query, agentRole, maxTokens } = args as {
        query: string;
        agentRole?: string;
        maxTokens?: number;
      };
      const data = await httpPost(
        "/api/context/assemble",
        { query, agentRole, maxTokens },
        { baseUrl: contextBaseUrl() },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "context.ingestDocument",
    description:
      "Ingest a new document into the context engineering knowledge system.",
    schema: {
      title: z.string(),
      content: z.string(),
      type: z
        .enum(["document", "property", "conversation", "tool_result"])
        .optional(),
      tags: z.array(z.string()).optional(),
    },
    handler: async (args: any) => {
      const { title, content, type, tags } = args as {
        title: string;
        content: string;
        type?: "document" | "property" | "conversation" | "tool_result";
        tags?: string[];
      };
      const data = await httpPost(
        "/api/context/ingest",
        { title, content, type, tags },
        { baseUrl: contextBaseUrl() },
      );
      return {
        content: [{ type: "text", text: JSON.stringify(data) }],
      };
    },
  },
  {
    name: "context.getMetrics",
    description:
      "Get context engineering system metrics including knowledge base size, graph stats, and cache performance.",
    schema: {},
    handler: async (_args: any) => {
      const data = await httpGet("/api/context/metrics", {
        baseUrl: contextBaseUrl(),
      });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
  {
    name: "context.nodeDetail",
    description:
      "Get detailed information about a specific knowledge graph node, optionally including its neighbors.",
    schema: {
      nodeId: z.string(),
      includeNeighbors: z.boolean().optional(),
    },
    handler: async (args: any) => {
      const { nodeId, includeNeighbors } = args as {
        nodeId: string;
        includeNeighbors?: boolean;
      };
      const data = await httpGet(
        `/api/context/graph/nodes/${encodeURIComponent(nodeId)}${qs({ includeNeighbors })}`,
        { baseUrl: contextBaseUrl() },
      );
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    },
  },
];
