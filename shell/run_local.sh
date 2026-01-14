#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

CONCURRENTLY_BIN="concurrently"
if ! command -v concurrently >/dev/null 2>&1; then
  CONCURRENTLY_BIN="npx concurrently"
fi

info "Running backend & frontend concurrently"
$CONCURRENTLY_BIN \
  "bash shell/setup_backend.sh" \
  "bash shell/setup_frontend.sh"
