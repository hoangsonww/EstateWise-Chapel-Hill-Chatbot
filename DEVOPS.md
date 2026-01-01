# EstateWise DevOps Guide

<p align="center">
  <img src="https://img.shields.io/badge/AWS-Cloud-232F3E?logo=task&logoColor=white" alt="AWS"/>
  <img src="https://img.shields.io/badge/Azure-Cloud-0078D4?logo=travisci&logoColor=white" alt="Azure"/>
  <img src="https://img.shields.io/badge/GCP-Cloud-4285F4?logo=google-cloud&logoColor=white" alt="GCP"/>
  <img src="https://img.shields.io/badge/OCI-Cloud-FF0000?logo=oracle&logoColor=white" alt="OCI"/>
  <img src="https://img.shields.io/badge/Jenkins-CI/CD-D24939?logo=jenkins&logoColor=white" alt="Jenkins"/>
  <img src="https://img.shields.io/badge/Kubernetes-1.29-326CE5?logo=kubernetes&logoColor=white" alt="Kubernetes"/>
  <img src="https://img.shields.io/badge/Docker-Containers-2496ED?logo=docker&logoColor=white" alt="Docker"/>
  <img src="https://img.shields.io/badge/Blue%2FGreen-Deployments-00D084" alt="Blue-Green"/>
  <img src="https://img.shields.io/badge/Canary-Deployments-FF6B6B" alt="Canary"/>
  <img src="https://img.shields.io/badge/Terraform-IaC-844FBA?logo=terraform&logoColor=white" alt="Terraform"/>
  <img src="https://img.shields.io/badge/Prometheus-Monitoring-E6522C?logo=prometheus&logoColor=white" alt="Prometheus"/>
  <img src="https://img.shields.io/badge/Grafana-Observability-F46800?logo=grafana&logoColor=white" alt="Grafana"/>
  <img src="https://img.shields.io/badge/Trivy-Security-blue?logo=aquasecurity&logoColor=white" alt="Trivy"/>
  <img src="https://img.shields.io/badge/Artillery-Load_Testing-F05A28?logo=artillery&logoColor=white" alt="Artillery"/>
  <img src="https://img.shields.io/badge/GitHub-Actions-CF222E?logo=github-actions&logoColor=white" alt="GitHub Actions"/>
  <img src="https://img.shields.io/badge/GitLab-CI/CD-FCA121?logo=gitlab&logoColor=white" alt="GitLab CI/CD"/>
  <img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Vue-3.2-4FC08D?logo=vue.js&logoColor=white" alt="Vue.js"/>
  <img src="https://img.shields.io/badge/Nuxt-3.0-00C58E?logo=nuxt&logoColor=white" alt="Nuxt.js"/>
</p>

This guide provides comprehensive documentation for EstateWise's DevOps practices, deployment strategies, CI/CD pipelines, and operational procedures.

---

## Table of Contents

