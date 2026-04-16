#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";

const PIPELINE_VERSION = "2026.04.16";
const SNAPSHOT_SCHEMA_VERSION = 2;
const STATE_VERSION = 1;
const MANIFEST_VERSION = 1;

const DEFAULTS = {
  sitemapIndexUrl: "",
  robotsUrl: "https://www.zillow.com/robots.txt",
  outputDir: path.resolve(process.cwd(), "data/live-zillow/output"),
  maxSitemaps: 8,
  maxListingUrlsPerSitemap: 120,
  maxListingsToFetch: 60,
  concurrency: 4,
  timeoutMs: 15000,
  retries: 2,
  retryBackoffMs: 750,
  requestDelayMs: 250,
  refreshHours: 24,
  minQualityScore: 0.5,
  minPublishListings: 1,
  publishRequireMinCount: false,
  userAgent:
    "EstateWiseLiveDataBot/2.0 (+https://github.com/hoangsonww/AI-Assistant-Chatbot)",
};

const STATE_NAME_MAP = {
  alabama: "AL",
  alaska: "AK",
  arizona: "AZ",
  arkansas: "AR",
  california: "CA",
  colorado: "CO",
  connecticut: "CT",
  delaware: "DE",
  florida: "FL",
  georgia: "GA",
  hawaii: "HI",
  idaho: "ID",
  illinois: "IL",
  indiana: "IN",
  iowa: "IA",
  kansas: "KS",
  kentucky: "KY",
  louisiana: "LA",
  maine: "ME",
  maryland: "MD",
  massachusetts: "MA",
  michigan: "MI",
  minnesota: "MN",
  mississippi: "MS",
  missouri: "MO",
  montana: "MT",
  nebraska: "NE",
  nevada: "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  ohio: "OH",
  oklahoma: "OK",
  oregon: "OR",
  pennsylvania: "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  tennessee: "TN",
  texas: "TX",
  utah: "UT",
  vermont: "VT",
  virginia: "VA",
  washington: "WA",
  "west virginia": "WV",
  wisconsin: "WI",
  wyoming: "WY",
  "district of columbia": "DC",
};

function parseArgs(argv) {
  const options = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const [key, value = "true"] = raw.slice(2).split("=");
    options[key] = value;
  }
  return options;
}

function toInt(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.floor(n);
}

function toFloat(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function toBool(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function nowIso() {
  return new Date().toISOString();
}

function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function cleanString(value) {
  if (value == null) return null;
  const normalized = collapseWhitespace(String(value));
  return normalized.length > 0 ? normalized : null;
}

function normalizeState(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return STATE_NAME_MAP[raw.toLowerCase()] || null;
}

function normalizeZip(value) {
  const raw = cleanString(value);
  if (!raw) return null;
  const match = raw.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match ? match[1] : null;
}

function normalizeNumber(value, { min = -Infinity, max = Infinity } = {}) {
  if (value == null) return null;
  const parsed = Number(
    typeof value === "string" ? value.replace(/[^0-9.-]+/g, "") : value,
  );
  if (!Number.isFinite(parsed)) return null;
  if (parsed < min || parsed > max) return null;
  return parsed;
}

function normalizeBathrooms(value) {
  const n = normalizeNumber(value, { min: 0, max: 20 });
  if (n == null) return null;
  return Math.round(n * 4) / 4;
}

function normalizeListingUrl(url) {
  const raw = cleanString(url);
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    parsed.hash = "";
    parsed.search = "";
    return parsed.toString().replace(/\/+$/, "/");
  } catch {
    return null;
  }
}

function extractZpidFromUrl(url) {
  const match = url?.match?.(/\/(\d+)_zpid\/?$/i);
  if (!match) return null;
  return normalizeNumber(match[1], { min: 1, max: 9_999_999_999 });
}

function parseIsoToMs(value) {
  const ms = new Date(value || "").getTime();
  return Number.isFinite(ms) ? ms : null;
}

function parseXmlLocs(xmlText) {
  const locs = [];
  const regex = /<loc>([\s\S]*?)<\/loc>/gi;
  let match = regex.exec(xmlText);
  while (match) {
    const value = cleanString(match[1])
      ?.replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
    if (value) locs.push(value);
    match = regex.exec(xmlText);
  }
  return locs;
}

function isLikelySitemap(url) {
  const lower = String(url || "").toLowerCase();
  return (
    lower.endsWith(".xml") ||
    lower.endsWith(".xml.gz") ||
    lower.includes("/xml/indexes/") ||
    lower.includes("sitemap")
  );
}

function isLikelyListing(url) {
  const lower = String(url || "").toLowerCase();
  return lower.includes("/homedetails/") || lower.includes("_zpid");
}

function sitemapPriority(url) {
  const lower = String(url || "").toLowerCase();
  let score = 0;
  if (lower.includes("/hdp/")) score += 100;
  if (lower.includes("/srp/")) score += 90;
  if (lower.includes("/bdp/")) score += 80;
  if (lower.includes("/static")) score -= 40;
  if (lower.includes("mortgageapi")) score -= 100;
  return score;
}

function extractJsonLdBlocks(html) {
  const blocks = [];
  const regex =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);
  while (match) {
    const raw = cleanString(match[1]);
    if (!raw) {
      match = regex.exec(html);
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) blocks.push(...parsed);
      else blocks.push(parsed);
    } catch {
      // ignore malformed JSON-LD blocks
    }
    match = regex.exec(html);
  }
  return blocks;
}

