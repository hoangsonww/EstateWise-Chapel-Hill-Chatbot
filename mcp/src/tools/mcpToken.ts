import { z } from "zod";
import type { ToolDef } from "../core/registry.js";
import {
  generateMCPToken,
  validateMCPToken,
  revokeMCPToken,
  generateRefreshToken,
  refreshAccessToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  getTokenStats,
  validateRequest,
} from "../core/token.js";

/**
 * MCP Token management tools for authentication and authorization.
 */
export const mcpTokenTools: ToolDef[] = [
  {
    name: "mcp.token.generate",
    description:
      "Generate a new MCP access token for a client/user. Returns token, expiration, and optional refresh token.",
    schema: {
      subject: z.string().describe("Subject identifier (client ID or user ID)"),
      scope: z
        .array(z.string())
        .optional()
        .describe("Optional scopes for token"),
      metadata: z
        .record(z.unknown())
        .optional()
        .describe("Optional metadata to attach"),
      ttlMs: z
        .number()
        .optional()
        .describe("Token TTL in milliseconds (default: 1 hour)"),
      includeRefreshToken: z
        .boolean()
        .optional()
        .describe("Include a refresh token"),
    },
    handler: async (args: any) => {
      const {
        subject,
        scope,
        metadata,
        ttlMs,
        includeRefreshToken = false,
      } = args;

      const token = generateMCPToken(subject, scope, metadata, ttlMs);
      const result: any = {
        accessToken: token.token,
        tokenType: token.type,
        expiresAt: new Date(token.expiresAt).toISOString(),
        expiresIn: Math.floor((token.expiresAt - Date.now()) / 1000),
        scope: token.scope,
        metadata: token.metadata,
      };

      if (includeRefreshToken) {
        result.refreshToken = generateRefreshToken(subject);
      }

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "mcp.token.validate",
    description:
      "Validate an MCP token and return its payload if valid. Useful for checking token status.",
    schema: {
      token: z.string().describe("The MCP token to validate"),
    },
    handler: async (args: any) => {
      const { token } = args;

      const payload = validateMCPToken(token);

      if (!payload) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                valid: false,
                error: "Invalid or expired token",
              }),
            },
          ],
        };
      }

      const result = {
        valid: true,
        subject: payload.sub,
        issuedAt: new Date(payload.iat).toISOString(),
        expiresAt: new Date(payload.exp).toISOString(),
        timeToExpiry: Math.max(
          0,
          Math.floor((payload.exp - Date.now()) / 1000),
        ),
        scope: payload.scope,
        metadata: payload.metadata,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "mcp.token.revoke",
    description: "Revoke an MCP access token, making it immediately invalid.",
    schema: {
      token: z.string().describe("The token to revoke"),
    },
    handler: async (args: any) => {
      const { token } = args;

      const revoked = revokeMCPToken(token);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: revoked,
              message: revoked
                ? "Token revoked successfully"
                : "Token not found or already revoked",
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    },
  },
  {
    name: "mcp.token.refresh",
    description:
      "Use a refresh token to generate a new access token. Returns new access token.",
    schema: {
      refreshToken: z.string().describe("The refresh token"),
      scope: z
        .array(z.string())
        .optional()
        .describe("Optional scopes for new token"),
      metadata: z.record(z.unknown()).optional().describe("Optional metadata"),
    },
    handler: async (args: any) => {
      const { refreshToken, scope, metadata } = args;

      const newToken = refreshAccessToken(refreshToken, scope, metadata);

      if (!newToken) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: false,
                error: "Invalid or expired refresh token",
              }),
            },
          ],
        };
      }

      const result = {
        success: true,
        accessToken: newToken.token,
        tokenType: newToken.type,
        expiresAt: new Date(newToken.expiresAt).toISOString(),
        expiresIn: Math.floor((newToken.expiresAt - Date.now()) / 1000),
        scope: newToken.scope,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    },
  },
  {
    name: "mcp.token.revokeRefresh",
    description:
      "Revoke a refresh token, preventing it from being used to generate new access tokens.",
    schema: {
      refreshToken: z.string().describe("The refresh token to revoke"),
    },
    handler: async (args: any) => {
      const { refreshToken } = args;

      const revoked = revokeRefreshToken(refreshToken);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: revoked,
              message: revoked
                ? "Refresh token revoked successfully"
                : "Refresh token not found",
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    },
  },
  {
    name: "mcp.token.cleanup",
    description:
      "Manually trigger cleanup of expired tokens. Returns count of removed tokens.",
    schema: {},
    handler: async () => {
      const result = cleanupExpiredTokens();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              message: "Cleanup completed",
              tokensRemoved: result.removed,
              timestamp: new Date().toISOString(),
            }),
          },
        ],
      };
    },
  },
  {
    name: "mcp.token.stats",
    description:
      "Get statistics about active and expired tokens in the system.",
    schema: {},
    handler: async () => {
      const stats = getTokenStats();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...stats,
                timestamp: new Date().toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },
  {
    name: "mcp.token.validateRequest",
    description:
      "Validate a request with Bearer token from Authorization header. Used for protected tool calls.",
    schema: {
      authorizationHeader: z
        .string()
        .describe("The Authorization header value (e.g., 'Bearer token123')"),
    },
    handler: async (args: any) => {
      const { authorizationHeader } = args;

      const result = validateRequest({ authorization: authorizationHeader });

      if (!result.valid) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                valid: false,
                error: result.error,
              }),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                valid: true,
                subject: result.payload!.sub,
                scope: result.payload!.scope,
                metadata: result.payload!.metadata,
                expiresAt: new Date(result.payload!.exp).toISOString(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },
];
