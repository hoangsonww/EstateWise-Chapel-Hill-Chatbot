import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { Tracer, MetricsRegistry, CostTracker } from "../dist/observability/index.js";

describe("Tracer", () => {
  it("creates spans", () => { const t = new Tracer(); const tid = t.createTrace(); const sid = t.startSpan(tid, "op"); t.endSpan(tid, sid); const done = t.getSpan(tid, sid); assert.ok(done); assert.ok(done.endTime >= done.startTime); });
  it("parent-child", () => { const t = new Tracer(); const tid = t.createTrace(); const pid = t.startSpan(tid, "p"); t.startSpan(tid, "c", pid); assert.equal(t.getTrace(tid).length, 2); });
});
describe("Metrics", () => {
  it("counters", () => { const r = new MetricsRegistry(); r.counter("c").inc(5); r.counter("c").inc(3); assert.equal(r.counter("c").get(), 8); });
  it("histograms", () => { const h = new MetricsRegistry().histogram("h"); for (let i = 1; i <= 100; i++) h.observe(i); assert.ok(h.getPercentile(50) >= 40); });
  it("gauges", () => { const g = new MetricsRegistry().gauge("g"); g.set(10); g.inc(5); g.dec(3); assert.equal(g.get(), 12); });
  it("exports", () => { const r = new MetricsRegistry(); r.counter("c1").inc(); r.histogram("h1").observe(1); r.gauge("g1").set(1); assert.ok(r.getAll().length >= 3); });
});
describe("Cost", () => {
  it("tracks", () => { const t = new CostTracker(); t.record({ requestId: "r1", agentId: "s", model: "sonnet", inputTokens: 1000, outputTokens: 500, cachedTokens: 0, costUsd: 0.01 }); assert.ok(t.getTotalCost() > 0); });
});
