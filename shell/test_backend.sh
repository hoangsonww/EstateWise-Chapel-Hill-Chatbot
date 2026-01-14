#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd npm

info "Testing backend"
cd "$ROOT_DIR/backend"
npm run test
