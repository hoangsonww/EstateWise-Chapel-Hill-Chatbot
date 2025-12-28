import https from "node:https";
import { URL } from "node:url";

type GeminiModelListing = {
  name: string;
  supportedGenerationMethods?: string[];
};

type GeminiModelListResponse = {
  models?: GeminiModelListing[];
};

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;

let modelCache: { models: string[]; fetchedAt: number } | null = null;
let modelFetchPromise: Promise<string[]> | null = null;
let modelRotationIndex = 0;

function normalizeModelName(name: string): string {
  return name.replace(/^models\//, "");
}

function isGeminiCandidate(model: GeminiModelListing): boolean {
  const normalized = normalizeModelName(model.name);
  const lowered = normalized.toLowerCase();
  if (!lowered.includes("gemini")) return false;
  if (lowered.includes("embedding")) return false;
  if (lowered.includes("pro")) return false;
  if (
    Array.isArray(model.supportedGenerationMethods) &&
    !model.supportedGenerationMethods.includes("generateContent")
  ) {
    return false;
  }
  return true;
}

function fetchJson(url: URL): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        resolve({ statusCode: res.statusCode ?? 0, body });
      });
    });
    req.on("error", reject);
  });
}

async function fetchGeminiModels(apiKey: string): Promise<string[]> {
  const url = new URL("https://generativelanguage.googleapis.com/v1/models");
  url.searchParams.set("key", apiKey);

  const { statusCode, body } = await fetchJson(url);
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Failed to fetch Gemini models (${statusCode}).`);
  }

  let payload: GeminiModelListResponse;
  try {
    payload = JSON.parse(body) as GeminiModelListResponse;
  } catch (err) {
    throw new Error("Failed to parse Gemini models response.");
  }

  const filtered = (payload.models ?? [])
    .filter(isGeminiCandidate)
    .map((model) => normalizeModelName(model.name));

  const unique = Array.from(new Set(filtered));
  unique.sort();
  return unique;
}

export async function getGeminiModelCandidates(
  apiKey: string,
): Promise<string[]> {
  const now = Date.now();
  if (modelCache && now - modelCache.fetchedAt < MODEL_CACHE_TTL_MS) {
    return modelCache.models;
  }

  if (!modelFetchPromise) {
    modelFetchPromise = fetchGeminiModels(apiKey)
      .then((models) => {
        const resolved = models.length ? models : [DEFAULT_GEMINI_MODEL];
        modelCache = { models: resolved, fetchedAt: Date.now() };
        return resolved;
      })
      .catch((err) => {
        if (modelCache) {
          console.warn(
            "Failed to refresh Gemini model list; using cached models.",
            err,
          );
          return modelCache.models;
        }
        console.warn(
          "Failed to fetch Gemini model list; using fallback model.",
          err,
        );
        return [DEFAULT_GEMINI_MODEL];
      })
      .finally(() => {
        modelFetchPromise = null;
      });
  }

  return modelFetchPromise;
}

export function getRotatedModelCandidates(models: string[]): string[] {
  if (!models.length) return [DEFAULT_GEMINI_MODEL];
  if (models.length === 1) return models.slice();

  const start = modelRotationIndex % models.length;
  modelRotationIndex = (modelRotationIndex + 1) % models.length;

  return models.slice(start).concat(models.slice(0, start));
}

export async function runWithGeminiModelFallback<T>(
  models: string[],
  run: (modelName: string) => Promise<T>,
): Promise<T> {
  const candidates = getRotatedModelCandidates(models);
  let lastError: unknown;

  for (const modelName of candidates) {
    try {
      return await run(modelName);
    } catch (err) {
      lastError = err;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new Error("All Gemini models failed.");
}
