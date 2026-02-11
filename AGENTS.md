# Repository Guidelines

## Project Structure & Module Ownership

- `backend/` (Express + TypeScript)
  - API bootstrap: `backend/src/server.ts`
  - Routes/controllers/services: `backend/src/routes`, `backend/src/controllers`, `backend/src/services`
  - Graph + Neo4j: `backend/src/graph`
  - Data scripts: `backend/src/scripts` (`upsertProperties.ts`, `ingestNeo4j.ts`, `cleanProperties.ts`)
  - Tests: `backend/tests`
- `frontend/` (Next.js Pages Router + React + Tailwind)
  - Main pages: `frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `frontend/pages/map.tsx`, `frontend/pages/market-pulse.tsx`
  - REST client wrapper: `frontend/lib/api.ts`
  - tRPC API/router: `frontend/pages/api/trpc/[trpc].ts`, `frontend/server/api/routers/insights.ts`
  - Tests: `frontend/__tests__`, `frontend/cypress`, `frontend/selenium`
- `mcp/` (stdio MCP server with 60+ tools)
  - Server entry: `mcp/src/server.ts`
  - Tools: `mcp/src/tools`
  - Shared core (cache/auth/http/config): `mcp/src/core`
- `agentic-ai/` (standalone orchestration + optional HTTP API)
  - Entry: `agentic-ai/src/index.ts`
  - Orchestrator: `agentic-ai/src/orchestrator`
  - Runtimes: default, LangGraph, CrewAI in `agentic-ai/src/runtimes`
  - HTTP server: `agentic-ai/src/http/server.ts`
- `grpc/` (market pulse microservice)
  - Contract: `grpc/proto/market_pulse.proto`
  - Service/server: `grpc/src/services`, `grpc/src/server.ts`
- `deployment-control/` (ops API + Nuxt UI)
  - API: `deployment-control/src`
  - UI: `deployment-control/ui`
- Other important areas
  - `extension/`: VS Code webview extension
  - `kubernetes/`, `helm/`, `terraform/`, `aws/`, `azure/`, `gcp/`, `oracle-cloud/`, `hashicorp/`: infra/deploy assets
  - `docs-backend/`: generated TypeDoc output

## Build, Test, and Development Commands

- Root (full stack convenience)
  - `npm run dev` - run frontend + backend concurrently
  - `npm run frontend` - run frontend only
  - `npm run backend` - run backend only
  - `npm run format` / `npm run lint` - repo-wide Prettier write/check
- Backend (`cd backend`)
  - `npm start` - dev server (`ts-node-dev`)
  - `npm run build` - TypeScript compile
  - `npm run test` - Jest in-band
  - `npm run upsert` - embed/upsert properties to Pinecone
  - `npm run graph:ingest` - ingest Pinecone data into Neo4j
- Frontend (`cd frontend`)
  - `npm run dev` - Next.js dev server
  - `npm run build && npm run start` - production build/start
  - `npm run lint` - ESLint
  - `npm run test` - Jest
  - `npm run cypress:run` / `npm run test:selenium` - E2E suites
- MCP (`cd mcp`)
  - `npm run dev` - stdio MCP server (waits for a client)
  - `npm run build && npm run start` - build + run server
  - `npm run client:dev` - spawn/list tools locally
  - `npm run client:call -- <tool> '<json>'` - call a tool
- Agentic AI (`cd agentic-ai`)
  - `npm run dev "goal"` - run default orchestrator
  - `npm run dev:langgraph -- "goal"` / `npm run dev:crewai -- "goal"`
  - `npm run serve` - dev HTTP server
  - `npm run build && npm run start -- "goal"` - production run
- gRPC (`cd grpc`)
  - `npm run dev` - run service on port `50051` (default)
  - `npm run build && npm run start` - production
  - `npm run test` - Vitest
  - `npm run proto:check` - `buf lint`
- Deployment Control (`cd deployment-control`)
  - `npm run install:all` - install API + UI dependencies
  - `npm run dev` - API (`:4100`)
  - `npm run dev:ui` - Nuxt UI (`:3000`)
  - `npm run build` - build API + UI

## Coding Style & Conventions

- TypeScript-first across services; keep 2-space indentation and semicolons.
- Keep naming consistent:
  - React components: PascalCase
  - functions/variables: camelCase
  - Next pages: lowercase filenames in `frontend/pages`
  - Backend models: `PascalCase.model.ts` pattern when applicable
- Prefer small, targeted changes over broad refactors, especially in large files (`frontend/pages/chat.tsx`, `frontend/pages/insights.tsx`, `backend/src/services/geminiChat.service.ts`).

## Testing Guidelines

- Choose the smallest relevant test scope first.
- Core locations:
  - Backend: `backend/tests`
  - Frontend unit/API: `frontend/__tests__`
  - Frontend E2E: `frontend/cypress`, `frontend/selenium`
  - gRPC: `grpc/src/**/*.test.ts` via Vitest
- If changing contracts, test both producer and consumer paths:
  - Backend API changes -> frontend callers and MCP wrappers
  - MCP tool changes -> local MCP client call flow
  - Proto changes -> handler + lint + downstream compatibility checks

## Workflow & Change Rules

- Keep patches surgical; do not refactor unrelated code.
- Do not move/rename files unless required by the request.
- Update docs when behavior, commands, or contracts change:
  - `backend/README.md`, `frontend/README.md`, `mcp/README.md`, `agentic-ai/README.md`, `grpc/README.md`, `deployment-control/README.md`
- Prefer backward-compatible API/proto changes unless explicitly doing breaking work.

## Cross-Service Gotchas

- Frontend API URLs are defined in multiple places (not only `frontend/lib/api.ts`); align all affected call sites for local/prod behavior.
- `backend/src/server.ts` middleware/route order matters (auth, metrics, swagger, tRPC, error middleware).
- Graph features require Neo4j enabled and ingested data before `/api/graph/*` endpoints return meaningful results.
- Map experiences should keep marker/query volume bounded (default UX expectation is roughly 200 markers).
- MCP `npm run dev` appears idle until a client connects; this is expected behavior.
- Deployment-control API currently has no built-in auth/RBAC; use only in trusted environments or behind a secured proxy.

## Security & Configuration

- Never commit secrets or `.env` files.
- Start from `.env.example` and set required keys:
  - `MONGO_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`
  - Neo4j keys for graph workflows: `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, `NEO4J_DATABASE`, `NEO4J_ENABLE=true`
- For MCP token workflows, configure `MCP_TOKEN_SECRET` and related TTL variables in `mcp/.env`.

## Commits & PRs

- Use concise imperative commit subjects (example: `Add graph explanation timeout guard`).
- Keep each PR focused on a coherent change set.
- PRs should include:
  - Context/problem statement
  - Exact validation commands run
  - UI screenshots or endpoint examples when relevant
  - Linked issue(s), if available
