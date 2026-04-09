# EstateWise Service Level Objectives

This document is the **canonical single source of truth** for all SLIs, SLOs, and error budget policies for the EstateWise platform. All other files that reference SLO targets (`ARCHITECTURE.md`, `kubernetes/monitoring/prometheus-config.yaml`, `kubernetes/monitoring/slo-config.yaml`, `terraform/datadog.tf`) should be treated as enforcement artifacts — the authoritative numbers live here.

---

## Terminology

| Term | Definition |
|------|-----------|
| **SLI** (Service Level Indicator) | A quantitative measure of a service behavior, e.g. the ratio of successful HTTP requests. |
| **SLO** (Service Level Objective) | A target value or range for an SLI over a defined window, e.g. availability >= 99.9% over 30 days. |
| **SLA** (Service Level Agreement) | A contractual commitment to an SLO, with defined consequences for breach. EstateWise SLAs are derived from the SLOs in this document. |
| **Error Budget** | The inverse of the SLO — the allowable amount of unreliability. At 99.9% availability over 30 days, the error budget is 43.2 minutes of total downtime. |

---

## SLO Table

| Name | Service | SLI (what is measured) | Objective | Window | Alert Threshold |
|------|---------|------------------------|-----------|--------|----------------|
| API Availability | `estatewise-backend` | `sum(rate(http_requests_total{status!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` — success request ratio | 99.9% | 30 days | < 99.5% triggers critical alert |
| API Latency P95 | `estatewise-backend` | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` | < 500 ms | 30 days | > 500 ms for 5 min triggers critical |
| API Latency P99 | `estatewise-backend` | `histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))` | < 1000 ms | 30 days | > 1000 ms for 5 min triggers warning |
| Frontend Availability | `estatewise-frontend` | Success request ratio on frontend job | 99.9% | 30 days | < 99.5% triggers critical alert |
| Database Availability | `mongodb` | `up{job="mongodb-exporter"}` — scrape liveness | 99.95% | 30 days | Any scrape failure triggers critical |
| Chat Response Time | `estatewise-backend` | End-to-end latency from chat request to streamed first token | < 3 s target | 30 days | > 3 s = warning; > 10 s = critical |
| Map Load Time | `estatewise-frontend` | Time from map page load to tiles rendered | < 2 s target | 30 days | > 2 s = warning; > 5 s = critical |
| Graph Query Time | `context-engineering` / Neo4j | Duration of graph traversal queries | < 1.5 s target | 30 days | > 1.5 s = warning; > 3 s = critical |
| Vector Search Time | `estatewise-backend` / Pinecone | Duration of vector similarity search calls | < 500 ms target | 30 days | > 500 ms = warning; > 1500 ms = critical |

---

## Error Budget

### 30-Day Window

For a 99.9% availability SLO over a 30-day calendar month:

| Parameter | Value |
|-----------|-------|
| Total minutes in window | 43,200 |
| Allowed downtime (0.1%) | **43.2 minutes** |
| Allowed error budget ratio | 0.001 |

When `sli:error_budget:remaining_ratio` drops below 1.0, the budget is being consumed. When it reaches 0, the SLO has been breached for the month.

### Burn Rate Alerting Thresholds

Burn rate measures how fast the error budget is being consumed relative to the sustainable rate (burn rate = 1 means budget is consumed at exactly the SLO-compliant pace).

| Burn Rate | Meaning | Action |
|-----------|---------|--------|
| > 14.4x (1h window) AND > 6x (6h window) | Budget exhausts in < 50 hours | Page on-call immediately |
| > 6x (6h window) AND > 3x (3d window) | Elevated sustained consumption | File ticket, investigate within business hours |
| > 1x (3d window) | Consuming faster than sustainable | Info alert, trend monitoring |
| Remaining ratio < 25% | Less than a quarter of budget left | Warning; freeze non-critical releases |
| Remaining ratio <= 0% | Budget fully exhausted | Critical; freeze all non-critical deployments |

The 14.4x fast-burn threshold is derived from the Google SRE workbook: consuming 2% of monthly budget per hour means 2% / (1/720 hours) = 14.4x burn rate.

---

## Burn Rate Alerting Windows

Three windows are used together to detect incidents at different time scales while minimizing false positives:

### 1h Fast-Burn (Critical — Pages On-Call)

- **Rule**: `sli:burn_rate:1h > 14.4 AND sli:burn_rate:6h > 6`
- **For**: 2 minutes
- **Severity**: `critical`
- **Rationale**: The 1h window catches sudden spikes. The 6h corroboration prevents spurious pages from brief transient errors. Together they indicate a real, sustained incident.

### 6h Slow-Burn (Warning — Ticket)

- **Rule**: `sli:burn_rate:6h > 6 AND sli:burn_rate:3d > 3`
- **For**: 5 minutes
- **Severity**: `warning`
- **Rationale**: A 6h burn rate above 6x with a 3-day burn rate above 3x indicates a degradation that started more than 6 hours ago and is not self-healing. Not an immediate emergency, but requires investigation.

### 3d Trend (Info — Dashboard / Monitoring)

- **Rule**: `sli:burn_rate:3d > 1`
- **For**: 30 minutes
- **Severity**: `info`
- **Rationale**: Any 3-day average burn rate above 1x means the team is on track to exhaust the error budget before the 30-day window closes. Used to prompt proactive reliability work before it becomes an incident.

---

## Escalation Matrix

| Severity | Triggered By | Primary | Secondary | Escalation Timeout |
|----------|-------------|---------|-----------|-------------------|
| `critical` | SLOBurnRateCritical, SLOErrorBudgetExhausted, SLOLatencyBurnRateCritical, Database down | On-call engineer (PagerDuty) | Engineering lead | 15 minutes |
| `warning` | SLOBurnRateWarning, SLOErrorBudgetLow, API Latency P95 breach | On-call engineer (Slack #alerts-warning) | — | Next business day |
| `info` | SLOBurnRateTrend | Slack #slo-trends channel (no page) | — | Weekly review |

Notification channels are configured in:
- Prometheus Alertmanager: `kubernetes/monitoring/prometheus-config.yaml` (alertmanager config section)
- Datadog: `terraform/datadog.tf` (`var.datadog_notification_channels`)

---

## SLO Review Cadence

| Review | Frequency | Format | Owner |
|--------|-----------|--------|-------|
| Weekly SLO Report | Every Monday at 9:00 AM | Automated Slack message via `slo-report-generator` CronJob | On-call rotation |
| Monthly SLO Review | First Tuesday of each month | Team meeting — review error budget consumption, adjust SLOs if needed | Engineering lead |
| Quarterly SLA Alignment | Quarterly | Cross-functional review of SLOs vs contractual SLAs | Engineering + Product |

The `slo-report-generator` CronJob (`kubernetes/monitoring/slo-config.yaml`) fires on schedule `0 9 * * 1` and posts availability, P95 latency, error rate, and error budget remaining to the Slack webhook.

---

## Enforcement Locations

Each SLO is enforced at two or more layers:

| SLO | Prometheus Recording Rules | Prometheus Alerts | Datadog Monitor | Terraform Resource |
|-----|---------------------------|-------------------|-----------------|--------------------|
| API Availability | `sli:availability:ratio` | `SLOAvailabilityBreach`, `SLOBurnRateCritical`, `SLOBurnRateWarning` | `datadog_monitor.alb_5xx_rate`, `datadog_monitor.apm_error_rate` | `terraform/datadog.tf` |
| API Latency P95 | `sli:latency:p95` | `SLOLatencyBreach`, `SLOLatencyBurnRateCritical` | `datadog_monitor.alb_latency_p95` | `terraform/datadog.tf` |
| API Latency P99 | `sli:latency:p99` | — | `datadog_monitor.apm_latency_p99` | `terraform/datadog.tf` |
| Frontend Availability | `sli:availability:ratio` (frontend job) | `SLOAvailabilityBreach` | — | — |
| Database Availability | `up{job="mongodb-exporter"}` | `SLOAvailabilityBreach` | — | — |
| Error Budget | `sli:error_budget:remaining_ratio` | `SLOErrorBudgetLow`, `SLOErrorBudgetExhausted` | Grafana bargauge panel | `kubernetes/monitoring/slo-config.yaml` |
| Burn Rates | `sli:burn_rate:1h`, `sli:burn_rate:6h`, `sli:burn_rate:3d` | `SLOBurnRateCritical`, `SLOBurnRateWarning`, `SLOBurnRateTrend` | — | — |

Recording rules and alert rules live in the `sli_slo_rules` group inside `kubernetes/monitoring/prometheus-config.yaml`.

SLO definitions for Grafana visualization live in `kubernetes/monitoring/slo-config.yaml`.

Datadog monitors and dashboard are provisioned via Terraform in `terraform/datadog.tf`.

---

## Notes

- This document is the **single source of truth**. If a number in `ARCHITECTURE.md`, `prometheus-config.yaml`, `slo-config.yaml`, or `datadog.tf` conflicts with this document, this document takes precedence. Update the enforcement artifact to match.
- The performance targets in `ARCHITECTURE.md` (Section "Performance Targets & SLOs") are aspirational latency goals for individual endpoints. The SLOs in this document are the contractual service-level commitments and alerting triggers.
- SLO targets should not be changed without a team review. Lowering an SLO without justification hides reliability debt.
