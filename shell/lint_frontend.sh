#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd npm

info "Linting frontend"
cd "$ROOT_DIR/frontend"
npm run lint
