/**
 * Grounding rules and validation for EstateWise prompt outputs.
 * Ensures LLM responses stay faithful to tool-provided data.
 */

/**
 * Core grounding rules that all EstateWise agents must follow.
 */
export const GROUNDING_RULES: readonly string[] = [
  "Never fabricate property listings, prices, or addresses that were not returned by a tool call.",
  "Always cite the data source and retrieval timestamp when presenting market statistics.",
  "If tool results are empty or unavailable, explicitly state that no data was found rather than generating plausible-sounding alternatives.",
  "Distinguish clearly between verified facts (from tool results) and inferred analysis (from the model).",
  "Do not extrapolate price trends beyond the time range covered by the retrieved data.",
  "When presenting comparable properties, only include properties that appeared in actual search results.",
  "Mark any neighborhood, school, or commute data as approximate if the source does not guarantee precision.",
  "Never claim a property is still available unless the listing status was confirmed by the most recent tool call.",
  "If multiple data sources conflict, present both values and note the discrepancy instead of silently choosing one.",
  "Do not round, truncate, or modify numeric values (prices, square footage, rates) from tool results without disclosure.",
] as const;

/**
 * Pre-formatted XML block to inject into any system prompt for grounding.
 */
export const GROUNDING_SYSTEM_BLOCK: string = `<grounding_rules>
${GROUNDING_RULES.map((rule, i) => `  <rule id="${i + 1}">${rule}</rule>`).join("\n")}
</grounding_rules>`;

/**
 * Describes a single grounding violation detected during validation.
 */
export interface GroundingViolation {
  ruleIndex: number;
  ruleText: string;
  evidence: string;
  severity: "low" | "medium" | "high";
}

/**
 * Extracts all dollar-formatted prices from a text string.
 */
function extractPrices(text: string): string[] {
  const pricePattern = /\$[\d,]+(?:\.\d{1,2})?/g;
  return Array.from(text.matchAll(pricePattern)).map((m) => m[0]);
}

/**
 * Extracts street-address-like patterns from a text string.
 */
function extractAddresses(text: string): string[] {
  const addressPattern =
    /\d{1,6}\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\s+(?:St|Ave|Blvd|Dr|Ln|Rd|Ct|Way|Pl|Cir|Ter)/g;
  return Array.from(text.matchAll(addressPattern)).map((m) => m[0]);
}

/**
 * Extracts percentage values from a text string.
 */
function extractPercentages(text: string): string[] {
  const pctPattern = /\d+(?:\.\d+)?%/g;
  return Array.from(text.matchAll(pctPattern)).map((m) => m[0]);
}

/**
 * Flattens an array of tool results into a single string for comparison.
 */
function flattenToolResults(toolResults: unknown[]): string {
  return toolResults
    .map((r) => (typeof r === "string" ? r : JSON.stringify(r)))
    .join(" ");
}

/**
 * Validates an LLM response against tool results to detect grounding violations.
 */
export class GroundingValidator {
  /**
   * Check a response for grounding violations by comparing extracted data
   * points (prices, addresses, percentages) against the tool result corpus.
   *
   * @param response - The LLM-generated response text.
   * @param toolResults - Array of raw tool results to validate against.
   * @returns Array of detected grounding violations.
   */
  validate(response: string, toolResults: unknown[]): GroundingViolation[] {
    const violations: GroundingViolation[] = [];
    const toolCorpus = flattenToolResults(toolResults);

    // Rule 0: Never fabricate prices
    const responsePrices = extractPrices(response);
    for (const price of responsePrices) {
      if (!toolCorpus.includes(price)) {
        violations.push({
          ruleIndex: 0,
          ruleText: GROUNDING_RULES[0],
          evidence: `Price "${price}" in response not found in any tool result.`,
          severity: "high",
        });
      }
    }

    // Rule 0: Never fabricate addresses
    const responseAddresses = extractAddresses(response);
    for (const addr of responseAddresses) {
      const normalized = addr.toLowerCase();
      if (!toolCorpus.toLowerCase().includes(normalized)) {
        violations.push({
          ruleIndex: 0,
          ruleText: GROUNDING_RULES[0],
          evidence: `Address "${addr}" in response not found in any tool result.`,
          severity: "high",
        });
      }
    }

    // Rule 1: Statistics should have source citations
    const responsePercentages = extractPercentages(response);
    for (const pct of responsePercentages) {
      if (!toolCorpus.includes(pct)) {
        violations.push({
          ruleIndex: 1,
          ruleText: GROUNDING_RULES[1],
          evidence: `Statistic "${pct}" appears in response but not in tool results.`,
          severity: "medium",
        });
      }
    }

    // Rule 2: Check for hedging when tool results are empty
    if (toolResults.length === 0 && response.length > 100) {
      const hedgingPhrases = [
        "typically",
        "usually",
        "on average",
        "generally",
        "most likely",
        "probably",
      ];
      const lower = response.toLowerCase();
      for (const phrase of hedgingPhrases) {
        if (lower.includes(phrase)) {
          violations.push({
            ruleIndex: 2,
            ruleText: GROUNDING_RULES[2],
            evidence: `Response uses hedging phrase "${phrase}" despite empty tool results, suggesting fabricated information.`,
            severity: "medium",
          });
        }
      }
    }

    // Rule 7: Availability claims without confirmation
    const availabilityPatterns = [
      /\b(?:still|currently)\s+(?:available|on the market|listed)\b/gi,
    ];
    for (const pattern of availabilityPatterns) {
      const matches = Array.from(response.matchAll(pattern));
      for (const match of matches) {
        const hasStatusInTools =
          toolCorpus.toLowerCase().includes("active") ||
          toolCorpus.toLowerCase().includes("for_sale") ||
          toolCorpus.toLowerCase().includes("available");
        if (!hasStatusInTools) {
          violations.push({
            ruleIndex: 7,
            ruleText: GROUNDING_RULES[7],
            evidence: `Availability claim "${match[0]}" not supported by listing status in tool results.`,
            severity: "high",
          });
        }
      }
    }

    // Rule 9: Check for rounded numbers
    const largeNumbers = Array.from(
      response.matchAll(/\$(\d{1,3}(?:,\d{3})*)\b/g),
    );
    for (const match of largeNumbers) {
      const raw = match[1].replace(/,/g, "");
      if (
        raw.length >= 4 &&
        /0{3,}$/.test(raw) &&
        !toolCorpus.includes(match[0])
      ) {
        violations.push({
          ruleIndex: 9,
          ruleText: GROUNDING_RULES[9],
          evidence: `Value "${match[0]}" appears to be a rounded figure not present in tool results.`,
          severity: "low",
        });
      }
    }

    return violations;
  }
}
