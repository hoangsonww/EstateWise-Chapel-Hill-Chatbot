# EstateWise Claude Context

See @AGENTS.md for full repository conventions and @README.md for architecture/product context.

## Scope Rules

- Make surgical changes only. Do not refactor unrelated modules.
- Preserve existing contracts unless the task explicitly requests a breaking change.
- When changing contracts (REST/tRPC/MCP/proto), update both producer and consumer paths in the same task.

## Preferred Workflow

1. Identify subsystem first: `backend`, `frontend`, `mcp`, `agentic-ai`, `grpc`, or `deployment-control`.
2. Locate exact entrypoints with `rg` before editing.
3. Implement minimal patch.
4. Run smallest relevant build/tests.
5. Update docs if behavior or commands changed.

## Command Quick Reference

```bash
# Root
npm run dev

# Backend
cd backend && npm start
cd backend && npm run build && npm run test

# Frontend
cd frontend && npm run dev
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

# Deployment Control
cd deployment-control && npm run build
```

## Testing Policy

- Prefer targeted tests over whole-suite runs.
- Run builds for touched packages before handoff.
- If tests cannot run (env/service limitations), state exactly what was skipped and why.

## Environment & Integration Gotchas

- Required backend envs: `MONGO_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`.
- Graph features need Neo4j configured + ingested.
- Frontend backend base URLs exist in multiple files, not only `frontend/lib/api.ts`.
- `mcp npm run dev` is stdio and waits for a client; apparent idle state is expected.

## Documentation Policy

- Update relevant package README when changing:
  - API endpoints or payloads
  - Tool names/inputs/outputs
  - Runtime flags/commands
  - Deployment/control endpoints or behavior
