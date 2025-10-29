import * as crypto from "crypto";

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

const SECRET_KEY =
  process.env.MCP_TOKEN_SECRET || crypto.randomBytes(32).toString("hex");
const TOKEN_TTL_MS = parseInt(process.env.MCP_TOKEN_TTL_MS || "3600000", 10); // 1 hour default
const REFRESH_TOKEN_TTL_MS = parseInt(
  process.env.MCP_REFRESH_TOKEN_TTL_MS || "2592000000",
  10,
); // 30 days

// In-memory token storage (for production, use Redis or database)
const tokenStore = new Map<string, MCPTokenPayload>();
const refreshTokenStore = new Map<string, { sub: string; exp: number }>();

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

  // Store in memory
  tokenStore.set(token, payload);

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
      // Clean up expired token
      tokenStore.delete(token);
      return null;
    }

    // Verify token exists in store
    const storedPayload = tokenStore.get(token);
    if (!storedPayload) return null;

    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Revoke an MCP token
 */
export function revokeMCPToken(token: string): boolean {
  return tokenStore.delete(token);
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
    return null;
  }

  // Generate new access token
  return generateMCPToken(refresh.sub, scope, metadata);
}

/**
 * Revoke a refresh token
 */
export function revokeRefreshToken(refreshToken: string): boolean {
  return refreshTokenStore.delete(refreshToken);
}

/**
 * Create HMAC signature for token data
 */
function createSignature(data: string): string {
  return crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
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

// Auto cleanup every 10 minutes
setInterval(
  () => {
    cleanupExpiredTokens();
  },
  10 * 60 * 1000,
);
