/**
 * @fileoverview Generic parser for raw text and Markdown documents.
 *
 * Handles free-form textual content such as market reports, system prompts,
 * README files, and other unstructured documents. Entity extraction links
 * the new document node to related concepts already present in the graph.
 */

import type {
  IngestionPipeline,
  IngestionSource,
  ParsedData,
} from "../types.js";

/** Shape of the raw document object accepted by this parser. */
interface RawDocument {
  title?: string;
  content?: string;
  text?: string;
  source?: string;
  sourceType?: string;
  tags?: string[];
  author?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Entity extraction helpers
// ---------------------------------------------------------------------------

/**
 * Extracts capitalised multi-word Title Case phrases as named entities.
 * Caps at 15 to avoid flooding the graph with noise.
 */
function extractNamedEntities(text: string): string[] {
  const matches = text.match(/\b([A-Z][a-z]+(?: [A-Z][a-z]+)+)\b/g) ?? [];
  return [...new Set(matches)].slice(0, 15);
}

/**
 * Extracts dollar-amount strings (e.g. "$450,000", "$1.2M").
 * Used to detect price mentions worth storing as properties.
 */
function extractDollarAmounts(text: string): string[] {
  const matches = text.match(/\$[\d,]+(?:\.\d+)?[KMB]?/gi) ?? [];
  return [...new Set(matches)].slice(0, 10);
}

/**
 * Extracts patterns that look like Zillow ZPIDs — bare runs of 6–12 digits.
 * Only included when there are no adjacent alpha characters (to avoid false positives
 * on postal codes inside addresses, which are typically 5 digits anyway).
 */
function extractZpids(text: string): string[] {
  const matches = text.match(/(?<![A-Za-z\d])\d{7,12}(?![A-Za-z\d])/g) ?? [];
  return [...new Set(matches)].slice(0, 5);
}

/** Naively estimates token count as word-count × 1.3. */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 1.3);
}

// ---------------------------------------------------------------------------
// Parser implementation
// ---------------------------------------------------------------------------

/**
 * Parses generic text/markdown documents into Document graph nodes, entity
 * concept nodes, and a KB document entry.
 *
 * Produces:
 *   - One `Document` graph node
 *   - `Concept` nodes for each extracted named entity
 *   - `LINKS_TO` edges from the Document to each Concept
 *   - `MENTIONS` edges from the Document to any resolved Property nodes (by ZPID)
 *   - One KB document containing the full text
 */
export class DocumentParser implements IngestionPipeline {
  readonly name = "DocumentParser";

  async parse(source: IngestionSource): Promise<ParsedData> {
    const raw = source.data as RawDocument;

    const text = (raw.content ?? raw.text ?? "").trim();
    const title = raw.title ?? "Untitled Document";
    const docLabel = `Document:${title.toLowerCase().replace(/\s+/g, "-").slice(0, 60)}`;

    const nodes: ParsedData["nodes"] = [];
    const edges: ParsedData["edges"] = [];

    // ----- Document node -----
    nodes.push({
      type: "Document",
      label: docLabel,
      importance: 0.55,
      properties: {
        title,
        source: raw.source ?? "unknown",
        sourceType: raw.sourceType ?? "document",
        author: raw.author ?? "",
        wordCount: text.split(/\s+/).length,
        estimatedTokens: estimateTokens(text),
        tags: raw.tags ?? [],
        ...source.metadata,
      },
    });

    // ----- Named entity concepts -----
    const entities = extractNamedEntities(text);
    for (const entity of entities) {
      const conceptLabel = `Concept:${entity}`;
      nodes.push({
        type: "Concept",
        label: conceptLabel,
        importance: 0.35,
        properties: { name: entity, origin: "document_extraction" },
      });
      edges.push({
        sourceLabel: docLabel,
        targetLabel: conceptLabel,
        type: "LINKS_TO",
        weight: 0.5,
      });
    }

    // ----- Dollar-amount entities -----
    const amounts = extractDollarAmounts(text);
    if (amounts.length > 0) {
      const amountConcept = `Concept:PriceData`;
      nodes.push({
        type: "Concept",
        label: amountConcept,
        importance: 0.3,
        properties: {
          name: "PriceData",
          amounts,
          origin: "document_extraction",
        },
      });
      edges.push({
        sourceLabel: docLabel,
        targetLabel: amountConcept,
        type: "LINKS_TO",
        weight: 0.45,
      });
    }

    // ----- Property references by ZPID -----
    const zpids = extractZpids(text);
    for (const zpid of zpids) {
      edges.push({
        sourceLabel: docLabel,
        targetLabel: `Property:${zpid}`,
        type: "MENTIONS",
        weight: 0.75,
        properties: { zpid },
      });
    }

    // ----- KB document -----
    const documents: ParsedData["documents"] = [
      {
        title,
        content: text || title,
        source: raw.source ?? `document:${docLabel}`,
        sourceType: raw.sourceType ?? "document",
        tags: raw.tags ?? [],
      },
    ];

    return { nodes, edges, documents };
  }
}
