import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { config } from "../core/config.js";
import type { ToolDef } from "../core/registry.js";

type SnapshotListing = {
  zpid?: number | string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingAreaSqft?: number | null;
  url?: string | null;
  fetchedAt?: string | null;
  publishedAt?: string | null;
  qualityScore?: number | null;
  qualityFlags?: string[] | null;
};

type LiveSnapshot = {
  version?: number;
  source?: string;
  generatedAt?: string;
  runId?: string;
  listings?: SnapshotListing[];
  records?: SnapshotListing[];
  metadata?: {
    schemaVersion?: number;
    pipelineVersion?: string;
    stats?: Record<string, unknown>;
    quality?: Record<string, unknown>;
    freshness?: Record<string, unknown>;
    warnings?: string[];
  };
};

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const MCP_ROOT = path.resolve(MODULE_DIR, "..", "..");
let lastSnapshotReadError: string | null = null;

function resolveSnapshotPath() {
  const configured = String(config.liveDataSnapshotPath || "").trim();
  if (path.isAbsolute(configured)) return configured;
  return path.resolve(MCP_ROOT, configured);
}

function readSnapshot(): LiveSnapshot | null {
  const filePath = resolveSnapshotPath();
  if (!fs.existsSync(filePath)) return null;
  try {
    const parsed = JSON.parse(
      fs.readFileSync(filePath, "utf8"),
    ) as LiveSnapshot;
    lastSnapshotReadError = null;
    return parsed;
  } catch (error) {
    lastSnapshotReadError =
      error instanceof Error ? error.message : String(error);
    return null;
  }
}

