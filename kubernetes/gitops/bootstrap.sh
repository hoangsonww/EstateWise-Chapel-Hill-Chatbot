#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Missing required command: $1" >&2
    exit 1
  }
}

require_cmd kubectl
require_cmd flux

echo "[1/4] Installing Flux controllers"
flux install

echo "[2/4] Installing Argo CD controllers"
kubectl get ns argocd >/dev/null 2>&1 || kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

echo "[3/4] Applying Argo CD GitOps bootstrap"
kubectl apply -k "${REPO_ROOT}/kubernetes/gitops/argocd"

echo "[4/4] Applying Flux GitOps bootstrap"
kubectl apply -k "${REPO_ROOT}/kubernetes/gitops/flux"

echo "Bootstrap submitted. Validate with:"
echo "  argocd app list"
echo "  flux get kustomizations -A"
