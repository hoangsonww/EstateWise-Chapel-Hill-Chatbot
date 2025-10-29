import { z } from "zod";
import { httpGetCached as httpGet, qs } from "../core/http.js";
import type { ToolDef } from "../core/registry.js";

/**
 * Market analysis tools for understanding real estate trends and patterns.
 */
export const marketTools: ToolDef[] = [
  {
    name: "market.pricetrends",
    description:
      "Analyze price trends for a specific area over time. Returns statistics about pricing patterns.",
    schema: {
      q: z.string(),
      topK: z.number().optional(),
    },
    handler: async (args: any) => {
      const { q, topK = 100 } = args as { q: string; topK?: number };

      const data = await httpGet(`/api/properties${qs({ q, topK })}`);

      if (!data || !Array.isArray(data.results)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch properties" }),
            },
          ],
        };
      }

      const properties = data.results.filter(
        (p: any) => p.price && p.livingArea,
      );

      if (properties.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "No valid properties found" }),
            },
          ],
        };
      }

      // Calculate price per sqft distribution
      const pricesPerSqft = properties
        .map((p: any) => p.price / p.livingArea)
        .sort((a: number, b: number) => a - b);
      const prices = properties
        .map((p: any) => p.price)
        .sort((a: number, b: number) => a - b);

      const trends = {
        query: q,
        sampleSize: properties.length,
        priceStats: {
          min: prices[0],
          max: prices[prices.length - 1],
          median: prices[Math.floor(prices.length / 2)],
          mean: Math.round(
            prices.reduce((sum: number, p: number) => sum + p, 0) /
              prices.length,
          ),
          q1: prices[Math.floor(prices.length * 0.25)],
          q3: prices[Math.floor(prices.length * 0.75)],
        },
        pricePerSqftStats: {
          min: Math.round(pricesPerSqft[0]),
          max: Math.round(pricesPerSqft[pricesPerSqft.length - 1]),
          median: Math.round(
            pricesPerSqft[Math.floor(pricesPerSqft.length / 2)],
          ),
          mean: Math.round(
            pricesPerSqft.reduce((sum: number, p: number) => sum + p, 0) /
              pricesPerSqft.length,
          ),
          q1: Math.round(
            pricesPerSqft[Math.floor(pricesPerSqft.length * 0.25)],
          ),
          q3: Math.round(
            pricesPerSqft[Math.floor(pricesPerSqft.length * 0.75)],
          ),
        },
        priceRanges: {
          under300k: properties.filter((p: any) => p.price < 300000).length,
          "300k-500k": properties.filter(
            (p: any) => p.price >= 300000 && p.price < 500000,
          ).length,
          "500k-750k": properties.filter(
            (p: any) => p.price >= 500000 && p.price < 750000,
          ).length,
          "750k-1m": properties.filter(
            (p: any) => p.price >= 750000 && p.price < 1000000,
          ).length,
          over1m: properties.filter((p: any) => p.price >= 1000000).length,
        },
      };

      return {
        content: [{ type: "text", text: JSON.stringify(trends, null, 2) }],
      };
    },
  },
  {
    name: "market.inventory",
    description:
      "Analyze current inventory levels by bedroom count, price range, and property type.",
    schema: {
      q: z.string(),
      topK: z.number().optional(),
    },
    handler: async (args: any) => {
      const { q, topK = 200 } = args as { q: string; topK?: number };

      const data = await httpGet(`/api/properties${qs({ q, topK })}`);

      if (!data || !Array.isArray(data.results)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch properties" }),
            },
          ],
        };
      }

      const properties = data.results;

      // Group by bedrooms
      const byBedrooms: Record<string, number> = {};
      properties.forEach((p: any) => {
        const beds = p.bedrooms || 0;
        const key = `${beds} bed${beds !== 1 ? "s" : ""}`;
        byBedrooms[key] = (byBedrooms[key] || 0) + 1;
      });

      // Group by property type
      const byType: Record<string, number> = {};
      properties.forEach((p: any) => {
        const type = p.homeType || "Unknown";
        byType[type] = (byType[type] || 0) + 1;
      });

      // Group by zip code
      const byZip: Record<string, number> = {};
      properties.forEach((p: any) => {
        const zip = p.zipcode || "Unknown";
        byZip[zip] = (byZip[zip] || 0) + 1;
      });

      const inventory = {
        query: q,
        total: properties.length,
        byBedrooms,
        byType,
        topZipCodes: Object.entries(byZip)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([zip, count]) => ({ zip, count })),
        avgPrice: Math.round(
          properties.reduce((sum: number, p: any) => sum + (p.price || 0), 0) /
            properties.length,
        ),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(inventory, null, 2) }],
      };
    },
  },
  {
    name: "market.competitiveAnalysis",
    description:
      "Perform competitive analysis for a specific property by comparing it to similar properties in the area.",
    schema: {
      zpid: z.number(),
      radius: z.number().optional(),
    },
    handler: async (args: any) => {
      const { zpid } = args as { zpid: number };

      // Get the target property
      const targetData = await httpGet(
        `/api/properties/by-ids${qs({ ids: String(zpid) })}`,
      );

      if (!Array.isArray(targetData) || targetData.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Property not found" }),
            },
          ],
        };
      }

      const target = targetData[0];

      // Get similar properties
      const similarData = await httpGet(
        `/api/graph/similar/${zpid}${qs({ limit: 20 })}`,
      );

      if (!Array.isArray(similarData)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                target,
                error:
                  "Similar properties not available (graph service may not be configured)",
              }),
            },
          ],
        };
      }

      const comparables = similarData.filter(
        (p: any) => p.price && p.livingArea,
      );

      const analysis = {
        target: {
          zpid: target.zpid || target.id,
          address: target.address,
          price: target.price,
          bedrooms: target.bedrooms,
          bathrooms: target.bathrooms,
          livingArea: target.livingArea,
          pricePerSqft:
            target.price && target.livingArea
              ? Math.round(target.price / target.livingArea)
              : null,
        },
        market: {
          comparableCount: comparables.length,
          avgPrice: Math.round(
            comparables.reduce((sum: number, p: any) => sum + p.price, 0) /
              comparables.length,
          ),
          avgPricePerSqft: Math.round(
            comparables.reduce(
              (sum: number, p: any) => sum + p.price / p.livingArea,
              0,
            ) / comparables.length,
          ),
          priceRange: {
            min: Math.min(...comparables.map((p: any) => p.price)),
            max: Math.max(...comparables.map((p: any) => p.price)),
          },
        },
        positioning:
          target.price && comparables.length > 0
            ? {
                percentile: Math.round(
                  (comparables.filter((p: any) => p.price < target.price)
                    .length /
                    comparables.length) *
                    100,
                ),
                priceVsAvg:
                  target.price -
                  Math.round(
                    comparables.reduce(
                      (sum: number, p: any) => sum + p.price,
                      0,
                    ) / comparables.length,
                  ),
                recommendation: (() => {
                  const targetPsf = target.price / target.livingArea;
                  const avgPsf =
                    comparables.reduce(
                      (sum: number, p: any) => sum + p.price / p.livingArea,
                      0,
                    ) / comparables.length;
                  const diff = ((targetPsf - avgPsf) / avgPsf) * 100;

                  if (diff > 10) return "Priced above market average";
                  if (diff < -10) return "Priced below market average";
                  return "Competitively priced";
                })(),
              }
            : null,
        comparables: comparables.slice(0, 5).map((p: any) => ({
          zpid: p.zpid || p.id,
          price: p.price,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          livingArea: p.livingArea,
          pricePerSqft: Math.round(p.price / p.livingArea),
        })),
      };

      return {
        content: [{ type: "text", text: JSON.stringify(analysis, null, 2) }],
      };
    },
  },
  {
    name: "market.affordabilityIndex",
    description:
      "Calculate affordability index for an area based on median prices and typical income levels.",
    schema: {
      q: z.string(),
      medianIncome: z.number().optional(),
      topK: z.number().optional(),
    },
    handler: async (args: any) => {
      const {
        q,
        medianIncome = 80000,
        topK = 100,
      } = args as {
        q: string;
        medianIncome?: number;
        topK?: number;
      };

      const data = await httpGet(`/api/properties${qs({ q, topK })}`);

      if (!data || !Array.isArray(data.results)) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ error: "Failed to fetch properties" }),
            },
          ],
        };
      }

      const properties = data.results.filter((p: any) => p.price);
      const prices = properties
        .map((p: any) => p.price)
        .sort((a: number, b: number) => a - b);
      const medianPrice = prices[Math.floor(prices.length / 2)];

      // Calculate affordability metrics
      const maxAffordable = medianIncome * 3.5; // 3.5x income rule
      const downPayment = medianPrice * 0.2;
      const loanAmount = medianPrice - downPayment;
      const monthlyPayment = calculateMonthlyPayment(loanAmount, 6.5, 30);
      const monthlyIncome = medianIncome / 12;
      const dti = (monthlyPayment / monthlyIncome) * 100;

      const affordability = {
        query: q,
        medianHomePrice: medianPrice,
        assumedMedianIncome: medianIncome,
        affordability: {
          maxAffordablePrice: Math.round(maxAffordable),
          affordableInventory: properties.filter(
            (p: any) => p.price <= maxAffordable,
          ).length,
          affordablePercentage: Math.round(
            (properties.filter((p: any) => p.price <= maxAffordable).length /
              properties.length) *
              100,
          ),
        },
        monthlyPaymentEstimate: {
          principal: Math.round(monthlyPayment),
          taxes: Math.round((medianPrice * 0.011) / 12),
          insurance: Math.round((medianPrice * 0.0035) / 12),
          total: Math.round(
            monthlyPayment +
              (medianPrice * 0.011) / 12 +
              (medianPrice * 0.0035) / 12,
          ),
          debtToIncomeRatio: `${dti.toFixed(1)}%`,
        },
        priceRanges: {
          affordable: properties.filter((p: any) => p.price <= maxAffordable)
            .length,
          stretch: properties.filter(
            (p: any) =>
              p.price > maxAffordable && p.price <= maxAffordable * 1.2,
          ).length,
          outOfReach: properties.filter(
            (p: any) => p.price > maxAffordable * 1.2,
          ).length,
        },
      };

      return {
        content: [
          { type: "text", text: JSON.stringify(affordability, null, 2) },
        ],
      };
    },
  },
];

/** Calculate monthly mortgage payment */
function calculateMonthlyPayment(
  principal: number,
  aprPercent: number,
  years: number,
): number {
  const monthlyRate = aprPercent / 100 / 12;
  const months = years * 12;
  return (
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, months))) /
    (Math.pow(1 + monthlyRate, months) - 1)
  );
}
