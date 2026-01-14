#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd docker

BACKEND_IMAGE="${BACKEND_IMAGE:-estatewise-backend:local}"
BACKEND_DOCKERFILE="${BACKEND_DOCKERFILE:-${ROOT_DIR}/backend/Dockerfile}"
BACKEND_CONTEXT="${BACKEND_CONTEXT:-${ROOT_DIR}/backend}"

info "Building backend image: ${BACKEND_IMAGE}"
docker build -t "$BACKEND_IMAGE" -f "$BACKEND_DOCKERFILE" "$BACKEND_CONTEXT"
