/* ============================================================
   EstateWise SRE Dashboard — Application Controller
   Bootstraps DataProvider + ChartManager, runs the refresh loop,
   and updates all DOM elements every second.
   ============================================================ */

"use strict";

/* global CONFIG, DataProvider, ChartManager */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Safely query a DOM element. Returns null (no throw) when not found.
 * @param {string} selector
 * @param {Element} [root=document]
 */
function $(selector, root = document) {
  return root.querySelector(selector);
}

/**
 * Set text content of an element, only if the value changed (prevents flicker).
 */
function setText(el, text) {
  if (el && el.textContent !== String(text)) {
    el.textContent = String(text);
  }
}

/**
 * Apply a CSS class to an element, removing all others from a set.
 */
function setClass(el, cls, pool) {
  if (!el) return;
  pool.forEach((c) => el.classList.remove(c));
  el.classList.add(cls);
}

/**
 * Format elapsed milliseconds as human-readable "X ago".
 */
function timeAgo(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/**
 * Format milliseconds duration as "Xm Ys".
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s % 60}s`;
}

/**
 * Build an SVG circular gauge stroke-dashoffset for a given percentage (0-100).
 * Circumference = 2 * pi * r = 2 * pi * 50 ≈ 314.16
 */
function gaugeOffset(pct) {
  const C = 314.16;
  return C - (pct / 100) * C;
}

// ---------------------------------------------------------------------------
// DOM references — pre-cache for performance
// ---------------------------------------------------------------------------
const DOM = {
  clock: $("#live-clock"),

  // Header SLO pills
  hdrAvailability: $("#hdr-availability"),
  hdrLatency: $("#hdr-latency"),
  hdrErrors: $("#hdr-errors"),
  sloAvailPill: $("#slo-availability-pill"),
  sloLatencyPill: $("#slo-latency-pill"),
  sloErrorPill: $("#slo-error-pill"),

  // SLO section
  gaugeAvailFill: $("#gauge-availability-fill"),
  gaugeAvailValue: $("#gauge-availability-value"),
  sloAvailBadge: $("#slo-availability-badge"),
  sloAvailBudget: $("#slo-availability-budget"),

  gaugeLatFill: $("#gauge-latency-fill"),
  gaugeLatValue: $("#gauge-latency-value"),
  sloLatBadge: $("#slo-latency-badge"),
  sloLatBudget: $("#slo-latency-budget"),

  errorBudgetPct: $("#error-budget-pct"),
  errorBudgetRemain: $("#error-budget-remaining"),
  errorBudgetFill: $("#error-budget-fill"),
  budgetTotal: $("#budget-total"),
  budgetConsumed: $("#budget-consumed"),
  budgetProjected: $("#budget-projected"),

  burnRateValue: $("#burn-rate-value"),
  burnRateLabel: $("#burn-rate-label"),

  // Request metrics
  rpsTotal: $("#rps-total"),
  errorRateCurrent: $("#error-rate-current"),
  latencyP95Current: $("#latency-p95-current"),

  // Infra
  cpuAvg: $("#cpu-avg"),
  memAvg: $("#mem-avg"),
  podsTotal: $("#pods-total"),
  hpaTotal: $("#hpa-total"),

  // Agentic
  tokenTotal: $("#token-total"),
  taskSuccessRate: $("#task-success-rate"),
  toolCallAvg: $("#tool-call-avg"),
  agenticTokensTotal: $("#agentic-tokens-total"),

  // Deployment
  bgActiveBadge: $("#bg-active-badge"),
  bgBlueTag: $("#bg-blue-tag"),
  bgGreenTag: $("#bg-green-tag"),
  bgColBlue: $("#bg-col-blue"),
  bgColGreen: $("#bg-col-green"),
  bgBlueServices: $("#bg-blue-services"),
  bgGreenServices: $("#bg-green-services"),
  canaryWeightDisplay: $("#canary-weight-display"),
  canaryStepsEl: $("#canary-steps"),
  canaryDonutCenter: $("#canary-donut-center"),
  canaryStableSr: $("#canary-stable-sr"),
  canaryCanarySr: $("#canary-canary-sr"),
  canaryStableP95: $("#canary-stable-p95"),
  canaryCanaryP95: $("#canary-canary-p95"),
  canaryStableErr: $("#canary-stable-err"),
  canaryCanaryErr: $("#canary-canary-err"),
  deploymentsFeed: $("#deployments-feed"),
  deployCount: $("#deploy-count"),

  // Region
  regionHealthGrid: $("#region-health-grid"),

  // DORA
  doraDeployFreqVal: $("#dora-deploy-freq-val"),
  doraLeadTimeVal: $("#dora-lead-time-val"),
  doraMttrVal: $("#dora-mttr-val"),
  doraCfrVal: $("#dora-cfr-val"),
  doraDeployFreqBadge: $("#dora-deploy-freq-badge"),
  doraLeadTimeBadge: $("#dora-lead-time-badge"),
  doraMttrBadge: $("#dora-mttr-badge"),
  doraCfrBadge: $("#dora-cfr-badge"),

  // Alerts
  alertsCount: $("#alerts-count"),
  alertsFeed: $("#alerts-feed"),

  // Services health grid
  servicesHealthyCount: $("#services-healthy-count"),
  serviceHealthGrid: $("#service-health-grid"),
};

// ---------------------------------------------------------------------------
// Application state
// ---------------------------------------------------------------------------
let dataProvider = new DataProvider("mock");
let chartManager = new ChartManager();
let refreshTimer = null;
let _deployFeedCache = [];
let _alertFeedCache = [];

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  // Load server config (endpoints for future live-data wiring)
  fetch("/api/config")
    .then((r) => r.json())
    .then((cfg) => {
      if (cfg.endpoints) Object.assign(CONFIG.endpoints, cfg.endpoints);
    })
    .catch(() => {});

  // Initialize chart manager
  chartManager.init();

  // Pre-render one-time static structures
  renderCanarySteps(CONFIG.canaryStages, 1);
  renderBGServices(CONFIG.blueGreen.services, CONFIG.blueGreen.versions);
  renderRegionHealth([]);

  // Start clock
  updateClock();
  setInterval(updateClock, 1000);

  // Start main refresh loop
  startRefreshLoop();

  // Handle window resize
  window.addEventListener("resize", () => {
    chartManager.resize();
  });
});

