#!/bin/bash
# Canary Deployment Script for EstateWise
# This script orchestrates canary deployments with gradual traffic shifting

set -euo pipefail

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NAMESPACE="${NAMESPACE:-estatewise}"
SERVICE_NAME="${1:-backend}"
NEW_IMAGE="${2:-}"
KUBECTL="${KUBECTL:-kubectl}"

# Canary rollout parameters
CANARY_REPLICAS_START="${CANARY_REPLICAS_START:-1}"
STABLE_REPLICAS="${STABLE_REPLICAS:-2}"
CANARY_STAGES="${CANARY_STAGES:-10,25,50,75,100}"
STAGE_DURATION="${STAGE_DURATION:-120}"  # seconds between stages
ENABLE_METRICS="${ENABLE_METRICS:-false}"

if [ -z "$NEW_IMAGE" ]; then
  echo -e "${RED}Error: Image tag required${NC}"
  echo "Usage: $0 <service> <image:tag>"
  echo "Example: $0 backend ghcr.io/your-org/estatewise-app-backend:v1.2.3"
  exit 1
fi

echo -e "${BLUE}=== EstateWise Canary Deployment ===${NC}"
echo "Service: $SERVICE_NAME"
echo "New Image: $NEW_IMAGE"
echo "Namespace: $NAMESPACE"
echo "Canary stages: $CANARY_STAGES%"
echo "Stage duration: ${STAGE_DURATION}s"
echo ""

# Check if stable deployment exists
if ! $KUBECTL get deployment estatewise-${SERVICE_NAME} -n $NAMESPACE >/dev/null 2>&1; then
  echo -e "${RED}Error: Stable deployment estatewise-${SERVICE_NAME} not found${NC}"
  exit 1
fi

# Create or update canary deployment
echo -e "${BLUE}Step 1: Deploying canary version...${NC}"
if $KUBECTL get deployment estatewise-${SERVICE_NAME}-canary -n $NAMESPACE >/dev/null 2>&1; then
  echo "Updating existing canary deployment"
  $KUBECTL set image deployment/estatewise-${SERVICE_NAME}-canary \
    ${SERVICE_NAME}=${NEW_IMAGE} \
    -n $NAMESPACE
else
  echo "Creating new canary deployment"
  $KUBECTL apply -f kubernetes/base/${SERVICE_NAME}-deployment-canary.yaml -n $NAMESPACE
  $KUBECTL set image deployment/estatewise-${SERVICE_NAME}-canary \
    ${SERVICE_NAME}=${NEW_IMAGE} \
    -n $NAMESPACE
fi

# Scale canary to initial size
$KUBECTL scale deployment/estatewise-${SERVICE_NAME}-canary \
  --replicas=$CANARY_REPLICAS_START \
  -n $NAMESPACE

# Wait for canary to be ready
echo -e "${BLUE}Step 2: Waiting for canary deployment to be ready...${NC}"
$KUBECTL rollout status deployment/estatewise-${SERVICE_NAME}-canary \
  -n $NAMESPACE \
  --timeout=5m

echo -e "${GREEN}✓ Canary deployment ready${NC}"

# Function to calculate replica distribution
calculate_replicas() {
  local percentage=$1
  local total_replicas=$((STABLE_REPLICAS + CANARY_REPLICAS_START))
  local canary_replicas=$(( (total_replicas * percentage) / 100 ))
  local stable_replicas=$((total_replicas - canary_replicas))

  # Ensure at least 1 replica for each when percentage is between 1-99
  if [ $percentage -gt 0 ] && [ $percentage -lt 100 ]; then
    if [ $canary_replicas -eq 0 ]; then
      canary_replicas=1
      stable_replicas=$((total_replicas - 1))
    fi
  fi

  echo "$stable_replicas $canary_replicas"
}

