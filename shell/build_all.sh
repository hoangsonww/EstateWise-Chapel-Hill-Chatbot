#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Building backend + frontend"
bash shell/build_backend.sh
bash shell/build_frontend.sh
