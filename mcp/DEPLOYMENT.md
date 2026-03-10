# MCP Deployment Guide

![Docker](https://img.shields.io/badge/Docker-Container-blue?logo=docker) ![Podman](https://img.shields.io/badge/Podman-Container-892CA0?logo=podman) ![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestration-blue?logo=kubernetes)

This document describes how to build, containerise, and run the EstateWise MCP server in production. The MCP server exposes EstateWise tools over Model Context Protocol stdio and is designed to run alongside clients such as the Agentic AI CLI.

## Build & Publish Container

```bash
# From repo root
cd mcp

# Docker
docker build -t estatewise-mcp:latest .
docker tag estatewise-mcp:latest ghcr.io/your-org/estatewise-mcp:latest
docker push ghcr.io/your-org/estatewise-mcp:latest

# Podman
podman build -t estatewise-mcp:latest .
podman tag estatewise-mcp:latest ghcr.io/your-org/estatewise-mcp:latest
podman push ghcr.io/your-org/estatewise-mcp:latest
```

### Runtime Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | EstateWise backend API base URL | `https://estatewise-backend.vercel.app` |
| `FRONTEND_BASE_URL` | EstateWise frontend base URL (for map links) | `https://estatewise.vercel.app` |
| `MCP_CACHE_TTL_MS` | Cache TTL for GET requests | `30000` |
| `MCP_CACHE_MAX` | Maximum cached entries | `200` |
| `MCP_DEBUG` | Verbose logging (`true/false`) | `false` |

### Docker / Podman Compose (Local/DevOps)

Both `docker-compose.yaml` and `podman-compose.yaml` are provided in this directory and are functionally identical.

```yaml
services:
  mcp:
    image: ghcr.io/your-org/estatewise-mcp:latest
    environment:
      API_BASE_URL: ${API_BASE_URL}
      FRONTEND_BASE_URL: ${FRONTEND_BASE_URL}
    tty: true
    stdin_open: true
```

```bash
# Docker
docker compose up -d mcp
docker compose exec -it mcp node dist/server.js

# Podman
podman compose up -d mcp
podman compose exec -it mcp node dist/server.js
```

> **Tip:** stdio-based MCP servers typically run as sidecars or child processes. Keep `tty` and `stdin_open` enabled so orchestrators can attach to the server.

## Kubernetes Deployment

The MCP server is usually colocated with the Agentic AI runtime (sidecar pattern). An example manifest is provided at [`k8s/sidecar-example.yaml`](k8s/sidecar-example.yaml):

```yaml
containers:
  - name: agentic-ai
    image: ghcr.io/your-org/estatewise-agentic:latest
  - name: mcp-server
    image: ghcr.io/your-org/estatewise-mcp:latest
    command: ["node", "dist/server.js"]
    tty: true
```

Configure secrets and configmaps referenced in the manifest with `API_BASE_URL`, `FRONTEND_BASE_URL`, and authentication tokens. Because MCP uses stdio, the orchestrator container (Agentic AI) spawns the server via `/app/mcp/dist/server.js` inside the same pod.

## Observability & Operations

- Logs are emitted to STDOUT/STDERR. Capture via Docker/Podman logging drivers or Kubernetes log collection (Fluent Bit, Cloud Logging, etc.).
- Adjust cache tunables with `MCP_CACHE_TTL_MS` and `MCP_CACHE_MAX` to suit backend load.
- For high availability, schedule at least two replicas alongside the Agentic AI deployment.

## Security & Secrets

- Never bake secrets into the image. Use runtime environment variables or Kubernetes secrets.
- Restrict network egress if the MCP server is only meant to reach the EstateWise API.
- Monitor usage via container logs; enable debug only during troubleshooting.

## Integration Checklist

- [ ] Build & push `ghcr.io/your-org/estatewise-mcp:latest`
- [ ] Provide API/Frontend base URLs via env vars or ConfigMap
- [ ] Co-locate with Agentic AI runtime (sidecar or same host)
- [ ] Forward STDIN/STDOUT between orchestrator and MCP server (default behaviour when using the provided container)
- [ ] Register the MCP server endpoint with your MCP-aware client (Claude Desktop, internal agents, etc.)

Once these steps are completed the MCP server is ready for production use.

## Cloud Provider Templates

- **AWS ECS** – Deploy via [`aws/ecs-service.yaml`](aws/ecs-service.yaml) (see [`aws/README.md`](aws/README.md)).
- **Azure Container Apps** – Use [`azure/containerapp.bicep`](azure/containerapp.bicep) with guidance in [`azure/README.md`](azure/README.md).
- **GCP Cloud Run** – Provision using [`gcp/cloudrun.yaml`](gcp/cloudrun.yaml) (refer to [`gcp/README.md`](gcp/README.md)).
