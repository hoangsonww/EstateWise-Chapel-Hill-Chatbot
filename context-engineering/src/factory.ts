/**
 * @fileoverview Convenience factory that wires the full context-engineering system.
 *
 * `createContextSystem()` is the single entry point for standing up a complete
 * EstateWise context-engineering stack from zero config. It instantiates and
 * connects KnowledgeGraph, KnowledgeBase, ContextEngine, Ingester,
 * ContextMetrics, MCP tools, and the Express API router.
 *
 * Neo4j sync is opt-in — omit `neo4j.enabled` or set it to false to run the
 * system entirely in-memory with no external dependencies.
 */

import type { Router } from "express";
import { KnowledgeGraph } from "./graph/index.js";
import { KnowledgeBase } from "./knowledge-base/index.js";
import { ContextEngine } from "./context/ContextEngine.js";
import { Ingester } from "./ingestion/Ingester.js";
import { ContextMetrics } from "./monitoring/ContextMetrics.js";
import { createContextTools, type ContextToolDef } from "./mcp/tools.js";
import {
  createContextResources,
  type ContextResourceDef,
} from "./mcp/resources.js";
import { createContextRouter } from "./api/router.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Optional Neo4j connection for graph persistence. */
export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  enabled: boolean;
}

/** Top-level configuration for the context system. */
export interface ContextSystemConfig {
  /** Neo4j connection settings. If omitted or `enabled: false` the graph runs in-memory only. */
  neo4j?: Neo4jConfig;
  /** Token window settings for the ContextEngine. */
  contextWindow?: {
    /** Maximum token budget for assembled contexts. Default: 8000. */
    maxTokens: number;
    /** Tokens reserved for the system prompt boilerplate. Default: 1000. */
    reservedTokens: number;
  };
  /** Port number used by the standalone serve.ts process. Default: 4200. */
  apiPort?: number;
}

// ---------------------------------------------------------------------------
// System handle
// ---------------------------------------------------------------------------

/** The fully assembled context-engineering system. */
export interface ContextSystem {
  /** In-memory knowledge graph seeded with EstateWise domain data. */
  graph: KnowledgeGraph;
  /** In-memory knowledge base seeded with ten domain reference documents. */
  kb: KnowledgeBase;
  /** Context assembly engine wired to the graph and KB. */
  engine: ContextEngine;
  /** Ingestion orchestrator with built-in property, conversation, and document parsers. */
  ingester: Ingester;
  /** Metrics collector backed by the live graph and KB. */
  metrics: ContextMetrics;
  /** Ten MCP tool definitions ready for registration with any MCP server. */
  tools: ContextToolDef[];
  /** Four MCP resource definitions for graph stats, KB stats, metrics, and typed nodes. */
  resources: ContextResourceDef[];
  /** Express Router exposing the full context REST API (mount at /api/context). */
  router: Router;
  /**
   * Initialise the knowledge base (seeds domain content on first run).
   * Must be called before the first search or assembly operation.
   */
  initialize(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create and wire the complete context-engineering system.
 *
 * The system is ready to use immediately after the call returns, but the
 * knowledge base is not yet seeded — call `system.initialize()` to seed it
 * before the first search or context assembly.
 *
 * @param config - Optional configuration overrides.
 * @returns A fully wired ContextSystem handle.
 *
 * @example
 * ```typescript
 * const system = createContextSystem({ contextWindow: { maxTokens: 16000, reservedTokens: 2000 } });
 * await system.initialize();
 *
 * app.use("/api/context", system.router);
 * ```
 */
export function createContextSystem(
  config?: Partial<ContextSystemConfig>,
): ContextSystem {
  // ----- Core stores -----
  const graph = new KnowledgeGraph();
  const kb = new KnowledgeBase();

  // ----- Context engine -----
  const engine = new ContextEngine(graph, kb, {
    window: {
      maxTokens: config?.contextWindow?.maxTokens ?? 8000,
      reservedTokens: config?.contextWindow?.reservedTokens ?? 1000,
      allocationStrategy: "priority",
    },
    enableCache: true,
  });

  // ----- Ingestion -----
  const ingester = new Ingester(graph, kb);

  // ----- Metrics -----
  const metrics = new ContextMetrics(graph, kb);

  // ----- MCP tools & resources -----
  const tools = createContextTools(graph, kb, engine);
  const resources = createContextResources(graph, kb, metrics);

  // ----- API router -----
  const router = createContextRouter(graph, kb, engine, metrics);

  // ----- Neo4j sync (opt-in) -----
  if (config?.neo4j?.enabled) {
    void (async () => {
      try {
        // Dynamically import to keep Neo4j optional (tree-shaking friendly)
        const { Neo4jSyncManager } = await import("./graph/index.js");
        const sync = new Neo4jSyncManager({
          uri: config.neo4j!.uri,
          username: config.neo4j!.username,
          password: config.neo4j!.password,
        });
        // Attach graph listener if the manager supports it
        if (
          typeof (sync as unknown as { setGraph: (g: KnowledgeGraph) => void })
            .setGraph === "function"
        ) {
          (
            sync as unknown as { setGraph: (g: KnowledgeGraph) => void }
          ).setGraph(graph);
        }
        console.log("[context-system] Neo4j sync manager created");
      } catch (err) {
        console.warn(
          "[context-system] Neo4j sync failed — running in-memory only:",
          (err as Error).message,
        );
      }
    })();
  }

  return {
    graph,
    kb,
    engine,
    ingester,
    metrics,
    tools,
    resources,
    router,
    async initialize(): Promise<void> {
      await kb.initialize();
    },
  };
}
