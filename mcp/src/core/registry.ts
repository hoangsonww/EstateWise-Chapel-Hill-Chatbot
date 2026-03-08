import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { recordToolCall } from "./metrics.js";
import { estimatePayloadBytes, runWithToolGovernance } from "./governance.js";

/**
 * Declarative description of an MCP tool to register on the server.
 * `schema` may be a Zod raw shape or annotations (per MCP SDK).
 */
export type ToolDef = {
  name: string;
  description: string;
  schema: unknown;
  handler: (args: any) => Promise<any>;
};

/** In-memory registry of all tools registered on this server. */
export const catalog: ToolDef[] = [];

/** Register an array of tools on the MCP server and record them in the catalog. */
export function registerTools(server: McpServer, defs: ToolDef[]) {
  for (const d of defs) {
    const wrappedHandler = createMonitoredHandler(d.handler, d.name);
    server.tool(d.name, d.description, d.schema as any, wrappedHandler);
    catalog.push(d);
  }
}

/** Wrap a handler with monitoring to track calls and errors */
function createMonitoredHandler(
  handler: (args: any) => Promise<any>,
  toolName: string,
): (args: any) => Promise<any> {
  return async (args: any) => {
    const startedAt = Date.now();
    const argBytes = estimatePayloadBytes(args);
    try {
      const result = await runWithToolGovernance(toolName, args, async () =>
        handler(args),
      );
      const durationMs = Date.now() - startedAt;
      recordToolCall(toolName, {
        success: true,
        durationMs,
        argBytes,
        resultBytes: estimatePayloadBytes(result),
      });
      return result;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      recordToolCall(toolName, {
        success: false,
        durationMs,
        argBytes,
      });
      throw error;
    }
  };
}

function summarizeSchema(
  schema: unknown,
): { fields: string[]; required: string[] } | null {
  if (!schema || typeof schema !== "object") return null;
  const raw = schema as Record<string, unknown>;
  const fields = Object.keys(raw);
  const required = fields.filter((field) => {
    const value = raw[field] as { isOptional?: () => boolean };
    if (!value || typeof value.isOptional !== "function") return true;
    return !value.isOptional();
  });
  return { fields, required };
}

export function getToolCatalogSnapshot() {
  return catalog.map((tool) => ({
    name: tool.name,
    description: tool.description,
    schema: summarizeSchema(tool.schema),
  }));
}
