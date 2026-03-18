/**
 * @fileoverview Standalone Express server for the context-engineering system.
 *
 * Starts the full context stack, mounts the REST API at /api/context, serves
 * the D3 visualisation UI from src/ui/public, and sets up a WebSocket endpoint
 * for real-time graph update notifications.
 *
 * Run with:
 *   npm run dev                    # tsx src/serve.ts (port 4200)
 *   CONTEXT_PORT=4201 npm run dev  # custom port
 */

import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { createContextSystem } from "./factory.js";
import { GraphEvent } from "./graph/types.js";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env["CONTEXT_PORT"] ?? "4200", 10);
const __dir = dirname(fileURLToPath(import.meta.url));
const UI_DIR = join(__dir, "ui", "public");

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  // ----- Create system -----
  const system = createContextSystem({
    contextWindow: { maxTokens: 8000, reservedTokens: 1000 },
  });

  console.log("[context-serve] Initialising knowledge base…");
  await system.initialize();
  console.log("[context-serve] Knowledge base ready.");

  // ----- Express app -----
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // API routes
  app.use("/api/context", system.router);

  // Serve static UI
  app.use(express.static(UI_DIR));

  // SPA fallback — any non-API GET returns index.html
  app.get(/^(?!\/api).*$/, (_req, res) => {
    res.sendFile(join(UI_DIR, "index.html"), (err) => {
      if (err) {
        res.status(200).send(`
          <html><body>
            <h1>EstateWise Context Engineering</h1>
            <p>API: <a href="/api/context/health">/api/context/health</a></p>
            <p>Graph: <a href="/api/context/graph">/api/context/graph</a></p>
          </body></html>
        `);
      }
    });
  });

  // ----- HTTP + WebSocket server -----
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws/graph" });

  // Broadcast graph events to all connected WebSocket clients
  function broadcast(type: string, payload: unknown): void {
    const msg = JSON.stringify({
      type,
      payload,
      timestamp: new Date().toISOString(),
    });
    for (const client of wss.clients) {
      if (client.readyState === 1 /* OPEN */) {
        client.send(msg);
      }
    }
  }

  system.graph.on(GraphEvent.NodeAdded, (node) =>
    broadcast("node:added", node),
  );
  system.graph.on(GraphEvent.NodeUpdated, (node) =>
    broadcast("node:updated", node),
  );
  system.graph.on(GraphEvent.NodeRemoved, (nodeId) =>
    broadcast("node:removed", { id: nodeId }),
  );
  system.graph.on(GraphEvent.EdgeAdded, (edge) =>
    broadcast("edge:added", edge),
  );
  system.graph.on(GraphEvent.EdgeRemoved, (edgeId) =>
    broadcast("edge:removed", { id: edgeId }),
  );

  wss.on("connection", (ws) => {
    // Send full graph snapshot on connect
    const snapshot = system.graph.toSnapshot();
    ws.send(
      JSON.stringify({
        type: "graph:snapshot",
        payload: snapshot,
        timestamp: new Date().toISOString(),
      }),
    );
  });

  // ----- Start listening -----
  server.listen(PORT, () => {
    const stats = system.graph.getStats();
    const kb = system.kb.getStats();
    console.log(
      `
┌─────────────────────────────────────────────────────────┐
│  EstateWise Context Engineering Server                   │
├─────────────────────────────────────────────────────────┤
│  HTTP  : http://localhost:${PORT}
│  WS    : ws://localhost:${PORT}/ws/graph
│  API   : http://localhost:${PORT}/api/context
│  UI    : http://localhost:${PORT}/
├─────────────────────────────────────────────────────────┤
│  Graph : ${stats.nodeCount} nodes, ${stats.edgeCount} edges
│  KB    : ${kb.documentCount} docs, ${kb.chunkCount} chunks, ~${kb.totalTokens} tokens
└─────────────────────────────────────────────────────────┘
    `.trim(),
    );
  });
}

main().catch((err: Error) => {
  console.error("[context-serve] Fatal startup error:", err.message);
  process.exit(1);
});
