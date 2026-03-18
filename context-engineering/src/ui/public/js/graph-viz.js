/**
 * EstateWise Context Engineering — D3.js Force-directed Graph Visualization
 *
 * Renders the knowledge graph as an interactive force-directed diagram.
 * Pure SVG via D3 v7 — no external chart library. Expects D3 to be loaded
 * globally via CDN before this file.
 */

/* global d3 */
/* eslint-disable no-undef */

"use strict";

// ---------------------------------------------------------------------------
// Node type → CSS variable map (resolved once at construction)
// ---------------------------------------------------------------------------

const NODE_COLOR_VARS = {
  Property: "--node-property",
  Concept: "--node-concept",
  Entity: "--node-entity",
  Topic: "--node-topic",
  Document: "--node-document",
  Conversation: "--node-conversation",
  Agent: "--node-agent",
  Tool: "--node-tool",
  Workflow: "--node-workflow",
  Neighborhood: "--node-neighborhood",
  ZipCode: "--node-zipcode",
  MarketSegment: "--node-marketsegment",
};

const NODE_ICONS = {
  Property: "\u{1F3E0}",
  Concept: "\u{1F4A1}",
  Entity: "\u{1F4CD}",
  Topic: "\u{1F4CB}",
  Document: "\u{1F4C4}",
  Conversation: "\u{1F4AC}",
  Agent: "\u{1F916}",
  Tool: "\u{1F527}",
  Workflow: "\u26A1",
  Neighborhood: "\u{1F3D8}",
  ZipCode: "\u{1F4EE}",
  MarketSegment: "\u{1F4C8}",
};

/** Importance → visual radius mapping */
const RADIUS_MIN = 8;
const RADIUS_MAX = 24;

/**
 * Edge type → stroke-dasharray
 * Directed relationships get arrows; cross-cutting ones get dashes.
 */
const EDGE_DASH = {
  SIMILAR_TO: "6 3",
  RELATED_TO: "4 2",
  BELONGS_TO: null, // solid
  MENTIONS: "2 3",
  DERIVED_FROM: "8 3",
  DEPENDS_ON: null,
  LINKS_TO: "5 2",
  PART_OF: null,
  USES: null,
  PRODUCES: "7 2",
  IN_NEIGHBORHOOD: null,
  IN_ZIP: null,
  HAS_CAPABILITY: "3 3",
  PRECEDES: "1 2",
};

// ---------------------------------------------------------------------------
// GraphVisualization
// ---------------------------------------------------------------------------

class GraphVisualization {
  /**
   * @param {string} containerSelector  CSS selector for the container element.
   * @param {{
   *   onNodeClick?:  (node:object,neighbors:object[]) => void,
   *   onNodeHover?:  (node:object|null,x:number,y:number) => void,
   *   onNodeUnhover?:() => void
   * }} callbacks
   */
  constructor(containerSelector, callbacks = {}) {
    this._container = document.querySelector(containerSelector);
    if (!this._container)
      throw new Error(
        `GraphVisualization: container "${containerSelector}" not found`,
      );

    this._callbacks = callbacks;
    this._svg = null;
    this._simulation = null;
    this._zoom = null;
    this._gRoot = null; // main transform group
    this._gEdges = null;
    this._gNodes = null;
    this._gLabels = null;

    this._nodes = []; // current node data (D3 mutable)
    this._edges = []; // current edge data (D3 mutable)
    this._allNodes = []; // master copy for filtering
    this._allEdges = []; // master copy for filtering

    this._activeNodeTypes = null; // null = all shown
    this._activeEdgeTypes = null;

    this._selectedNodeId = null;
    this._colors = {}; // type -> hex string

    this._labelZoomThreshold = 1.2; // show labels only above this zoom level
    this._currentZoom = 1;

    this._resolveColors();
    this._initSVG();
    this._initSimulation();
    this._initZoom();
    this._initArrowMarkers();
    this._bindResizeObserver();
  }

  // -------------------------------------------------------------------------
  // Initialization
  // -------------------------------------------------------------------------

