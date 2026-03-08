import type { RunnableConfig } from "@langchain/core/runnables";

const DEFAULT_PROJECT = "estatewise-agentic-ai";
const DEFAULT_SERVICE = "estatewise-agentic-ai";
const MAX_METADATA_VALUE_LENGTH = 4_000;

export type LangSmithSurface =
  | "cli"
  | "http"
  | "http-stream"
  | "a2a"
  | "crewai"
  | "langgraph"
  | "unknown";

export interface LangSmithInitOptions {
  runtime?: string;
  surface?: LangSmithSurface | string;
}

export interface LangSmithRunContext {
  runtime?: string;
  surface?: LangSmithSurface | string;
  component?: string;
  threadId?: string;
  requestId?: string;
  runName?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface LangSmithRuntimeStatus {
  enabled: boolean;
  strict: boolean;
  misconfigured: boolean;
  project: string;
  endpoint?: string;
  workspaceId?: string;
  serviceName: string;
  baseTags: string[];
}

export type LangSmithRunnableConfig = Pick<
  RunnableConfig,
  "runName" | "tags" | "metadata"
>;

const BOOL_TRUE = new Set(["1", "true", "yes", "on"]);
const BOOL_FALSE = new Set(["0", "false", "no", "off"]);

let cachedStatus: LangSmithRuntimeStatus | null = null;
let didLogEnabled = false;
let didWarnMisconfigured = false;

function resetLangSmithStateForTests() {
  cachedStatus = null;
  didLogEnabled = false;
  didWarnMisconfigured = false;
}

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseOptionalBool(raw: string | undefined): boolean | undefined {
  if (!raw) return undefined;
  const normalized = raw.trim().toLowerCase();
  if (BOOL_TRUE.has(normalized)) return true;
  if (BOOL_FALSE.has(normalized)) return false;
  return undefined;
}

function parseCsv(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function normalizeTag(tag: string): string | null {
  const cleaned = tag.trim().replace(/\s+/g, "-");
  if (!cleaned) return null;
  // Allow broad but safe tag charset for tracing filters.
  const normalized = cleaned.replace(/[^a-zA-Z0-9_.:/=-]/g, "");
  return normalized.length > 0 ? normalized : null;
}

function uniqueTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const tag = normalizeTag(raw);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    result.push(tag);
  }
  return result;
}

function valueToMetadata(value: unknown): unknown {
  if (value == null) return undefined;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const text = String(value);
    return text.length > MAX_METADATA_VALUE_LENGTH
      ? `${text.slice(0, MAX_METADATA_VALUE_LENGTH)}…`
      : value;
  }
  if (Array.isArray(value)) {
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > MAX_METADATA_VALUE_LENGTH
        ? `${serialized.slice(0, MAX_METADATA_VALUE_LENGTH)}…`
        : serialized;
    } catch {
      return String(value);
    }
  }
  if (typeof value === "object") {
    try {
      const serialized = JSON.stringify(value);
      return serialized.length > MAX_METADATA_VALUE_LENGTH
        ? `${serialized.slice(0, MAX_METADATA_VALUE_LENGTH)}…`
        : serialized;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function sanitizeMetadata(
  raw?: Record<string, unknown>,
): Record<string, unknown> {
  if (!raw) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!key) continue;
    const normalizedKey = key.trim();
    if (!normalizedKey) continue;
    const normalizedValue = valueToMetadata(value);
    if (normalizedValue !== undefined) out[normalizedKey] = normalizedValue;
  }
  return out;
}

function inferEnabled(): {
  enabled: boolean;
  strict: boolean;
  misconfigured: boolean;
} {
  const explicitEnabled = parseOptionalBool(readEnv("LANGSMITH_ENABLED"));
  const strict = parseOptionalBool(readEnv("LANGSMITH_STRICT")) ?? false;
  const tracingFlags = [
    parseOptionalBool(readEnv("LANGSMITH_TRACING_V2")),
    parseOptionalBool(readEnv("LANGCHAIN_TRACING_V2")),
    parseOptionalBool(readEnv("LANGSMITH_TRACING")),
    parseOptionalBool(readEnv("LANGCHAIN_TRACING")),
  ].filter((value) => value !== undefined);
  const tracingEnabled =
    tracingFlags.length > 0 ? tracingFlags.includes(true) : undefined;
  const hasApiKey = Boolean(readEnv("LANGSMITH_API_KEY"));

  const enabled = explicitEnabled ?? tracingEnabled ?? hasApiKey;
  const misconfigured = enabled && !hasApiKey;

  return {
    enabled: enabled ?? false,
    strict,
    misconfigured,
  };
}

