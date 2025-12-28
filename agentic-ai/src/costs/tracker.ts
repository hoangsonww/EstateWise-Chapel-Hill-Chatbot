import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import {
  resolvePricing,
  type InputType,
  type Provider,
  type PricingRates,
} from "./pricing.js";

export type CostOperation = "chat" | "embedding" | "image" | "audio";

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  cacheWriteTokens?: number;
  cacheWriteTtl?: "5m" | "1h";
  cacheRefreshTokens?: number;
  inputType?: InputType;
  outputType?: InputType;
}

export interface CostEvent {
  id: string;
  timestamp: number;
  provider: Provider | "unknown";
  model: string;
  operation: CostOperation;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  cacheWriteTtl?: "5m" | "1h";
  cacheRefreshTokens: number;
  costUsd?: number;
  priced: boolean;
  reason?: string;
  estimated?: boolean;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export interface CostAggregate {
  provider?: Provider | "unknown";
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  costUsd: number;
  events: number;
  pricedEvents: number;
  unpricedEvents: number;
}

export interface UnpricedSummary {
  model: string;
  provider: Provider | "unknown";
  operation: CostOperation;
  reason: string;
  events: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}

export interface CostSummary {
  totalUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCachedInputTokens: number;
  totalEvents: number;
  pricedEvents: number;
  unpricedEvents: number;
  byModel: Record<string, CostAggregate>;
  byProvider: Record<string, CostAggregate>;
  unpriced: UnpricedSummary[];
}

export interface CostReport {
  summary: CostSummary;
  events: CostEvent[];
}

const storage = new AsyncLocalStorage<CostTracker>();

export function withCostTracking<T>(
  tracker: CostTracker,
  fn: () => Promise<T>,
): Promise<T> {
  return storage.run(tracker, fn);
}

export function getActiveCostTracker(): CostTracker | undefined {
  return storage.getStore();
}

function toNumber(value?: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function inferProvider(model: string): Provider | "unknown" {
  const normalized = model.toLowerCase();
  if (normalized.includes("claude")) return "anthropic";
  if (normalized.startsWith("gemini")) return "google";
  if (
    normalized.startsWith("gpt-") ||
    normalized.startsWith("o1") ||
    normalized.startsWith("o3") ||
    normalized.startsWith("o4") ||
    normalized.startsWith("codex") ||
    normalized.startsWith("computer-use")
  ) {
    return "openai";
  }
  return "unknown";
}

function pickRate(
  rates: PricingRates,
  type: InputType | undefined,
  key: "input" | "output" | "cachedInput",
): number | undefined {
  if (type === "audio") {
    if (key === "input") return rates.inputAudio ?? rates.input;
    if (key === "output") return rates.outputAudio ?? rates.output;
    if (key === "cachedInput")
      return rates.cachedInputAudio ?? rates.cachedInput;
  }
  if (type === "image") {
    if (key === "input") return rates.inputImage ?? rates.input;
    if (key === "output") return rates.outputImage ?? rates.output;
    if (key === "cachedInput")
      return rates.cachedInputImage ?? rates.cachedInput;
  }
  if (type === "video") {
    if (key === "input") return rates.inputVideo ?? rates.input;
    if (key === "output") return rates.outputVideo ?? rates.output;
    if (key === "cachedInput")
      return rates.cachedInputVideo ?? rates.cachedInput;
  }
  return rates[key];
}

export class CostTracker {
  private events: CostEvent[] = [];

  recordLLMUsage(params: {
    model?: string;
    usage: TokenUsage;
    operation?: CostOperation;
    durationMs?: number;
    estimated?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const model = params.model?.trim() || "unknown";
    const operation = params.operation ?? "chat";
    const usage = params.usage ?? {};
    let inputTokens = toNumber(usage.inputTokens);
    const outputTokens = toNumber(usage.outputTokens);
    const cachedInputTokens = toNumber(usage.cachedInputTokens);
    const cacheWriteTokens = toNumber(usage.cacheWriteTokens);
    const cacheRefreshTokens = toNumber(usage.cacheRefreshTokens);
    if (usage.inputTokens === undefined && cachedInputTokens > 0) {
      inputTokens = cachedInputTokens;
    }
    const resolved = resolvePricing(model, inputTokens);
    const provider = resolved?.provider ?? inferProvider(model);
    const rates = resolved?.rates;
    const inputType = usage.inputType ?? "text";
    const outputType = usage.outputType ?? inputType;

    let costUsd: number | undefined;
    let priced = false;
    let reason: string | undefined;

    const hasUsage =
      inputTokens > 0 ||
      outputTokens > 0 ||
      cachedInputTokens > 0 ||
      cacheWriteTokens > 0 ||
      cacheRefreshTokens > 0;

    if (!hasUsage) {
      reason = "Missing token usage";
    } else if (rates) {
      const cached = Math.min(cachedInputTokens, inputTokens);
      const uncached = Math.max(0, inputTokens - cached);
      const rateInput = pickRate(rates, inputType, "input");
      const rateCached = pickRate(rates, inputType, "cachedInput");
      const rateOutput = pickRate(rates, outputType, "output");
      const rateCacheWrite =
        usage.cacheWriteTtl === "1h" ? rates.cacheWrite1h : rates.cacheWrite5m;
      const rateCacheRefresh = rates.cacheRefresh;

      const missing: string[] = [];
      if (uncached > 0 && rateInput === undefined) missing.push("input");
      if (cached > 0 && rateCached === undefined) missing.push("cachedInput");
      if (outputTokens > 0 && rateOutput === undefined) missing.push("output");
      if (cacheWriteTokens > 0 && rateCacheWrite === undefined) {
        missing.push("cacheWrite");
      }
      if (cacheRefreshTokens > 0 && rateCacheRefresh === undefined) {
        missing.push("cacheRefresh");
      }

      if (missing.length === 0) {
        const inputCost = uncached * (rateInput ?? 0);
        const cachedCost = cached * (rateCached ?? 0);
        const outputCost = outputTokens * (rateOutput ?? 0);
        const cacheWriteCost = cacheWriteTokens * (rateCacheWrite ?? 0);
        const cacheRefreshCost = cacheRefreshTokens * (rateCacheRefresh ?? 0);
        costUsd =
          (inputCost +
            cachedCost +
            outputCost +
            cacheWriteCost +
            cacheRefreshCost) /
          1_000_000;
        priced = true;
      } else {
        reason = `Missing rates: ${missing.join(", ")}`;
      }
    } else {
      reason = "Model not in pricing table";
    }

    this.events.push({
      id: randomUUID(),
      timestamp: Date.now(),
      provider,
      model,
      operation,
      inputTokens,
      outputTokens,
      cachedInputTokens,
      cacheWriteTokens,
      cacheWriteTtl: usage.cacheWriteTtl,
      cacheRefreshTokens,
      costUsd,
      priced,
      reason,
      estimated: params.estimated,
      durationMs: params.durationMs,
      metadata: params.metadata,
    });
  }

  recordEmbeddingUsage(params: {
    model?: string;
    inputTokens?: number;
    inputText?: string;
    inputType?: InputType;
    durationMs?: number;
    estimated?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    const inputTokens =
      typeof params.inputTokens === "number" ? params.inputTokens : undefined;
    const inputChars =
      typeof params.inputText === "string"
        ? params.inputText.length
        : undefined;

    this.recordLLMUsage({
      model: params.model,
      usage: {
        inputTokens,
        outputTokens: 0,
        cachedInputTokens: 0,
        inputType: params.inputType ?? "text",
      },
      operation: "embedding",
      durationMs: params.durationMs,
      estimated: params.estimated,
      metadata: { ...params.metadata, inputChars },
    });
  }

  getReport(): CostReport {
    return {
      summary: this.buildSummary(),
      events: [...this.events],
    };
  }

  private buildSummary(): CostSummary {
    const byModel: Record<string, CostAggregate> = {};
    const byProvider: Record<string, CostAggregate> = {};
    const unpriced: Record<string, UnpricedSummary> = {};

    let totalUsd = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedInputTokens = 0;
    let pricedEvents = 0;
    let unpricedEvents = 0;

    const accumulate = (target: CostAggregate, event: CostEvent) => {
      target.events += 1;
      target.inputTokens += event.inputTokens;
      target.outputTokens += event.outputTokens;
      target.cachedInputTokens += event.cachedInputTokens;
      if (event.priced) {
        target.pricedEvents += 1;
        target.costUsd += event.costUsd ?? 0;
      } else {
        target.unpricedEvents += 1;
      }
    };

    for (const event of this.events) {
      totalInputTokens += event.inputTokens;
      totalOutputTokens += event.outputTokens;
      totalCachedInputTokens += event.cachedInputTokens;

      if (event.priced) {
        pricedEvents += 1;
        totalUsd += event.costUsd ?? 0;
      } else {
        unpricedEvents += 1;
        const key = `${event.model}:${event.operation}:${event.reason ?? "unknown"}`;
        const existing = unpriced[key];
        if (existing) {
          existing.events += 1;
          existing.inputTokens += event.inputTokens;
          existing.outputTokens += event.outputTokens;
          existing.cachedInputTokens += event.cachedInputTokens;
        } else {
          unpriced[key] = {
            model: event.model,
            provider: event.provider,
            operation: event.operation,
            reason: event.reason ?? "unknown",
            events: 1,
            inputTokens: event.inputTokens,
            outputTokens: event.outputTokens,
            cachedInputTokens: event.cachedInputTokens,
          };
        }
      }

      const modelKey = event.model || "unknown";
      if (!byModel[modelKey]) {
        byModel[modelKey] = {
          model: event.model,
          provider: event.provider,
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          costUsd: 0,
          events: 0,
          pricedEvents: 0,
          unpricedEvents: 0,
        };
      }
      accumulate(byModel[modelKey], event);

      const providerKey = event.provider || "unknown";
      if (!byProvider[providerKey]) {
        byProvider[providerKey] = {
          provider: event.provider,
          inputTokens: 0,
          outputTokens: 0,
          cachedInputTokens: 0,
          costUsd: 0,
          events: 0,
          pricedEvents: 0,
          unpricedEvents: 0,
        };
      }
      accumulate(byProvider[providerKey], event);
    }

    return {
      totalUsd,
      totalInputTokens,
      totalOutputTokens,
      totalCachedInputTokens,
      totalEvents: this.events.length,
      pricedEvents,
      unpricedEvents,
      byModel,
      byProvider,
      unpriced: Object.values(unpriced),
    };
  }
}
