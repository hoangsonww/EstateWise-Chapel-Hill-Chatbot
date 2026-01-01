#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage:
  push-images.sh --region <region> --namespace <tenancy-namespace> \
    --backend-repo <repo> --agentic-repo <repo> --tag <tag>

Example:
  ./oracle-cloud/scripts/push-images.sh \
    --region iad --namespace mytenancy \
    --backend-repo estatewise-backend --agentic-repo estatewise-agentic --tag latest
USAGE
}

REGION=""
NAMESPACE=""
BACKEND_REPO=""
AGENTIC_REPO=""
TAG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --region)
      REGION="$2"
      shift 2
      ;;
    --namespace)
      NAMESPACE="$2"
      shift 2
      ;;
    --backend-repo)
      BACKEND_REPO="$2"
      shift 2
      ;;
    --agentic-repo)
      AGENTIC_REPO="$2"
      shift 2
      ;;
    --tag)
      TAG="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown flag: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$REGION" || -z "$NAMESPACE" || -z "$BACKEND_REPO" || -z "$AGENTIC_REPO" || -z "$TAG" ]]; then
  echo "Missing required flags." >&2
  usage
  exit 1
fi

REGISTRY="${REGION}.ocir.io/${NAMESPACE}"

if [[ -z "${OCI_USERNAME:-}" || -z "${OCI_AUTH_TOKEN:-}" ]]; then
  echo "Set OCI_USERNAME and OCI_AUTH_TOKEN for OCIR login." >&2
  exit 1
fi

echo "Logging into OCIR ${REGISTRY}..."
echo "$OCI_AUTH_TOKEN" | docker login "$REGISTRY" -u "$OCI_USERNAME" --password-stdin

echo "Building backend image..."
docker build -f oracle-cloud/docker/backend.Dockerfile -t "$REGISTRY/$BACKEND_REPO:$TAG" .

echo "Building agentic-ai image..."
docker build -f oracle-cloud/docker/agentic.Dockerfile -t "$REGISTRY/$AGENTIC_REPO:$TAG" .

echo "Pushing images..."
docker push "$REGISTRY/$BACKEND_REPO:$TAG"
docker push "$REGISTRY/$AGENTIC_REPO:$TAG"

echo "Done."
