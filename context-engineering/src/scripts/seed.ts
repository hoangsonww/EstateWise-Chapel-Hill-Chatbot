/**
 * @fileoverview Standalone seed script for the EstateWise context-engineering system.
 *
 * Creates a full context system, initialises the knowledge base, and logs
 * detailed stats about the seeded graph and KB content.
 *
 * Run with:
 *   npm run seed
 */

import { createContextSystem } from "../factory.js";

async function main(): Promise<void> {
  console.log("[seed] Creating context system…");
  const system = createContextSystem();

  console.log("[seed] Initialising knowledge base…");
  await system.initialize();

  const graphStats = system.graph.getStats();
  const kbStats = system.kb.getStats();

  console.log("\n=== Context System Seed Stats ===\n");

  console.log("Graph:");
  console.log(`  Nodes    : ${graphStats.nodeCount}`);
  console.log(`  Edges    : ${graphStats.edgeCount}`);
  console.log(`  Avg Deg  : ${graphStats.avgDegree.toFixed(2)}`);
  console.log(`  Density  : ${graphStats.density.toFixed(6)}`);
  console.log("  By type  :", graphStats.nodesByType);

  console.log("\nKnowledge Base:");
  console.log(`  Documents: ${kbStats.documentCount}`);
  console.log(`  Chunks   : ${kbStats.chunkCount}`);
  console.log(`  Tokens   : ~${kbStats.totalTokens}`);
  console.log("  By source:", kbStats.sourceBreakdown);

  console.log("\n[seed] Done.");
}

main().catch((err: Error) => {
  console.error("[seed] Fatal error:", err.message);
  process.exit(1);
});
