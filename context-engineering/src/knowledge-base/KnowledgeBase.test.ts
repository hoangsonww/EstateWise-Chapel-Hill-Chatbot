import { describe, it, expect, beforeEach } from "vitest";
import { KnowledgeBase } from "./KnowledgeBase.js";

describe("KnowledgeBase", () => {
  let kb: KnowledgeBase;

  beforeEach(() => {
    kb = new KnowledgeBase();
    // We don't call initialize() here because some tests might want to test it
  });

  it("should initialize and seed when empty", async () => {
    await kb.initialize();
    const stats = kb.getStats();
    expect(stats.documentCount).toBeGreaterThan(0);
    expect(stats.chunkCount).toBeGreaterThan(0);
  });

  it("should add and retrieve a document", async () => {
    await kb.initialize();
    const doc = await kb.addDocument({
      title: "Test Doc",
      content: "This is a test document content for testing purposes.",
      sourceType: "test",
      source: "test-source",
      metadata: {
        author: "tester",
        tags: ["test"],
        language: "en",
        accessCount: 0,
      },
    });

    expect(doc.id).toBeDefined();
    expect(doc.chunks.length).toBeGreaterThan(0);

    const retrieved = kb.getDocument(doc.id);
    expect(retrieved).toEqual(doc);
  });

  it("should remove a document", async () => {
    await kb.initialize();
    const doc = await kb.addDocument({
      title: "To Be Removed",
      content: "Content here",
      sourceType: "test",
      source: "test-source",
      metadata: { author: "tester", tags: [], language: "en", accessCount: 0 },
    });

    expect(kb.getDocument(doc.id)).toBeDefined();
    const removed = kb.removeDocument(doc.id);
    expect(removed).toBe(true);
    expect(kb.getDocument(doc.id)).toBeUndefined();
  });

  it("should perform search", async () => {
    await kb.initialize();
    // Use a query related to seed data
    const results = await kb.search("What is EstateWise?", { limit: 2 });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].document).toBeDefined();
    expect(results[0].chunk).toBeDefined();
    expect(results[0].score).toBeGreaterThan(0);
  });

  it("should update a document", async () => {
    await kb.initialize();
    const doc = await kb.addDocument({
      title: "Initial Title",
      content: "Initial content",
      sourceType: "test",
      source: "test-source",
      metadata: { author: "tester", tags: [], language: "en", accessCount: 0 },
    });

    const updated = await kb.updateDocument(doc.id, { title: "Updated Title" });
    expect(updated?.title).toBe("Updated Title");
    expect(kb.getDocument(doc.id)?.title).toBe("Updated Title");
  });

  it("should return stats", async () => {
    await kb.initialize();
    const stats = kb.getStats();
    expect(stats.documentCount).toBeGreaterThan(0);
    expect(stats.chunkCount).toBeGreaterThan(0);
    expect(stats.totalTokens).toBeGreaterThan(0);
    expect(stats.sourceBreakdown["system"]).toBeGreaterThan(0);
  });
});
