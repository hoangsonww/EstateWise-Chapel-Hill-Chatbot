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
  - `.codex/`: project-specific Codex multi-agent config and role instructions
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

# ===== FLYWHEEL METHODOLOGY =====

## Invariants (The 9 Rules)
1. Global reasoning belongs in plan space. Read `PLAN.md` for the full system design.
2. The markdown plan must be comprehensive before coding starts.
3. Plan-to-beads is a distinct translation problem. Beads carry self-contained context.
4. Beads are the execution substrate. See `.beads/.status.json`.
5. Convergence matters more than first drafts. Polish beads 4-6 times minimum.
6. Swarm agents are fungible. No specialist bottlenecks.
7. Coordination survives crashes: AGENTS.md + Agent Mail + beads + bv.
8. Session history feeds back into infrastructure via session-memory.
9. Review, testing, and hardening are part of the core method.

## Toolchain

| Tool | Command | Purpose |
|------|---------|---------|
| Beads Viewer | `node tools/bv.mjs` | Graph-theory triage: PageRank, betweenness, critical path |
| Agent Mail | `node tools/agent-mail.mjs` | Agent coordination: identities, messaging, file reservations |
| DCG | `node tools/dcg.mjs` | Destructive Command Guard: blocks dangerous operations |
| Session Memory | `node tools/session-memory.mjs` | 3-layer memory: episodic, working, procedural |

### bv Quick Reference
```bash
node tools/bv.mjs --robot-triage      # Full recommendations with scores
node tools/bv.mjs --robot-next        # Single top pick with claim command
node tools/bv.mjs --robot-plan        # Parallel execution tracks
node tools/bv.mjs --robot-insights    # Full graph metrics
node tools/bv.mjs claim <bead-id>     # Claim a bead
node tools/bv.mjs complete <bead-id>  # Mark bead done
```
CRITICAL: Use ONLY --robot-* flags. Never run bare `bv` in agent sessions.

### Agent Mail Quick Reference
```bash
node tools/agent-mail.mjs register <name>        # Register agent identity
node tools/agent-mail.mjs send <to> <subj> <body> # Direct message
node tools/agent-mail.mjs inbox --unread          # Check inbox
node tools/agent-mail.mjs reserve <glob> --ttl 3600 --reason "br-ORCH-001"
node tools/agent-mail.mjs reservations            # List active reservations
node tools/agent-mail.mjs check <file>            # Check if file is reserved
```

### DCG Quick Reference
```bash
node tools/dcg.mjs <command>          # Validate before execution
node tools/dcg.mjs --test             # Self-tests (19 tests)
node tools/dcg.mjs --install          # Install as git pre-commit hook
node tools/dcg.mjs --check-staged     # Check staged files for secrets
```

### Session Memory Quick Reference
```bash
node tools/session-memory.mjs log <agent> <type> <desc>  # Log event
node tools/session-memory.mjs reflect                     # Distill rules
node tools/session-memory.mjs context <desc>              # Get relevant memories
node tools/session-memory.mjs rules                       # List procedural rules
```

## Compaction Recovery
After EVERY context compaction, immediately run:
```
Reread AGENTS.md so it's still fresh in your mind.
```
This is the single most common prompt. Do it without being asked.

## Post-Compaction Checklist
1. Re-read AGENTS.md (this file)
2. Check Agent Mail inbox
3. Use bv --robot-triage to find next work
4. Review .beads/.status.json for current state

# ===== AGENT SWARM COORDINATION =====

## File Reservation System
Each agent MUST declare file reservations before editing via Agent Mail.
Advisory reservations with TTL (default 1 hour). Not rigid locks.
Check reservations with: `node tools/agent-mail.mjs check <file>`

## Conflict Zones (single agent only)
- `package.json` / `package-lock.json`
- `docker-compose.yml`
- Any shared type definitions
- Any config files (`tsconfig.json`, `.env.example`)
- `.beads/.status.json` (use bv claim/complete instead)

## Safe Parallel Zones
- Individual MCP servers: `mcp/servers/<name>/`
- Individual agent modules: `agentic-ai/orchestration/<name>.ts`
- Individual test files
- Documentation files

## Bead Assignment
Beads: `[AREA-NUM]` (e.g., `ORCH-001`). State in `.beads/.status.json`.
Use `node tools/bv.mjs --robot-next` to pick optimal next bead.
Use `node tools/bv.mjs claim <bead-id>` to claim.
Use `node tools/bv.mjs complete <bead-id>` when done.

## Agent Communication
Use Agent Mail for all coordination:
1. `node tools/agent-mail.mjs send <agent> "[br-XXX] <subject>" "<body>"`
2. Include: finding, affected beads, recommended action
3. Continue own work. Do not block on replies.
4. Check inbox periodically: `node tools/agent-mail.mjs inbox --unread`

## Git Workflow (Single Branch)
All agents work on main. No worktrees. No feature branches per agent.
1. Pull latest
2. Reserve files via Agent Mail
3. Edit and test
4. Commit immediately (small commits, push after each)
5. Release reservations

## Fungible Agents
Every agent is a generalist. No role specialization for the dev swarm.
If an agent crashes, any other agent can pick up its bead.
No "ringleader" agent. Coordination lives in artifacts and tools.

## Forbidden Operations
Run `node tools/dcg.mjs <command>` before any destructive operation.
These are ALWAYS blocked:
- `git reset --hard` (use git stash)
- `git clean -fd` (use git clean -fdn to preview)
- `git checkout -- <file>` (use git stash push <file>)
- `git push --force` (use --force-with-lease)
- `rm -rf` on project paths

## Swarm Marching Orders (paste to each agent)
```
First read ALL of AGENTS.md. Then check Agent Mail inbox. Then use
bv --robot-triage to find optimal next work. Claim a bead, reserve
files, implement, test, commit, push, release reservation, move to
next bead. Communicate progress via Agent Mail.
```

## Orchestration Agents (Runtime, not Dev Swarm)
| Agent ID | Model | Cost Tier | Fallback | Intent |
|----------|-------|-----------|----------|--------|
| `supervisor` | sonnet | medium | — | Maximize fulfillment, minimize cost |
| `property-search` | sonnet | medium | `property-search-lite` | Precision over recall |
| `property-search-lite` | haiku | low | — | Quick results |
| `market-analyst` | opus | high | `market-analyst-lite` | Accuracy, cite sources |
| `market-analyst-lite` | sonnet | medium | — | Good-enough context |
| `conversation-mgr` | haiku | low | — | Keep conversations flowing |
| `data-enrichment` | sonnet | medium | — | Completeness, mark gaps |
| `recommendation` | sonnet | medium | — | Balance explore/exploit |
| `quality-reviewer` | haiku | low | — | Catch hallucinations |
