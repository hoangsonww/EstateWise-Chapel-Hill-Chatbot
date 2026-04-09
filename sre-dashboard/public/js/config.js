/* ============================================================
   EstateWise SRE Dashboard — Configuration
   ============================================================ */

"use strict";

/* global CONFIG */

const CONFIG = {
  // Service definitions
  services: [
    {
      id: "backend",
      name: "Backend",
      port: 3001,
      healthPath: "/health",
      metricsPath: "/metrics",
      color: "#58a6ff",
      baseRps: 80,
      baseCpu: 35,
      baseMem: 52,
    },
    {
      id: "frontend",
      name: "Frontend",
      port: 3000,
      healthPath: "/api/health",
      metricsPath: null,
      color: "#3fb950",
      baseRps: 45,
      baseCpu: 22,
      baseMem: 38,
    },
    {
      id: "mcp",
      name: "MCP",
      port: 8787,
      healthPath: "/health",
      metricsPath: "/metrics",
      color: "#bc8cff",
      baseRps: 30,
      baseCpu: 28,
      baseMem: 45,
    },
    {
      id: "agentic-ai",
      name: "Agentic AI",
      port: 4318,
      healthPath: "/health",
      metricsPath: "/metrics",
      color: "#f0883e",
      baseRps: 12,
      baseCpu: 42,
      baseMem: 58,
    },
    {
      id: "grpc",
      name: "gRPC",
      port: 50051,
      healthPath: "/health",
      metricsPath: "/metrics",
      color: "#d29922",
      baseRps: 20,
      baseCpu: 18,
      baseMem: 32,
    },
    {
      id: "deployment-control",
      name: "Deploy Ctrl",
      port: 4100,
      healthPath: "/health",
      metricsPath: null,
      color: "#79c0ff",
      baseRps: 5,
      baseCpu: 12,
      baseMem: 24,
    },
  ],

  // SLO definitions
  slos: {
    apiAvailability: {
      target: 0.999, // 99.9%
      window: "30d",
      budgetSeconds: 2592000 * 0.001, // 43.2 min error budget in 30 days
    },
    p95Latency: {
      target: 500, // ms
      window: "30d",
    },
    errorRate: {
      target: 0.001, // 0.1%
      window: "30d",
    },
  },

  // AWS regions
  regions: [
    {
      id: "us-east-1",
      name: "us-east-1",
      shortName: "USE1",
      weight: 0.4,
      primary: true,
      color: "#58a6ff",
    },
    {
      id: "us-west-2",
      name: "us-west-2",
      shortName: "USW2",
      weight: 0.3,
      primary: false,
      color: "#3fb950",
    },
    {
      id: "eu-west-1",
      name: "eu-west-1",
      shortName: "EUW1",
      weight: 0.2,
      primary: false,
      color: "#bc8cff",
    },
    {
      id: "ap-southeast-1",
      name: "ap-southeast-1",
      shortName: "APSE1",
      weight: 0.1,
      primary: false,
      color: "#d29922",
    },
  ],

  // Canary rollout stages (percentages)
  canaryStages: [10, 25, 50, 100],

  // Blue/Green config — which services participate
  blueGreen: {
    services: ["backend", "frontend"],
    versions: {
      blue: { backend: "v2.3.1", frontend: "v2.3.0" },
      green: { backend: "v2.4.0", frontend: "v2.4.0" },
    },
  },

  // HPA scaling limits
  hpa: {
    backend: { min: 2, max: 10 },
    frontend: { min: 2, max: 8 },
    mcp: { min: 2, max: 6 },
    "agentic-ai": { min: 1, max: 4 },
    grpc: { min: 2, max: 12 },
    "deployment-control": { min: 1, max: 2 },
  },

  // Refresh cadence
  refreshInterval: 1000, // ms
  historyLength: 60, // data points kept per time series

  // Endpoints — populated at runtime from /api/config
  endpoints: {
    prometheus: "http://localhost:9090",
    deploymentControl: "http://localhost:4100",
    datadog: null,
    backend: "http://localhost:3001",
    frontend: "http://localhost:3000",
    mcp: "http://localhost:8787",
    agenticAi: "http://localhost:4318",
    grpc: "http://localhost:50051",
  },

  // Alert thresholds
  thresholds: {
    errorRateWarn: 0.001, // 0.1% — warn
    errorRateCrit: 0.005, // 0.5% — critical
    p95LatencyWarn: 400, // ms
    p95LatencyCrit: 600, // ms
    cpuWarn: 70, // %
    cpuCrit: 85, // %
    memoryWarn: 75, // %
    memoryCrit: 90, // %
    burnRateFast: 14.4, // 1-hour burn rate → exhaust in 30d
    burnRateSlow: 1.0, // nominal
    errorBudgetWarn: 30, // % remaining — start warning
    errorBudgetCrit: 10, // % remaining — critical
  },

  // Agentic AI tool categories
  toolCategories: [
    { id: "property", name: "Property", color: "#58a6ff" },
    { id: "market", name: "Market", color: "#3fb950" },
    { id: "finance", name: "Finance", color: "#d29922" },
    { id: "graph", name: "Graph", color: "#bc8cff" },
    { id: "commute", name: "Commute", color: "#f0883e" },
    { id: "system", name: "System", color: "#79c0ff" },
  ],

  // DORA elite thresholds
  doraElite: {
    deployFrequency: 1.0, // >= 1 deploy/day
    leadTime: 24, // <= 24 hours
    mttr: 60, // <= 60 minutes
    changeFailureRate: 5, // <= 5%
  },
};
