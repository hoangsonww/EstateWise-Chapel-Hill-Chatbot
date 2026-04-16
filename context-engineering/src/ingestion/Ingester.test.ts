import { describe, it, expect, beforeEach } from "vitest";
import { Ingester } from "./Ingester.js";
import { KnowledgeGraph } from "../graph/KnowledgeGraph.js";
import { KnowledgeBase } from "../knowledge-base/KnowledgeBase.js";

describe("Ingester", () => {
  let graph: KnowledgeGraph;
  let kb: KnowledgeBase;
  let ingester: Ingester;

  beforeEach(() => {
    graph = new KnowledgeGraph();
    graph.clear(); // Start with empty graph
    kb = new KnowledgeBase();
    ingester = new Ingester(graph, kb);
  });

  it("should ingest a document source", async () => {
    const source = {
      type: "document",
      data: {
        title: "Test Ingestion Doc",
        content: "This is a document for ingestion testing.",
        source: "test-ingestion",
        tags: ["test"],
      },
    };

    const result = await ingester.ingest(source as any);
    expect(result.documentsCreated).toBe(1);
    expect(result.chunksCreated).toBeGreaterThan(0);
    expect(result.errors.length).toBe(0);

    const stats = kb.getStats();
    expect(stats.documentCount).toBe(1);
  });

  it("should ingest a property source (simulated)", async () => {
    // We need to know what PropertyParser expects.
    // Usually it's a JSON object representing a property.
    const source = {
      type: "property",
      data: {
        zpid: "12345",
        address: "123 Main St",
        price: 500000,
        bedrooms: 3,
        description: "A beautiful home.",
      },
    };

    const result = await ingester.ingest(source as any);
    // Even if it just creates a document, it should be successful.
    expect(result.errors.length).toBe(0);
  });

  it("should handle batch ingestion", async () => {
    const sources = [
      {
        type: "document",
        data: { title: "Doc 1", content: "Content 1", source: "s1" },
      },
      {
        type: "document",
        data: { title: "Doc 2", content: "Content 2", source: "s2" },
      },
    ];

    const result = await ingester.ingestBatch(sources as any);
    expect(result.documentsCreated).toBe(2);
    expect(result.errors.length).toBe(0);
  });
});
