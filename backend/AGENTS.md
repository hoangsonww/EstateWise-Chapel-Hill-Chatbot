## Backend Guidance

- Owns Express routes, controllers, services, auth, chat, properties, forums, commute, graph, Swagger, Prometheus, and the backend-side tRPC router.
- Start from `src/server.ts` to understand middleware and route order before changing boot or registration logic.
- If an endpoint or payload changes, update frontend callers and MCP wrappers in the same task.
- Graph endpoints must keep graceful behavior when Neo4j is disabled or not ingested.

## Validation

- `npm run build`
- `npm run test`

## Docs

- Update `backend/README.md` when endpoint behavior, commands, env requirements, or observability guidance changes.
