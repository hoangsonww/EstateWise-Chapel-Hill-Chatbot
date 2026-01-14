#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/lib/common.sh"

require_cmd docker

REGISTRY_PROVIDER="${REGISTRY_PROVIDER:-}"
REGISTRY="${REGISTRY:-}"

case "$REGISTRY_PROVIDER" in
  ghcr)
    require_env GITHUB_ACTOR
    require_env GH_TOKEN
    info "Logging in to GHCR as ${GITHUB_ACTOR}"
    echo "$GH_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
    ;;
  ecr)
    require_cmd aws
    AWS_REGION="${AWS_REGION:-us-east-1}"
    if [[ -z "$REGISTRY" ]]; then
      account_id="$(aws sts get-caller-identity --query Account --output text)"
      REGISTRY="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    fi
    info "Logging in to ECR registry ${REGISTRY}"
    aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY"
    ;;
  "")
    warn "REGISTRY_PROVIDER not set; skipping docker login."
    ;;
  *)
    require_env REGISTRY
    require_env REGISTRY_USER
    require_env REGISTRY_PASSWORD
    info "Logging in to ${REGISTRY} as ${REGISTRY_USER}"
    echo "$REGISTRY_PASSWORD" | docker login "$REGISTRY" -u "$REGISTRY_USER" --password-stdin
    ;;
esac
