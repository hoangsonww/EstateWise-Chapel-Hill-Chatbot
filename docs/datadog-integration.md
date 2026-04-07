# Datadog Integration — EstateWise

Comprehensive observability integration covering metrics, APM traces, logs, monitors, SLOs, dashboards, and synthetic checks across all deployment targets.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Datadog Cloud Platform                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────────┐  │
│  │ Monitors │ │Dashboard │ │   SLOs   │ │ Synthetic Checks  │  │
│  └────▲─────┘ └────▲─────┘ └────▲─────┘ └────────▲──────────┘  │
│       │            │            │                 │              │
│  ┌────┴────────────┴────────────┴─────────────────┴──────────┐  │
│  │              Datadog Intake API (HTTPS/443)                │  │
│  └─────────────────────────▲─────────────────────────────────┘  │
└────────────────────────────┼────────────────────────────────────┘
                             │
         ┌───────────────────┴───────────────────┐
         │          Datadog Cluster Agent         │
         │   (metadata, external metrics, HPA)   │
         └──────────▲───────────────▲────────────┘
                    │               │
    ┌───────────────┴───┐   ┌──────┴────────────────┐
    │  Datadog Agent     │   │  Datadog Agent        │
    │  (DaemonSet)       │   │  (DaemonSet)          │
    │  Node A            │   │  Node B               │
    └──▲───▲───▲────────┘   └──▲───▲───▲───────────┘
       │   │   │                │   │   │
       │   │   └─ DogStatsD     │   │   └─ DogStatsD
       │   └─── APM Traces      │   └─── APM Traces
       └────── Logs             └────── Logs
       │                        │
  ┌────┴─────┐             ┌────┴─────┐
  │ Backend  │             │ Frontend │
  │ gRPC     │             │ MCP      │
  │ Agentic  │             │          │
  └──────────┘             └──────────┘
```

## Deployment Targets

| Target | Location | What It Does |
|--------|----------|-------------|
| **Terraform** | `terraform/datadog.tf` | ECS monitors, ALB monitors, APM monitors, dashboard, SLOs, synthetic checks, downtime schedules |
| **Helm** | `helm/estatewise/templates/datadog-*.yaml` | K8s DaemonSet agent, Cluster Agent, monitors ConfigMap, NetworkPolicies |
| **Helm values** | `helm/estatewise/values.yaml` | `datadog.*` section — toggle features, set images, configure APM/logs/DogStatsD |
| **Kubernetes** | `kubernetes/monitoring/datadog-*.yaml` | Standalone (non-Helm) agent + monitor manifests |
| **Docker Compose** | `docker/compose.prod.yml` | `datadog-agent` service (profile: monitoring), DD env vars on all app services |
| **Podman Compose** | `docker/podman-compose.prod.yml` | Same as Docker Compose, for Podman environments |
| **Deployment Control** | `deployment-control/src/datadog.ts` | Deploy events + DogStatsD metrics (count, duration, success/failure) |

## Setup

### Prerequisites

1. A Datadog account with API + Application keys
2. `DD_API_KEY` and `DD_APP_KEY` (create at [Datadog API Keys](https://app.datadoghq.com/organization-settings/api-keys))

### Docker Compose (Local/Staging)

```bash
# Set Datadog credentials
export DD_API_KEY="your-api-key"
export DD_SITE="datadoghq.com"  # or datadoghq.eu for EU

# Start with monitoring profile
docker compose -f docker/compose.prod.yml --profile monitoring up -d

# Optionally set version tags
export BACKEND_VERSION="1.2.3"
export FRONTEND_VERSION="1.2.3"
```

### Kubernetes (Helm)

```bash
# Create Datadog secret
kubectl create secret generic datadog-secret \
  --namespace estatewise \
  --from-literal=api-key="$DD_API_KEY" \
  --from-literal=app-key="$DD_APP_KEY" \
  --from-literal=cluster-agent-token="$(openssl rand -hex 32)"

# Install/upgrade with Datadog enabled
helm upgrade --install estatewise ./helm/estatewise \
  --namespace estatewise \
  --set datadog.enabled=true \
  --set datadog.monitors.enabled=true
```

### Kubernetes (Standalone Manifests)

```bash
# Edit secrets in the YAML first (never commit real keys)
vim kubernetes/monitoring/datadog-agent.yaml

# Apply
kubectl apply -f kubernetes/monitoring/datadog-agent.yaml
kubectl apply -f kubernetes/monitoring/datadog-monitors.yaml
```

### Terraform (AWS ECS)

```hcl
# terraform.tfvars
enable_datadog   = true
datadog_api_key  = "your-api-key"      # or use TF_VAR_ env
datadog_app_key  = "your-app-key"
datadog_notification_channels = ["@slack-estatewise-alerts"]
```

```bash
cd terraform
terraform plan -var-file=prod.tfvars
terraform apply -var-file=prod.tfvars
```

### Deployment Control

```bash
# Set env vars for the deployment-control API
export DD_API_KEY="your-api-key"
export DD_SITE="datadoghq.com"
export DD_AGENT_HOST="localhost"     # or datadog-agent in Docker
export DD_DOGSTATSD_PORT="8125"

