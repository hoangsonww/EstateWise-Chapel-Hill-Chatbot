# Skill: Create MCP Server

Scaffold a new MCP server for EstateWise following established patterns.

## When to Use

Use when adding a new MCP server to the `mcp/` package -- for example, a new data source, a new tool category, or a new integration.

## Steps

### 1. Determine Server Details

Before scaffolding, answer:

- **Name**: lowercase kebab-case (e.g., `property-db`, `vector-search`)
- **Transport**: `stdio` (default) or `http-sse`
- **Tools**: list of tool names this server will expose
- **Auth**: whether it requires MCP token validation
- **Rate limit**: requests per minute (default: 60)

### 2. Create Directory Structure

```
mcp/servers/<name>/
  src/
    server.ts        # Server entry point
    tools/
      index.ts       # Tool registry
      <tool>.ts      # One file per tool
    config.ts        # Server-specific config
  package.json
  tsconfig.json
  README.md
```

### 3. Implement Following Patterns

**server.ts** -- Use the shared MCP SDK setup:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "estatewise-<name>",
  version: "1.0.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**tools/index.ts** -- Register each tool with schema + handler:

```typescript
export function registerTools(server: McpServer) {
  server.tool("tool-name", "Description", { /* zod schema */ }, async (params) => {
    // implementation
    return { content: [{ type: "text", text: JSON.stringify(result) }] };
  });
}
```

**config.ts** -- Load from environment with defaults:

```typescript
export const config = {
  authEnabled: process.env.MCP_AUTH_ENABLED === "true",
  rateLimit: parseInt(process.env.MCP_RATE_LIMIT_PER_MINUTE || "60", 10),
};
```

### 4. Register in MCP Package

Add the new server to `mcp/src/tools/index.ts` or the appropriate registry so the main MCP entry point can discover it.

### 5. Test

```bash
# Build
cd mcp && npm run build

# Verify the server starts
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | node mcp/servers/<name>/dist/server.js

# Call a tool via the MCP client
cd mcp && npm run client:call -- <tool-name> '{"param":"value"}'
```

## Checklist

- [ ] Server follows naming convention (`estatewise-<name>`)
- [ ] All tools return text content (not raw objects)
- [ ] Auth middleware is wired if `MCP_AUTH_ENABLED=true`
- [ ] Rate limiting respects `MCP_RATE_LIMIT_PER_MINUTE`
- [ ] README.md documents all tools with example inputs/outputs
- [ ] Server is registered in the plugin manifest (`.claude/plugins/estatewise-agents/plugin.json`)
