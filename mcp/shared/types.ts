/**
 * EstateWise MCP Shared Types
 *
 * Zod schemas and TypeScript interfaces used across all domain servers.
 * Every field carries a .describe() annotation so MCP-aware models can
 * self-document tool inputs/outputs without extra prompting.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Property filter – the universal query envelope
// ---------------------------------------------------------------------------

export const PropertyFilterSchema = z
  .object({
    city: z
      .string()
      .optional()
      .describe("City name to filter properties by (e.g. 'Raleigh')"),
    state: z
      .string()
      .optional()
      .describe("Two-letter US state code (e.g. 'NC')"),
    zipCode: z.string().optional().describe("5-digit ZIP code (e.g. '27601')"),
    minPrice: z
      .number()
      .min(0)
      .optional()
      .describe("Minimum listing price in USD"),
    maxPrice: z
      .number()
      .min(0)
      .optional()
      .describe("Maximum listing price in USD"),
    minBedrooms: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Minimum number of bedrooms"),
    maxBedrooms: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Maximum number of bedrooms"),
    minBathrooms: z
      .number()
      .min(0)
      .optional()
      .describe("Minimum number of bathrooms"),
    maxBathrooms: z
      .number()
      .min(0)
      .optional()
      .describe("Maximum number of bathrooms"),
    minSquareFeet: z
      .number()
      .min(0)
      .optional()
      .describe("Minimum square footage"),
    maxSquareFeet: z
      .number()
      .min(0)
      .optional()
      .describe("Maximum square footage"),
    propertyType: z
      .enum([
        "single-family",
        "condo",
        "townhouse",
        "multi-family",
        "land",
        "commercial",
      ])
      .optional()
      .describe("Property type category"),
    yearBuiltMin: z.number().int().optional().describe("Earliest year built"),
    yearBuiltMax: z.number().int().optional().describe("Latest year built"),
    status: z
      .enum(["active", "pending", "sold", "off-market"])
      .optional()
      .describe("Current listing status"),
    sortBy: z
      .enum(["price", "date", "sqft", "relevance"])
      .optional()
      .describe("Field to sort results by"),
    sortOrder: z
      .enum(["asc", "desc"])
      .optional()
      .describe("Sort direction – ascending or descending"),
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Maximum number of results to return (1-100)"),
    offset: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Number of results to skip for pagination"),
  })
  .refine(
    (data) => {
      const values = Object.values(data).filter((v) => v !== undefined);
      return values.length > 0;
    },
    { message: "At least one filter field must be provided" },
  );

export type PropertyFilter = z.infer<typeof PropertyFilterSchema>;

// ---------------------------------------------------------------------------
// Property – canonical property record
// ---------------------------------------------------------------------------

export const PropertySchema = z.object({
  id: z.string().describe("Unique property identifier"),
  address: z.string().describe("Full street address"),
  city: z.string().describe("City name"),
  state: z.string().describe("Two-letter state code"),
  zipCode: z.string().describe("5-digit ZIP code"),
  price: z.number().describe("Current listing or last-sale price in USD"),
  bedrooms: z.number().int().describe("Number of bedrooms"),
  bathrooms: z
    .number()
    .describe("Number of bathrooms (may include half-baths as .5)"),
  squareFeet: z.number().describe("Total interior square footage"),
  lotSize: z.number().optional().describe("Lot size in acres"),
  yearBuilt: z.number().int().describe("Year the structure was built"),
  propertyType: z
    .string()
    .describe("Property type (single-family, condo, townhouse, etc.)"),
  status: z
    .string()
    .describe("Current listing status (active, pending, sold, off-market)"),
  description: z
    .string()
    .optional()
    .describe("Free-text property description from the listing"),
  imageUrl: z
    .string()
    .url()
    .optional()
    .describe("URL of the primary listing photo"),
  latitude: z.number().optional().describe("Latitude coordinate"),
  longitude: z.number().optional().describe("Longitude coordinate"),
  listedDate: z
    .string()
    .optional()
    .describe("ISO 8601 date when the property was listed"),
  lastUpdated: z
    .string()
    .optional()
    .describe("ISO 8601 timestamp of the last data update"),
});

export type Property = z.infer<typeof PropertySchema>;

// ---------------------------------------------------------------------------
// Market statistics
// ---------------------------------------------------------------------------

export const MarketStatsSchema = z.object({
  region: z.string().describe("Geographic region these stats cover"),
  period: z.string().describe("Time period (e.g. '2026-Q1', '2026-03')"),
  medianPrice: z.number().describe("Median sale price in USD"),
  averagePrice: z.number().describe("Average sale price in USD"),
  medianPricePerSqFt: z.number().describe("Median price per square foot"),
  totalListings: z
    .number()
    .int()
    .describe("Total active listings in the period"),
  newListings: z.number().int().describe("New listings added in the period"),
  soldListings: z.number().int().describe("Number of properties sold"),
  averageDaysOnMarket: z
    .number()
    .describe("Average days on market before sale"),
  inventoryMonths: z
    .number()
    .describe("Months of inventory at current absorption rate"),
  priceChangePercent: z
    .number()
    .describe("Period-over-period median price change as a percentage"),
});

export type MarketStats = z.infer<typeof MarketStatsSchema>;

// ---------------------------------------------------------------------------
// Unified tool result envelope
// ---------------------------------------------------------------------------

export const ToolResultSchema = z.object({
  success: z.boolean().describe("Whether the tool call succeeded"),
  data: z.any().optional().describe("Result payload – shape varies by tool"),
  error: z
    .string()
    .optional()
    .describe("Human-readable error message when success is false"),
  metadata: z
    .record(z.unknown())
    .optional()
    .describe("Optional metadata (timing, pagination, source, etc.)"),
});

export type ToolResult = z.infer<typeof ToolResultSchema>;

// ---------------------------------------------------------------------------
// Server configuration
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  /** Unique server identifier (e.g. 'property-db') */
  name: string;
  /** Semver version string */
  version: string;
  /** Human-readable server purpose */
  description: string;
  /** Maximum tool calls allowed per minute */
  rateLimitPerMinute: number;
  /** Per-call timeout in milliseconds */
  timeoutMs: number;
  /** Tool names this server exposes */
  tools: string[];
}