function flattenJsonLd(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenJsonLd(item, out);
    return out;
  }
  if (!value || typeof value !== "object") return out;
  out.push(value);
  if (Array.isArray(value["@graph"])) flattenJsonLd(value["@graph"], out);
  return out;
}

function pickResidentialEntity(blocks) {
  const flattened = flattenJsonLd(blocks, []);
  if (!flattened.length) return null;
  const candidates = flattened.filter((entry) => {
    const type = String(entry?.["@type"] || "").toLowerCase();
    return (
      type.includes("residence") ||
      type.includes("singlefamily") ||
      type.includes("house") ||
      type.includes("apartment") ||
      type.includes("offer")
    );
  });
  if (candidates.length) return candidates[0];
  return flattened[0];
}

class RequestGate {
  constructor(delayMs) {
    this.delayMs = Math.max(0, delayMs);
    this.nextAt = 0;
  }

  async take() {
    if (this.delayMs <= 0) return;
    const now = Date.now();
    const waitMs = Math.max(0, this.nextAt - now);
    if (waitMs > 0) await sleep(waitMs);
    this.nextAt = Date.now() + this.delayMs;
  }
}

async function fetchTextWithRetry(url, config, gate) {
  let attempt = 0;
  let lastError = null;
  while (attempt <= config.retries) {
    attempt += 1;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    await gate.take();
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": config.userAgent,
          Accept: "text/html,application/xml,text/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      let body = bytes;
      if (bytes.length >= 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
        try {
          body = zlib.gunzipSync(bytes);
        } catch {
          body = bytes;
        }
      }
      return { text: body.toString("utf8"), attempts: attempt };
    } catch (error) {
      lastError = error;
      if (attempt <= config.retries) {
        const backoff = config.retryBackoffMs * attempt;
        await sleep(backoff);
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

function loadJson(filePath, fallbackValue) {
  if (!fs.existsSync(filePath)) return fallbackValue;
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
}

function atomicWriteJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp-${process.pid}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function resolveConfig(rawOptions) {
  const seedUrls = (rawOptions.seedUrls || process.env.ZILLOW_SEED_URLS || "")
    .split(",")
    .map((v) => cleanString(v))
    .filter(Boolean);
  const sitemapUrls = (
    rawOptions.sitemapUrls ||
    process.env.ZILLOW_SITEMAP_URLS ||
    ""
  )
    .split(",")
    .map((v) => cleanString(v))
    .filter(Boolean);
  return {
    runId: new Date()
      .toISOString()
      .replace(/[-:.]/g, "")
      .replace("T", "_")
      .replace("Z", ""),
    sitemapIndexUrl:
      rawOptions.sitemap ||
      process.env.ZILLOW_SITEMAP_INDEX_URL ||
      DEFAULTS.sitemapIndexUrl,
    robotsUrl:
      rawOptions.robots || process.env.ZILLOW_ROBOTS_URL || DEFAULTS.robotsUrl,
    outputDir: path.resolve(
      rawOptions.outputDir ||
        process.env.ZILLOW_OUTPUT_DIR ||
        DEFAULTS.outputDir,
    ),
    maxSitemaps: Math.max(
      1,
      toInt(rawOptions.maxSitemaps, DEFAULTS.maxSitemaps),
    ),
    maxSitemapVisits: Math.max(
      1,
      toInt(
        rawOptions.maxSitemapVisits,
        Math.max(
          toInt(rawOptions.maxSitemaps, DEFAULTS.maxSitemaps) * 4,
          DEFAULTS.maxSitemaps,
        ),
      ),
    ),
    maxListingUrlsPerSitemap: Math.max(
      1,
      toInt(
        rawOptions.maxListingUrlsPerSitemap,
        DEFAULTS.maxListingUrlsPerSitemap,
      ),
    ),
    maxListingsToFetch: Math.max(
      1,
      toInt(rawOptions.maxListings, DEFAULTS.maxListingsToFetch),
    ),
    concurrency: Math.max(
      1,
      toInt(rawOptions.concurrency, DEFAULTS.concurrency),
    ),
    timeoutMs: Math.max(1000, toInt(rawOptions.timeoutMs, DEFAULTS.timeoutMs)),
    retries: Math.max(0, toInt(rawOptions.retries, DEFAULTS.retries)),
    retryBackoffMs: Math.max(
      100,
      toInt(rawOptions.retryBackoffMs, DEFAULTS.retryBackoffMs),
    ),
    requestDelayMs: Math.max(
      0,
      toInt(rawOptions.requestDelayMs, DEFAULTS.requestDelayMs),
    ),
    refreshHours: Math.max(
      0,
      toInt(rawOptions.refreshHours, DEFAULTS.refreshHours),
    ),
    minQualityScore: Math.min(
      1,
      Math.max(
        0,
        toFloat(rawOptions.minQualityScore, DEFAULTS.minQualityScore),
      ),
    ),
    minPublishListings: Math.max(
      1,
      toInt(rawOptions.minPublishListings, DEFAULTS.minPublishListings),
    ),
    publishRequireMinCount: toBool(
      rawOptions.publishRequireMinCount ??
        process.env.ZILLOW_PUBLISH_REQUIRE_MIN_COUNT,
      DEFAULTS.publishRequireMinCount,
    ),
    fullRefresh: toBool(rawOptions.fullRefresh, false),
    userAgent:
      rawOptions.userAgent ||
      process.env.ZILLOW_USER_AGENT ||
      DEFAULTS.userAgent,
    seedUrls,
    sitemapUrls,
  };
}

async function runWithConcurrency(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function collectListingUrls(config, gate) {
  const collected = new Set(
    config.seedUrls.map((url) => normalizeListingUrl(url)),
  );
  const warnings = [];
  const sitemapSeeds = new Set(
    config.sitemapUrls
      .map((url) => normalizeListingUrl(url))
      .filter((url) => url && isLikelySitemap(url)),
  );

  if (config.sitemapIndexUrl) {
    try {
      const { text: indexXml } = await fetchTextWithRetry(
        config.sitemapIndexUrl,
        config,
        gate,
      );
      const locs = parseXmlLocs(indexXml)
        .map((url) => normalizeListingUrl(url))
        .filter((url) => url && isLikelySitemap(url));
      for (const url of locs) sitemapSeeds.add(url);
    } catch (error) {
      warnings.push(
        `Failed sitemap index ${config.sitemapIndexUrl}: ${error?.message || String(error)}`,
      );
    }
  }

  try {
    const { text: robotsText } = await fetchTextWithRetry(
      config.robotsUrl,
      config,
      gate,
    );
    const discovered = robotsText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^sitemap:\s+/i.test(line))
      .map((line) => cleanString(line.replace(/^sitemap:\s+/i, "")))
      .map((url) => normalizeListingUrl(url))
      .filter((url) => url && isLikelySitemap(url));
    for (const url of discovered) sitemapSeeds.add(url);
  } catch (error) {
    warnings.push(
      `Failed robots sitemap discovery ${config.robotsUrl}: ${error?.message || String(error)}`,
    );
  }

  const queue = Array.from(sitemapSeeds)
    .sort((a, b) => sitemapPriority(b) - sitemapPriority(a))
    .slice(0, config.maxSitemaps);
  if (queue.length === 0) {
    warnings.push(
      "No sitemap sources discovered (configure --sitemapUrls or verify robots.txt sitemap directives).",
    );
  }
  const visited = new Set();
  while (queue.length > 0 && visited.size < config.maxSitemapVisits) {
    const sitemapUrl = queue.shift();
    if (!sitemapUrl || visited.has(sitemapUrl)) continue;
    visited.add(sitemapUrl);
    try {
      const { text: xml } = await fetchTextWithRetry(sitemapUrl, config, gate);
      const locs = parseXmlLocs(xml).slice(0, config.maxListingUrlsPerSitemap);
      for (const loc of locs) {
        const normalized = normalizeListingUrl(loc);
        if (!normalized) continue;
        if (isLikelyListing(normalized)) {
          collected.add(normalized);
          continue;
        }
        if (
          isLikelySitemap(normalized) &&
          !visited.has(normalized) &&
          !queue.includes(normalized) &&
          queue.length + visited.size < config.maxSitemapVisits
        ) {
          queue.push(normalized);
        }
      }
    } catch (error) {
      warnings.push(
        `Failed sitemap ${sitemapUrl}: ${error?.message || String(error)}`,
      );
    }
  }

  return {
    urls: Array.from(collected).filter(Boolean),
    warnings,
  };
}

function createEmptyState() {
  return {
    version: STATE_VERSION,
    updatedAt: null,
    urls: {},
    listings: {},
  };
}

function createEmptyManifest() {
  return {
    version: MANIFEST_VERSION,
    updatedAt: null,
    runs: [],
  };
}

function shouldFetchUrl(url, state, config, nowMs) {
  if (config.fullRefresh || config.refreshHours <= 0) return true;
  const entry = state.urls[url];
  const lastSuccessMs = parseIsoToMs(entry?.lastSuccessAt);
  if (!lastSuccessMs) return true;
  const maxAgeMs = config.refreshHours * 60 * 60 * 1000;
  return nowMs - lastSuccessMs >= maxAgeMs;
}

function extractAddressObject(entity) {
  if (entity?.address && typeof entity.address === "object")
    return entity.address;
  const itemOffered = entity?.offers?.itemOffered;
  if (itemOffered?.address && typeof itemOffered.address === "object") {
    return itemOffered.address;
  }
  return {};
}

function buildFullAddress(address, city, state, zipcode) {
  return [address, city, state, zipcode].filter(Boolean).join(", ") || null;
}

function normalizeListing(entity, listingUrl, fetchedAt, source) {
  const addressObj = extractAddressObject(entity);
  const city = cleanString(
    addressObj.addressLocality || entity?.addressLocality || null,
  );
  const state = normalizeState(
    addressObj.addressRegion || entity?.addressRegion || null,
  );
  const zipcode = normalizeZip(
    addressObj.postalCode || entity?.postalCode || null,
  );
  const addressLine = cleanString(
    addressObj.streetAddress || entity?.streetAddress,
  );
  const url = normalizeListingUrl(entity?.url || listingUrl);
  const zpid =
    normalizeNumber(entity?.identifier?.value || entity?.identifier, {
      min: 1,
      max: 9_999_999_999,
    }) || extractZpidFromUrl(url);
  const bedrooms = normalizeNumber(
    entity?.numberOfBedrooms || entity?.bedrooms || null,
    { min: 0, max: 30 },
  );
  const bathrooms = normalizeBathrooms(
    entity?.numberOfBathroomsTotal ||
      entity?.numberOfBathrooms ||
      entity?.bathrooms,
  );
  const livingAreaSqft = normalizeNumber(
    entity?.floorSize?.value || entity?.floorSize || null,
    { min: 100, max: 50_000 },
  );
  const price = normalizeNumber(
    entity?.price || entity?.offers?.price || null,
    {
      min: 10_000,
      max: 100_000_000,
    },
  );
  const publishedAt = cleanString(entity?.datePosted || entity?.datePublished);
  const homeType = cleanString(entity?.["@type"]) || null;
  const status = cleanString(entity?.offers?.availability) || null;
  const address = buildFullAddress(addressLine, city, state, zipcode);

  return {
    zpid,
    url,
    address,
    city,
    state,
    zipcode,
    price,
    bedrooms,
    bathrooms,
    livingAreaSqft,
    homeType,
    status,
    publishedAt,
    fetchedAt,
    source,
  };
}

function computeQuality(listing) {
  let score = 0;
  const max = 10;
  const flags = [];
  if (listing.zpid != null) score += 2;
  else flags.push("missing_zpid");
  if (listing.price != null) score += 2;
  else flags.push("missing_price");
  if (listing.address) score += 1;
  else flags.push("missing_address");
  if (listing.city) score += 1;
  else flags.push("missing_city");
  if (listing.state) score += 1;
  else flags.push("missing_state");
  if (listing.zipcode) score += 1;
  else flags.push("missing_zipcode");
  if (listing.bedrooms != null && listing.bathrooms != null) score += 1;
  else flags.push("missing_bed_bath");
  if (listing.livingAreaSqft != null) score += 1;
  else flags.push("missing_living_area");
  const qualityScore = Number((score / max).toFixed(3));
  return { qualityScore, qualityFlags: flags };
}

function validateListing(listing, minQualityScore) {
  const hardFailures = [];
  if (!listing.url) hardFailures.push("missing_url");
  if (!listing.city) hardFailures.push("missing_city");
  if (!listing.state) hardFailures.push("missing_state");
  if (
    listing.price != null &&
    listing.livingAreaSqft != null &&
    listing.livingAreaSqft > 0
  ) {
    const ppsf = listing.price / listing.livingAreaSqft;
    if (ppsf < 20 || ppsf > 10_000) hardFailures.push("price_per_sqft_outlier");
  }
  if (listing.qualityScore < minQualityScore) hardFailures.push("low_quality");
  return {
    accepted: hardFailures.length === 0,
    reasons: hardFailures,
  };
}

function listingKey(listing) {
  if (listing.zpid != null) return `zpid:${listing.zpid}`;
  return `url:${listing.url || ""}`;
}

function choosePreferred(a, b) {
  const qualityA = Number(a.qualityScore || 0);
  const qualityB = Number(b.qualityScore || 0);
  if (qualityA !== qualityB) return qualityA > qualityB ? a : b;
  const timeA = parseIsoToMs(a.fetchedAt) || 0;
  const timeB = parseIsoToMs(b.fetchedAt) || 0;
  return timeB > timeA ? b : a;
}

function mergeFlags(a = [], b = []) {
  return Array.from(new Set([...a, ...b]));
}

function mergeListings(primary, secondary) {
  const merged = { ...primary };
  for (const field of [
    "zpid",
    "url",
    "address",
    "city",
    "state",
    "zipcode",
    "price",
    "bedrooms",
    "bathrooms",
    "livingAreaSqft",
    "homeType",
    "status",
    "publishedAt",
    "fetchedAt",
    "source",
  ]) {
    if (merged[field] == null && secondary[field] != null) {
      merged[field] = secondary[field];
    }
  }
  merged.qualityScore = Math.max(
    Number(primary.qualityScore || 0),
    Number(secondary.qualityScore || 0),
  );
  merged.qualityFlags = mergeFlags(
    primary.qualityFlags,
    secondary.qualityFlags,
  );
  return merged;
}

function dedupeListings(listings) {
  const map = new Map();
  for (const listing of listings) {
    const key = listingKey(listing);
    if (!map.has(key)) {
      map.set(key, listing);
      continue;
    }
    const existing = map.get(key);
    const preferred = choosePreferred(existing, listing);
    const merged =
      preferred === existing
        ? mergeListings(existing, listing)
        : mergeListings(listing, existing);
    map.set(key, merged);
  }
  return Array.from(map.values());
}

function quantile(sortedValues, q) {
  if (!sortedValues.length) return null;
  const index = (sortedValues.length - 1) * q;
  const base = Math.floor(index);
  const rest = index - base;
  if (sortedValues[base + 1] == null) return sortedValues[base];
  return (
    sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base])
  );
}

function summarizeQuality(listings) {
  if (!listings.length) {
    return {
      average: 0,
      p10: 0,
      p50: 0,
      p90: 0,
      min: 0,
      max: 0,
    };
  }
  const values = listings
    .map((row) => Number(row.qualityScore || 0))
    .filter((v) => Number.isFinite(v))
    .sort((a, b) => a - b);
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    average: Number((total / values.length).toFixed(3)),
    p10: Number((quantile(values, 0.1) || 0).toFixed(3)),
    p50: Number((quantile(values, 0.5) || 0).toFixed(3)),
    p90: Number((quantile(values, 0.9) || 0).toFixed(3)),
    min: Number((values[0] || 0).toFixed(3)),
    max: Number((values[values.length - 1] || 0).toFixed(3)),
  };
}

