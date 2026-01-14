#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd terraform

TF_DIR="${ROOT_DIR}/terraform"
TF_VARS_FILE="${TF_VARS_FILE:-}"
CONTAINER_IMAGE="${CONTAINER_IMAGE:-}"

args=()
if [[ -n "$TF_VARS_FILE" ]]; then
  args+=("-var-file=${TF_VARS_FILE}")
fi
if [[ -n "$CONTAINER_IMAGE" ]]; then
  args+=("-var" "container_image=${CONTAINER_IMAGE}")
fi

info "Terraform init"
cd "$TF_DIR"
terraform init

info "Terraform plan"
terraform plan "${args[@]}"
