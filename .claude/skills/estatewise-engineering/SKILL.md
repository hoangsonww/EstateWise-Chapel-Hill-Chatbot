---
name: estatewise-engineering
description: Default implementation playbook for the EstateWise monorepo. Use when adding or fixing behavior in backend, frontend, MCP, agentic-ai, gRPC, deployment-control, tests, or docs.
argument-hint: [task-or-scope]
---

# EstateWise Engineering

Use this skill for most coding tasks in this repository.

## Mission

Implement the smallest defensible change in the correct subsystem, preserve contracts, and validate only the touched surface.

## Step 1: Classify The Work

Identify the owning subsystem before editing:

- `backend/`: Express API, auth, chat, forums, properties, graph, commute, Swagger, Prometheus, tRPC bridge.
- `frontend/`: Next.js pages, REST client wrapper, local tRPC API, charts, map, forums, auth flows.
- `mcp/`: stdio MCP server, tool registry, token flows, monitoring, web research, A2A bridge.
- `agentic-ai/`: default orchestrator, LangGraph runtime, CrewAI runtime, HTTP server, A2A endpoints.
- `grpc/`: `market_pulse.proto`, service logic, server bootstrap.
- `deployment-control/`: deployment API, job runner, kubectl integration, Nuxt UI.
- Infra/docs: Docker, Kubernetes, Helm, Terraform, cloud folders, Jenkins/GitLab/GitHub docs, root architecture docs.

If the task spans multiple subsystems, sequence work from contract producer to contract consumer.

## Step 2: Find Real Entry Points

Use `rg` first. Do not broad-scan once the owning files are clear.

High-value anchors:

- Backend bootstrap: `backend/src/server.ts`
- Backend routes/controllers/services: `backend/src/routes/`, `backend/src/controllers/`, `backend/src/services/`
- Graph workflows: `backend/src/graph/`
- Frontend shared REST wrapper: `frontend/lib/api.ts`
- Frontend pages: `frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `frontend/pages/map.tsx`, `frontend/pages/market-pulse.tsx`
- Frontend local tRPC: `frontend/pages/api/trpc/[trpc].ts`, `frontend/server/api/routers/insights.ts`
- MCP entry + registry: `mcp/src/server.ts`, `mcp/src/tools/index.ts`
- Agentic runtime entrypoints: `agentic-ai/src/index.ts`, `agentic-ai/src/http/server.ts`, `agentic-ai/src/orchestrator/`
- gRPC contract + service: `grpc/proto/market_pulse.proto`, `grpc/src/services/marketPulseService.ts`
- Deployment-control API/UI: `deployment-control/src/server.ts`, `deployment-control/ui/`

## Step 3: Apply The Subsystem Playbook

### Backend

1. Update route/controller/service in `backend/src/`.
2. Preserve middleware and route order in `backend/src/server.ts`.
3. If an endpoint or payload changes, update frontend callers, MCP wrappers, and docs in the same task.
4. Add or adjust tests under `backend/tests`.
5. Keep Swagger annotations aligned when endpoint behavior changes.

### Frontend

1. Patch the smallest owning page or component.
2. Check both `frontend/lib/api.ts` and direct page-level fetches for backend URL or payload assumptions.
3. Keep large files like `chat.tsx` and `insights.tsx` localized.
4. Update Jest/Cypress/Selenium coverage only where behavior actually changed.
5. If a route or page capability changed, update `frontend/README.md`.

### MCP

1. Update the correct tool module in `mcp/src/tools/`.
2. Preserve Zod input validation and stringified text outputs for client portability.
3. Register new tool modules or exports in the registry when needed.
4. Validate with `npm run build` and at least one `client:call`.
5. Update `mcp/README.md` when tool names, inputs, or outputs change.

### Agentic AI

1. Decide which runtime owns the change: default orchestrator, LangGraph, CrewAI, or HTTP/A2A layer.
2. Keep tool call contracts aligned with the MCP server.
3. Validate with a realistic goal run after build.
4. Update `agentic-ai/README.md` when runtime flags, server endpoints, or workflow semantics change.

### gRPC

1. Treat `grpc/proto/market_pulse.proto` as the contract source.
2. Keep backward compatibility unless the task explicitly requests a breaking change.
3. Update handlers and server wiring after proto changes.
4. Run proto lint and tests on proto edits.
5. Update `grpc/README.md` examples when RPC behavior changes.

### Deployment Control

1. Keep API and UI behavior aligned.
2. Preserve job status semantics and output handling.
3. Be explicit about trust boundaries; there is no built-in auth/RBAC.
4. Validate both API and UI build paths when touched.
5. Update `deployment-control/README.md` for endpoint or workflow changes.

## Step 4: Guard Cross-Service Contracts

When one layer changes, immediately inspect its dependents:

- Backend REST change:
  - `frontend/lib/api.ts`
  - page-level direct `fetch(...)` usage in `frontend/pages/`
  - MCP tools under `mcp/src/tools/`
  - docs in `backend/README.md`, `frontend/README.md`, and root docs if public behavior changed

- Frontend local tRPC change:
  - `frontend/server/api/routers/`
  - `frontend/lib/trpc.tsx`
  - consuming pages/components

- MCP tool change:
  - `mcp/src/client.ts`
  - agentic-ai MCP wrappers or runtime assumptions
  - `mcp/README.md`

- Agentic A2A or HTTP change:
  - `agentic-ai/src/http/server.ts`
  - `mcp/src/tools/a2a.ts`
  - `agentic-ai/README.md`

- gRPC contract change:
  - `grpc/src/services/`
  - any clients/examples/docs

Use `/estatewise-contracts` if the contract surface is nontrivial.

## Step 5: Validate Only What Changed

Use the smallest sufficient check set:

- Root:
  - `npm run format` or `npm run lint` only when requested or when broad formatting-sensitive files changed.

- Backend:
  - `cd backend && npm run build`
  - `cd backend && npm run test`

- Frontend:
  - `cd frontend && npm run build`
  - `cd frontend && npm run test`
  - `cd frontend && npm run lint`

- MCP:
  - `cd mcp && npm run build`
  - `cd mcp && npm run client:call -- <tool> '<json>'`

- Agentic AI:
  - `cd agentic-ai && npm run build`
  - `cd agentic-ai && npm run dev "realistic goal"`

- gRPC:
  - `cd grpc && npm run build`
  - `cd grpc && npm run test`
  - `cd grpc && npm run proto:check`

- Deployment Control:
  - `cd deployment-control && npm run build`
  - or `cd deployment-control && npm run build:api && npm run build:ui`

If environment dependencies block validation, state exactly what was skipped and why.

## High-Risk Areas

- `backend/src/server.ts`: middleware order, metrics, swagger, routing, boot behavior.
- `backend/src/services/geminiChat.service.ts`: core generation flow and prompt behavior.
- `frontend/pages/chat.tsx`: huge page with many direct API calls.
- `frontend/pages/insights.tsx`: large page with multiple graph/analytics flows.
- `frontend/lib/api.ts`: shared REST client contract.
- `mcp/src/core/http.ts` and `mcp/src/core/token.ts`: global behavior across many tools.
- `agentic-ai/src/http/server.ts`: HTTP + A2A contract surface.
- `grpc/proto/market_pulse.proto`: source of truth for gRPC changes.

## Done Criteria

Do not stop at code edits. The task is complete only when:

1. The requested behavior is implemented in the correct subsystem.
2. Affected validations ran, or skips are explicitly documented.
3. Producer and consumer paths were updated for any contract change.
4. Relevant package or root docs were updated.
5. The handoff includes exact files changed and validation commands run.
