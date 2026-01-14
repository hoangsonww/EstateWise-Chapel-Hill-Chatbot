#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

log() {
  printf '%s\n' "$*"
}

info() {
  log "[INFO] $*"
}

warn() {
  log "[WARN] $*"
}

error() {
  log "[ERROR] $*" >&2
}

die() {
  error "$*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

require_env() {
  local name="$1"
  [[ -n "${!name:-}" ]] || die "Missing required env var: ${name}"
}
