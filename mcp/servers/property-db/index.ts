/**
 * EstateWise MCP – Property Database Server
 *
 * 5 tools for CRUD-style property lookups against the backend API:
 *   search_properties, get_property_details, compare_properties,
 *   get_recent_listings, get_price_history
 */

import { z } from "zod";
import { PropertyFilterSchema } from "../../shared/types.js";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "property-db";
const limiter = getRateLimiter(SERVER_ID, 120);
const log = createLogger(SERVER_ID);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function apiFetch(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
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
    name: "search_properties",
    description:
      "Search the property database with structured filters. Returns matching listings sorted by the chosen field. At least one filter must be provided.",
    inputSchema: PropertyFilterSchema,
    async handler(input: z.infer<typeof PropertyFilterSchema>): Promise<ToolResult> {
      const blocked = rateLimitGuard("search_properties");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(input)) {
          if (v !== undefined) params.set(k, String(v));
        }
        const data = await apiFetch(`/properties?${params.toString()}`);
        log.audit({
          action: "search_properties",
          toolName: "search_properties",
          success: true,
          durationMs: Date.now() - start,
          metadata: { filterCount: Object.keys(input).length },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("search_properties failed", err);
        return handleToolError("search_properties", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "get_property_details",
    description:
      "Retrieve full details for a single property by ID. Optionally include price history and nearby comparable properties.",
    inputSchema: z.object({
      propertyId: z.string().describe("Unique property identifier to look up"),
      includeHistory: z
        .boolean()
        .optional()
        .default(false)
        .describe("When true, include the price history timeline for this property"),
      includeNearby: z
        .boolean()
        .optional()
        .default(false)
        .describe("When true, include nearby comparable properties within 1 mile"),
    }),
    async handler(input: {
      propertyId: string;
      includeHistory?: boolean;
      includeNearby?: boolean;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_property_details");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.includeHistory) params.set("includeHistory", "true");
        if (input.includeNearby) params.set("includeNearby", "true");
        const qs = params.toString();
        const data = await apiFetch(
          `/properties/${input.propertyId}${qs ? `?${qs}` : ""}`,
        );
        log.audit({
          action: "get_property_details",
          toolName: "get_property_details",
          success: true,
          durationMs: Date.now() - start,
          metadata: { propertyId: input.propertyId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_property_details failed", err);
        return handleToolError("get_property_details", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "compare_properties",
    description:
      "Compare 2 to 5 properties side-by-side. Returns a comparison matrix with price, size, features, and location data.",
    inputSchema: z.object({
      propertyIds: z
        .array(z.string().describe("Property ID"))
        .min(2)
        .max(5)
        .describe("Array of 2-5 property IDs to compare"),
    }),
    async handler(input: { propertyIds: string[] }): Promise<ToolResult> {
      const blocked = rateLimitGuard("compare_properties");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/properties/compare", {
          method: "POST",
          body: JSON.stringify({ propertyIds: input.propertyIds }),
        });
        log.audit({
          action: "compare_properties",
          toolName: "compare_properties",
          success: true,
          durationMs: Date.now() - start,
          metadata: { count: input.propertyIds.length },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("compare_properties failed", err);
        return handleToolError("compare_properties", err).toToolResult();
      }
    },
  },

  // 4 -----------------------------------------------------------------------
  {
    name: "get_recent_listings",
    description:
      "Retrieve the most recent property listings in a given area. Defaults to the last 7 days.",
    inputSchema: z.object({
      city: z.string().optional().describe("Filter by city name"),
      state: z.string().optional().describe("Filter by two-letter state code"),
      zipCode: z.string().optional().describe("Filter by 5-digit ZIP code"),
      daysBack: z
        .number()
        .int()
        .min(1)
        .max(90)
        .optional()
        .default(7)
        .describe("Number of days to look back (1-90, default 7)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(20)
        .describe("Maximum results to return (1-50, default 20)"),
    }),
    async handler(input: {
      city?: string;
      state?: string;
      zipCode?: string;
      daysBack?: number;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_recent_listings");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.city) params.set("city", input.city);
        if (input.state) params.set("state", input.state);
        if (input.zipCode) params.set("zipCode", input.zipCode);
        params.set("daysBack", String(input.daysBack ?? 7));
        params.set("limit", String(input.limit ?? 20));
        const data = await apiFetch(`/properties/recent?${params.toString()}`);
        log.audit({
          action: "get_recent_listings",
          toolName: "get_recent_listings",
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_recent_listings failed", err);
        return handleToolError("get_recent_listings", err).toToolResult();
      }
    },
  },

  // 5 -----------------------------------------------------------------------
  {
    name: "get_price_history",
    description:
      "Retrieve the historical price timeline for a property, including sale dates, prices, and price-change percentages.",
    inputSchema: z.object({
      propertyId: z.string().describe("Property ID to fetch price history for"),
      periodMonths: z
        .number()
        .int()
        .min(1)
        .max(240)
        .optional()
        .default(60)
        .describe("How many months of history to return (1-240, default 60)"),
    }),
    async handler(input: {
      propertyId: string;
      periodMonths?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_price_history");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const months = input.periodMonths ?? 60;
        const data = await apiFetch(
          `/properties/${input.propertyId}/price-history?months=${months}`,
        );
        log.audit({
          action: "get_price_history",
          toolName: "get_price_history",
          success: true,
          durationMs: Date.now() - start,
          metadata: { propertyId: input.propertyId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_price_history failed", err);
        return handleToolError("get_price_history", err).toToolResult();
      }
    },
  },
];
