# Add MCP Server Workflow

## Steps
1. Use `/create-mcp-server` skill for scaffolding
2. Implement tool handlers with error handling
3. Register in `mcp/config/mcp-servers.json`
4. Add auth permissions in `mcp/shared/auth.ts`
5. Register in McpClientManager
6. Test: `cd mcp && npm run build`
7. Integration test