- [Overview](#overview)
- [CI/CD Architecture](#cicd-architecture)
- [Deployment Strategies](#deployment-strategies)
  - [Blue-Green Deployments](#blue-green-deployments)
  - [Canary Deployments](#canary-deployments)
  - [Rolling Updates](#rolling-updates)
- [Jenkins Pipeline Configuration](#jenkins-pipeline-configuration)
- [Kubernetes Operations](#kubernetes-operations)
- [Deployment Control UI](#deployment-control-ui)
- [Monitoring and Observability](#monitoring-and-observability)
- [Disaster Recovery](#disaster-recovery)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

---

## Overview

EstateWise employs enterprise-grade DevOps practices with multiple deployment strategies to ensure zero-downtime deployments, rapid rollbacks, and safe progressive delivery of new features.

### Key Features

- **Multi-Strategy Deployments**: Blue-Green, Canary, and Rolling Updates
- **Zero-Downtime Deployments**: Traffic switching without service interruption
- **Automated Rollbacks**: Health checks and metrics-based automatic rollbacks
- **Multi-Cloud Support**: AWS, Azure, GCP, OCI, and Kubernetes deployments
- **Container-First**: Docker-based builds with vulnerability scanning
- **Infrastructure as Code**: Terraform, CloudFormation, Bicep support

---

## CI/CD Architecture

```mermaid
flowchart TB
    subgraph Source
        GH[GitHub Repository]
    end

    subgraph Jenkins["Jenkins CI/CD Pipeline"]
        direction TB
        Checkout[1. Checkout Code]
        Lint[2. Lint & Format]
        Test[3. Test Suites]
        Build[4. Build Images]
        Scan[5. Security Scan]
        Benchmark[6. Performance Test]

        subgraph DeployStrategies["Deployment Strategies"]
            BlueGreen[Blue-Green Deploy]
            Canary[Canary Deploy]
            Rolling[Rolling Update]
        end

        MultiCloud[7. Multi-Cloud Deploy]

        Checkout --> Lint
        Lint --> Test
        Test --> Build
        Build --> Scan
        Scan --> Benchmark
        Benchmark --> DeployStrategies
        DeployStrategies --> MultiCloud
    end

    subgraph Targets["Deployment Targets"]
        K8s[Kubernetes Clusters]
        AWS[AWS ECS/Fargate]
        Azure[Azure Container Apps]
        GCP[GCP Cloud Run]
        OCI[OCI Compute + LB]
    end

    subgraph Monitoring
        Prometheus[Prometheus Metrics]
        Logs[Centralized Logging]
        Alerts[Alert Manager]
    end

    GH -->|Webhook| Jenkins
    MultiCloud --> Targets
    Targets --> Monitoring
```

### Pipeline Stages

| Stage | Purpose | Duration | Failure Action |
|-------|---------|----------|----------------|
| **Checkout** | Clone repository and setup environment | 10-30s | Abort pipeline |
| **Lint & Format** | Code quality checks (ESLint, Prettier) | 30-60s | Abort pipeline |
| **Test Suites** | Unit and integration tests | 2-5min | Abort pipeline |
| **Build Images** | Docker image builds for backend/frontend | 3-8min | Abort pipeline |
| **Security Scan** | Trivy vulnerability scanning | 1-2min | Warning only |
| **Performance Test** | Artillery benchmark tests | 1-2min | Warning only |
| **Deployment** | Progressive deployment with selected strategy | 5-15min | Automatic rollback |

---

## GitLab CI/CD (self-managed or SaaS)

GitLab pipelines mirror the Jenkins flow with first-class support for blue/green, canary, and rolling rollouts.

- **Pipeline file**: `.gitlab-ci.yml`
- **Deploy helper**: `gitlab/deploy.sh` (wraps the existing Kubernetes scripts)
- **Stages**: lint → test → build → security (npm audit) → deploy (manual)
- **Defaults**: Node 20 runner image, project-local `.npm` cache, `NEXT_TELEMETRY_DISABLED=1`
- **Key variables**:
  - `DEPLOY_STRATEGY`: `blue-green`, `canary`, or `rolling`
  - `IMAGE_TAG`: container image to deploy
  - `SERVICE_NAME`: target workload (default `backend`)
  - `NAMESPACE`: Kubernetes namespace (default `estatewise`)
  - Optional toggles: `AUTO_SWITCH`, `SMOKE_TEST`, `SCALE_DOWN_OLD`, `CANARY_STAGES`, `STAGE_DURATION`, `AUTO_PROMOTE`, `ENABLE_METRICS`, `CANARY_REPLICAS_START`, `STABLE_REPLICAS`
- **Kube auth**: Prefer GitLab’s Kubernetes agent or protected CI variables for `KUBECONFIG`. No Dockerfile changes are required.

> Tip: Protect deploy jobs to `main` and require approvals; pair with the `deployment-control/` dashboard for visibility.

---

## Deployment Strategies

EstateWise supports three primary deployment strategies, each suited for different scenarios.

### Comparison Matrix

| Feature | Blue-Green | Canary | Rolling Update |
|---------|-----------|---------|----------------|
| **Zero-Downtime** | ✅ Yes | ✅ Yes | ✅ Yes |
| **Instant Rollback** | ✅ Immediate | ⚠️ Gradual | ⚠️ Re-deploy |
| **Resource Usage** | 2x during switch | 1.1-1.5x | 1x |
| **Testing in Production** | Limited | ✅ Extensive | Moderate |
| **Complexity** | Low | High | Low |
| **Risk Level** | Low | Very Low | Moderate |
| **Best For** | Major releases | New features | Patches, bug fixes |

---

## Blue-Green Deployments

Blue-Green deployment maintains two identical production environments (Blue and Green). At any time, only one is live and serving production traffic.

### Architecture

```mermaid
graph LR
    subgraph Production
        LB[Load Balancer/Service]
    end

    subgraph BlueEnvironment["Blue Environment (Active)"]
        BlueV1[v1.0.0 - 2 replicas]
    end

    subgraph GreenEnvironment["Green Environment (Inactive)"]
        GreenV2[v1.1.0 - 2 replicas]
    end

    LB -->|100% traffic| BlueV1
    LB -.->|0% traffic| GreenV2

    style BlueV1 fill:#4A90E2,color:black
    style GreenV2 fill:#7ED321,color:black
```

### Deployment Flow

```mermaid
sequenceDiagram
    participant Ops as Operator
    participant Script as blue-green-deploy.sh
    participant K8s as Kubernetes
    participant Blue as Blue Deployment
    participant Green as Green Deployment
    participant Svc as Service

    Ops->>Script: Execute deployment
    Script->>K8s: Check current active (Blue)
    Script->>Green: Deploy new version to Green
    Script->>Green: Wait for rollout complete
    Script->>Green: Health checks
    Green-->>Script: All healthy ✓
    Script->>Script: Smoke tests
    Script->>Ops: Request confirmation
    Ops->>Script: Approve switch
    Script->>Svc: Update selector to Green
    Svc->>Green: Route 100% traffic
    Script->>Ops: Deployment complete
    Note over Blue: Keep running for rollback
```

### Usage

#### Via Jenkins Pipeline

Set environment variables in your Jenkins job:

```groovy
DEPLOY_BLUE_GREEN=1
BLUE_GREEN_SERVICE=backend              # or 'frontend'
K8S_NAMESPACE=estatewise
AUTO_SWITCH_BLUE_GREEN=false            # require manual approval
SCALE_DOWN_OLD_DEPLOYMENT=false         # keep old deployment for rollback
```

#### Manual Execution

```bash
# Set environment
export NAMESPACE=estatewise
export AUTO_SWITCH=false        # manual approval
export SCALE_DOWN_OLD=false     # keep old deployment running
export SMOKE_TEST=true          # run smoke tests

# Execute deployment
./kubernetes/scripts/blue-green-deploy.sh backend \
  ghcr.io/your-org/estatewise-app-backend:v1.2.3
```

### Rollback Procedure

Blue-Green rollback is instantaneous - simply switch the service selector back:

```bash
# Check current active slot
kubectl get service estatewise-backend -n estatewise \
  -o jsonpath='{.spec.selector.version}'

# Instant rollback to previous slot
kubectl patch service estatewise-backend -n estatewise \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# Verify traffic switch
kubectl get endpoints estatewise-backend -n estatewise
```

### Best Practices

1. **Always test Green before switching**: Run comprehensive smoke tests on the Green environment
2. **Keep Blue running**: Don't scale down the old deployment immediately after switch
3. **Monitor after switch**: Watch metrics for at least 15-30 minutes post-deployment
4. **Database migrations**: Run migrations before deployment or ensure backward compatibility
5. **Cost consideration**: Blue-Green requires 2x resources during the transition

### Configuration Files

- **Blue Deployment**: `kubernetes/base/backend-deployment-blue.yaml`
- **Green Deployment**: `kubernetes/base/backend-deployment-green.yaml`
- **Deployment Script**: `kubernetes/scripts/blue-green-deploy.sh`

---

## Canary Deployments

Canary deployment gradually shifts traffic from the stable version to the new version, allowing real-world testing with minimal risk.

### Architecture

```mermaid
graph TB
    subgraph Traffic["Traffic Distribution"]
        Users[End Users]
    end

    subgraph K8s["Kubernetes Service"]
        Svc[Service Selector: app=estatewise-backend]
    end

    subgraph Stage1["Stage 1: 10% Canary"]
        Stable1[Stable: 9 replicas]
        Canary1[Canary: 1 replica]
    end

    subgraph Stage2["Stage 2: 25% Canary"]
        Stable2[Stable: 3 replicas]
        Canary2[Canary: 1 replica]
    end

    subgraph Stage3["Stage 3: 100% Canary"]
        Stable3[Stable: 0 replicas]
        Canary3[Canary: 4 replicas → Stable]
    end

    Users --> Svc
    Svc --> Stage1
    Stage1 --> Stage2
    Stage2 --> Stage3

    style Canary1 fill:#FF6B6B
    style Canary2 fill:#FF6B6B
    style Canary3 fill:#FF6B6B
```

### Deployment Flow

```mermaid
sequenceDiagram
    participant Ops as Operator
    participant Script as canary-deploy.sh
    participant K8s as Kubernetes
    participant Stable as Stable Deployment
    participant Canary as Canary Deployment
    participant Monitor as Monitoring

    Ops->>Script: Start canary deployment
    Script->>Canary: Deploy canary (1 replica)
    Script->>Canary: Health checks
    Canary-->>Script: Healthy ✓

    loop Each Stage (10%, 25%, 50%, 75%)
        Script->>K8s: Adjust replica counts
        Script->>Monitor: Check metrics
        Monitor-->>Script: Metrics healthy ✓
        alt Metrics Failed
            Script->>Canary: Scale to 0
            Script->>Stable: Restore replicas
            Script->>Ops: Rollback complete
        end
        Script->>Script: Wait stage duration
        Script->>Ops: Request approval
        Ops->>Script: Continue
    end

    Script->>Stable: Update to new version
    Script->>Canary: Scale to 0
    Script->>Ops: Deployment complete
```

### Canary Stages

| Stage | Stable Replicas | Canary Replicas | Traffic % | Risk Level | Duration |
|-------|----------------|-----------------|-----------|------------|----------|
| **Initial** | 2 | 1 | ~10% | Very Low | 2min |
| **Stage 1** | 3 | 1 | ~25% | Low | 2min |
| **Stage 2** | 2 | 2 | ~50% | Moderate | 2min |
| **Stage 3** | 1 | 3 | ~75% | Moderate-High | 2min |
| **Final** | 0 → 2 (new) | 4 → 0 | 100% | Stable | - |

### Usage

#### Via Jenkins Pipeline

```groovy
DEPLOY_CANARY=1
CANARY_SERVICE=backend
K8S_NAMESPACE=estatewise
CANARY_STAGES=10,25,50,75,100           # percentage stages
CANARY_STAGE_DURATION=120               # seconds between stages
AUTO_PROMOTE_CANARY=false               # require manual approval
```

#### Manual Execution

```bash
# Set environment
export NAMESPACE=estatewise
export CANARY_STAGES=10,25,50,75,100
export STAGE_DURATION=120
export AUTO_PROMOTE=false
export ENABLE_METRICS=true              # check Prometheus metrics

# Execute canary deployment
./kubernetes/scripts/canary-deploy.sh backend \
  ghcr.io/your-org/estatewise-app-backend:v1.2.3
```

### Health Checks and Metrics

The canary script performs automated health checks at each stage:

1. **Pod Health**
   - All canary pods are Ready
   - Restart count < 3
   - No CrashLoopBackOff

2. **Application Health**
   - `/health` endpoint returns 200 OK
   - Response time < 500ms

3. **Metrics (Optional)**
   - Error rate < 1%
   - p95 latency within 10% of stable
   - Success rate > 99%

### Automatic Rollback Conditions

The canary deployment automatically rolls back if:

- Canary pods fail readiness checks
- Pod restart count exceeds threshold
- Error rate exceeds 1%
- Manual abort by operator

### Best Practices

1. **Start small**: Use conservative initial percentage (5-10%)
2. **Monitor actively**: Watch dashboards during each stage
3. **Automate metrics**: Integrate with Prometheus for automated decision-making
4. **Feature flags**: Combine with feature flags for additional control
5. **Off-peak hours**: Schedule canary deployments during low-traffic periods

### Configuration Files

- **Canary Deployment**: `kubernetes/base/backend-deployment-canary.yaml`
- **Deployment Script**: `kubernetes/scripts/canary-deploy.sh`

---

## Rolling Updates

Rolling updates are Kubernetes' default strategy, gradually replacing pods with new versions.

### Configuration

Rolling updates are configured in the standard deployment manifests:

```yaml
spec:
  replicas: 2
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1        # 1 extra pod during update
      maxUnavailable: 0  # No pods unavailable (zero-downtime)
```

### Usage

```bash
# Update image
kubectl set image deployment/estatewise-backend \
  backend=ghcr.io/your-org/estatewise-app-backend:v1.2.3 \
  -n estatewise

# Watch rollout
kubectl rollout status deployment/estatewise-backend -n estatewise

# Rollback if needed
kubectl rollout undo deployment/estatewise-backend -n estatewise
```

---

## Jenkins Pipeline Configuration

### Environment Variables Reference

#### Basic Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_VERSION` | `18` | Node.js version for builds |
| `REGISTRY` | `ghcr.io/your-org` | Container registry |
| `K8S_NAMESPACE` | `estatewise` | Kubernetes namespace |

#### Multi-Cloud Deployment Toggles

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOY_AWS` | `0` | Deploy to AWS ECS Fargate |
| `DEPLOY_AZURE` | `0` | Deploy to Azure Container Apps |
| `DEPLOY_GCP` | `0` | Deploy to GCP Cloud Run |
| `DEPLOY_OCI` | `0` | Deploy to Oracle Cloud Infrastructure (OCI) |
| `DEPLOY_HASHICORP` | `0` | Deploy via Terraform to Kubernetes |
| `DEPLOY_K8S_MANIFESTS` | `0` | Apply Kubernetes manifests directly |

#### Advanced Deployment Strategies

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOY_BLUE_GREEN` | `0` | Enable Blue-Green deployment |
| `DEPLOY_CANARY` | `0` | Enable Canary deployment |
| `BLUE_GREEN_SERVICE` | `backend` | Service for Blue-Green (backend/frontend) |
| `CANARY_SERVICE` | `backend` | Service for Canary (backend/frontend) |
| `CANARY_STAGES` | `10,25,50,75,100` | Canary traffic percentages |
| `CANARY_STAGE_DURATION` | `120` | Seconds between canary stages |
| `AUTO_PROMOTE_CANARY` | `false` | Auto-promote without manual approval |
| `AUTO_SWITCH_BLUE_GREEN` | `false` | Auto-switch without manual approval |
| `SCALE_DOWN_OLD_DEPLOYMENT` | `false` | Scale down old deployment after switch |

### Example Jenkins Job Configurations

#### Production Blue-Green Deployment

```groovy
pipeline {
  environment {
    DEPLOY_BLUE_GREEN = '1'
    BLUE_GREEN_SERVICE = 'backend'
    AUTO_SWITCH_BLUE_GREEN = 'false'      // require approval
    SCALE_DOWN_OLD_DEPLOYMENT = 'true'    // cleanup after switch
    K8S_NAMESPACE = 'estatewise-prod'
  }
}
```

#### Staging Canary Deployment

```groovy
pipeline {
  environment {
    DEPLOY_CANARY = '1'
    CANARY_SERVICE = 'backend'
    CANARY_STAGES = '20,50,100'           // fewer stages for staging
    CANARY_STAGE_DURATION = '60'          // faster progression
    AUTO_PROMOTE_CANARY = 'true'          // no manual approval
    K8S_NAMESPACE = 'estatewise-staging'
  }
}
```

#### Multi-Cloud Production Deployment

```groovy
pipeline {
  environment {
    DEPLOY_AWS = '1'
    DEPLOY_GCP = '1'
    DEPLOY_K8S_MANIFESTS = '1'
    AWS_DEPLOY_ARGS = '--region us-east-1 --cluster prod-ecs'
    GCP_DEPLOY_ARGS = '--project estatewise-prod --region us-central1'
    K8S_APPLY_PATH = 'kubernetes/overlays/prod'
  }
}
```

---

## Kubernetes Operations

### Namespace Setup

```bash
# Create namespace
kubectl create namespace estatewise

# Create secrets
kubectl create secret generic estatewise-secrets \
  --from-literal=mongoUri="mongodb://..." \
  --from-literal=jwtSecret="your-jwt-secret" \
  --from-literal=googleAiApiKey="your-api-key" \
  --from-literal=pineconeApiKey="your-api-key" \
  --from-literal=pineconeIndex="your-index" \
  -n estatewise

# Create configmap
kubectl create configmap estatewise-shared-config \
  --from-literal=NODE_ENV=production \
  --from-literal=PORT=3001 \
  -n estatewise
```

### Deployment Commands

```bash
# Apply base manifests
kubectl apply -k kubernetes/base -n estatewise

# Apply production overlay
kubectl apply -k kubernetes/overlays/prod -n estatewise

# Check deployment status
kubectl get deployments -n estatewise
kubectl get pods -n estatewise
kubectl get services -n estatewise

# View logs
kubectl logs -f deployment/estatewise-backend -n estatewise
kubectl logs -f deployment/estatewise-backend -n estatewise --previous

# Port forward for testing
kubectl port-forward svc/estatewise-backend 3001:3001 -n estatewise
```

### Scaling Operations

```bash
# Manual scaling
kubectl scale deployment/estatewise-backend --replicas=5 -n estatewise

# Autoscaling (HPA)
kubectl autoscale deployment estatewise-backend \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n estatewise

# Check autoscaler status
kubectl get hpa -n estatewise
```

---

## Deployment Control UI

The `deployment-control/` directory contains a full-featured dashboard for managing deployments across all supported targets and strategies.

- **Web UI** – Vue 3 + Nuxt 3 frontend with Pinia state management.
- **API Server** – Express + TypeScript backend handling deployment requests and job tracking.
- **Features**:
  - Real-time deployment status and logs
  - Blue-Green and Canary deployment workflows
  - Cluster snapshot and health metrics
  - User notifications and alerts
  - TypeScript type safety and accessibility support
  - Hot Module Replacement for rapid development
  - Extensible architecture for future enhancements

To get started, see [deployment-control/README.md](deployment-control/README.md).

<p align="center">
  <img src="deployment-control/docs/ui.png" alt="Deployment Control Dashboard Screenshot" width="100%"/>
</p>

---

## Monitoring and Observability

### Metrics Collection

EstateWise deployments expose Prometheus metrics via annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3001"
  prometheus.io/path: "/metrics"
```

### Key Metrics to Monitor

| Metric | Type | Alert Threshold | Description |
|--------|------|-----------------|-------------|
| `http_request_duration_seconds` | Histogram | p95 > 1s | Request latency |
| `http_requests_total` | Counter | Rate decreasing | Request throughput |
| `http_request_errors_total` | Counter | Rate > 1% | Error rate |
| `process_resident_memory_bytes` | Gauge | > 1GB | Memory usage |
| `nodejs_heap_size_used_bytes` | Gauge | > 800MB | Heap usage |
| `up` | Gauge | 0 | Service availability |

### Logging Strategy

```bash
# View deployment logs
kubectl logs -l app=estatewise-backend -n estatewise --tail=100

# Follow logs
kubectl logs -f deployment/estatewise-backend -n estatewise

# Logs from specific deployment slot
kubectl logs -l app=estatewise-backend,version=blue -n estatewise
kubectl logs -l app=estatewise-backend,version=canary -n estatewise

# Export logs for analysis
kubectl logs deployment/estatewise-backend -n estatewise \
  --since=1h > backend-logs.txt
```

### Health Checks

All deployments include comprehensive health checks:

```yaml
readinessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3
```

---

## Disaster Recovery

### Backup Strategy

1. **Database Backups**
   - Automated daily backups of MongoDB
   - 30-day retention policy
   - Point-in-time recovery available

2. **Configuration Backups**
   - Git repository serves as source of truth
   - Kubernetes secrets backed up encrypted
   - Terraform state stored in remote backend

3. **Container Images**
   - All images tagged with commit SHA
   - Retention: 90 days for production images
   - Can redeploy any previous version instantly

### Recovery Procedures

#### Rollback to Previous Version

```bash
# Check deployment history
kubectl rollout history deployment/estatewise-backend -n estatewise

# Rollback to previous version
kubectl rollout undo deployment/estatewise-backend -n estatewise

# Rollback to specific revision
kubectl rollout undo deployment/estatewise-backend \
  --to-revision=5 \
  -n estatewise
```

#### Database Recovery

```bash
# Restore from MongoDB backup
mongorestore --uri="mongodb://..." --archive=backup.archive

# Point-in-time recovery (AWS DocumentDB)
aws docdb restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier estatewise-prod \
  --db-cluster-identifier estatewise-prod-restored \
  --restore-to-time 2024-01-15T10:00:00Z
```

#### Complete Cluster Recovery

```bash
# 1. Provision new cluster (Terraform)
cd hashicorp/terraform
terraform apply

# 2. Restore secrets
kubectl apply -f backups/secrets-encrypted.yaml

# 3. Deploy application
kubectl apply -k kubernetes/overlays/prod

# 4. Restore database
./scripts/restore-database.sh

# 5. Verify
kubectl get pods -n estatewise
curl https://api.estatewise.com/health
```

---

## Security Best Practices

### Container Security

1. **Image Scanning**
   - Trivy scans run on every build
   - Block deployment if critical vulnerabilities found
   - Regular rescanning of existing images

2. **Base Images**
   - Use official Node.js Alpine images
   - Minimal attack surface
   - Regular updates to latest patches

3. **Non-Root Containers**
   ```dockerfile
   USER node
   ```

### Secrets Management

1. **Never commit secrets** to Git
2. **Use Kubernetes Secrets** for sensitive data
3. **Encrypt secrets at rest** (encryption provider)
4. **Rotate secrets regularly** (90-day cycle)
5. **Use external secret managers** (AWS Secrets Manager, Azure Key Vault)

### Network Security

1. **Network Policies**: Restrict pod-to-pod communication
2. **TLS Everywhere**: Enforce HTTPS for all external traffic
3. **Service Mesh**: Use Consul for mTLS between services
4. **Ingress Security**: WAF, rate limiting, DDoS protection

### Access Control

1. **RBAC**: Least-privilege access to Kubernetes
2. **Service Accounts**: Dedicated service accounts per deployment
3. **Audit Logging**: Enable Kubernetes audit logs
4. **MFA**: Require MFA for production access

---

## Troubleshooting

### Common Issues

#### Deployment Stuck in Pending

```bash
# Check pod events
kubectl describe pod <pod-name> -n estatewise

# Common causes:
# - Insufficient resources
# - Image pull errors
# - Node selector mismatch

# Solutions:
kubectl get nodes                        # Check node capacity
kubectl scale deployment --replicas=1    # Reduce replica count
kubectl get events -n estatewise         # Check cluster events
```

#### Canary Deployment Failed

```bash
# Check canary pod status
kubectl get pods -l version=canary -n estatewise

# View canary logs
kubectl logs -l version=canary -n estatewise

# Check service endpoints
kubectl get endpoints estatewise-backend -n estatewise

# Manual rollback
kubectl scale deployment/estatewise-backend-canary --replicas=0 -n estatewise
kubectl scale deployment/estatewise-backend --replicas=2 -n estatewise
```

#### Blue-Green Traffic Not Switching

```bash
# Check current service selector
kubectl get service estatewise-backend -n estatewise -o yaml | grep version

# Verify deployments are ready
kubectl get deployments -l app=estatewise-backend -n estatewise

# Check endpoints
kubectl get endpoints estatewise-backend -n estatewise

# Manual switch
kubectl patch service estatewise-backend -n estatewise \
  -p '{"spec":{"selector":{"version":"green"}}}'
```

#### High Memory Usage

```bash
# Check memory usage
kubectl top pods -n estatewise

# Increase memory limits
kubectl set resources deployment/estatewise-backend \
  --limits=memory=2Gi \
  -n estatewise

# Check for memory leaks
kubectl logs deployment/estatewise-backend -n estatewise | grep -i "memory\|heap"
```

### Debug Commands

```bash
# Interactive shell in pod
kubectl exec -it deployment/estatewise-backend -n estatewise -- /bin/sh

# Copy files from pod
kubectl cp estatewise/pod-name:/path/to/file ./local-file

# Check resource usage
kubectl top nodes
kubectl top pods -n estatewise

# Network debugging
kubectl run debug --image=nicolaka/netshoot -it --rm -n estatewise
```

---

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Jenkins Pipeline Syntax](https://www.jenkins.io/doc/book/pipeline/syntax/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)

---

## Support and Contribution

For issues, questions, or contributions:

- **Issues**: Open an issue in the GitHub repository
- **Documentation**: See `README.md` and `DEPLOYMENTS.md`
- **CI/CD**: See `jenkins/README.md`

---
