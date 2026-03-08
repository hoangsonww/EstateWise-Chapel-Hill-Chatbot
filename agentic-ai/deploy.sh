#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "${SCRIPT_DIR}/.." && pwd)

TARGET="${AGENTIC_DEPLOY_TARGET:-}"

usage() {
  cat <<USAGE
Deploy the Agentic AI orchestrator.

Usage: ./agentic-ai/deploy.sh --target <aws|azure|gcp|compose|k8s>
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET="$2"; shift 2 ;;
    -h|--help)
      usage; exit 0 ;;
    *)
      echo "Unknown flag: $1" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$TARGET" ]]; then
  echo "Missing --target; set AGENTIC_DEPLOY_TARGET or pass --target" >&2
  exit 1
fi

case "$TARGET" in
  aws)
    : "${AGENTIC_AWS_CLUSTER:?Set AGENTIC_AWS_CLUSTER}"
    : "${AGENTIC_AWS_EXEC_ROLE:?Set AGENTIC_AWS_EXEC_ROLE}"
    : "${AGENTIC_AWS_IMAGE:?Set AGENTIC_AWS_IMAGE}"
    : "${AGENTIC_AWS_SUBNETS:?Set AGENTIC_AWS_SUBNETS}"
    : "${AGENTIC_AWS_SECURITY_GROUPS:?Set AGENTIC_AWS_SECURITY_GROUPS}"
    REGION=${AGENTIC_AWS_REGION:-us-east-1}
    STACK=${AGENTIC_AWS_STACK:-estatewise-agentic-ai}
    ENV_NAME=${AGENTIC_AWS_ENV:-estatewise}
    RUNTIME=${AGENTIC_AWS_RUNTIME:-langgraph}
    PINECONE_INDEX=${AGENTIC_AWS_PINECONE_INDEX:-estatewise-index}

    PARAMS=(
      EnvironmentName=$ENV_NAME
      ClusterName=$AGENTIC_AWS_CLUSTER
      ExecutionRoleArn=$AGENTIC_AWS_EXEC_ROLE
      ContainerImage=$AGENTIC_AWS_IMAGE
      SubnetIds=$AGENTIC_AWS_SUBNETS
      SecurityGroupIds=$AGENTIC_AWS_SECURITY_GROUPS
      RuntimeSelector=$RUNTIME
      PineconeIndex=$PINECONE_INDEX
    )
    [[ -n ${AGENTIC_AWS_GOOGLE_SECRET:-} ]] && PARAMS+=(GoogleApiKeySecretArn=$AGENTIC_AWS_GOOGLE_SECRET)
    [[ -n ${AGENTIC_AWS_OPENAI_SECRET:-} ]] && PARAMS+=(OpenAiKeySecretArn=$AGENTIC_AWS_OPENAI_SECRET)
    [[ -n ${AGENTIC_AWS_PINECONE_SECRET:-} ]] && PARAMS+=(PineconeKeySecretArn=$AGENTIC_AWS_PINECONE_SECRET)
    [[ -n ${AGENTIC_AWS_LANGSMITH_SECRET:-} ]] && PARAMS+=(LangSmithKeySecretArn=$AGENTIC_AWS_LANGSMITH_SECRET)
    [[ -n ${AGENTIC_AWS_LANGSMITH_PROJECT:-} ]] && PARAMS+=(LangSmithProject=$AGENTIC_AWS_LANGSMITH_PROJECT)
    [[ -n ${AGENTIC_AWS_LANGSMITH_ENDPOINT:-} ]] && PARAMS+=(LangSmithEndpoint=$AGENTIC_AWS_LANGSMITH_ENDPOINT)
    [[ -n ${AGENTIC_AWS_LANGSMITH_ENABLED:-} ]] && PARAMS+=(LangSmithEnabled=$AGENTIC_AWS_LANGSMITH_ENABLED)
    [[ -n ${AGENTIC_AWS_NEO4J_URI:-} ]] && PARAMS+=(Neo4jUri=$AGENTIC_AWS_NEO4J_URI)
    [[ -n ${AGENTIC_AWS_NEO4J_USER:-} ]] && PARAMS+=(Neo4jUser=$AGENTIC_AWS_NEO4J_USER)
    [[ -n ${AGENTIC_AWS_NEO4J_SECRET:-} ]] && PARAMS+=(Neo4jPasswordSecretArn=$AGENTIC_AWS_NEO4J_SECRET)

    aws cloudformation deploy \
      --region "$REGION" \
      --stack-name "$STACK" \
      --template-file "$SCRIPT_DIR/aws/ecs-service.yaml" \
      --capabilities CAPABILITY_NAMED_IAM \
      --parameter-overrides "${PARAMS[@]}"
    ;;
  azure)
    : "${AGENTIC_AZURE_RG:?Set AGENTIC_AZURE_RG}" 
    : "${AGENTIC_AZURE_IMAGE:?Set AGENTIC_AZURE_IMAGE}" 
    : "${AGENTIC_AZURE_REGISTRY_SERVER:?Set AGENTIC_AZURE_REGISTRY_SERVER}" 
    : "${AGENTIC_AZURE_LAW_ID:?Set AGENTIC_AZURE_LAW_ID}" 
    : "${AGENTIC_AZURE_LAW_CUSTOMER_ID:?Set AGENTIC_AZURE_LAW_CUSTOMER_ID}" 
    : "${AGENTIC_AZURE_LAW_SHARED_KEY:?Set AGENTIC_AZURE_LAW_SHARED_KEY}"
    az deployment group create \
      --resource-group "$AGENTIC_AZURE_RG" \
      --template-file "$SCRIPT_DIR/azure/containerapp.bicep" \
      --parameters \
        containerImage="$AGENTIC_AZURE_IMAGE" \
        registryServer="$AGENTIC_AZURE_REGISTRY_SERVER" \
        logAnalyticsWorkspaceId="$AGENTIC_AZURE_LAW_ID" \
        logAnalyticsCustomerId="$AGENTIC_AZURE_LAW_CUSTOMER_ID" \
        logAnalyticsSharedKey="$AGENTIC_AZURE_LAW_SHARED_KEY" \
        agentRuntime="${AGENTIC_AZURE_RUNTIME:-langgraph}" \
        pineconeIndex="${AGENTIC_AZURE_PINECONE_INDEX:-estatewise-index}" \
        googleAiApiKey="${AGENTIC_AZURE_GOOGLE_KEY:-}" \
        openAiApiKey="${AGENTIC_AZURE_OPENAI_KEY:-}" \
        pineconeApiKey="${AGENTIC_AZURE_PINECONE_KEY:-}" \
        langsmithApiKey="${AGENTIC_AZURE_LANGSMITH_KEY:-}" \
        langsmithEnabled="${AGENTIC_AZURE_LANGSMITH_ENABLED:-false}" \
        langsmithProject="${AGENTIC_AZURE_LANGSMITH_PROJECT:-estatewise-agentic-ai}" \
        langsmithEndpoint="${AGENTIC_AZURE_LANGSMITH_ENDPOINT:-}" \
        neo4jUri="${AGENTIC_AZURE_NEO4J_URI:-}" \
        neo4jUser="${AGENTIC_AZURE_NEO4J_USER:-}" \
        neo4jPassword="${AGENTIC_AZURE_NEO4J_PASSWORD:-}" 
    ;;
  gcp)
    : "${AGENTIC_GCP_PROJECT:?Set AGENTIC_GCP_PROJECT}" 
    : "${AGENTIC_GCP_REGION:?Set AGENTIC_GCP_REGION}" 
    : "${AGENTIC_GCP_SERVICE_ACCOUNT:?Set AGENTIC_GCP_SERVICE_ACCOUNT}" 
    : "${AGENTIC_GCP_IMAGE:?Set AGENTIC_GCP_IMAGE}"
    DEPLOYMENT=${AGENTIC_GCP_DEPLOYMENT:-estatewise-agentic-ai}
    if gcloud deployment-manager deployments describe "$DEPLOYMENT" --project "$AGENTIC_GCP_PROJECT" >/dev/null 2>&1; then
      ACTION=update
    else
      ACTION=create
    fi
    gcloud deployment-manager deployments "$ACTION" "$DEPLOYMENT" \
      --project "$AGENTIC_GCP_PROJECT" \
      --config "$SCRIPT_DIR/gcp/cloudrun.yaml" \
      --properties "region=${AGENTIC_GCP_REGION},image=${AGENTIC_GCP_IMAGE},serviceAccount=${AGENTIC_GCP_SERVICE_ACCOUNT},runtime=${AGENTIC_GCP_RUNTIME:-langgraph},pineconeIndex=${AGENTIC_GCP_PINECONE_INDEX:-estatewise-index},langsmithEnabled=${AGENTIC_GCP_LANGSMITH_ENABLED:-false},langsmithProject=${AGENTIC_GCP_LANGSMITH_PROJECT:-estatewise-agentic-ai},langsmithEndpoint=${AGENTIC_GCP_LANGSMITH_ENDPOINT:-},neo4jUri=${AGENTIC_GCP_NEO4J_URI:-},neo4jUser=${AGENTIC_GCP_NEO4J_USER:-}"
    ;;
  compose)
    docker compose -f "$SCRIPT_DIR/docker-compose.yaml" up -d --build
    ;;
  k8s)
    kubectl apply -f "$SCRIPT_DIR/k8s/configmap.yaml"
    if [[ -f "$SCRIPT_DIR/k8s/secret-example.yaml" ]]; then
      echo "Reminder: customize and apply secret file $SCRIPT_DIR/k8s/secret-example.yaml" >&2
    fi
    kubectl apply -f "$SCRIPT_DIR/k8s/deployment.yaml"
    ;;
  *)
    echo "Unknown target: $TARGET" >&2
    usage
    exit 1
    ;;
esac
