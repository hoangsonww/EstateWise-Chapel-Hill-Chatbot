## Agentic AI Guidance

- Owns the default orchestrator, LangGraph runtime, CrewAI runtime, HTTP server, and A2A task endpoints.
- Decide which runtime actually owns the behavior before editing.
- Keep MCP tool assumptions aligned with the current MCP server, especially in `src/lang/tools.ts` and A2A bridge paths.
- If `/run`, `/run/stream`, or A2A task semantics change, inspect MCP `a2a.*` tools and docs in the same task.

## Validation

- `npm run build`
- `npm run dev "realistic goal"`
- `npm run test` when runtime tests are relevant

## Docs

- Update `agentic-ai/README.md` when runtime flags, endpoints, task semantics, or integration guidance changes.
