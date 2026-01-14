#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Checking core tooling"
require_cmd node
require_cmd npm
require_cmd git

info "Node: $(node -v)"
info "npm: $(npm -v)"
info "git: $(git --version | awk '{print $3}')"

if command -v docker >/dev/null 2>&1; then
  info "Docker: $(docker --version | awk '{print $3}' | tr -d ',')"
else
  warn "Docker not found (required for container builds)."
fi

if command -v terraform >/dev/null 2>&1; then
  info "Terraform: $(terraform version | head -n 1 | awk '{print $2}')"
else
  warn "Terraform not found (required for IaC workflows)."
fi

if command -v aws >/dev/null 2>&1; then
  info "AWS CLI: $(aws --version 2>&1 | awk '{print $1}' | cut -d/ -f2)"
else
  warn "AWS CLI not found (required for AWS deploy workflows)."
fi

if command -v concurrently >/dev/null 2>&1; then
  info "concurrently available"
else
  warn "concurrently not found; run 'npm install -g concurrently' or rely on npx."
fi

if [[ -d "$ROOT_DIR/backend" ]]; then
  info "Backend dir found: ${ROOT_DIR}/backend"
else
  warn "Backend dir missing at ${ROOT_DIR}/backend"
fi

if [[ -d "$ROOT_DIR/frontend" ]]; then
  info "Frontend dir found: ${ROOT_DIR}/frontend"
else
  warn "Frontend dir missing at ${ROOT_DIR}/frontend"
fi
