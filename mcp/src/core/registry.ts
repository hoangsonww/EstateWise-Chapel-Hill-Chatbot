import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodTypeAny } from "zod";

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
    // Wrap handler with monitoring if available
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
    try {
      const result = await handler(args);
      // Record successful call
      recordToolCall(toolName, true);
      return result;
    } catch (error) {
      // Record failed call
      recordToolCall(toolName, false);
      throw error;
    }
  };
}

/** Record a tool call (imported dynamically to avoid circular dependency) */
function recordToolCall(toolName: string, success: boolean) {
  try {
    // Dynamically import to avoid circular dependency
    import("../tools/monitoring.js").then((mod) => {
      mod.recordToolCall(toolName, success);
    });
  } catch (err) {
    // Silently fail if monitoring is not available
  }
}

