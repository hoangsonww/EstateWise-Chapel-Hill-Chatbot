---
name: estatewise-ai-runtime
description: Playbook for MCP, agentic-ai, web-grounding, token flows, and A2A in EstateWise. Use when changing tool calls, orchestration, runtime behavior, or AI integration paths.
argument-hint: [mcp-agentic-a2a-scope]
---

# EstateWise AI Runtime

Use this skill when work touches the tool-first AI stack rather than just the app UI/API.

## System Boundaries

- `backend/`: source APIs behind property, graph, analytics, auth, finance, and chat behavior.
- `mcp/`: stdio server that exposes those capabilities as tools.
- `agentic-ai/`: consumers and orchestrators that call MCP tools, plus optional HTTP/A2A access.

## Core Files

- MCP entry: `mcp/src/server.ts`
- MCP config: `mcp/src/core/config.ts`
- MCP tool registry: `mcp/src/tools/index.ts`
- MCP A2A bridge: `mcp/src/tools/a2a.ts`
- MCP system/monitoring tools: `mcp/src/tools/system.ts`, `mcp/src/tools/monitoring.ts`
- Agentic CLI: `agentic-ai/src/index.ts`
- Agentic HTTP/A2A server: `agentic-ai/src/http/server.ts`
- Agentic default orchestrator: `agentic-ai/src/orchestrator/AgentOrchestrator.ts`
- Agentic LangGraph wrappers: `agentic-ai/src/lang/tools.ts`, `agentic-ai/src/lang/graph.ts`
- Agentic A2A protocol: `agentic-ai/src/a2a/`

## Runtime Modes

### MCP only

Use when adding or fixing tool behavior:

```bash
cd mcp
npm run build
npm run client:dev
npm run client:call -- <tool> '<json>'
```

Remember: `npm run dev` waits for a stdio client and looks idle by design.

### Agentic default orchestrator

Use when changing orchestration logic or end-to-end tool use:

```bash
cd mcp && npm run build
cd ../agentic-ai && npm run build
npm run dev "Find 3-bed homes in Chapel Hill and compare two ZPIDs"
```

### LangGraph

Use when touching `agentic-ai/src/lang/`:

```bash
cd agentic-ai
npm run build
npm run dev -- --langgraph "Compare two Chapel Hill homes and estimate mortgage"
```

### CrewAI

Use only when explicitly working in the Python runtime:

- Requires `agentic-ai/crewai/requirements.txt`
- Requires `OPENAI_API_KEY`
- Validate with `npm run dev -- --crewai "goal"`

### HTTP / A2A

Key endpoints in `agentic-ai/src/http/server.ts`:

- `GET /health`
- `POST /run`
- `GET /run/stream`
- `GET /.well-known/agent-card.json`
- `GET /a2a/agent-card`
- `POST /a2a`

If these move, inspect `mcp/src/tools/a2a.ts` immediately.

## Environment And Service Dependencies

- MCP:
  - `API_BASE_URL`
  - `FRONTEND_BASE_URL`
  - `A2A_BASE_URL`
  - `WEB_TIMEOUT_MS`
  - token env vars for `mcp.token.*`

- Backend-driven AI paths:
  - `GOOGLE_AI_API_KEY`
  - `PINECONE_API_KEY`
  - `PINECONE_INDEX`
  - Neo4j env vars for graph features

- Agentic runtime:
  - `AGENT_RUNTIME`
  - `THREAD_ID`
  - `OPENAI_API_KEY` for CrewAI and OpenAI-linked paths
  - `A2A_MAX_TASKS`, `A2A_TASK_RETENTION_MS`, `A2A_WAIT_TIMEOUT_MS`

## Important Behavioral Rules

- MCP tool outputs should stay text-first and JSON-stringified where the repo already expects that pattern.
- Tool descriptions and input schemas are part of the user-facing contract.
- A2A task lifecycle semantics must stay coherent across `agentic-ai` and MCP bridge tools.
- LangGraph and orchestrator integrations should not silently diverge on tool naming or expected payload shape.
- Web-grounding changes should preserve timeout and failure-handling behavior.

## Common Failure Patterns

- MCP build passes, but `client:call` fails because a tool name or schema changed.
- Agentic runtime compiles, but an MCP wrapper in `agentic-ai/src/lang/tools.ts` still expects the old payload shape.
- A2A server works directly, but `mcp/src/tools/a2a.ts` still targets an older endpoint or response structure.
- Cost reporting or `THREAD_ID` behavior changes in LangGraph without docs/examples being updated.
- Token flows appear to work locally but fail across process restarts because storage is in-memory.

## Documentation Obligations

Update these when relevant:

- `mcp/README.md`
- `agentic-ai/README.md`
- root `README.md`
- `ARCHITECTURE.md`
- `RAG_SYSTEM.md` when AI-system behavior materially changes
