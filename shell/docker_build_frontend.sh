#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd docker

FRONTEND_IMAGE="${FRONTEND_IMAGE:-estatewise-frontend:local}"
FRONTEND_DOCKERFILE="${FRONTEND_DOCKERFILE:-${ROOT_DIR}/frontend/Dockerfile}"
FRONTEND_CONTEXT="${FRONTEND_CONTEXT:-${ROOT_DIR}/frontend}"

info "Building frontend image: ${FRONTEND_IMAGE}"
docker build -t "$FRONTEND_IMAGE" -f "$FRONTEND_DOCKERFILE" "$FRONTEND_CONTEXT"
