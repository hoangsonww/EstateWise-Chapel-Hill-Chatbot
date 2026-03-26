/**
 * Zod schema for property search response output.
 */

import { z } from "zod";

export const PropertyListingSchema = z.object({
  id: z
    .string()
    .describe(
      "Unique property identifier (ZPID or listing ID from the data source).",
    ),
  address: z.string().describe("Full street address of the property."),
  price: z.number().min(0).describe("Listing price in dollars."),
  beds: z.number().int().min(0).describe("Number of bedrooms."),
  baths: z
    .number()
    .min(0)
    .describe("Number of bathrooms (may be fractional, e.g., 2.5)."),
  sqft: z.number().min(0).describe("Total living area in square feet."),
  propertyType: z
    .enum([
      "single_family",
      "condo",
      "townhouse",
      "multi_family",
      "land",
      "other",
    ])
    .describe("Classification of the property type."),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How well this property matches the user's criteria (0-100)."),
  matchReasons: z
    .array(
      z.string().describe("A specific reason this property matched the query."),
    )
    .describe(
      "Array of reasons explaining why this property was included in results.",
    ),
  dataSource: z
    .string()
    .describe(
      "Name of the tool or data source that returned this listing (e.g., 'zillow_search', 'mls_api').",
    ),
  lastUpdated: z
    .string()
    .optional()
    .describe(
      "ISO 8601 timestamp of when this listing data was last refreshed.",
    ),
  confidence: z
    .enum(["high", "medium", "low"])
    .describe(
      "Confidence level in the accuracy and freshness of this listing data.",
    ),
});

export const PropertyResponseSchema = z
  .object({
    properties: z
      .array(PropertyListingSchema)
      .describe(
        "Array of matching property listings, ordered by matchScore descending.",
      ),
    totalResults: z
      .number()
      .int()
      .min(0)
      .describe("Total number of properties that matched the search criteria."),
    caveats: z
      .array(
        z
          .string()
          .describe("A data limitation or caveat the user should be aware of."),
      )
      .describe(
        "Array of data limitation notes (e.g., stale data, incomplete coverage).",
      ),
    suggestedRefinements: z
      .array(
        z
          .string()
          .describe("A suggestion for how the user could refine their search."),
      )
      .describe(
        "Suggestions for narrowing or broadening the search if results are too many or too few.",
      ),
  })
  .describe(
    "Complete property search response from the Property Search agent.",
  );

export type PropertyListing = z.infer<typeof PropertyListingSchema>;
export type PropertyResponse = z.infer<typeof PropertyResponseSchema>;
