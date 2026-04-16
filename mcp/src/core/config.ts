const toInt = (v: string | undefined, d: number) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : d;
};

const toFloat = (v: string | undefined, d: number) => {
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};

const toBool = (v: string | undefined, d: boolean) => {
  if (v == null) return d;
  const s = v.toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
};

const toCsvList = (v: string | undefined): string[] => {
  if (!v) return [];
  return v
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
};

/**
 * MCP server configuration resolved from environment variables with defaults.
 */
export const config = {
  serverName: process.env.MCP_SERVER_NAME || "estatewise-mcp",
  serverVersion: process.env.MCP_SERVER_VERSION || "0.2.0",
  apiBaseUrl:
    process.env.API_BASE_URL || "https://estatewise-backend.vercel.app",
  frontendBaseUrl:
    process.env.FRONTEND_BASE_URL || "https://estatewise.vercel.app",
  a2aBaseUrl: process.env.A2A_BASE_URL || "http://localhost:4318",
  a2aTimeoutMs: toInt(process.env.A2A_TIMEOUT_MS, 15_000),
  a2aPollMs: toInt(process.env.A2A_POLL_MS, 1_000),
  a2aWaitTimeoutMs: toInt(process.env.A2A_WAIT_TIMEOUT_MS, 120_000),
  webTimeoutMs: toInt(process.env.WEB_TIMEOUT_MS, 12_000),
  cacheTtlMs: toInt(process.env.MCP_CACHE_TTL_MS, 30_000),
  cacheMax: toInt(process.env.MCP_CACHE_MAX, 200),
  toolTimeoutMs: Math.max(
    1_000,
    toInt(process.env.MCP_TOOL_TIMEOUT_MS, 30_000),
  ),
  toolMaxArgBytes: Math.max(
    1_024,
    toInt(process.env.MCP_TOOL_MAX_ARG_BYTES, 65_536),
  ),
  toolMaxConcurrent: Math.max(
    1,
    toInt(process.env.MCP_TOOL_MAX_CONCURRENT, 32),
  ),
  toolAllowList: toCsvList(process.env.MCP_TOOL_ALLOWLIST),
  toolDenyList: toCsvList(process.env.MCP_TOOL_DENYLIST),
  tokenRequireSecret: toBool(process.env.MCP_TOKEN_REQUIRE_SECRET, false),
  tokenPersistPath: process.env.MCP_TOKEN_PERSIST_PATH || "",
  liveDataSnapshotPath:
    process.env.LIVE_ZILLOW_SNAPSHOT_PATH ||
    "../data/live-zillow/output/live_zillow_snapshot.normalized.json",
  liveDataMaxResults: Math.max(
    1,
    toInt(process.env.LIVE_ZILLOW_MAX_RESULTS, 25),
  ),
  liveDataStaleHours: Math.max(
    1,
    toInt(process.env.LIVE_ZILLOW_STALE_HOURS, 72),
  ),
  liveDataMinQualityScore: Math.min(
    1,
    Math.max(0, toFloat(process.env.LIVE_ZILLOW_MIN_QUALITY_SCORE, 0)),
  ),
  debug: toBool(process.env.MCP_DEBUG, false),
};
