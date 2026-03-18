# EstateWise Claude Code Memory

This file is the always-on memory for Claude Code in this repository. Keep it lean. Put deep reference material and repeatable workflows in project skills under `.claude/skills/` so they load on demand instead of every session.

## Use The Right Skill

- `/estatewise-engineering` for most code changes anywhere in the monorepo.
- `/estatewise-review` for PR review, diff review, bug hunt, regression checks, or test-gap review.
- `/estatewise-contracts` when REST, tRPC, MCP, gRPC, A2A, or shared payloads might change.
- `/estatewise-ai-runtime` when work touches MCP, agentic-ai, web-grounding, token flows, or A2A.
- `/estatewise-local-stack` for local setup, run commands, service combinations, and environment debugging.
- `/estatewise-ops` for deployment-control, Docker, Kubernetes, Helm, Terraform, Jenkins, or cloud deployment assets.

## Always-On Rules

- Make surgical changes only. Do not refactor unrelated modules.
- Preserve existing contracts unless the task explicitly requests a breaking change.
- If you change a producer contract, update the consumer path in the same task.
- Run the smallest relevant validation for touched packages before handoff.
- Update package or root docs when behavior, commands, or contracts change.
- Never commit secrets, `.env` values, or environment-specific credentials.

## Monorepo Map

- `backend/`: Express + TypeScript API, auth, chat, properties, forums, commute, graph, Swagger, Prometheus, tRPC bridge.
- `frontend/`: Next.js Pages Router app, chat/map/insights/market-pulse pages, direct REST calls plus local tRPC API.
- `mcp/`: stdio MCP server with 60+ tools, token workflows, monitoring, web tools, and A2A bridge tools.
- `agentic-ai/`: standalone multi-agent runtime with default orchestrator, LangGraph, CrewAI, and HTTP/A2A endpoints.
- `grpc/`: market pulse proto contract and Node gRPC service.
- `context-engineering/`: knowledge graph engine, knowledge base, context window management, ingestion pipeline, D3 visualization UI, and MCP/agent integration.
- `deployment-control/`: ops API plus separate Nuxt UI for deployment actions.
- Infra/docs: `docker/`, `kubernetes/`, `helm/`, `terraform/`, `aws/`, `azure/`, `gcp/`, `oracle-cloud/`, `hashicorp/`, root architecture/deployment docs.

## High-Signal Entry Points

- Backend bootstrap: `backend/src/server.ts`
- Frontend REST wrapper: `frontend/lib/api.ts`
- Frontend heavy pages: `frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `frontend/pages/map.tsx`, `frontend/pages/market-pulse.tsx`
- MCP entry: `mcp/src/server.ts`
- MCP tool registry: `mcp/src/tools/index.ts`
- Agentic CLI entry: `agentic-ai/src/index.ts`
- Agentic HTTP/A2A server: `agentic-ai/src/http/server.ts`
- gRPC contract: `grpc/proto/market_pulse.proto`
- Context engineering entry: `context-engineering/src/serve.ts`
- Context graph engine: `context-engineering/src/graph/KnowledgeGraph.ts`
- Context factory: `context-engineering/src/factory.ts`
- Context D3 UI: `context-engineering/src/ui/public/index.html`
- Deployment-control API: `deployment-control/src/server.ts`

## Important Repo Gotchas

- `backend/src/server.ts` middleware and route order matter. Keep metrics, status, swagger, REST, tRPC, and error middleware in a sane order.
- Frontend backend URLs are duplicated in multiple places, not just `frontend/lib/api.ts`. Search for `estatewise-backend.vercel.app` before assuming one edit is enough.
- `frontend/pages/chat.tsx` and `frontend/pages/insights.tsx` are large; prefer localized patches.
- Graph features require Neo4j config plus ingested data. Otherwise `/api/graph/*` endpoints may return 503 or empty results.
- `mcp npm run dev` is stdio and waits for a client. An apparently idle terminal is expected.
- MCP tool outputs are intentionally text-first and often stringified JSON for client portability.
- `deployment-control` has no built-in auth/RBAC. Treat it as trusted-environment tooling unless the task adds explicit security.
- `context-engineering` seeds 42 graph nodes + 55 edges + 10 KB docs on startup; the graph is never empty. Neo4j sync is optional (graceful degradation). UI runs on port 4200.

## Validation Defaults

```bash
# Root
npm run dev
npm run format
npm run lint

# Backend
cd backend && npm run build && npm run test

# Frontend
cd frontend && npm run build && npm run test
cd frontend && npm run lint

# MCP
cd mcp && npm run build
cd mcp && npm run client:call -- <tool> '<json>'

# Agentic AI
cd agentic-ai && npm run build
cd agentic-ai && npm run dev "your goal"

# gRPC
cd grpc && npm run build && npm run test
cd grpc && npm run proto:check

# Context Engineering
cd context-engineering && npm run build
cd context-engineering && npm run dev        # starts API + D3 UI on :4200
cd context-engineering && npm run seed       # verify seed data

# Deployment Control
cd deployment-control && npm run build
cd deployment-control && npm run build:api
cd deployment-control && npm run build:ui
```

## Documentation Expectations

- Update `backend/README.md`, `frontend/README.md`, `mcp/README.md`, `agentic-ai/README.md`, `grpc/README.md`, or `deployment-control/README.md` when their behavior or commands change.
- Update root docs like `README.md`, `ARCHITECTURE.md`, `DEPLOYMENTS.md`, `DEVOPS.md`, `GRPC_TRPC.md`, or `RAG_SYSTEM.md` when architecture or operating guidance changes.
- Keep new long-form guidance in skills, not in this file.
