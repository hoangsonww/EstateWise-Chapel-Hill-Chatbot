#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

BACKEND_DIR="${ROOT_DIR}/backend"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

require_cmd npm

info "Installing backend dependencies..."
cd "$BACKEND_DIR"
if [[ "$SKIP_INSTALL" != "1" ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  info "Generating build artifacts..."
  npm run build
fi

info "Starting backend (dev mode)..."
npm run start
