import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CostTracker, type CostReport } from "../costs/tracker.js";

export interface CrewTimelineEntry {
  agent: string;
  task: string;
  output: string;
}

export interface CrewStructuredResult {
  summary?: string;
  plan?: string;
  analysis?: string;
  graph?: string;
  finance?: string;
  report?: string;
  timeline: CrewTimelineEntry[];
  artifacts?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface CrewRunResult {
  ok: boolean;
  output?: string;
  json?: unknown;
  structured?: CrewStructuredResult;
  costs?: CostReport;
  error?: string;
  stderr?: string;
}

export interface CrewGoalOptions {
  context?: Record<string, unknown>;
  preferences?: string[];
  hints?: string[];
  emphasis?: string[];
  mapFocus?: string;
  includePlanner?: boolean;
  includeAnalysis?: boolean;
  includeGraph?: boolean;
  includeFinance?: boolean;
  includeReporter?: boolean;
}

export interface CrewRunnerOptions {
  python?: string;
  cwd?: string;
  timeoutMs?: number;
  env?: NodeJS.ProcessEnv;
}

interface PythonJsonResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
  json?: unknown;
  error?: string;
}

function buildPayload(goal: string, opts: CrewGoalOptions) {
  const include = {
    planner: opts.includePlanner ?? true,
    analysis: opts.includeAnalysis ?? true,
    graph: opts.includeGraph ?? true,
    finance: opts.includeFinance ?? true,
    reporter: opts.includeReporter ?? true,
  } satisfies Record<string, boolean>;

  const payload: Record<string, unknown> = {
    goal,
    include,
  };
  if (opts.context) payload.context = opts.context;
  if (opts.preferences?.length) payload.preferences = opts.preferences;
  if (opts.hints?.length) payload.hints = opts.hints;
  if (opts.emphasis?.length) payload.emphasis = opts.emphasis;
  if (opts.mapFocus) payload.mapFocus = opts.mapFocus;
  return payload;
}

function extractStructured(json: any): CrewStructuredResult | undefined {
  if (!json || typeof json !== "object") return undefined;
  const summary = typeof json.summary === "string" ? json.summary : undefined;
  const sections =
    typeof json.sections === "object" && json.sections !== null
      ? json.sections
      : {};
  const timeline = Array.isArray(json.timeline)
    ? json.timeline
        .map((entry: any) => {
          const agent = String(entry?.agent ?? entry?.role ?? "").trim();
          const task = String(entry?.task ?? entry?.name ?? "").trim();
          const outputRaw = entry?.output ?? entry?.result ?? "";
          const output =
            typeof outputRaw === "string"
              ? outputRaw
              : JSON.stringify(outputRaw, null, 2);
          if (!agent || !output) return null;
          return {
            agent,
            task: task || agent,
            output,
          } satisfies CrewTimelineEntry;
        })
        .filter(Boolean)
    : [];

  const structured: CrewStructuredResult = {
    summary,
    plan: typeof sections.plan === "string" ? sections.plan : undefined,
    analysis:
      typeof sections.analysis === "string" ? sections.analysis : json.analysis,
    graph: typeof sections.graph === "string" ? sections.graph : json.graph,
    finance:
      typeof sections.finance === "string" ? sections.finance : json.finance,
    report: typeof sections.report === "string" ? sections.report : json.result,
    timeline: timeline as CrewTimelineEntry[],
  };

  if (json.artifacts && typeof json.artifacts === "object") {
    structured.artifacts = json.artifacts as Record<string, unknown>;
  }
  if (json.metadata && typeof json.metadata === "object") {
    structured.metadata = json.metadata as Record<string, unknown>;
  }
  return structured;
}

function extractTokenUsage(json: any): {
  model?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
} | null {
  if (!json || typeof json !== "object") return null;
  const metadata = (json as any).metadata;
  if (!metadata || typeof metadata !== "object") return null;
  const usage = (metadata as any).tokenUsage;
  if (!usage || typeof usage !== "object") return null;
  const toNumber = (value: unknown) =>
    typeof value === "number" && Number.isFinite(value) ? value : undefined;
  return {
    model:
      typeof (metadata as any).model === "string"
        ? String((metadata as any).model)
        : undefined,
    promptTokens: toNumber((usage as any).promptTokens),
    completionTokens: toNumber((usage as any).completionTokens),
    totalTokens: toNumber((usage as any).totalTokens),
    cachedTokens: toNumber((usage as any).cachedTokens),
  };
}

/** Execute the Python runner and translate the response. */
export class CrewRuntime {
  private readonly python: string;
  private readonly cwd: string;
  private readonly env: NodeJS.ProcessEnv;
  private readonly timeoutMs: number;

