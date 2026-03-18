/**
 * EstateWise Context Engineering — Main Application Controller
 *
 * Bootstraps the UI, wires all event handlers, manages API calls,
 * and coordinates between GraphVisualization and MetricsDashboard.
 */

/* eslint-disable no-undef */

"use strict";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE = "/api/context";
const REFRESH_INTERVAL_MS = 10_000;
const DEBOUNCE_MS = 300;

/**
 * Node type metadata: icon, display name, and CSS variable for color.
 * Unicode symbols are used as lightweight icons inside SVG nodes.
 */
const NODE_TYPES = [
  {
    key: "Property",
    label: "Property",
    icon: "\u{1F3E0}",
    color: "var(--node-property)",
  },
  {
    key: "Concept",
    label: "Concept",
    icon: "\u{1F4A1}",
    color: "var(--node-concept)",
  },
  {
    key: "Entity",
    label: "Entity",
    icon: "\u{1F4CD}",
    color: "var(--node-entity)",
  },
  {
    key: "Topic",
    label: "Topic",
    icon: "\u{1F4CB}",
    color: "var(--node-topic)",
  },
  {
    key: "Document",
    label: "Document",
    icon: "\u{1F4C4}",
    color: "var(--node-document)",
  },
  {
    key: "Conversation",
    label: "Conversation",
    icon: "\u{1F4AC}",
    color: "var(--node-conversation)",
  },
  {
    key: "Agent",
    label: "Agent",
    icon: "\u{1F916}",
    color: "var(--node-agent)",
  },
  { key: "Tool", label: "Tool", icon: "\u{1F527}", color: "var(--node-tool)" },
  {
    key: "Workflow",
    label: "Workflow",
    icon: "\u26A1",
    color: "var(--node-workflow)",
  },
  {
    key: "Neighborhood",
    label: "Neighborhood",
    icon: "\u{1F3D8}",
    color: "var(--node-neighborhood)",
  },
  {
    key: "ZipCode",
    label: "ZipCode",
    icon: "\u{1F4EE}",
    color: "var(--node-zipcode)",
  },
  {
    key: "MarketSegment",
    label: "MarketSegment",
    icon: "\u{1F4C8}",
    color: "var(--node-marketsegment)",
  },
];

const EDGE_TYPES = [
  "SIMILAR_TO",
  "RELATED_TO",
  "BELONGS_TO",
  "MENTIONS",
  "DERIVED_FROM",
  "DEPENDS_ON",
  "LINKS_TO",
  "PART_OF",
  "USES",
  "PRODUCES",
  "IN_NEIGHBORHOOD",
  "IN_ZIP",
  "HAS_CAPABILITY",
  "PRECEDES",
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/**
 * Returns a debounced version of fn that fires after `wait` ms of quiet.
 * @param {Function} fn
 * @param {number} wait
 * @returns {Function}
 */
function debounce(fn, wait) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}

/**
 * Performs a fetch with a default JSON content type and returns parsed JSON.
 * Throws on non-OK HTTP status.
 * @param {string} url
 * @returns {Promise<unknown>}
 */
