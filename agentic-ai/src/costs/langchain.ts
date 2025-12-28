import { BaseCallbackHandler } from "@langchain/core/callbacks/base";
import { getActiveCostTracker } from "./tracker.js";

type RunMeta = {
  model?: string;
  startedAt: number;
  estimated?: boolean;
  metadata?: Record<string, unknown>;
};

const runs = new Map<string, RunMeta>();

function readNumber(obj: any, keys: string[]): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function extractUsage(output: any): {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
  model?: string;
  estimated?: boolean;
  metadata?: Record<string, unknown>;
} {
  const llmOutput = output?.llmOutput ?? output?.output ?? {};
  const usageCandidates = [
    llmOutput?.tokenUsage,
    llmOutput?.usage,
    llmOutput?.usageMetadata,
    output?.generations?.[0]?.[0]?.generationInfo?.tokenUsage,
    output?.generations?.[0]?.[0]?.generationInfo?.usageMetadata,
    output?.generations?.[0]?.[0]?.message?.response_metadata?.tokenUsage,
    output?.generations?.[0]?.[0]?.message?.response_metadata?.usageMetadata,
  ];
  const usage = usageCandidates.find(Boolean) ?? {};
  const details =
    usage?.promptTokensDetails ??
    usage?.prompt_tokens_details ??
    usage?.promptTokensDetail;

  let inputTokens =
    readNumber(usage, [
      "promptTokens",
      "prompt_tokens",
      "inputTokens",
      "input_tokens",
      "promptTokenCount",
      "prompt_token_count",
    ]) ?? undefined;
  let outputTokens =
    readNumber(usage, [
      "completionTokens",
      "completion_tokens",
      "outputTokens",
      "output_tokens",
      "candidatesTokenCount",
      "candidates_token_count",
      "generatedTokenCount",
      "generated_token_count",
    ]) ?? undefined;
  const totalTokens =
    readNumber(usage, ["totalTokens", "total_tokens", "totalTokenCount"]) ??
    undefined;
  const cachedInputTokens =
    readNumber(usage, [
      "cachedTokens",
      "cached_tokens",
      "cacheTokens",
      "cache_tokens",
    ]) ??
    readNumber(details, ["cachedTokens", "cached_tokens"]) ??
    undefined;

  let estimated = false;
  const metadata: Record<string, unknown> = {};
  if (totalTokens !== undefined) metadata.totalTokens = totalTokens;

  if (inputTokens === undefined && totalTokens !== undefined) {
    if (outputTokens !== undefined) {
      inputTokens = Math.max(0, totalTokens - outputTokens);
      estimated = true;
      metadata.estimatedFrom = "totalMinusOutput";
    } else {
      inputTokens = totalTokens;
      outputTokens = 0;
      estimated = true;
      metadata.estimatedFrom = "totalOnly";
    }
  } else if (outputTokens === undefined && totalTokens !== undefined) {
    outputTokens = Math.max(0, totalTokens - (inputTokens ?? 0));
    estimated = true;
    metadata.estimatedFrom = "totalMinusInput";
  }

  const model =
    llmOutput?.modelName ??
    llmOutput?.model ??
    llmOutput?.model_name ??
    output?.model ??
    output?.modelName;

  return {
    inputTokens,
    outputTokens,
    cachedInputTokens,
    model,
    estimated,
    metadata,
  };
}

function extractModelFromSerialized(serialized: any, extraParams?: any) {
  return (
    extraParams?.model ??
    extraParams?.modelName ??
    extraParams?.model_name ??
    extraParams?.invocation_params?.model ??
    serialized?.kwargs?.model ??
    serialized?.kwargs?.modelName ??
    serialized?.kwargs?.model_name ??
    serialized?.model ??
    serialized?.model_name ??
    serialized?.id?.[serialized?.id?.length - 1]
  );
}

class CostTrackingCallbackHandler extends BaseCallbackHandler {
  name = "cost-tracker";

  handleLLMStart(
    serialized: any,
    _prompts: string[],
    runId: string,
    _parentRunId?: string,
    extraParams?: any,
  ) {
    const model = extractModelFromSerialized(serialized, extraParams);
    runs.set(runId, { model, startedAt: Date.now() });
  }

  handleChatModelStart(
    serialized: any,
    _messages: any[],
    runId: string,
    _parentRunId?: string,
    extraParams?: any,
  ) {
    const model = extractModelFromSerialized(serialized, extraParams);
    runs.set(runId, { model, startedAt: Date.now() });
  }

  handleLLMEnd(output: any, runId: string) {
    const tracker = getActiveCostTracker();
    if (!tracker) return;
    const runMeta = runs.get(runId);
    const usage = extractUsage(output);
    tracker.recordLLMUsage({
      model: usage.model ?? runMeta?.model,
      usage: {
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cachedInputTokens: usage.cachedInputTokens,
        inputType: "text",
        outputType: "text",
      },
      operation: "chat",
      durationMs: runMeta ? Date.now() - runMeta.startedAt : undefined,
      estimated: usage.estimated,
      metadata: usage.metadata,
    });
    runs.delete(runId);
  }

  handleLLMError(_err: any, runId: string) {
    runs.delete(runId);
  }
}

let handler: CostTrackingCallbackHandler | null = null;

export function getCostTrackingCallbacks() {
  if (!handler) handler = new CostTrackingCallbackHandler();
  return [handler];
}
