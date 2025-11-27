# Deployment Control Dashboard

UI and lightweight API to run EstateWise blue/green, canary, rolling, and scaling operations without the CLI. It wraps the existing Kubernetes scripts in `kubernetes/scripts/` and surfaces them through a web dashboard and JSON endpoints.

## Features

- Blue/green and canary launches with custom images, stages, and safety toggles
- Rolling restarts and ad-hoc scaling for any deployment variant (stable, blue, green, canary)
- Live job feed with logs and exit codes
- Cluster snapshot (deployments + services) via `kubectl`
- Ships as a single Express server that also serves the static dashboard UI

## Quick start

```bash
cd deployment-control
npm install
npm run dev     # http://localhost:4100
```

The server uses your current `kubectl` context. Set `KUBECTL=/custom/bin/kubectl` if you need a different binary. Default namespace is `estatewise`; override from the top-right namespace field in the UI.

## API

All endpoints are relative to the server root (default `http://localhost:4100`).

- `POST /api/deploy/blue-green` – Body: `image` (required), `serviceName`, `namespace`, `autoSwitch`, `smokeTest`, `scaleDownOld`
- `POST /api/deploy/canary` – Body: `image` (required), `serviceName`, `namespace`, `canaryStages`, `stageDuration`, `autoPromote`, `enableMetrics`, `canaryReplicasStart`, `stableReplicas`
- `POST /api/deploy/rolling` – Body: `serviceName`, `namespace`, `kubectl` (optional override)
- `POST /api/ops/scale` – Body: `serviceName`, `namespace`, `replicas` (number), `variant` (`blue`, `green`, `canary`, or empty for stable), `kubectl` (optional override)
- `GET /api/jobs` and `GET /api/jobs/:id` – Job history and output
- `GET /api/cluster/summary?namespace=estatewise` – Snapshot of deployments/services via `kubectl`

## Notes

- The dashboard keeps only the last 500 log lines per job in memory. Persist results elsewhere if you need long-term history.
- Long-running deploys stream back to the job feed; refresh or use the **Refresh** button to update.
- The server runs commands from the repo root so relative scripts and manifests resolve correctly.
