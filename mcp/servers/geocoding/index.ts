/**
 * EstateWise MCP – Geocoding Server
 *
 * 4 tools for location services:
 *   geocode_address, reverse_geocode, calculate_distance, find_nearby_amenities
 */

import { z } from "zod";
import { getRateLimiter } from "../../shared/rate-limiter.js";
import { createLogger } from "../../shared/logger.js";
import { handleToolError } from "../../shared/error-handler.js";
import type { ToolResult } from "../../shared/types.js";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3000/api";
const SERVER_ID = "geocoding";
const limiter = getRateLimiter(SERVER_ID, 90);
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
    name: "geocode_address",
    description:
      "Convert a street address into geographic coordinates (latitude/longitude). Returns the best match plus confidence score.",
    inputSchema: z.object({
      address: z
        .string()
        .min(3)
        .describe(
          "Full or partial street address to geocode (e.g. '123 Main St, Raleigh, NC')",
        ),
      city: z.string().optional().describe("City name to improve accuracy"),
      state: z
        .string()
        .optional()
        .describe("Two-letter state code to improve accuracy"),
      zipCode: z.string().optional().describe("ZIP code to improve accuracy"),
    }),
    async handler(input: {
      address: string;
      city?: string;
      state?: string;
      zipCode?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("geocode_address");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams({ address: input.address });
        if (input.city) params.set("city", input.city);
        if (input.state) params.set("state", input.state);
        if (input.zipCode) params.set("zipCode", input.zipCode);
        const data = await apiFetch(`/geocoding/forward?${params.toString()}`);
        log.audit({
          action: "geocode_address",
          toolName: "geocode_address",
          success: true,
          durationMs: Date.now() - start,
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("geocode_address failed", err);
        return handleToolError("geocode_address", err).toToolResult();
      }
    },
  },

  // 2 -----------------------------------------------------------------------
  {
    name: "reverse_geocode",
    description:
      "Convert geographic coordinates (latitude/longitude) into a human-readable street address.",
    inputSchema: z.object({
      latitude: z
        .number()
        .min(-90)
        .max(90)
        .describe("Latitude coordinate (-90 to 90)"),
      longitude: z
        .number()
        .min(-180)
        .max(180)
        .describe("Longitude coordinate (-180 to 180)"),
    }),
    async handler(input: {
      latitude: number;
      longitude: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("reverse_geocode");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const params = new URLSearchParams({
          lat: String(input.latitude),
          lng: String(input.longitude),
        });
        const data = await apiFetch(`/geocoding/reverse?${params.toString()}`);
        log.audit({
          action: "reverse_geocode",
          toolName: "reverse_geocode",
          success: true,
          durationMs: Date.now() - start,
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("reverse_geocode failed", err);
        return handleToolError("reverse_geocode", err).toToolResult();
      }
    },
  },

  // 3 -----------------------------------------------------------------------
  {
    name: "calculate_distance",
    description:
      "Calculate the straight-line (haversine) and driving distance between two points or addresses.",
    inputSchema: z.object({
      originLat: z.number().optional().describe("Origin latitude"),
      originLng: z.number().optional().describe("Origin longitude"),
      originAddress: z
        .string()
        .optional()
        .describe("Origin address (used if lat/lng not provided)"),
      destLat: z.number().optional().describe("Destination latitude"),
      destLng: z.number().optional().describe("Destination longitude"),
      destAddress: z
        .string()
        .optional()
        .describe("Destination address (used if lat/lng not provided)"),
      unit: z
        .enum(["miles", "km"])
        .optional()
        .default("miles")
        .describe("Distance unit – miles or kilometers"),
    }),
    async handler(input: {
      originLat?: number;
      originLng?: number;
      originAddress?: string;
      destLat?: number;
      destLng?: number;
      destAddress?: string;
      unit?: string;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("calculate_distance");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/geocoding/distance", {
          method: "POST",
          body: JSON.stringify({
            originLat: input.originLat,
            originLng: input.originLng,
            originAddress: input.originAddress,
            destLat: input.destLat,
            destLng: input.destLng,
            destAddress: input.destAddress,
            unit: input.unit ?? "miles",
          }),
        });
        log.audit({
          action: "calculate_distance",
          toolName: "calculate_distance",
          success: true,
          durationMs: Date.now() - start,
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("calculate_distance failed", err);
        return handleToolError("calculate_distance", err).toToolResult();
      }
    },
  },

  // 4 -----------------------------------------------------------------------
  {
    name: "find_nearby_amenities",
    description:
      "Find nearby amenities (restaurants, schools, parks, hospitals, transit, shopping) around a location, organized by category with distances.",
    inputSchema: z.object({
      latitude: z.number().optional().describe("Center latitude"),
      longitude: z.number().optional().describe("Center longitude"),
      address: z
        .string()
        .optional()
        .describe("Center address (used if lat/lng not provided)"),
      propertyId: z
        .string()
        .optional()
        .describe("Property ID to use as center point"),
      categories: z
        .array(
          z
            .enum([
              "restaurants",
              "schools",
              "parks",
              "hospitals",
              "transit",
              "shopping",
              "grocery",
              "gym",
            ])
            .describe("Amenity category"),
        )
        .min(1)
        .default(["restaurants", "schools", "parks", "transit"])
        .describe("Amenity categories to search for"),
      radiusMiles: z
        .number()
        .min(0.1)
        .max(25)
        .optional()
        .default(2)
        .describe("Search radius in miles (0.1-25, default 2)"),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .optional()
        .default(10)
        .describe("Max results per category (1-50, default 10)"),
    }),
    async handler(input: {
      latitude?: number;
      longitude?: number;
      address?: string;
      propertyId?: string;
      categories?: string[];
      radiusMiles?: number;
      limit?: number;
    }): Promise<ToolResult> {
      const blocked = rateLimitGuard("find_nearby_amenities");
      if (blocked) return blocked;
      const start = Date.now();
      try {
        const data = await apiFetch("/geocoding/amenities", {
          method: "POST",
          body: JSON.stringify({
            latitude: input.latitude,
            longitude: input.longitude,
            address: input.address,
            propertyId: input.propertyId,
            categories: input.categories ?? [
              "restaurants",
              "schools",
              "parks",
              "transit",
            ],
            radiusMiles: input.radiusMiles ?? 2,
            limit: input.limit ?? 10,
          }),
        });
        log.audit({
          action: "find_nearby_amenities",
          toolName: "find_nearby_amenities",
          success: true,
          durationMs: Date.now() - start,
          metadata: { categories: input.categories },
        });
        return {
          success: true,
          data,
          metadata: { durationMs: Date.now() - start },
        };
      } catch (err) {
        log.error("find_nearby_amenities failed", err);
        return handleToolError("find_nearby_amenities", err).toToolResult();
      }
    },
  },
];
