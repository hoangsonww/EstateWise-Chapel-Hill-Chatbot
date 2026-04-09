/* ============================================================
   EstateWise SRE Dashboard — Chart Manager
   Manages all Chart.js instances, creation, and updates.
   ============================================================ */

"use strict";

/* global Chart, CONFIG */

// ---------------------------------------------------------------------------
// Design tokens (must match CSS)
// ---------------------------------------------------------------------------
const CHART_THEME = {
  gridColor: "rgba(33, 38, 45, 0.8)",
  gridColorAlt: "rgba(48, 54, 61, 0.4)",
  tickColor: "#8b949e",
  textColor: "#e6edf3",
  transparent: "transparent",
  tooltipBg: "#1c2128",
  tooltipBorder: "#30363d",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
};

const SERVICE_COLORS = {
  backend: "#58a6ff",
  frontend: "#3fb950",
  mcp: "#bc8cff",
  "agentic-ai": "#f0883e",
  grpc: "#d29922",
  "deployment-control": "#79c0ff",
};

// ---------------------------------------------------------------------------
// Shared Chart.js defaults
// ---------------------------------------------------------------------------
function applyGlobalDefaults() {
  Chart.defaults.color = CHART_THEME.tickColor;
  Chart.defaults.font.family = CHART_THEME.fontFamily;
  Chart.defaults.font.size = CHART_THEME.fontSize;
  Chart.defaults.animation = false; // disable for live updates
  Chart.defaults.responsive = true;
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = CHART_THEME.tooltipBg;
  Chart.defaults.plugins.tooltip.borderColor = CHART_THEME.tooltipBorder;
  Chart.defaults.plugins.tooltip.borderWidth = 1;
  Chart.defaults.plugins.tooltip.titleColor = CHART_THEME.textColor;
  Chart.defaults.plugins.tooltip.bodyColor = CHART_THEME.tickColor;
  Chart.defaults.plugins.tooltip.padding = 8;
  Chart.defaults.plugins.tooltip.cornerRadius = 4;
}

