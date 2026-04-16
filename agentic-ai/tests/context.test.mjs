import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { TokenBudgetManager, MultiLevelCache, ConversationStore, CoherenceManager, HybridRAGPipeline, STRATEGIES, getStrategyForAgent } from "../dist/context/index.js";

describe("Token Budget", () => {
  it("allocates", () => { assert.ok(new TokenBudgetManager().getAllocation(5).total > 0); });
  it("detects compaction", () => { const m = new TokenBudgetManager({ maxTokens: 1000, compactThreshold: 0.5 }); m.trackUsage(600); assert.equal(m.shouldCompact(), true); });
  it("estimates tokens", () => { assert.ok(new TokenBudgetManager().estimateTokens("Hello") > 0); });
});
describe("Cache", () => {
  it("stores", () => { const c = new MultiLevelCache(); c.set("k", "v", 60000); assert.equal(c.get("k"), "v"); });
  it("expires", async () => { const c = new MultiLevelCache(); c.set("k", "v", 1); await new Promise(r => setTimeout(r, 10)); assert.equal(c.get("k"), undefined); });
  it("invalidates", () => { const c = new MultiLevelCache(); c.set("p:1", "a", 60000); c.set("p:2", "b", 60000); c.set("m:1", "c", 60000); assert.equal(c.invalidatePattern("p:"), 2); });
});
describe("ConversationStore", () => {
  it("manages messages", () => { const s = new ConversationStore(); const id = s.create("t1"); s.appendMessage(id, { role: "user", content: "Hi", timestamp: new Date() }); assert.equal(s.get(id).messages.length, 1); });
  it("tracks entities", () => { const s = new ConversationStore(); const id = s.create("t2"); s.trackEntity(id, "property", "123 Main"); const e = s.get(id).entities; assert.ok(e.property && e.property.length > 0); });
  it("persists and reloads snapshots", () => {
    const persistPath = path.join(
      os.tmpdir(),
      `estatewise-conversation-${Date.now()}.json`,
    );
    const s1 = new ConversationStore({ persistPath });
    const id = s1.create("persist-1");
    s1.appendMessage(id, { role: "user", content: "hello" });
    s1.trackEntity(id, "city", "Austin");
    const s2 = new ConversationStore({ persistPath });
    const restored = s2.get("persist-1");
    assert.ok(restored);
    assert.equal(restored.messages.length, 1);
    assert.ok(restored.entities.city.includes("Austin"));
    fs.unlinkSync(persistPath);
  });
});
describe("Coherence", () => {
  it("tracks turns", () => { const m = new CoherenceManager(); for (let i = 0; i < 6; i++) { m.addMessage("user", "M"); m.addMessage("assistant", "R"); } assert.ok(m.getContext().totalTurns >= 6); });
  it("detects summary needed", () => { const m = new CoherenceManager(3); m.addMessage("user", "1"); m.addMessage("user", "2"); m.addMessage("user", "3"); assert.equal(m.needsSummaryUpdate(), true); m.updateSummary("s"); m.addMessage("user", "4"); assert.equal(m.needsSummaryUpdate(), false); });
});
describe("Strategies", () => {
  it("maps agents to strategies", () => { const s = getStrategyForAgent("property-search"); assert.ok(s); assert.ok(s.name); assert.ok(typeof s.compose === "function"); });
  it("has all 5", () => { const keys = Object.keys(STRATEGIES); assert.ok(keys.length >= 5); assert.ok(STRATEGIES["sliding-window"]); assert.ok(STRATEGIES["rag-first"]); assert.ok(STRATEGIES["hierarchical"]); });
});
describe("RAG", () => {
  it("retrieves", async () => { const p = new HybridRAGPipeline({ minScore: 0.001 }, async () => [{ type: "vector", content: "r", score: 0.9, metadata: {}, tokenCount: 50 }]); assert.ok((await p.retrieve("q")).length >= 1); });
  it("formats XML", () => { assert.ok(new HybridRAGPipeline().formatAsXml([{ type: "vector", content: "T", score: 0.9, metadata: {}, tokenCount: 10 }]).length > 5); });
});
