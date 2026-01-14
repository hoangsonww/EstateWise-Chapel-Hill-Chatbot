#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Building backend image..."
bash shell/docker_build_backend.sh

info "Building frontend image..."
bash shell/docker_build_frontend.sh
