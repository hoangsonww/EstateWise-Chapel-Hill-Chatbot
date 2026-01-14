#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

SKIP_BACKEND="${SKIP_BACKEND:-0}"
SKIP_FRONTEND="${SKIP_FRONTEND:-0}"

require_cmd npm

if [[ "$SKIP_BACKEND" != "1" ]]; then
  info "Installing backend dependencies"
  cd "$ROOT_DIR/backend"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi

if [[ "$SKIP_FRONTEND" != "1" ]]; then
  info "Installing frontend dependencies"
  cd "$ROOT_DIR/frontend"
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi
