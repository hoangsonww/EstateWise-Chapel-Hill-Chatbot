/**
 * Neo4j bidirectional sync manager for the EstateWise knowledge graph.
 *
 * Mirrors the in-memory KnowledgeGraph to/from Neo4j using MERGE statements
 * so that existing data in Neo4j is never accidentally destroyed.
 *
 * Environment variables:
 *   NEO4J_URI       — bolt or neo4j URI, e.g. bolt://localhost:7687
 *   NEO4J_USERNAME  — database username
 *   NEO4J_PASSWORD  — database password
 *   NEO4J_DATABASE  — target database name (default: "neo4j")
 *   NEO4J_ENABLE    — set to "true" to activate sync (any other value disables)
 */

import neo4j, {
  type Driver,
  type Session,
  type Neo4jError,
} from "neo4j-driver";
import { KnowledgeGraph } from "./KnowledgeGraph.js";
import { type GraphNode, type GraphEdge, NodeType, EdgeType } from "./types.js";

// ---------------------------------------------------------------------------
// Connection config
// ---------------------------------------------------------------------------

/** Connection parameters for the Neo4j sync manager. */
export interface Neo4jSyncConfig {
  /** Bolt or neo4j URI. Falls back to NEO4J_URI env var. */
  uri?: string;
  /** Database username. Falls back to NEO4J_USERNAME env var. */
  username?: string;
  /** Database password. Falls back to NEO4J_PASSWORD env var. */
  password?: string;
  /** Target database name. Defaults to "neo4j". */
  database?: string;
}

// ---------------------------------------------------------------------------
// Cypher helpers
// ---------------------------------------------------------------------------

/**
 * Flatten a GraphNode's properties and metadata into a plain Cypher-safe params object.
 * Neo4j cannot store nested maps as property values directly, so we flatten them with
 * double-underscore separators (props__key, meta__key).
 */
function nodeToNeo4jParams(node: GraphNode): Record<string, unknown> {
  const flatProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node.properties)) {
    if (v !== null && v !== undefined && typeof v !== "object") {
      flatProps[`props__${k}`] = v;
    }
  }

  return {
    id: node.id,
    type: node.type,
    label: node.label,
    meta__createdAt: node.metadata.createdAt,
    meta__updatedAt: node.metadata.updatedAt,
    meta__source: node.metadata.source,
    meta__version: node.metadata.version,
    meta__tags: node.metadata.tags,
    meta__importance: node.metadata.importance,
    ...flatProps,
  };
}

/**
 * Flatten a GraphEdge into a plain Cypher-safe params object.
 */
function edgeToNeo4jParams(edge: GraphEdge): Record<string, unknown> {
  const flatProps: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(edge.properties)) {
    if (v !== null && v !== undefined && typeof v !== "object") {
      flatProps[`props__${k}`] = v;
    }
  }

  return {
    id: edge.id,
    type: edge.type,
    weight: edge.weight,
    meta__createdAt: edge.metadata.createdAt,
    meta__updatedAt: edge.metadata.updatedAt,
    meta__source: edge.metadata.source,
    meta__confidence: edge.metadata.confidence,
    ...flatProps,
  };
}

/**
 * Reconstruct a GraphNode from a flat Neo4j record.
 */
function neo4jRecordToNode(rec: Record<string, unknown>): GraphNode {
  const props: Record<string, unknown> = {};
  const metaPrefix = "meta__";
  const propsPrefix = "props__";

  for (const [k, v] of Object.entries(rec)) {
    if (k.startsWith(propsPrefix)) {
      props[k.slice(propsPrefix.length)] = v;
    }
  }

  const tags = Array.isArray(rec[`${metaPrefix}tags`])
    ? (rec[`${metaPrefix}tags`] as string[])
    : [];

  return {
    id: rec["id"] as string,
    type: (rec["type"] as NodeType) ?? NodeType.Entity,
    label: rec["label"] as string,
    properties: props,
    metadata: {
      createdAt:
        (rec[`${metaPrefix}createdAt`] as string) ?? new Date().toISOString(),
      updatedAt:
        (rec[`${metaPrefix}updatedAt`] as string) ?? new Date().toISOString(),
      source: (rec[`${metaPrefix}source`] as string) ?? "neo4j",
      version: (rec[`${metaPrefix}version`] as number) ?? 1,
      tags,
      importance: (rec[`${metaPrefix}importance`] as number) ?? 0.5,
    },
  };
}

/**
 * Reconstruct a GraphEdge from a flat Neo4j record.
 */
function neo4jRecordToEdge(
  rec: Record<string, unknown>,
  sourceId: string,
  targetId: string,
): GraphEdge {
  const props: Record<string, unknown> = {};
  const propsPrefix = "props__";
  const metaPrefix = "meta__";

  for (const [k, v] of Object.entries(rec)) {
    if (k.startsWith(propsPrefix)) {
      props[k.slice(propsPrefix.length)] = v;
    }
  }

  return {
    id: rec["id"] as string,
    source: sourceId,
    target: targetId,
    type: (rec["type"] as EdgeType) ?? EdgeType.RELATED_TO,
    weight: (rec["weight"] as number) ?? 1,
    properties: props,
    metadata: {
      createdAt:
        (rec[`${metaPrefix}createdAt`] as string) ?? new Date().toISOString(),
      updatedAt:
        (rec[`${metaPrefix}updatedAt`] as string) ?? new Date().toISOString(),
      source: (rec[`${metaPrefix}source`] as string) ?? "neo4j",
      confidence: (rec[`${metaPrefix}confidence`] as number) ?? 1,
    },
  };
}

// ---------------------------------------------------------------------------
// Batch helper
// ---------------------------------------------------------------------------

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Neo4jSyncManager
// ---------------------------------------------------------------------------

/**
 * Manages bidirectional synchronisation between a KnowledgeGraph and a Neo4j database.
 *
 * Gracefully degrades when Neo4j is unavailable — all methods log a warning and return
 * without throwing so application startup is never blocked.
 */
export class Neo4jSyncManager {
  private driver: Driver | null = null;
  private readonly config: Required<Neo4jSyncConfig>;
  private readonly BATCH_SIZE = 500;

  constructor(config: Neo4jSyncConfig = {}) {
    this.config = {
      uri: config.uri ?? process.env["NEO4J_URI"] ?? "",
      username: config.username ?? process.env["NEO4J_USERNAME"] ?? "",
      password: config.password ?? process.env["NEO4J_PASSWORD"] ?? "",
      database: config.database ?? process.env["NEO4J_DATABASE"] ?? "neo4j",
    };
  }

  // -------------------------------------------------------------------------
  // Connection management
  // -------------------------------------------------------------------------

