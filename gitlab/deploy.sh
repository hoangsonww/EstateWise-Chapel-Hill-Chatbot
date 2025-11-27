#!/usr/bin/env bash
# GitLab deploy helper that wraps existing EstateWise deployment scripts.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPTS_DIR="${ROOT_DIR}/kubernetes/scripts"

STRATEGY="${DEPLOY_STRATEGY:-}"
SERVICE_NAME="${SERVICE_NAME:-backend}"
IMAGE_TAG="${IMAGE_TAG:-}"
NAMESPACE="${NAMESPACE:-estatewise}"
KUBECTL_BIN="${KUBECTL:-kubectl}"

if [[ -z "${STRATEGY}" ]]; then
  echo "DEPLOY_STRATEGY must be set to blue-green, canary, or rolling" >&2
  exit 1
fi

case "${STRATEGY}" in
  blue-green)
    if [[ -z "${IMAGE_TAG}" ]]; then
      echo "IMAGE_TAG is required for blue-green deployments" >&2
      exit 1
    fi

    AUTO_SWITCH="${AUTO_SWITCH:-false}"
    SMOKE_TEST="${SMOKE_TEST:-false}"
    SCALE_DOWN_OLD="${SCALE_DOWN_OLD:-false}"

    echo "Starting blue/green for ${SERVICE_NAME} -> ${IMAGE_TAG} in ${NAMESPACE}"
    NAMESPACE="${NAMESPACE}" \
      AUTO_SWITCH="${AUTO_SWITCH}" \
      SMOKE_TEST="${SMOKE_TEST}" \
      SCALE_DOWN_OLD="${SCALE_DOWN_OLD}" \
      "${SCRIPTS_DIR}/blue-green-deploy.sh" "${SERVICE_NAME}" "${IMAGE_TAG}"
    ;;
  canary)
    if [[ -z "${IMAGE_TAG}" ]]; then
      echo "IMAGE_TAG is required for canary deployments" >&2
      exit 1
    fi

    CANARY_STAGES="${CANARY_STAGES:-10,25,50,75,100}"
    STAGE_DURATION="${STAGE_DURATION:-120}"
    AUTO_PROMOTE="${AUTO_PROMOTE:-false}"
    ENABLE_METRICS="${ENABLE_METRICS:-false}"
    CANARY_REPLICAS_START="${CANARY_REPLICAS_START:-1}"
    STABLE_REPLICAS="${STABLE_REPLICAS:-2}"

    echo "Starting canary for ${SERVICE_NAME} -> ${IMAGE_TAG} in ${NAMESPACE} (${CANARY_STAGES}%)"
    NAMESPACE="${NAMESPACE}" \
      CANARY_STAGES="${CANARY_STAGES}" \
      STAGE_DURATION="${STAGE_DURATION}" \
      AUTO_PROMOTE="${AUTO_PROMOTE}" \
      ENABLE_METRICS="${ENABLE_METRICS}" \
      CANARY_REPLICAS_START="${CANARY_REPLICAS_START}" \
      STABLE_REPLICAS="${STABLE_REPLICAS}" \
      "${SCRIPTS_DIR}/canary-deploy.sh" "${SERVICE_NAME}" "${IMAGE_TAG}"
    ;;
  rolling)
    echo "Rolling restart for ${SERVICE_NAME} in ${NAMESPACE}"
    ${KUBECTL_BIN} rollout restart "deployment/estatewise-${SERVICE_NAME}" -n "${NAMESPACE}"
    ${KUBECTL_BIN} rollout status "deployment/estatewise-${SERVICE_NAME}" -n "${NAMESPACE}"
    ;;
  *)
    echo "Unsupported DEPLOY_STRATEGY: ${STRATEGY}" >&2
    exit 1
    ;;
esac
