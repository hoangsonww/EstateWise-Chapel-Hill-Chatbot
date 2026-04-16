import type { AgentRuntime } from "../a2a/types.js";

const defaultRuntimeTools = [
  "util.parseGoal",
  "properties.lookup",
  "properties.search",
  "properties.searchAdvanced",
  "analytics.summarizeSearch",
  "analytics.groupByZip",
  "graph.explain",
  "graph.similar",
  "graph.comparePairs",
  "graph.pathMatrix",
  "graph.neighborhood",
  "map.linkForZpids",
  "map.buildLinkByQuery",
  "finance.mortgage",
  "finance.affordability",
  "web.search",
  "web.fetch",
  "live.zillow.search",
  "context.search",
  "context.assembleContext",
  "context.findRelated",
  "context.graphOverview",
  "context.ingestDocument",
  "context.getMetrics",
  "context.nodeDetail",
] as const;

const langgraphRuntimeTools = [
  "util.parseGoal",
  "properties.search",
  "properties.lookup",
  "analytics.summarizeSearch",
  "analytics.groupByZip",
  "web.search",
  "web.fetch",
  "live.zillow.search",
  "graph.explain",
  "graph.similarityBatch",
  "graph.comparePairs",
  "map.linkForZpids",
  "map.buildLinkByQuery",
  "finance.mortgage",
  "finance.affordability",
] as const;

export type RequiredToolsMode = "off" | "warn" | "strict";

export function parseRequiredToolsMode(
  value: string | undefined,
): RequiredToolsMode {
  if (!value) return "warn";
  const normalized = value.toLowerCase();
  if (
    normalized === "off" ||
    normalized === "warn" ||
    normalized === "strict"
  ) {
    return normalized;
  }
  return "warn";
}

export function getRequiredToolsForRuntime(
  runtime: AgentRuntime | "langgraph",
): string[] {
  if (runtime === "langgraph") return [...langgraphRuntimeTools];
  if (runtime === "default") return [...defaultRuntimeTools];
  return [];
}
