# EstateWise SRE Dashboard

Real-time Site Reliability Engineering dashboard for the EstateWise platform. Displays service health, SLO compliance, deployment status, infrastructure metrics, and DORA performance across all services and regions.

<p align="center">
  <img src="../img/sre-dashboard.png" alt="SRE Dashboard Mockup" width="100%"/>
</p>

## Quick Start

```bash
cd sre-dashboard
npm install
npm run dev
```

Open [http://localhost:4200](http://localhost:4200) in your browser. The dashboard renders simulated production data out of the box — no backend services required.

## Architecture

```mermaid
graph TB
    subgraph Browser["Browser (localhost:4200)"]
        HTML["index.html<br/>Dashboard Shell"]
        CSS["styles.css<br/>Dark Theme"]
        Config["config.js<br/>SLO Targets & Topology"]
        DP["data-provider.js<br/>Mock / Live Adapter"]
        CM["charts.js<br/>ChartManager (14 charts)"]
        App["app.js<br/>Refresh Loop (1s)"]

        HTML --> CSS
        HTML --> Config --> DP
        HTML --> CM
        HTML --> App
        App -->|"tick()"| DP
        App -->|"update(data)"| CM
    end

    subgraph Server["Express Server"]
        Static["Static Files"]
        ConfigAPI["/api/config"]
        Health["/health"]
    end

    Server -->|serves| Browser

    subgraph LiveSources["Live Data Sources (when wired)"]
        Prom["Prometheus<br/>:9090"]
        DC["Deployment Control<br/>:4100"]
        DD["Datadog API"]
        BE["Backend /metrics<br/>:3001"]
        AG["Agentic AI /health<br/>:4318"]
    end

    DP -.->|"future"| LiveSources

    style Browser fill:#161b22,stroke:#30363d,color:#e6edf3
    style Server fill:#1c2128,stroke:#30363d,color:#e6edf3
    style LiveSources fill:#21262d,stroke:#30363d,color:#8b949e
```

## Dashboard Sections

```mermaid
graph LR
    subgraph Row0["Service Health"]
        S1[backend]
        S2[frontend]
        S3[mcp]
        S4[agentic-ai]
        S5[grpc]
        S6[deploy-ctrl]
    end

    subgraph Row1["SLO Compliance"]
        G1["API Availability<br/>Gauge (99.9%)"]
        G2["P95 Latency<br/>Gauge (<500ms)"]
        G3["Error Budget<br/>Remaining %"]
        G4["Burn Rate<br/>Sparkline"]
    end

    subgraph Row2["Request Metrics"]
        C1["RPS<br/>Stacked Area"]
        C2["Error Rate<br/>Line + Threshold"]
        C3["Latency P50/P95/P99<br/>Multi-line"]
    end

    subgraph Row3["Deployment Status"]
        D1["Blue/Green<br/>Active Color"]
        D2["Canary Rollout<br/>Step Progress"]
        D3["Recent Deploys<br/>Feed"]
    end

    subgraph Row4["Infrastructure"]
        I1["CPU Usage<br/>Stacked Area"]
        I2["Memory Usage<br/>Stacked Area"]
        I3["Pod Status<br/>Grouped Bar"]
        I4["HPA Scaling<br/>Replica Lines"]
    end

    subgraph Row5["Multi-Region"]
        R1["Traffic Split<br/>Donut"]
        R2["Regional Latency<br/>Bar"]
        R3["Region Health<br/>Status Cards"]
    end

    subgraph Row6["Agentic AI"]
        A1["Token Usage<br/>Stacked Area"]
        A2["Agent Tasks<br/>Success/Fail Bar"]
        A3["Tool Latency<br/>Horizontal Bar"]
    end

    subgraph Row7["DORA & Alerts"]
        DO["DORA Metrics<br/>4 Stat Cards"]
        AL["Active Alerts<br/>Severity Feed"]
    end

    Row0 --> Row1 --> Row2 --> Row3 --> Row4 --> Row5 --> Row6 --> Row7

    style Row0 fill:#161b22,stroke:#58a6ff,color:#e6edf3
    style Row1 fill:#161b22,stroke:#3fb950,color:#e6edf3
    style Row2 fill:#161b22,stroke:#d29922,color:#e6edf3
    style Row3 fill:#161b22,stroke:#bc8cff,color:#e6edf3
    style Row4 fill:#161b22,stroke:#f0883e,color:#e6edf3
    style Row5 fill:#161b22,stroke:#79c0ff,color:#e6edf3
    style Row6 fill:#161b22,stroke:#f0883e,color:#e6edf3
    style Row7 fill:#161b22,stroke:#f85149,color:#e6edf3
```

## Data Flow

```mermaid
sequenceDiagram
    participant App as app.js
    participant DP as DataProvider
    participant CM as ChartManager
    participant DOM as DOM Elements

    loop Every 1 second
        App->>DP: tick()
        Note over DP: Advance simulation state<br/>EMA smoothing + gaussian noise<br/>Diurnal sine-wave pattern<br/>Event injection (spikes, deploys)

        App->>DP: getServiceHealth()
        App->>DP: getSLOMetrics()
        App->>DP: getRequestMetrics()
        App->>DP: getDeploymentStatus()
        App->>DP: getInfraMetrics()
        App->>DP: getRegionMetrics()
        App->>DP: getAgenticMetrics()
        App->>DP: getDORAMetrics()
        App->>DP: getAlerts()

        App->>CM: update(allData)
        Note over CM: Push new points to 14 charts<br/>Shift oldest points off<br/>chart.update("none")

        App->>DOM: updateServiceHealth()
        App->>DOM: updateSLOSection()
        App->>DOM: updateDeploymentSection()
        App->>DOM: updateRegionHealth()
        App->>DOM: updateDORA()
        App->>DOM: updateAlerts()
    end
```

## SLO Targets

These match the canonical definitions in [`docs/SLO.md`](../docs/SLO.md):

| SLO | Target | Window | SLI |
|-----|--------|--------|-----|
| API Availability | 99.9% | 30 days | `success_requests / total_requests` |
| API Latency (P95) | < 500ms | 30 days | `histogram_quantile(0.95, ...)` |
| Error Rate | < 0.1% | 30 days | `5xx_requests / total_requests` |
| Error Budget | 43.2 min downtime | 30 days | Derived from availability SLO |

Burn rate alerts fire at:
- **Critical (page):** 1h burn > 14.4x AND 6h burn > 6x
- **Warning (ticket):** 6h burn > 6x AND 3d burn > 3x
- **Info (trend):** 3d burn > 1x sustained 30m

## Deployment Visualization

```mermaid
graph LR
    subgraph BlueGreen["Blue/Green Deployment"]
        direction TB
        LB["Load Balancer"]
        LB -->|"selector: color=blue"| Blue["Blue (Active)<br/>backend v2.3.1<br/>frontend v2.3.0"]
        LB -.->|"standby"| Green["Green (Standby)<br/>backend v2.4.0<br/>frontend v2.4.0"]
    end

    subgraph Canary["Canary Rollout (Argo)"]
        direction TB
        IGW["Ingress"]
        IGW -->|"90%"| Stable["Stable Pods"]
        IGW -->|"10%"| Can["Canary Pods"]

        Can -->|"pass analysis"| Step2["25%"]
        Step2 -->|"pass"| Step3["50%"]
        Step3 -->|"pass"| Promote["100% → Promote"]
    end

    subgraph Analysis["Canary Analysis"]
        SR["Success Rate >= 99%"]
        LT["P95 Latency <= 800ms"]
        SR --> Pass{Pass?}
        LT --> Pass
        Pass -->|yes| NextStep["Advance"]
        Pass -->|no| Rollback["Rollback"]
    end

    Canary --> Analysis

    style Blue fill:#0d419d,stroke:#58a6ff,color:#e6edf3
    style Green fill:#1a4731,stroke:#3fb950,color:#e6edf3
    style Can fill:#3d2800,stroke:#d29922,color:#e6edf3
    style Rollback fill:#5c1a1a,stroke:#f85149,color:#e6edf3
```

## Multi-Region Traffic

```mermaid
pie title Traffic Distribution
    "us-east-1 (Primary)" : 40
    "us-west-2" : 30
    "eu-west-1" : 20
    "ap-southeast-1" : 10
```

Failover config: health check every 30s, unhealthy after 3 failures, recovery after 2 successes. MongoDB replication lag target: < 5s.

## File Structure

```
sre-dashboard/
├── package.json            # Express dependency, dev/start scripts
├── server.js               # Static server + /api/config + /health
└── public/
    ├── index.html           # Dashboard shell (8 section rows)
    ├── css/
    │   └── styles.css       # Dark theme design system (CSS custom properties)
    └── js/
        ├── config.js        # Service topology, SLO targets, thresholds, HPA limits
        ├── data-provider.js 
        ├── charts.js        # ChartManager — 14 Chart.js instances
        └── app.js           # App controller — 1s refresh loop, DOM updates
```

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Charts | Chart.js 4 (CDN) | Already used in `deployment-control/ui` |
| Annotations | chartjs-plugin-annotation (CDN) | Threshold lines on charts |
| Fonts | Inter + JetBrains Mono | Matches project design language |
| Server | Express | Static serving + config API endpoint |
| Build | None | Zero build step — plain HTML/CSS/JS |

## Mock Data Engine

Since this is open-source and may be used by anyone, the dashboard generates realistic mock data by default. The `data-provider.js` simulates metrics with:

```mermaid
graph LR
    Seed["Seeded PRNG<br/>(mulberry32)"] --> Gauss["Gaussian Noise<br/>(Box-Muller)"]
    Gauss --> EMA["EMA Smoothing<br/>(alpha=0.15)"]
    Time["Wall Clock"] --> Diurnal["Diurnal Factor<br/>sin() peaks ~14:00"]
    Diurnal --> EMA
    EMA --> Ring["RingBuffer<br/>(60 points)"]
    Tick["Tick Counter"] --> Events["Event Scheduler"]
    Events -->|"every ~30s"| Spike["Latency Spike"]
    Events -->|"every ~2m"| Bump["Error Rate Bump"]
    Events -->|"every ~60s"| Canary["Canary Step Advance"]
    Events -->|"every ~90s"| BGSwitch["Blue/Green Switch"]

    style Seed fill:#161b22,stroke:#58a6ff,color:#e6edf3
    style Ring fill:#161b22,stroke:#3fb950,color:#e6edf3
    style Events fill:#161b22,stroke:#d29922,color:#e6edf3
```

Values drift smoothly rather than jumping — EMA prevents noisy charts while gaussian noise adds realistic variance.

> [!NOTE]
> In our real production dashboard, the `DataProvider` methods will implement actual API calls to Prometheus, deployment control, Datadog, and backend metrics instead of generating mock data. The current simulation logic is designed to mirror real-world patterns and variability as closely as possible for development and testing purposes. For security reasons, we do not expose real API endpoints or credentials in this open-source repo, but the architecture allows seamless integration with live data sources when configured.

## Wiring Live Data

Every mock data path in `data-provider.js` has a comment showing the real API call:

```javascript
// LIVE MODE: fetch('http://localhost:9090/api/v1/query?query=sli:availability:ratio')
// LIVE MODE: fetch('http://localhost:4100/api/cluster/summary')
// LIVE MODE: fetch('http://localhost:3001/metrics')
```

To connect real sources, set environment variables:

```bash
PROMETHEUS_URL=http://prometheus:9090 \
DEPLOYMENT_CONTROL_URL=http://deployment-control:4100 \
DATADOG_API_URL=https://api.datadoghq.com \
BACKEND_URL=http://backend:3001 \
npm run dev
```

The `/api/config` endpoint passes these to the browser. Implement the `// LIVE MODE` fetch calls in each `DataProvider` method to replace mock values with real Prometheus queries or REST calls.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `4200` | Dashboard server port |
| `PROMETHEUS_URL` | `null` | Prometheus query API base URL |
| `DEPLOYMENT_CONTROL_URL` | `http://localhost:4100` | Deployment control API |
| `DATADOG_API_URL` | `null` | Datadog API base URL |
| `BACKEND_URL` | `http://localhost:3001` | Backend service URL |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend service URL |
| `MCP_URL` | `http://localhost:8787` | MCP server URL |
| `AGENTIC_AI_URL` | `http://localhost:4318` | Agentic AI runtime URL |
| `GRPC_URL` | `http://localhost:50051` | gRPC service URL |
| `REFRESH_INTERVAL` | `1000` | Dashboard refresh interval (ms) |

## DORA Metrics

The dashboard tracks the four DORA metrics with elite-tier thresholds:

| Metric | Elite Target | Measurement |
|--------|-------------|-------------|
| Deployment Frequency | >= 1/day | Deploys per day from deployment-control job history |
| Lead Time for Changes | <= 24 hours | Commit to production deploy duration |
| Mean Time to Recover | <= 60 minutes | Incident open to resolution |
| Change Failure Rate | <= 5% | Failed deploys / total deploys |

## Related Docs

- [SLO Definitions](../docs/SLO.md) — canonical SLO/SLI/error budget reference
- [Architecture](../ARCHITECTURE.md) — system-wide architecture and performance targets
- [Deployment Control](../deployment-control/README.md) — blue/green and canary API
- [Datadog Integration](../docs/datadog-integration.md) — monitoring setup
- [Prometheus Rules](../kubernetes/monitoring/prometheus-config.yaml) — recording rules and alerts
- [Helm Values](../helm/estatewise/values.yaml) — Kubernetes deployment config