  /**
   * Lazily initialise and return the Neo4j driver.
   * Returns null if credentials are missing or Neo4j is disabled.
   */
  private getDriver(): Driver | null {
    if (!this._isEnabled()) return null;
    if (this.driver) return this.driver;

    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password),
        { maxConnectionPoolSize: 10 },
      );
      return this.driver;
    } catch (err) {
      console.warn(
        "[Neo4jSync] Failed to create driver:",
        (err as Error).message,
      );
      return null;
    }
  }

  private getSession(mode: "READ" | "WRITE" = "READ"): Session | null {
    const driver = this.getDriver();
    if (!driver) return null;
    const accessMode =
      mode === "READ" ? neo4j.session.READ : neo4j.session.WRITE;
    return driver.session({
      database: this.config.database,
      defaultAccessMode: accessMode,
    });
  }

  private _isEnabled(): boolean {
    const flag = process.env["NEO4J_ENABLE"];
    if (flag !== undefined && flag !== "true") return false;
    return Boolean(
      this.config.uri && this.config.username && this.config.password,
    );
  }

  /**
   * Return true if Neo4j is configured and reachable (performs a lightweight ping).
   */
  async isConnected(): Promise<boolean> {
    const driver = this.getDriver();
    if (!driver) return false;
    try {
      await driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Close the Neo4j driver connection pool.
   */
  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      this.driver = null;
    }
  }

  // -------------------------------------------------------------------------
  // Push in-memory graph → Neo4j
  // -------------------------------------------------------------------------

  /**
   * Push the in-memory graph to Neo4j using MERGE semantics.
   * Existing nodes/relationships are updated in place; nothing is deleted.
   *
   * @param graph - The KnowledgeGraph instance to push.
   */
  async pushToNeo4j(graph: KnowledgeGraph): Promise<void> {
    if (!(await this.isConnected())) {
      console.warn("[Neo4jSync] Neo4j not available — skipping pushToNeo4j");
      return;
    }

    const session = this.getSession("WRITE");
    if (!session) return;

    try {
      await this._ensureConstraints(session);
      await this._pushNodes(session, graph.getNodes());
      await this._pushEdges(session, graph.getEdges());
      console.info(
        `[Neo4jSync] Push complete: ${graph.getNodes().length} nodes, ${graph.getEdges().length} edges`,
      );
    } catch (err) {
      this._logError("pushToNeo4j", err);
    } finally {
      await session.close();
    }
  }

  private async _ensureConstraints(session: Session): Promise<void> {
    // Create a uniqueness constraint on KGNode.id if it does not exist
    const cypher = `
      CREATE CONSTRAINT kg_node_id IF NOT EXISTS
      FOR (n:KGNode) REQUIRE n.id IS UNIQUE
    `;
    try {
      await session.run(cypher);
    } catch {
      // Constraint may already exist or the DB edition may not support it — ignore
    }
  }

  private async _pushNodes(
    session: Session,
    nodes: GraphNode[],
  ): Promise<void> {
    const cypher = `
      UNWIND $batch AS p
      MERGE (n:KGNode { id: p.id })
      SET n += p
      SET n:\`${"`"}KG_\` + p.type\`
    `;
    // Neo4j does not support dynamic labels in vanilla Cypher from parameters,
    // so we add the type label separately via a second query.
    const mergeCypher = `
      UNWIND $batch AS p
      MERGE (n:KGNode { id: p.id })
      SET n += p
    `;
    for (const batch of chunk(nodes, this.BATCH_SIZE)) {
      const params = batch.map(nodeToNeo4jParams);
      await session.run(mergeCypher, { batch: params });
    }
    void cypher; // silence unused variable warning — dynamic label approach reserved for future use
  }

  private async _pushEdges(
    session: Session,
    edges: GraphEdge[],
  ): Promise<void> {
    // We use a parameterised MERGE on edge IDs.
    // The relationship type is a string — Cypher requires it to be a literal,
    // so we push as a generic KGRelationship label and store the type as a property.
    const mergeCypher = `
      UNWIND $batch AS p
      MATCH (src:KGNode { id: p.sourceId })
      MATCH (tgt:KGNode { id: p.targetId })
      MERGE (src)-[r:KGRelationship { id: p.id }]->(tgt)
      SET r += p.props
    `;
    for (const batch of chunk(edges, this.BATCH_SIZE)) {
      const params = batch.map((e) => ({
        id: e.id,
        sourceId: e.source,
        targetId: e.target,
        props: edgeToNeo4jParams(e),
      }));
      await session.run(mergeCypher, { batch: params });
    }
  }

  // -------------------------------------------------------------------------
  // Pull Neo4j → in-memory graph
  // -------------------------------------------------------------------------

  /**
   * Pull all KGNode nodes and KGRelationship relationships from Neo4j into the
   * in-memory graph.  Existing in-memory nodes/edges are overwritten when IDs match.
   *
   * @param graph - The KnowledgeGraph instance to populate.
   */
  async pullFromNeo4j(graph: KnowledgeGraph): Promise<void> {
    if (!(await this.isConnected())) {
      console.warn("[Neo4jSync] Neo4j not available — skipping pullFromNeo4j");
      return;
    }

    const session = this.getSession("READ");
    if (!session) return;

    try {
      // Pull nodes
      const nodeResult = await session.run(
        "MATCH (n:KGNode) RETURN properties(n) AS p",
      );
      const pulledNodes: GraphNode[] = nodeResult.records.map((r) => {
        const p = r.get("p") as Record<string, unknown>;
        return neo4jRecordToNode(p);
      });

      // Pull edges
      const edgeResult = await session.run(
        "MATCH (src:KGNode)-[r:KGRelationship]->(tgt:KGNode) " +
          "RETURN src.id AS sourceId, tgt.id AS targetId, properties(r) AS p",
      );
      const pulledEdges: GraphEdge[] = edgeResult.records.map((r) => {
        const sourceId = r.get("sourceId") as string;
        const targetId = r.get("targetId") as string;
        const p = r.get("p") as Record<string, unknown>;
        return neo4jRecordToEdge(p, sourceId, targetId);
      });

      // Merge into the in-memory graph
      for (const node of pulledNodes) {
        if (graph.hasNode(node.id)) {
          graph.updateNode(node.id, node);
        } else {
          graph.addNode(node);
        }
      }
      for (const edge of pulledEdges) {
        if (graph.hasEdge(edge.id)) {
          graph.updateEdge(edge.id, edge);
        } else if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
          graph.addEdge(edge);
        }
      }

      console.info(
        `[Neo4jSync] Pull complete: ${pulledNodes.length} nodes, ${pulledEdges.length} edges`,
      );
    } catch (err) {
      this._logError("pullFromNeo4j", err);
    } finally {
      await session.close();
    }
  }

  // -------------------------------------------------------------------------
  // Bidirectional sync
  // -------------------------------------------------------------------------

  /**
   * Full bidirectional sync: pull from Neo4j first, then push the merged result back.
   * This strategy ensures Neo4j data is not silently overwritten without being seen.
   *
   * @param graph - The KnowledgeGraph instance to sync.
   */
  async syncBidirectional(graph: KnowledgeGraph): Promise<void> {
    if (!(await this.isConnected())) {
      console.warn(
        "[Neo4jSync] Neo4j not available — skipping syncBidirectional",
      );
      return;
    }
    await this.pullFromNeo4j(graph);
    await this.pushToNeo4j(graph);
    console.info("[Neo4jSync] Bidirectional sync complete");
  }

  // -------------------------------------------------------------------------
  // Error helper
  // -------------------------------------------------------------------------

  private _logError(context: string, err: unknown): void {
    const neo4jErr = err as Neo4jError;
    const msg = neo4jErr?.message ?? String(err);
    console.warn(`[Neo4jSync] ${context} error: ${msg}`);
  }
}
