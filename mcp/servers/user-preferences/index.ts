/**
 * EstateWise MCP – User Preferences Server
 *
 * 4 tools for user-specific data:
 *   get_user_preferences, update_preferences, get_search_history, get_saved_properties
 */

import { z } from "zod";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "user-preferences";
const limiter = getRateLimiter(SERVER_ID, 60);
const log = createLogger(SERVER_ID);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(
  path: string,
  init?: RequestInit,
): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

function rateLimitGuard(toolName: string): ToolResult | null {
  if (!limiter.tryConsume()) {
    const wait = limiter.waitTime();
    return {
      success: false,
      error: `Rate limited. Retry after ${wait}ms.`,
      metadata: { code: "RATE_LIMITED", retryAfterMs: wait },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

export const tools = [
  // 1 -----------------------------------------------------------------------
  {
    name: "get_user_preferences",
    description:
      "Retrieve the stored preferences for a user, including preferred locations, price range, property types, and notification settings.",
    inputSchema: z.object({
      userId: z.string().describe("Unique user identifier"),
    }),
    async handler(input: { userId: string }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_user_preferences");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch(`/users/${input.userId}/preferences`);
        log.audit({
          action: "get_user_preferences",
          toolName: "get_user_preferences",
          success: true,
          durationMs: Date.now() - start,
          metadata: { userId: input.userId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_user_preferences failed", err);
        return handleToolError("get_user_preferences", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "update_preferences",
    description:
      "Update a user's preferences by merging new values into existing ones. Only provided fields are overwritten; unspecified fields remain unchanged.",
    inputSchema: z.object({
      userId: z.string().describe("Unique user identifier"),
      preferences: z
        .object({
          preferredCities: z
            .array(z.string())
            .optional()
            .describe("List of preferred city names"),
          preferredStates: z
            .array(z.string())
            .optional()
            .describe("List of preferred state codes"),
          minPrice: z.number().optional().describe("Minimum price preference in USD"),
          maxPrice: z.number().optional().describe("Maximum price preference in USD"),
          minBedrooms: z.number().int().optional().describe("Minimum bedrooms"),
          maxBedrooms: z.number().int().optional().describe("Maximum bedrooms"),
          propertyTypes: z
            .array(z.string())
            .optional()
            .describe("Preferred property types"),
          mustHaveFeatures: z
            .array(z.string())
            .optional()
            .describe("Required features (e.g. 'pool', 'garage', 'basement')"),
          notificationFrequency: z
            .enum(["instant", "daily", "weekly", "none"])
            .optional()
            .describe("How often the user wants listing alerts"),
        })
        .describe("Partial preferences object – only provided fields are merged"),
    }),
    async handler(input: {
      userId: string;
      preferences: Record<string, unknown>;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("update_preferences");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch(`/users/${input.userId}/preferences`, {
          method: "PATCH",
          body: JSON.stringify(input.preferences),
        });
        log.audit({
          action: "update_preferences",
          toolName: "update_preferences",
          success: true,
          durationMs: Date.now() - start,
          metadata: {
            userId: input.userId,
            updatedFields: Object.keys(input.preferences),
          },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("update_preferences failed", err);
        return handleToolError("update_preferences", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "get_search_history",
    description:
      "Retrieve a user's recent property search history, including queries, filters used, and timestamps.",
    inputSchema: z.object({
      userId: z.string().describe("Unique user identifier"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(20)
        .describe("Maximum history entries to return (1-100, default 20)"),
      daysBack: z
        .number()
        .int()
        .min(1)
        .max(365)
        .optional()
        .default(30)
        .describe("Only include searches from the last N days (1-365, default 30)"),
    }),
    async handler(input: {
      userId: string;
      limit?: number;
      daysBack?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_search_history");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams({
          limit: String(input.limit ?? 20),
          daysBack: String(input.daysBack ?? 30),
        });
        const data = await apiFetch(
          `/users/${input.userId}/search-history?${params.toString()}`,
        );
        log.audit({
          action: "get_search_history",
          toolName: "get_search_history",
          success: true,
          durationMs: Date.now() - start,
          metadata: { userId: input.userId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_search_history failed", err);
        return handleToolError("get_search_history", err).toToolResult();
      }
    },
  },

  // 4 -----------------------------------------------------------------------
  {
    name: "get_saved_properties",
    description:
      "Retrieve the list of properties a user has saved/favorited, with optional sorting and filtering.",
    inputSchema: z.object({
      userId: z.string().describe("Unique user identifier"),
      sortBy: z
        .enum(["date-saved", "price", "name"])
        .optional()
        .default("date-saved")
        .describe("Sort saved properties by this field"),
      sortOrder: z
        .enum(["asc", "desc"])
        .optional()
        .default("desc")
        .describe("Sort direction"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(100)
        .optional()
        .default(50)
        .describe("Maximum saved properties to return (1-100, default 50)"),
    }),
    async handler(input: {
      userId: string;
      sortBy?: string;
      sortOrder?: string;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_saved_properties");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams({
          sortBy: input.sortBy ?? "date-saved",
          sortOrder: input.sortOrder ?? "desc",
          limit: String(input.limit ?? 50),
        });
        const data = await apiFetch(
          `/users/${input.userId}/saved-properties?${params.toString()}`,
        );
        log.audit({
          action: "get_saved_properties",
          toolName: "get_saved_properties",
          success: true,
          durationMs: Date.now() - start,
          metadata: { userId: input.userId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_saved_properties failed", err);
        return handleToolError("get_saved_properties", err).toToolResult();
      }
    },
  },
];
