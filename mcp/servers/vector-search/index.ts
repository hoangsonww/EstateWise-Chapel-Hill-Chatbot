/**
 * EstateWise MCP – Vector Search Server
 *
 * 3 tools for semantic / embedding-based property search:
 *   semantic_property_search, find_similar_properties, search_by_description
 */

import { z } from "zod";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "vector-search";
const limiter = getRateLimiter(SERVER_ID, 60);
const log = createLogger(SERVER_ID);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
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
    name: "semantic_property_search",
    description:
      "Search properties using natural language. The query is embedded and matched against property vectors. Returns results ranked by cosine similarity.",
    inputSchema: z.object({
      query: z
        .string()
        .min(3)
        .describe(
          "Natural-language description of the desired property (e.g. 'modern 3-bed near downtown with a pool')",
        ),
      minScore: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .default(0.6)
        .describe(
          "Minimum cosine similarity score (0-1). Higher values return fewer but more relevant results.",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Maximum number of results to return (1-50, default 10)"),
      city: z
        .string()
        .optional()
        .describe("Optional city filter to narrow the geographic scope"),
      state: z
        .string()
        .optional()
        .describe("Optional state filter (two-letter code)"),
    }),
    async handler(input: {
      query: string;
      minScore?: number;
      limit?: number;
      city?: string;
      state?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("semantic_property_search");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/vector/search", {
          method: "POST",
          body: JSON.stringify({
            query: input.query,
            minScore: input.minScore ?? 0.6,
            limit: input.limit ?? 10,
            city: input.city,
            state: input.state,
          }),
        });
        log.audit({
          action: "semantic_property_search",
          toolName: "semantic_property_search",
          success: true,
          durationMs: Date.now() - start,
          metadata: { queryLength: input.query.length },
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("semantic_property_search failed", err);
        return handleToolError("semantic_property_search", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "find_similar_properties",
    description:
      "Given a property ID, find the most similar properties using vector embeddings. Useful for 'more like this' recommendations.",
    inputSchema: z.object({
      propertyId: z
        .string()
        .describe("The reference property ID to find similar properties for"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .default(5)
        .describe("Number of similar properties to return (1-30, default 5)"),
      excludeSameZip: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "When true, exclude properties in the same ZIP code to diversify results",
        ),
    }),
    async handler(input: {
      propertyId: string;
      limit?: number;
      excludeSameZip?: boolean;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("find_similar_properties");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/vector/similar", {
          method: "POST",
          body: JSON.stringify({
            propertyId: input.propertyId,
            limit: input.limit ?? 5,
            excludeSameZip: input.excludeSameZip ?? false,
          }),
        });
        log.audit({
          action: "find_similar_properties",
          toolName: "find_similar_properties",
          success: true,
          durationMs: Date.now() - start,
          metadata: { propertyId: input.propertyId },
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("find_similar_properties failed", err);
        return handleToolError("find_similar_properties", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "search_by_description",
    description:
      "Search for properties whose listing descriptions semantically match the provided text. Useful when the user describes a vibe or feature set rather than numeric criteria.",
    inputSchema: z.object({
      description: z
        .string()
        .min(5)
        .describe(
          "Descriptive text to match against listing descriptions (e.g. 'craftsman bungalow with original hardwood floors')",
        ),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .default(10)
        .describe("Maximum results to return (1-30, default 10)"),
    }),
    async handler(input: {
      description: string;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("search_by_description");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/vector/description-search", {
          method: "POST",
          body: JSON.stringify({
            description: input.description,
            limit: input.limit ?? 10,
          }),
        });
        log.audit({
          action: "search_by_description",
          toolName: "search_by_description",
          success: true,
          durationMs: Date.now() - start,
          metadata: { descriptionLength: input.description.length },
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("search_by_description failed", err);
        return handleToolError("search_by_description", err).toToolResult();
      }
    },
  },
];
