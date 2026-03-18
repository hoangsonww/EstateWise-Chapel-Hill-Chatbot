/**
 * @fileoverview Request handler implementations for the context-engineering API router.
 *
 * Each handler parses query params / body, calls the appropriate subsystem method,
 * formats a JSON response, and handles errors gracefully. Handlers are plain
 * async functions so they can be unit-tested in isolation from Express.
 */

import type { Request, Response } from "express";
import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import type { ContextEngine } from "../context/ContextEngine.js";
import type { ContextMetrics } from "../monitoring/ContextMetrics.js";
import { NodeType } from "../graph/types.js";

// ---------------------------------------------------------------------------
// Helper — safe integer parse from query string
// ---------------------------------------------------------------------------

function qInt(val: unknown, fallback: number, max?: number): number {
  const n = parseInt(String(val), 10);
  if (Number.isNaN(n) || n < 1) return fallback;
  return max != null ? Math.min(n, max) : n;
}

// ---------------------------------------------------------------------------
// Graph handlers
// ---------------------------------------------------------------------------

/** GET /api/context/graph — full D3 graph payload */
export async function handleGetGraph(
  req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const limit = qInt(req.query["limit"], 1000, 5000);
    const nodes = graph.getNodes().slice(0, limit);
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = graph
      .getEdges()
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));

    res.json({
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        importance: n.metadata.importance,
        source: n.metadata.source,
        createdAt: n.metadata.createdAt,
        tags: n.metadata.tags,
        properties: n.properties,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight,
        properties: e.properties,
      })),
      stats: graph.getStats(),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/graph/nodes — all nodes with optional type filter */
