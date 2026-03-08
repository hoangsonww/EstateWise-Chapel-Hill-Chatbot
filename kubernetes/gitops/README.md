# EstateWise GitOps Control Plane

This folder defines a dual-controller GitOps topology where **Argo CD** and **Flux CD** coexist safely without reconciling the same resources.

Canonical GitOps repository URL used by manifests:

- `https://github.com/hoangsonww/EstateWise-Chapel-Hill-Chatbot.git`

## Ownership Model

- **Argo CD** (`kubernetes/gitops/argocd`)
  - Owns platform application delivery.
  - Deploys:
    - `kubernetes/overlays/prod-gitops` (core namespace/app infra)
    - Argo Rollouts controller
    - Argo Workflows controller
    - Argo Workflows templates/cron definitions

- **Flux CD** (`kubernetes/gitops/flux`)
  - Owns Flagger controller lifecycle and isolated canary sandbox workloads.
  - Deploys:
    - Flagger in `flagger-system`
    - Flagger canary workload in `estatewise-delivery`

This separation prevents drift loops between Argo CD and Flux.

## Bootstrap Order

1. Install Flux controllers.
2. Install Argo CD controller.
3. Apply Argo CD project + root app.
4. Apply Flux source + Kustomization objects.

Or use the bundled script:

```bash
bash kubernetes/gitops/bootstrap.sh
```

Validate manifests and source URL consistency before production sync:

```bash
bash kubernetes/gitops/preflight.sh
```

## Argo CD Bootstrap

```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
kubectl apply -k kubernetes/gitops/argocd
```

## Flux Bootstrap

```bash
flux install
kubectl apply -k kubernetes/gitops/flux
```

## Verification

```bash
# Argo CD
argocd app list
argocd app get estatewise-platform-root

# Flux
flux get sources git -A
flux get kustomizations -A
flux get helmreleases -A

# Progressive delivery controllers
kubectl get deploy -n argo-rollouts
kubectl get deploy -n flagger-system

# Workflows
kubectl get workflowtemplates -n argo-workflows
kubectl get cronworkflows -n argo-workflows
```

## Rollback Strategy

- Argo CD rollback: `argocd app rollback <app-name> <revision>`
- Argo Rollouts rollback: `kubectl argo rollouts undo rollout/estatewise-backend -n estatewise`
- Flagger rollback: automatic when canary analysis fails (`threshold` exceeded)

## Security and Ops Notes

- Use private repo credentials (SSH deploy key or PAT) for both Argo CD and Flux source access.
- Restrict Argo CD and Flux service-account permissions to required namespaces in production.
- Pair with admission controls (OPA/Gatekeeper/Kyverno) and image signature verification before promotion.
- Export controller metrics to Prometheus and alert on reconciliation failures.
- Namespace Pod Security labels and resource governance are included for `argo-workflows`, `flagger-system`, and `estatewise-delivery`.
