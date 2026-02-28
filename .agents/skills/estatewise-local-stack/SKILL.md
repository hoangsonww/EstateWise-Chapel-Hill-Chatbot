---
name: estatewise-local-stack
description: Run or debug the EstateWise local environment. Use when setting up services, choosing the smallest service combination, checking local endpoints, or troubleshooting environment/config issues. Do not use for routine code implementation unless local run/debugging is the main task.
---

# EstateWise Local Stack

Use this skill when the task is about running or debugging the local environment.

## Smallest Useful Service Combinations

### Frontend + backend

```bash
npm run dev
```

Or separately:

```bash
cd backend && npm start
cd frontend && npm run dev
```

### Backend only

```bash
cd backend
npm start
```

Useful local endpoints:

- `http://localhost:3001/api-docs`
- `http://localhost:3001/swagger.json`
- `http://localhost:3001/metrics`
- `http://localhost:3001/status`

### Frontend only

```bash
cd frontend
npm run dev
```

Note: local frontend tRPC endpoints live inside Next.js and do not require the Express backend.

### MCP only

```bash
cd mcp
npm install
npm run build
npm run client:dev
```

`npm run dev` waits for a stdio client and looks idle by design.

### Agentic AI + MCP

```bash
cd mcp && npm install && npm run build
cd ../agentic-ai && npm install && npm run build
npm run dev "Find 3-bed homes in Chapel Hill and estimate mortgage"
```

### gRPC

```bash
cd grpc
npm install
npm run dev
```

### Deployment Control

```bash
cd deployment-control
npm run install:all
npm run dev
npm run dev:ui
```

## Frequent Local Failure Modes

- Frontend hits the deployed backend unexpectedly because URLs are duplicated across multiple files.
- MCP appears hung because it is waiting for a stdio client.
- Graph endpoints fail because Neo4j is disabled or not ingested.
- Agentic AI fails because MCP was not built or a tool contract drifted.
- Deployment-control works locally but is still unsafe by default because it has no built-in auth/RBAC.

## Helpful Searches

- `rg -n "estatewise-backend\\.vercel\\.app|API_BASE_URL" frontend`
- `rg -n "A2A_BASE_URL|API_BASE_URL|FRONTEND_BASE_URL" mcp agentic-ai`
- `rg -n "NEO4J_|PINECONE_|GOOGLE_AI_API_KEY|MONGO_URI|JWT_SECRET" backend mcp agentic-ai`
