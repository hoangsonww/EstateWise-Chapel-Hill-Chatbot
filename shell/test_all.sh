#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Testing backend + frontend"
bash shell/test_backend.sh
bash shell/test_frontend.sh
