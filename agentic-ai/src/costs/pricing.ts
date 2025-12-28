export type Provider = "openai" | "anthropic" | "google";

export type InputType = "text" | "audio" | "image" | "video";

export interface PricingRates {
  input?: number;
  output?: number;
  cachedInput?: number;
  inputAudio?: number;
  outputAudio?: number;
  cachedInputAudio?: number;
  inputImage?: number;
  outputImage?: number;
  cachedInputImage?: number;
  inputVideo?: number;
  outputVideo?: number;
  cachedInputVideo?: number;
  cacheWrite5m?: number;
  cacheWrite1h?: number;
  cacheRefresh?: number;
  outputImagePerUnit?: number;
  outputAudioPerUnit?: number;
}

export interface PricingTier {
  maxPromptTokens?: number;
  rates: PricingRates;
}

export interface PricingEntry {
  provider: Provider;
  model: string;
  rates?: PricingRates;
  tiers?: PricingTier[];
  notes?: string;
}

export interface ResolvedPricing {
  provider: Provider;
  model: string;
  rates: PricingRates;
  notes?: string;
}

const OPENAI_PRICING: Record<string, PricingEntry> = {
  "gpt-5.2": {
    provider: "openai",
    model: "gpt-5.2",
    rates: { input: 1.75, cachedInput: 0.175, output: 14 },
  },
  "gpt-5.1": {
    provider: "openai",
    model: "gpt-5.1",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5": {
    provider: "openai",
    model: "gpt-5",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5-mini": {
    provider: "openai",
    model: "gpt-5-mini",
    rates: { input: 0.25, cachedInput: 0.025, output: 2 },
  },
  "gpt-5-nano": {
    provider: "openai",
    model: "gpt-5-nano",
    rates: { input: 0.05, cachedInput: 0.005, output: 0.4 },
  },
  "gpt-5.2-chat-latest": {
    provider: "openai",
    model: "gpt-5.2-chat-latest",
    rates: { input: 1.75, cachedInput: 0.175, output: 14 },
  },
  "gpt-5.1-chat-latest": {
    provider: "openai",
    model: "gpt-5.1-chat-latest",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5-chat-latest": {
    provider: "openai",
    model: "gpt-5-chat-latest",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5.1-codex-max": {
    provider: "openai",
    model: "gpt-5.1-codex-max",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5.1-codex": {
    provider: "openai",
    model: "gpt-5.1-codex",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5-codex": {
    provider: "openai",
    model: "gpt-5-codex",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-5.2-pro": {
    provider: "openai",
    model: "gpt-5.2-pro",
    rates: { input: 21, output: 168 },
  },
  "gpt-5-pro": {
    provider: "openai",
    model: "gpt-5-pro",
    rates: { input: 15, output: 120 },
  },
  "gpt-4.1": {
    provider: "openai",
    model: "gpt-4.1",
    rates: { input: 2, cachedInput: 0.5, output: 8 },
  },
  "gpt-4.1-mini": {
    provider: "openai",
    model: "gpt-4.1-mini",
    rates: { input: 0.4, cachedInput: 0.1, output: 1.6 },
  },
  "gpt-4.1-nano": {
    provider: "openai",
    model: "gpt-4.1-nano",
    rates: { input: 0.1, cachedInput: 0.025, output: 0.4 },
  },
  "gpt-4o": {
    provider: "openai",
    model: "gpt-4o",
    rates: { input: 2.5, cachedInput: 1.25, output: 10 },
  },
  "gpt-4o-2024-05-13": {
    provider: "openai",
    model: "gpt-4o-2024-05-13",
    rates: { input: 5, output: 15 },
  },
  "gpt-4o-mini": {
    provider: "openai",
    model: "gpt-4o-mini",
    rates: { input: 0.15, cachedInput: 0.075, output: 0.6 },
  },
  "gpt-realtime": {
    provider: "openai",
    model: "gpt-realtime",
    rates: { input: 4, cachedInput: 0.4, output: 16 },
  },
  "gpt-realtime-mini": {
    provider: "openai",
    model: "gpt-realtime-mini",
    rates: { input: 0.6, cachedInput: 0.06, output: 2.4 },
  },
  "gpt-4o-realtime-preview": {
    provider: "openai",
    model: "gpt-4o-realtime-preview",
    rates: { input: 5, cachedInput: 2.5, output: 20 },
  },
  "gpt-4o-mini-realtime-preview": {
    provider: "openai",
    model: "gpt-4o-mini-realtime-preview",
    rates: { input: 0.6, cachedInput: 0.3, output: 2.4 },
  },
  "gpt-audio": {
    provider: "openai",
    model: "gpt-audio",
    rates: { input: 2.5, output: 10 },
  },
  "gpt-audio-mini": {
    provider: "openai",
    model: "gpt-audio-mini",
    rates: { input: 0.6, output: 2.4 },
  },
  "gpt-4o-audio-preview": {
    provider: "openai",
    model: "gpt-4o-audio-preview",
    rates: { input: 2.5, output: 10 },
  },
  "gpt-4o-mini-audio-preview": {
    provider: "openai",
    model: "gpt-4o-mini-audio-preview",
    rates: { input: 0.15, output: 0.6 },
  },
  o1: {
    provider: "openai",
    model: "o1",
    rates: { input: 15, cachedInput: 7.5, output: 60 },
  },
  "o1-pro": {
    provider: "openai",
    model: "o1-pro",
    rates: { input: 150, output: 600 },
  },
  "o3-pro": {
    provider: "openai",
    model: "o3-pro",
    rates: { input: 20, output: 80 },
  },
  o3: {
    provider: "openai",
    model: "o3",
    rates: { input: 2, cachedInput: 0.5, output: 8 },
  },
  "o3-deep-research": {
    provider: "openai",
    model: "o3-deep-research",
    rates: { input: 10, cachedInput: 2.5, output: 40 },
  },
  "o4-mini": {
    provider: "openai",
    model: "o4-mini",
    rates: { input: 1.1, cachedInput: 0.275, output: 4.4 },
  },
  "o4-mini-deep-research": {
    provider: "openai",
    model: "o4-mini-deep-research",
    rates: { input: 2, cachedInput: 0.5, output: 8 },
  },
  "o3-mini": {
    provider: "openai",
    model: "o3-mini",
    rates: { input: 1.1, cachedInput: 0.55, output: 4.4 },
  },
  "o1-mini": {
    provider: "openai",
    model: "o1-mini",
    rates: { input: 1.1, cachedInput: 0.55, output: 4.4 },
  },
  "gpt-5.1-codex-mini": {
    provider: "openai",
    model: "gpt-5.1-codex-mini",
    rates: { input: 0.25, cachedInput: 0.025, output: 2 },
  },
  "codex-mini-latest": {
    provider: "openai",
    model: "codex-mini-latest",
    rates: { input: 1.5, cachedInput: 0.375, output: 6 },
  },
  "gpt-5-search-api": {
    provider: "openai",
    model: "gpt-5-search-api",
    rates: { input: 1.25, cachedInput: 0.125, output: 10 },
  },
  "gpt-4o-mini-search-preview": {
    provider: "openai",
    model: "gpt-4o-mini-search-preview",
    rates: { input: 0.15, output: 0.6 },
  },
  "gpt-4o-search-preview": {
    provider: "openai",
    model: "gpt-4o-search-preview",
    rates: { input: 2.5, output: 10 },
  },
  "computer-use-preview": {
    provider: "openai",
    model: "computer-use-preview",
    rates: { input: 3, output: 12 },
  },
  "gpt-image-1.5": {
    provider: "openai",
    model: "gpt-image-1.5",
    rates: { input: 5, cachedInput: 1.25, output: 10 },
  },
  "chatgpt-image-latest": {
    provider: "openai",
    model: "chatgpt-image-latest",
    rates: { input: 5, cachedInput: 1.25, output: 10 },
  },
  "gpt-image-1": {
    provider: "openai",
    model: "gpt-image-1",
    rates: { input: 5, cachedInput: 1.25 },
  },
  "gpt-image-1-mini": {
    provider: "openai",
    model: "gpt-image-1-mini",
    rates: { input: 2, cachedInput: 0.2 },
  },
};

