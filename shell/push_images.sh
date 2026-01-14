#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Pushing backend image..."
bash shell/docker_push_backend.sh

info "Pushing frontend image..."
bash shell/docker_push_frontend.sh