  _resolveColors() {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    Object.entries(NODE_COLOR_VARS).forEach(([type, varName]) => {
      this._colors[type] = styles.getPropertyValue(varName).trim() || "#58a6ff";
    });
  }

  _initSVG() {
    const { width, height } = this._container.getBoundingClientRect();

    this._svg = d3
      .select(this._container)
      .append("svg")
      .attr("role", "img")
      .attr("aria-label", "Knowledge graph force-directed visualization")
      .attr("width", "100%")
      .attr("height", "100%");

    // Defs for arrow markers
    this._defs = this._svg.append("defs");

    // Root group for zoom/pan transform
    this._gRoot = this._svg.append("g").attr("class", "g-root");
    this._gEdges = this._gRoot.append("g").attr("class", "g-edges");
    this._gNodes = this._gRoot.append("g").attr("class", "g-nodes");
    this._gLabels = this._gRoot.append("g").attr("class", "g-labels");

    this._width = width || 800;
    this._height = height || 600;
  }

  _initSimulation() {
    this._simulation = d3
      .forceSimulation()
      .force(
        "link",
        d3
          .forceLink()
          .id((d) => d.id)
          .distance((d) => 80 + (1 - (d.weight || 0.5)) * 120)
          .strength(0.6),
      )
      .force("charge", d3.forceManyBody().strength(-320).distanceMax(400))
      .force("center", d3.forceCenter(this._width / 2, this._height / 2))
      .force(
        "collide",
        d3
          .forceCollide()
          .radius((d) => this._nodeRadius(d) + 10)
          .strength(0.8),
      )
      .force(
        "x",
        d3
          .forceX()
          .x((d) => this._clusterX(d))
          .strength(0.04),
      )
      .force(
        "y",
        d3
          .forceY()
          .y((d) => this._clusterY(d))
          .strength(0.04),
      )
      .alphaDecay(0.03)
      .velocityDecay(0.35);
  }

  _initZoom() {
    this._zoom = d3
      .zoom()
      .scaleExtent([0.1, 5])
      .on("zoom", (event) => {
        this._gRoot.attr("transform", event.transform);
        this._currentZoom = event.transform.k;
        this._updateLabelVisibility();
      });

    this._svg.call(this._zoom);

    // Prevent zoom on double-click (we use double-click for node centering)
    this._svg.on("dblclick.zoom", null);
  }

  _initArrowMarkers() {
    const types = Object.keys(this._colors);
    types.forEach((type) => {
      const color = this._colors[type];
      this._defs
        .append("marker")
        .attr("id", `arrow-${type}`)
        .attr("viewBox", "0 -4 10 8")
        .attr("refX", 22)
        .attr("refY", 0)
        .attr("markerWidth", 5)
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L10,0L0,4")
        .attr("fill", color)
        .attr("opacity", 0.7);
    });

    // Default fallback arrow
    this._defs
      .append("marker")
      .attr("id", "arrow-default")
      .attr("viewBox", "0 -4 10 8")
      .attr("refX", 22)
      .attr("refY", 0)
      .attr("markerWidth", 5)
      .attr("markerHeight", 5)
      .attr("orient", "auto")
      .append("path")
      .attr("d", "M0,-4L10,0L0,4")
      .attr("fill", "#8b949e")
      .attr("opacity", 0.5);
  }

  _bindResizeObserver() {
    const ro = new ResizeObserver(() => {
      const { width, height } = this._container.getBoundingClientRect();
      if (width && height) {
        this._width = width;
        this._height = height;
        this._simulation.force("center", d3.forceCenter(width / 2, height / 2));
        this._simulation.alpha(0.1).restart();
      }
    });
    ro.observe(this._container);
  }

  // -------------------------------------------------------------------------
  // Type-based cluster positioning
  // -------------------------------------------------------------------------

  _clusterX(d) {
    const segments = {
      Property: 0.2,
      Neighborhood: 0.2,
      ZipCode: 0.3,
      MarketSegment: 0.3,
      Agent: 0.7,
      Tool: 0.8,
      Workflow: 0.75,
      Concept: 0.5,
      Topic: 0.5,
      Entity: 0.5,
      Document: 0.4,
      Conversation: 0.6,
    };
    return this._width * (segments[d.type] || 0.5);
  }

