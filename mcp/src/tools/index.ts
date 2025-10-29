import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../core/registry.js";
import { propertiesTools } from "./properties.js";
import { analyticsTools } from "./analytics.js";
import { graphTools } from "./graph.js";
import { financeTools } from "./finance.js";
import { mapTools } from "./map.js";
import { utilTools } from "./util.js";
import { conversationTools } from "./conversations.js";
import { authTools } from "./auth.js";
import { commuteTools } from "./commute.js";
import { systemTools } from "./system.js";
import { monitoringTools } from "./monitoring.js";
import { batchTools } from "./batch.js";
import { marketTools } from "./market.js";
import { mcpTokenTools } from "./mcpToken.js";

/** Register all domain tool modules with the MCP server. */
export function registerAllTools(server: McpServer) {
  registerTools(server, [
    ...propertiesTools,
    ...analyticsTools,
    ...graphTools,
    ...financeTools,
    ...mapTools,
    ...utilTools,
    ...conversationTools,
    ...authTools,
    ...commuteTools,
    ...systemTools,
    ...monitoringTools,
    ...batchTools,
    ...marketTools,
    ...mcpTokenTools,
  ]);
}
