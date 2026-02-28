---
name: estatewise-engineering
description: Execute production-safe code changes in the EstateWise monorepo. Use when implementing or fixing behavior in backend, frontend, MCP, agentic-ai, gRPC, deployment-control, tests, or repo docs. Do not use for pure brainstorming, skill installation, or work outside this repository.
---

# EstateWise Engineering

Use this skill as the default playbook for coding work in this repository.

## Objective

Implement the smallest defensible change in the correct subsystem, preserve contracts, and validate only the touched surface.

## Operating Rules

1. Keep patches surgical.
2. Do not refactor unrelated files.
3. Preserve backward compatibility unless the task explicitly requests a breaking change.
4. Avoid changing environment defaults unless explicitly requested.
5. Never commit secrets or `.env` values.

## Classify Scope First

Identify the owning subsystem before editing:

- `backend/`: Express API, auth, chat, properties, graph, forums, commute, Swagger, Prometheus, tRPC bridge.
- `frontend/`: Next.js Pages Router UI, REST calls, local tRPC API, charts, map, auth, forums.
- `mcp/`: stdio MCP server, tool registry, token flows, monitoring, web research, A2A bridge.
- `agentic-ai/`: default orchestrator, LangGraph, CrewAI, HTTP server, A2A endpoints.
- `grpc/`: `market_pulse.proto`, service logic, server bootstrap.
- `deployment-control/`: deployment operations API, job runner, kubectl helpers, Nuxt UI.
- Infra/docs: Docker, Kubernetes, Helm, Terraform, cloud folders, Jenkins/GitLab/GitHub docs, root docs.

If the task spans multiple subsystems, work from producer to consumer.

## Find Real Entry Points

Use `rg` first. Open only the relevant files once the owning path is clear.

Start from:

- `backend/src/server.ts`
- `backend/src/routes/`, `backend/src/controllers/`, `backend/src/services/`
- `frontend/lib/api.ts`
- `frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `frontend/pages/map.tsx`, `frontend/pages/market-pulse.tsx`
- `frontend/server/api/routers/insights.ts`
- `mcp/src/server.ts`, `mcp/src/tools/`, `mcp/src/core/`
- `agentic-ai/src/index.ts`, `agentic-ai/src/http/server.ts`, `agentic-ai/src/orchestrator/`
- `grpc/proto/market_pulse.proto`, `grpc/src/services/`
- `deployment-control/src/server.ts`, `deployment-control/ui/`

## Subsystem Playbooks

### Backend

1. Update route/controller/service in `backend/src/`.
2. Preserve middleware and route ordering in `backend/src/server.ts`.
3. If an endpoint or payload changes, update frontend callers, MCP wrappers, and docs in the same task.
4. Add or adjust tests under `backend/tests`.

### Frontend

1. Patch the smallest owning page or component.
2. Check both `frontend/lib/api.ts` and direct page-level `fetch(...)` usage before assuming one edit is enough.
3. Keep large files like `chat.tsx` and `insights.tsx` localized.
4. Update only the tests needed for the changed behavior.

### MCP

1. Update the correct tool module in `mcp/src/tools/`.
2. Keep Zod validation strict.
3. Preserve text-first, stringified JSON output patterns expected by clients.
4. Validate with `npm run build` and at least one focused `client:call`.

### Agentic AI

1. Decide whether the change belongs to the default orchestrator, LangGraph, CrewAI, or HTTP/A2A layer.
2. Keep tool call contracts aligned with the MCP server.
3. Validate with a realistic goal run when behavior changes.

### gRPC

1. Treat `grpc/proto/market_pulse.proto` as the contract source.
2. Update handlers and service wiring after proto edits.
3. Run proto lint and tests on proto changes.

### Deployment Control

1. Keep API and UI behavior aligned.
2. Preserve `queued/running/succeeded/failed` job semantics.
3. Remember there is no built-in auth/RBAC; do not silently widen trust assumptions.

## Cross-Service Contract Checks

Inspect dependent consumers whenever a producer changes:

- Backend REST changes:
  - `frontend/lib/api.ts`
  - direct frontend `fetch(...)` callers in `frontend/pages/`
  - MCP tools in `mcp/src/tools/`

- Frontend local tRPC changes:
  - `frontend/server/api/routers/`
  - `frontend/lib/trpc.tsx`
  - consuming pages/components

- MCP tool changes:
  - `mcp/src/client.ts`
  - `agentic-ai/src/lang/tools.ts`
  - docs in `mcp/README.md`

- Agentic A2A/HTTP changes:
  - `agentic-ai/src/http/server.ts`
  - `mcp/src/tools/a2a.ts`
  - docs in `agentic-ai/README.md` and `mcp/README.md`

- gRPC contract changes:
  - `grpc/src/services/`
  - proto docs/examples/tests

Use `estatewise-contracts` if the contract surface is non-trivial.

## Validation Matrix

Run the smallest sufficient check set:

- Root: `npm run dev`, `npm run format`, `npm run lint`
- Backend: `cd backend && npm run build && npm run test`
- Frontend: `cd frontend && npm run build && npm run test`, plus `npm run lint` when UI or TS lint-sensitive paths changed
- MCP: `cd mcp && npm run build && npm run client:call -- <tool> '<json>'`
- Agentic AI: `cd agentic-ai && npm run build && npm run dev "realistic goal"`
- gRPC: `cd grpc && npm run build && npm run test && npm run proto:check`
- Deployment Control: `cd deployment-control && npm run build` or `npm run build:api && npm run build:ui`

If environment dependencies block validation, state exactly what was skipped and why.

## High-Risk Files

- `backend/src/server.ts`
- `backend/src/services/geminiChat.service.ts`
- `frontend/pages/chat.tsx`
- `frontend/pages/insights.tsx`
- `frontend/lib/api.ts`
- `mcp/src/core/http.ts`
- `mcp/src/core/token.ts`
- `agentic-ai/src/http/server.ts`
- `grpc/proto/market_pulse.proto`

Prefer minimal diffs and avoid style-only churn in these files.

## Documentation Requirements

Update affected docs when behavior or commands change:

- `backend/README.md`
- `frontend/README.md`
- `mcp/README.md`
- `agentic-ai/README.md`
- `grpc/README.md`
- `deployment-control/README.md`
- root docs like `README.md`, `ARCHITECTURE.md`, `DEPLOYMENTS.md`, `DEVOPS.md`, `GRPC_TRPC.md`, `RAG_SYSTEM.md`

## Done Criteria

Finish only when all are true:

1. The requested behavior is implemented.
2. Relevant validations ran, or skips are explicitly documented.
3. Producer and consumer paths were updated for any contract change.
4. Relevant docs were updated.
5. The handoff includes changed files and exact validation commands.
