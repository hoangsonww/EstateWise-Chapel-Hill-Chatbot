/**
 * EstateWise MCP – Graph Query Server
 *
 * 4 tools for knowledge-graph / Neo4j-backed queries:
 *   find_related_properties, neighborhood_profile,
 *   school_district_info, commute_analysis
 */

import { z } from "zod";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL =
  process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "graph-query";
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
    name: "find_related_properties",
    description:
      "Traverse the property knowledge graph to find properties related to a given property through a specified relationship type (e.g. same neighborhood, same school district, same builder).",
    inputSchema: z.object({
      propertyId: z
        .string()
        .describe("The source property ID to find relationships for"),
      relationshipType: z
        .enum([
          "same-neighborhood",
          "same-school-district",
          "same-builder",
          "price-comparable",
          "style-similar",
          "all",
        ])
        .optional()
        .default("all")
        .describe(
          "Type of graph relationship to follow. Use 'all' to return every relationship type.",
        ),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .default(1)
        .describe("Maximum traversal depth in the graph (1-3, default 1)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Maximum related properties to return (1-50, default 10)"),
    }),
    async handler(input: {
      propertyId: string;
      relationshipType?: string;
      maxDepth?: number;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("find_related_properties");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/graph/related", {
          method: "POST",
          body: JSON.stringify({
            propertyId: input.propertyId,
            relationshipType: input.relationshipType ?? "all",
            maxDepth: input.maxDepth ?? 1,
            limit: input.limit ?? 10,
          }),
        });
        log.audit({
          action: "find_related_properties",
          toolName: "find_related_properties",
          success: true,
          durationMs: Date.now() - start,
          metadata: { propertyId: input.propertyId },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("find_related_properties failed", err);
        return handleToolError("find_related_properties", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "neighborhood_profile",
    description:
      "Generate a comprehensive neighborhood profile including demographics, walkability score, crime stats, amenities, and market trends for a given area.",
    inputSchema: z.object({
      neighborhood: z
        .string()
        .describe("Neighborhood name (e.g. 'Five Points', 'North Hills')"),
      city: z.string().describe("City the neighborhood is in"),
      state: z.string().describe("Two-letter state code"),
      includeSchools: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include school ratings in the profile"),
      includeTransit: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include transit and walkability data"),
    }),
    async handler(input: {
      neighborhood: string;
      city: string;
      state: string;
      includeSchools?: boolean;
      includeTransit?: boolean;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("neighborhood_profile");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/graph/neighborhood", {
          method: "POST",
          body: JSON.stringify({
            neighborhood: input.neighborhood,
            city: input.city,
            state: input.state,
            includeSchools: input.includeSchools ?? true,
            includeTransit: input.includeTransit ?? true,
          }),
        });
        log.audit({
          action: "neighborhood_profile",
          toolName: "neighborhood_profile",
          success: true,
          durationMs: Date.now() - start,
          metadata: { neighborhood: input.neighborhood },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("neighborhood_profile failed", err);
        return handleToolError("neighborhood_profile", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "school_district_info",
    description:
      "Retrieve school district details including ratings, enrollment, test scores, and assigned schools for a location.",
    inputSchema: z.object({
      zipCode: z
        .string()
        .optional()
        .describe("Look up schools by 5-digit ZIP code"),
      propertyId: z
        .string()
        .optional()
        .describe("Look up schools assigned to a specific property"),
      includeRatings: z
        .boolean()
        .optional()
        .default(true)
        .describe("Include school ratings and test score data"),
    }),
    async handler(input: {
      zipCode?: string;
      propertyId?: string;
      includeRatings?: boolean;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("school_district_info");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams();
        if (input.zipCode) params.set("zipCode", input.zipCode);
        if (input.propertyId) params.set("propertyId", input.propertyId);
        if (input.includeRatings !== false) params.set("includeRatings", "true");
        const data = await apiFetch(`/graph/schools?${params.toString()}`);
        log.audit({
          action: "school_district_info",
          toolName: "school_district_info",
          success: true,
          durationMs: Date.now() - start,
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("school_district_info failed", err);
        return handleToolError("school_district_info", err).toToolResult();
      }
    },
  },

  // 4 -----------------------------------------------------------------------
  {
    name: "commute_analysis",
    description:
      "Calculate commute times and routes from a property to a destination using multiple transportation modes (driving, transit, biking, walking).",
    inputSchema: z.object({
      propertyId: z
        .string()
        .optional()
        .describe("Source property ID (provide this or originAddress)"),
      originAddress: z
        .string()
        .optional()
        .describe("Source street address (provide this or propertyId)"),
      destinationAddress: z
        .string()
        .describe("Destination address for the commute"),
      modes: z
        .array(
          z
            .enum(["driving", "transit", "biking", "walking"])
            .describe("Transportation mode"),
        )
        .min(1)
        .default(["driving", "transit"])
        .describe(
          "Transportation modes to calculate. At least one required.",
        ),
      departureTime: z
        .string()
        .optional()
        .describe(
          "ISO 8601 datetime for departure (e.g. '2026-03-24T08:00:00'). Defaults to now.",
        ),
    }),
    async handler(input: {
      propertyId?: string;
      originAddress?: string;
      destinationAddress: string;
      modes?: string[];
      departureTime?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("commute_analysis");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/graph/commute", {
          method: "POST",
          body: JSON.stringify({
            propertyId: input.propertyId,
            originAddress: input.originAddress,
            destinationAddress: input.destinationAddress,
            modes: input.modes ?? ["driving", "transit"],
            departureTime: input.departureTime,
          }),
        });
        log.audit({
          action: "commute_analysis",
          toolName: "commute_analysis",
          success: true,
          durationMs: Date.now() - start,
          metadata: { modes: input.modes },
        });
        return { success: true, data, metadata: { durationMs: Date.now() - start } };
      } catch (err) {
        log.error("commute_analysis failed", err);
        return handleToolError("commute_analysis", err).toToolResult();
      }
    },
  },
];
