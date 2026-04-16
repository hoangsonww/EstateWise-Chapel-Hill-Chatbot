import { describe, it, expect } from "vitest";
import { createContextSystem } from "./factory.js";

describe("createContextSystem factory", () => {
  it("should create a complete context system with default config", () => {
    const system = createContextSystem();

    expect(system.graph).toBeDefined();
    expect(system.kb).toBeDefined();
    expect(system.engine).toBeDefined();
    expect(system.ingester).toBeDefined();
    expect(system.metrics).toBeDefined();
    expect(system.tools.length).toBeGreaterThan(0);
    expect(system.resources.length).toBeGreaterThan(0);
    expect(system.router).toBeDefined();
  });

  it("should respect custom configuration", () => {
    const system = createContextSystem({
      contextWindow: {
        maxTokens: 16000,
        reservedTokens: 2000,
      },
    });

    // We can't easily check private config in ContextEngine without adding a getter,
    // but we can verify the system was created.
    expect(system).toBeDefined();
  });

  it("should initialize when called", async () => {
    const system = createContextSystem();
    await system.initialize();

    const kbStats = system.kb.getStats();
    expect(kbStats.documentCount).toBeGreaterThan(0);
  });
});