function summarizeFreshness(listings, generatedAt) {
  if (!listings.length) {
    return {
      oldestFetchedAt: null,
      newestFetchedAt: null,
      oldestAgeHours: null,
      newestAgeHours: null,
    };
  }
  const generatedMs = parseIsoToMs(generatedAt) || Date.now();
  const timestamps = listings
    .map((row) => parseIsoToMs(row.fetchedAt) || parseIsoToMs(row.publishedAt))
    .filter((value) => value != null)
    .sort((a, b) => a - b);
  if (!timestamps.length) {
    return {
      oldestFetchedAt: null,
      newestFetchedAt: null,
      oldestAgeHours: null,
      newestAgeHours: null,
    };
  }
  const oldest = timestamps[0];
  const newest = timestamps[timestamps.length - 1];
  return {
    oldestFetchedAt: new Date(oldest).toISOString(),
    newestFetchedAt: new Date(newest).toISOString(),
    oldestAgeHours: Number(((generatedMs - oldest) / 36e5).toFixed(2)),
    newestAgeHours: Number(((generatedMs - newest) / 36e5).toFixed(2)),
  };
}

async function fetchListing(url, config, gate, state) {
  const fetchedAt = nowIso();
  const record = state.urls[url] || {
    lastAttemptAt: null,
    lastSuccessAt: null,
    consecutiveFailures: 0,
    lastError: null,
  };
  record.lastAttemptAt = fetchedAt;
  try {
    const { text, attempts } = await fetchTextWithRetry(url, config, gate);
    const blocks = extractJsonLdBlocks(text);
    const entity = pickResidentialEntity(blocks);
    if (!entity) throw new Error("No JSON-LD entity found");
    const normalized = normalizeListing(
      entity,
      url,
      fetchedAt,
      "zillow-web-public",
    );
    const { qualityScore, qualityFlags } = computeQuality(normalized);
    const listing = {
      ...normalized,
      qualityScore,
      qualityFlags,
    };
    record.lastSuccessAt = fetchedAt;
    record.consecutiveFailures = 0;
    record.lastError = null;
    state.urls[url] = record;
    return {
      ok: true,
      url,
      fetchedAt,
      attempts,
      listing,
    };
  } catch (error) {
    record.consecutiveFailures = Number(record.consecutiveFailures || 0) + 1;
    record.lastError = error?.message || String(error);
    state.urls[url] = record;
    return {
      ok: false,
      url,
      fetchedAt,
      error: record.lastError,
    };
  }
}

