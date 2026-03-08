import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function textPrompt(text: string) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text,
        },
      },
    ],
  };
}

export function registerAllPrompts(server: McpServer) {
  server.registerPrompt(
    "workflow.property-underwriting",
    {
      title: "Property Underwriting Workflow",
      description:
        "Generate a structured underwriting plan that uses EstateWise MCP tools end-to-end.",
      argsSchema: {
        goal: z
          .string()
          .describe(
            "Primary underwriting goal, e.g., 'assess 3-bed in Austin'.",
          ),
        budget: z
          .string()
          .optional()
          .describe("Budget context such as '$850000'."),
        riskFocus: z
          .string()
          .optional()
          .describe("Any specific risk concern to prioritize."),
      },
    },
    async ({ goal, budget, riskFocus }) => {
      const optionalLines = [
        budget ? `Budget context: ${budget}` : "",
        riskFocus ? `Risk focus: ${riskFocus}` : "",
      ]
        .filter(Boolean)
        .join("\n");
      return textPrompt(
        [
          "You are executing the EstateWise underwriting workflow.",
          `Goal: ${goal}`,
          optionalLines,
          "Use this sequence:",
          "1) util.parseGoal",
          "2) properties.lookup or properties.searchAdvanced",
          "3) analytics.summarizeSearch + analytics.groupByZip",
          "4) graph.explain / graph.comparePairs",
          "5) finance.mortgage + finance.affordability",
          "6) map.linkForZpids",
          "Return a concise decision memo with quantified risks and confidence.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  );

  server.registerPrompt(
    "workflow.market-brief",
    {
      title: "Market Brief Workflow",
      description:
        "Prepare a current market brief using EstateWise market, analytics, and web tools.",
      argsSchema: {
        market: z.string().describe("Market scope, e.g., 'Raleigh NC condos'."),
        timeframe: z
          .string()
          .optional()
          .describe("Requested timeframe such as 'last 90 days'."),
      },
    },
    async ({ market, timeframe }) => {
      return textPrompt(
        [
          "Prepare an executive market brief.",
          `Market: ${market}`,
          timeframe ? `Timeframe: ${timeframe}` : "",
          "Required tool flow:",
          "- market.pricetrends",
          "- market.inventory",
          "- market.affordabilityIndex",
          "- analytics.groupByZip",
          "- web.search then web.fetch for current external signals",
          "Output sections: Summary, Data Evidence, Risks, Opportunities, Next Actions.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  );

  server.registerPrompt(
    "workflow.portfolio-risk-review",
    {
      title: "Portfolio Risk Review",
      description:
        "Analyze portfolio-level concentration, downside, and liquidity risks with MCP tools.",
      argsSchema: {
        holdingsJson: z
          .string()
          .describe("JSON array of holdings with addresses, zpids, or cities."),
        strategy: z
          .string()
          .optional()
          .describe("Optional strategy context, e.g., 'cash-flow first'."),
      },
    },
    async ({ holdingsJson, strategy }) => {
      return textPrompt(
        [
          "Run a portfolio risk review.",
          `Holdings JSON: ${holdingsJson}`,
          strategy ? `Strategy: ${strategy}` : "",
          "Use tools to enrich, cluster, and score risk:",
          "- util.jsonPick (parse holdings if needed)",
          "- batch.compareProperties / batch.enrichProperties",
          "- graph.pathMatrix",
          "- market.competitiveAnalysis",
          "- finance.capRate and finance.rentVsBuy when relevant",
          "Deliver: concentration risk, valuation risk, liquidity risk, and mitigation actions.",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    },
  );
}