cd deployment-control && npm run dev
```

## What Gets Monitored

### Monitors (Alerts)

| Monitor | Type | Threshold | Priority |
|---------|------|-----------|----------|
| API Error Rate | metric | >5% (warn 2%) | P1 |
| API Latency P95 | metric | >1s (warn 500ms) | P2 |
| API Latency P99 | metric | >2s (warn 1s) | P1 |
| Pod Crash Loop | metric | >0 restarts/5m | P1 |
| High Memory | metric | >90% (warn 80%) | P3 |
| High CPU | metric | >80% (warn 65%) | P3 |
| ECS High CPU | metric | >95% (warn 80%) | P2 |
| ECS High Memory | metric | >95% (warn 85%) | P2 |
| ECS Task Stopped | event | any error event | P1 |
| ALB 5xx Rate | metric | >5% | P1 |
| ALB Latency P95 | metric | >1s (warn 500ms) | P2 |
| ALB Healthy Hosts | metric | <desired count | P1 |
| Log Error Anomaly | log | anomalous spike | P3 |
| DB Connection Pool | metric | >80% (warn 65%) | P2 |
| SLO Availability | metric | <99.5% | P1 |
| SLO Latency P95 | metric | >500ms | P1 |
| Deploy Duration | metric | >600s (warn 300s) | P3 |

### SLOs

| SLO | Target | Window |
|-----|--------|--------|
| API Availability | 99.9% | 30 days |
| API Latency (P95 <500ms) | 95% | 30 days |

### Dashboard Widgets

The Terraform-managed dashboard ("EstateWise Production Overview") includes:

- **Infrastructure**: ECS CPU/Memory, Running vs Desired Tasks
- **Application**: Request Rate, Error Rate %, Latency P50/P95/P99
- **ALB**: HTTP 2xx/4xx/5xx rates, Target Response Time, Active Connections, Healthy Hosts
- **Logs**: Error Volume Over Time, Top Error Patterns
- **Database**: MongoDB Active Connections, Query Latency

### Custom DogStatsD Metrics

Emitted by `deployment-control`:

| Metric | Type | Tags |
|--------|------|------|
| `estatewise.deploy.started` | counter | deploy_type, service |
| `estatewise.deploy.finished` | counter | deploy_type, deploy_status, service |
| `estatewise.deploy.success` | counter | deploy_type, service |
| `estatewise.deploy.failure` | counter | deploy_type, service |
| `estatewise.deploy.duration_seconds` | histogram | deploy_type, deploy_status, service |

### Unified Service Tagging

All services emit three standard tags for correlated observability:

| Variable | Backend | Frontend | gRPC | MCP | Agentic AI |
|----------|---------|----------|------|-----|------------|
| `DD_SERVICE` | estatewise-backend | estatewise-frontend | estatewise-grpc | estatewise-mcp | estatewise-agentic-ai |
| `DD_ENV` | production | production | production | production | production |
| `DD_VERSION` | image tag | image tag | image tag | image tag | image tag |

## Operational Runbooks

### Silencing Monitors During Deploys

Deployment-control sends deploy start/finish events. For planned maintenance:

```hcl
# terraform.tfvars — recurring weekly window
datadog_maintenance_windows = [
  {
    scope    = ["env:production", "team:estatewise"]
    start    = "2025-01-06T02:00:00"
    end      = "PT2H"
    timezone = "America/New_York"
    message  = "Weekly maintenance window"
  }
]
```

### Investigating Alert Escalations

1. Check the **Dashboard**: Datadog → Dashboards → "EstateWise Production Overview"
2. Correlate with **APM Traces**: Datadog → APM → Services → estatewise-backend
3. Review **Logs**: Datadog → Logs → `kube_namespace:estatewise status:error`
4. Check **Deploy Events**: Datadog → Events → `source:deployment-control`

### Network Policy Verification

If Datadog stops receiving data after enabling network policies:

```bash
# Verify agent pods can reach Datadog intake
kubectl exec -n estatewise -it $(kubectl get pods -n estatewise -l app=datadog-agent -o name | head -1) -- agent status

# Check network policy allows traffic
kubectl get networkpolicies -n estatewise -l app.kubernetes.io/component=datadog-networkpolicy
```

## File Reference

```
terraform/
  datadog.tf              # Monitors, dashboard, SLOs, synthetics, downtimes
  providers.tf            # Datadog provider config
  variables.tf            # datadog_api_key, enable_datadog, etc.
  outputs.tf              # datadog_dashboard_url

helm/estatewise/
  values.yaml             # datadog.* configuration block
  templates/
    datadog-agent.yaml          # DaemonSet + RBAC + Service
    datadog-clusteragent.yaml   # Deployment + RBAC + Services
    datadog-monitors.yaml       # Monitor definitions ConfigMap
    datadog-networkpolicy.yaml  # Network policies for DD traffic
    backend-deployment.yaml     # DD env injection (when enabled)
    frontend-deployment.yaml    # DD env injection (when enabled)
    grpc-deployment.yaml        # DD env injection (when enabled)
    mcp-deployment.yaml         # DD env injection (when enabled)

kubernetes/monitoring/
  datadog-agent.yaml      # Standalone agent + cluster agent manifests
  datadog-monitors.yaml   # Standalone monitor definitions ConfigMap

docker/
  compose.prod.yml        # datadog-agent service + DD env on all apps
  podman-compose.prod.yml # Same for Podman

deployment-control/src/
  datadog.ts              # Event API + DogStatsD metrics
  server.ts               # /api/integrations/datadog status endpoint
  jobRunner.ts            # Calls notifyDeployStart/notifyDeployFinish
```
