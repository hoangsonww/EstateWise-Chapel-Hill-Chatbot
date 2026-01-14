#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

info "Linting frontend"
bash shell/lint_frontend.sh
