#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

FRONTEND_DIR="${ROOT_DIR}/frontend"
SKIP_INSTALL="${SKIP_INSTALL:-0}"
SKIP_BUILD="${SKIP_BUILD:-0}"

require_cmd npm

info "Installing frontend dependencies..."
cd "$FRONTEND_DIR"
if [[ "$SKIP_INSTALL" != "1" ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci
  else
    npm install
  fi
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  info "Building frontend..."
  npm run build
fi

info "Starting frontend (dev mode)..."
npm run dev
