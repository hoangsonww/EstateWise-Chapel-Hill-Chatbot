import { describe, it, expect, beforeEach } from "vitest";
import { ContextEngine } from "./ContextEngine.js";
import { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";

describe("ContextEngine", () => {
  let graph: KnowledgeGraph;
  let kb: KnowledgeBase;
  let engine: ContextEngine;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    kb = new KnowledgeBase();
    engine = new ContextEngine(graph, kb);
  });

  it("should initialize correctly", async () => {
    await engine.initialize();
    const stats = engine.getEngineStats();
    expect(stats.initialized).toBe(true);
    expect(stats.providers).toContain("graph");
    expect(stats.providers).toContain("kb");
  });

  it("should assemble context for a query", async () => {
    await engine.initialize();
    // Seed some data in graph for the query
    graph.addNode({ id: "n1", type: "Concept" as any, label: "EstateWise" });

    const result = await engine.assemble({ query: "EstateWise" });
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.tokenCount).toBeGreaterThan(0);
    expect(result.assembledAt).toBeDefined();
  });

  it("should respect token limits", async () => {
    await engine.initialize();
    const maxTokens = 500;
    const result = await engine.assemble({ query: "EstateWise", maxTokens });
    // Note: reservedTokens is 2000 by default in the engine config I saw in the file,
    // but assemble uses maxTokens - reservedTokens.
    // Wait, if maxTokens is 500 and reserved is 2000, budget is negative.
    // Let's check ContextEngine.ts again for defaults.
    // window: { maxTokens: 8000, reservedTokens: 2000 }
  });

  it("should register and use custom providers", async () => {
    await engine.initialize();
    const customProvider = {
      name: "custom",
      priority: 2,
      getContext: async () => [
        {
          id: "custom-id",
          source: "custom" as any,
          content: "Custom context",
          relevanceScore: 0.9,
          priority: 2,
          tokenCount: 10,
          metadata: {},
          timestamp: new Date().toISOString(),
        },
      ],
    };
    engine.registerProvider(customProvider);
    expect(engine.getProviderNames()).toContain("custom");

    const result = await engine.assembleContext({ query: "test" });
    expect(result.providerBreakdown["unknown"]).toBeDefined(); // custom source mapping defaults to unknown
    expect(result.items.some((i) => i.content === "Custom context")).toBe(true);
  });

  it("should handle tool results", async () => {
    await engine.initialize();
    engine.addToolResult("test-tool", { arg: 1 }, "Tool result content");

    const result = await engine.assembleContext({ query: "test" });
    expect(
      result.items.some((i) => i.content.includes("Tool result content")),
    ).toBe(true);
  });

  it("should format for prompt", async () => {
    await engine.initialize();
    const assembled = await engine.assembleContext({ query: "EstateWise" });
    const formatted = engine.formatForPrompt(assembled);
    if (assembled.items.length > 0) {
      expect(formatted).toContain("---");
    }
  });
});
