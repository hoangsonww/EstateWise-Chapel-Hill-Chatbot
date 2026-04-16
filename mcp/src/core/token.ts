import * as crypto from "crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

/**
 * MCP Token Management
 * Handles generation, validation, and refresh of MCP access tokens.
 */

export interface MCPToken {
  token: string;
  type: "bearer";
  expiresAt: number;
  issuedAt: number;
  scope?: string[];
  metadata?: Record<string, unknown>;
}

export interface MCPTokenPayload {
  sub: string; // Subject (client ID or user ID)
  iat: number; // Issued at
  exp: number; // Expiration
  scope?: string[];
  metadata?: Record<string, unknown>;
}

const TOKEN_TTL_MS = parseInt(process.env.MCP_TOKEN_TTL_MS || "3600000", 10); // 1 hour default
const REFRESH_TOKEN_TTL_MS = parseInt(
  process.env.MCP_REFRESH_TOKEN_TTL_MS || "2592000000",
  10,
); // 30 days
const PERSIST_PATH =
  config.tokenPersistPath && config.tokenPersistPath.trim().length > 0
    ? path.resolve(config.tokenPersistPath.trim())
    : null;

const EPHEMERAL_SECRET_KEY = crypto.randomBytes(32).toString("hex");
const HAS_CONFIGURED_SECRET = Boolean(process.env.MCP_TOKEN_SECRET);

// In-memory token storage with optional persistence.
const tokenStore = new Map<string, MCPTokenPayload>();
const refreshTokenStore = new Map<string, { sub: string; exp: number }>();

interface PersistedTokenState {
  version: 1;
  savedAt: string;
  tokens: Array<[string, MCPTokenPayload]>;
  refreshTokens: Array<[string, { sub: string; exp: number }]>;
}

function getSecretKey(): string {
  if (HAS_CONFIGURED_SECRET) return process.env.MCP_TOKEN_SECRET as string;
  if (config.tokenRequireSecret) {
    throw new Error(
      "MCP_TOKEN_SECRET is required when MCP_TOKEN_REQUIRE_SECRET=true",
    );
  }
  return EPHEMERAL_SECRET_KEY;
}

function loadPersistedState(): void {
  if (!PERSIST_PATH || !fs.existsSync(PERSIST_PATH)) return;
  try {
    const raw = fs.readFileSync(PERSIST_PATH, "utf8");
    const parsed = JSON.parse(raw) as PersistedTokenState;
    const tokens = Array.isArray(parsed.tokens) ? parsed.tokens : [];
    const refreshTokens = Array.isArray(parsed.refreshTokens)
      ? parsed.refreshTokens
      : [];
    tokenStore.clear();
    refreshTokenStore.clear();
    for (const [token, payload] of tokens) {
      if (!token || !payload || typeof payload.sub !== "string") continue;
      tokenStore.set(token, payload);
    }
    for (const [token, payload] of refreshTokens) {
      if (!token || !payload || typeof payload.sub !== "string") continue;
      refreshTokenStore.set(token, payload);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn(
      `[mcp-token] Failed to load persisted token state from ${PERSIST_PATH}; continuing with empty in-memory stores. ${message}`,
    );
    tokenStore.clear();
    refreshTokenStore.clear();
  }
}

function persistState(): void {
  if (!PERSIST_PATH) return;
  fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
  const payload: PersistedTokenState = {
    version: 1,
    savedAt: new Date().toISOString(),
    tokens: Array.from(tokenStore.entries()),
    refreshTokens: Array.from(refreshTokenStore.entries()),
  };
  const tempPath = `${PERSIST_PATH}.tmp-${process.pid}-${Date.now()}`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), "utf8");
    fs.renameSync(tempPath, PERSIST_PATH);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // eslint-disable-next-line no-console
    console.warn(
      `[mcp-token] Failed to persist token state to ${PERSIST_PATH}. ${message}`,
    );
    if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
  }
}

/**
 * Generate a new MCP token
 */
export function generateMCPToken(
  subject: string,
  scope?: string[],
  metadata?: Record<string, unknown>,
  ttl: number = TOKEN_TTL_MS,
): MCPToken {
  const now = Date.now();
  const payload: MCPTokenPayload = {
    sub: subject,
    iat: now,
    exp: now + ttl,
    scope,
    metadata,
  };

  // Create token with signature
  const tokenData = JSON.stringify(payload);
  const signature = createSignature(tokenData);
  const token = `${Buffer.from(tokenData).toString("base64")}.${signature}`;

  tokenStore.set(token, payload);
  persistState();

  return {
    token,
    type: "bearer",
    expiresAt: payload.exp,
    issuedAt: payload.iat,
    scope,
    metadata,
  };
}