// ---------------------------------------------------------------------------
// Gradient helpers
// ---------------------------------------------------------------------------
function makeGradient(ctx, color, alphaTop = 0.3, alphaBot = 0.01) {
  const grad = ctx.createLinearGradient(
    0,
    0,
    0,
    ctx.canvas.clientHeight || 160,
  );
  grad.addColorStop(
    0,
    color
      .replace(")", `, ${alphaTop})`)
      .replace("rgb(", "rgba(")
      .replace("#", "rgba("),
  );
  grad.addColorStop(
    1,
    color
      .replace(")", `, ${alphaBot})`)
      .replace("rgb(", "rgba(")
      .replace("#", "rgba("),
  );
  return grad;
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ---------------------------------------------------------------------------
// Shared scale configs
// ---------------------------------------------------------------------------
function timeXScale(len = 60) {
  return {
    type: "linear",
    display: true,
    min: 0,
    max: len - 1,
    ticks: {
      maxTicksLimit: 5,
      callback: (v) => `-${len - 1 - Math.round(v)}s`,
      color: CHART_THEME.tickColor,
      font: { family: CHART_THEME.fontFamily, size: 9 },
    },
    grid: { color: CHART_THEME.gridColor, drawBorder: false },
  };
}

function yScale(label = "", min = undefined, sugMax = undefined) {
  return {
    display: true,
    position: "left",
    title: {
      display: !!label,
      text: label,
      color: CHART_THEME.tickColor,
      font: { size: 9 },
    },
    min,
    suggestedMax: sugMax,
    ticks: {
      maxTicksLimit: 5,
      color: CHART_THEME.tickColor,
      font: { family: CHART_THEME.fontFamily, size: 9 },
    },
    grid: { color: CHART_THEME.gridColor, drawBorder: false },
  };
}

function darkTooltip() {
  return {
    backgroundColor: CHART_THEME.tooltipBg,
    borderColor: CHART_THEME.tooltipBorder,
    borderWidth: 1,
    titleColor: CHART_THEME.textColor,
    bodyColor: CHART_THEME.tickColor,
    padding: 8,
    cornerRadius: 4,
  };
}

// ---------------------------------------------------------------------------
// Build x-axis index array [0, 1, 2, ... len-1]
// ---------------------------------------------------------------------------
function xLabels(len) {
  return Array.from({ length: len }, (_, i) => i);
}

// ---------------------------------------------------------------------------
// ChartManager
// ---------------------------------------------------------------------------
class ChartManager {
  constructor() {
    this._charts = {};
    this._len = CONFIG.historyLength;
  }

  // ------------------------------------------------------------------
  // init() — create all Chart.js instances
  // ------------------------------------------------------------------
  init() {
    applyGlobalDefaults();
    // Register annotation plugin (UMD build exposes itself under a hyphenated key)
    const annotationPlugin =
      window["chartjs-plugin-annotation"] || window.ChartAnnotation;
    if (annotationPlugin) {
      Chart.register(annotationPlugin);
    }

    this._initBurnRate();
    this._initRPS();
    this._initErrorRate();
    this._initLatency();
    this._initCanaryDonut();
    this._initCPU();
    this._initMemory();
    this._initPods();
    this._initHPA();
    this._initRegionTraffic();
    this._initRegionLatency();
    this._initTokens();
    this._initAgentTasks();
    this._initToolLatency();
  }

  // ------------------------------------------------------------------
  // Burn rate sparkline
  // ------------------------------------------------------------------
  _initBurnRate() {
    const canvas = document.getElementById("chart-burn-rate");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);
    const blank = new Array(this._len).fill(0);

    this._charts.burnRate = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            data: blank,
            borderColor: "#d29922",
            backgroundColor: hexToRgba("#d29922", 0.15),
            fill: true,
            tension: 0.4,
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: darkTooltip(),
          annotation: {
            annotations: {
              threshold14: {
                type: "line",
                yMin: 14.4,
                yMax: 14.4,
                borderColor: "#f85149",
                borderWidth: 1,
                borderDash: [4, 3],
                label: {
                  content: "14.4x",
                  display: true,
                  position: "end",
                  color: "#f85149",
                  font: { size: 8 },
                },
              },
              threshold1: {
                type: "line",
                yMin: 1,
                yMax: 1,
                borderColor: "#8b949e",
                borderWidth: 1,
                borderDash: [4, 3],
                label: {
                  content: "1x",
                  display: true,
                  position: "end",
                  color: "#8b949e",
                  font: { size: 8 },
                },
              },
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            ...yScale("", 0, 2),
            suggestedMax: 2,
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Requests per second — stacked area by service
  // ------------------------------------------------------------------
  _initRPS() {
    const canvas = document.getElementById("chart-rps");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    const datasets = CONFIG.services.map((svc) => ({
      label: svc.name,
      data: new Array(this._len).fill(0),
      borderColor: svc.color,
      backgroundColor: hexToRgba(svc.color, 0.15),
      fill: true,
      tension: 0.3,
      borderWidth: 1.5,
      pointRadius: 0,
      stack: "rps",
    }));

    this._charts.rps = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
        },
        scales: {
          x: timeXScale(this._len),
          y: yScale("req/s", 0),
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Error rate
  // ------------------------------------------------------------------
  _initErrorRate() {
    const canvas = document.getElementById("chart-error-rate");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    this._charts.errorRate = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Error Rate %",
            data: new Array(this._len).fill(0),
            borderColor: "#f85149",
            backgroundColor: hexToRgba("#f85149", 0.12),
            fill: true,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: darkTooltip(),
          annotation: {
            annotations: {
              errThreshold: {
                type: "line",
                yMin: 0.1,
                yMax: 0.1,
                borderColor: "#f85149",
                borderWidth: 1,
                borderDash: [5, 4],
                label: {
                  content: "0.1% SLO",
                  display: true,
                  position: "end",
                  color: "#f85149",
                  font: { size: 8 },
                },
              },
            },
          },
        },
        scales: {
          x: timeXScale(this._len),
          y: { ...yScale("error %", 0, 0.5), suggestedMax: 0.5 },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Latency percentiles
  // ------------------------------------------------------------------
  _initLatency() {
    const canvas = document.getElementById("chart-latency");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);
    const blank = new Array(this._len).fill(0);

    this._charts.latency = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "P50",
            data: [...blank],
            borderColor: "#58a6ff",
            backgroundColor: "transparent",
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: "P95",
            data: [...blank],
            borderColor: "#d29922",
            backgroundColor: "transparent",
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
          },
          {
            label: "P99",
            data: [...blank],
            borderColor: "#f85149",
            backgroundColor: "transparent",
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
          annotation: {
            annotations: {
              latencyThreshold: {
                type: "line",
                yMin: 500,
                yMax: 500,
                borderColor: "#f85149",
                borderWidth: 1,
                borderDash: [5, 4],
                label: {
                  content: "500ms SLO",
                  display: true,
                  position: "end",
                  color: "#f85149",
                  font: { size: 8 },
                },
              },
            },
          },
        },
        scales: {
          x: timeXScale(this._len),
          y: yScale("ms", 0),
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Canary traffic donut
  // ------------------------------------------------------------------
  _initCanaryDonut() {
    const canvas = document.getElementById("chart-canary-donut");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    this._charts.canaryDonut = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: ["Stable", "Canary"],
        datasets: [
          {
            data: [75, 25],
            backgroundColor: [
              hexToRgba("#3fb950", 0.7),
              hexToRgba("#58a6ff", 0.7),
            ],
            borderColor: ["#3fb950", "#58a6ff"],
            borderWidth: 1,
            hoverOffset: 2,
          },
        ],
      },
      options: {
        animation: { duration: 400 },
        cutout: "72%",
        plugins: {
          legend: { display: false },
          tooltip: {
            ...darkTooltip(),
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` },
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // CPU stacked area
  // ------------------------------------------------------------------
  _initCPU() {
    const canvas = document.getElementById("chart-cpu");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    const datasets = CONFIG.services.map((svc) => ({
      label: svc.name,
      data: new Array(this._len).fill(0),
      borderColor: svc.color,
      backgroundColor: hexToRgba(svc.color, 0.18),
      fill: true,
      tension: 0.3,
      borderWidth: 1.5,
      pointRadius: 0,
      stack: "cpu",
    }));

    this._charts.cpu = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 6, font: { size: 9 } },
          },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
          annotation: {
            annotations: {
              cpuWarn: {
                type: "line",
                yMin: CONFIG.thresholds.cpuWarn,
                yMax: CONFIG.thresholds.cpuWarn,
                borderColor: "#d29922",
                borderWidth: 1,
                borderDash: [4, 3],
              },
            },
          },
        },
        scales: {
          x: timeXScale(this._len),
          y: { ...yScale("CPU %", 0, 100), max: 100 },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Memory stacked area
  // ------------------------------------------------------------------
  _initMemory() {
    const canvas = document.getElementById("chart-memory");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    const datasets = CONFIG.services.map((svc) => ({
      label: svc.name,
      data: new Array(this._len).fill(0),
      borderColor: svc.color,
      backgroundColor: hexToRgba(svc.color, 0.18),
      fill: true,
      tension: 0.3,
      borderWidth: 1.5,
      pointRadius: 0,
      stack: "mem",
    }));

    this._charts.memory = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        animation: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
          annotation: {
            annotations: {
              memWarn: {
                type: "line",
                yMin: CONFIG.thresholds.memoryWarn,
                yMax: CONFIG.thresholds.memoryWarn,
                borderColor: "#d29922",
                borderWidth: 1,
                borderDash: [4, 3],
              },
            },
          },
        },
        scales: {
          x: timeXScale(this._len),
          y: { ...yScale("Mem %", 0, 100), max: 100 },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Pod status grouped bar
  // ------------------------------------------------------------------
  _initPods() {
    const canvas = document.getElementById("chart-pods");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = CONFIG.services.map((s) => s.name.replace(" ", "\n"));

    this._charts.pods = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Desired",
            data: new Array(6).fill(0),
            backgroundColor: hexToRgba("#8b949e", 0.5),
            borderColor: "#8b949e",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: "Ready",
            data: new Array(6).fill(0),
            backgroundColor: hexToRgba("#3fb950", 0.6),
            borderColor: "#3fb950",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: "Available",
            data: new Array(6).fill(0),
            backgroundColor: hexToRgba("#58a6ff", 0.6),
            borderColor: "#58a6ff",
            borderWidth: 1,
            borderRadius: 3,
          },
        ],
      },
      options: {
        animation: { duration: 300 },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: darkTooltip(),
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: CHART_THEME.tickColor,
              font: { family: CHART_THEME.fontFamily, size: 8 },
            },
            grid: { color: CHART_THEME.gridColor, drawBorder: false },
          },
          y: { ...yScale("Pods", 0), ticks: { stepSize: 1 } },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // HPA replicas over time
  // ------------------------------------------------------------------
  _initHPA() {
    const canvas = document.getElementById("chart-hpa");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    const datasets = CONFIG.services.map((svc) => ({
      label: svc.name,
      data: new Array(this._len).fill(0),
      borderColor: svc.color,
      backgroundColor: "transparent",
      tension: 0.2,
      borderWidth: 1.5,
      pointRadius: 0,
      stepped: false,
    }));

    this._charts.hpa = new Chart(ctx, {
      type: "line",
      data: { labels, datasets },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 6, font: { size: 9 } },
          },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
        },
        scales: {
          x: timeXScale(this._len),
          y: { ...yScale("Replicas", 0), ticks: { stepSize: 1 } },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Region traffic donut
  // ------------------------------------------------------------------
  _initRegionTraffic() {
    const canvas = document.getElementById("chart-region-traffic");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    this._charts.regionTraffic = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: CONFIG.regions.map((r) => r.shortName),
        datasets: [
          {
            data: CONFIG.regions.map((r) => Math.round(r.weight * 100)),
            backgroundColor: CONFIG.regions.map((r) =>
              hexToRgba(r.color, 0.75),
            ),
            borderColor: CONFIG.regions.map((r) => r.color),
            borderWidth: 1,
            hoverOffset: 4,
          },
        ],
      },
      options: {
        animation: { duration: 600 },
        cutout: "65%",
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: {
            ...darkTooltip(),
            callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw}%` },
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Regional latency grouped bar
  // ------------------------------------------------------------------
  _initRegionLatency() {
    const canvas = document.getElementById("chart-region-latency");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = CONFIG.regions.map((r) => r.shortName);

    this._charts.regionLatency = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "P50",
            data: new Array(4).fill(0),
            backgroundColor: hexToRgba("#58a6ff", 0.6),
            borderColor: "#58a6ff",
            borderWidth: 1,
            borderRadius: 3,
          },
          {
            label: "P95",
            data: new Array(4).fill(0),
            backgroundColor: hexToRgba("#d29922", 0.6),
            borderColor: "#d29922",
            borderWidth: 1,
            borderRadius: 3,
          },
        ],
      },
      options: {
        animation: { duration: 600 },
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: {
            ...darkTooltip(),
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${ctx.raw}ms`,
            },
          },
        },
        scales: {
          x: {
            display: true,
            ticks: {
              color: CHART_THEME.tickColor,
              font: { family: CHART_THEME.fontFamily, size: 9 },
            },
            grid: { color: CHART_THEME.gridColor, drawBorder: false },
          },
          y: yScale("ms", 0),
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // Token consumption stacked area
  // ------------------------------------------------------------------
  _initTokens() {
    const canvas = document.getElementById("chart-tokens");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    this._charts.tokens = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Prompt",
            data: new Array(this._len).fill(0),
            borderColor: "#bc8cff",
            backgroundColor: hexToRgba("#bc8cff", 0.2),
            fill: true,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
            stack: "tokens",
          },
          {
            label: "Completion",
            data: new Array(this._len).fill(0),
            borderColor: "#f0883e",
            backgroundColor: hexToRgba("#f0883e", 0.2),
            fill: true,
            tension: 0.3,
            borderWidth: 1.5,
            pointRadius: 0,
            stack: "tokens",
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: {
            ...darkTooltip(),
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx) =>
                ` ${ctx.dataset.label}: ${(ctx.raw / 1000).toFixed(1)}k`,
            },
          },
        },
        scales: {
          x: timeXScale(this._len),
          y: {
            ...yScale("tokens", 0),
            ticks: {
              callback: (v) => `${(v / 1000).toFixed(0)}k`,
              maxTicksLimit: 5,
            },
          },
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Agent task results — stacked bar over time
  // ------------------------------------------------------------------
  _initAgentTasks() {
    const canvas = document.getElementById("chart-agent-tasks");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const labels = xLabels(this._len);

    this._charts.agentTasks = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Success",
            data: new Array(this._len).fill(0),
            backgroundColor: hexToRgba("#3fb950", 0.6),
            borderColor: "#3fb950",
            borderWidth: 0,
            stack: "tasks",
            borderRadius: 2,
          },
          {
            label: "Failed",
            data: new Array(this._len).fill(0),
            backgroundColor: hexToRgba("#f85149", 0.6),
            borderColor: "#f85149",
            borderWidth: 0,
            stack: "tasks",
            borderRadius: 0,
          },
        ],
      },
      options: {
        animation: false,
        plugins: {
          legend: {
            display: true,
            position: "bottom",
            labels: { boxWidth: 8, padding: 8, font: { size: 9 } },
          },
          tooltip: { ...darkTooltip(), mode: "index", intersect: false },
        },
        scales: {
          x: { display: false },
          y: yScale("tasks", 0),
        },
        interaction: { mode: "index", intersect: false },
      },
    });
  }

  // ------------------------------------------------------------------
  // Tool call latency — horizontal bar chart by category
  // ------------------------------------------------------------------
  _initToolLatency() {
    const canvas = document.getElementById("chart-tool-latency");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    this._charts.toolLatency = new Chart(ctx, {
      type: "bar",
      data: {
        labels: CONFIG.toolCategories.map((c) => c.name),
        datasets: [
          {
            data: new Array(CONFIG.toolCategories.length).fill(0),
            backgroundColor: CONFIG.toolCategories.map((c) =>
              hexToRgba(c.color, 0.65),
            ),
            borderColor: CONFIG.toolCategories.map((c) => c.color),
            borderWidth: 1,
            borderRadius: 4,
            barThickness: 18,
          },
        ],
      },
      options: {
        animation: { duration: 400 },
        indexAxis: "y",
        plugins: {
          legend: { display: false },
          tooltip: {
            ...darkTooltip(),
            callbacks: { label: (ctx) => ` ${ctx.raw}ms` },
          },
        },
        scales: {
          x: { ...yScale("ms", 0), display: true },
          y: {
            display: true,
            ticks: {
              color: CHART_THEME.tickColor,
              font: { family: CHART_THEME.fontFamily, size: 9 },
            },
            grid: { color: CHART_THEME.gridColor, drawBorder: false },
          },
        },
      },
    });
  }

  // ------------------------------------------------------------------
  // update(data) — push new data to all charts
  // ------------------------------------------------------------------
  update(allData) {
    const {
      requestMetrics,
      infraMetrics,
      deployStatus,
      agenticMetrics,
      regionMetrics,
      sloMetrics,
    } = allData;

    this._updateBurnRate(sloMetrics);
    this._updateRPS(requestMetrics);
    this._updateErrorRate(requestMetrics);
    this._updateLatency(requestMetrics);
    this._updateCanaryDonut(deployStatus);
    this._updateCPU(infraMetrics);
    this._updateMemory(infraMetrics);
    this._updatePods(infraMetrics);
    this._updateHPA(infraMetrics);
    this._updateRegionLatency(regionMetrics);
    this._updateTokens(agenticMetrics);
    this._updateAgentTasks(agenticMetrics);
    this._updateToolLatency(agenticMetrics);
  }

  _updateBurnRate(slo) {
    const c = this._charts.burnRate;
    if (!c || !slo) return;
    const hist = slo.burnRateHistory || [];
    c.data.datasets[0].data = hist;
    c.update("none");
  }

  _updateRPS(req) {
    const c = this._charts.rps;
    if (!c || !req) return;
    req.rpsPerService.forEach((svc, i) => {
      if (c.data.datasets[i]) {
        c.data.datasets[i].data = svc.history;
      }
    });
    c.update("none");
  }

  _updateErrorRate(req) {
    const c = this._charts.errorRate;
    if (!c || !req) return;
    c.data.datasets[0].data = req.errorRateHistory;
    c.update("none");
  }

  _updateLatency(req) {
    const c = this._charts.latency;
    if (!c || !req) return;
    c.data.datasets[0].data = req.latency.p50History;
    c.data.datasets[1].data = req.latency.p95History;
    c.data.datasets[2].data = req.latency.p99History;
    c.update("none");
  }

  _updateCanaryDonut(deploy) {
    const c = this._charts.canaryDonut;
    if (!c || !deploy) return;
    const w = deploy.canary.weight;
    c.data.datasets[0].data = [100 - w, w];
    c.update();
  }

  _updateCPU(infra) {
    const c = this._charts.cpu;
    if (!c || !infra) return;
    CONFIG.services.forEach((svc, i) => {
      if (c.data.datasets[i] && infra.services[svc.id]) {
        c.data.datasets[i].data = infra.services[svc.id].cpuHistory;
      }
    });
    c.update("none");
  }

  _updateMemory(infra) {
    const c = this._charts.memory;
    if (!c || !infra) return;
    CONFIG.services.forEach((svc, i) => {
      if (c.data.datasets[i] && infra.services[svc.id]) {
        c.data.datasets[i].data = infra.services[svc.id].memHistory;
      }
    });
    c.update("none");
  }

  _updatePods(infra) {
    const c = this._charts.pods;
    if (!c || !infra) return;
    CONFIG.services.forEach((svc, i) => {
      const p = infra.services[svc.id] && infra.services[svc.id].pods;
      if (p) {
        c.data.datasets[0].data[i] = p.desired;
        c.data.datasets[1].data[i] = p.ready;
        c.data.datasets[2].data[i] = p.available;
      }
    });
    c.update();
  }

  _updateHPA(infra) {
    const c = this._charts.hpa;
    if (!c || !infra) return;
    CONFIG.services.forEach((svc, i) => {
      if (c.data.datasets[i] && infra.services[svc.id]) {
        c.data.datasets[i].data = infra.services[svc.id].hpa.history;
      }
    });
    c.update("none");
  }

  _updateRegionLatency(regions) {
    const c = this._charts.regionLatency;
    if (!c || !regions) return;
    c.data.datasets[0].data = regions.map((r) => r.p50Latency);
    c.data.datasets[1].data = regions.map((r) => r.p95Latency);
    c.update();
  }

  _updateTokens(agentic) {
    const c = this._charts.tokens;
    if (!c || !agentic) return;
    c.data.datasets[0].data = agentic.tokenConsumption.promptHistory;
    c.data.datasets[1].data = agentic.tokenConsumption.completionHistory;
    c.update("none");
  }

  _updateAgentTasks(agentic) {
    const c = this._charts.agentTasks;
    if (!c || !agentic) return;
    c.data.datasets[0].data = agentic.taskResults.successHistory;
    c.data.datasets[1].data = agentic.taskResults.failHistory;
    c.update("none");
  }

  _updateToolLatency(agentic) {
    const c = this._charts.toolLatency;
    if (!c || !agentic) return;
    c.data.datasets[0].data = CONFIG.toolCategories.map((cat) =>
      agentic.toolLatency[cat.id] ? agentic.toolLatency[cat.id].current : 0,
    );
    c.update();
  }

  /** Handle window resize */
  resize() {
    Object.values(this._charts).forEach((chart) => {
      if (chart && typeof chart.resize === "function") chart.resize();
    });
  }

  destroy() {
    Object.values(this._charts).forEach((chart) => {
      if (chart && typeof chart.destroy === "function") chart.destroy();
    });
    this._charts = {};
  }
}
