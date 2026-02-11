---
name: estatewise-engineering
description: Implementation playbook for the EstateWise monorepo. Use when adding or fixing features across backend, frontend, MCP tools, agentic-ai runtimes, gRPC services, deployment-control, tests, or related docs.
argument-hint: [task-or-scope]
---

# EstateWise Engineering

Use this skill whenever work touches this repository.

## Mission

Deliver production-safe, surgical changes in the correct subsystem, then verify only what changed.

## Always Do First

1. Classify the request:
   - Backend API (`backend/`)
   - Frontend UI/Pages (`frontend/`)
   - MCP server/tools (`mcp/`)
   - Agent orchestration (`agentic-ai/`)
   - gRPC market service (`grpc/`)
   - Deployment dashboard (`deployment-control/`)
   - Infra/docs (`kubernetes/`, `terraform/`, cloud folders, root docs)
2. Locate the real entry points before editing (`rg` first, then open exact files).
3. Keep patches surgical. Do not refactor unrelated modules.

## Fast Repo Map

- Core app docs: `README.md`, `ARCHITECTURE.md`, `RAG_SYSTEM.md`, `GRPC_TRPC.md`, `DEPLOYMENTS.md`, `DEVOPS.md`
- Backend API:
  - Bootstrap: `backend/src/server.ts`
  - Routes: `backend/src/routes/`
  - Controllers: `backend/src/controllers/`
  - Services: `backend/src/services/`
  - Graph + Neo4j: `backend/src/graph/`
  - Scripts: `backend/src/scripts/`
  - Tests: `backend/tests/`
- Frontend:
  - Pages: `frontend/pages/`
  - Shared API wrapper: `frontend/lib/api.ts`
  - tRPC router: `frontend/server/api/routers/insights.ts`
  - Tests: `frontend/__tests__/`, `frontend/cypress/`, `frontend/selenium/`
- MCP:
  - Server registry: `mcp/src/server.ts`
  - Tool modules: `mcp/src/tools/`
  - Core HTTP/config/token: `mcp/src/core/`
- Agentic AI:
  - Main entry: `agentic-ai/src/index.ts`
  - Orchestrator: `agentic-ai/src/orchestrator/`
  - Runtimes: `agentic-ai/src/runtimes/`
  - HTTP API: `agentic-ai/src/http/server.ts`
- gRPC:
  - Contract: `grpc/proto/market_pulse.proto`
  - Server: `grpc/src/server.ts`
  - Service logic: `grpc/src/services/marketPulseService.ts`
- Deployment control:
  - API: `deployment-control/src/server.ts`
  - Job/kubectl helpers: `deployment-control/src/jobRunner.ts`, `deployment-control/src/kubectl.ts`
  - UI: `deployment-control/ui/`

## Preflight Checks

- Environment:
  - Start from `.env.example`.
  - Commonly required backend vars: `MONGO_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`.
  - Graph features require Neo4j (`NEO4J_ENABLE=true` plus URI/user/password/database).
- Local backend/frontend pairing:
  - Frontend currently includes hardcoded backend URLs in multiple files (not just `frontend/lib/api.ts`).
  - If local testing is requested, align those URLs to local backend.

## Change Routing Rules

### Backend feature or bug

1. Update route/controller/service in `backend/src/`.
2. If graph behavior changes, inspect `backend/src/graph/` and any Neo4j guards.
3. If response schema changes, verify frontend callers and MCP wrappers still parse correctly.
4. Add or update backend tests in `backend/tests/`.
5. Update backend docs when endpoints/behavior change (`backend/README.md`, swagger annotations if applicable).

### Frontend feature or bug

1. Edit the specific page in `frontend/pages/` and related shared components.
2. If API contract changed, update `frontend/lib/api.ts` and any page-level direct fetch constants.
3. For chat/insights/map, preserve existing interaction patterns and avoid broad rewrites in large files.
4. Add/update tests in Jest/Cypress/Selenium only for affected flows.
5. If route behavior changes, update frontend docs.

