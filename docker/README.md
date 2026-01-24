# Production Docker Stack

This directory contains production-grade Docker assets for the EstateWise monorepo.

## What's Included
- `compose.prod.yml`: Full-stack production compose (frontend, backend, nginx, mongo; optional neo4j).
- `backend.Dockerfile`: Multi-stage backend image with healthcheck.
- `frontend.Dockerfile`: Multi-stage Next.js image with healthcheck.
- `nginx/`: Reverse proxy that routes `/api` + `/trpc` to the backend and all other traffic to the frontend.

## Prerequisites
- Docker + Docker Compose (v2+).
- A root `.env` file based on `/.env.example`.

## Quick Start
1) Create and edit your root `.env`:
   - Copy `/.env.example` to `/.env` and fill in real values.
   - At minimum, set `MONGO_URI`, `JWT_SECRET`, `GOOGLE_AI_API_KEY`, `PINECONE_API_KEY`, `PINECONE_INDEX`.

2) Build and run:
   ```bash
   docker compose -f docker/compose.prod.yml --env-file .env up --build -d
   ```

3) Access:
   - App: `http://localhost`
   - API docs: `http://localhost/api-docs`
   - Metrics: `http://localhost/metrics`

## Neo4j (optional)
Enable the Neo4j container via profile and update the `.env` values:
```bash
docker compose -f docker/compose.prod.yml --profile graph --env-file .env up -d
```

## Notes
- `mongo` runs locally by default and backs the backend via `mongodb://mongo:27017/estatewise`.
- If you use an external MongoDB, set `MONGO_URI` accordingly and remove/disable the `mongo` service.
- The frontend currently hardcodes the backend URL in `frontend/lib/api.ts` and `frontend/pages/chat.tsx`.
  For a fully self-contained Docker deployment, update those to read from
  `process.env.NEXT_PUBLIC_API_BASE_URL` (or use relative `/api` paths) so
  `NEXT_PUBLIC_API_BASE_URL=http://localhost` can be injected at build time.

## Stopping
```bash
docker compose -f docker/compose.prod.yml down
```