  _clusterY(d) {
    const segments = {
      Property: 0.5,
      Neighborhood: 0.3,
      ZipCode: 0.7,
      MarketSegment: 0.6,
      Agent: 0.3,
      Tool: 0.5,
      Workflow: 0.7,
      Concept: 0.4,
      Topic: 0.6,
      Entity: 0.5,
      Document: 0.7,
      Conversation: 0.3,
    };
    return this._height * (segments[d.type] || 0.5);
  }

  // -------------------------------------------------------------------------
  // Radius from importance
  // -------------------------------------------------------------------------

  _nodeRadius(d) {
    const imp = d.metadata?.importance ?? 0.5;
    return (
      RADIUS_MIN + (RADIUS_MAX - RADIUS_MIN) * Math.min(1, Math.max(0, imp))
    );
  }

  // -------------------------------------------------------------------------
  // Public API — render / updateData
  // -------------------------------------------------------------------------

  /**
   * Full render: replace all data and restart simulation.
   * @param {{nodes:object[],edges:object[]}} data
   */
  render(data) {
    this._allNodes = (data.nodes || []).map((n) => ({ ...n }));
    this._allEdges = (data.edges || []).map((e) => ({ ...e }));
    this._applyFilters();
    this._updateDOM();
    this.fitToScreen(false); // fit without animation on first load
  }

  /**
   * Partial update: smoothly transition to new data.
   * @param {{nodes:object[],edges:object[]}} data
   */
  updateData(data) {
    this._allNodes = (data.nodes || []).map((n) => ({ ...n }));
    this._allEdges = (data.edges || []).map((e) => ({ ...e }));
    this._applyFilters();
    this._updateDOM();
  }

  // -------------------------------------------------------------------------
  // Filtering
  // -------------------------------------------------------------------------

  /**
   * @param {string[]} types  Active node type keys; all shown if null.
   */
  filterByNodeTypes(types) {
    this._activeNodeTypes =
      types && types.length < Object.keys(NODE_COLOR_VARS).length
        ? new Set(types)
        : null;
    this._applyFilters();
    this._updateDOM();
  }

  /**
   * @param {string[]} types  Active edge type keys; all shown if null.
   */
  filterByEdgeTypes(types) {
    this._activeEdgeTypes =
      types && types.length < Object.keys(EDGE_DASH).length
        ? new Set(types)
        : null;
    this._applyFilters();
    this._updateDOM();
  }

  _applyFilters() {
    this._nodes = this._activeNodeTypes
      ? this._allNodes.filter((n) => this._activeNodeTypes.has(n.type))
      : this._allNodes;

    const visibleIds = new Set(this._nodes.map((n) => n.id));

    this._edges = this._allEdges.filter((e) => {
      const srcId = typeof e.source === "object" ? e.source.id : e.source;
      const tgtId = typeof e.target === "object" ? e.target.id : e.target;
      const typeOk =
        !this._activeEdgeTypes || this._activeEdgeTypes.has(e.type);
      return typeOk && visibleIds.has(srcId) && visibleIds.has(tgtId);
    });
  }

  // -------------------------------------------------------------------------
  // DOM update — D3 join pattern
  // -------------------------------------------------------------------------

