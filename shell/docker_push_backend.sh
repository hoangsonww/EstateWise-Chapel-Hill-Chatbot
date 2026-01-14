#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd docker

BACKEND_IMAGE="${BACKEND_IMAGE:-estatewise-backend:local}"
SKIP_DOCKER_LOGIN="${SKIP_DOCKER_LOGIN:-0}"

if [[ "$SKIP_DOCKER_LOGIN" != "1" ]]; then
  bash shell/docker_login.sh
fi

info "Pushing backend image: ${BACKEND_IMAGE}"
docker push "$BACKEND_IMAGE"
