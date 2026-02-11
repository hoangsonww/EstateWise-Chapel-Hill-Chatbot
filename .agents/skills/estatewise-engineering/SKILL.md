---
name: estatewise-engineering
description: Execute production-safe code changes in the EstateWise monorepo (backend, frontend, mcp, agentic-ai, grpc, deployment-control) with accurate package commands, cross-service contract checks, targeted validation, and docs updates. Use when implementing or fixing code in this repository. Do not use for skill-installation tasks, pure brainstorming, or work outside this repo.
---

# EstateWise Engineering Skill

Follow this workflow whenever this skill is activated.

## Objective

Deliver minimal, correct changes in the right subsystem, validate only impacted areas, and keep cross-service contracts consistent.

## Operating Rules

1. Keep patches surgical.
2. Do not refactor unrelated files.
3. Preserve backward compatibility unless the user asks for a breaking change.
4. Avoid changing environment defaults unless explicitly requested.
5. Never commit secrets or `.env` values.

## Step 1: Classify Scope

Classify the request before editing files.

- `backend/`: Express API, auth, chat, properties, graph, forums, commute.
- `frontend/`: Next.js pages/UI, API calls, charts, map.
- `mcp/`: MCP stdio server and tool surface.
- `agentic-ai/`: orchestrator/runtimes/HTTP runner.
- `grpc/`: Market Pulse gRPC service and proto contract.
- `deployment-control/`: deployment operations API + Nuxt UI.
- Infra/docs: Kubernetes, Terraform, cloud folders, and root docs.

If the request spans multiple subsystems, list all touched systems up front and sequence work from producer -> consumer (contract source first).

## Step 2: Find True Entry Points

Locate exact files before coding.

- Use `rg`/`rg --files` first.
- Open only relevant files; avoid broad file sweeps after scope is clear.
- Confirm current scripts in each touched `package.json` before running commands.

Primary anchors:

- Backend bootstrap: `backend/src/server.ts`
- Backend routes/controllers/services: `backend/src/routes`, `backend/src/controllers`, `backend/src/services`
- Graph + Neo4j: `backend/src/graph`
- Frontend API wrapper: `frontend/lib/api.ts`
- Frontend key pages: `frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `frontend/pages/map.tsx`
- MCP server/tools/core: `mcp/src/server.ts`, `mcp/src/tools`, `mcp/src/core`
- Agentic entry/orchestrator: `agentic-ai/src/index.ts`, `agentic-ai/src/orchestrator`
- gRPC contract + service: `grpc/proto/market_pulse.proto`, `grpc/src/services/marketPulseService.ts`
- Deployment-control API/UI: `deployment-control/src/server.ts`, `deployment-control/ui/`

## Step 3: Apply Subsystem Playbook

### Backend changes

1. Update route/controller/service in `backend/src/`.
2. Maintain middleware/route ordering guarantees in `backend/src/server.ts`.
3. If response shape changes, update all consumers (`frontend`, `mcp`, and `agentic-ai` when applicable).
4. Add or adjust tests under `backend/tests`.

### Frontend changes

1. Edit page/component with minimal churn.
2. Keep API integrations aligned across all call sites.
3. Check for direct backend URL usage beyond `frontend/lib/api.ts`.
4. Avoid broad rewrites in very large files; patch locally.

### MCP changes

1. Add or modify tool logic in `mcp/src/tools`.
2. Ensure input validation remains strict.
3. Register/wire tool exports in `mcp/src/server.ts` as needed.
4. Preserve output format consistency expected by MCP clients.

### Agentic AI changes

1. Decide runtime target first (default/LangGraph/CrewAI).
2. Keep tool invocation contracts aligned with MCP server behavior.
3. Validate at least one realistic goal path.

### gRPC changes

1. Treat `grpc/proto/market_pulse.proto` as contract source.
2. Update handlers/services after proto edits.
3. Preserve backward compatibility where possible.
4. Run proto lint on every proto change.

### Deployment-control changes

1. Keep API and UI behavior aligned.
2. Preserve job state semantics and output handling.
3. Avoid introducing security assumptions; this service is typically run behind trusted controls.

## Step 4: Enforce Cross-Service Contract Safety

Run these checks whenever relevant:

- Backend endpoint or payload change:
  - update frontend callers
  - update MCP wrappers/tools that hit backend APIs
  - update docs/examples

- MCP tool name/input/output change:
  - verify `mcp` client call path
  - verify agentic-ai integrations consuming that tool
  - update `mcp/README.md`

- tRPC/local insights change in frontend:
  - verify page-level usage and `frontend/server/api/routers/insights.ts`

- gRPC proto change:
  - update service impl
  - run proto lint + tests
  - update grpc docs/examples

- Deployment-control API change:
  - update corresponding Nuxt UI calls/state
  - update deployment-control docs

## Step 5: Validate Only What Changed

Run the smallest sufficient verification matrix.

### Root

- `npm run dev` (when full-stack behavior matters)
- `npm run format` or `npm run lint` only when requested or clearly needed

### Backend (`cd backend`)

- `npm run build`
- `npm run test`

### Frontend (`cd frontend`)

- `npm run build`
- `npm run test`
- `npm run lint` when touching UI/TS lint-sensitive code

### MCP (`cd mcp`)

- `npm run build`
- `npm run client:dev` or `npm run client:call -- <tool> '<json>'`

### Agentic AI (`cd agentic-ai`)

- `npm run build`
- `npm run dev \"<realistic goal>\"` or `npm run test`

### gRPC (`cd grpc`)

- `npm run build`
- `npm run test`
- `npm run proto:check` if proto touched

### Deployment-control (`cd deployment-control`)

- `npm run build:api`
- `npm run build:ui` or `npm run build`

If environment dependencies block tests (keys/services/cluster access), report exactly what was skipped and why.

## Step 6: Update Documentation Where Needed

Update only the docs affected by the change:

- `backend/README.md`
- `frontend/README.md`
- `mcp/README.md`
- `agentic-ai/README.md`
- `grpc/README.md`
- `deployment-control/README.md`
- root docs when architecture/ops behavior changed (`ARCHITECTURE.md`, `DEPLOYMENTS.md`, `DEVOPS.md`, `GRPC_TRPC.md`, `RAG_SYSTEM.md`)

## High-Risk Files (Extra Caution)

- `backend/src/services/geminiChat.service.ts`
- `backend/src/server.ts`
- `frontend/pages/chat.tsx`
- `frontend/pages/insights.tsx`
- `frontend/lib/api.ts`
- `mcp/src/core/token.ts`
- `mcp/src/core/http.ts`

In these files, prefer minimal diffs and avoid style-only churn.

## Environment Notes

Core backend variables are commonly required:

- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_AI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`

Graph workflows additionally require Neo4j settings and ingest readiness.

## Completion Checklist

Mark the task complete only when all items are true:

1. Requested behavior is implemented.
2. Affected package-level validations ran (or skips were explicitly documented).
3. Cross-service consumers were updated for any contract changes.
4. Relevant docs were updated.
5. Final report includes changed files and exact validation commands.

## Response Format

Use this structure in the final user response:

1. Outcome summary (what changed).
2. File list with purpose.
3. Validation commands run and results.
4. Any skipped checks with concrete reason.
5. Optional next step(s) only if natural.
