import fs from "node:fs";
import path from "node:path";

export interface SponsoredCampaign {
  id: string;
  zpid: number;
  boost: number;
  reason?: string;
  disclosure?: string;
}

export interface RankingPolicyConfig {
  version: string;
  maxBoost: number;
  maxSponsoredTop10: number;
  allowInjection: boolean;
  campaigns: SponsoredCampaign[];
}

export interface RankingPolicyAudit {
  version: string;
  baseZpids: number[];
  adjustedZpids: number[];
  applied: Array<{
    campaignId: string;
    zpid: number;
    boost: number;
    reason: string;
    disclosure: string;
  }>;
  disclosures: string[];
}

const DEFAULT_POLICY: RankingPolicyConfig = {
  version: "policy-v1",
  maxBoost: 50,
  maxSponsoredTop10: 2,
  allowInjection: false,
  campaigns: [],
};

let cachedPolicy: RankingPolicyConfig | null = null;

function toBool(value: string | undefined, fallback: boolean): boolean {
  if (value == null) return fallback;
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "1" ||
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "on"
  );
}

function parsePolicyInput(input: unknown): RankingPolicyConfig {
  if (!input || typeof input !== "object") return DEFAULT_POLICY;
  const raw = input as Record<string, unknown>;
  const version =
    typeof raw.version === "string" && raw.version.trim().length > 0
      ? raw.version.trim()
      : DEFAULT_POLICY.version;
  const maxBoost = Number(raw.maxBoost);
  const maxSponsoredTop10 = Number(raw.maxSponsoredTop10);
  const allowInjection =
    typeof raw.allowInjection === "boolean"
      ? raw.allowInjection
      : DEFAULT_POLICY.allowInjection;
  const campaignsRaw = Array.isArray(raw.campaigns) ? raw.campaigns : [];
  const campaigns: SponsoredCampaign[] = [];
  for (const item of campaignsRaw) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const id = String(candidate.id ?? "").trim();
    const zpid = Number(candidate.zpid);
    const boost = Number(candidate.boost);
    if (!id || !Number.isFinite(zpid) || !Number.isFinite(boost)) continue;
    campaigns.push({
      id,
      zpid,
      boost,
      reason:
        typeof candidate.reason === "string" && candidate.reason.trim().length
          ? candidate.reason.trim()
          : "sponsored",
      disclosure:
        typeof candidate.disclosure === "string" &&
        candidate.disclosure.trim().length
          ? candidate.disclosure.trim()
          : "Sponsored placement applied",
    });
  }
  return {
    version,
    maxBoost:
      Number.isFinite(maxBoost) && maxBoost > 0
        ? Math.min(500, Math.floor(maxBoost))
        : DEFAULT_POLICY.maxBoost,
    maxSponsoredTop10:
      Number.isFinite(maxSponsoredTop10) && maxSponsoredTop10 >= 0
        ? Math.min(10, Math.floor(maxSponsoredTop10))
        : DEFAULT_POLICY.maxSponsoredTop10,
    allowInjection,
    campaigns,
  };
}

function parseJsonConfig(raw: string, source: string): unknown | null {
  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(
      `[policy] Invalid JSON in ${source}; falling back to default policy. ${message}`,
    );
    return null;
  }
}

function readPolicyFromFile(filePath: string): RankingPolicyConfig | null {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) return null;
  const raw = fs.readFileSync(absolutePath, "utf8");
  const parsed = parseJsonConfig(
    raw,
    `AGENT_POLICY_CONFIG_PATH (${absolutePath})`,
  );
  if (parsed == null) return null;
  return parsePolicyInput(parsed);
}

function readPolicyFromEnv(): RankingPolicyConfig {
  const fromPath = process.env.AGENT_POLICY_CONFIG_PATH;
  if (fromPath && fromPath.trim().length > 0) {
    const parsed = readPolicyFromFile(fromPath.trim());
    if (parsed) return parsed;
  }
  const inline = process.env.AGENT_POLICY_CONFIG;
  if (inline && inline.trim().length > 0) {
    const parsed = parseJsonConfig(inline, "AGENT_POLICY_CONFIG");
    if (parsed != null) return parsePolicyInput(parsed);
  }
  return {
    ...DEFAULT_POLICY,
    allowInjection: toBool(
      process.env.AGENT_POLICY_ALLOW_INJECTION,
      DEFAULT_POLICY.allowInjection,
    ),
  };
}

export function getRankingPolicyConfig(): RankingPolicyConfig {
  if (cachedPolicy) return cachedPolicy;
  cachedPolicy = readPolicyFromEnv();
  return cachedPolicy;
}

function dedupeIds(list: number[]): number[] {
  const seen = new Set<number>();
  const deduped: number[] = [];
  for (const id of list) {
    if (!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

export function applyRankingPolicy(baseZpids: number[]): RankingPolicyAudit {
  const policy = getRankingPolicyConfig();
  const base = dedupeIds(baseZpids);
  const rankMap = new Map<number, number>();
  base.forEach((zpid, idx) => rankMap.set(zpid, idx));

  const candidateSet = new Set(base);
  if (policy.allowInjection) {
    for (const campaign of policy.campaigns) candidateSet.add(campaign.zpid);
  }
  const candidates = Array.from(candidateSet);

  const campaignByZpid = new Map<number, SponsoredCampaign>();
  for (const campaign of policy.campaigns)
    campaignByZpid.set(campaign.zpid, campaign);

  const scored = candidates.map((zpid) => {
    const baseRank = rankMap.get(zpid);
    const baseScore = baseRank == null ? 0 : 1000 - baseRank;
    const campaign = campaignByZpid.get(zpid);
    const boost = campaign
      ? Math.max(-policy.maxBoost, Math.min(policy.maxBoost, campaign.boost))
      : 0;
    return {
      zpid,
      baseRank: baseRank ?? Number.MAX_SAFE_INTEGER,
      baseScore,
      boost,
      campaign,
      finalScore: baseScore + boost,
    };
  });

  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return a.baseRank - b.baseRank;
  });

  const limitedTop10: typeof scored = [];
  let sponsoredInTop10 = 0;
  for (const item of scored) {
    if (
      limitedTop10.length < 10 &&
      item.campaign &&
      sponsoredInTop10 >= policy.maxSponsoredTop10
    ) {
      continue;
    }
    if (limitedTop10.length < 10 && item.campaign) sponsoredInTop10 += 1;
    limitedTop10.push(item);
  }
  if (limitedTop10.length < scored.length) {
    const existing = new Set(limitedTop10.map((item) => item.zpid));
    for (const item of scored) {
      if (existing.has(item.zpid)) continue;
      limitedTop10.push(item);
    }
  }

  const adjustedZpids = limitedTop10.map((item) => item.zpid);
  const applied = limitedTop10
    .filter((item) => item.campaign && item.boost !== 0)
    .map((item) => ({
      campaignId: item.campaign!.id,
      zpid: item.zpid,
      boost: item.boost,
      reason: item.campaign!.reason || "sponsored",
      disclosure: item.campaign!.disclosure || "Sponsored placement applied",
    }));
  const disclosures = Array.from(
    new Set(applied.map((entry) => entry.disclosure)),
  );

  return {
    version: policy.version,
    baseZpids: base,
    adjustedZpids,
    applied,
    disclosures,
  };
}

export const __policyTestUtils = {
  parsePolicyInput,
  dedupeIds,
  resetCache: () => {
    cachedPolicy = null;
  },
};
