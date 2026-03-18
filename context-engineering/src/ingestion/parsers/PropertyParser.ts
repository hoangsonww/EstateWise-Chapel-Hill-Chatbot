/**
 * @fileoverview Parser for property listing data sourced from the backend API or Neo4j.
 *
 * Converts a raw property object into graph nodes (Property, Neighborhood, ZipCode),
 * linking edges, and a knowledge-base document built from the property description.
 */

import type {
  IngestionPipeline,
  IngestionSource,
  ParsedData,
} from "../types.js";

/** Shape of a raw property payload accepted by this parser. */
interface RawProperty {
  zpid?: string | number;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  yearBuilt?: number;
  homeType?: string;
  description?: string;
  neighborhood?: string;
  [key: string]: unknown;
}

/** Price-band labels used to group properties for SIMILAR_TO edges. */
const PRICE_BANDS: Array<{ label: string; min: number; max: number }> = [
  { label: "budget", min: 0, max: 300_000 },
  { label: "midrange", min: 300_000, max: 700_000 },
  { label: "premium", min: 700_000, max: 1_500_000 },
  { label: "luxury", min: 1_500_000, max: Infinity },
];

/** Return the price-band label for a given numeric price. */
function priceBand(price: number): string {
  return (
    PRICE_BANDS.find((b) => price >= b.min && price < b.max)?.label ?? "unknown"
  );
}

/** Build a human-readable plain-text description for the KB document. */
function buildDescription(prop: RawProperty): string {
  const parts: string[] = [];

  const address = [prop.streetAddress, prop.city, prop.state, prop.zipcode]
    .filter(Boolean)
    .join(", ");
  if (address) parts.push(`Address: ${address}`);
  if (prop.price != null) parts.push(`Price: $${prop.price.toLocaleString()}`);
  if (prop.bedrooms != null) parts.push(`Bedrooms: ${prop.bedrooms}`);
  if (prop.bathrooms != null) parts.push(`Bathrooms: ${prop.bathrooms}`);
  if (prop.livingArea != null)
    parts.push(`Living Area: ${prop.livingArea} sqft`);
  if (prop.yearBuilt != null) parts.push(`Year Built: ${prop.yearBuilt}`);
  if (prop.homeType) parts.push(`Home Type: ${prop.homeType}`);
  if (prop.neighborhood) parts.push(`Neighborhood: ${prop.neighborhood}`);
  if (prop.description) parts.push(`\n${prop.description}`);

  return parts.join("\n");
}

/**
 * Parses property listing payloads into graph nodes, linking edges, and KB documents.
 *
 * Produces:
 *   - One `Property` node per listing
 *   - One `Neighborhood` node (if neighborhood is present)
 *   - One `ZipCode` node (if zipcode is present)
 *   - One `MarketSegment` node representing the price band
 *   - `IN_NEIGHBORHOOD` edge (Property → Neighborhood)
 *   - `IN_ZIP` edge (Property → ZipCode)
 *   - `BELONGS_TO` edge (Property → MarketSegment)
 *   - One KB document per property
 */
export class PropertyParser implements IngestionPipeline {
  readonly name = "PropertyParser";

  async parse(source: IngestionSource): Promise<ParsedData> {
    const prop = source.data as RawProperty;

    const zpid = String(prop.zpid ?? "unknown");
    const address =
      [prop.streetAddress, prop.city, prop.state].filter(Boolean).join(", ") ||
      `Property ${zpid}`;
    const propertyLabel = `Property:${zpid}`;

    const nodes: ParsedData["nodes"] = [];
    const edges: ParsedData["edges"] = [];

    // ----- Property node -----
    nodes.push({
      type: "Property",
      label: propertyLabel,
      importance: 0.8,
      properties: {
        zpid,
        address,
        streetAddress: prop.streetAddress ?? "",
        city: prop.city ?? "",
        state: prop.state ?? "",
        zipcode: prop.zipcode ?? "",
        price: prop.price ?? 0,
        bedrooms: prop.bedrooms ?? 0,
        bathrooms: prop.bathrooms ?? 0,
        livingArea: prop.livingArea ?? 0,
        yearBuilt: prop.yearBuilt ?? 0,
        homeType: prop.homeType ?? "unknown",
        priceBand: prop.price != null ? priceBand(prop.price) : "unknown",
        ...source.metadata,
      },
    });

    // ----- Neighborhood node + edge -----
    if (prop.neighborhood) {
      const neighborhoodLabel = `Neighborhood:${prop.neighborhood}`;
      nodes.push({
        type: "Neighborhood",
        label: neighborhoodLabel,
        importance: 0.6,
        properties: { name: prop.neighborhood, city: prop.city ?? "" },
      });
      edges.push({
        sourceLabel: propertyLabel,
        targetLabel: neighborhoodLabel,
        type: "IN_NEIGHBORHOOD",
        weight: 0.9,
      });
    }

    // ----- ZipCode node + edge -----
    if (prop.zipcode) {
      const zipLabel = `ZipCode:${prop.zipcode}`;
      nodes.push({
        type: "ZipCode",
        label: zipLabel,
        importance: 0.5,
        properties: {
          zipcode: prop.zipcode,
          city: prop.city ?? "",
          state: prop.state ?? "",
        },
      });
      edges.push({
        sourceLabel: propertyLabel,
        targetLabel: zipLabel,
        type: "IN_ZIP",
        weight: 0.85,
      });
    }

    // ----- Market segment node + edge -----
    if (prop.price != null) {
      const band = priceBand(prop.price);
      const segmentLabel = `MarketSegment:${band}`;
      nodes.push({
        type: "MarketSegment",
        label: segmentLabel,
        importance: 0.4,
        properties: {
          band,
          priceMin: PRICE_BANDS.find((b) => b.label === band)?.min ?? 0,
        },
      });
      edges.push({
        sourceLabel: propertyLabel,
        targetLabel: segmentLabel,
        type: "BELONGS_TO",
        weight: 0.7,
      });
    }

    // ----- KB document -----
    const documents: ParsedData["documents"] = [
      {
        title: address,
        content: buildDescription(prop),
        source: `property:${zpid}`,
        sourceType: "property",
        tags: [
          prop.city ?? "",
          prop.state ?? "",
          prop.homeType ?? "",
          prop.neighborhood ?? "",
          prop.zipcode ?? "",
        ].filter(Boolean),
      },
    ];

    return { nodes, edges, documents };
  }
}
