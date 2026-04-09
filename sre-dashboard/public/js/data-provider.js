/* ============================================================
   EstateWise SRE Dashboard — Data Provider
   Generates realistic mock data with smooth interpolation.
   All mock paths have live-mode stubs showing real API calls.
   ============================================================ */

"use strict";

/* global CONFIG */

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

/**
 * Exponential moving average smoother.
 * @param {number} prev - previous EMA value
 * @param {number} next - new raw sample
 * @param {number} alpha - smoothing factor 0-1 (higher = more responsive)
 */
function ema(prev, next, alpha = 0.15) {
  return prev * (1 - alpha) + next * alpha;
}

/**
 * Clamp a value between min and max.
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Simple seeded pseudo-random (mulberry32).
 * @param {number} seed
 * @returns {() => number} function returning [0, 1)
 */
function seededRng(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Gaussian noise via Box-Muller. */
function gaussianNoise(rng, mu = 0, sigma = 1) {
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return mu + sigma * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Sine-wave diurnal factor (peaks ~14:00 UTC). */
function diurnalFactor(t) {
  const hour = (t / 3600000) % 24;
  return 1 + 0.25 * Math.sin(((hour - 14) / 24) * 2 * Math.PI);
}

// ---------------------------------------------------------------------------
// History ring buffer
// ---------------------------------------------------------------------------
class RingBuffer {
  constructor(capacity) {
    this._cap = capacity;
    this._buf = new Array(capacity).fill(null);
    this._head = 0;
    this._size = 0;
  }

  push(v) {
    this._buf[this._head] = v;
    this._head = (this._head + 1) % this._cap;
    if (this._size < this._cap) this._size++;
  }

  toArray() {
    if (this._size === 0) return [];
    const arr = [];
    const start = this._size < this._cap ? 0 : this._head;
    for (let i = 0; i < this._size; i++) {
      arr.push(this._buf[(start + i) % this._cap]);
    }
    return arr;
  }

  last() {
    if (this._size === 0) return null;
    const idx = (this._head - 1 + this._cap) % this._cap;
    return this._buf[idx];
  }
}

// ---------------------------------------------------------------------------
// DataProvider
// ---------------------------------------------------------------------------
class DataProvider {
  /**
   * @param {'mock'|'live'} mode
   */
  constructor(mode = "mock") {
    this._mode = mode;
    this._rng = seededRng(0xdeadbeef);
    this._tick = 0;
    this._startTime = Date.now();

    // Smooth state variables (EMA-tracked)
    this._state = this._initState();

    // History buffers per service × metric
    this._histLen = CONFIG.historyLength;
    this._history = this._initHistory();

    // Events queue (latency spikes, error bumps etc.)
    this._pendingEvents = [];
    this._scheduleEvents();

    // Deployment history
    this._recentDeployments = this._generateDeploymentHistory();

    // Alerts
    this._alerts = this._generateInitialAlerts();

    // Canary state
    this._canaryStep = 1; // index into CONFIG.canaryStages
    this._canaryWeight = CONFIG.canaryStages[1]; // 25%
    this._canaryAdvanceAt = 180; // ticks until next advance

    // Blue/Green
    this._activeColor = "green";
    this._bgSwitchAt = 600; // ticks until next switch event

    // DORA — generated once, drift slowly
    this._dora = {
      deployFrequency: 4.2,
      leadTime: 1.8,
      mttr: 12,
      changeFailureRate: 2.1,
    };
  }

  // ------------------------------------------------------------------
  // Initialization helpers
  // ------------------------------------------------------------------

  _initState() {
    const s = {};
    for (const svc of CONFIG.services) {
      s[svc.id] = {
        rps: svc.baseRps * (0.9 + this._rng() * 0.2),
        cpu: svc.baseCpu * (0.9 + this._rng() * 0.2),
        mem: svc.baseMem * (0.9 + this._rng() * 0.2),
        latencyP50: 55 + this._rng() * 20,
        latencyP95: 240 + this._rng() * 60,
        latencyP99: 550 + this._rng() * 100,
        errorRate: 0.0003 + this._rng() * 0.0003,
        uptime: 0.9995 + this._rng() * 0.0004,
        pods: {
          desired: CONFIG.hpa[svc.id] ? CONFIG.hpa[svc.id].min + 1 : 2,
          ready: CONFIG.hpa[svc.id] ? CONFIG.hpa[svc.id].min + 1 : 2,
          available: CONFIG.hpa[svc.id] ? CONFIG.hpa[svc.id].min + 1 : 2,
        },
        status: "healthy",
        version: "v2.3." + Math.floor(this._rng() * 5),
      };
    }
    return s;
  }

  _initHistory() {
    const hist = {};
    const L = this._histLen;
    for (const svc of CONFIG.services) {
      const sv = this._state[svc.id];
      hist[svc.id] = {
        rps: this._fillBuffer(L, sv.rps, 2, false),
        cpu: this._fillBuffer(L, sv.cpu, 3, false),
        mem: this._fillBuffer(L, sv.mem, 1.5, false),
        latencyP50: this._fillBuffer(L, sv.latencyP50, 5, false),
        latencyP95: this._fillBuffer(L, sv.latencyP95, 20, false),
        latencyP99: this._fillBuffer(L, sv.latencyP99, 40, false),
        errorRate: this._fillBuffer(L, sv.errorRate, 0.0001, false),
        replicas: this._fillBuffer(L, sv.pods.ready, 0, true),
      };
    }

    // Global aggregated histories
    hist._global = {
      rps: this._fillBuffer(L, this._sumRps(), 5, false),
      errorRate: this._fillBuffer(L, this._avgErrorRate(), 0.00005, false),
      latencyP50: this._fillBuffer(L, 60, 5, false),
      latencyP95: this._fillBuffer(L, 260, 20, false),
      latencyP99: this._fillBuffer(L, 600, 40, false),
      burnRate: this._fillBuffer(L, 0.3 + this._rng() * 0.4, 0.05, false),
      promptTokens: this._fillBuffer(L, 65000, 5000, false),
      completionTokens: this._fillBuffer(L, 22000, 2000, false),
      taskSuccess: this._fillBuffer(L, 18, 3, true),
      taskFail: this._fillBuffer(L, 1, 1, true),
    };

    // Tool latency per category
    hist._tools = {};
    for (const cat of CONFIG.toolCategories) {
      hist._tools[cat.id] = this._fillBuffer(
        L,
        80 + this._rng() * 200,
        30,
        false,
      );
    }

    return hist;
  }

  _fillBuffer(len, base, sigma, integer) {
    const buf = new RingBuffer(len);
    let v = base;
    for (let i = 0; i < len; i++) {
      v = ema(v, base + gaussianNoise(this._rng, 0, sigma), 0.2);
      v = Math.max(0, v);
      buf.push(integer ? Math.round(v) : parseFloat(v.toFixed(4)));
    }
    return buf;
  }

  _sumRps() {
    return CONFIG.services.reduce((s, svc) => s + this._state[svc.id].rps, 0);
  }

  _avgErrorRate() {
    return (
      CONFIG.services.reduce((s, svc) => s + this._state[svc.id].errorRate, 0) /
      CONFIG.services.length
    );
  }

  // ------------------------------------------------------------------
  // Event scheduling (realistic anomaly injection)
  // ------------------------------------------------------------------

  _scheduleEvents() {
    // Latency spike every ~30 ticks
    this._nextSpikeAt = 30 + Math.floor(this._rng() * 20);
    // Error bump every ~120 ticks
    this._nextErrorBumpAt = 120 + Math.floor(this._rng() * 60);
  }

  _processEvents() {
    const t = this._tick;

    // Latency spike
    if (t >= this._nextSpikeAt) {
      const svc =
        CONFIG.services[Math.floor(this._rng() * CONFIG.services.length)];
      this._state[svc.id].latencyP95 += 80 + this._rng() * 120;
      this._state[svc.id].latencyP99 += 200 + this._rng() * 300;
      this._nextSpikeAt = t + 25 + Math.floor(this._rng() * 30);
    }

    // Error bump
    if (t >= this._nextErrorBumpAt) {
      for (const svc of CONFIG.services) {
        this._state[svc.id].errorRate = Math.min(
          0.005,
          this._state[svc.id].errorRate * (1.5 + this._rng() * 2),
        );
      }
      // Add an alert sometimes
      if (this._rng() > 0.5) {
        this._injectAlert();
      }
      this._nextErrorBumpAt = t + 100 + Math.floor(this._rng() * 80);
    }

    // Canary advance
    if (t > 0 && t % this._canaryAdvanceAt === 0) {
      const nextIdx =
        (CONFIG.canaryStages.indexOf(this._canaryWeight) + 1) %
        CONFIG.canaryStages.length;
      this._canaryWeight = CONFIG.canaryStages[nextIdx];
      this._canaryStep = nextIdx;
    }

    // Blue/green switch
    if (t > 0 && t % this._bgSwitchAt === 0) {
      this._activeColor = this._activeColor === "blue" ? "green" : "blue";
      this._recentDeployments.unshift(
        this._makeDeployment("blue-green", "backend", "success"),
      );
      if (this._recentDeployments.length > 20) this._recentDeployments.pop();
    }
  }

  _injectAlert() {
    const services = CONFIG.services.map((s) => s.name);
    const names = [
      "HighErrorRate",
      "P95LatencyBreach",
      "PodRestartLoop",
      "MemoryPressure",
      "CPUSaturation",
      "TokenBudgetExceeded",
      "CircuitBreakerOpen",
      "SlowRollout",
    ];
    const severities = ["critical", "warning", "info"];
    const alert = {
      id: Date.now() + "-" + Math.floor(this._rng() * 10000),
      name: names[Math.floor(this._rng() * names.length)],
      service: services[Math.floor(this._rng() * services.length)],
      severity:
        severities[
          Math.floor(this._rng() * Math.min(2 + 1, severities.length))
        ],
      firedAt: Date.now(),
      duration: 0,
    };
    this._alerts.unshift(alert);
    if (this._alerts.length > 20) this._alerts.pop();
  }

  _generateDeploymentHistory() {
    const types = ["blue-green", "canary", "rolling"];
    const statuses = ["success", "success", "success", "failed", "in-progress"];
    const services = CONFIG.services.map((s) => s.id);
    const deploys = [];
    let offset = 60000;
    for (let i = 0; i < 12; i++) {
      offset += 180000 + Math.floor(this._rng() * 600000);
      deploys.push(
        this._makeDeployment(
          types[Math.floor(this._rng() * types.length)],
          services[Math.floor(this._rng() * services.length)],
          statuses[Math.floor(this._rng() * statuses.length)],
          offset,
        ),
      );
    }
    return deploys;
  }

  _makeDeployment(type, serviceId, status, msAgo = 0) {
    const svc =
      CONFIG.services.find((s) => s.id === serviceId) || CONFIG.services[0];
    return {
      id: Date.now() - msAgo + "-" + Math.floor(this._rng() * 99999),
      service: svc.name,
      serviceId: svc.id,
      type,
      status,
      version:
        "v2." +
        (3 + Math.floor(this._rng() * 2)) +
        "." +
        Math.floor(this._rng() * 10),
      timestamp: Date.now() - msAgo,
      duration: Math.floor(120 + this._rng() * 300),
    };
  }

  _generateInitialAlerts() {
    return [
      {
        id: "init-1",
        name: "HighTokenConsumption",
        service: "Agentic AI",
        severity: "warning",
        firedAt: Date.now() - 420000,
        duration: 420000,
      },
      {
        id: "init-2",
        name: "SlowP95Latency",
        service: "Backend",
        severity: "info",
        firedAt: Date.now() - 120000,
        duration: 120000,
      },
    ];
  }

  // ------------------------------------------------------------------
  // tick() — advance simulation by 1 step
  // ------------------------------------------------------------------
  tick() {
    this._tick++;
    const t = Date.now();
    const df = diurnalFactor(t);

    this._processEvents();

    for (const svc of CONFIG.services) {
      const s = this._state[svc.id];
      const h = this._history[svc.id];
      const hpa = CONFIG.hpa[svc.id] || { min: 1, max: 2 };

      // --- RPS (with diurnal variation + small noise) ---
      const targetRps = svc.baseRps * df * (0.85 + this._rng() * 0.3);
      s.rps = clamp(ema(s.rps, targetRps, 0.08), 0, svc.baseRps * 3);
      h.rps.push(parseFloat(s.rps.toFixed(1)));

      // --- CPU (correlated with RPS) ---
      const targetCpu =
        svc.baseCpu +
        (s.rps / svc.baseRps - 1) * 8 +
        gaussianNoise(this._rng, 0, 2);
      s.cpu = clamp(ema(s.cpu, targetCpu, 0.06), 0, 95);
      h.cpu.push(parseFloat(s.cpu.toFixed(1)));

      // --- Memory (slow drift) ---
      const targetMem = svc.baseMem + gaussianNoise(this._rng, 0, 1.5);
      s.mem = clamp(ema(s.mem, targetMem, 0.03), 0, 95);
      h.mem.push(parseFloat(s.mem.toFixed(1)));

      // --- Latency ---
      const baseP50 = 55 + (s.cpu / 100) * 30;
      s.latencyP50 = clamp(
        ema(s.latencyP50, baseP50 + gaussianNoise(this._rng, 0, 5), 0.1),
        20,
        400,
      );
      s.latencyP95 = clamp(
        ema(
          s.latencyP95,
          s.latencyP50 * 4.5 + gaussianNoise(this._rng, 0, 15),
          0.1,
        ),
        80,
        1200,
      );
      s.latencyP99 = clamp(
        ema(
          s.latencyP99,
          s.latencyP95 * 2.2 + gaussianNoise(this._rng, 0, 30),
          0.1,
        ),
        150,
        2500,
      );
      h.latencyP50.push(parseFloat(s.latencyP50.toFixed(0)));
      h.latencyP95.push(parseFloat(s.latencyP95.toFixed(0)));
      h.latencyP99.push(parseFloat(s.latencyP99.toFixed(0)));

      // --- Error rate (slow recovery after spikes) ---
      const baseErr = 0.00025 + gaussianNoise(this._rng, 0, 0.00005);
      s.errorRate = clamp(
        ema(s.errorRate, Math.max(0, baseErr), 0.07),
        0,
        0.01,
      );
      h.errorRate.push(parseFloat((s.errorRate * 100).toFixed(4)));

      // --- Pods / HPA ---
      const targetReplicas = clamp(
        Math.round(hpa.min + (s.cpu / 70) * (hpa.max - hpa.min)),
        hpa.min,
        hpa.max,
      );
      s.pods.desired = targetReplicas;
      s.pods.ready = targetReplicas - (this._rng() < 0.02 ? 1 : 0);
      s.pods.available = s.pods.ready;
      h.replicas.push(s.pods.ready);

      // --- Status inference ---
      if (
        s.errorRate > CONFIG.thresholds.errorRateCrit ||
        s.cpu > CONFIG.thresholds.cpuCrit
      ) {
        s.status = "down";
      } else if (
        s.errorRate > CONFIG.thresholds.errorRateWarn ||
        s.cpu > CONFIG.thresholds.cpuWarn
      ) {
        s.status = "degraded";
      } else {
        s.status = "healthy";
      }
    }

    // --- Global aggregates ---
    const gh = this._history._global;
    const totalRps = parseFloat(this._sumRps().toFixed(1));
    const avgErrPct = parseFloat((this._avgErrorRate() * 100).toFixed(4));

    // Aggregate latency (weighted by RPS)
    let sumP50 = 0,
      sumP95 = 0,
      sumP99 = 0,
      totalW = 0;
    for (const svc of CONFIG.services) {
      const w = this._state[svc.id].rps;
      sumP50 += this._state[svc.id].latencyP50 * w;
      sumP95 += this._state[svc.id].latencyP95 * w;
      sumP99 += this._state[svc.id].latencyP99 * w;
      totalW += w;
    }
    const aggP50 = totalW > 0 ? parseFloat((sumP50 / totalW).toFixed(0)) : 60;
    const aggP95 = totalW > 0 ? parseFloat((sumP95 / totalW).toFixed(0)) : 260;
    const aggP99 = totalW > 0 ? parseFloat((sumP99 / totalW).toFixed(0)) : 600;

    gh.rps.push(totalRps);
    gh.errorRate.push(avgErrPct);
    gh.latencyP50.push(aggP50);
    gh.latencyP95.push(aggP95);
    gh.latencyP99.push(aggP99);

    // Burn rate (slow drift, occasional jumps)
    const lastBr = gh.burnRate.last() || 0.3;
    const targetBr =
      0.2 + (this._avgErrorRate() / CONFIG.slos.errorRate.target) * 0.8;
    gh.burnRate.push(
      parseFloat(
        ema(lastBr, targetBr + gaussianNoise(this._rng, 0, 0.02), 0.05).toFixed(
          3,
        ),
      ),
    );

    // Token consumption
    const targetPrompt = 65000 * df * (0.9 + this._rng() * 0.2);
    const targetCompletion = 22000 * df * (0.9 + this._rng() * 0.2);
    gh.promptTokens.push(
      Math.round(ema(gh.promptTokens.last() || 65000, targetPrompt, 0.1)),
    );
    gh.completionTokens.push(
      Math.round(
        ema(gh.completionTokens.last() || 22000, targetCompletion, 0.1),
      ),
    );

    // Agent task results
    const successRate = 0.94 - (this._avgErrorRate() / 0.001) * 0.1;
    const tasks = Math.round(15 + this._rng() * 10);
    gh.taskSuccess.push(Math.round(tasks * successRate));
    gh.taskFail.push(tasks - Math.round(tasks * successRate));

    // Tool latency per category
    for (const cat of CONFIG.toolCategories) {
      const base =
        {
          property: 95,
          market: 130,
          finance: 110,
          graph: 200,
          commute: 160,
          system: 45,
        }[cat.id] || 100;
      const prev = this._history._tools[cat.id].last() || base;
      this._history._tools[cat.id].push(
        parseFloat(
          ema(
            prev,
            base + gaussianNoise(this._rng, 0, base * 0.15),
            0.12,
          ).toFixed(0),
        ),
      );
    }

    // Update alert durations
    for (const a of this._alerts) {
      a.duration = Date.now() - a.firedAt;
    }

    // Occasionally resolve oldest alert
    if (this._tick % 90 === 0 && this._alerts.length > 1) {
      this._alerts.pop();
    }
  }

  // ------------------------------------------------------------------
  // Public data accessors
  // ------------------------------------------------------------------

  /** @returns {Array} service health objects */
  getServiceHealth() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.backend}/health`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.frontend}/api/health`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/cluster/summary`)
    return CONFIG.services.map((svc) => {
      const s = this._state[svc.id];
      return {
        id: svc.id,
        name: svc.name,
        status: s.status,
        uptime: parseFloat((s.uptime * 100).toFixed(4)),
        latency: Math.round(s.latencyP50),
        version: s.version,
        color: svc.color,
      };
    });
  }

  /** @returns {{availability, p95Latency, errorBudget, burnRate}} */
  getSLOMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=sli:availability:ratio_rate5m`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))`)
    const gh = this._history._global;
    const latestErrPct = gh.errorRate.last() || 0;
    const latestBurnRate = gh.burnRate.last() || 0;
    const latestP95 = gh.latencyP95.last() || 260;
    const availability = 1 - latestErrPct / 100;

    const budgetTotalMin = CONFIG.slos.apiAvailability.budgetSeconds / 60;
    const consumedMin =
      budgetTotalMin *
      (1 - (availability - 0.999) / 0.001 + latestBurnRate * 0.1);
    const remainingPct = clamp(
      ((budgetTotalMin - consumedMin) / budgetTotalMin) * 100,
      0,
      100,
    );

    return {
      availability: parseFloat((availability * 100).toFixed(4)), // 99.xxxx %
      p95Latency: parseFloat(latestP95.toFixed(0)), // ms
      errorBudget: {
        remainingPct: parseFloat(remainingPct.toFixed(1)),
        totalMin: parseFloat(budgetTotalMin.toFixed(1)),
        consumedMin: parseFloat(Math.max(0, consumedMin).toFixed(1)),
        projectedMin: parseFloat(
          Math.min(budgetTotalMin, consumedMin * 1.1).toFixed(1),
        ),
      },
      burnRate: parseFloat(latestBurnRate.toFixed(3)),
      burnRateHistory: gh.burnRate.toArray(),
    };
  }

  /** @returns {{rps, rpsHistory, errorRate, errorRateHistory, latency, latencyHistory}} */
  getRequestMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=sum(rate(http_requests_total[1m]))by(service)`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query_range?query=rate(http_requests_errors_total[1m])&start=...&step=1`)
    const gh = this._history._global;
    const perService = CONFIG.services.map((svc) => ({
      id: svc.id,
      label: svc.name,
      color: svc.color,
      rps: this._history[svc.id].rps.last() || 0,
      history: this._history[svc.id].rps.toArray(),
    }));

    return {
      rps: gh.rps.last() || 0,
      rpsHistory: gh.rps.toArray(),
      rpsPerService: perService,
      errorRate: gh.errorRate.last() || 0,
      errorRateHistory: gh.errorRate.toArray(),
      latency: {
        p50: gh.latencyP50.last() || 60,
        p95: gh.latencyP95.last() || 260,
        p99: gh.latencyP99.last() || 600,
        p50History: gh.latencyP50.toArray(),
        p95History: gh.latencyP95.toArray(),
        p99History: gh.latencyP99.toArray(),
      },
    };
  }

  /** @returns {{blueGreen, canary, recentDeployments}} */
  getDeploymentStatus() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/deployments/blue-green`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/deployments/canary`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/deployments/recent?limit=20`)
    const stableSuccessRate = 99.5 + this._rng() * 0.4;
    const canarySuccessRate = 99.2 + this._rng() * 0.6;
    const stableP95 = 240 + Math.round(this._rng() * 40);
    const canaryP95 = 260 + Math.round(this._rng() * 60);
    const stableErrRate = 0.02 + this._rng() * 0.01;
    const canaryErrRate = 0.03 + this._rng() * 0.03;

    return {
      blueGreen: {
        active: this._activeColor,
        services: CONFIG.blueGreen.services.map((id) => {
          const svc = CONFIG.services.find((s) => s.id === id);
          return {
            id,
            name: svc ? svc.name : id,
            blueVersion: CONFIG.blueGreen.versions.blue[id] || "v2.3.0",
            greenVersion: CONFIG.blueGreen.versions.green[id] || "v2.4.0",
          };
        }),
      },
      canary: {
        weight: this._canaryWeight,
        step: this._canaryStep,
        stages: CONFIG.canaryStages,
        metrics: {
          stable: {
            successRate: parseFloat(stableSuccessRate.toFixed(2)),
            p95Latency: stableP95,
            errorRate: parseFloat(stableErrRate.toFixed(3)),
          },
          canary: {
            successRate: parseFloat(canarySuccessRate.toFixed(2)),
            p95Latency: canaryP95,
            errorRate: parseFloat(canaryErrRate.toFixed(3)),
          },
        },
      },
      recentDeployments: this._recentDeployments.slice(0, 15),
    };
  }

  /** @returns {{cpu, memory, pods, hpa}} per service + histories */
  getInfraMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=avg(rate(container_cpu_usage_seconds_total[1m]))by(container)`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=container_memory_working_set_bytes`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/cluster/pods`)
    const services = {};
    for (const svc of CONFIG.services) {
      const s = this._state[svc.id];
      const h = this._history[svc.id];
      services[svc.id] = {
        name: svc.name,
        color: svc.color,
        cpu: parseFloat(s.cpu.toFixed(1)),
        mem: parseFloat(s.mem.toFixed(1)),
        cpuHistory: h.cpu.toArray(),
        memHistory: h.mem.toArray(),
        pods: { ...s.pods },
        hpa: {
          current: s.pods.ready,
          min: (CONFIG.hpa[svc.id] || {}).min || 1,
          max: (CONFIG.hpa[svc.id] || {}).max || 4,
          history: h.replicas.toArray(),
        },
      };
    }
    const cpuValues = CONFIG.services.map((svc) => this._state[svc.id].cpu);
    const memValues = CONFIG.services.map((svc) => this._state[svc.id].mem);
    return {
      services,
      avgCpu: parseFloat(
        (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length).toFixed(1),
      ),
      avgMem: parseFloat(
        (memValues.reduce((a, b) => a + b, 0) / memValues.length).toFixed(1),
      ),
      totalPods: CONFIG.services.reduce(
        (s, svc) => s + this._state[svc.id].pods.ready,
        0,
      ),
    };
  }

  /** @returns {Array} per-region health objects */
  getRegionMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=sum(rate(http_requests_total[5m]))by(region)`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=histogram_quantile(0.95,rate(http_request_duration_seconds_bucket[5m]))by(region)`)
    return CONFIG.regions.map((region) => {
      const noise = gaussianNoise(this._rng, 0, 1);
      const baseP50 =
        {
          "us-east-1": 42,
          "us-west-2": 58,
          "eu-west-1": 95,
          "ap-southeast-1": 130,
        }[region.id] || 70;
      const baseP95 = baseP50 * 4;
      const errRate = clamp(0.00025 + noise * 0.00005, 0, 0.005);
      const rps = this._sumRps() * region.weight;
      return {
        id: region.id,
        name: region.shortName,
        fullName: region.name,
        color: region.color,
        weight: region.weight,
        primary: region.primary,
        status: errRate > 0.002 ? "degraded" : "healthy",
        rps: parseFloat(rps.toFixed(1)),
        errorRate: parseFloat((errRate * 100).toFixed(4)),
        p50Latency: Math.round(baseP50 + noise * 5),
        p95Latency: Math.round(baseP95 + noise * 20),
      };
    });
  }

  /** @returns {{tokenConsumption, taskResults, toolLatency}} */
  getAgenticMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.agenticAi}/metrics/tokens`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.agenticAi}/metrics/tasks`)
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/query?query=histogram_quantile(0.95,rate(mcp_tool_duration_seconds_bucket[5m]))by(tool_category)`)
    const gh = this._history._global;
    const promptArr = gh.promptTokens.toArray();
    const completionArr = gh.completionTokens.toArray();
    const successArr = gh.taskSuccess.toArray();
    const failArr = gh.taskFail.toArray();
    const latestPrompt = gh.promptTokens.last() || 0;
    const latestComp = gh.completionTokens.last() || 0;
    const latestSuccess = gh.taskSuccess.last() || 0;
    const latestFail = gh.taskFail.last() || 0;
    const successRate =
      latestSuccess + latestFail > 0
        ? (latestSuccess / (latestSuccess + latestFail)) * 100
        : 95;

    const toolLatency = {};
    for (const cat of CONFIG.toolCategories) {
      toolLatency[cat.id] = {
        label: cat.name,
        color: cat.color,
        current: this._history._tools[cat.id].last() || 0,
        history: this._history._tools[cat.id].toArray(),
      };
    }

    return {
      tokenConsumption: {
        prompt: latestPrompt,
        completion: latestComp,
        total: latestPrompt + latestComp,
        promptHistory: promptArr,
        completionHistory: completionArr,
      },
      taskResults: {
        successRate: parseFloat(successRate.toFixed(1)),
        latestSuccess: latestSuccess,
        latestFail: latestFail,
        successHistory: successArr,
        failHistory: failArr,
      },
      toolLatency,
    };
  }

  /** @returns {{deployFrequency, leadTime, mttr, changeFailureRate}} */
  getDORAMetrics() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.deploymentControl}/api/dora/metrics`)
    // Slow drift
    this._dora.deployFrequency = clamp(
      ema(this._dora.deployFrequency, 3.8 + this._rng() * 1.0, 0.002),
      1,
      10,
    );
    this._dora.leadTime = clamp(
      ema(this._dora.leadTime, 1.5 + this._rng() * 1.5, 0.002),
      0.5,
      48,
    );
    this._dora.mttr = clamp(
      ema(this._dora.mttr, 10 + this._rng() * 10, 0.002),
      1,
      120,
    );
    this._dora.changeFailureRate = clamp(
      ema(this._dora.changeFailureRate, 1.5 + this._rng() * 3.5, 0.002),
      0,
      15,
    );
    return {
      deployFrequency: parseFloat(this._dora.deployFrequency.toFixed(1)),
      leadTime: parseFloat(this._dora.leadTime.toFixed(1)),
      mttr: parseFloat(this._dora.mttr.toFixed(1)),
      changeFailureRate: parseFloat(this._dora.changeFailureRate.toFixed(1)),
    };
  }

  /** @returns {Array} active alert objects */
  getAlerts() {
    // LIVE MODE: fetch(`${CONFIG.endpoints.prometheus}/api/v1/alerts`)
    // LIVE MODE: fetch('https://api.datadoghq.com/api/v1/monitor?tags=env:production')
    return this._alerts.map((a) => ({
      ...a,
      durationMs: Date.now() - a.firedAt,
    }));
  }

  /** Switch data mode */
  setMode(mode) {
    this._mode = mode;
    if (mode === "live") {
      // Fetch server config to get real endpoints
      fetch("/api/config")
        .then((r) => r.json())
        .then((cfg) => {
          if (cfg.endpoints) {
            Object.assign(CONFIG.endpoints, cfg.endpoints);
          }
        })
        .catch(() => {});
    }
  }

  get mode() {
    return this._mode;
  }
  get tickCount() {
    return this._tick;
  }
}