function resolveStatus(): LangSmithRuntimeStatus {
  const inferred = inferEnabled();
  const project =
    readEnv("LANGSMITH_PROJECT") ||
    readEnv("LANGCHAIN_PROJECT") ||
    DEFAULT_PROJECT;
  const endpoint =
    readEnv("LANGSMITH_ENDPOINT") || readEnv("LANGCHAIN_ENDPOINT");
  const workspaceId = readEnv("LANGSMITH_WORKSPACE_ID");
  const serviceName =
    readEnv("AGENTIC_SERVICE_NAME") ||
    readEnv("SERVICE_NAME") ||
    DEFAULT_SERVICE;
  const baseTags = uniqueTags(parseCsv(readEnv("LANGSMITH_RUN_TAGS")));

  return {
    enabled: inferred.enabled,
    strict: inferred.strict,
    misconfigured: inferred.misconfigured,
    project,
    endpoint,
    workspaceId,
    serviceName,
    baseTags,
  };
}

function applyTracingEnv(status: LangSmithRuntimeStatus) {
  process.env.LANGSMITH_PROJECT = status.project;
  process.env.LANGCHAIN_PROJECT = status.project;
  if (status.endpoint) {
    process.env.LANGSMITH_ENDPOINT = status.endpoint;
  }
  if (status.workspaceId) {
    process.env.LANGSMITH_WORKSPACE_ID = status.workspaceId;
  }

  if (status.enabled && !status.misconfigured) {
    process.env.LANGSMITH_TRACING = "true";
    process.env.LANGSMITH_TRACING_V2 = "true";
    process.env.LANGCHAIN_TRACING = "true";
    process.env.LANGCHAIN_TRACING_V2 = "true";
    return;
  }

  if (status.misconfigured || readEnv("LANGSMITH_ENABLED")) {
    process.env.LANGSMITH_TRACING = "false";
    process.env.LANGSMITH_TRACING_V2 = "false";
    process.env.LANGCHAIN_TRACING = "false";
    process.env.LANGCHAIN_TRACING_V2 = "false";
  }
}

export function initializeLangSmith(
  _options: LangSmithInitOptions = {},
): LangSmithRuntimeStatus {
  if (cachedStatus) return cachedStatus;

  const status = resolveStatus();
  if (status.misconfigured) {
    const message =
      "LANGSMITH tracing requested but LANGSMITH_API_KEY is missing.";
    if (status.strict) {
      throw new Error(`[agentic-ai] ${message} Set LANGSMITH_API_KEY.`);
    }
    if (!didWarnMisconfigured) {
      didWarnMisconfigured = true;
      // eslint-disable-next-line no-console
      console.error(
        `[agentic-ai] ${message} Tracing will remain disabled (set LANGSMITH_STRICT=true to fail fast).`,
      );
    }
  }

  applyTracingEnv(status);
  if (status.enabled && !status.misconfigured && !didLogEnabled) {
    didLogEnabled = true;
    const endpointSuffix = status.endpoint
      ? ` endpoint=${status.endpoint}`
      : "";
    // eslint-disable-next-line no-console
    console.log(
      `[agentic-ai] LangSmith tracing enabled project=${status.project}${endpointSuffix}`,
    );
  }

  cachedStatus = status;
  return status;
}

export function getLangSmithStatus(): LangSmithRuntimeStatus {
  return initializeLangSmith();
}

function normalizeRunName(
  context: LangSmithRunContext,
  status: LangSmithRuntimeStatus,
) {
  if (context.runName && context.runName.trim().length > 0) {
    return context.runName.trim();
  }
  const parts = [
    status.serviceName,
    context.runtime,
    context.surface,
    context.component,
  ]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .map((part) => part.trim().replace(/\s+/g, "-"));
  return parts.length > 0 ? parts.join(".") : status.serviceName;
}

export function buildLangSmithRunnableConfig(
  context: LangSmithRunContext,
): LangSmithRunnableConfig {
  const status = initializeLangSmith();
  if (!status.enabled || status.misconfigured) return {};

  const deploymentEnv = readEnv("NODE_ENV") || "development";
  const tags = uniqueTags([
    ...status.baseTags,
    `service:${status.serviceName}`,
    `project:${status.project}`,
    `runtime:${context.runtime || "unknown"}`,
    `surface:${context.surface || "unknown"}`,
    `env:${deploymentEnv}`,
    ...(context.component ? [`component:${context.component}`] : []),
    ...(context.tags ?? []),
  ]);

  const metadata = sanitizeMetadata({
    service: status.serviceName,
    project: status.project,
    runtime: context.runtime,
    surface: context.surface,
    component: context.component,
    threadId: context.threadId,
    requestId: context.requestId,
    environment: deploymentEnv,
    appVersion: readEnv("AGENTIC_VERSION") || readEnv("npm_package_version"),
    ...context.metadata,
  });

  return {
    runName: normalizeRunName(context, status),
    tags: tags.length > 0 ? tags : undefined,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
  };
}

export function buildLangSmithModelConfig(
  context: LangSmithRunContext,
): Pick<LangSmithRunnableConfig, "tags" | "metadata"> {
  const config = buildLangSmithRunnableConfig({
    ...context,
    component: context.component ?? "llm",
  });
  return {
    tags: config.tags,
    metadata: config.metadata,
  };
}

export const __langSmithTestUtils = {
  parseOptionalBool,
  parseCsv,
  normalizeTag,
  sanitizeMetadata,
  resetLangSmithStateForTests,
};