# Function to check canary health
check_canary_health() {
  local deployment=$1

  READY=$($KUBECTL get deployment $deployment -n $NAMESPACE -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
  DESIRED=$($KUBECTL get deployment $deployment -n $NAMESPACE -o jsonpath='{.spec.replicas}')

  if [ "$READY" != "$DESIRED" ]; then
    return 1
  fi

  # Check pod restart count
  MAX_RESTARTS=$($KUBECTL get pods -n $NAMESPACE \
    -l app=estatewise-${SERVICE_NAME},version=canary \
    -o jsonpath='{.items[*].status.containerStatuses[0].restartCount}' | \
    tr ' ' '\n' | sort -nr | head -1)

  if [ "${MAX_RESTARTS:-0}" -gt 3 ]; then
    echo -e "${RED}Canary pods have high restart count: $MAX_RESTARTS${NC}"
    return 1
  fi

  return 0
}

# Function to collect metrics (placeholder)
check_canary_metrics() {
  if [ "$ENABLE_METRICS" != "true" ]; then
    return 0
  fi

  echo -e "${BLUE}Checking canary metrics...${NC}"

  # Placeholder for metrics check
  # In production, query Prometheus/metrics system here
  # Example metrics to check:
  # - Error rate (should be < threshold)
  # - Response time (should be within acceptable range)
  # - Success rate (should be > 99%)

  # For now, just return success
  return 0
}

# Gradual rollout stages
IFS=',' read -ra STAGES <<< "$CANARY_STAGES"
for STAGE in "${STAGES[@]}"; do
  echo ""
  echo -e "${YELLOW}=== Canary Stage: ${STAGE}% ===${NC}"

  read -r STABLE_REPS CANARY_REPS <<< $(calculate_replicas $STAGE)

  echo "Scaling stable deployment to $STABLE_REPS replicas"
  echo "Scaling canary deployment to $CANARY_REPS replicas"

  # Scale deployments
  $KUBECTL scale deployment/estatewise-${SERVICE_NAME} \
    --replicas=$STABLE_REPS \
    -n $NAMESPACE

  $KUBECTL scale deployment/estatewise-${SERVICE_NAME}-canary \
    --replicas=$CANARY_REPS \
    -n $NAMESPACE

  # Wait for scaling
  echo "Waiting for deployments to reach desired state..."
  sleep 10

  # Health checks
  echo -e "${BLUE}Performing health checks...${NC}"
  if ! check_canary_health "estatewise-${SERVICE_NAME}-canary"; then
    echo -e "${RED}Canary health check failed!${NC}"
    echo -e "${RED}Rolling back...${NC}"

    # Rollback: scale canary to 0, restore stable
    $KUBECTL scale deployment/estatewise-${SERVICE_NAME}-canary --replicas=0 -n $NAMESPACE
    $KUBECTL scale deployment/estatewise-${SERVICE_NAME} --replicas=$STABLE_REPLICAS -n $NAMESPACE

    echo -e "${RED}Rollback complete. Canary deployment failed at ${STAGE}% stage.${NC}"
    exit 1
  fi

  # Metrics checks
  if ! check_canary_metrics; then
    echo -e "${RED}Canary metrics check failed!${NC}"
    echo -e "${RED}Rolling back...${NC}"

    $KUBECTL scale deployment/estatewise-${SERVICE_NAME}-canary --replicas=0 -n $NAMESPACE
    $KUBECTL scale deployment/estatewise-${SERVICE_NAME} --replicas=$STABLE_REPLICAS -n $NAMESPACE

    echo -e "${RED}Rollback complete. Canary metrics failed at ${STAGE}% stage.${NC}"
    exit 1
  fi

  echo -e "${GREEN}✓ Stage ${STAGE}% healthy${NC}"

  # Wait before next stage (except for 100%)
  if [ "$STAGE" -ne 100 ]; then
    if [ "${AUTO_PROMOTE:-false}" != "true" ]; then
      read -p "Continue to next stage? (yes/no/abort): " CONFIRM
      case $CONFIRM in
        yes)
          ;;
        abort)
          echo -e "${RED}Deployment aborted by user${NC}"
          exit 1
          ;;
        *)
          echo "Waiting at ${STAGE}% stage. Run 'kubectl scale' manually to continue."
          exit 0
          ;;
      esac
    else
      echo "Waiting ${STAGE_DURATION}s before next stage..."
      sleep $STAGE_DURATION
    fi
  fi
done

# Finalize: Update stable deployment to new version
echo ""
echo -e "${BLUE}Step 3: Promoting canary to stable...${NC}"
$KUBECTL set image deployment/estatewise-${SERVICE_NAME} \
  ${SERVICE_NAME}=${NEW_IMAGE} \
  -n $NAMESPACE

$KUBECTL rollout status deployment/estatewise-${SERVICE_NAME} \
  -n $NAMESPACE \
  --timeout=5m

# Scale back to normal
$KUBECTL scale deployment/estatewise-${SERVICE_NAME} \
  --replicas=$STABLE_REPLICAS \
  -n $NAMESPACE

# Remove canary
echo -e "${BLUE}Step 4: Cleaning up canary deployment...${NC}"
$KUBECTL scale deployment/estatewise-${SERVICE_NAME}-canary --replicas=0 -n $NAMESPACE

echo ""
echo -e "${GREEN}=== Canary Deployment Complete ===${NC}"
echo -e "Stable deployment updated to: ${NEW_IMAGE}"
echo -e "Canary deployment scaled to 0 (can be deleted if no longer needed)"
echo ""
echo "To delete canary deployment:"
echo "  $KUBECTL delete deployment estatewise-${SERVICE_NAME}-canary -n $NAMESPACE"
echo ""
