import { runRead } from "./neo4j.client";

export interface GraphProperty {
  zpid: number;
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
}

export interface SimilarWithReason {
  property: GraphProperty;
  score: number;
  reasons: string[];
}

export interface GraphOverviewNode {
  id: string;
  type: "property" | "zip" | "neighborhood";
  label: string;
  zpid?: number;
  price?: number | null;
  code?: string;
  name?: string;
}

export interface GraphOverviewEdge {
  source: string;
  target: string;
  type: "IN_ZIP" | "IN_NEIGHBORHOOD";
}

export interface GraphOverview {
  totals: {
    properties: number;
    zips: number;
    neighborhoods: number;
    edges: number;
  };
  sample: {
    properties: number;
    zips: number;
    neighborhoods: number;
    edges: number;
  };
  nodes: GraphOverviewNode[];
  edges: GraphOverviewEdge[];
}

export async function getSimilarByZpid(
  zpid: number,
  limit = 10,
): Promise<SimilarWithReason[]> {
  const rows = await runRead(
    `
    MATCH (p:Property {zpid: $zpid})
    // Collect neighborhood and zip co-membership candidates
    OPTIONAL MATCH (p)-[:IN_NEIGHBORHOOD]->(:Neighborhood)<-[:IN_NEIGHBORHOOD]-(nCand:Property)
    OPTIONAL MATCH (p)-[:IN_ZIP]->(:Zip)<-[:IN_ZIP]-(zCand:Property)
    WITH p, collect(DISTINCT nCand) + collect(DISTINCT zCand) AS cands
    UNWIND cands AS c
    WITH p, c WHERE c IS NOT NULL AND c.zpid <> p.zpid
    WITH p, c,
      abs(coalesce(c.price,0) - coalesce(p.price,0)) / (CASE WHEN coalesce(p.price,0)=0 THEN 1 ELSE p.price END) AS priceDiff,
      abs(coalesce(c.livingArea,0) - coalesce(p.livingArea,0)) / (CASE WHEN coalesce(p.livingArea,0)=0 THEN 1 ELSE p.livingArea END) AS areaDiff,
      abs(coalesce(c.bedrooms,0) - coalesce(p.bedrooms,0)) AS bedDiff,
      abs(coalesce(c.bathrooms,0) - coalesce(p.bathrooms,0)) AS bathDiff,
      EXISTS( (p)-[:IN_NEIGHBORHOOD]->(:Neighborhood)<-[:IN_NEIGHBORHOOD]-(c) ) AS sameNeighborhood,
      EXISTS( (p)-[:IN_ZIP]->(:Zip)<-[:IN_ZIP]-(c) ) AS sameZip,
      EXISTS( (p)-[:SIMILAR_TO]-(c) ) AS hasSimilarEdge
    WITH p, c,
      (priceDiff*0.5 + areaDiff*0.3 + bedDiff*0.1 + bathDiff*0.1) AS score,
      sameNeighborhood, sameZip, hasSimilarEdge
    RETURN c { .* } AS property, score, sameNeighborhood, sameZip, hasSimilarEdge
    ORDER BY score ASC
    LIMIT toInteger($limit)
    `,
    { zpid, limit },
  );

  return rows.map((r: any) => {
    const reasons: string[] = [];
    if (r.sameNeighborhood) reasons.push("same neighborhood");
    if (r.sameZip) reasons.push("same zip code");
    if (r.hasSimilarEdge) reasons.push("vector similarity");
    return {
      property: r.property as GraphProperty,
      score: typeof r.score === "number" ? r.score : Number(r.score ?? 0),
      reasons,
    };
  });
}

export async function explainPath(
  fromZpid: number,
  toZpid: number,
): Promise<{ nodes: GraphProperty[]; rels: { type: string }[] } | null> {
  const rows = await runRead(
    `
    MATCH p=allShortestPaths( (a:Property {zpid:$from})-[:IN_ZIP|IN_NEIGHBORHOOD|SIMILAR_TO*1..3]-(b:Property {zpid:$to}) )
    RETURN p
    LIMIT 1
    `,
    { from: fromZpid, to: toZpid },
  );
  if (!rows.length) return null;
  const record = rows[0] as any;
  const path = record.p;
  const nodes: GraphProperty[] = path.segments
    ? [path.start, ...path.segments.map((s: any) => s.end)].map(
        (n: any) => n.properties,
      )
    : [];
  const rels = path.segments
    ? path.segments.map((s: any) => ({ type: s.relationship.type }))
    : [];
  return { nodes, rels };
}

