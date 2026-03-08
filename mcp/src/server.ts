import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAllTools } from "./tools/index.js";
import { config } from "./core/config.js";
import { info, error } from "./core/logger.js";
import { registerAllResources } from "./primitives/resources.js";
import { registerAllPrompts } from "./primitives/prompts.js";

/**
 * EstateWise MCP server: exposes properties, graph, analytics, finance,
 * map, auth, commute, util, and system tools over stdio.
 */
const server = new McpServer(
  { name: config.serverName, version: config.serverVersion },
  {
    capabilities: {
      tools: { listChanged: true },
      resources: { listChanged: true, subscribe: true },
      prompts: { listChanged: true },
      logging: {},
    },
  },
);

// Register server primitives
registerAllTools(server);
registerAllResources(server);
registerAllPrompts(server);

// Start stdio transport. This process will appear idle because it waits for
// an MCP client over stdio (expected). Use `npm run client:dev` to interact.
const transport = new StdioServerTransport();
info(
  `${config.serverName}@${config.serverVersion} starting`,
  `(API_BASE_URL=${config.apiBaseUrl})`,
  "waiting for client on stdio",
);
server
  .connect(transport)
  .then(() => {
    info(`${config.serverName} connected.`);
  })
  .catch((err) => {
    error("Failed to start MCP server:", err);
    process.exit(1);
  });