const ANTHROPIC_PRICING: Record<string, PricingEntry> = {
  "claude-opus-4.5": {
    provider: "anthropic",
    model: "claude-opus-4.5",
    rates: {
      input: 5,
      cacheWrite5m: 6.25,
      cacheWrite1h: 10,
      cacheRefresh: 0.5,
      output: 25,
    },
  },
  "claude-opus-4.1": {
    provider: "anthropic",
    model: "claude-opus-4.1",
    rates: {
      input: 15,
      cacheWrite5m: 18.75,
      cacheWrite1h: 30,
      cacheRefresh: 1.5,
      output: 75,
    },
  },
  "claude-opus-4": {
    provider: "anthropic",
    model: "claude-opus-4",
    rates: {
      input: 15,
      cacheWrite5m: 18.75,
      cacheWrite1h: 30,
      cacheRefresh: 1.5,
      output: 75,
    },
  },
  "claude-sonnet-4.5": {
    provider: "anthropic",
    model: "claude-sonnet-4.5",
    rates: {
      input: 3,
      cacheWrite5m: 3.75,
      cacheWrite1h: 6,
      cacheRefresh: 0.3,
      output: 15,
    },
  },
  "claude-sonnet-4": {
    provider: "anthropic",
    model: "claude-sonnet-4",
    rates: {
      input: 3,
      cacheWrite5m: 3.75,
      cacheWrite1h: 6,
      cacheRefresh: 0.3,
      output: 15,
    },
  },
  "claude-sonnet-3.7": {
    provider: "anthropic",
    model: "claude-sonnet-3.7",
    rates: {
      input: 3,
      cacheWrite5m: 3.75,
      cacheWrite1h: 6,
      cacheRefresh: 0.3,
      output: 15,
    },
  },
  "claude-haiku-4.5": {
    provider: "anthropic",
    model: "claude-haiku-4.5",
    rates: {
      input: 1,
      cacheWrite5m: 1.25,
      cacheWrite1h: 2,
      cacheRefresh: 0.1,
      output: 5,
    },
  },
  "claude-haiku-3.5": {
    provider: "anthropic",
    model: "claude-haiku-3.5",
    rates: {
      input: 0.8,
      cacheWrite5m: 1,
      cacheWrite1h: 1.6,
      cacheRefresh: 0.08,
      output: 4,
    },
  },
  "claude-opus-3": {
    provider: "anthropic",
    model: "claude-opus-3",
    rates: {
      input: 15,
      cacheWrite5m: 18.75,
      cacheWrite1h: 30,
      cacheRefresh: 1.5,
      output: 75,
    },
  },
  "claude-haiku-3": {
    provider: "anthropic",
    model: "claude-haiku-3",
    rates: {
      input: 0.25,
      cacheWrite5m: 0.3,
      cacheWrite1h: 0.5,
      cacheRefresh: 0.03,
      output: 1.25,
    },
  },
};

