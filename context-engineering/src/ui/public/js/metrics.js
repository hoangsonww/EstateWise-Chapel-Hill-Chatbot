/**
 * EstateWise Context Engineering — Metrics and Charts Panel
 *
 * Renders lightweight SVG-based charts in the right sidebar for
 * knowledge-base stats, context engine metrics, and real-time indicators.
 * No external chart library — pure SVG drawn via DOM APIs.
 */

/* eslint-disable no-undef */

"use strict";

// ---------------------------------------------------------------------------
// Color helpers (resolved from CSS custom properties)
// ---------------------------------------------------------------------------

function _cssVar(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

// Node type colours mirror the CSS palette
const TYPE_COLORS = {
  Property: () => _cssVar("--node-property"),
  Concept: () => _cssVar("--node-concept"),
  Entity: () => _cssVar("--node-entity"),
  Topic: () => _cssVar("--node-topic"),
  Document: () => _cssVar("--node-document"),
  Conversation: () => _cssVar("--node-conversation"),
  Agent: () => _cssVar("--node-agent"),
  Tool: () => _cssVar("--node-tool"),
  Workflow: () => _cssVar("--node-workflow"),
  Neighborhood: () => _cssVar("--node-neighborhood"),
  ZipCode: () => _cssVar("--node-zipcode"),
  MarketSegment: () => _cssVar("--node-marketsegment"),
};

const DEFAULT_COLORS = [
  "#58a6ff",
  "#3fb950",
  "#d29922",
  "#bc8cff",
  "#f0883e",
  "#79c0ff",
  "#f85149",
  "#56d364",
  "#db61a2",
  "#7ee787",
  "#a5d6ff",
  "#ffd33d",
];

function _typeColor(type, idx) {
  return TYPE_COLORS[type]
    ? TYPE_COLORS[type]()
    : DEFAULT_COLORS[idx % DEFAULT_COLORS.length];
}

// ---------------------------------------------------------------------------
// SVG helpers
// ---------------------------------------------------------------------------

/**
 * Creates an SVG element with given attributes.
 * @param {string} tag
 * @param {Record<string,string|number>} attrs
 * @returns {SVGElement}
 */
function _svgEl(tag, attrs = {}) {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  return el;
}

/**
 * Formats a number concisely.
 * @param {number|null|undefined} n
 * @returns {string}
 */
function _fmt(n) {
  if (n == null || isNaN(n)) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(Math.round(n));
}

// ---------------------------------------------------------------------------
// MetricsDashboard
// ---------------------------------------------------------------------------

class MetricsDashboard {
  /**
   * @param {HTMLElement} container  The panel element to render into.
   */
  constructor(container) {
    if (!container) {
      console.warn(
        "[MetricsDashboard] container is null — metrics panel disabled.",
      );
    }
    this._el = container;
    this._lastStats = null;
    this._lastMetrics = null;
  }

  // -------------------------------------------------------------------------
  // Public render methods
  // -------------------------------------------------------------------------

  /**
   * Renders KB document/chunk statistics as stat cards and type bar charts.
   * @param {{
   *   documentCount?:number, chunkCount?:number,
   *   bySourceType?:Record<string,number>
   * }} stats
   */
  renderStats(stats) {
    if (!this._el || !stats) return;
    this._lastStats = stats;
    this._rebuildPanel();
  }

  /**
   * Renders context assembly metrics with a cache-hit ring chart.
   * @param {{
   *   totalAssemblies?:number, avgAssemblyTimeMs?:number,
   *   avgTokensUsed?:number, cacheHitRate?:number,
   *   totalIngestions?:number, kbDocuments?:number,
   *   nodesByType?:Record<string,number>, edgesByType?:Record<string,number>
   * }} metrics
   */
  renderMetrics(metrics) {
    if (!this._el || !metrics) return;
    this._lastMetrics = metrics;
    this._rebuildPanel();
  }

  /**
   * Renders a simple time-series line chart.
   * @param {{timestamps:number[], values:number[], label:string}} data
   */
  renderTimeSeries(data) {
    if (!this._el || !data?.values?.length) return;

    const section =
      this._el.querySelector("#ts-chart-section") ||
      (() => {
        const s = document.createElement("div");
        s.id = "ts-chart-section";
        this._el.appendChild(s);
        return s;
      })();

    section.innerHTML = `<div class="sidebar-heading" style="font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">${data.label || "Trend"}</div>`;
    section.appendChild(this._buildLineChart(data.values, data.timestamps));
  }

  // -------------------------------------------------------------------------
  // Internal: rebuild full panel
  // -------------------------------------------------------------------------

  _rebuildPanel() {
    if (!this._el) return;
    this._el.innerHTML = "";

    const stats = this._lastStats;
    const metrics = this._lastMetrics;

    // --- Summary stat rows ---
    if (metrics) {
      const summaryItems = [
        { label: "Total Assemblies", value: _fmt(metrics.totalAssemblies) },
        {
          label: "Avg Assembly Time",
          value:
            metrics.avgAssemblyTimeMs != null
              ? Math.round(metrics.avgAssemblyTimeMs) + " ms"
              : "—",
        },
        { label: "Avg Tokens", value: _fmt(metrics.avgTokensUsed) },
        { label: "Total Ingestions", value: _fmt(metrics.totalIngestions) },
        { label: "KB Documents", value: _fmt(metrics.kbDocuments) },
      ];
      summaryItems.forEach(({ label, value }) => {
        this._el.appendChild(this._buildMetricRow(label, value));
      });
    }

    if (stats) {
      const statItems = [
        {
          label: "Documents",
          value: _fmt(stats.documentCount ?? stats.documents),
        },
        { label: "Chunks", value: _fmt(stats.chunkCount ?? stats.chunks) },
      ];
      statItems.forEach(({ label, value }) => {
        this._el.appendChild(this._buildMetricRow(label, value));
      });
    }

    // --- Cache hit rate ring ---
    if (metrics && metrics.cacheHitRate != null) {
      const divider = document.createElement("div");
      divider.style.cssText =
        "height:1px;background:var(--border-subtle);margin:8px 0";
      this._el.appendChild(divider);

      const ringWrap = document.createElement("div");
      ringWrap.className = "ring-chart-wrap";
      ringWrap.appendChild(
        this._buildRingChart(metrics.cacheHitRate, "Cache Hits"),
      );
      this._el.appendChild(ringWrap);
    }

    // --- Node type breakdown bar chart ---
    const nodesByType = metrics?.nodesByType || {};
    if (Object.keys(nodesByType).length) {
      const divider = document.createElement("div");
      divider.style.cssText =
        "height:1px;background:var(--border-subtle);margin:8px 0";
      this._el.appendChild(divider);

      const heading = document.createElement("div");
      heading.style.cssText =
        "font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px";
      heading.textContent = "Nodes by Type";
      this._el.appendChild(heading);

      this._el.appendChild(this._buildBarChart(nodesByType));
    }

    // --- Edge type breakdown bar chart ---
    const edgesByType = metrics?.edgesByType || {};
    if (Object.keys(edgesByType).length) {
      const divider2 = document.createElement("div");
      divider2.style.cssText =
        "height:1px;background:var(--border-subtle);margin:8px 0";
      this._el.appendChild(divider2);

      const heading2 = document.createElement("div");
      heading2.style.cssText =
        "font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px";
      heading2.textContent = "Edges by Type";
      this._el.appendChild(heading2);

      this._el.appendChild(this._buildBarChart(edgesByType, "#8b949e"));
    }

    // --- KB source type breakdown ---
    const bySourceType = stats?.bySourceType || {};
    if (Object.keys(bySourceType).length) {
      const divider3 = document.createElement("div");
      divider3.style.cssText =
        "height:1px;background:var(--border-subtle);margin:8px 0";
      this._el.appendChild(divider3);

      const heading3 = document.createElement("div");
      heading3.style.cssText =
        "font-size:11px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px";
      heading3.textContent = "Docs by Source";
      this._el.appendChild(heading3);

      this._el.appendChild(this._buildBarChart(bySourceType, "#d29922"));
    }
  }

  // -------------------------------------------------------------------------
  // Widget builders
  // -------------------------------------------------------------------------

  /**
   * Builds a single key-value metric row element.
   * @param {string} label
   * @param {string} value
   * @returns {HTMLElement}
   */
  _buildMetricRow(label, value) {
    const row = document.createElement("div");
    row.className = "metric-row";
    row.innerHTML = `
      <span class="metric-name">${_htmlEsc(label)}</span>
      <span class="metric-value">${_htmlEsc(String(value))}</span>`;
    return row;
  }

  /**
   * Builds a horizontal bar chart element from a counts object.
   * @param {Record<string,number>} countsMap
   * @param {string} [fixedColor]  If set, all bars use this color.
   * @returns {HTMLElement}
   */
  _buildBarChart(countsMap, fixedColor) {
    const entries = Object.entries(countsMap)
      .filter(([, v]) => v > 0)
      .sort(([, a], [, b]) => b - a);

    if (!entries.length) return document.createElement("div");

    const max = Math.max(...entries.map(([, v]) => v));
    const chart = document.createElement("div");
    chart.className = "bar-chart";

    entries.forEach(([type, count], idx) => {
      const pct = max > 0 ? (count / max) * 100 : 0;
      const color = fixedColor || _typeColor(type, idx);

      const row = document.createElement("div");
      row.className = "bar-row";
      row.title = `${type}: ${count}`;

      row.innerHTML = `
        <span class="bar-label" title="${_htmlEsc(type)}">${_htmlEsc(type)}</span>
        <div class="bar-track" role="progressbar"
             aria-valuenow="${count}" aria-valuemin="0" aria-valuemax="${max}"
             aria-label="${_htmlEsc(type)}: ${count}">
          <div class="bar-fill" style="width:${pct.toFixed(1)}%;background:${color}"></div>
        </div>
        <span class="bar-count">${_fmt(count)}</span>`;

      chart.appendChild(row);
    });

    return chart;
  }

  /**
   * Builds a donut / ring chart SVG element showing a single percentage.
   * @param {number} rate   Value in [0, 1].
   * @param {string} label
   * @returns {HTMLElement}
   */
  _buildRingChart(rate, label) {
    const size = 72;
    const cx = size / 2;
    const cy = size / 2;
    const r = 28;
    const stroke = 8;
    const circ = 2 * Math.PI * r;
    const pct = Math.min(1, Math.max(0, rate));
    const dash = pct * circ;
    const gap = circ - dash;
    const pctStr = (pct * 100).toFixed(1) + "%";

    const wrap = document.createElement("div");
    wrap.className = "ring-chart-wrap";

    // SVG ring
    const svg = _svgEl("svg", {
      width: size,
      height: size,
      viewBox: `0 0 ${size} ${size}`,
      "aria-hidden": "true",
    });

    // Background track
    const track = _svgEl("circle", {
      cx,
      cy,
      r,
      fill: "none",
      stroke: "var(--bg-overlay)",
      "stroke-width": stroke,
    });

    // Progress arc
    const arc = _svgEl("circle", {
      cx,
      cy,
      r,
      fill: "none",
      stroke: "var(--accent-green)",
      "stroke-width": stroke,
      "stroke-linecap": "round",
      "stroke-dasharray": `${dash.toFixed(2)} ${gap.toFixed(2)}`,
      "stroke-dashoffset": (circ / 4).toFixed(2), // start at top
      transform: `rotate(-90 ${cx} ${cy})`,
    });

    // Center label
    const text = _svgEl("text", {
      x: cx,
      y: cy,
      "text-anchor": "middle",
      "dominant-baseline": "central",
      fill: "var(--text-primary)",
      "font-size": "11",
      "font-family": "var(--font-mono)",
      "font-weight": "600",
    });
    text.textContent = pctStr;

    svg.appendChild(track);
    svg.appendChild(arc);
    svg.appendChild(text);
    wrap.appendChild(svg);

    // Label block
    const info = document.createElement("div");
    info.innerHTML = `
      <div class="ring-value">${_htmlEsc(pctStr)}</div>
      <div class="ring-label">${_htmlEsc(label)}</div>`;
    wrap.appendChild(info);

    return wrap;
  }

  /**
   * Builds a simple line chart SVG for time-series data.
   * @param {number[]} values
   * @param {number[]} [timestamps]
   * @returns {SVGElement}
   */
  _buildLineChart(values, timestamps) {
    const w = 240,
      h = 60,
      pad = 8;
    const svg = _svgEl("svg", {
      width: "100%",
      height: h,
      viewBox: `0 0 ${w} ${h}`,
      "aria-hidden": "true",
    });

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const n = values.length;

    const scaleX = (i) => pad + (i / (n - 1)) * (w - pad * 2);
    const scaleY = (v) => h - pad - ((v - min) / range) * (h - pad * 2);

    // Area fill
    const areaPoints = [
      `${scaleX(0)},${h - pad}`,
      ...values.map((v, i) => `${scaleX(i)},${scaleY(v)}`),
      `${scaleX(n - 1)},${h - pad}`,
    ].join(" ");

    const area = _svgEl("polygon", {
      points: areaPoints,
      fill: "var(--accent-blue)",
      opacity: "0.08",
    });

    // Line path
    const d = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(v)}`)
      .join(" ");
    const line = _svgEl("path", {
      d,
      fill: "none",
      stroke: "var(--accent-blue)",
      "stroke-width": "1.5",
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });

    // Dots at data points
    const dots = values.map((v, i) => {
      const dot = _svgEl("circle", {
        cx: scaleX(i),
        cy: scaleY(v),
        r: 2,
        fill: "var(--accent-blue)",
      });
      if (timestamps?.[i]) {
        dot.setAttribute(
          "aria-label",
          `${new Date(timestamps[i]).toLocaleTimeString()}: ${v}`,
        );
      }
      return dot;
    });

    svg.appendChild(area);
    svg.appendChild(line);
    dots.forEach((d) => svg.appendChild(d));

    return svg;
  }
}

// ---------------------------------------------------------------------------
// HTML escape helper
// ---------------------------------------------------------------------------

function _htmlEsc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Expose globally
window.MetricsDashboard = MetricsDashboard;
