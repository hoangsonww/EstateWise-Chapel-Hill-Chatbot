/**
 * @fileoverview Main ingestion orchestrator for the EstateWise context-engineering system.
 *
 * The Ingester routes incoming IngestionSources to registered domain parsers,
 * persists the resulting nodes/edges to the KnowledgeGraph, and stores documents
 * in the KnowledgeBase. All errors are collected rather than thrown so that a
 * single bad record cannot abort a batch.
 */

import { v4 as uuidv4 } from "uuid";
import type { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import { NodeType, EdgeType } from "../graph/types.js";
import type { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";
import {
  PropertyParser,
  ConversationParser,
  DocumentParser,
} from "./parsers/index.js";
import type {
  IngestionSource,
  IngestionResult,
  IngestionError,
  IngestionPipeline,
  ParsedData,
} from "./types.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Build an empty IngestionResult with zeroed counters. */
function emptyResult(): IngestionResult {
  return {
    nodesCreated: 0,
    edgesCreated: 0,
    documentsCreated: 0,
    chunksCreated: 0,
    errors: [],
    durationMs: 0,
  };
}

/** Merge a secondary result into a primary result in-place. */
function mergeResult(
  primary: IngestionResult,
  secondary: IngestionResult,
): void {
  primary.nodesCreated += secondary.nodesCreated;
  primary.edgesCreated += secondary.edgesCreated;
  primary.documentsCreated += secondary.documentsCreated;
  primary.chunksCreated += secondary.chunksCreated;
  primary.errors.push(...secondary.errors);
}

/**
 * Resolve a node type string to the NodeType enum value.
 * Falls back to NodeType.Entity when the string does not match any known type.
 */
function resolveNodeType(typeStr: string): NodeType {
  const entry = Object.entries(NodeType).find(([, v]) => v === typeStr);
  return entry ? (entry[1] as NodeType) : NodeType.Entity;
}

/**
 * Resolve an edge type string to the EdgeType enum value.
 * Falls back to EdgeType.RELATED_TO when the string does not match.
 */
function resolveEdgeType(typeStr: string): EdgeType {
  const entry = Object.entries(EdgeType).find(([, v]) => v === typeStr);
  return entry ? (entry[1] as EdgeType) : EdgeType.RELATED_TO;
}

// ---------------------------------------------------------------------------
// Ingester
// ---------------------------------------------------------------------------

/**
 * Orchestrates multi-source ingestion into the KnowledgeGraph and KnowledgeBase.
 *
 * Built-in parsers handle the three most common source types (property, conversation,
 * document). Additional parsers can be registered via `registerParser()` to handle
 * domain-specific shapes such as tool_result, agent_output, and neo4j exports.
 */
export class Ingester {
  private readonly _graph: KnowledgeGraph;
  private readonly _kb: KnowledgeBase;
  private readonly _parsers = new Map<string, IngestionPipeline>();

  constructor(graph: KnowledgeGraph, kb: KnowledgeBase) {
    this._graph = graph;
    this._kb = kb;

    // Register the three built-in parsers keyed by source type.
    this.registerParser(new PropertyParser());
    this.registerParser(new ConversationParser());
    this.registerParser(new DocumentParser());
  }

  // -------------------------------------------------------------------------
  // Parser registry
  // -------------------------------------------------------------------------

  /**
   * Register a custom parser.
   * If a parser with the same name is already registered it will be replaced.
   *
   * @param parser - IngestionPipeline implementation to register.
   */
  registerParser(parser: IngestionPipeline): void {
    this._parsers.set(parser.name, parser);
  }

  // -------------------------------------------------------------------------
  // Ingest a single source
  // -------------------------------------------------------------------------

  /**
   * Ingest one IngestionSource into the knowledge system.
   *
   * Routes to the best-matching parser based on source type, then persists
   * all returned nodes, edges, and documents. Errors are collected and
   * returned in the result; they do not throw.
   *
   * @param source - The data source to ingest.
   * @returns A summary of what was created, plus any non-fatal errors.
   */
  async ingest(source: IngestionSource): Promise<IngestionResult> {
    const startMs = Date.now();
    const result = emptyResult();

    try {
      const parsed = await this._route(source);
      await this._persist(parsed, source, result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ source: source.type, message, data: source.data });
    }

    result.durationMs = Date.now() - startMs;
    return result;
  }

  // -------------------------------------------------------------------------
  // Batch ingest
  // -------------------------------------------------------------------------

  /**
   * Ingest multiple IngestionSources sequentially, collecting all results.
   *
   * Each source is processed independently; a failure in one does not block
   * the rest. All stats are summed into a single aggregate IngestionResult.
   *
   * @param sources - Array of data sources to ingest.
   * @returns Aggregated summary across all sources.
   */
  async ingestBatch(sources: IngestionSource[]): Promise<IngestionResult> {
    const overall = emptyResult();
    const wallStart = Date.now();

    for (const source of sources) {
      const partial = await this.ingest(source);
      mergeResult(overall, partial);
    }

    overall.durationMs = Date.now() - wallStart;
    return overall;
  }

  // -------------------------------------------------------------------------
  // Internal routing
  // -------------------------------------------------------------------------

  /**
   * Route a source to the most appropriate registered parser.
   *
   * Resolution order:
   *   1. Parser whose `name` ends with the PascalCase variant of source.type
   *      (e.g. "property" → "PropertyParser").
   *   2. Fallback to the DocumentParser for unrecognised types.
   */
  private async _route(source: IngestionSource): Promise<ParsedData> {
    // Derive expected parser name from source type.
    const typeKey = source.type.replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    const expectedName =
      typeKey.charAt(0).toUpperCase() + typeKey.slice(1) + "Parser";

    const parser =
      this._parsers.get(expectedName) ?? this._parsers.get("DocumentParser");

    if (!parser) {
      throw new Error(`No parser available for source type "${source.type}"`);
    }

    return parser.parse(source);
  }

  // -------------------------------------------------------------------------
  // Persistence
  // -------------------------------------------------------------------------

  /**
   * Persist parsed nodes, edges, and documents into the graph and knowledge base.
   * Mutates `result` in place with creation counts and errors.
   */
  private async _persist(
    parsed: ParsedData,
    source: IngestionSource,
    result: IngestionResult,
  ): Promise<void> {
    // ---------- Nodes ----------
    const labelToId = new Map<string, string>();

    // Capture existing label → id mapping before adding new nodes
    for (const node of this._graph.getNodes()) {
      labelToId.set(node.label, node.id);
    }

    for (const nodeSpec of parsed.nodes) {
      // Skip if a node with this label already exists — treat as upsert-by-label.
      if (labelToId.has(nodeSpec.label)) continue;

      try {
        const id = uuidv4();
        const nodeType = resolveNodeType(nodeSpec.type);
        const added = this._graph.addNode({
          id,
          type: nodeType,
          label: nodeSpec.label,
          properties: nodeSpec.properties,
          metadata: {
            source: String(source.type),
            importance: nodeSpec.importance ?? 0.5,
            tags: [],
          },
        });
        labelToId.set(added.label, added.id);
        result.nodesCreated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({
          source: nodeSpec.label,
          message: `Node creation failed: ${msg}`,
        });
      }
    }

    // ---------- Edges ----------
    for (const edgeSpec of parsed.edges) {
      const sourceId = labelToId.get(edgeSpec.sourceLabel);
      const targetId = labelToId.get(edgeSpec.targetLabel);

      // Skip if either endpoint could not be resolved — they may come from a
      // different ingestion batch (e.g. a conversation mentioning a property
      // that hasn't been ingested yet).
      if (!sourceId || !targetId) continue;

      try {
        const edgeType = resolveEdgeType(edgeSpec.type);
        this._graph.addEdge({
          source: sourceId,
          target: targetId,
          type: edgeType,
          weight: edgeSpec.weight ?? 0.7,
          properties: edgeSpec.properties ?? {},
          metadata: { source: String(source.type), confidence: 1.0 },
        });
        result.edgesCreated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({
          source: `${edgeSpec.sourceLabel} → ${edgeSpec.targetLabel}`,
          message: `Edge creation failed: ${msg}`,
        });
      }
    }

    // ---------- Documents ----------
    for (const docSpec of parsed.documents) {
      try {
        const doc = await this._kb.addDocument({
          title: docSpec.title,
          content: docSpec.content,
          source: docSpec.source,
          sourceType: docSpec.sourceType as
            | "property"
            | "conversation"
            | "document"
            | "tool_result"
            | "agent_output"
            | "system",
          metadata: {
            tags: docSpec.tags ?? [],
            accessCount: 0,
          },
        });
        result.documentsCreated++;
        result.chunksCreated += doc.chunks.length;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({
          source: docSpec.title,
          message: `Document creation failed: ${msg}`,
        });
      }
    }
  }
}