### MCP tool change

1. Implement in the correct `mcp/src/tools/*.ts` module with zod input validation.
2. Register or wire in `mcp/src/server.ts` if needed.
3. Keep outputs MCP-client-friendly (stringified JSON payload style used by this project).
4. Validate with:
   - `npm run build`
   - `npm run client:call -- <tool> '<json>'`
5. Update `mcp/README.md` tool list when adding/removing/renaming tools.

### Agentic AI change

1. Determine runtime target first:
   - Default orchestrator (`AgentOrchestrator`)
   - LangGraph runtime
   - CrewAI runtime
2. Keep tool contracts compatible with MCP server expectations.
3. Verify with one realistic goal run after build.
4. Update `agentic-ai/README.md` if runtime flags/behavior change.

### gRPC change

1. If API shape changes, update `grpc/proto/market_pulse.proto` first.
2. Keep backward compatibility for existing clients where possible.
3. Update handlers/services and run tests.
4. Run `npm run proto:check` on proto edits.
5. Update `grpc/README.md` contract notes/examples when RPC behavior changes.

### Deployment control change

1. If API behavior changes, update `deployment-control/src/server.ts` plus corresponding UI page/store usage.
2. Preserve job lifecycle semantics (`queued/running/succeeded/failed`) and output limits.
3. Validate both API and UI build/start paths.
4. Update `deployment-control/README.md` endpoints/examples for API changes.

## Verification Matrix

Run only relevant checks; do not run unrelated heavy suites unless requested.

- Root:
  - `npm run format` (repo-wide, expensive; use only when requested)
- Backend (`backend/`):
  - `npm run build`
  - `npm run test`
- Frontend (`frontend/`):
  - `npm run build`
  - `npm run test`
  - `npm run lint` (when touching UI/TS lint-sensitive paths)
- MCP (`mcp/`):
  - `npm run build`
  - `npm run client:dev` or `npm run client:call -- ...`
- Agentic AI (`agentic-ai/`):
  - `npm run build`
  - `npm run dev "your goal"` or `npm run test`
- gRPC (`grpc/`):
  - `npm run build`
  - `npm run test`
  - `npm run proto:check` (if proto touched)
- Deployment control (`deployment-control/`):
  - `npm run build:api`
  - `npm run build:ui` (or `npm run build`)

## High-Risk Areas (Edit Carefully)

- `frontend/pages/chat.tsx` and `frontend/pages/insights.tsx` are very large; make minimal localized edits.
- `backend/src/services/geminiChat.service.ts` is central to response behavior; avoid accidental prompt or flow regressions.
- `backend/src/server.ts` affects middleware ordering, metrics, swagger, and route wiring.
- `frontend/lib/api.ts` and page-level direct URLs can silently break local/prod behavior if changed inconsistently.
- `mcp/src/core/token.ts` and `mcp/src/core/http.ts` affect many tools globally.

## Coding and Patch Standards

- TypeScript-first changes; keep existing style (2-space indentation, semicolons, existing quote style).
- Prefer explicit types and narrow changes over broad abstractions.
- Do not rename/move files unless needed by the task.
- Keep commits logically focused by subsystem.
- Never commit secrets or `.env` values.

## Done Criteria

Only consider work complete when all are true:

1. Behavior matches request in the correct subsystem(s).
2. Affected tests/build checks pass, or limitations are explicitly documented.
3. Any changed API/tool/route contract is reflected in docs.
4. Notes include exact files changed and how to validate.

## Useful Command Shortcuts

```bash
# full-stack local dev (frontend + backend)
npm run dev

# backend only
cd backend && npm start

# frontend only
cd frontend && npm run dev

# mcp quick sanity
cd mcp && npm run build && npm run client:dev

# agentic ai quick run
cd agentic-ai && npm run build && npm run dev "Find 3-bed homes in Chapel Hill"

# grpc local run
cd grpc && npm run dev

# deployment-control local run
cd deployment-control && npm run install:all && npm run dev
```
