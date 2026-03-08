# Agentic AI on Azure Container Apps

Deploy the Agentic AI orchestrator to Azure Container Apps using the provided Bicep module.

## Prerequisites
- Azure CLI `>=2.49`
- Existing Container Apps environment + Log Analytics workspace
- Container image pushed to ACR (e.g., `ghcr.io/your-org/estatewise-agentic:latest` or imported into ACR)

## Parameters

| Parameter | Description |
|-----------|-------------|
| `containerImage` | Full image reference (`registry.azurecr.io/repo:tag`). |
| `registryServer` | Container registry login server (e.g., `estatewiseacr.azurecr.io`). |
| `registryIdentity` | `system` for managed identity pull or client secret identity. |
| `googleAiApiKey` / `openAiApiKey` / `pineconeApiKey` | Optional secrets injected as environment variables. |
| `langsmithApiKey` | Optional `LANGSMITH_API_KEY` secret. |
| `langsmithEnabled`, `langsmithProject`, `langsmithEndpoint` | LangSmith tracing controls. |
| `pineconeIndex` | Pinecone index name. |
| `neo4jUri`, `neo4jUser`, `neo4jPassword` | Optional Neo4j settings. |
| `agentRuntime` | `default`, `langgraph`, or `crewai`. |
| `logAnalyticsWorkspaceId` | Resource ID of Log Analytics workspace. |
| `logAnalyticsCustomerId`, `logAnalyticsSharedKey` | Workspace credentials for diagnostics. |

## Deploy

```bash
az deployment group create \
  --resource-group estatewise-rg \
  --template-file agentic-ai/azure/containerapp.bicep \
  --parameters \
      containerImage="estatewiseacr.azurecr.io/estatewise-agentic:latest" \
      registryServer="estatewiseacr.azurecr.io" \
      logAnalyticsWorkspaceId="/subscriptions/<sub>/resourceGroups/estatewise-rg/providers/Microsoft.OperationalInsights/workspaces/estatewise-law" \
      logAnalyticsCustomerId=$(az monitor log-analytics workspace show -g estatewise-rg -n estatewise-law --query customerId -o tsv) \
      logAnalyticsSharedKey=$(az monitor log-analytics workspace get-shared-keys -g estatewise-rg -n estatewise-law --query primarySharedKey -o tsv) \
      langsmithEnabled="false" \
      langsmithProject="estatewise-agentic-ai"
```

Grant the container app identity `AcrPull` on the registry if needed:

```bash
az role assignment create \
  --assignee $(az containerapp show -g estatewise-rg -n estatewise-agentic-ai --query identity.principalId -o tsv) \
  --role AcrPull \
  --scope $(az acr show -g estatewise-rg -n estatewiseacr --query id -o tsv)
```

Scale replicas via:
```bash
az containerapp update -g estatewise-rg -n estatewise-agentic-ai --set-scale min-replicas 1 --set-scale max-replicas 5
```
