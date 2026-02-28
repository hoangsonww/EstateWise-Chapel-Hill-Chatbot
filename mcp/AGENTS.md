## MCP Guidance

- Owns the stdio MCP server, tool registry, token flows, monitoring, web research, and A2A bridge tools.
- `npm run dev` waits for a stdio client and looks idle by design.
- Keep tool schemas strict and outputs text-first for MCP client portability.
- If backend or A2A contracts move, update the corresponding MCP wrappers immediately.

## Validation

- `npm run build`
- `npm run client:call -- <tool> '<json>'`

## Docs

- Update `mcp/README.md` when tool names, inputs, outputs, env vars, or launch instructions change.
