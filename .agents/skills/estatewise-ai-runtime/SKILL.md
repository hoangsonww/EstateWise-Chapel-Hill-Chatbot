---
name: estatewise-ai-runtime
description: Work on EstateWise MCP, agentic-ai, web-grounding, token flows, and A2A integrations. Use when changing tool behavior, orchestration, runtime flags, MCP wrappers, HTTP/A2A endpoints, or AI integration paths.
---

# EstateWise AI Runtime

Use this skill when the task touches the tool-first AI stack rather than just the app UI/API.

## System Boundaries

- `backend/`: source APIs behind property, graph, analytics, auth, finance, and chat behavior.
- `mcp/`: stdio server that exposes those capabilities as tools.
- `agentic-ai/`: consumers and orchestrators that call MCP tools, plus HTTP/A2A access.

## Core Files

- `mcp/src/server.ts`
- `mcp/src/core/config.ts`
- `mcp/src/tools/index.ts`
- `mcp/src/tools/a2a.ts`
- `mcp/src/tools/system.ts`
- `mcp/src/tools/monitoring.ts`
- `agentic-ai/src/index.ts`
- `agentic-ai/src/http/server.ts`
- `agentic-ai/src/orchestrator/AgentOrchestrator.ts`
- `agentic-ai/src/lang/tools.ts`
- `agentic-ai/src/lang/graph.ts`
- `agentic-ai/src/a2a/`

## Runtime Modes

### MCP only

```bash
cd mcp
npm run build
npm run client:dev
npm run client:call -- <tool> '<json>'
```

Remember: `npm run dev` waits for a stdio client and appears idle by design.

### Agentic orchestrator

```bash
cd mcp && npm run build
cd ../agentic-ai && npm run build
npm run dev "Find 3-bed homes in Chapel Hill and compare two ZPIDs"
```

### LangGraph

```bash
cd agentic-ai
npm run build
npm run dev -- --langgraph "Compare two homes and estimate mortgage"
```

### CrewAI

Use only when explicitly touching the Python runtime. Requires `agentic-ai/crewai/requirements.txt` and `OPENAI_API_KEY`.

### HTTP / A2A

Key endpoints in `agentic-ai/src/http/server.ts`:

- `GET /health`
- `POST /run`
- `GET /run/stream`
- `GET /.well-known/agent-card.json`
- `GET /a2a/agent-card`
- `POST /a2a`

If these change, inspect `mcp/src/tools/a2a.ts` immediately.

## Behavioral Rules

- Preserve text-first, often stringified JSON outputs on the MCP side.
- Tool descriptions and input schemas are part of the contract.
- Keep A2A task lifecycle semantics coherent across `agentic-ai` and MCP bridge tools.
- Do not let LangGraph, orchestrator, and MCP wrappers silently drift on tool naming or payload shapes.
- Keep timeout and fallback behavior sensible for web-grounding and token flows.

## Common Failure Modes

- MCP build passes, but `client:call` fails because a tool name or schema changed.
- Agentic runtime compiles, but `agentic-ai/src/lang/tools.ts` still expects the old MCP payload shape.
- A2A server works directly, but `mcp/src/tools/a2a.ts` still targets an older endpoint or response structure.
- Cost tracking or `THREAD_ID` behavior changes without docs/examples being updated.

## Documentation To Update

- `mcp/README.md`
- `agentic-ai/README.md`
- root `README.md`
- `ARCHITECTURE.md`
- `RAG_SYSTEM.md` when AI-system behavior materially changes
