#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd curl

URL="${1:-${HEALTHCHECK_URL:-}}"

if [[ -z "$URL" ]]; then
  die "Usage: HEALTHCHECK_URL=https://example.com/health bash shell/health_check.sh"
fi

info "Checking ${URL}"
http_code="$(curl -fsS -o /dev/null -w "%{http_code}" "$URL")"

if [[ "$http_code" != "200" ]]; then
  die "Health check failed with status ${http_code}"
fi

info "Health check passed"
