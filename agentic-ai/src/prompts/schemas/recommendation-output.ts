/**
 * Zod schema for recommendation engine output.
 */

import { z } from "zod";

export const RecommendationItemSchema = z.object({
  propertyId: z
    .string()
    .describe("Unique property identifier (ZPID or listing ID)."),
  address: z
    .string()
    .describe("Full street address of the recommended property."),
  price: z
    .number()
    .min(0)
    .describe("Listing price in dollars."),
  matchScore: z
    .number()
    .min(0)
    .max(100)
    .describe("How well this property matches the user's preference profile (0-100)."),
  matchType: z
    .enum(["safe_match", "exploration"])
    .describe(
      "Category: safe_match satisfies all core criteria; exploration intentionally relaxes 1-2 non-essential criteria.",
    ),
  reasons: z
    .array(
      z
        .string()
        .describe("A specific positive reason this property was recommended."),
    )
    .describe("Array of positive match factors explaining why this property is a good fit."),
  concerns: z
    .array(
      z
        .string()
        .describe("A potential concern or deviation from stated preferences."),
    )
    .describe("Array of potential concerns or ways this property deviates from preferences."),
});

export const RecommendationSchema = z
  .object({
    recommendations: z
      .array(RecommendationItemSchema)
      .describe(
        "Ordered array of recommended properties. Roughly 70% safe_match and 30% exploration.",
      ),
    userPreferencesSummary: z
      .string()
      .describe(
        "Plain-language summary of the user's understood preferences so they can correct misunderstandings.",
      ),
    searchStrategy: z
      .string()
      .describe(
        "Description of the search approach: what criteria were used for safe matches and what was relaxed for exploration picks.",
      ),
  })
  .describe("Complete recommendation output from the Recommendation agent.");

export type RecommendationItem = z.infer<typeof RecommendationItemSchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
