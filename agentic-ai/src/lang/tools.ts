import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { randomUUID } from "node:crypto";
import { getEmbeddings, getChatModel, getEmbeddingModelName } from "./llm.js";
import { Pinecone } from "@pinecone-database/pinecone";
import { PineconeStore } from "@langchain/pinecone";
import neo4j, { Driver } from "neo4j-driver";
import { ToolClient } from "../mcp/ToolClient.js";
import { getActiveCostTracker } from "../costs/tracker.js";

/** Alias for LangChain structured tool type. */
export type LangTool = DynamicStructuredTool; // structured tools with Zod schemas

// Shared MCP tool client (started by runtime)
const mcp = new ToolClient();

export interface ToolCallStartEvent {
  callId: string;
  toolName: string;
  params: unknown;
  timestamp: number;
}

export interface ToolCallSuccessEvent extends ToolCallStartEvent {
  durationMs: number;
  output: unknown;
}

export interface ToolCallErrorEvent extends ToolCallStartEvent {
  durationMs: number;
  error: string;
}

export interface ToolObserver {
  onToolStart?(event: ToolCallStartEvent): void;
  onToolSuccess?(event: ToolCallSuccessEvent): void;
  onToolError?(event: ToolCallErrorEvent): void;
}

let observer: ToolObserver | null = null;

/** Register a global observer used to instrument LangChain tool calls. */
export function setToolObserver(next: ToolObserver | null) {
  observer = next;
}

function notifyStart(name: string, params: unknown) {
  const event: ToolCallStartEvent = {
    callId: randomUUID(),
    toolName: name,
    params,
    timestamp: Date.now(),
  };
  observer?.onToolStart?.(event);
  return event;
}

function notifySuccess(
  start: ToolCallStartEvent,
  output: unknown,
): ToolCallSuccessEvent {
  const event: ToolCallSuccessEvent = {
    ...start,
    durationMs: Date.now() - start.timestamp,
    output,
  };
  observer?.onToolSuccess?.(event);
  return event;
}

function notifyError(start: ToolCallStartEvent, error: unknown) {
  const event: ToolCallErrorEvent = {
    ...start,
    durationMs: Date.now() - start.timestamp,
    error: error instanceof Error ? error.message : String(error),
  };
  observer?.onToolError?.(event);
  return event;
}

async function withToolInstrumentation<T>(
  name: string,
  params: unknown,
  fn: () => Promise<T>,
): Promise<T> {
  const start = notifyStart(name, params);
  try {
    const result = await fn();
    notifySuccess(start, result);
    return result;
  } catch (err) {
    notifyError(start, err);
    throw err;
  }
}

/** Start shared MCP client before LangGraph runs tools. */
export async function startMcp() {
  await mcp.start();
}

/** Stop shared MCP client after LangGraph completes. */
export async function stopMcp() {
  await mcp.stop();
}

/** Wrap an MCP tool as a LangChain structured tool. */
export function mcpTool(name: string, schema: z.ZodTypeAny): LangTool {
  return new DynamicStructuredTool({
    name: `mcp:${name}`,
    description: `Call MCP tool ${name}`,
    schema,
    async func(input) {
      const args = typeof input === "string" ? { input } : (input as any);
      return await withToolInstrumentation(`mcp:${name}`, args, async () => {
        const res: any = await mcp.callTool(name, args);
        const content = Array.isArray(res?.content) ? res.content : [];
        const text = content.find((c: any) => c?.type === "text")?.text;
        return text || JSON.stringify(res);
      });
    },
  });
}

export function vectorSearchTool(): LangTool | null {
  const apiKey = process.env.PINECONE_API_KEY;
  const index = process.env.PINECONE_INDEX;
  if (!apiKey || !index) return null;
  return new DynamicStructuredTool({
    name: "retrieval.vectorSearch",
    description:
      "Vector search over property embeddings in Pinecone. Returns topK JSON results.",
    schema: z.object({
      query: z.string(),
      topK: z.number().int().min(1).max(100).default(10),
    }),
    async func(raw) {
      const { query, topK } =
        typeof raw === "string" ? { query: raw, topK: 10 } : (raw as any);
      return await withToolInstrumentation(
        "retrieval.vectorSearch",
        { query, topK },
        async () => {
          const tracker = getActiveCostTracker();
          if (tracker) {
            tracker.recordEmbeddingUsage({
              model: getEmbeddingModelName(),
              inputText: query,
              inputType: "text",
              metadata: { tool: "retrieval.vectorSearch" },
            });
          }
          const pinecone = new Pinecone({ apiKey });
          const pcIndex = pinecone.Index(index);
          const store = await PineconeStore.fromExistingIndex(getEmbeddings(), {
            pineconeIndex: pcIndex,
          });
          const results = await store.similaritySearchWithScore(query, topK);
          return JSON.stringify(
            results.map(([doc, score]) => ({
              score,
              metadata: doc.metadata,
              pageContent: doc.pageContent,
            })),
          );
        },
      );
    },
  });
}

let neoDriver: Driver | null = null;

/** Lazy-init a single Neo4j driver for Cypher tools. */
function getNeoDriver(): Driver {
  if (neoDriver) return neoDriver;
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env as Record<
    string,
    string | undefined
  >;
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) {
    throw new Error(
      "Missing NEO4J_URI/NEO4J_USERNAME/NEO4J_PASSWORD for Neo4j tools",
    );
  }
  neoDriver = neo4j.driver(
    NEO4J_URI,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
  );
  return neoDriver;
}

