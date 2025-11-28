#!/bin/bash
set -e

# Blue-Green Deployment Script for Kubernetes
# Usage: ./blue-green-deploy.sh <service-name> <image-tag>

SERVICE_NAME=${1:-backend}
IMAGE_TAG=${2:-latest}
NAMESPACE=${NAMESPACE:-estatewise}
AUTO_SWITCH=${AUTO_SWITCH:-false}
SCALE_DOWN_OLD=${SCALE_DOWN_OLD:-false}
SMOKE_TEST=${SMOKE_TEST:-true}

echo "=========================================="
echo "Blue-Green Deployment"
echo "=========================================="
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE_TAG"
echo "Namespace: $NAMESPACE"
echo "Auto-switch: $AUTO_SWITCH"
echo "=========================================="

# Determine current active color
CURRENT_COLOR=$(kubectl get service $SERVICE_NAME -n $NAMESPACE -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue")
if [ -z "$CURRENT_COLOR" ]; then
  CURRENT_COLOR="blue"
fi

# Determine new color
if [ "$CURRENT_COLOR" == "blue" ]; then
  NEW_COLOR="green"
else
  NEW_COLOR="blue"
fi

echo "Current active: $CURRENT_COLOR"
echo "Deploying to: $NEW_COLOR"

# Update deployment with new image
echo "Updating $NEW_COLOR deployment with image: $IMAGE_TAG"
kubectl set image deployment/${SERVICE_NAME}-${NEW_COLOR} \
  ${SERVICE_NAME}=${IMAGE_TAG} \
  -n $NAMESPACE

# Wait for rollout to complete
echo "Waiting for rollout to complete..."
kubectl rollout status deployment/${SERVICE_NAME}-${NEW_COLOR} -n $NAMESPACE --timeout=5m

echo "✓ Deployment to $NEW_COLOR completed successfully"

# Switch traffic or prompt
if [ "$AUTO_SWITCH" == "true" ]; then
  echo "Auto-switching traffic to $NEW_COLOR..."
  kubectl patch service $SERVICE_NAME -n $NAMESPACE -p "{\"spec\":{\"selector\":{\"color\":\"$NEW_COLOR\"}}}"
  echo "✓ Traffic switched to $NEW_COLOR"
else
  echo "Manual approval required to switch traffic."
  echo "To switch: kubectl patch service $SERVICE_NAME -n $NAMESPACE -p '{\"spec\":{\"selector\":{\"color\":\"$NEW_COLOR\"}}}'"
fi
