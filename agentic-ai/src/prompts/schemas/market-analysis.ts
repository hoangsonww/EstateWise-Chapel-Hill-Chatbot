/**
 * Zod schema for market analysis response output.
 */

import { z } from "zod";

export const MetricPointSchema = z.object({
  value: z.number().describe("The current numeric value of this metric."),
  changeYoY: z
    .number()
    .describe(
      "Year-over-year change as a decimal (e.g., 0.05 = +5%, -0.03 = -3%).",
    ),
  source: z
    .string()
    .describe(
      "Name of the data source for this metric (e.g., 'Zillow ZHVI', 'Redfin Data Center').",
    ),
  period: z
    .string()
    .describe(
      "Time period this metric covers (e.g., 'Q4 2025', 'Last 30 days', 'December 2025').",
    ),
});

export const MarketMetricsSchema = z.object({
  medianPrice: MetricPointSchema.describe(
    "Median sale price for the area in dollars.",
  ),
  daysOnMarket: MetricPointSchema.describe(
    "Median days on market before sale.",
  ),
  inventory: MetricPointSchema.describe(
    "Number of active listings currently on the market.",
  ),
  pricePerSqft: MetricPointSchema.describe(
    "Median price per square foot in dollars.",
  ),
});

export const MarketAnalysisSchema = z
  .object({
    area: z
      .string()
      .describe(
        "Geographic scope of this analysis (city, zip code, neighborhood, or metro area).",
      ),
    metrics: MarketMetricsSchema.describe(
      "Core market metrics with values, YoY changes, sources, and periods.",
    ),
    marketCondition: z
      .enum(["buyer_market", "seller_market", "balanced"])
      .describe(
        "Overall market classification based on months of supply: <4 = seller, 4-6 = balanced, >6 = buyer.",
      ),
    outlook: z
      .string()
      .describe(
        "Brief 1-2 sentence market outlook based on observed trend direction. Uses hedging language.",
      ),
    dataConfidence: z
      .enum(["low", "medium", "high"])
      .describe(
        "Overall confidence in the data: high = recent official sources, medium = mixed freshness, low = sparse or stale.",
      ),
    dataSources: z
      .array(
        z.string().describe("Name of a data source used in this analysis."),
      )
      .describe(
        "Complete list of all data sources referenced in this analysis.",
      ),
    caveats: z
      .array(z.string().describe("A data limitation or methodological note."))
      .describe(
        "Array of caveats about data limitations, coverage gaps, or methodological notes.",
      ),
  })
  .describe("Complete market analysis response from the Market Analyst agent.");

export type MetricPoint = z.infer<typeof MetricPointSchema>;
export type MarketMetrics = z.infer<typeof MarketMetricsSchema>;
export type MarketAnalysis = z.infer<typeof MarketAnalysisSchema>;
