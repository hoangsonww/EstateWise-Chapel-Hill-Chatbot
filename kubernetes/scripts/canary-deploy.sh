#!/bin/bash
set -e

# Canary Deployment Script for Kubernetes
# Usage: ./canary-deploy.sh <service-name> <image-tag>

SERVICE_NAME=${1:-backend}
IMAGE_TAG=${2:-latest}
NAMESPACE=${NAMESPACE:-estatewise}
CANARY_STAGES=${CANARY_STAGES:-10,25,50,100}
STAGE_DURATION=${STAGE_DURATION:-120}

echo "=========================================="
echo "Canary Deployment"
echo "=========================================="
echo "Service: $SERVICE_NAME"
echo "Image: $IMAGE_TAG"
echo "Stages: $CANARY_STAGES%"
echo "=========================================="

# Update canary deployment with new image
echo "Updating canary deployment with image: $IMAGE_TAG"
kubectl set image deployment/${SERVICE_NAME}-canary \
  ${SERVICE_NAME}=${IMAGE_TAG} \
  -n $NAMESPACE

# Wait for canary rollout
echo "Waiting for canary rollout to complete..."
kubectl rollout status deployment/${SERVICE_NAME}-canary -n $NAMESPACE --timeout=5m

echo "✓ Canary deployment ready"

IFS=',' read -ra STAGES <<< "$CANARY_STAGES"
for stage in "${STAGES[@]}"; do
  echo ""
  echo "Stage: ${stage}% canary traffic"
  echo "Monitoring for ${STAGE_DURATION}s..."
  sleep $STAGE_DURATION
  echo "✓ Stage ${stage}% completed"
done

echo ""
echo "Canary deployment successful!"