const GEMINI_PRICING: Record<string, PricingEntry> = {
  "gemini-3-pro-preview": {
    provider: "google",
    model: "gemini-3-pro-preview",
    tiers: [
      {
        maxPromptTokens: 200_000,
        rates: { input: 2, output: 12, cachedInput: 0.2 },
      },
      { rates: { input: 4, output: 18, cachedInput: 0.4 } },
    ],
  },
  "gemini-3-flash-preview": {
    provider: "google",
    model: "gemini-3-flash-preview",
    rates: {
      input: 0.5,
      output: 3,
      cachedInput: 0.05,
      inputAudio: 1,
      cachedInputAudio: 0.1,
    },
  },
  "gemini-3-pro-image-preview": {
    provider: "google",
    model: "gemini-3-pro-image-preview",
    rates: { input: 2, output: 12, outputImage: 120 },
    notes:
      "Image output billed at 120 USD per 1M tokens; per-image pricing varies by resolution.",
  },
  "gemini-2.5-pro": {
    provider: "google",
    model: "gemini-2.5-pro",
    tiers: [
      {
        maxPromptTokens: 200_000,
        rates: { input: 1.25, output: 10, cachedInput: 0.125 },
      },
      { rates: { input: 2.5, output: 15, cachedInput: 0.25 } },
    ],
  },
  "gemini-2.5-flash": {
    provider: "google",
    model: "gemini-2.5-flash",
    rates: {
      input: 0.3,
      output: 2.5,
      cachedInput: 0.03,
      inputAudio: 1,
      cachedInputAudio: 0.1,
    },
  },
  "gemini-2.5-flash-preview-09-2025": {
    provider: "google",
    model: "gemini-2.5-flash-preview-09-2025",
    rates: {
      input: 0.3,
      output: 2.5,
      cachedInput: 0.03,
      inputAudio: 1,
      cachedInputAudio: 0.1,
    },
  },
  "gemini-2.5-flash-lite": {
    provider: "google",
    model: "gemini-2.5-flash-lite",
    rates: {
      input: 0.1,
      output: 0.4,
      cachedInput: 0.01,
      inputAudio: 0.3,
      cachedInputAudio: 0.03,
    },
  },
  "gemini-2.5-flash-lite-preview-09-2025": {
    provider: "google",
    model: "gemini-2.5-flash-lite-preview-09-2025",
    rates: {
      input: 0.1,
      output: 0.4,
      cachedInput: 0.01,
      inputAudio: 0.3,
      cachedInputAudio: 0.03,
    },
  },
  "gemini-2.5-flash-native-audio-preview-12-2025": {
    provider: "google",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    rates: { input: 0.5, output: 2, inputAudio: 3, outputAudio: 12 },
  },
  "gemini-2.5-flash-image": {
    provider: "google",
    model: "gemini-2.5-flash-image",
    rates: { input: 0.3, output: 2.5, outputImage: 30 },
    notes:
      "Image output billed at 30 USD per 1M tokens (~0.039 per 1024x1024 image).",
  },
  "gemini-2.5-flash-preview-tts": {
    provider: "google",
    model: "gemini-2.5-flash-preview-tts",
    rates: { input: 0.5, outputAudio: 10 },
  },
  "gemini-2.5-pro-preview-tts": {
    provider: "google",
    model: "gemini-2.5-pro-preview-tts",
    rates: { input: 1, outputAudio: 20 },
  },
  "gemini-2.0-flash": {
    provider: "google",
    model: "gemini-2.0-flash",
    rates: {
      input: 0.1,
      output: 0.4,
      cachedInput: 0.025,
      inputAudio: 0.7,
      cachedInputAudio: 0.175,
      outputImage: 30,
    },
    notes:
      "Image output billed at 30 USD per 1M tokens (~0.039 per 1024x1024 image).",
  },
  "gemini-2.0-flash-lite": {
    provider: "google",
    model: "gemini-2.0-flash-lite",
    rates: { input: 0.075, output: 0.3 },
  },
};

