/**
 * EstateWise MCP – Market Data Server
 *
 * 4 tools for real-estate market analytics:
 *   get_market_stats, get_price_trends, get_comparable_sales, get_inventory_levels
 */

import { z } from "zod";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "market-data";
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
    name: "get_market_stats",
    description:
      "Retrieve aggregate market statistics for a region and time period, including median price, inventory, days on market, and price-change trends.",
    inputSchema: z.object({
      city: z.string().optional().describe("City to get market stats for"),
      state: z.string().optional().describe("Two-letter state code"),
      zipCode: z.string().optional().describe("5-digit ZIP code"),
      period: z
        .string()
        .optional()
        .default("latest")
        .describe(
          "Time period – 'latest', a quarter like '2026-Q1', or a month like '2026-03'",
        ),
    }),
    async handler(input: {
      city?: string;
      state?: string;
      zipCode?: string;
      period?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_market_stats");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.city) params.set("city", input.city);
        if (input.state) params.set("state", input.state);
        if (input.zipCode) params.set("zipCode", input.zipCode);
        params.set("period", input.period ?? "latest");
        const data = await apiFetch(`/market/stats?${params.toString()}`);
        log.audit({
          action: "get_market_stats",
          toolName: "get_market_stats",
          success: true,
          durationMs: Date.now() - start,
          metadata: { region: input.city || input.zipCode || input.state },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_market_stats failed", err);
        return handleToolError("get_market_stats", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "get_price_trends",
    description:
      "Retrieve price trend data over time for a region. Returns monthly or quarterly data points showing median price, volume, and year-over-year change.",
    inputSchema: z.object({
      city: z.string().optional().describe("City name"),
      state: z.string().optional().describe("Two-letter state code"),
      zipCode: z.string().optional().describe("5-digit ZIP code"),
      propertyType: z
        .enum([
          "single-family",
          "condo",
          "townhouse",
          "multi-family",
          "all",
        ])
        .optional()
        .default("all")
        .describe("Property type to filter trends by"),
      periodMonths: z
        .number()
        .int()
        .min(3)
        .max(120)
        .optional()
        .default(12)
        .describe("Number of months of trend data to return (3-120, default 12)"),
      granularity: z
        .enum(["monthly", "quarterly"])
        .optional()
        .default("monthly")
        .describe("Data point granularity"),
    }),
    async handler(input: {
      city?: string;
      state?: string;
      zipCode?: string;
      propertyType?: string;
      periodMonths?: number;
      granularity?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_price_trends");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.city) params.set("city", input.city);
        if (input.state) params.set("state", input.state);
        if (input.zipCode) params.set("zipCode", input.zipCode);
        params.set("propertyType", input.propertyType ?? "all");
        params.set("periodMonths", String(input.periodMonths ?? 12));
        params.set("granularity", input.granularity ?? "monthly");
        const data = await apiFetch(`/market/trends?${params.toString()}`);
        log.audit({
          action: "get_price_trends",
          toolName: "get_price_trends",
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_price_trends failed", err);
        return handleToolError("get_price_trends", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "get_comparable_sales",
    description:
      "Find recently sold properties that are comparable to a reference property or location. Used for CMA (Comparative Market Analysis).",
    inputSchema: z.object({
      propertyId: z
        .string()
        .optional()
        .describe("Reference property ID to find comps for"),
      address: z
        .string()
        .optional()
        .describe("Reference address (used if propertyId not provided)"),
      radiusMiles: z
        .number()
        .min(0.1)
        .max(10)
        .optional()
        .default(1)
        .describe("Search radius in miles (0.1-10, default 1)"),
      soldWithinDays: z
        .number()
        .int()
        .min(30)
        .max(365)
        .optional()
        .default(180)
        .describe("Only include sales within this many days (30-365, default 180)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .default(10)
        .describe("Maximum comparable sales to return (1-30, default 10)"),
    }),
    async handler(input: {
      propertyId?: string;
      address?: string;
      radiusMiles?: number;
      soldWithinDays?: number;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_comparable_sales");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/market/comps", {
          method: "POST",
          body: JSON.stringify({
            propertyId: input.propertyId,
            address: input.address,
            radiusMiles: input.radiusMiles ?? 1,
            soldWithinDays: input.soldWithinDays ?? 180,
            limit: input.limit ?? 10,
          }),
        });
        log.audit({
          action: "get_comparable_sales",
          toolName: "get_comparable_sales",
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_comparable_sales failed", err);
        return handleToolError("get_comparable_sales", err).toToolResult();
      }
    },
  },

  // 4 -----------------------------------------------------------------------
  {
    name: "get_inventory_levels",
    description:
      "Retrieve current and historical housing inventory levels for a region, including months of supply, new listings rate, and absorption rate.",
    inputSchema: z.object({
      city: z.string().optional().describe("City name"),
      state: z.string().optional().describe("Two-letter state code"),
      zipCode: z.string().optional().describe("5-digit ZIP code"),
      propertyType: z
        .enum([
          "single-family",
          "condo",
          "townhouse",
          "multi-family",
          "all",
        ])
        .optional()
        .default("all")
        .describe("Property type filter"),
      periodMonths: z
        .number()
        .int()
        .min(1)
        .max(36)
        .optional()
        .default(6)
        .describe("Months of inventory history to return (1-36, default 6)"),
    }),
    async handler(input: {
      city?: string;
      state?: string;
      zipCode?: string;
      propertyType?: string;
      periodMonths?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("get_inventory_levels");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.city) params.set("city", input.city);
        if (input.state) params.set("state", input.state);
        if (input.zipCode) params.set("zipCode", input.zipCode);
        params.set("propertyType", input.propertyType ?? "all");
        params.set("periodMonths", String(input.periodMonths ?? 6));
        const data = await apiFetch(`/market/inventory?${params.toString()}`);
        log.audit({
          action: "get_inventory_levels",
          toolName: "get_inventory_levels",
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("get_inventory_levels failed", err);
        return handleToolError("get_inventory_levels", err).toToolResult();
      }
    },
  },
];
