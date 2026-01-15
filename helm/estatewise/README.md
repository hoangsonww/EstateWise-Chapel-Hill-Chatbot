# EstateWise Helm Chart

This chart mirrors the existing Kubernetes manifests under `kubernetes/` while offering Helm-driven configuration for multi-cloud CI/CD workflows.

## Install

```bash
helm install estatewise ./helm/estatewise \
  --namespace estatewise --create-namespace
```

## Common Overrides

```bash
helm upgrade --install estatewise ./helm/estatewise \
  --namespace estatewise \
  --set global.registry=ghcr.io/hoangsonww \
  --set backend.image.tag=sha-<gitsha> \
  --set frontend.image.tag=sha-<gitsha>
```

## Secrets

The chart expects `estatewise-secrets` by default. You can either:

- Create it externally (recommended for CI/CD), or
- Set `secrets.create=true` and fill `secrets.data` in values.

```bash
kubectl create secret generic estatewise-secrets \
  --namespace estatewise \
  --from-literal=mongoUri=... \
  --from-literal=googleAiApiKey=... \
  --from-literal=pineconeApiKey=... \
  --from-literal=pineconeIndex=... \
  --from-literal=jwtSecret=...
```

## Cloud-Specific Annotations

Use `global.cloud.ingress.annotations` and `global.cloud.service.annotations` to align with AWS/Azure/GCP/Oracle load balancers.

Example (AWS ALB Ingress Controller):

```yaml
global:
  cloud:
    provider: aws
    ingress:
      annotations:
        kubernetes.io/ingress.class: alb
        alb.ingress.kubernetes.io/scheme: internet-facing
        alb.ingress.kubernetes.io/target-type: ip
```

Example (GCP ingress):

```yaml
global:
  cloud:
    provider: gcp
    ingress:
      annotations:
        kubernetes.io/ingress.class: gce
```

Example (Azure load balancer):

```yaml
global:
  cloud:
    provider: azure
    service:
      annotations:
        service.beta.kubernetes.io/azure-load-balancer-internal: "true"
```

Example (Oracle Cloud Load Balancer):

```yaml
global:
  cloud:
    provider: oracle
    service:
      annotations:
        service.beta.kubernetes.io/oci-load-balancer-internal: "true"
```

## Optional Components

- Enable gRPC service:

```yaml
grpc:
  enabled: true
  service:
    type: LoadBalancer
```

- Enable MCP server:

```yaml
mcp:
  enabled: true
```

## Notes

- HPA, PDB, and NetworkPolicy templates align with `kubernetes/base` defaults.
- Consul annotations are enabled by default for backend/frontend pods; disable via `backend.podAnnotations`/`frontend.podAnnotations`.