async function apiFetch(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

/**
 * Resolves a CSS custom property value from :root.
 * @param {string} varName  e.g. "--node-property"
 * @returns {string}
 */
function cssVar(varName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
}

/**
 * Formats a number as a compact string: 1234 -> "1.2k", 1000000 -> "1.0M".
 * @param {number} n
 * @returns {string}
 */
function fmtNum(n) {
  if (n == null) return "—";
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return String(n);
}

// ---------------------------------------------------------------------------
// ContextApp — main application class
// ---------------------------------------------------------------------------

class ContextApp {
  constructor() {
    /** @type {GraphVisualization|null} */
    this._graphViz = null;
    /** @type {MetricsDashboard|null} */
    this._metrics = null;

    /** Active filter sets */
    this._activeNodeTypes = new Set(NODE_TYPES.map((t) => t.key));
    this._activeEdgeTypes = new Set(EDGE_TYPES);

    /** Currently loaded graph data */
    this._graphData = null;

    /** Refresh timer handle */
    this._refreshTimer = null;

    /** Bound debounced handlers (stored so they can be replaced) */
    this._debouncedGraphSearch = debounce(
      this._onGraphSearch.bind(this),
      DEBOUNCE_MS,
    );
    this._debouncedKBSearch = debounce(
      this._onKBSearch.bind(this),
      DEBOUNCE_MS,
    );
  }

  // -------------------------------------------------------------------------
  // Bootstrap
  // -------------------------------------------------------------------------

  /** Entry point — called once the DOM is ready. */
  async init() {
    this._buildFilterUI();
    this._buildLegend();
    this._bindEvents();

    // Initialise sub-modules
    this._metrics = new MetricsDashboard(
      document.getElementById("metrics-panel"),
    );

    this._graphViz = new GraphVisualization("#graph-container", {
      onNodeClick: (node, neighbors) => this.showNodeDetail(node, neighbors),
      onNodeHover: (node, x, y) => this._showTooltip(node, x, y),
      onNodeUnhover: () => this._hideTooltip(),
    });

    // Load initial data
    await this._loadAll();

    // Start auto-refresh for metrics
    this._refreshTimer = setInterval(
      () => this._refreshMetrics(),
      REFRESH_INTERVAL_MS,
    );
  }

  // -------------------------------------------------------------------------
  // Data loading
  // -------------------------------------------------------------------------

  /** Loads all data sources in parallel, handles errors independently. */
  async _loadAll() {
    this._setStatus("connecting");
    this._showGraphOverlay("loading");

    const [graphResult, kbResult, metricsResult] = await Promise.allSettled([
      this.fetchGraphData(),
      this.fetchKBStats(),
      this.fetchMetrics(),
    ]);

    if (graphResult.status === "fulfilled") {
      this._graphData = graphResult.value;
      this._graphViz.render(graphResult.value);
      this.updateStats(graphResult.value.stats || {});
      this._hideGraphOverlay();
      this._setStatus("connected");
    } else {
      console.error("[ContextApp] Graph load failed:", graphResult.reason);
      this._showGraphOverlay("error", graphResult.reason.message);
      this._setStatus("error");
    }

    if (kbResult.status === "fulfilled") {
      this._metrics.renderStats(kbResult.value);
    }

    if (metricsResult.status === "fulfilled") {
      this._metrics.renderMetrics(metricsResult.value);
      this._updateFooterMetrics(metricsResult.value);
    }
  }

  /** Refreshes only metrics and footer (called on interval). */
  async _refreshMetrics() {
    try {
      const [kbStats, metrics] = await Promise.all([
        this.fetchKBStats(),
        this.fetchMetrics(),
      ]);
      this._metrics.renderStats(kbStats);
      this._metrics.renderMetrics(metrics);
      this._updateFooterMetrics(metrics);
      this._updateTimestamp();
    } catch (err) {
      console.warn("[ContextApp] Metrics refresh failed:", err.message);
    }
  }

  // -------------------------------------------------------------------------
  // API calls
  // -------------------------------------------------------------------------

  /** GET /api/context/graph -> { nodes, edges, stats } */
  async fetchGraphData() {
    return apiFetch(`${API_BASE}/graph`);
  }

  /** GET /api/context/kb/stats */
  async fetchKBStats() {
    return apiFetch(`${API_BASE}/kb/stats`);
  }

  /** GET /api/context/metrics */
  async fetchMetrics() {
    return apiFetch(`${API_BASE}/metrics`);
  }

  /**
   * GET /api/context/graph/search?q=...
   * @param {string} query
   */
  async searchGraph(query) {
    return apiFetch(`${API_BASE}/graph/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * GET /api/context/kb/search?q=...
   * @param {string} query
   */
  async searchKB(query) {
    return apiFetch(`${API_BASE}/kb/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * GET /api/context/graph/nodes/:id
   * @param {string} id
   */
  async fetchNodeDetail(id) {
    return apiFetch(`${API_BASE}/graph/nodes/${encodeURIComponent(id)}`);
  }

  // -------------------------------------------------------------------------
  // Event wiring
  // -------------------------------------------------------------------------

  _bindEvents() {
    // Search inputs
    document
      .getElementById("graph-search")
      .addEventListener("input", (e) =>
        this._debouncedGraphSearch(e.target.value.trim()),
      );

    document
      .getElementById("kb-search")
      .addEventListener("input", (e) =>
        this._debouncedKBSearch(e.target.value.trim()),
      );

    // Header buttons
    document
      .getElementById("btn-refresh")
      .addEventListener("click", () => this._loadAll());

    document
      .getElementById("btn-fit")
      .addEventListener("click", () => this._graphViz?.fitToScreen());

    // Retry button inside error overlay
    document
      .getElementById("btn-retry")
      .addEventListener("click", () => this._loadAll());

    // Right sidebar toggle
    document
      .getElementById("toggle-right-sidebar")
      .addEventListener("click", () => this._toggleRightSidebar());

    // Nav tabs
    document.querySelectorAll(".nav-btn").forEach((btn) => {
      btn.addEventListener("click", () => this._onNavClick(btn));
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => this._onKeyDown(e));
  }

  _onNavClick(btn) {
    document.querySelectorAll(".nav-btn").forEach((b) => {
      b.classList.toggle("active", b === btn);
      b.setAttribute("aria-pressed", String(b === btn));
    });
  }

  _toggleRightSidebar() {
    const body = document.querySelector(".app-body");
    const btn = document.getElementById("toggle-right-sidebar");
    const sidebar = document.getElementById("right-sidebar");
    const inner = sidebar.querySelector(".sidebar-inner");
    const isOpen = btn.getAttribute("aria-expanded") === "true";

    btn.setAttribute("aria-expanded", String(!isOpen));
    body.classList.toggle("right-collapsed", isOpen);

    if (inner) inner.style.visibility = isOpen ? "hidden" : "";
  }

  _onKeyDown(e) {
    // Escape: deselect node
    if (e.key === "Escape") {
      this._graphViz?.resetHighlights();
      this._clearNodeDetail();
      return;
    }
    // /: focus graph search
    if (e.key === "/" && document.activeElement.tagName !== "INPUT") {
      e.preventDefault();
      document.getElementById("graph-search").focus();
    }
  }

  // -------------------------------------------------------------------------
  // Graph search handler
  // -------------------------------------------------------------------------

  async _onGraphSearch(query) {
    if (!query) {
      // Restore full graph
      if (this._graphData) {
        this._graphViz.updateData(this._graphData);
      }
      return;
    }

    try {
      const result = await this.searchGraph(query);
      if (result.nodes?.length === 0) {
        this._showGraphOverlay("empty");
      } else {
        this._hideGraphOverlay();
        this._graphViz.updateData(result);
      }
    } catch (err) {
      // Fallback: client-side label filter on cached data
      if (this._graphData) {
        const lq = query.toLowerCase();
        const matchedIds = new Set(
          this._graphData.nodes
            .filter((n) => n.label.toLowerCase().includes(lq))
            .map((n) => n.id),
        );
        const filteredNodes = this._graphData.nodes.filter((n) =>
          matchedIds.has(n.id),
        );
        const filteredEdges = this._graphData.edges.filter(
          (e) => matchedIds.has(e.source) && matchedIds.has(e.target),
        );
        if (filteredNodes.length === 0) {
          this._showGraphOverlay("empty");
        } else {
          this._hideGraphOverlay();
          this._graphViz.updateData({
            nodes: filteredNodes,
            edges: filteredEdges,
          });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // KB search handler
  // -------------------------------------------------------------------------

  async _onKBSearch(query) {
    const container = document.getElementById("kb-results");
    if (!query) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = '<p class="kb-empty">Searching…</p>';
    try {
      const results = await this.searchKB(query);
      const items = Array.isArray(results) ? results : results.results || [];
      this._renderKBResults(items);
    } catch (err) {
      container.innerHTML = `<p class="kb-empty">Search failed: ${err.message}</p>`;
    }
  }

  /**
   * Renders KB search result cards.
   * @param {Array<{document:{title:string},chunk:{content:string},score:number}>} results
   */
  _renderKBResults(results) {
    const container = document.getElementById("kb-results");
    if (!results.length) {
      container.innerHTML = '<p class="kb-empty">No results found.</p>';
      return;
    }

    container.innerHTML = results
      .slice(0, 8)
      .map((r) => {
        const title = r.document?.title || r.title || "Untitled";
        const snippet = r.chunk?.content || r.snippet || "";
        const score =
          typeof r.score === "number" ? (r.score * 100).toFixed(0) + "%" : "";
        return `
        <div class="kb-result-card" role="article">
          <div class="kb-result-title" title="${esc(title)}">${esc(title)}</div>
          <div class="kb-result-snippet">${esc(snippet.slice(0, 200))}</div>
          ${score ? `<div class="kb-result-score">${esc(score)} match</div>` : ""}
        </div>`;
      })
      .join("");
  }

  // -------------------------------------------------------------------------
  // Filter UI
  // -------------------------------------------------------------------------

  _buildFilterUI() {
    const nodeContainer = document.getElementById("node-type-filters");
    const edgeContainer = document.getElementById("edge-type-filters");

    NODE_TYPES.forEach(({ key, label, color }) => {
      const item = this._makeFilterItem(key, label, color, true, (checked) => {
        if (checked) this._activeNodeTypes.add(key);
        else this._activeNodeTypes.delete(key);
        this._graphViz?.filterByNodeTypes([...this._activeNodeTypes]);
      });
      nodeContainer.appendChild(item);
    });

    EDGE_TYPES.forEach((key) => {
      const item = this._makeFilterItem(
        key,
        key,
        "var(--text-muted)",
        true,
        (checked) => {
          if (checked) this._activeEdgeTypes.add(key);
          else this._activeEdgeTypes.delete(key);
          this._graphViz?.filterByEdgeTypes([...this._activeEdgeTypes]);
        },
      );
      edgeContainer.appendChild(item);
    });
  }

  /**
   * Creates a labelled checkbox filter row element.
   * @param {string} key
   * @param {string} label
   * @param {string} color
   * @param {boolean} checked
   * @param {(checked:boolean)=>void} onChange
   * @returns {HTMLElement}
   */
  _makeFilterItem(key, label, color, checked, onChange) {
    const id = `filter-${key.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const item = document.createElement("div");
    item.className = "filter-item";

    const dot = document.createElement("span");
    dot.className = "filter-dot";
    dot.style.background = color;
    dot.setAttribute("aria-hidden", "true");

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.id = id;
    cb.checked = checked;
    cb.addEventListener("change", () => onChange(cb.checked));

    const lbl = document.createElement("label");
    lbl.htmlFor = id;
    lbl.textContent = label;

    const cnt = document.createElement("span");
    cnt.className = "filter-count";
    cnt.id = `cnt-${id}`;

    item.append(dot, cb, lbl, cnt);
    return item;
  }

  _buildLegend() {
    const legend = document.getElementById("node-legend");
    NODE_TYPES.forEach(({ key, label, color }) => {
      const item = document.createElement("div");
      item.className = "legend-item";
      item.innerHTML = `
        <span class="legend-swatch" style="background:${color}" aria-hidden="true"></span>
        <span>${esc(label)}</span>`;
      legend.appendChild(item);
    });
  }

  // -------------------------------------------------------------------------
  // Stats panel
  // -------------------------------------------------------------------------

  /**
   * Updates the four summary stat cards in the left sidebar.
   * @param {{nodeCount?:number,edgeCount?:number,documentCount?:number,chunkCount?:number}} stats
   */
  updateStats(stats) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = fmtNum(val ?? null);
    };
    set("stat-nodes", stats.nodeCount);
    set("stat-edges", stats.edgeCount);
    set("stat-docs", stats.documentCount ?? stats.documents);
    set("stat-chunks", stats.chunkCount ?? stats.chunks);

    // Update per-type counts in filter labels
    const byType = stats.nodesByType || {};
    Object.entries(byType).forEach(([type, count]) => {
      const id = `cnt-filter-${type.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
      const el = document.getElementById(id);
      if (el) el.textContent = count;
    });
  }

  // -------------------------------------------------------------------------
  // Node detail panel
  // -------------------------------------------------------------------------

  /**
   * Populates the right-sidebar node detail panel.
   * @param {{id:string,type:string,label:string,properties:Record<string,unknown>,metadata:{importance:number,tags:string[]}}} node
   * @param {Array<{id:string,label:string,type:string}>} neighbors
   */
  showNodeDetail(node, neighbors) {
    const panel = document.getElementById("node-detail-panel");
    if (!node) {
      this._clearNodeDetail();
      return;
    }

    const typeMeta = NODE_TYPES.find((t) => t.key === node.type) || {
      icon: "◈",
      color: "var(--text-muted)",
    };
    const importance =
      typeof node.metadata?.importance === "number"
        ? (node.metadata.importance * 100).toFixed(0) + "%"
        : "—";

    const propsHTML = this.formatProperties(node.properties || {});
    const tagsHTML = (node.metadata?.tags || [])
      .map((t) => `<span class="tag-chip">${esc(t)}</span>`)
      .join("");

    const neighborsHTML = (neighbors || [])
      .slice(0, 12)
      .map((nb) => {
        const nbMeta = NODE_TYPES.find((t) => t.key === nb.type);
        return `<button class="neighbor-chip" data-node-id="${esc(nb.id)}"
                       aria-label="Navigate to ${esc(nb.label)}" title="${esc(nb.label)}">
                ${nbMeta ? nbMeta.icon : "◈"} ${esc(nb.label.slice(0, 22))}${nb.label.length > 22 ? "…" : ""}
              </button>`;
      })
      .join("");

    panel.innerHTML = `
      <div class="detail-header">
        <div class="detail-icon" style="background:${typeMeta.color}20;color:${typeMeta.color}">
          ${typeMeta.icon || "◈"}
        </div>
        <div class="detail-title-block">
          <div class="detail-label" title="${esc(node.label)}">${esc(node.label)}</div>
          <span class="detail-type-badge"
                style="color:${typeMeta.color};border-color:${typeMeta.color}40">
            ${esc(node.type)}
          </span>
        </div>
      </div>

      <div class="detail-row">
        <span class="detail-key">ID</span>
        <span class="detail-val">${esc(node.id.slice(0, 20))}…</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Importance</span>
        <span class="detail-val">${esc(importance)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Source</span>
        <span class="detail-val">${esc(node.metadata?.source || "—")}</span>
      </div>
      <div class="detail-row">
        <span class="detail-key">Version</span>
        <span class="detail-val">${esc(String(node.metadata?.version ?? "—"))}</span>
      </div>

      ${
        tagsHTML
          ? `
        <div class="detail-section-title">Tags</div>
        <div>${tagsHTML}</div>`
          : ""
      }

      ${
        propsHTML
          ? `
        <div class="detail-section-title">Properties</div>
        ${propsHTML}`
          : ""
      }

      ${
        neighborsHTML
          ? `
        <div class="detail-section-title">Neighbors (${(neighbors || []).length})</div>
        <div>${neighborsHTML}</div>`
          : ""
      }
    `;

    // Wire neighbor-chip clicks
    panel.querySelectorAll(".neighbor-chip[data-node-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const nid = btn.getAttribute("data-node-id");
        this._graphViz?.centerOnNode(nid);
        this._graphViz?.highlightNode(nid);
      });
    });
  }

  _clearNodeDetail() {
    const panel = document.getElementById("node-detail-panel");
    panel.innerHTML = '<p class="detail-empty">Click a node to inspect it.</p>';
  }

  /**
   * Renders a node's properties object as detail rows.
   * @param {Record<string,unknown>} props
   * @returns {string} HTML string
   */
  formatProperties(props) {
    const entries = Object.entries(props).filter(([, v]) => v != null);
    if (!entries.length) return "";
    return entries
      .map(([k, v]) => {
        const val = typeof v === "object" ? JSON.stringify(v) : String(v);
        return `
        <div class="detail-row">
          <span class="detail-key">${esc(k)}</span>
          <span class="detail-val">${esc(val.slice(0, 120))}</span>
        </div>`;
      })
      .join("");
  }

  // -------------------------------------------------------------------------
  // Footer metrics
  // -------------------------------------------------------------------------

  /**
   * @param {{totalAssemblies?:number,avgAssemblyTimeMs?:number,avgTokensUsed?:number,
   *           cacheHitRate?:number,totalIngestions?:number,kbDocuments?:number}} metrics
   */
  _updateFooterMetrics(metrics) {
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val ?? "—";
    };
    set("ft-assemblies", fmtNum(metrics.totalAssemblies));
    set(
      "ft-avg-time",
      metrics.avgAssemblyTimeMs != null
        ? Math.round(metrics.avgAssemblyTimeMs) + "ms"
        : "—",
    );
    set("ft-avg-tokens", fmtNum(metrics.avgTokensUsed));
    set(
      "ft-cache-hits",
      metrics.cacheHitRate != null
        ? (metrics.cacheHitRate * 100).toFixed(1) + "%"
        : "—",
    );
    set("ft-ingestions", fmtNum(metrics.totalIngestions));
    set("ft-kb-docs", fmtNum(metrics.kbDocuments));
    this._updateTimestamp();
  }

  _updateTimestamp() {
    const el = document.getElementById("footer-timestamp");
    if (el) el.textContent = "Updated " + new Date().toLocaleTimeString();
  }

  // -------------------------------------------------------------------------
  // Tooltip
  // -------------------------------------------------------------------------

  /**
   * @param {{label:string,type:string}|null} node
   * @param {number} x
   * @param {number} y
   */
  _showTooltip(node, x, y) {
    if (!node) {
      this._hideTooltip();
      return;
    }
    const tip = document.getElementById("graph-tooltip");
    const typeMeta = NODE_TYPES.find((t) => t.key === node.type);
    tip.innerHTML = `
      <div class="tooltip-title">${esc(node.label)}</div>
      <div class="tooltip-type">${typeMeta ? typeMeta.icon + " " : ""}${esc(node.type)}</div>`;
    tip.style.left = x + 14 + "px";
    tip.style.top = y - 8 + "px";
    tip.classList.add("visible");
    tip.setAttribute("aria-hidden", "false");
  }

  _hideTooltip() {
    const tip = document.getElementById("graph-tooltip");
    tip.classList.remove("visible");
    tip.setAttribute("aria-hidden", "true");
  }

  // -------------------------------------------------------------------------
  // Graph overlay helpers
  // -------------------------------------------------------------------------

  /** @param {'loading'|'error'|'empty'} state */
  _showGraphOverlay(state, message) {
    const spinner = document.getElementById("loading-spinner");
    const error = document.getElementById("graph-error");
    const empty = document.getElementById("graph-empty");
    const overlay = document.getElementById("graph-overlay");

    spinner.classList.add("hidden");
    error.classList.add("hidden");
    empty.classList.add("hidden");
    overlay.style.display = "flex";

    if (state === "loading") spinner.classList.remove("hidden");
    if (state === "error") {
      error.classList.remove("hidden");
      const msgEl = document.getElementById("error-message");
      if (msgEl && message) msgEl.textContent = message;
    }
    if (state === "empty") empty.classList.remove("hidden");
  }

  _hideGraphOverlay() {
    const overlay = document.getElementById("graph-overlay");
    overlay.style.display = "none";
  }

  // -------------------------------------------------------------------------
  // Status indicator
  // -------------------------------------------------------------------------

  /** @param {'connecting'|'connected'|'error'} state */
  _setStatus(state) {
    const el = document.getElementById("status-indicator");
    const label = document.getElementById("status-label");
    el.className = `status-dot ${state}`;
    const labels = {
      connecting: "Connecting",
      connected: "Connected",
      error: "Error",
    };
    label.textContent = labels[state] || state;
    el.setAttribute("aria-label", `API connection: ${labels[state] || state}`);
  }
}

// ---------------------------------------------------------------------------
// HTML-escape helper (simple, avoids XSS in dynamic content)
// ---------------------------------------------------------------------------

/**
 * Escapes special HTML characters in a string.
 * @param {string} str
 * @returns {string}
 */
function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ---------------------------------------------------------------------------
// Boot — expose globally for sibling scripts, then init
// ---------------------------------------------------------------------------

window.__esc = esc;

document.addEventListener("DOMContentLoaded", () => {
  const app = new ContextApp();
  window.__app = app; // Allow graph-viz to call back without imports
  app.init().catch((err) => {
    console.error("[ContextApp] Fatal init error:", err);
  });
});