export async function handleGetNodes(
  req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const typeFilter = req.query["type"] as string | undefined;
    const limit = qInt(req.query["limit"], 500, 5000);

    const nodes = graph
      .findNodes((n) => (typeFilter ? n.type === typeFilter : true))
      .slice(0, limit);

    res.json({
      type: typeFilter ?? "all",
      count: nodes.length,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        importance: n.metadata.importance,
        source: n.metadata.source,
        createdAt: n.metadata.createdAt,
        degree: graph.getDegree(n.id),
        properties: n.properties,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/graph/nodes/:id — single node with optional neighbours */
export async function handleGetNodeById(
  req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const nodeId = String(req.params["id"] ?? "");
    const node = graph.getNode(nodeId);
    if (!node) {
      res.status(404).json({ error: `Node not found: ${nodeId}` });
      return;
    }

    const includeNeighbors = req.query["neighbors"] !== "false";
    const neighborIds = includeNeighbors
      ? graph.getNeighbors(node.id, "both")
      : [];
    const neighbors = neighborIds
      .map((id) => graph.getNode(id))
      .filter(Boolean)
      .map(
        (n) =>
          n && {
            id: n.id,
            type: n.type,
            label: n.label,
            importance: n.metadata.importance,
          },
      );

    res.json({
      ...node,
      degree: graph.getDegree(node.id),
      inDegree: graph.getInDegree(node.id),
      outDegree: graph.getOutDegree(node.id),
      edges: graph.findEdges(
        (e) => e.source === node.id || e.target === node.id,
      ),
      neighbors,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/graph/edges — all edges with optional type filter */
export async function handleGetEdges(
  req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const typeFilter = req.query["type"] as string | undefined;
    const limit = qInt(req.query["limit"], 2000, 10000);

    const edges = graph
      .findEdges((e) => (typeFilter ? e.type === typeFilter : true))
      .slice(0, limit);

    res.json({
      type: typeFilter ?? "all",
      count: edges.length,
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: e.type,
        weight: e.weight,
        properties: e.properties,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/graph/stats */
export async function handleGetGraphStats(
  _req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    res.json({ ...graph.getStats(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/graph/search?q=<query> */
export async function handleSearchGraph(
  req: Request,
  res: Response,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const q = String(req.query["q"] ?? "")
      .toLowerCase()
      .trim();
    const limit = qInt(req.query["limit"], 20, 200);

    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const nodes = graph
      .findNodes(
        (n) =>
          n.label.toLowerCase().includes(q) ||
          JSON.stringify(n.properties).toLowerCase().includes(q),
      )
      .slice(0, limit);

    res.json({
      query: q,
      count: nodes.length,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type,
        label: n.label,
        importance: n.metadata.importance,
        degree: graph.getDegree(n.id),
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Knowledge Base handlers
// ---------------------------------------------------------------------------

/** GET /api/context/kb/search?q=<query>&limit=<n> */
export async function handleSearchKb(
  req: Request,
  res: Response,
  kb: KnowledgeBase,
): Promise<void> {
  try {
    const q = String(req.query["q"] ?? "").trim();
    const limit = qInt(req.query["limit"], 10, 50);
    const strategy = (req.query["strategy"] as string | undefined) ?? "hybrid";

    if (!q) {
      res.status(400).json({ error: "Query parameter 'q' is required" });
      return;
    }

    const validStrategies = ["semantic", "keyword", "hybrid", "graph_enhanced"];
    const safeStrategy = validStrategies.includes(strategy)
      ? (strategy as "semantic" | "keyword" | "hybrid" | "graph_enhanced")
      : "hybrid";

    const results = await kb.search(q, { strategy: safeStrategy, limit });

    res.json({
      query: q,
      strategy: safeStrategy,
      count: results.length,
      results: results.map((r) => ({
        score: r.score,
        strategy: r.strategy,
        title: r.document.title,
        source: r.document.source,
        sourceType: r.document.sourceType,
        excerpt: r.chunk.content.slice(0, 400),
        highlights: r.highlights,
        chunkId: r.chunk.id,
        docId: r.document.id,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/kb/documents */
export async function handleGetDocuments(
  req: Request,
  res: Response,
  kb: KnowledgeBase,
): Promise<void> {
  try {
    const sourceType = req.query["sourceType"] as string | undefined;
    const limit = qInt(req.query["limit"], 100, 1000);

    // Collect all source types from stats when no filter is given
    const stats = kb.getStats();
    const sourceTypes = sourceType
      ? [sourceType]
      : Object.keys(stats.sourceBreakdown);

    const collected: ReturnType<typeof kb.getDocumentsBySource> = [];
    for (const st of sourceTypes) {
      collected.push(...kb.getDocumentsBySource(st));
    }

    const sliced = collected.slice(0, limit);

    res.json({
      sourceType: sourceType ?? "all",
      count: sliced.length,
      documents: sliced.map((d) => ({
        id: d.id,
        title: d.title,
        source: d.source,
        sourceType: d.sourceType,
        createdAt: d.createdAt,
        chunkCount: d.chunks.length,
        tags: d.metadata.tags ?? [],
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/kb/stats */
export async function handleGetKbStats(
  _req: Request,
  res: Response,
  kb: KnowledgeBase,
): Promise<void> {
  try {
    res.json({ ...kb.getStats(), timestamp: new Date().toISOString() });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Metrics handlers
// ---------------------------------------------------------------------------

/** GET /api/context/metrics */
export async function handleGetMetrics(
  _req: Request,
  res: Response,
  contextMetrics: ContextMetrics,
): Promise<void> {
  try {
    res.json(contextMetrics.getSnapshot());
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

/** GET /api/context/metrics/timeseries?metric=<name>&window=<ms> */
export async function handleGetTimeSeries(
  req: Request,
  res: Response,
  contextMetrics: ContextMetrics,
): Promise<void> {
  try {
    const metric = String(req.query["metric"] ?? "context_assembly");
    const windowMs = req.query["window"]
      ? parseInt(String(req.query["window"]), 10)
      : undefined;

    const series = contextMetrics.getTimeSeries(metric, windowMs);

    res.json({
      metric,
      windowMs: windowMs ?? null,
      count: series.length,
      series,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Ingest handler
// ---------------------------------------------------------------------------

/** POST /api/context/ingest — ingest new data */
export async function handleIngest(
  req: Request,
  res: Response,
  kb: KnowledgeBase,
  graph: KnowledgeGraph,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const title = String(body["title"] ?? "Untitled");
    const content = String(body["content"] ?? "");
    const type = String(body["type"] ?? "document") as
      | "property"
      | "conversation"
      | "document"
      | "tool_result"
      | "agent_output"
      | "system";
    const tags = Array.isArray(body["tags"]) ? (body["tags"] as string[]) : [];

    if (!content.trim()) {
      res
        .status(400)
        .json({ error: "Field 'content' is required and cannot be empty" });
      return;
    }

    const doc = await kb.addDocument({
      title,
      content,
      source: `api:ingest:${Date.now()}`,
      sourceType: type,
      metadata: { author: "api", tags: tags as string[], accessCount: 0 },
    });

    // Mirror as a Document node in the graph
    const nodeLabel = `Document:${title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}`;
    const existing = graph.findNodes((n) => n.label === nodeLabel);
    if (existing.length === 0) {
      const { v4: uuidv4 } = await import("uuid");
      graph.addNode({
        id: uuidv4(),
        type: NodeType.Document,
        label: nodeLabel,
        properties: { title, docId: doc.id, sourceType: type, tags },
        metadata: { source: "api", importance: 0.5, tags },
      });
    }

    res.status(201).json({
      ingested: true,
      docId: doc.id,
      title,
      chunkCount: doc.chunks.length,
      sourceType: type,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}

// ---------------------------------------------------------------------------
// Assemble handler
// ---------------------------------------------------------------------------

/** POST /api/context/assemble — assemble context for a query */
export async function handleAssemble(
  req: Request,
  res: Response,
  engine: ContextEngine,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>;
    const query = String(body["query"] ?? "");
    const agentRole = String(body["agentRole"] ?? "assistant");
    const maxTokens =
      typeof body["maxTokens"] === "number" ? body["maxTokens"] : 4000;

    if (!query.trim()) {
      res.status(400).json({ error: "Field 'query' is required" });
      return;
    }

    const assembled = await engine.assemble({ query, agentRole, maxTokens });

    res.json({
      query,
      agentRole,
      tokenBudget: maxTokens,
      tokensUsed: assembled.tokenCount,
      itemCount: assembled.items.length,
      assembledAt: assembled.assembledAt,
      items: assembled.items.map((item) => ({
        source: item.source,
        type: item.type,
        priority: item.priority,
        tokenCount: item.tokenCount,
        content: item.content,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
}
