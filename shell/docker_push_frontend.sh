#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd docker

FRONTEND_IMAGE="${FRONTEND_IMAGE:-estatewise-frontend:local}"
SKIP_DOCKER_LOGIN="${SKIP_DOCKER_LOGIN:-0}"

if [[ "$SKIP_DOCKER_LOGIN" != "1" ]]; then
  bash shell/docker_login.sh
fi

info "Pushing frontend image: ${FRONTEND_IMAGE}"
docker push "$FRONTEND_IMAGE"
