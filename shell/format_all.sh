#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Formatting backend + frontend"
bash shell/format_backend.sh
bash shell/format_frontend.sh
