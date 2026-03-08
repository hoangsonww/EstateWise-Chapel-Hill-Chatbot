type ToolMetric = {
  calls: number;
  errors: number;
  lastCalledAt?: number;
  totalDurationMs: number;
  durationsMs: number[];
  maxDurationMs: number;
  totalArgBytes: number;
  totalResultBytes: number;
};

type RecordMetricInput = {
  success: boolean;
  durationMs: number;
  argBytes: number;
  resultBytes?: number;
};

const MAX_DURATION_SAMPLES = 500;

const state = {
  startedAt: Date.now(),
  totalRequests: 0,
  totalErrors: 0,
  tools: new Map<string, ToolMetric>(),
};

function getOrCreateToolMetric(toolName: string): ToolMetric {
  const existing = state.tools.get(toolName);
  if (existing) return existing;
  const created: ToolMetric = {
    calls: 0,
    errors: 0,
    totalDurationMs: 0,
    durationsMs: [],
    maxDurationMs: 0,
    totalArgBytes: 0,
    totalResultBytes: 0,
  };
  state.tools.set(toolName, created);
  return created;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[idx];
}

export function recordToolCall(toolName: string, input: RecordMetricInput) {
  state.totalRequests += 1;
  if (!input.success) state.totalErrors += 1;

  const tool = getOrCreateToolMetric(toolName);
  tool.calls += 1;
  if (!input.success) tool.errors += 1;
  tool.lastCalledAt = Date.now();
  tool.totalDurationMs += input.durationMs;
  tool.maxDurationMs = Math.max(tool.maxDurationMs, input.durationMs);
  tool.totalArgBytes += Math.max(0, input.argBytes);
  tool.totalResultBytes += Math.max(0, input.resultBytes ?? 0);
  tool.durationsMs.push(input.durationMs);
  if (tool.durationsMs.length > MAX_DURATION_SAMPLES) {
    tool.durationsMs.splice(0, tool.durationsMs.length - MAX_DURATION_SAMPLES);
  }
}

export function getToolUsage(toolName: string) {
  const tool = state.tools.get(toolName);
  if (!tool) {
    return {
      toolName,
      calls: 0,
      errors: 0,
      successRatePct: 0,
      avgDurationMs: 0,
      p95DurationMs: 0,
      maxDurationMs: 0,
      avgArgBytes: 0,
      avgResultBytes: 0,
      lastCalledAt: null as string | null,
    };
  }
  const calls = tool.calls || 0;
  return {
    toolName,
    calls,
    errors: tool.errors,
    successRatePct: calls > 0 ? ((calls - tool.errors) / calls) * 100 : 0,
    avgDurationMs: calls > 0 ? tool.totalDurationMs / calls : 0,
    p95DurationMs: percentile(tool.durationsMs, 95),
    maxDurationMs: tool.maxDurationMs,
    avgArgBytes: calls > 0 ? tool.totalArgBytes / calls : 0,
    avgResultBytes: calls > 0 ? tool.totalResultBytes / calls : 0,
    lastCalledAt: tool.lastCalledAt
      ? new Date(tool.lastCalledAt).toISOString()
      : null,
  };
}

export function getMetricsSnapshot(options?: { detailed?: boolean }) {
  const detailed = !!options?.detailed;
  const uptimeMs = Date.now() - state.startedAt;
  const allTools = Array.from(state.tools.keys()).sort();
  const tools = Object.fromEntries(
    allTools.map((name) => [name, getToolUsage(name)]),
  );
  const summary = {
    uptimeMs,
    uptimeHours: Number((uptimeMs / (1000 * 60 * 60)).toFixed(2)),
    totalRequests: state.totalRequests,
    totalErrors: state.totalErrors,
    successRatePct:
      state.totalRequests > 0
        ? ((state.totalRequests - state.totalErrors) / state.totalRequests) *
          100
        : 100,
    uniqueToolsCalled: allTools.length,
  };
  if (!detailed) return { summary, tools };
  const topTools = allTools
    .map((name) => getToolUsage(name))
    .sort((a, b) => b.calls - a.calls)
    .slice(0, 20);
  return { summary, tools, topTools };
}

export function resetMetrics() {
  state.startedAt = Date.now();
  state.totalRequests = 0;
  state.totalErrors = 0;
  state.tools.clear();
}
