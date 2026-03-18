/**
 * @fileoverview Express router for the context-engineering REST API.
 *
 * Exposes graph, knowledge-base, metrics, ingestion, and assembly endpoints
 * consumed by the D3 visualization UI and external agents. All routes are
 * mounted under `/api/context` by the host server.
 *
 * Factory usage:
 *   const router = createContextRouter(graph, kb, engine, metrics);
 *   app.use("/api/context", router);
 */

import { Router, json as expressJson } from "express";
import type { Request, Response, NextFunction } from "express";
import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import type { ContextEngine } from "../context/ContextEngine.js";
import type { ContextMetrics } from "../monitoring/ContextMetrics.js";
import {
  handleGetGraph,
  handleGetNodes,
  handleGetNodeById,
  handleGetEdges,
  handleGetGraphStats,
  handleSearchGraph,
  handleSearchKb,
  handleGetDocuments,
  handleGetKbStats,
  handleGetMetrics,
  handleGetTimeSeries,
  handleIngest,
  handleAssemble,
} from "./handlers.js";

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Build and return a fully configured Express Router for context-engineering.
 *
 * @param graph   - The live KnowledgeGraph instance.
 * @param kb      - The live KnowledgeBase instance.
 * @param engine  - The live ContextEngine instance.
 * @param metrics - The live ContextMetrics instance.
 * @returns A configured Express Router. Mount it at your chosen base path.
 */
export function createContextRouter(
  graph: KnowledgeGraph,
  kb: KnowledgeBase,
  engine: ContextEngine,
  metrics: ContextMetrics,
): Router {
  const router = Router();

  // Parse JSON bodies for POST endpoints
  router.use(expressJson());

  // ---------------------------------------------------------------------------
  // Graph routes
  // ---------------------------------------------------------------------------

  /**
   * GET /graph
   * Full graph payload (nodes + edges) formatted for D3 force simulation.
   * Query params: ?limit=<n> (default 1000, max 5000)
   */
  router.get("/graph", (req: Request, res: Response) => {
    void handleGetGraph(req, res, graph);
  });

  /**
   * GET /graph/nodes
   * All nodes with an optional type filter.
   * Query params: ?type=Property&limit=500
   */
  router.get("/graph/nodes", (req: Request, res: Response) => {
    void handleGetNodes(req, res, graph);
  });

  /**
   * GET /graph/nodes/:id
   * Single node by ID with its incident edges and optional immediate neighbours.
   * Query params: ?neighbors=true (default true)
   */
  router.get("/graph/nodes/:id", (req: Request, res: Response) => {
    void handleGetNodeById(req, res, graph);
  });

  /**
   * GET /graph/edges
   * All edges with an optional type filter.
   * Query params: ?type=SIMILAR_TO&limit=2000
   */
  router.get("/graph/edges", (req: Request, res: Response) => {
    void handleGetEdges(req, res, graph);
  });

  /**
   * GET /graph/stats
   * Aggregate topology statistics for the graph.
   */
  router.get("/graph/stats", (req: Request, res: Response) => {
    void handleGetGraphStats(req, res, graph);
  });

  /**
   * GET /graph/search
   * Full-text search across node labels and properties.
   * Query params: ?q=<query>&limit=20
   */
  router.get("/graph/search", (req: Request, res: Response) => {
    void handleSearchGraph(req, res, graph);
  });

  // ---------------------------------------------------------------------------
  // Knowledge Base routes
  // ---------------------------------------------------------------------------

  /**
   * GET /kb/search
   * Multi-strategy knowledge-base search.
   * Query params: ?q=<query>&limit=10&strategy=hybrid
   */
  router.get("/kb/search", (req: Request, res: Response) => {
    void handleSearchKb(req, res, kb);
  });

  /**
   * GET /kb/documents
   * List all documents with optional source-type filter.
   * Query params: ?sourceType=property&limit=100
   */
  router.get("/kb/documents", (req: Request, res: Response) => {
    void handleGetDocuments(req, res, kb);
  });

  /**
   * GET /kb/stats
   * Knowledge-base aggregate statistics.
   */
  router.get("/kb/stats", (req: Request, res: Response) => {
    void handleGetKbStats(req, res, kb);
  });

  // ---------------------------------------------------------------------------
  // Metrics routes
  // ---------------------------------------------------------------------------

  /**
   * GET /metrics
   * Full metrics snapshot across all subsystems.
   */
  router.get("/metrics", (req: Request, res: Response) => {
    void handleGetMetrics(req, res, metrics);
  });

  /**
   * GET /metrics/timeseries
   * Time-series data for a specific metric.
   * Query params: ?metric=context_assembly&window=3600000
   */
  router.get("/metrics/timeseries", (req: Request, res: Response) => {
    void handleGetTimeSeries(req, res, metrics);
  });

  // ---------------------------------------------------------------------------
  // Ingestion route
  // ---------------------------------------------------------------------------

  /**
   * POST /ingest
   * Ingest a new document into the knowledge system.
   * Body: { type, title, content, tags? }
   */
  router.post("/ingest", (req: Request, res: Response) => {
    void handleIngest(req, res, kb, graph);
  });

  // ---------------------------------------------------------------------------
  // Assembly route
  // ---------------------------------------------------------------------------

  /**
   * POST /assemble
   * Assemble a token-budgeted context window for an agent.
   * Body: { query, agentRole?, maxTokens? }
   */
  router.post("/assemble", (req: Request, res: Response) => {
    void handleAssemble(req, res, engine);
  });

  // ---------------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------------

  /**
   * GET /health
   * Lightweight liveness check that returns system stats.
   */
  router.get("/health", (_req: Request, res: Response) => {
    const graphStats = graph.getStats();
    const kbStats = kb.getStats();
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      graph: {
        nodeCount: graphStats.nodeCount,
        edgeCount: graphStats.edgeCount,
      },
      kb: {
        documentCount: kbStats.documentCount,
        chunkCount: kbStats.chunkCount,
      },
    });
  });

  // ---------------------------------------------------------------------------
  // Error handler (must be last, with 4 params)
  // ---------------------------------------------------------------------------
  router.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error("[context-api] unhandled error:", err.message);
      res.status(500).json({ error: err.message ?? "Internal server error" });
    },
  );

  return router;
}
