import https from "node:https";
import { URL } from "node:url";
import {
  getGeminiModelCandidates,
  runWithGeminiModelFallback,
} from "./geminiModels.service";

type GeminiSearchToolMode = "google_search" | "google_search_retrieval";

const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_OUTPUT_TOKENS = 1_024;
const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_DYNAMIC_THRESHOLD = 0.7;

export interface GeminiGroundingSource {
  title: string;
  uri: string;
}

export interface GeminiWebSearchResponse {
  model: string;
  toolMode: GeminiSearchToolMode;
  text: string;
  webSearchQueries: string[];
  sources: GeminiGroundingSource[];
  groundingMetadata: Record<string, unknown> | null;
}

export interface GeminiWebSearchOptions {
  modelCandidates?: string[];
  timeoutMs?: number;
  maxOutputTokens?: number;
  temperature?: number;
  dynamicThreshold?: number;
}

/**
 * Generate a web-grounded response with Gemini using Google Search tools.
 *
 * This service intentionally is not wired into any routes/controllers yet.
 * It supports both:
 * - `google_search` (modern grounding tool)
 * - `google_search_retrieval` (legacy/compat path for older models)
 */
export async function generateGeminiWebGroundedResponse(
  prompt: string,
  options: GeminiWebSearchOptions = {},
): Promise<GeminiWebSearchResponse> {
  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    throw new Error("Prompt is required.");
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_AI_API_KEY in environment variables");
  }

  const timeoutMs = sanitizePositiveInt(
    options.timeoutMs,
    readEnvInt("GEMINI_WEB_SEARCH_TIMEOUT_MS", DEFAULT_TIMEOUT_MS),
  );
  const maxOutputTokens = sanitizePositiveInt(
    options.maxOutputTokens,
    DEFAULT_MAX_OUTPUT_TOKENS,
  );
  const temperature = sanitizeBounded(
    options.temperature,
    DEFAULT_TEMPERATURE,
    0,
    2,
  );
  const dynamicThreshold = sanitizeBounded(
    options.dynamicThreshold,
    readEnvFloat(
      "GEMINI_WEB_SEARCH_DYNAMIC_THRESHOLD",
      DEFAULT_DYNAMIC_THRESHOLD,
    ),
    0,
    1,
  );

  const modelCandidates =
    options.modelCandidates?.length && options.modelCandidates.length > 0
      ? options.modelCandidates
      : await getGeminiModelCandidates(apiKey);

  return runWithGeminiModelFallback(modelCandidates, async (modelName) => {
    const toolOrder = getToolOrderForModel(modelName);
    let lastErr: unknown;

    for (const toolMode of toolOrder) {
      try {
        const payload =
          toolMode === "google_search"
            ? buildGoogleSearchPayload(trimmedPrompt, {
                maxOutputTokens,
                temperature,
              })
            : buildGoogleSearchRetrievalPayload(trimmedPrompt, {
                maxOutputTokens,
                temperature,
                dynamicThreshold,
              });

        const raw = await requestGeminiGenerateContent({
          apiKey,
          model: modelName,
          payload,
          timeoutMs,
        });

        return {
          model: modelName,
          toolMode,
          text: extractText(raw),
          webSearchQueries: extractWebSearchQueries(raw),
          sources: extractGroundingSources(raw),
          groundingMetadata: extractGroundingMetadata(raw),
        };
      } catch (err) {
        lastErr = err;
        if (!isToolCompatibilityError(err)) {
          throw err;
        }
      }
    }

    if (lastErr instanceof Error) {
      throw lastErr;
    }
    throw new Error(
      `No compatible Gemini web-search tool found for model ${modelName}.`,
    );
  });
}

function buildGoogleSearchPayload(
  prompt: string,
  cfg: { maxOutputTokens: number; temperature: number },
): Record<string, unknown> {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: {
      maxOutputTokens: cfg.maxOutputTokens,
      temperature: cfg.temperature,
    },
  };
}

function buildGoogleSearchRetrievalPayload(
  prompt: string,
  cfg: {
    maxOutputTokens: number;
    temperature: number;
    dynamicThreshold: number;
  },
): Record<string, unknown> {
  return {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    tools: [
      {
        google_search_retrieval: {
          dynamic_retrieval_config: {
            mode: "MODE_DYNAMIC",
            dynamic_threshold: cfg.dynamicThreshold,
          },
        },
      },
    ],
    generationConfig: {
      maxOutputTokens: cfg.maxOutputTokens,
      temperature: cfg.temperature,
    },
  };
}

