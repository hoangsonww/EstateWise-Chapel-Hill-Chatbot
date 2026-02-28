---
name: estatewise-contracts
description: Contract-audit playbook for EstateWise. Use when REST, tRPC, MCP, gRPC, A2A, or shared payloads may have changed and producer-consumer alignment matters.
argument-hint: [contract-surface]
---

# EstateWise Contracts

Use this skill whenever a change could affect another package or service, even if the code edit is small.

## Contract Sources Of Truth

- REST backend contract: `backend/src/routes/`, `backend/src/controllers/`, swagger annotations, `backend/README.md`
- Frontend REST consumption: `frontend/lib/api.ts` plus direct `fetch(...)` usage in `frontend/pages/`
- Frontend local tRPC contract: `frontend/server/api/routers/`, `frontend/pages/api/trpc/[trpc].ts`, `frontend/lib/trpc.tsx`
- MCP contract: `mcp/src/tools/*.ts`, `mcp/src/server.ts`, `mcp/src/client.ts`, `mcp/README.md`
- Agentic AI HTTP/A2A contract: `agentic-ai/src/http/server.ts`, `agentic-ai/src/a2a/`, `agentic-ai/README.md`
- gRPC contract: `grpc/proto/market_pulse.proto`, `grpc/src/services/`, `grpc/README.md`

## Producer To Consumer Matrix

### Backend REST -> Frontend + MCP

If a backend endpoint, query param, auth requirement, or payload changes, inspect:

- `frontend/lib/api.ts`
- direct frontend fetch callers like `frontend/pages/chat.tsx`, `frontend/pages/charts.tsx`, `frontend/pages/login.tsx`, `frontend/pages/signup.tsx`, `frontend/pages/reset-password.tsx`
- MCP tools in `mcp/src/tools/`
- Swagger and README docs

### Frontend tRPC -> Frontend Pages

If a local tRPC router changes, inspect:

- `frontend/server/api/routers/`
- `frontend/lib/trpc.tsx`
- consuming pages/components

### MCP Tool -> Agentic AI + Docs

If an MCP tool name, schema, or output changes, inspect:

- `mcp/src/client.ts`
- `agentic-ai/src/lang/tools.ts`
- orchestrator call sites and runtime assumptions
- `mcp/README.md`

### Agentic A2A/HTTP -> MCP A2A Bridge

If `agentic-ai` server endpoints or task semantics change, inspect:

- `agentic-ai/src/http/server.ts`
- `agentic-ai/src/a2a/`
- `mcp/src/tools/a2a.ts`
- `agentic-ai/README.md`
- `mcp/README.md`

### gRPC Proto -> Service + Consumers

If `grpc/proto/market_pulse.proto` changes, inspect:

- `grpc/src/services/marketPulseService.ts`
- `grpc/src/server.ts`
- examples/docs/tests

## Search Patterns That Pay Off

Use searches like:

- `rg -n "estatewise-backend\\.vercel\\.app|API_BASE_URL" frontend`
- `rg -n "/api/<route>|fetch\\(" frontend`
- `rg -n "name:\\s*\"<tool>\"|callTool\\(|client:call" mcp agentic-ai`
- `rg -n "/run|/run/stream|a2a|agent-card|tasks\\." agentic-ai mcp`
- `rg -n "market_pulse|MarketPulseService" grpc`

## Validation Expectations

- REST contract change:
  - `cd backend && npm run build && npm run test`
  - `cd frontend && npm run build && npm run test` when frontend callers changed
  - `cd mcp && npm run build && npm run client:call -- <tool> '<json>'` when MCP wrappers changed

- tRPC contract change:
  - `cd frontend && npm run build && npm run test`

- MCP contract change:
  - `cd mcp && npm run build`
  - `cd mcp && npm run client:call -- <tool> '<json>'`
  - `cd agentic-ai && npm run build` if consumed there

- A2A/HTTP contract change:
  - `cd agentic-ai && npm run build`
  - run a realistic HTTP or CLI flow if possible
  - validate MCP `a2a.*` bridge if relevant

- gRPC contract change:
  - `cd grpc && npm run build && npm run test && npm run proto:check`

## Required Closeout

Call out:

1. What contract moved.
2. Which producers and consumers were updated.
3. Which validations proved alignment.
4. Which downstream consumers were not validated and why.