// ---------------------------------------------------------------------------
// Refresh loop
// ---------------------------------------------------------------------------
function startRefreshLoop() {
  stopRefreshLoop();
  refreshTimer = setInterval(refresh, CONFIG.refreshInterval);
  // Run once immediately so charts aren't blank on load
  refresh();
}

function stopRefreshLoop() {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}

function refresh() {
  try {
    // Advance simulation (or fetch live data)
    dataProvider.tick();

    // Gather all data in one pass
    const serviceHealth = dataProvider.getServiceHealth();
    const sloMetrics = dataProvider.getSLOMetrics();
    const requestMetrics = dataProvider.getRequestMetrics();
    const deployStatus = dataProvider.getDeploymentStatus();
    const infraMetrics = dataProvider.getInfraMetrics();
    const regionMetrics = dataProvider.getRegionMetrics();
    const agenticMetrics = dataProvider.getAgenticMetrics();
    const doraMetrics = dataProvider.getDORAMetrics();
    const alerts = dataProvider.getAlerts();

    // Update chart manager
    chartManager.update({
      sloMetrics,
      requestMetrics,
      deployStatus,
      infraMetrics,
      regionMetrics,
      agenticMetrics,
    });

    // Update all DOM panels
    updateServiceHealth(serviceHealth);
    updateSLOSection(sloMetrics);
    updateRequestMetricsHeader(requestMetrics);
    updateDeploymentSection(deployStatus);
    updateInfraHeader(infraMetrics);
    updateRegionHealth(regionMetrics);
    updateAgenticHeader(agenticMetrics);
    updateDORA(doraMetrics);
    updateAlerts(alerts);
  } catch (err) {
    console.error("[SRE Dashboard] refresh error:", err);
  }
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------
function updateClock() {
  if (!DOM.clock) return;
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  const s = String(now.getSeconds()).padStart(2, "0");
  DOM.clock.textContent = `${h}:${m}:${s}`;
}

// ---------------------------------------------------------------------------
// Service Health (Row 0)
// ---------------------------------------------------------------------------
function updateServiceHealth(services) {
  const grid = DOM.serviceHealthGrid;
  if (!grid) return;

  let healthy = 0;
  for (const svc of services) {
    if (svc.status === "healthy") healthy++;
    const card = grid.querySelector(`[data-service="${svc.id}"]`);
    if (!card) continue;
    card.classList.remove(
      "skeleton",
      "status-healthy",
      "status-degraded",
      "status-down",
    );
    card.classList.add(`status-${svc.status}`);

    const dot = card.querySelector(".service-status-dot");
    const versionEl = card.querySelector(".service-version");
    const uptimeEl = card.querySelector('[data-field="uptime"]');
    const latEl = card.querySelector('[data-field="latency"]');

    if (dot) dot.title = svc.status;
    if (versionEl) setText(versionEl, svc.version);
    if (uptimeEl) {
      setText(uptimeEl, `${svc.uptime.toFixed(3)}%`);
      uptimeEl.style.color =
        svc.status === "healthy"
          ? "var(--accent-green)"
          : svc.status === "degraded"
            ? "var(--accent-yellow)"
            : "var(--accent-red)";
    }
    if (latEl) setText(latEl, `${svc.latency}ms`);
  }
  setText(DOM.servicesHealthyCount, `${healthy} / ${services.length} healthy`);
}

// ---------------------------------------------------------------------------
// SLO Compliance (Row 1)
// ---------------------------------------------------------------------------
function updateSLOSection(slo) {
  // Availability gauge
  const availPct = slo.availability; // e.g. 99.97
  const availNorm = ((availPct - 99) / 1) * 100; // map [99, 100] → [0, 100]
  updateGauge("availability", availNorm, `${availPct.toFixed(3)}%`);

  const availStatus =
    availPct >= 99.9 ? "ok" : availPct >= 99.5 ? "warn" : "breach";
  setGaugeBadge("slo-availability-badge", availStatus);
  setText(
    DOM.sloAvailBudget,
    `${slo.errorBudget.remainingPct.toFixed(0)}% budget left`,
  );

  // Header pill
  setText(DOM.hdrAvailability, `${availPct.toFixed(3)}%`);
  setClass(DOM.sloAvailPill, `slo-${availStatus}`, [
    "slo-ok",
    "slo-warn",
    "slo-crit",
  ]);

  // Latency gauge
  const latMs = slo.p95Latency;
  const latNorm = Math.max(0, Math.min(100, (1 - latMs / 1000) * 100)); // 0ms = 100%, 1000ms = 0%
  updateGauge("latency", latNorm, `${latMs}`);

  const latStatus = latMs < 400 ? "ok" : latMs < 600 ? "warn" : "breach";
  setGaugeBadge("slo-latency-badge", latStatus);
  setText(DOM.sloLatBudget, `${latMs}ms vs 500ms target`);

  setText(DOM.hdrLatency, `${latMs}ms`);
  setClass(DOM.sloLatencyPill, `slo-${latStatus}`, [
    "slo-ok",
    "slo-warn",
    "slo-crit",
  ]);

  // Error budget bar
  const budgetPct = slo.errorBudget.remainingPct;
  setText(DOM.errorBudgetPct, `${budgetPct.toFixed(0)}%`);
  setText(
    DOM.errorBudgetRemain,
    `${slo.errorBudget.totalMin - slo.errorBudget.consumedMin < 0 ? 0 : (slo.errorBudget.totalMin - slo.errorBudget.consumedMin).toFixed(1)} min left`,
  );
  if (DOM.errorBudgetFill) {
    DOM.errorBudgetFill.style.width = `${budgetPct}%`;
    // Color the fill: green when healthy, slide toward red
    const pos = ((100 - budgetPct) / 100) * 200; // background-position
    DOM.errorBudgetFill.style.backgroundPosition = `${pos}% center`;
  }
  setText(DOM.budgetTotal, `${slo.errorBudget.totalMin.toFixed(1)} min`);
  setText(DOM.budgetConsumed, `${slo.errorBudget.consumedMin.toFixed(1)} min`);
  setText(
    DOM.budgetProjected,
    `${slo.errorBudget.projectedMin.toFixed(1)} min`,
  );

  // Burn rate
  const br = slo.burnRate;
  setText(DOM.burnRateValue, `${br.toFixed(2)}x`);
  if (br >= CONFIG.thresholds.burnRateFast) {
    setText(DOM.burnRateLabel, "FAST BURN");
    if (DOM.burnRateValue) DOM.burnRateValue.style.color = "var(--accent-red)";
  } else if (br >= 3) {
    setText(DOM.burnRateLabel, "elevated");
    if (DOM.burnRateValue)
      DOM.burnRateValue.style.color = "var(--accent-yellow)";
  } else {
    setText(DOM.burnRateLabel, "nominal");
    if (DOM.burnRateValue)
      DOM.burnRateValue.style.color = "var(--accent-green)";
  }

  const errPct = (100 - availPct).toFixed(4);
  setText(DOM.hdrErrors, `${errPct}%`);
  const errStatus =
    parseFloat(errPct) < 0.1
      ? "ok"
      : parseFloat(errPct) < 0.5
        ? "warn"
        : "crit";
  setClass(DOM.sloErrorPill, `slo-${errStatus}`, [
    "slo-ok",
    "slo-warn",
    "slo-crit",
  ]);
}

function updateGauge(id, pct, label) {
  const fill = $(`#gauge-${id}-fill`);
  const value = $(`#gauge-${id}-value`);
  if (fill) fill.style.strokeDashoffset = gaugeOffset(clamp(pct, 0, 100));
  if (value) setText(value, label);
  if (fill) {
    fill.classList.remove("gauge-warn", "gauge-crit");
    if (pct < 40) fill.classList.add("gauge-crit");
    else if (pct < 70) fill.classList.add("gauge-warn");
  }
}

function setGaugeBadge(id, status) {
  const el = $(`#${id}`);
  if (!el) return;
  el.className = "slo-status-badge";
  if (status === "ok") {
    el.classList.add("badge-ok");
    setText(el, "MEETING SLO");
  } else if (status === "warn") {
    el.classList.add("badge-warn");
    setText(el, "AT RISK");
  } else {
    el.classList.add("badge-breach");
    setText(el, "BREACHED");
  }
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

// ---------------------------------------------------------------------------
// Request Metrics header (Row 2)
// ---------------------------------------------------------------------------
function updateRequestMetricsHeader(req) {
  setText(DOM.rpsTotal, `${req.rps.toFixed(1)} rps`);
  setText(DOM.errorRateCurrent, `${req.errorRate.toFixed(4)}%`);
  setText(DOM.latencyP95Current, `${req.latency.p95}ms P95`);
}

// ---------------------------------------------------------------------------
// Deployment section (Row 3)
// ---------------------------------------------------------------------------
function updateDeploymentSection(deploy) {
  // Blue/Green
  const active = deploy.blueGreen.active;
  setText(
    DOM.bgActiveBadge,
    `${active.charAt(0).toUpperCase() + active.slice(1)} Active`,
  );

  // Highlight active column
  [DOM.bgColBlue, DOM.bgColGreen].forEach((el) => {
    if (el) el.classList.remove("active");
  });
  const activeCol = active === "blue" ? DOM.bgColBlue : DOM.bgColGreen;
  if (activeCol) activeCol.classList.add("active");

  // Active tags
  if (DOM.bgBlueTag) {
    DOM.bgBlueTag.textContent = active === "blue" ? "ACTIVE" : "";
    DOM.bgBlueTag.className =
      active === "blue" ? "bg-active-tag active-blue" : "bg-active-tag";
  }
  if (DOM.bgGreenTag) {
    DOM.bgGreenTag.textContent = active === "green" ? "ACTIVE" : "";
    DOM.bgGreenTag.className =
      active === "green" ? "bg-active-tag active-green" : "bg-active-tag";
  }

  // Service version rows
  renderBGServiceRows(DOM.bgBlueServices, deploy.blueGreen.services, "blue");
  renderBGServiceRows(DOM.bgGreenServices, deploy.blueGreen.services, "green");

  // Canary
  const w = deploy.canary.weight;
  setText(DOM.canaryWeightDisplay, `${w}%`);
  setText(DOM.canaryDonutCenter, `${w}%`);
  renderCanarySteps(deploy.canary.stages, deploy.canary.step);

  const { stable, canary } = deploy.canary.metrics;
  setText(DOM.canaryStableSr, `${stable.successRate}%`);
  setText(DOM.canaryCanarySr, `${canary.successRate}%`);
  setText(DOM.canaryStableP95, `${stable.p95Latency}ms`);
  setText(DOM.canaryCanaryP95, `${canary.p95Latency}ms`);
  setText(DOM.canaryStableErr, `${stable.errorRate.toFixed(3)}%`);
  setText(DOM.canaryCanaryErr, `${canary.errorRate.toFixed(3)}%`);

  // Color canary metrics: worse than stable → red
  colorCompare(
    DOM.canaryCanarySr,
    canary.successRate,
    stable.successRate,
    true,
  );
  colorCompare(
    DOM.canaryCanaryP95,
    canary.p95Latency,
    stable.p95Latency,
    false,
  );
  colorCompare(DOM.canaryCanaryErr, canary.errorRate, stable.errorRate, false);

  // Deployments feed
  updateDeploymentsFeed(deploy.recentDeployments);
}

function colorCompare(el, canaryVal, stableVal, higherBetter) {
  if (!el) return;
  const better = higherBetter ? canaryVal >= stableVal : canaryVal <= stableVal;
  el.style.color = better ? "var(--accent-green)" : "var(--accent-red)";
}

function renderBGServices(serviceIds, versions) {
  renderBGServiceRows(
    DOM.bgBlueServices,
    serviceIds.map((id) => ({
      id,
      name: CONFIG.services.find((s) => s.id === id)?.name || id,
      blueVersion: versions.blue[id] || "v--",
      greenVersion: versions.green[id] || "v--",
    })),
    "blue",
  );
  renderBGServiceRows(
    DOM.bgGreenServices,
    serviceIds.map((id) => ({
      id,
      name: CONFIG.services.find((s) => s.id === id)?.name || id,
      blueVersion: versions.blue[id] || "v--",
      greenVersion: versions.green[id] || "v--",
    })),
    "green",
  );
}

function renderBGServiceRows(container, services, color) {
  if (!container) return;
  container.innerHTML = services
    .map(
      (svc) => `
    <div class="bg-service-row">
      <span class="bg-service-name">${svc.name}</span>
      <span class="bg-service-tag">${color === "blue" ? svc.blueVersion : svc.greenVersion}</span>
    </div>
  `,
    )
    .join("");
}

function renderCanarySteps(stages, currentStep) {
  const el = DOM.canaryStepsEl;
  if (!el) return;
  el.innerHTML = stages
    .map((s, i) => {
      const isDone = i < currentStep;
      const isActive = i === currentStep;
      const dotClass = isDone
        ? "canary-step-dot complete"
        : isActive
          ? "canary-step-dot active"
          : "canary-step-dot";
      const lineClass = isDone
        ? "canary-step-line complete"
        : "canary-step-line";
      const line =
        i < stages.length - 1 ? `<div class="${lineClass}"></div>` : "";
      return `<div class="canary-step"><div class="${dotClass}">${s}%</div>${line}</div>`;
    })
    .join("");
}

function updateDeploymentsFeed(deployments) {
  const feed = DOM.deploymentsFeed;
  if (!feed) return;

  // Only re-render if data changed
  const key = deployments.map((d) => d.id).join(",");
  if (key === _deployFeedCache.join(",")) return;
  _deployFeedCache = deployments.map((d) => d.id);

  setText(DOM.deployCount, `${deployments.length} in 24h`);

  feed.innerHTML =
    deployments
      .slice(0, 15)
      .map((d) => {
        const typeClass = `badge-${d.type.replace("-", "")}`;
        const statusClass = `badge-${d.status.replace("-", "")}`;
        const ago = timeAgo(Date.now() - d.timestamp);
        return `
      <div class="feed-item">
        <span class="feed-item-badge ${typeClass}">${d.type}</span>
        <div class="feed-item-body">
          <div class="feed-item-title">${d.service} — ${d.version}</div>
          <div class="feed-item-meta"><span class="feed-item-badge ${statusClass}" style="font-size:9px">${d.status}</span> &nbsp;${d.duration}s</div>
        </div>
        <span class="feed-item-time">${ago}</span>
      </div>
    `;
      })
      .join("") || `<div class="feed-empty">No recent deployments</div>`;
}

// ---------------------------------------------------------------------------
// Infrastructure header (Row 4)
// ---------------------------------------------------------------------------
function updateInfraHeader(infra) {
  setText(DOM.cpuAvg, `${infra.avgCpu.toFixed(0)}% avg`);
  setText(DOM.memAvg, `${infra.avgMem.toFixed(0)}% avg`);
  setText(DOM.podsTotal, `${infra.totalPods} pods`);
  const totalReplicas = CONFIG.services.reduce(
    (s, svc) => s + (infra.services[svc.id]?.hpa.current || 0),
    0,
  );
  setText(DOM.hpaTotal, `${totalReplicas} replicas`);
}

// ---------------------------------------------------------------------------
// Region health (Row 5)
// ---------------------------------------------------------------------------
function renderRegionHealth(regions) {
  const grid = DOM.regionHealthGrid;
  if (!grid) return;
  if (!regions || regions.length === 0) {
    grid.innerHTML = CONFIG.regions
      .map(
        (r) => `
      <div class="region-card">
        <span class="region-status-dot healthy"></span>
        <span class="region-name">${r.shortName}</span>
        <div class="region-metrics">
          <div class="region-metric"><span class="metric-label">RPS</span><span class="metric-value mono">--</span></div>
          <div class="region-metric"><span class="metric-label">Err</span><span class="metric-value mono">--%</span></div>
          <div class="region-metric"><span class="metric-label">P50</span><span class="metric-value mono">--ms</span></div>
        </div>
      </div>
    `,
      )
      .join("");
    return;
  }
  updateRegionHealth(regions);
}

function updateRegionHealth(regions) {
  const grid = DOM.regionHealthGrid;
  if (!grid || !regions || regions.length === 0) return;

  regions.forEach((region, i) => {
    let card = grid.querySelector(`[data-region="${region.id}"]`);
    if (!card) {
      card = document.createElement("div");
      card.className = "region-card";
      card.dataset.region = region.id;
      card.innerHTML = `
        <span class="region-status-dot ${region.status}"></span>
        <span class="region-name">${region.name}</span>
        <div class="region-metrics">
          <div class="region-metric"><span class="metric-label">RPS</span><span class="metric-value mono" data-field="rps">--</span></div>
          <div class="region-metric"><span class="metric-label">Err</span><span class="metric-value mono" data-field="err">--%</span></div>
          <div class="region-metric"><span class="metric-label">P50</span><span class="metric-value mono" data-field="p50">--ms</span></div>
        </div>
      `;
      grid.appendChild(card);
    }
    const dot = card.querySelector(".region-status-dot");
    if (dot) dot.className = `region-status-dot ${region.status}`;
    const rpsEl = card.querySelector('[data-field="rps"]');
    const errEl = card.querySelector('[data-field="err"]');
    const p50El = card.querySelector('[data-field="p50"]');
    if (rpsEl) setText(rpsEl, `${region.rps.toFixed(0)}`);
    if (errEl) setText(errEl, `${region.errorRate.toFixed(3)}%`);
    if (p50El) setText(p50El, `${region.p50Latency}ms`);
  });
}

// ---------------------------------------------------------------------------
// Agentic AI header (Row 6)
// ---------------------------------------------------------------------------
function updateAgenticHeader(agentic) {
  const total = agentic.tokenConsumption.total;
  setText(DOM.tokenTotal, `${(total / 1000).toFixed(0)}k/min`);
  setText(
    DOM.taskSuccessRate,
    `${agentic.taskResults.successRate.toFixed(1)}% success`,
  );
  setText(DOM.agenticTokensTotal, `${(total / 1000).toFixed(0)}k tokens/min`);

  // Tool avg latency
  const toolVals = Object.values(agentic.toolLatency).map((t) => t.current);
  const avg = toolVals.reduce((s, v) => s + v, 0) / toolVals.length;
  setText(DOM.toolCallAvg, `${avg.toFixed(0)}ms avg`);
}

// ---------------------------------------------------------------------------
// DORA Metrics (Row 7)
// ---------------------------------------------------------------------------
function updateDORA(dora) {
  const e = CONFIG.doraElite;

  setText(DOM.doraDeployFreqVal, dora.deployFrequency.toFixed(1));
  setText(DOM.doraLeadTimeVal, dora.leadTime.toFixed(1));
  setText(DOM.doraMttrVal, dora.mttr.toFixed(0));
  setText(DOM.doraCfrVal, `${dora.changeFailureRate.toFixed(1)}%`);

  setDoraBadge(
    DOM.doraDeployFreqBadge,
    dora.deployFrequency >= e.deployFrequency,
    "Elite",
    "Needs Work",
  );
  setDoraBadge(
    DOM.doraLeadTimeBadge,
    dora.leadTime <= e.leadTime,
    "Elite",
    "Needs Work",
  );
  setDoraBadge(DOM.doraMttrBadge, dora.mttr <= e.mttr, "Elite", "Needs Work");
  setDoraBadge(
    DOM.doraCfrBadge,
    dora.changeFailureRate <= e.changeFailureRate,
    "Elite",
    "Needs Work",
  );
}

function setDoraBadge(el, isGood, goodLabel, badLabel) {
  if (!el) return;
  el.className = "dora-badge";
  if (isGood) {
    el.classList.add("badge-ok");
    setText(el, goodLabel);
  } else {
    el.classList.add("badge-warn");
    setText(el, badLabel);
  }
}

// ---------------------------------------------------------------------------
// Alerts feed (Row 7)
// ---------------------------------------------------------------------------
function updateAlerts(alerts) {
  const count = alerts.length;
  if (DOM.alertsCount) {
    setText(DOM.alertsCount, String(count));
    DOM.alertsCount.className = `alerts-count-badge${count === 0 ? " count-zero" : ""}`;
  }

  const feed = DOM.alertsFeed;
  if (!feed) return;

  // Only re-render if data changed
  const key = alerts
    .map((a) => `${a.id}-${a.durationMs}`)
    .join("|")
    .slice(0, 200);
  if (key === _alertFeedCache) return;
  _alertFeedCache = key;

  if (alerts.length === 0) {
    feed.innerHTML = `<div class="feed-empty">No active alerts — all clear</div>`;
    return;
  }

  feed.innerHTML = alerts
    .slice(0, 20)
    .map(
      (a) => `
    <div class="feed-item alert-${a.severity}">
      <span class="feed-item-badge badge-${a.severity}">${a.severity}</span>
      <div class="feed-item-body">
        <div class="feed-item-title">${a.name}</div>
        <div class="feed-item-meta">${a.service} &middot; ${formatDuration(a.durationMs)}</div>
      </div>
      <span class="feed-item-time">${timeAgo(a.durationMs)}</span>
    </div>
  `,
    )
    .join("");
}
