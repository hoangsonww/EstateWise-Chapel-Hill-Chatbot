#!/bin/bash
# Blue-Green Deployment Script for EstateWise
# This script orchestrates blue-green deployments in Kubernetes

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

if [ -z "$NEW_IMAGE" ]; then
  echo -e "${RED}Error: Image tag required${NC}"
  echo "Usage: $0 <service> <image:tag>"
  echo "Example: $0 backend ghcr.io/your-org/estatewise-app-backend:v1.2.3"
  exit 1
fi

echo -e "${BLUE}=== EstateWise Blue-Green Deployment ===${NC}"
echo "Service: $SERVICE_NAME"
echo "New Image: $NEW_IMAGE"
echo "Namespace: $NAMESPACE"
echo ""

# Determine current active slot
CURRENT_SELECTOR=$($KUBECTL get service estatewise-${SERVICE_NAME} -n $NAMESPACE -o jsonpath='{.spec.selector.version}' 2>/dev/null || echo "blue")
if [ "$CURRENT_SELECTOR" = "blue" ]; then
  INACTIVE_SLOT="green"
  NEW_SLOT="green"
else
  INACTIVE_SLOT="blue"
  NEW_SLOT="blue"
fi

echo -e "${GREEN}Current active slot: ${CURRENT_SELECTOR}${NC}"
echo -e "${YELLOW}Deploying to inactive slot: ${INACTIVE_SLOT}${NC}"
echo ""

# Update the inactive deployment with new image
echo -e "${BLUE}Step 1: Updating ${INACTIVE_SLOT} deployment...${NC}"
$KUBECTL set image deployment/estatewise-${SERVICE_NAME}-${INACTIVE_SLOT} \
  ${SERVICE_NAME}=${NEW_IMAGE} \
  -n $NAMESPACE

# Wait for rollout to complete
echo -e "${BLUE}Step 2: Waiting for ${INACTIVE_SLOT} deployment to be ready...${NC}"
$KUBECTL rollout status deployment/estatewise-${SERVICE_NAME}-${INACTIVE_SLOT} \
  -n $NAMESPACE \
  --timeout=5m

# Health check
echo -e "${BLUE}Step 3: Performing health checks on ${INACTIVE_SLOT} deployment...${NC}"
READY_REPLICAS=$($KUBECTL get deployment estatewise-${SERVICE_NAME}-${INACTIVE_SLOT} \
  -n $NAMESPACE \
  -o jsonpath='{.status.readyReplicas}')

DESIRED_REPLICAS=$($KUBECTL get deployment estatewise-${SERVICE_NAME}-${INACTIVE_SLOT} \
  -n $NAMESPACE \
  -o jsonpath='{.spec.replicas}')

if [ "$READY_REPLICAS" != "$DESIRED_REPLICAS" ]; then
  echo -e "${RED}Health check failed: $READY_REPLICAS/$DESIRED_REPLICAS pods ready${NC}"
  exit 1
fi

echo -e "${GREEN}Health check passed: $READY_REPLICAS/$DESIRED_REPLICAS pods ready${NC}"

# Smoke tests (optional)
if [ "${SMOKE_TEST:-false}" = "true" ]; then
  echo -e "${BLUE}Step 4: Running smoke tests...${NC}"

  # Get pod name
  POD=$($KUBECTL get pods -n $NAMESPACE \
    -l app=estatewise-${SERVICE_NAME},version=${INACTIVE_SLOT} \
    -o jsonpath='{.items[0].metadata.name}')

  # Port forward and test
  $KUBECTL port-forward -n $NAMESPACE $POD 8888:3001 &
  PF_PID=$!
  sleep 3

  HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8888/health || echo "000")
  kill $PF_PID 2>/dev/null || true

  if [ "$HEALTH_STATUS" != "200" ]; then
    echo -e "${RED}Smoke test failed: HTTP $HEALTH_STATUS${NC}"
    exit 1
  fi

  echo -e "${GREEN}Smoke tests passed${NC}"
fi

# Switch traffic
echo ""
echo -e "${YELLOW}Ready to switch traffic from ${CURRENT_SELECTOR} to ${INACTIVE_SLOT}${NC}"
if [ "${AUTO_SWITCH:-false}" != "true" ]; then
  read -p "Proceed with traffic switch? (yes/no): " CONFIRM
  if [ "$CONFIRM" != "yes" ]; then
    echo -e "${RED}Deployment cancelled by user${NC}"
    exit 1
  fi
fi

echo -e "${BLUE}Step 5: Switching traffic to ${INACTIVE_SLOT}...${NC}"
$KUBECTL patch service estatewise-${SERVICE_NAME} \
  -n $NAMESPACE \
  -p "{\"spec\":{\"selector\":{\"app\":\"estatewise-${SERVICE_NAME}\",\"version\":\"${INACTIVE_SLOT}\"}}}"

echo -e "${GREEN}✓ Traffic switched to ${INACTIVE_SLOT} deployment${NC}"

# Verify service endpoints
echo -e "${BLUE}Step 6: Verifying service endpoints...${NC}"
sleep 5
ENDPOINTS=$($KUBECTL get endpoints estatewise-${SERVICE_NAME} -n $NAMESPACE -o jsonpath='{.subsets[*].addresses[*].ip}' | wc -w)
echo -e "${GREEN}Service has $ENDPOINTS active endpoints${NC}"

# Optional: Scale down old deployment
if [ "${SCALE_DOWN_OLD:-false}" = "true" ]; then
  echo -e "${BLUE}Step 7: Scaling down ${CURRENT_SELECTOR} deployment...${NC}"
  $KUBECTL scale deployment/estatewise-${SERVICE_NAME}-${CURRENT_SELECTOR} \
    --replicas=0 \
    -n $NAMESPACE
  echo -e "${GREEN}✓ Old deployment scaled down${NC}"
else
  echo -e "${YELLOW}Note: Old ${CURRENT_SELECTOR} deployment still running. Scale down manually or use SCALE_DOWN_OLD=true${NC}"
fi

echo ""
echo -e "${GREEN}=== Blue-Green Deployment Complete ===${NC}"
echo -e "Active slot: ${GREEN}${INACTIVE_SLOT}${NC}"
echo -e "Inactive slot: ${YELLOW}${CURRENT_SELECTOR}${NC}"
echo ""
echo "To rollback, run:"
echo "  $KUBECTL patch service estatewise-${SERVICE_NAME} -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"version\":\"${CURRENT_SELECTOR}\"}}}'"
echo ""