export async function getNeighborhoodStats(
  name: string,
  limit = 50,
): Promise<{
  count: number;
  avgPrice: number | null;
  avgArea: number | null;
  properties: GraphProperty[];
}> {
  const rows = await runRead(
    `
    MATCH (n:Neighborhood {name:$name})<-[:IN_NEIGHBORHOOD]-(p:Property)
    RETURN count(p) AS count, avg(p.price) AS avgPrice, avg(p.livingArea) AS avgArea, collect(p{.*})[0..toInteger($limit)] AS properties
    `,
    { name, limit },
  );
  if (!rows.length)
    return { count: 0, avgPrice: null, avgArea: null, properties: [] };
  const r = rows[0] as any;
  return {
    count: Number(r.count ?? 0),
    avgPrice: r.avgPrice != null ? Number(r.avgPrice) : null,
    avgArea: r.avgArea != null ? Number(r.avgArea) : null,
    properties: (r.properties || []) as GraphProperty[],
  };
}

export async function getGraphOverview(limit = 250): Promise<GraphOverview> {
  const totalsRows = await runRead(
    `
    CALL {
      MATCH (p:Property)
      RETURN count(p) AS properties
    }
    CALL {
      MATCH (z:Zip)
      RETURN count(z) AS zips
    }
    CALL {
      MATCH (n:Neighborhood)
      RETURN count(n) AS neighborhoods
    }
    CALL {
      MATCH (:Property)-[r:IN_ZIP|IN_NEIGHBORHOOD]->()
      RETURN count(r) AS edges
    }
    RETURN properties, zips, neighborhoods, edges
    `,
  );

  const sampleRows = await runRead(
    `
    MATCH (p:Property)
    WHERE p.zpid IS NOT NULL
    WITH p
    ORDER BY p.zpid DESC
    LIMIT toInteger($limit)
    WITH collect(p) AS props
    UNWIND props AS pz
    OPTIONAL MATCH (pz)-[:IN_ZIP]->(z:Zip)
    WITH props,
      collect(DISTINCT z) AS zips,
      collect(DISTINCT {
        source: "p:" + toString(pz.zpid),
        target: CASE WHEN z IS NULL THEN NULL ELSE "z:" + toString(z.code) END,
        type: "IN_ZIP"
      }) AS zipEdges
    UNWIND props AS ph
    OPTIONAL MATCH (ph)-[:IN_NEIGHBORHOOD]->(n:Neighborhood)
    WITH props, zips, zipEdges,
      collect(DISTINCT n) AS neighborhoods,
      collect(DISTINCT {
        source: "p:" + toString(ph.zpid),
        target: CASE WHEN n IS NULL THEN NULL ELSE "n:" + n.name END,
        type: "IN_NEIGHBORHOOD"
      }) AS neighborhoodEdges
    WITH
      [p IN props WHERE p IS NOT NULL | {
        id: "p:" + toString(p.zpid),
        type: "property",
        label: coalesce(p.streetAddress, "ZPID " + toString(p.zpid)),
        zpid: p.zpid,
        price: p.price
      }] AS propertyNodes,
      [z IN zips WHERE z IS NOT NULL | {
        id: "z:" + toString(z.code),
        type: "zip",
        label: "ZIP " + toString(z.code),
        code: z.code
      }] AS zipNodes,
      [n IN neighborhoods WHERE n IS NOT NULL | {
        id: "n:" + n.name,
        type: "neighborhood",
        label: n.name,
        name: n.name
      }] AS neighborhoodNodes,
      [e IN zipEdges WHERE e.target IS NOT NULL] AS zipEdgesFiltered,
      [e IN neighborhoodEdges WHERE e.target IS NOT NULL] AS neighborhoodEdgesFiltered
    RETURN
      propertyNodes + zipNodes + neighborhoodNodes AS nodes,
      zipEdgesFiltered + neighborhoodEdgesFiltered AS edges,
      size(propertyNodes) AS propertyCount,
      size(zipNodes) AS zipCount,
      size(neighborhoodNodes) AS neighborhoodCount
    `,
    { limit },
  );

  const totals = (totalsRows[0] || {}) as Record<string, number>;
  const sample = (sampleRows[0] || {}) as Record<string, any>;
  const edges = (sample.edges || []) as GraphOverviewEdge[];

  return {
    totals: {
      properties: Number(totals.properties || 0),
      zips: Number(totals.zips || 0),
      neighborhoods: Number(totals.neighborhoods || 0),
      edges: Number(totals.edges || 0),
    },
    sample: {
      properties: Number(sample.propertyCount || 0),
      zips: Number(sample.zipCount || 0),
      neighborhoods: Number(sample.neighborhoodCount || 0),
      edges: Number(edges.length),
    },
    nodes: (sample.nodes || []) as GraphOverviewNode[],
    edges,
  };
}