function snapshotRows(snapshot: LiveSnapshot): SnapshotListing[] {
  if (Array.isArray(snapshot.listings)) return snapshot.listings;
  if (Array.isArray(snapshot.records)) return snapshot.records;
  return [];
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim().length === 0) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function listingText(row: SnapshotListing) {
  return [row.address, row.city, row.state, row.zipcode, row.url]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function listingTimeMs(row: SnapshotListing): number {
  const parsed = new Date(row.fetchedAt || row.publishedAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function snapshotGeneratedAtMs(snapshot: LiveSnapshot): number | null {
  const parsed = new Date(snapshot.generatedAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function searchSnapshot(
  snapshot: LiveSnapshot,
  input: {
    q?: string;
    city?: string;
    state?: string;
    zipcode?: string;
    limit: number;
    maxAgeHours?: number;
    minQualityScore?: number;
  },
) {
  const all = snapshotRows(snapshot);
  const terms = (input.q || "")
    .split(/[\s,]+/)
    .map((term) => term.trim().toLowerCase())
    .filter((term) => term.length >= 2);
  const now = Date.now();
  const maxAgeMs =
    input.maxAgeHours != null && Number.isFinite(input.maxAgeHours)
      ? Math.max(1, input.maxAgeHours) * 60 * 60 * 1000
      : null;
  const minQualityScore = Math.max(
    0,
    Math.min(
      1,
      Number(input.minQualityScore ?? config.liveDataMinQualityScore),
    ),
  );

  const filtered = all.filter((row) => {
    if (
      input.city &&
      (row.city || "").toLowerCase() !== input.city.toLowerCase()
    ) {
      return false;
    }
    if (
      input.state &&
      (row.state || "").toLowerCase() !== input.state.toLowerCase()
    ) {
      return false;
    }
    if (
      input.zipcode &&
      String(row.zipcode || "").toLowerCase() !== input.zipcode.toLowerCase()
    ) {
      return false;
    }
    if (terms.length > 0) {
      const text = listingText(row);
      if (!terms.every((term) => text.includes(term))) return false;
    }
    if (maxAgeMs != null) {
      const fetchedAt = listingTimeMs(row);
      if (!Number.isFinite(fetchedAt) || fetchedAt <= 0) return false;
      if (now - fetchedAt > maxAgeMs) return false;
    }
    const rowQuality = normalizeNumber(row.qualityScore) ?? 0;
    if (rowQuality < minQualityScore) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const timeDelta = listingTimeMs(b) - listingTimeMs(a);
    if (timeDelta !== 0) return timeDelta;
    const qa = normalizeNumber(a.qualityScore) ?? 0;
    const qb = normalizeNumber(b.qualityScore) ?? 0;
    return qb - qa;
  });

  const safeLimit = Math.max(
    1,
    Math.min(input.limit, config.liveDataMaxResults),
  );
  const results = filtered.slice(0, safeLimit).map((row, index) => ({
    rank: index + 1,
    zpid: normalizeNumber(row.zpid),
    address: row.address || null,
    city: row.city || null,
    state: row.state || null,
    zipcode: row.zipcode || null,
    price: normalizeNumber(row.price),
    bedrooms: normalizeNumber(row.bedrooms),
    bathrooms: normalizeNumber(row.bathrooms),
    livingAreaSqft: normalizeNumber(row.livingAreaSqft),
    url: row.url || null,
    fetchedAt: row.fetchedAt || null,
    publishedAt: row.publishedAt || null,
    qualityScore: normalizeNumber(row.qualityScore),
    qualityFlags: Array.isArray(row.qualityFlags) ? row.qualityFlags : [],
  }));

  const generatedAtMs = snapshotGeneratedAtMs(snapshot);
  const staleHours =
    generatedAtMs != null
      ? Number(((Date.now() - generatedAtMs) / 3_600_000).toFixed(2))
      : null;
  const warnings: string[] = [];
  if (staleHours != null && staleHours > config.liveDataStaleHours) {
    warnings.push(
      `Snapshot is stale (${staleHours}h old; threshold=${config.liveDataStaleHours}h).`,
    );
  }
  if (results.length === 0 && all.length > 0) {
    warnings.push(
      "No listings matched the current filters/quality thresholds.",
    );
  }

  return {
    source: snapshot.source || "zillow-live",
    generatedAt: snapshot.generatedAt || null,
    runId: snapshot.runId || null,
    schemaVersion: snapshot.version || snapshot.metadata?.schemaVersion || null,
    totalAvailable: all.length,
    totalMatched: filtered.length,
    count: results.length,
    staleHours,
    warnings,
    metadata: {
      quality: snapshot.metadata?.quality || null,
      freshness: snapshot.metadata?.freshness || null,
      pipelineVersion: snapshot.metadata?.pipelineVersion || null,
    },
    results,
  };
}

export const liveDataTools: ToolDef[] = [
  {
    name: "live.zillow.search",
    description:
      "Search locally cached Zillow live snapshot data for fresh listing context.",
    schema: {
      q: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipcode: z.string().optional(),
      limit: z.number().int().min(1).max(100).optional(),
      maxAgeHours: z.number().min(1).max(168).optional(),
      minQualityScore: z.number().min(0).max(1).optional(),
    },
    handler: async (args: any) => {
      const snapshot = readSnapshot();
      if (!snapshot) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                source: "zillow-live",
                generatedAt: null,
                count: 0,
                totalMatched: 0,
                results: [],
                warnings: [
                  lastSnapshotReadError
                    ? `Live snapshot could not be parsed: ${lastSnapshotReadError}`
                    : "Live snapshot file not found. Run data/live-zillow/fetch_live_zillow.mjs first.",
                ],
                snapshotPath: resolveSnapshotPath(),
              }),
            },
          ],
        };
      }

      const result = searchSnapshot(snapshot, {
        q: args.q,
        city: args.city,
        state: args.state,
        zipcode: args.zipcode,
        limit: Number(args.limit ?? 10),
        maxAgeHours: args.maxAgeHours,
        minQualityScore: args.minQualityScore,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...result,
                query: {
                  q: args.q || null,
                  city: args.city || null,
                  state: args.state || null,
                  zipcode: args.zipcode || null,
                  maxAgeHours: args.maxAgeHours ?? null,
                  minQualityScore:
                    args.minQualityScore ?? config.liveDataMinQualityScore,
                },
                snapshotPath: resolveSnapshotPath(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  },
];

export const __liveDataTestUtils = {
  searchSnapshot,
};
