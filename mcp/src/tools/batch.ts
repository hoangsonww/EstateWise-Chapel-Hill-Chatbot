import { z } from "zod";
import { httpGetCached as httpGet, qs } from "../core/http.js";
import type { ToolDef } from "../core/registry.js";

/**
 * Batch operations tools for processing multiple properties efficiently.
 */
export const batchTools: ToolDef[] = [
  {
    name: "batch.compareProperties",
    description:
      "Compare multiple properties side-by-side with detailed metrics including price, size, price per sqft, and location data.",
    schema: { zpids: z.array(z.number()).min(2).max(10) },
    handler: async (args: any) => {
      const { zpids } = args as { zpids: number[] };
      
      const param = zpids.join(",");
      const data = await httpGet(`/api/properties/by-ids${qs({ ids: param })}`);
      
      if (!data || !Array.isArray(data)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Failed to fetch properties" }),
          }],
        };
      }
      
      // Calculate comparison metrics
      const comparison = {
        properties: data,
        summary: {
          count: data.length,
          avgPrice: data.reduce((sum: number, p: any) => sum + (p.price || 0), 0) / data.length,
          avgSqft: data.reduce((sum: number, p: any) => sum + (p.livingArea || 0), 0) / data.length,
          avgPricePerSqft: data.reduce((sum: number, p: any) => {
            const psf = p.price && p.livingArea ? p.price / p.livingArea : 0;
            return sum + psf;
          }, 0) / data.length,
          minPrice: Math.min(...data.map((p: any) => p.price || Infinity)),
          maxPrice: Math.max(...data.map((p: any) => p.price || 0)),
        },
        rankings: {
          bestValue: [...data].sort((a: any, b: any) => {
            const aVal = a.price && a.livingArea ? a.price / a.livingArea : Infinity;
            const bVal = b.price && b.livingArea ? b.price / b.livingArea : Infinity;
            return aVal - bVal;
          }).map((p: any) => p.zpid || p.id),
          largestSize: [...data].sort((a: any, b: any) => (b.livingArea || 0) - (a.livingArea || 0))
            .map((p: any) => p.zpid || p.id),
          mostBedrooms: [...data].sort((a: any, b: any) => (b.bedrooms || 0) - (a.bedrooms || 0))
            .map((p: any) => p.zpid || p.id),
        },
      };
      
      return { content: [{ type: "text", text: JSON.stringify(comparison, null, 2) }] };
    },
  },
  {
    name: "batch.bulkSearch",
    description:
      "Execute multiple property searches in parallel and return aggregated results. Useful for comparing different areas or criteria.",
    schema: {
      queries: z.array(z.object({ q: z.string(), topK: z.number().optional() })).min(1).max(5),
    },
    handler: async (args: any) => {
      const { queries } = args as { queries: Array<{ q: string; topK?: number }> };
      
      const results = await Promise.allSettled(
        queries.map(({ q, topK = 20 }) =>
          httpGet(`/api/properties${qs({ q, topK })}`),
        ),
      );
      
      const processed = results.map((result, index) => ({
        query: queries[index].q,
        status: result.status,
        data: result.status === "fulfilled" ? result.value : null,
        error: result.status === "rejected" ? String(result.reason) : null,
      }));
      
      const summary = {
        total: queries.length,
        successful: results.filter(r => r.status === "fulfilled").length,
        failed: results.filter(r => r.status === "rejected").length,
        totalProperties: processed.reduce((sum, r) => {
          return sum + (r.data && Array.isArray(r.data.results) ? r.data.results.length : 0);
        }, 0),
      };
      
      return {
        content: [{
          type: "text",
          text: JSON.stringify({ summary, results: processed }, null, 2),
        }],
      };
    },
  },
  {
    name: "batch.enrichProperties",
    description:
      "Enrich property data with additional computed fields like price per sqft, monthly estimates, and value scores.",
    schema: {
      zpids: z.array(z.number()).min(1).max(50),
      includeFinancials: z.boolean().optional(),
    },
    handler: async (args: any) => {
      const { zpids, includeFinancials = true } = args as {
        zpids: number[];
        includeFinancials?: boolean;
      };
      
      const param = zpids.join(",");
      const data = await httpGet(`/api/properties/by-ids${qs({ ids: param })}`);
      
      if (!Array.isArray(data)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Failed to fetch properties" }),
          }],
        };
      }
      
      const enriched = data.map((prop: any) => {
        const enrichedProp: any = { ...prop };
        
        // Add computed fields
        if (prop.price && prop.livingArea) {
          enrichedProp.pricePerSqft = Math.round(prop.price / prop.livingArea);
        }
        
        if (prop.lotAreaValue && prop.livingArea) {
          enrichedProp.lotToHomeRatio = (prop.lotAreaValue / prop.livingArea).toFixed(2);
        }
        
        if (prop.yearBuilt) {
          enrichedProp.age = new Date().getFullYear() - prop.yearBuilt;
        }
        
        // Add financial estimates if requested
        if (includeFinancials && prop.price) {
          const downPayment = prop.price * 0.20; // 20% down
          const loanAmount = prop.price - downPayment;
          const monthlyRate = 0.065 / 12; // 6.5% APR
          const months = 30 * 12;
          const monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
          
          enrichedProp.financialEstimates = {
            downPayment20Pct: Math.round(downPayment),
            estimatedMonthlyPayment: Math.round(monthlyPayment),
            estimatedAnnualTax: Math.round(prop.price * 0.011), // 1.1% property tax
            estimatedMonthlyInsurance: Math.round(prop.price * 0.0035 / 12), // 0.35% annual
          };
        }
        
        return enrichedProp;
      });
      
      return { content: [{ type: "text", text: JSON.stringify(enriched, null, 2) }] };
    },
  },
  {
    name: "batch.exportProperties",
    description:
      "Export property data in various formats (CSV, JSON) for external analysis or reporting.",
    schema: {
      zpids: z.array(z.number()).min(1).max(100),
      format: z.enum(["json", "csv"]).optional(),
      fields: z.array(z.string()).optional(),
    },
    handler: async (args: any) => {
      const { zpids, format = "json", fields } = args as {
        zpids: number[];
        format?: "json" | "csv";
        fields?: string[];
      };
      
      const param = zpids.join(",");
      const data = await httpGet(`/api/properties/by-ids${qs({ ids: param })}`);
      
      if (!Array.isArray(data)) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({ error: "Failed to fetch properties" }),
          }],
        };
      }
      
      if (format === "csv") {
        const defaultFields = fields || [
          "zpid", "address", "city", "state", "zipcode",
          "price", "bedrooms", "bathrooms", "livingArea",
        ];
        
        // CSV header
        const csv = [defaultFields.join(",")];
        
        // CSV rows
        data.forEach((prop: any) => {
          const row = defaultFields.map(field => {
            const value = prop[field];
            // Escape commas and quotes in values
            if (value === null || value === undefined) return "";
            const str = String(value);
            return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
          });
          csv.push(row.join(","));
        });
        
        return { content: [{ type: "text", text: csv.join("\n") }] };
      }
      
      // JSON format
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  },
];
