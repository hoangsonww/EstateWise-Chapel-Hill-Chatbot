import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { PromptRegistry, GroundingValidator, buildCachedPromptLayers, estimateCacheSavings, IntentClassificationSchema, SUPERVISOR_SYSTEM_PROMPT, PROPERTY_SEARCH_SYSTEM_PROMPT, MARKET_ANALYST_SYSTEM_PROMPT, DATA_ENRICHMENT_SYSTEM_PROMPT, RECOMMENDATION_SYSTEM_PROMPT, CONVERSATION_MANAGER_SYSTEM_PROMPT, QUALITY_REVIEWER_SYSTEM_PROMPT } from "../dist/prompts/index.js";

describe("Versioning", () => {
  it("registers", () => { const r = new PromptRegistry(); r.register("t", "1.0.0", "c", "i"); assert.equal(r.getActive("t").version, "1.0.0"); });
  it("rolls back", () => { const r = new PromptRegistry(); r.register("t", "1.0.0", "a", "f"); r.register("t", "2.0.0", "b", "s"); r.rollback("t", "1.0.0"); assert.equal(r.getActive("t").version, "1.0.0"); });
});
describe("System Prompts", () => {
  it("exports all 7", () => { for (const p of [SUPERVISOR_SYSTEM_PROMPT, PROPERTY_SEARCH_SYSTEM_PROMPT, MARKET_ANALYST_SYSTEM_PROMPT, DATA_ENRICHMENT_SYSTEM_PROMPT, RECOMMENDATION_SYSTEM_PROMPT, CONVERSATION_MANAGER_SYSTEM_PROMPT, QUALITY_REVIEWER_SYSTEM_PROMPT]) assert.ok(p && p.length > 50); });
  it("has XML tags", () => { for (const p of [SUPERVISOR_SYSTEM_PROMPT, PROPERTY_SEARCH_SYSTEM_PROMPT]) { assert.ok(p.includes("<role>")); assert.ok(p.includes("<instructions>")); } });
  it("has grounding", () => { for (const p of [PROPERTY_SEARCH_SYSTEM_PROMPT, MARKET_ANALYST_SYSTEM_PROMPT, DATA_ENRICHMENT_SYSTEM_PROMPT]) { const l = p.toLowerCase(); assert.ok(l.includes("invent") || l.includes("fabricate") || l.includes("never")); } });
});
describe("Grounding", () => {
  it("detects violations on empty tools", () => { const v = new GroundingValidator().validate("Price is $999,999 at 123 Fake St", []); assert.ok(v.length > 0); });
  it("returns array", () => { const v = new GroundingValidator().validate("Looks good.", [{ price: 450000 }]); assert.ok(Array.isArray(v)); });
});
describe("Cache", () => {
  it("builds layers", () => { const r = buildCachedPromptLayers({ systemPrompt: "Agent", taskInstruction: "Find" }); assert.ok(r.length > 0); });
  it("estimates savings", () => { const s = estimateCacheSavings({ systemPrompt: "A".repeat(8000), taskInstruction: "Find" }); assert.ok(s.savingsRatio >= 0); });
});
describe("Schemas", () => {
  it("validates", () => { const r = IntentClassificationSchema.safeParse({ intents: [{ type: "property_search", confidence: 0.9, extractedEntities: {} }], requiredAgents: ["ps"], executionOrder: ["ps"], dependencyGraph: {}, isFollowUp: false, reasoning: "t" }); assert.equal(r.success, true); });
  it("rejects invalid", () => { assert.equal(IntentClassificationSchema.safeParse({ intents: [] }).success, false); });
});
