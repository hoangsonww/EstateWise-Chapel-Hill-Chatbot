#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd npm

info "Testing frontend"
cd "$ROOT_DIR/frontend"
npm run test