function hydrateListingState(listings, state, generatedAt) {
  for (const listing of listings) {
    const key = listingKey(listing);
    const existing = state.listings[key] || {};
    const firstSeenAt = existing.firstSeenAt || generatedAt;
    const lastSeenAt = generatedAt;
    listing.firstSeenAt = firstSeenAt;
    listing.lastSeenAt = lastSeenAt;
    state.listings[key] = {
      key,
      zpid: listing.zpid ?? null,
      url: listing.url ?? null,
      firstSeenAt,
      lastSeenAt,
      lastFetchedAt: listing.fetchedAt ?? null,
      qualityScore: listing.qualityScore ?? null,
    };
  }
}

function buildPaths(outputDir, runId) {
  const runsDir = path.join(outputDir, "runs");
  const snapshotsDir = path.join(outputDir, "snapshots");
  const baseName = `live_zillow_snapshot.${runId}`;
  return {
    runsDir,
    snapshotsDir,
    rawRunPath: path.join(runsDir, `${baseName}.raw.json`),
    normalizedRunPath: path.join(runsDir, `${baseName}.normalized.json`),
    versionedSnapshotPath: path.join(
      snapshotsDir,
      `${baseName}.normalized.json`,
    ),
    stableRawPath: path.join(outputDir, "live_zillow_snapshot.json"),
    stableNormalizedPath: path.join(
      outputDir,
      "live_zillow_snapshot.normalized.json",
    ),
    statePath: path.join(outputDir, "live_zillow_state.json"),
    manifestPath: path.join(outputDir, "live_zillow_manifest.json"),
  };
}

