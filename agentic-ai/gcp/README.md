# Agentic AI on Google Cloud Run

Deploy the Agentic AI orchestrator to Cloud Run using the provided Deployment Manager configuration.

## Prerequisites
- Container image pushed to Artifact Registry (e.g., `us-east1-docker.pkg.dev/<project>/estatewise/agentic-ai:latest`)
- Secrets stored in Secret Manager: `GOOGLE_AI_API_KEY`, `OPENAI_API_KEY`, `PINECONE_API_KEY`, `LANGSMITH_API_KEY` (optional), `NEO4J_PASSWORD` (optional)
- Service account with `roles/run.invoker`, `roles/run.admin`, `roles/iam.serviceAccountUser` for deployment

## Deploy with Deployment Manager

```
gcloud deployment-manager deployments create estatewise-agentic-ai \
  --config agentic-ai/gcp/cloudrun.yaml \
  --properties \"region=us-east1,image=us-east1-docker.pkg.dev/$PROJECT_ID/estatewise/agentic-ai:latest,serviceAccount=estatewise-run@$PROJECT_ID.iam.gserviceaccount.com,runtime=langgraph,pineconeIndex=estatewise-index,langsmithEnabled=false,langsmithProject=estatewise-agentic-ai,langsmithEndpoint=,neo4jUri=,neo4jUser=\"
```

Update using the same command with `deployments update` when a new image tag is available. To roll back, deploy the previous image tag.

## Secrets

Ensure secret versions exist:
```bash
echo "$GOOGLE_AI_API_KEY" | gcloud secrets versions add GOOGLE_AI_API_KEY --data-file=-
# repeat for OPENAI_API_KEY, PINECONE_API_KEY, LANGSMITH_API_KEY, NEO4J_PASSWORD (if used)
```

## Observability
- Logs: `gcloud run services logs tail estatewise-agentic-ai --region us-east1`
- Metrics: Cloud Monitoring automatically collects request latency, CPU, memory, and concurrency.

Scale via:
```bash
gcloud run services update estatewise-agentic-ai \
  --region us-east1 \
  --max-instances 10 \
  --min-instances 1
```