export const PRICING: Record<string, PricingEntry> = {
  ...OPENAI_PRICING,
  ...ANTHROPIC_PRICING,
  ...GEMINI_PRICING,
};

function normalizeModelName(name: string): string {
  return name.trim().toLowerCase();
}

function selectTier(
  entry: PricingEntry,
  inputTokens?: number,
): PricingRates | null {
  if (!entry.tiers?.length) return entry.rates ?? null;
  const tokens = typeof inputTokens === "number" ? inputTokens : undefined;
  const tiers = [...entry.tiers].sort((a, b) => {
    const aMax = a.maxPromptTokens ?? Number.POSITIVE_INFINITY;
    const bMax = b.maxPromptTokens ?? Number.POSITIVE_INFINITY;
    return aMax - bMax;
  });
  if (tokens !== undefined) {
    for (const tier of tiers) {
      if (
        tier.maxPromptTokens === undefined ||
        tokens <= tier.maxPromptTokens
      ) {
        return tier.rates;
      }
    }
  }
  return tiers[0]?.rates ?? null;
}

export function resolvePricing(
  model: string,
  inputTokens?: number,
): ResolvedPricing | null {
  const normalized = normalizeModelName(model);
  let entry = PRICING[normalized];
  if (!entry) {
    const candidates = Object.keys(PRICING)
      .filter((key) => normalized.includes(key))
      .sort((a, b) => b.length - a.length);
    if (candidates.length > 0) {
      entry = PRICING[candidates[0]];
    }
  }
  if (!entry) return null;
  const rates = selectTier(entry, inputTokens);
  if (!rates) return null;
  return {
    provider: entry.provider,
    model: entry.model,
    rates,
    notes: entry.notes,
  };
}