  _updateDOM() {
    // ---- Edges ----
    const edgeSel = this._gEdges
      .selectAll(".edge-line")
      .data(this._edges, (d) => d.id);

    edgeSel
      .exit()
      .transition()
      .duration(300)
      .attr("stroke-opacity", 0)
      .remove();

    const edgeEnter = edgeSel
      .enter()
      .append("line")
      .attr("class", "edge-line")
      .attr("stroke-opacity", 0)
      .attr("stroke", (d) => {
        const srcType = this._resolveNodeType(d.source);
        return this._colors[srcType] || "#8b949e";
      })
      .attr("stroke-width", (d) => Math.max(1, (d.weight || 0.5) * 2))
      .attr("stroke-dasharray", (d) => EDGE_DASH[d.type] || null)
      .attr("marker-end", (d) => {
        const srcType = this._resolveNodeType(d.source);
        return `url(#arrow-${srcType || "default"})`;
      })
      .on("mouseenter", (event, d) => {
        d3.select(event.currentTarget).attr(
          "stroke-width",
          (d.weight || 0.5) * 3 + 1,
        );
        this._showEdgeLabel(event, d);
      })
      .on("mouseleave", (event, d) => {
        d3.select(event.currentTarget).attr(
          "stroke-width",
          Math.max(1, (d.weight || 0.5) * 2),
        );
        this._hideEdgeLabel();
      });

    edgeEnter
      .transition()
      .duration(400)
      .attr("stroke-opacity", (d) => 0.3 + (d.weight || 0.5) * 0.4);

    this._edgeSel = edgeSel.merge(edgeEnter);

    // ---- Nodes ----
    const nodeSel = this._gNodes
      .selectAll(".node-group")
      .data(this._nodes, (d) => d.id);

    nodeSel.exit().transition().duration(300).attr("opacity", 0).remove();

    const nodeEnter = nodeSel
      .enter()
      .append("g")
      .attr("class", "node-group")
      .attr("opacity", 0)
      .attr("role", "button")
      .attr("tabindex", "0")
      .attr("aria-label", (d) => `${d.type} node: ${d.label}`)
      .call(this._makeDragBehavior());

    nodeEnter
      .append("circle")
      .attr("class", "node-circle")
      .attr("r", (d) => this._nodeRadius(d))
      .attr("fill", (d) => this._colors[d.type] || "#58a6ff")
      .attr("fill-opacity", 0.85)
      .attr("stroke", (d) => this._colors[d.type] || "#58a6ff")
      .attr("stroke-opacity", 0.4);

    nodeEnter
      .append("text")
      .attr("class", "node-icon")
      .attr("dy", "0.35em")
      .text((d) => NODE_ICONS[d.type] || "◈");

    nodeEnter.transition().duration(400).attr("opacity", 1);

    // Events
    nodeEnter
      .on("click", (event, d) => {
        event.stopPropagation();
        this._onNodeClick(d);
      })
      .on("dblclick", (event, d) => {
        event.stopPropagation();
        this.centerOnNode(d.id);
      })
      .on("mouseenter", (event, d) => {
        const [x, y] = d3.pointer(event, document.body);
        if (this._callbacks.onNodeHover) this._callbacks.onNodeHover(d, x, y);
        d3.select(event.currentTarget)
          .select(".node-circle")
          .attr("stroke-opacity", 1)
          .attr("stroke-width", 2.5);
      })
      .on("mouseleave", (event) => {
        if (this._callbacks.onNodeUnhover) this._callbacks.onNodeUnhover();
        const isSelected = d3
          .select(event.currentTarget)
          .classed("selected-group");
        d3.select(event.currentTarget)
          .select(".node-circle")
          .attr("stroke-opacity", isSelected ? 1 : 0.4)
          .attr("stroke-width", isSelected ? 3 : 1.5);
      })
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          this._onNodeClick(d);
        }
      })
      .on("contextmenu", (event, d) => {
        event.preventDefault();
        this._showContextMenu(event, d);
      });

    this._nodeSel = nodeSel.merge(nodeEnter);

    // ---- Labels ----
    const labelSel = this._gLabels
      .selectAll(".node-label-text")
      .data(this._nodes, (d) => d.id);

    labelSel.exit().remove();

    const labelEnter = labelSel
      .enter()
      .append("text")
      .attr("class", "node-label node-label-text")
      .attr("dy", (d) => this._nodeRadius(d) + 12)
      .attr("opacity", 0)
      .text((d) =>
        d.label.length > 18 ? d.label.slice(0, 17) + "…" : d.label,
      );

    this._labelSel = labelSel.merge(labelEnter);
    this._updateLabelVisibility();

    // SVG background click: deselect
    this._svg.on("click", () => {
      this.resetHighlights();
      this._selectedNodeId = null;
      if (this._callbacks.onNodeClick) this._callbacks.onNodeClick(null, []);
    });

    // Restart simulation
    this._simulation.nodes(this._nodes).on("tick", () => this._tick());

    this._simulation.force("link").links(this._edges);
    this._simulation.alpha(0.5).restart();
  }

  // -------------------------------------------------------------------------
  // Tick — update positions
  // -------------------------------------------------------------------------

  _tick() {
    if (this._edgeSel) {
      this._edgeSel
        .attr("x1", (d) => this._getX(d.source))
        .attr("y1", (d) => this._getY(d.source))
        .attr("x2", (d) => this._getX(d.target))
        .attr("y2", (d) => this._getY(d.target));
    }

    if (this._nodeSel) {
      this._nodeSel.attr(
        "transform",
        (d) => `translate(${d.x || 0},${d.y || 0})`,
      );
    }

    if (this._labelSel) {
      this._labelSel.attr("x", (d) => d.x || 0).attr("y", (d) => d.y || 0);
    }
  }

  _getX(node) {
    return typeof node === "object" ? node.x || 0 : 0;
  }

  _getY(node) {
    return typeof node === "object" ? node.y || 0 : 0;
  }

  _resolveNodeType(nodeOrId) {
    if (typeof nodeOrId === "object") return nodeOrId.type;
    const found = this._nodes.find((n) => n.id === nodeOrId);
    return found ? found.type : null;
  }

  // -------------------------------------------------------------------------
  // Drag behavior
  // -------------------------------------------------------------------------

  _makeDragBehavior() {
    return d3
      .drag()
      .on("start", (event, d) => {
        if (!event.active) this._simulation.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) this._simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });
  }

  // -------------------------------------------------------------------------
  // Node click — highlight + callback
  // -------------------------------------------------------------------------

  _onNodeClick(d) {
    this._selectedNodeId = d.id;
    this.highlightNode(d.id);

    const neighbors = this._getNeighbors(d.id);
    if (this._callbacks.onNodeClick) {
      this._callbacks.onNodeClick(d, neighbors);
    }
  }

  _getNeighbors(nodeId) {
    const neighborIds = new Set();
    this._edges.forEach((e) => {
      const srcId = typeof e.source === "object" ? e.source.id : e.source;
      const tgtId = typeof e.target === "object" ? e.target.id : e.target;
      if (srcId === nodeId) neighborIds.add(tgtId);
      if (tgtId === nodeId) neighborIds.add(srcId);
    });
    return this._nodes.filter((n) => neighborIds.has(n.id));
  }

  // -------------------------------------------------------------------------
  // Highlight methods
  // -------------------------------------------------------------------------

  /** Highlights a single node and its connected edges + neighbors. */
  highlightNode(id) {
    if (!this._nodeSel) return;
    this._selectedNodeId = id;

    const connectedNodeIds = new Set([id]);
    const connectedEdgeIds = new Set();

    this._edges.forEach((e) => {
      const srcId = typeof e.source === "object" ? e.source.id : e.source;
      const tgtId = typeof e.target === "object" ? e.target.id : e.target;
      if (srcId === id || tgtId === id) {
        connectedEdgeIds.add(e.id);
        connectedNodeIds.add(srcId);
        connectedNodeIds.add(tgtId);
      }
    });

    this._nodeSel
      .classed("selected-group", (d) => d.id === id)
      .attr("opacity", (d) => (connectedNodeIds.has(d.id) ? 1 : 0.2));

    this._nodeSel
      .select(".node-circle")
      .attr("stroke-opacity", (d) =>
        d.id === id ? 1 : connectedNodeIds.has(d.id) ? 0.6 : 0.2,
      )
      .attr("stroke-width", (d) => (d.id === id ? 3 : 1.5))
      .classed("selected", (d) => d.id === id);

    if (this._edgeSel) {
      this._edgeSel
        .attr("stroke-opacity", (d) =>
          connectedEdgeIds.has(d.id) ? 0.9 : 0.04,
        )
        .attr("stroke-width", (d) =>
          connectedEdgeIds.has(d.id)
            ? Math.max(1, (d.weight || 0.5) * 3)
            : Math.max(1, (d.weight || 0.5) * 2),
        );
    }

    if (this._labelSel) {
      this._labelSel.attr("opacity", (d) =>
        connectedNodeIds.has(d.id)
          ? this._currentZoom < this._labelZoomThreshold
            ? 0.9
            : 1
          : 0,
      );
    }
  }

  /**
   * Highlights a path defined by an ordered list of node IDs.
   * @param {string[]} nodeIds
   */
  highlightPath(nodeIds) {
    if (!nodeIds || nodeIds.length === 0) {
      this.resetHighlights();
      return;
    }

    const pathSet = new Set(nodeIds);
    const pathEdgeIds = new Set();

    for (let i = 0; i < nodeIds.length - 1; i++) {
      const a = nodeIds[i],
        b = nodeIds[i + 1];
      this._edges.forEach((e) => {
        const srcId = typeof e.source === "object" ? e.source.id : e.source;
        const tgtId = typeof e.target === "object" ? e.target.id : e.target;
        if ((srcId === a && tgtId === b) || (srcId === b && tgtId === a)) {
          pathEdgeIds.add(e.id);
        }
      });
    }

    if (this._nodeSel) {
      this._nodeSel.attr("opacity", (d) => (pathSet.has(d.id) ? 1 : 0.15));
    }
    if (this._edgeSel) {
      this._edgeSel.attr("stroke-opacity", (d) =>
        pathEdgeIds.has(d.id) ? 1 : 0.05,
      );
    }
  }

  /** Clears all highlights and restores full opacity. */
  resetHighlights() {
    this._selectedNodeId = null;

    if (this._nodeSel) {
      this._nodeSel
        .attr("opacity", 1)
        .classed("selected-group", false)
        .select(".node-circle")
        .classed("selected", false)
        .attr("stroke-opacity", 0.4)
        .attr("stroke-width", 1.5);
    }

    if (this._edgeSel) {
      this._edgeSel
        .attr("stroke-opacity", (d) => 0.3 + (d.weight || 0.5) * 0.4)
        .attr("stroke-width", (d) => Math.max(1, (d.weight || 0.5) * 2));
    }

    this._updateLabelVisibility();
  }

  // -------------------------------------------------------------------------
  // Zoom and pan helpers
  // -------------------------------------------------------------------------

  /**
   * Pan and zoom to center the viewport on a specific node.
   * @param {string} id
   */
  centerOnNode(id) {
    const node = this._nodes.find((n) => n.id === id);
    if (!node || node.x == null) return;

    const scale = Math.min(3, Math.max(1.5, this._currentZoom));
    const tx = this._width / 2 - scale * node.x;
    const ty = this._height / 2 - scale * node.y;

    this._svg
      .transition()
      .duration(600)
      .call(
        this._zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(scale),
      );
  }

  /**
   * Zoom to fit all visible nodes within the viewport.
   * @param {boolean} [animate=true]
   */
  fitToScreen(animate = true) {
    if (!this._nodes.length) return;

    const xs = this._nodes.map((n) => n.x || 0);
    const ys = this._nodes.map((n) => n.y || 0);
    const minX = Math.min(...xs),
      maxX = Math.max(...xs);
    const minY = Math.min(...ys),
      maxY = Math.max(...ys);

    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    const padding = 60;

    const scale = Math.min(
      0.9,
      Math.min(
        (this._width - padding * 2) / gw,
        (this._height - padding * 2) / gh,
      ),
    );
    const tx = (this._width - scale * (minX + maxX)) / 2;
    const ty = (this._height - scale * (minY + maxY)) / 2;

    const transform = d3.zoomIdentity.translate(tx, ty).scale(scale);

    if (animate) {
      this._svg
        .transition()
        .duration(750)
        .call(this._zoom.transform, transform);
    } else {
      this._svg.call(this._zoom.transform, transform);
    }
  }

  // -------------------------------------------------------------------------
  // Label visibility
  // -------------------------------------------------------------------------

  _updateLabelVisibility() {
    if (!this._labelSel) return;

    const show = this._currentZoom >= this._labelZoomThreshold;
    const selectedId = this._selectedNodeId;

    this._labelSel.attr("opacity", (d) => {
      if (selectedId) {
        // In selection mode, labels handled by highlightNode
        const neighborIds = new Set([
          selectedId,
          ...this._getNeighbors(selectedId).map((n) => n.id),
        ]);
        return neighborIds.has(d.id) ? 0.9 : 0;
      }
      return show ? 0.75 : 0;
    });
  }

  // -------------------------------------------------------------------------
  // Edge label on hover
  // -------------------------------------------------------------------------

  _showEdgeLabel(event, d) {
    const tip = document.getElementById("graph-tooltip");
    if (!tip) return;
    const [x, y] = d3.pointer(event, document.body);
    tip.innerHTML = `<div class="tooltip-type">${d.type}</div>`;
    tip.style.left = x + 10 + "px";
    tip.style.top = y - 10 + "px";
    tip.classList.add("visible");
    tip.setAttribute("aria-hidden", "false");
  }

  _hideEdgeLabel() {
    const tip = document.getElementById("graph-tooltip");
    if (tip) {
      tip.classList.remove("visible");
      tip.setAttribute("aria-hidden", "true");
    }
  }

  // -------------------------------------------------------------------------
  // Context menu (right-click)
  // -------------------------------------------------------------------------

  _showContextMenu(event, d) {
    // Remove any existing context menu
    d3.select("#graph-context-menu").remove();

    const menu = d3
      .select(document.body)
      .append("div")
      .attr("id", "graph-context-menu")
      .style("position", "fixed")
      .style("left", event.clientX + "px")
      .style("top", event.clientY + "px")
      .style("background", "var(--bg-overlay)")
      .style("border", "1px solid var(--border-default)")
      .style("border-radius", "6px")
      .style("box-shadow", "0 4px 16px rgba(1,4,9,0.6)")
      .style("z-index", "10000")
      .style("overflow", "hidden")
      .style("min-width", "160px");

    const items = [
      { label: "Center on node", action: () => this.centerOnNode(d.id) },
      { label: "Highlight node", action: () => this.highlightNode(d.id) },
      { label: "Reset highlights", action: () => this.resetHighlights() },
    ];

    items.forEach(({ label, action }) => {
      menu
        .append("div")
        .style("padding", "8px 14px")
        .style("font-size", "12px")
        .style("color", "var(--text-secondary)")
        .style("cursor", "pointer")
        .style("font-family", "var(--font-sans)")
        .text(label)
        .on("mouseenter", function () {
          d3.select(this)
            .style("background", "var(--bg-elevated)")
            .style("color", "var(--text-primary)");
        })
        .on("mouseleave", function () {
          d3.select(this)
            .style("background", null)
            .style("color", "var(--text-secondary)");
        })
        .on("click", () => {
          menu.remove();
          action();
        });
    });

    // Dismiss on next click elsewhere
    const dismiss = () => {
      d3.select("#graph-context-menu").remove();
      document.removeEventListener("click", dismiss);
    };
    setTimeout(() => document.addEventListener("click", dismiss), 50);
  }

  // -------------------------------------------------------------------------
  // Public accessors
  // -------------------------------------------------------------------------

  /** @returns {object|null} Currently selected node data, or null. */
  getSelectedNode() {
    if (!this._selectedNodeId) return null;
    return this._nodes.find((n) => n.id === this._selectedNodeId) || null;
  }

  /**
   * Register a node-click callback (replaces constructor callback).
   * @param {(node:object,neighbors:object[])=>void} cb
   */
  onNodeClick(cb) {
    this._callbacks.onNodeClick = cb;
  }

  /**
   * Register a node-hover callback (replaces constructor callback).
   * @param {(node:object|null,x:number,y:number)=>void} cb
   */
  onNodeHover(cb) {
    this._callbacks.onNodeHover = cb;
  }
}

// Expose globally — app.js constructs this after DOM ready
window.GraphVisualization = GraphVisualization;
