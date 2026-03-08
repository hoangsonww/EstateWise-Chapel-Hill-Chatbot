# Agentic AI Deployment Guide

![Docker](https://img.shields.io/badge/Docker-Container-blue?logo=docker) ![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestration-blue?logo=kubernetes)

This guide covers packaging and running the Agentic AI CLI in production. The Docker image includes the Node.js orchestrator, the built MCP server, and the optional CrewAI Python runtime.

## Build & Push

```bash
# From repo root
 docker build -f agentic-ai/Dockerfile -t ghcr.io/your-org/estatewise-agentic:latest .
 docker push ghcr.io/your-org/estatewise-agentic:latest
```

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `AGENT_RUNTIME` | `default`, `langgraph`, or `crewai`. |
| `GOOGLE_AI_API_KEY` / `OPENAI_API_KEY` | LLM API keys (at least one required). |
| `PINECONE_API_KEY` / `PINECONE_INDEX` | Pinecone credentials for retrieval. |
| `NEO4J_URI` / `NEO4J_USERNAME` / `NEO4J_PASSWORD` | Neo4j creds for graph tools (optional). |
| `THREAD_ID` | Persistent LangGraph thread identifier (optional). |
| `LANGSMITH_ENABLED` / `LANGSMITH_API_KEY` | Enable LangSmith tracing and authenticate ingestion (optional, recommended). |
| `LANGSMITH_PROJECT` / `LANGSMITH_ENDPOINT` | Project and endpoint overrides for LangSmith traces (optional). |

The container runs `node dist/index.js` by default. Command flags like `--langgraph` or `--crewai` can be passed via `docker run` or Kubernetes `args`.

## Docker Compose

```yaml
version: "3.9"
services:
  agentic-ai:
    image: ghcr.io/your-org/estatewise-agentic:latest
    environment:
      AGENT_RUNTIME: langgraph
      GOOGLE_AI_API_KEY: ${GOOGLE_AI_API_KEY}
      PINECONE_API_KEY: ${PINECONE_API_KEY}
      PINECONE_INDEX: estatewise-index
      LANGSMITH_ENABLED: "true"
      LANGSMITH_API_KEY: ${LANGSMITH_API_KEY}
      LANGSMITH_PROJECT: estatewise-agentic-ai
    stdin_open: true
    tty: true
    command: ["--langgraph"]
```

Launch with `docker compose up -d agentic-ai`. Use `docker compose exec agentic-ai node dist/index.js "Find houses in Chapel Hill"` to issue ad‑hoc commands.

## Kubernetes Deployment

Kubernetes manifests are provided in [`k8s/`](k8s). Apply them after creating the required secrets:

```bash
kubectl apply -f agentic-ai/k8s/configmap.yaml
kubectl apply -f agentic-ai/k8s/secret-example.yaml  # edit before applying
kubectl apply -f agentic-ai/k8s/deployment.yaml
```

The image bundles the MCP server, so no extra sidecar is needed. Logs stream to STDOUT and can be collected via your cluster’s logging stack.

## Integration with MCP Clients

Agentic AI automatically spawns the MCP server from `/app/mcp/dist/server.js`. When running in Kubernetes, ensure network access to the EstateWise backend and Pinecone endpoints.

## Observability & Operations

- Metrics/logs: scrape container logs (stdout). Add sidecars or OTEL exporters as needed.
- Tracing: LangSmith is supported out of the box for LangChain/LangGraph (`LANGSMITH_ENABLED=true`, `LANGSMITH_API_KEY`, `LANGSMITH_PROJECT`).
- Health: the CLI exits with non-zero on failures; use Kubernetes restart policies to restart the pod.
- Scaling: increase `replicas` in the deployment or run the CLI as a CronJob for batch workloads.

## CrewAI Runtime

The Docker image contains a Python virtual environment at `/opt/crewai`. Enable it by setting `AGENT_RUNTIME=crewai` or invoking `node dist/index.js --crewai "goal"`. The CrewAI runner expects `OPENAI_API_KEY`.

## Checklist

- [ ] Build & push `ghcr.io/your-org/estatewise-agentic`
- [ ] Configure secrets (LLM, Pinecone, Neo4j)
- [ ] Create ConfigMap with runtime toggles (`agentic-ai-config`)
- [ ] Deploy `agentic-ai/k8s/deployment.yaml`
- [ ] Monitor logs and tune scaling thresholds

With these steps completed, the Agentic AI orchestrator is production ready across container orchestrators and server environments.

## Cloud Provider Templates

- **AWS ECS** – Use [`aws/ecs-service.yaml`](aws/ecs-service.yaml) to deploy the container as a Fargate service. Instructions live in [`aws/README.md`](aws/README.md).
- **Azure Container Apps** – Deploy via [`azure/containerapp.bicep`](azure/containerapp.bicep); see [`azure/README.md`](azure/README.md).
- **GCP Cloud Run** – Provision with Deployment Manager using [`gcp/cloudrun.yaml`](gcp/cloudrun.yaml); see [`gcp/README.md`](gcp/README.md).
