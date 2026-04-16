import fs from "node:fs";
import path from "node:path";

type LiveListing = {
  zpid?: number | string;
  address?: string;
  city?: string;
  state?: string;
  zipcode?: string;
  price?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  livingAreaSqft?: number | null;
  url?: string;
  fetchedAt?: string;
  publishedAt?: string | null;
};

type LiveSnapshot = {
  source?: string;
  generatedAt?: string;
  listings?: LiveListing[];
  records?: LiveListing[];
  metadata?: Record<string, unknown>;
};

const DEFAULT_SNAPSHOT_PATH = path.resolve(
  path.resolve(__dirname, "..", "..", ".."),
  "data",
  "live-zillow",
  "output",
  "live_zillow_snapshot.normalized.json",
);

let cache: { expiresAt: number; snapshot: LiveSnapshot | null } | null = null;
const CACHE_TTL_MS = 30_000;

function snapshotPath() {
  const configured = process.env.LIVE_ZILLOW_SNAPSHOT_PATH;
  if (configured && configured.trim().length > 0) {
    const trimmed = configured.trim();
    if (path.isAbsolute(trimmed)) return trimmed;
    const backendRoot = path.resolve(__dirname, "..", "..");
    return path.resolve(backendRoot, trimmed);
  }
  return DEFAULT_SNAPSHOT_PATH;
}

function readSnapshot(): LiveSnapshot | null {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.snapshot;
  const filePath = snapshotPath();
  if (!fs.existsSync(filePath)) {
    cache = { expiresAt: now + CACHE_TTL_MS, snapshot: null };
    return null;
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as LiveSnapshot;
  cache = { expiresAt: now + CACHE_TTL_MS, snapshot: parsed };
  return parsed;
}

function getListings(snapshot: LiveSnapshot): LiveListing[] {
  if (Array.isArray(snapshot.listings)) return snapshot.listings;
  if (Array.isArray(snapshot.records)) return snapshot.records;
  return [];
}

export function getLiveDataStatus() {
  const filePath = snapshotPath();
  const snapshot = readSnapshot();
  const stat = fs.existsSync(filePath) ? fs.statSync(filePath) : null;
  const listings = snapshot ? getListings(snapshot) : [];
  return {
    enabled: !!snapshot,
    source: snapshot?.source ?? "zillow-live",
    snapshotPath: filePath,
    generatedAt: snapshot?.generatedAt ?? null,
    fileUpdatedAt: stat?.mtime.toISOString() ?? null,
    listingCount: listings.length,
    cacheTtlMs: CACHE_TTL_MS,
  };
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" && value.trim().length === 0) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n;
}

function includesAny(text: string, keywords: string[]): boolean {
  const normalized = text.toLowerCase();
  return keywords.some((k) => normalized.includes(k.toLowerCase()));
}

export function searchLiveListings(query: string, limit = 10) {
  const snapshot = readSnapshot();
  if (!snapshot) {
    return {
      query,
      source: "zillow-live",
      generatedAt: null,
      count: 0,
      results: [] as Array<Record<string, unknown>>,
    };
  }
  const normalizedLimit = Number.isFinite(limit) ? limit : 10;
  const safeLimit = Math.max(1, Math.min(50, Math.floor(normalizedLimit)));
  const listings = getListings(snapshot);
  const terms = query
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const filtered = listings.filter((item) => {
    if (!terms.length) return true;
    const haystack = [
      item.address,
      item.city,
      item.state,
      item.zipcode,
      item.url,
    ]
      .filter(Boolean)
      .join(" ");
    return includesAny(haystack, terms);
  });

  const sorted = filtered.sort((a, b) => {
    const timeA = new Date(a.fetchedAt || a.publishedAt || 0).getTime();
    const timeB = new Date(b.fetchedAt || b.publishedAt || 0).getTime();
    return timeB - timeA;
  });

  const results = sorted.slice(0, safeLimit).map((item) => ({
    zpid: item.zpid ?? null,
    address: item.address ?? null,
    city: item.city ?? null,
    state: item.state ?? null,
    zipcode: item.zipcode ?? null,
    price: normalizeNumber(item.price),
    bedrooms: normalizeNumber(item.bedrooms),
    bathrooms: normalizeNumber(item.bathrooms),
    livingAreaSqft: normalizeNumber(item.livingAreaSqft),
    url: item.url ?? null,
    fetchedAt: item.fetchedAt ?? null,
    publishedAt: item.publishedAt ?? null,
  }));

  return {
    query,
    source: snapshot.source ?? "zillow-live",
    generatedAt: snapshot.generatedAt ?? null,
    count: results.length,
    totalMatched: filtered.length,
    results,
  };
}