  constructor(private readonly defaults: CrewRunnerOptions = {}) {
    const here = path.dirname(fileURLToPath(import.meta.url));
    this.python = defaults.python || process.env.PYTHON_BIN || "python3";
    this.cwd = defaults.cwd || path.resolve(here, "../../crewai");
    this.env = { ...process.env, ...defaults.env };
    this.timeoutMs = defaults.timeoutMs ?? 180_000;
  }

  async run(goal: string, opts: CrewGoalOptions & CrewRunnerOptions = {}) {
    const payload = buildPayload(goal, opts);
    const python = opts.python || this.python;
    const cwd = opts.cwd || this.cwd;
    const env = { ...this.env, ...opts.env };
    const timeoutMs = opts.timeoutMs ?? this.timeoutMs;
    const script = path.join(cwd, "runner.py");

    const costTracker = new CostTracker();
    const response = await runPythonJson(python, script, payload, {
      cwd,
      env,
      timeoutMs,
    });

    if (!response.ok) {
      return {
        ok: false,
        error: response.error || "CrewAI runner failed",
        output: response.stdout || undefined,
        stderr: response.stderr || undefined,
      } satisfies CrewRunResult;
    }

    const json = response.json;
    if (json && typeof json === "object" && (json as any).ok === false) {
      return {
        ok: false,
        error: (json as any).error || "CrewAI returned error",
        output: response.stdout || undefined,
        json,
        stderr: response.stderr || undefined,
      } satisfies CrewRunResult;
    }

    const structured = extractStructured(json);
    const usage = extractTokenUsage(json);
    if (usage) {
      let inputTokens = usage.promptTokens;
      let outputTokens = usage.completionTokens;
      if (
        inputTokens !== undefined &&
        outputTokens === undefined &&
        usage.totalTokens !== undefined
      ) {
        outputTokens = Math.max(0, usage.totalTokens - inputTokens);
      } else if (
        inputTokens === undefined &&
        outputTokens !== undefined &&
        usage.totalTokens !== undefined
      ) {
        inputTokens = Math.max(0, usage.totalTokens - outputTokens);
      } else if (
        inputTokens === undefined &&
        outputTokens === undefined &&
        usage.totalTokens !== undefined
      ) {
        inputTokens = usage.totalTokens;
        outputTokens = 0;
      }
      costTracker.recordLLMUsage({
        model: usage.model,
        usage: {
          inputTokens,
          outputTokens,
          cachedInputTokens: usage.cachedTokens,
          inputType: "text",
          outputType: "text",
        },
        operation: "chat",
        estimated:
          usage.totalTokens !== undefined &&
          (usage.promptTokens === undefined ||
            usage.completionTokens === undefined),
        metadata: { source: "crewai" },
      });
    }

    return {
      ok: true,
      output: response.stdout || undefined,
      json,
      structured,
      costs: costTracker.getReport(),
      stderr: response.stderr || undefined,
    } satisfies CrewRunResult;
  }
}

/**
 * Convenience wrapper around CrewRuntime for single-run usage.
 */
export async function runCrewAIGoal(
  goal: string,
  opts: CrewGoalOptions & CrewRunnerOptions = {},
) {
  const { python, cwd, timeoutMs, env, ...goalOptions } = opts;
  const runtime = new CrewRuntime({ python, cwd, timeoutMs, env });
  return runtime.run(goal, goalOptions);
}

export const __crewTestUtils = {
  buildPayload,
  extractStructured,
};

/** Spawn a Python script with a JSON payload and parse its JSON stdout. */
function runPythonJson(
  python: string,
  scriptPath: string,
  payload: unknown,
  opts: { cwd?: string; env?: NodeJS.ProcessEnv; timeoutMs?: number },
): Promise<PythonJsonResult> {
  return new Promise((resolve) => {
    const child = spawn(python, [scriptPath], {
      cwd: opts.cwd,
      env: opts.env,
      stdio: ["pipe", "pipe", "pipe"],
    });
    const timer = opts.timeoutMs
      ? setTimeout(() => child.kill("SIGKILL"), opts.timeoutMs)
      : null;
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.once("error", (e) => {
      if (timer) clearTimeout(timer);
      resolve({
        ok: false,
        stdout,
        stderr,
        status: null,
        error: `Failed to spawn Python runner: ${e}`,
      });
    });
    child.once("close", (code) => {
      if (timer) clearTimeout(timer);
      const trimmed = stdout.trim();
      try {
        const json = trimmed ? JSON.parse(trimmed) : undefined;
        resolve({ ok: true, stdout: trimmed, stderr, status: code, json });
      } catch (err) {
        resolve({
          ok: false,
          stdout: trimmed,
          stderr,
          status: code,
          error:
            stderr ||
            `CrewAI runner did not return valid JSON: ${(err as Error).message}`,
        });
      }
    });
    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();
  });
}
