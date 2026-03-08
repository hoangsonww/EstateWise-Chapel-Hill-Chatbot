#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
EXPECTED_REPO_URL="https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git"
ALLOWED_EXTERNAL_URLS=(
  "https://argoproj.github.io/argo-helm"
  "https://flagger.app"
)

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd kubectl

echo "[1/7] Validating Argo CD bootstrap manifests"
kubectl kustomize "${REPO_ROOT}/kubernetes/gitops/argocd" >/dev/null

echo "[2/7] Validating Argo CD app manifests"
kubectl kustomize "${REPO_ROOT}/kubernetes/gitops/argocd/apps" >/dev/null

echo "[3/7] Validating Flux bootstrap manifests"
kubectl kustomize "${REPO_ROOT}/kubernetes/gitops/flux" >/dev/null

echo "[4/7] Validating core production overlay"
kubectl kustomize "${REPO_ROOT}/kubernetes/overlays/prod-gitops" >/dev/null

echo "[5/7] Validating Flagger delivery manifests"
kubectl kustomize "${REPO_ROOT}/kubernetes/progressive-delivery/flagger" >/dev/null

echo "[6/7] Validating Argo Workflows manifests"
kubectl kustomize "${REPO_ROOT}/kubernetes/workflows/argo-workflows" >/dev/null

echo "[7/7] Validating canonical GitOps repo URL"
TMP_URLS_FILE="/tmp/estatewise-gitops-url-lines.txt"
TMP_MISMATCH_FILE="/tmp/estatewise-gitops-url-mismatches.txt"
rg -n "repoURL:|url:" "${REPO_ROOT}/kubernetes/gitops" --glob "*.yaml" >"${TMP_URLS_FILE}"
>"${TMP_MISMATCH_FILE}"

while IFS= read -r line; do
  url="$(printf "%s" "$line" | grep -oE 'https?://[^[:space:]]+' || true)"
  if [[ -z "$url" ]]; then
    continue
  fi
  if [[ "$url" == "$EXPECTED_REPO_URL" ]]; then
    continue
  fi

  allowed=false
  for allowed_url in "${ALLOWED_EXTERNAL_URLS[@]}"; do
    if [[ "$url" == "$allowed_url" ]]; then
      allowed=true
      break
    fi
  done

  if [[ "$allowed" == false ]]; then
    printf "%s\n" "$line" >>"${TMP_MISMATCH_FILE}"
  fi
done <"${TMP_URLS_FILE}"

if [[ -s "${TMP_MISMATCH_FILE}" ]]; then
  echo "Found non-allowlisted GitOps source URLs:" >&2
  cat "${TMP_MISMATCH_FILE}" >&2
  exit 1
fi

echo "Preflight checks passed."