function updateManifest(manifest, entry) {
  const nextRuns = [entry, ...(manifest.runs || [])].slice(0, 100);
  return {
    version: MANIFEST_VERSION,
    updatedAt: nowIso(),
    runs: nextRuns,
  };
}

async function main() {
  const startedAt = Date.now();
  const rawOptions = parseArgs(process.argv.slice(2));
  const config = resolveConfig(rawOptions);
  const paths = buildPaths(config.outputDir, config.runId);
  const requestGate = new RequestGate(config.requestDelayMs);
  const state = loadJson(paths.statePath, createEmptyState());
  const manifest = loadJson(paths.manifestPath, createEmptyManifest());

  if (!state.version) state.version = STATE_VERSION;
  if (!state.urls) state.urls = {};
  if (!state.listings) state.listings = {};

  const collected = await collectListingUrls(config, requestGate);
  const nowMs = Date.now();
  const candidateUrls = collected.urls;
  const refreshableUrls = candidateUrls.filter((url) =>
    shouldFetchUrl(url, state, config, nowMs),
  );
  const selectedUrls = refreshableUrls.slice(0, config.maxListingsToFetch);

  const fetched = await runWithConcurrency(
    selectedUrls,
    config.concurrency,
    async (url) => fetchListing(url, config, requestGate, state),
  );

  const fetchErrors = fetched.filter((row) => !row?.ok);
  const successful = fetched.filter((row) => row?.ok).map((row) => row.listing);

  const accepted = [];
  const dropped = [];
  for (const listing of successful) {
    const result = validateListing(listing, config.minQualityScore);
    if (result.accepted) accepted.push(listing);
    else dropped.push({ listing, reasons: result.reasons });
  }

  const deduped = dedupeListings(accepted);
  const generatedAt = nowIso();
  hydrateListingState(deduped, state, generatedAt);
  state.updatedAt = generatedAt;

  const qualitySummary = summarizeQuality(deduped);
  const freshnessSummary = summarizeFreshness(deduped, generatedAt);
  const warnings = [...collected.warnings];

  if (!candidateUrls.length)
    warnings.push("No candidate listing URLs discovered.");
  if (!deduped.length)
    warnings.push("No listings passed validation/quality gates.");
  if (fetchErrors.length > selectedUrls.length * 0.5) {
    warnings.push("More than 50% of listing fetches failed in this run.");
  }

  const stats = {
    candidateUrlCount: candidateUrls.length,
    refreshableUrlCount: refreshableUrls.length,
    fetchedCount: selectedUrls.length,
    successCount: successful.length,
    fetchErrorCount: fetchErrors.length,
    acceptedCount: accepted.length,
    dedupedCount: deduped.length,
    droppedCount: dropped.length,
    durationMs: Date.now() - startedAt,
  };

  const rawSnapshot = {
    runId: config.runId,
    generatedAt,
    source: "zillow-web-public",
    pipelineVersion: PIPELINE_VERSION,
    config: {
      sitemapIndexUrl: config.sitemapIndexUrl,
      robotsUrl: config.robotsUrl,
      sitemapUrls: config.sitemapUrls,
      maxSitemaps: config.maxSitemaps,
      maxSitemapVisits: config.maxSitemapVisits,
      maxListingUrlsPerSitemap: config.maxListingUrlsPerSitemap,
      maxListingsToFetch: config.maxListingsToFetch,
      concurrency: config.concurrency,
      timeoutMs: config.timeoutMs,
      retries: config.retries,
      retryBackoffMs: config.retryBackoffMs,
      requestDelayMs: config.requestDelayMs,
      refreshHours: config.refreshHours,
      minQualityScore: config.minQualityScore,
      minPublishListings: config.minPublishListings,
      publishRequireMinCount: config.publishRequireMinCount,
      fullRefresh: config.fullRefresh,
      seedUrls: config.seedUrls,
    },
    stats,
    warnings,
    candidateUrls,
    selectedUrls,
    fetched,
    dropped,
  };

  const normalizedSnapshot = {
    version: SNAPSHOT_SCHEMA_VERSION,
    runId: config.runId,
    generatedAt,
    source: "zillow-web-public",
    metadata: {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      pipelineVersion: PIPELINE_VERSION,
      stats,
      quality: {
        ...qualitySummary,
        minAcceptable: config.minQualityScore,
      },
      freshness: freshnessSummary,
      warnings,
    },
    listings: deduped,
  };

  const publishAllowed = deduped.length >= config.minPublishListings;
  const published = publishAllowed;
  const publishReason = publishAllowed
    ? "published"
    : `below_min_publish_listings(${deduped.length}<${config.minPublishListings})`;

  atomicWriteJson(paths.rawRunPath, rawSnapshot);
  atomicWriteJson(paths.normalizedRunPath, normalizedSnapshot);
  atomicWriteJson(paths.versionedSnapshotPath, normalizedSnapshot);
  atomicWriteJson(paths.statePath, state);

  if (publishAllowed) {
    atomicWriteJson(paths.stableRawPath, rawSnapshot);
    atomicWriteJson(paths.stableNormalizedPath, normalizedSnapshot);
  }

  const manifestEntry = {
    runId: config.runId,
    generatedAt,
    source: "zillow-web-public",
    pipelineVersion: PIPELINE_VERSION,
    published,
    publishReason,
    stats,
    quality: qualitySummary,
    freshness: freshnessSummary,
    warnings,
    paths: {
      rawRunPath: paths.rawRunPath,
      normalizedRunPath: paths.normalizedRunPath,
      versionedSnapshotPath: paths.versionedSnapshotPath,
      stableNormalizedPath: publishAllowed ? paths.stableNormalizedPath : null,
    },
  };
  const nextManifest = updateManifest(manifest, manifestEntry);
  atomicWriteJson(paths.manifestPath, nextManifest);

  const result = {
    ok: published || !config.publishRequireMinCount,
    runId: config.runId,
    generatedAt,
    published,
    publishReason,
    output: {
      rawRunPath: paths.rawRunPath,
      normalizedRunPath: paths.normalizedRunPath,
      versionedSnapshotPath: paths.versionedSnapshotPath,
      stableNormalizedPath: publishAllowed ? paths.stableNormalizedPath : null,
      manifestPath: paths.manifestPath,
      statePath: paths.statePath,
    },
    stats,
    quality: qualitySummary,
    freshness: freshnessSummary,
    warnings,
  };

  console.log(JSON.stringify(result, null, 2));

  if (!published && config.publishRequireMinCount) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: error?.message || String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
