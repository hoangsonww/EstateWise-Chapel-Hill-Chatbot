---
name: estatewise-local-stack
description: Manual runbook for local setup, service combinations, and environment debugging in EstateWise. Use when you need to start or troubleshoot the local stack.
argument-hint: [service-or-scenario]
disable-model-invocation: true
---

# EstateWise Local Stack

Invoke this skill manually when the task is about running or debugging the local environment.

## Pick The Smallest Service Combination

### Frontend + backend only

Use for chat, auth, conversation, forums, and most UI work:

```bash
# repo root
npm run dev
```

Or individually:

```bash
cd backend && npm start
cd frontend && npm run dev
```

### Backend only

Use for API, auth, Swagger, metrics, graph, or conversation work:

```bash
cd backend
npm start
```

Useful endpoints:

- `http://localhost:3001/api-docs`
- `http://localhost:3001/swagger.json`
- `http://localhost:3001/metrics`
- `http://localhost:3001/status`

### Frontend only

Use when changing local tRPC pages or static UI, or when backend work is not required:

```bash
cd frontend
npm run dev
```

Note: frontend local tRPC endpoints live inside Next.js and do not require the Express backend.

### MCP only

Use when adding or debugging tools:

```bash
cd mcp
npm install
npm run build
npm run client:dev
```

`npm run dev` waits for a client and appears idle. That is expected.

### Agentic AI + MCP

Use for orchestration or tool-consumer debugging:

```bash
cd mcp && npm install && npm run build
cd ../agentic-ai && npm install && npm run build
npm run dev "Find 3-bed homes in Chapel Hill and estimate mortgage"
```

### gRPC

Use for market pulse service work:

```bash
cd grpc
npm install
npm run dev
```

### Deployment Control

Use for deployment dashboard/API work:

```bash
cd deployment-control
npm run install:all
npm run dev
npm run dev:ui
```

## Environment Checklist

Common backend env:

- `MONGO_URI`
- `JWT_SECRET`
- `GOOGLE_AI_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_INDEX`

Graph-specific env:

- `NEO4J_ENABLE=true`
- `NEO4J_URI`
- `NEO4J_USERNAME`
- `NEO4J_PASSWORD`
- `NEO4J_DATABASE`

MCP-specific env:

- `API_BASE_URL`
- `FRONTEND_BASE_URL`
- `A2A_BASE_URL`
- `MCP_TOKEN_SECRET`

## High-Frequency Local Debugging Problems

### Frontend hits deployed backend unexpectedly

Search for hardcoded URLs:

```bash
rg -n "estatewise-backend\\.vercel\\.app|API_BASE_URL" frontend
```

Do not assume `frontend/lib/api.ts` is the only call site.

### MCP seems hung

It is probably waiting for a stdio client. Use:

```bash
cd mcp && npm run client:dev
```

### Graph endpoints return 503 or empty data

Check Neo4j env and whether graph ingest actually ran.

### Agentic AI fails to call tools

Confirm MCP built successfully and that tool names in the consumer runtime still match the MCP registry.

### Deployment-control works locally but is operationally unsafe

Remember it has no built-in auth/RBAC. Only run against trusted environments.

## Validation Reference

- Backend: `cd backend && npm run build && npm run test`
- Frontend: `cd frontend && npm run build && npm run test`
- MCP: `cd mcp && npm run build && npm run client:call -- <tool> '<json>'`
- Agentic AI: `cd agentic-ai && npm run build && npm run dev "goal"`
- gRPC: `cd grpc && npm run build && npm run test`
- Deployment Control: `cd deployment-control && npm run build`