export function graphCypherQATool(): LangTool | null {
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env as Record<
    string,
    string | undefined
  >;
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) return null;
  return new DynamicStructuredTool({
    name: "graph.cypherQA",
    description:
      "LLM-assisted Cypher generation and execution for Neo4j. Returns JSON results.",
    schema: z.object({ question: z.string() }),
    async func(raw) {
      const { question } =
        typeof raw === "string" ? { question: raw } : (raw as any);
      return await withToolInstrumentation(
        "graph.cypherQA",
        { question },
        async () => {
          const llm = getChatModel();
          const prompt = `You write concise Cypher for a property graph with nodes Property(zpid, city, state, zipcode, price, bedrooms, bathrooms, livingArea), Zip(code), Neighborhood(name) and relationships (Property)-[:IN_ZIP]->(Zip), (Property)-[:IN_NEIGHBORHOOD]->(Neighborhood), and optional similarity edges.
Question: ${question}
Return only JSON: {"cypher":"..."}`;
          const ai = await llm.invoke(prompt as any);
          const text =
            typeof (ai as any).content === "string"
              ? (ai as any).content
              : Array.isArray((ai as any).content)
                ? (ai as any).content.map((p: any) => p?.text || "").join("\n")
                : String((ai as any).content ?? "");
          const jsonText = extractJson(text);
          let cypher = "";
          try {
            const parsed = JSON.parse(jsonText);
            cypher = String(parsed?.cypher || "");
          } catch {
            // last resort: accept raw text
            cypher = text.trim();
          }
          if (!cypher) return JSON.stringify({ error: "No Cypher generated" });
          const driver = getNeoDriver();
          const session = driver.session();
          try {
            const res = await session.run(cypher);
            return JSON.stringify(res.records.map((r) => r.toObject()));
          } finally {
            await session.close();
          }
        },
      );
    },
  });
}

export function graphCypherTool(): LangTool | null {
  const { NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD } = process.env as Record<
    string,
    string | undefined
  >;
  if (!NEO4J_URI || !NEO4J_USERNAME || !NEO4J_PASSWORD) return null;
  return new DynamicStructuredTool({
    name: "graph.cypherQuery",
    description:
      "Execute a raw Cypher query against Neo4j and return JSON results.",
    schema: z.object({ cypher: z.string() }),
    async func(raw) {
      const { cypher } =
        typeof raw === "string" ? { cypher: raw } : (raw as any);
      return await withToolInstrumentation(
        "graph.cypherQuery",
        { cypher },
        async () => {
          const driver = getNeoDriver();
          const session = driver.session();
          try {
            const res = await session.run(cypher);
            return JSON.stringify(res.records.map((r) => r.toObject()));
          } finally {
            await session.close();
          }
        },
      );
    },
  });
}

/**
 * Default MCP toolset exposed to the LangGraph agent. Mirrors the CLI orchestrator.
 */
export function mcpToolset(): LangTool[] {
  // Core MCP tools already supported by the existing orchestrator
  const tools: LangTool[] = [
    mcpTool(
      "util.parseGoal",
      z.object({ text: z.string().describe("Freeform user goal") }),
    ),
    mcpTool(
      "properties.search",
      z.object({
        q: z.string(),
        topK: z.number().int().min(1).max(200).default(50),
      }),
    ),
    mcpTool(
      "properties.lookup",
      z.object({
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipcode: z.string().optional(),
        beds: z.number().optional(),
        baths: z.number().optional(),
        limit: z.number().optional(),
      }),
    ),
    mcpTool(
      "analytics.summarizeSearch",
      z.object({ q: z.string(), topK: z.number().optional() }),
    ),
    mcpTool(
      "analytics.groupByZip",
      z.object({ q: z.string(), topK: z.number().optional() }),
    ),
    mcpTool("graph.explain", z.object({ from: z.number(), to: z.number() })),
    mcpTool(
      "graph.similarityBatch",
      z.object({ zpids: z.array(z.number()), limit: z.number().optional() }),
    ),
    mcpTool(
      "graph.comparePairs",
      z.object({ zpids: z.array(z.number()).min(2) }),
    ),
    mcpTool(
      "map.linkForZpids",
      z.object({ ids: z.array(z.union([z.string(), z.number()])).min(1) }),
    ),
    mcpTool("map.buildLinkByQuery", z.object({ q: z.string() })),
    mcpTool(
      "finance.mortgage",
      z.object({
        price: z.number(),
        downPct: z.number().default(20),
        apr: z.number().default(6.5),
        years: z.number().default(30),
        taxRatePct: z.number().default(1.0),
        insMonthly: z.number().default(120),
        hoaMonthly: z.number().default(0),
      }),
    ),
    mcpTool(
      "finance.affordability",
      z.object({
        monthlyBudget: z.number().optional(),
        annualIncome: z.number().optional(),
        maxDtiPct: z.number().optional(),
        downPct: z.number().optional(),
        apr: z.number().optional(),
        years: z.number().optional(),
        taxRatePct: z.number().optional(),
        insMonthly: z.number().optional(),
        hoaMonthly: z.number().optional(),
      }),
    ),
  ];
  const vec = vectorSearchTool();
  if (vec) tools.push(vec);
  const cypherQA = graphCypherQATool();
  if (cypherQA) tools.push(cypherQA);
  const cypher = graphCypherTool();
  if (cypher) tools.push(cypher);
  return tools;
}

/** Extract a JSON object from a model response (code fence or last braces). */
function extractJson(text: string): string {
  const codeBlock = text.match(/```json\s*([\s\S]*?)```/i);
  if (codeBlock) return codeBlock[1].trim();
  const braces = text.match(/\{[\s\S]*\}\s*$/);
  if (braces) return braces[0];
  return text.trim();
}