async function requestGeminiGenerateContent(args: {
  apiKey: string;
  model: string;
  payload: Record<string, unknown>;
  timeoutMs: number;
}): Promise<Record<string, unknown>> {
  const url = new URL(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:generateContent`,
  );
  url.searchParams.set("key", args.apiKey);

  const { statusCode, body } = await postJson(
    url,
    args.payload,
    args.timeoutMs,
  );

  let json: Record<string, unknown>;
  try {
    json = JSON.parse(body) as Record<string, unknown>;
  } catch {
    throw new Error(
      `Gemini response was not valid JSON (status ${statusCode}).`,
    );
  }

  if (statusCode < 200 || statusCode >= 300) {
    const errObj = (json.error ?? {}) as Record<string, unknown>;
    const msg =
      (typeof errObj.message === "string" && errObj.message) ||
      `Gemini API request failed with status ${statusCode}.`;
    throw new Error(msg);
  }

  return json;
}

function postJson(
  url: URL,
  payload: Record<string, unknown>,
  timeoutMs: number,
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
        },
      },
      (res) => {
        let chunks = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          chunks += chunk;
        });
        res.on("end", () => {
          resolve({ statusCode: res.statusCode ?? 0, body: chunks });
        });
      },
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(
        new Error(`Gemini web-search request timed out after ${timeoutMs}ms.`),
      );
    });

    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

function getToolOrderForModel(model: string): GeminiSearchToolMode[] {
  const lowered = model.toLowerCase();
  if (lowered.includes("1.5")) {
    return ["google_search_retrieval", "google_search"];
  }
  return ["google_search", "google_search_retrieval"];
}

function isToolCompatibilityError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /(unsupported|not supported|unknown name|invalid argument|google_search|google_search_retrieval)/i.test(
    message,
  );
}

function extractText(raw: Record<string, unknown>): string {
  const candidate = getFirstCandidate(raw);
  const content = (candidate?.content ?? {}) as Record<string, unknown>;
  const parts = Array.isArray(content.parts)
    ? (content.parts as Array<Record<string, unknown>>)
    : [];
  const text = parts
    .map((part) => (typeof part.text === "string" ? part.text : ""))
    .join("\n")
    .trim();
  return text;
}

function extractGroundingMetadata(
  raw: Record<string, unknown>,
): Record<string, unknown> | null {
  const candidate = getFirstCandidate(raw);
  const fromCamel = candidate?.groundingMetadata;
  const fromSnake = candidate?.grounding_metadata;
  const metadata =
    (fromCamel as Record<string, unknown> | undefined) ||
    (fromSnake as Record<string, unknown> | undefined) ||
    null;
  return metadata;
}

function extractWebSearchQueries(raw: Record<string, unknown>): string[] {
  const metadata = extractGroundingMetadata(raw);
  if (!metadata) return [];

  const direct = metadata.webSearchQueries;
  const snake = metadata.web_search_queries;
  const queries = (
    Array.isArray(direct) ? direct : Array.isArray(snake) ? snake : []
  ) as unknown[];

  return Array.from(
    new Set(
      queries
        .map((q) => (typeof q === "string" ? q.trim() : ""))
        .filter(Boolean),
    ),
  );
}

function extractGroundingSources(
  raw: Record<string, unknown>,
): GeminiGroundingSource[] {
  const metadata = extractGroundingMetadata(raw);
  if (!metadata) return [];

  const chunks = (
    Array.isArray(metadata.groundingChunks)
      ? metadata.groundingChunks
      : Array.isArray(metadata.groundingChuncks)
        ? metadata.groundingChuncks
        : Array.isArray(metadata.grounding_chunks)
          ? metadata.grounding_chunks
          : []
  ) as Array<Record<string, unknown>>;

  const sources: GeminiGroundingSource[] = [];
  const seen = new Set<string>();

  for (const chunk of chunks) {
    const web = ((chunk.web as Record<string, unknown> | undefined) ||
      (chunk.web_chunk as Record<string, unknown> | undefined) ||
      {}) as Record<string, unknown>;

    const uri = typeof web.uri === "string" ? web.uri.trim() : "";
    if (!uri || seen.has(uri)) continue;

    const title =
      typeof web.title === "string" && web.title.trim()
        ? web.title.trim()
        : uri;

    sources.push({ title, uri });
    seen.add(uri);
  }

  return sources;
}

function getFirstCandidate(
  raw: Record<string, unknown>,
): Record<string, unknown> | null {
  const candidates = Array.isArray(raw.candidates)
    ? (raw.candidates as Array<Record<string, unknown>>)
    : [];
  return candidates.length ? candidates[0] : null;
}

function readEnvInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.floor(value);
}

function readEnvFloat(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return value;
}

function sanitizePositiveInt(
  input: number | undefined,
  fallback: number,
): number {
  const value = typeof input === "number" ? input : fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.floor(value));
}

function sanitizeBounded(
  input: number | undefined,
  fallback: number,
  min: number,
  max: number,
): number {
  const value = typeof input === "number" ? input : fallback;
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}
