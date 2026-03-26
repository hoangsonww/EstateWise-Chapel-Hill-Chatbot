/**
 * Zod schema for intent classification output from the Supervisor agent.
 */

import { z } from "zod";

export const IntentType = z
  .enum([
    "property_search",
    "market_analysis",
    "recommendation",
    "data_enrichment",
    "conversation",
    "quality_review",
  ])
  .describe("The classified intent type for this segment of the user query.");

export const ExtractedEntitiesSchema = z
  .object({
    locations: z
      .array(z.string().describe("City, zip code, neighborhood, or address."))
      .optional()
      .describe("Geographic locations mentioned in the query."),
    priceRange: z
      .object({
        min: z.number().optional().describe("Minimum price in dollars."),
        max: z.number().optional().describe("Maximum price in dollars."),
      })
      .optional()
      .describe("Price range extracted from the query, if specified."),
    propertyType: z
      .enum(["single_family", "condo", "townhouse", "multi_family", "land"])
      .optional()
      .describe("The type of property the user is looking for."),
    features: z
      .array(z.string().describe("A specific feature or amenity requested."))
      .optional()
      .describe(
        "Subjective or specific features mentioned (e.g., 'pool', 'modern kitchen').",
      ),
    bedrooms: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("Number of bedrooms requested."),
    bathrooms: z
      .number()
      .min(0)
      .optional()
      .describe(
        "Number of bathrooms requested (may be fractional, e.g., 2.5).",
      ),
    timeframe: z
      .string()
      .optional()
      .describe(
        "Buying timeline if mentioned (e.g., 'within 3 months', 'next year').",
      ),
  })
  .describe(
    "Structured entities extracted from the user query for this intent.",
  );

export const SingleIntentSchema = z.object({
  type: IntentType,
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence score for this intent classification, 0.0 to 1.0."),
  extractedEntities: ExtractedEntitiesSchema,
});

export const IntentClassificationSchema = z
  .object({
    intents: z
      .array(SingleIntentSchema)
      .min(1)
      .describe(
        "Array of classified intents. A single user message may contain multiple intents.",
      ),
    requiredAgents: z
      .array(
        z
          .string()
          .describe(
            "Agent identifier (e.g., 'property-search', 'market-analyst').",
          ),
      )
      .describe(
        "List of all agents that must be invoked to fulfill this request.",
      ),
    executionOrder: z
      .array(z.string().describe("Agent identifier in execution sequence."))
      .describe(
        "Ordered list of agents reflecting execution sequence (respects dependencies).",
      ),
    dependencyGraph: z
      .record(
        z.string().describe("Agent identifier."),
        z
          .array(z.string().describe("Upstream agent identifier."))
          .describe(
            "List of agents this agent depends on (empty array if none).",
          ),
      )
      .describe(
        "Maps each agent to its upstream dependencies. Empty array means no dependencies.",
      ),
    isFollowUp: z
      .boolean()
      .describe(
        "True if this query references prior conversation context (e.g., 'that property').",
      ),
    reasoning: z
      .string()
      .describe(
        "Brief explanation of why these intents were classified and this routing was chosen.",
      ),
  })
  .describe("Complete intent classification output from the Supervisor agent.");

export type IntentClassification = z.infer<typeof IntentClassificationSchema>;
export type ExtractedEntities = z.infer<typeof ExtractedEntitiesSchema>;
export type SingleIntent = z.infer<typeof SingleIntentSchema>;
