"use strict";

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 4200;

// ---------------------------------------------------------------------------
// Static file serving
// ---------------------------------------------------------------------------
app.use(express.static(path.join(__dirname, "public")));

// ---------------------------------------------------------------------------
// /api/config — data provider configuration
// ---------------------------------------------------------------------------
app.get("/api/config", (_req, res) => {
  res.json({
    mode: process.env.DATA_MODE || "mock",
    endpoints: {
      prometheus: process.env.PROMETHEUS_URL || null,
      deploymentControl:
        process.env.DEPLOYMENT_CONTROL_URL || "http://localhost:4100",
      datadog: process.env.DATADOG_API_URL || null,
      backend: process.env.BACKEND_URL || "http://localhost:3001",
      frontend: process.env.FRONTEND_URL || "http://localhost:3000",
      mcp: process.env.MCP_URL || "http://localhost:8787",
      agenticAi: process.env.AGENTIC_AI_URL || "http://localhost:4318",
      grpc: process.env.GRPC_URL || "http://localhost:50051",
    },
    refreshInterval: parseInt(process.env.REFRESH_INTERVAL || "1000", 10),
    version: "1.0.0",
  });
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// SPA fallback
// ---------------------------------------------------------------------------
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`EstateWise SRE Dashboard running at http://localhost:${PORT}`);
});