/**
 * Validate an MCP token
 */
export function validateMCPToken(token: string): MCPTokenPayload | null {
  try {
    const [dataB64, signature] = token.split(".");
    if (!dataB64 || !signature) return null;

    // Verify signature
    const tokenData = Buffer.from(dataB64, "base64").toString();
    const expectedSignature = createSignature(tokenData);

    if (signature !== expectedSignature) {
      return null;
    }

    const payload: MCPTokenPayload = JSON.parse(tokenData);

    // Check expiration
    if (payload.exp < Date.now()) {
      tokenStore.delete(token);
      persistState();
      return null;
    }

    // Verify token exists in store
    const storedPayload = tokenStore.get(token);
    if (!storedPayload) return null;

    return payload;
  } catch (_error) {
    return null;
  }
}

/**
 * Revoke an MCP token
 */
export function revokeMCPToken(token: string): boolean {
  const removed = tokenStore.delete(token);
  if (removed) persistState();
  return removed;
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(subject: string): string {
  const refreshToken = crypto.randomBytes(32).toString("hex");
  refreshTokenStore.set(refreshToken, {
    sub: subject,
    exp: Date.now() + REFRESH_TOKEN_TTL_MS,
  });
  persistState();
  return refreshToken;
}

/**
 * Validate and use refresh token to generate new access token
 */
export function refreshAccessToken(
  refreshToken: string,
  scope?: string[],
  metadata?: Record<string, unknown>,
): MCPToken | null {
  const refresh = refreshTokenStore.get(refreshToken);
  if (!refresh) return null;

  // Check expiration
  if (refresh.exp < Date.now()) {
    refreshTokenStore.delete(refreshToken);
    persistState();
    return null;
  }

  // Generate new access token
  return generateMCPToken(refresh.sub, scope, metadata);
}

/**
 * Revoke a refresh token
 */
export function revokeRefreshToken(refreshToken: string): boolean {
  const removed = refreshTokenStore.delete(refreshToken);
  if (removed) persistState();
  return removed;
}

/**
 * Create HMAC signature for token data
 */
function createSignature(data: string): string {
  return crypto.createHmac("sha256", getSecretKey()).update(data).digest("hex");
}

/**
 * Clean up expired tokens (should be called periodically)
 */
export function cleanupExpiredTokens(): { removed: number } {
  const now = Date.now();
  let removed = 0;

  // Clean access tokens
  for (const [token, payload] of tokenStore) {
    if (payload.exp < now) {
      tokenStore.delete(token);
      removed++;
    }
  }

  // Clean refresh tokens
  for (const [token, data] of refreshTokenStore) {
    if (data.exp < now) {
      refreshTokenStore.delete(token);
      removed++;
    }
  }

  if (removed > 0) persistState();
  return { removed };
}

/**
 * Get token statistics
 */
export function getTokenStats() {
  const now = Date.now();
  const activeTokens = Array.from(tokenStore.values()).filter(
    (p) => p.exp >= now,
  );
  const activeRefreshTokens = Array.from(refreshTokenStore.values()).filter(
    (r) => r.exp >= now,
  );

  return {
    totalAccessTokens: tokenStore.size,
    activeAccessTokens: activeTokens.length,
    expiredAccessTokens: tokenStore.size - activeTokens.length,
    totalRefreshTokens: refreshTokenStore.size,
    activeRefreshTokens: activeRefreshTokens.length,
    expiredRefreshTokens: refreshTokenStore.size - activeRefreshTokens.length,
    secretConfigured: HAS_CONFIGURED_SECRET,
    ephemeralSecretInUse: !HAS_CONFIGURED_SECRET,
    requireSecret: config.tokenRequireSecret,
    persistentStoreEnabled: Boolean(PERSIST_PATH),
    persistentStorePath: PERSIST_PATH,
  };
}

/**
 * Extract token from Authorization header
 */
export function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Middleware helper to validate MCP token from request-like object
 */
export function validateRequest(headers: Record<string, string | undefined>): {
  valid: boolean;
  payload?: MCPTokenPayload;
  error?: string;
} {
  const authHeader = headers.authorization || headers.Authorization;
  const token = extractBearerToken(authHeader);

  if (!token) {
    return { valid: false, error: "No token provided" };
  }

  const payload = validateMCPToken(token);
  if (!payload) {
    return { valid: false, error: "Invalid or expired token" };
  }

  return { valid: true, payload };
}

loadPersistedState();

// Auto cleanup every 10 minutes
const cleanupTimer = setInterval(
  () => {
    cleanupExpiredTokens();
  },
  10 * 60 * 1000,
);
cleanupTimer.unref?.();
