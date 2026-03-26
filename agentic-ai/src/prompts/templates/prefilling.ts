/**
 * Prefilling utilities for structured output extraction.
 * Helps steer model output by pre-filling the assistant turn with
 * the start of a JSON object or structured format.
 */

/**
 * Creates a JSON prefill string that starts the assistant response with
 * an opening brace and optional key, steering the model to produce valid JSON.
 *
 * @param startKey - Optional first key to include in the prefill (e.g., "properties").
 * @returns A prefill string to use as the start of the assistant message.
 */
export function createJsonPrefill(startKey?: string): string {
  if (startKey) {
    return `{"${startKey}":`;
  }
  return "{";
}

/**
 * Creates a structured prefill for more complex output shapes.
 * Begins the assistant response with a partial JSON structure that
 * includes required top-level keys to ensure they appear in the output.
 *
 * @param keys - Array of top-level keys to seed in the prefill.
 * @returns A prefill string that begins a JSON object with the specified structure.
 */
export function createStructuredPrefill(keys: string[]): string {
  if (keys.length === 0) {
    return "{";
  }

  // Start the object with the first key to guarantee it appears
  // The model will fill in the value and continue with remaining keys
  return `{"${keys[0]}":`;
}

/**
 * Strategy for placing instructions and context within the prompt.
 * Based on research showing that models attend more strongly to the
 * beginning and end of prompts (primacy and recency effects).
 */
export const PLACEMENT_STRATEGY = {
  /**
   * Critical instructions go at the very start of the system prompt.
   * The model has strongest attention at the beginning.
   */
  systemStart: "role_definition",

  /**
   * Grounding rules and constraints go immediately after the role definition.
   * These are hard rules that must never be violated.
   */
  systemEarly: "grounding_rules",

  /**
   * Reference material (schemas, examples, agent roster) goes in the middle.
   * This is consulted as needed but does not require constant attention.
   */
  systemMiddle: "reference_material",

  /**
   * Output format instructions go near the end of the system prompt.
   * Close proximity to the actual generation helps format compliance.
   */
  systemLate: "output_format",

  /**
   * The single most important instruction is repeated at the very end.
   * Recency effect ensures it has strong influence on generation.
   */
  systemEnd: "critical_reminder",

  /**
   * Prefill the assistant turn to mechanically steer output format.
   * This is the strongest format-steering technique available.
   */
  assistantPrefill: "json_structure_start",
} as const;

/**
 * Builds a complete system message by assembling components according to
 * the placement strategy. Each component is wrapped in XML tags for
 * clear delineation.
 *
 * @param components - Object mapping placement positions to content strings.
 * @returns The assembled system message string.
 */
export function buildSystemMessage(components: {
  roleDefinition: string;
  groundingRules?: string;
  referenceMaterial?: string;
  outputFormat?: string;
  criticalReminder?: string;
}): string {
  const parts: string[] = [];

  // System start: role definition (strongest attention)
  parts.push(components.roleDefinition);

  // System early: grounding rules
  if (components.groundingRules) {
    parts.push(components.groundingRules);
  }

  // System middle: reference material
  if (components.referenceMaterial) {
    parts.push(
      `<reference_material>\n${components.referenceMaterial}\n</reference_material>`,
    );
  }

  // System late: output format
  if (components.outputFormat) {
    parts.push(`<output_format>\n${components.outputFormat}\n</output_format>`);
  }

  // System end: critical reminder (recency effect)
  if (components.criticalReminder) {
    parts.push(
      `<critical_reminder>\n${components.criticalReminder}\n</critical_reminder>`,
    );
  }

  return parts.join("\n\n");
}
