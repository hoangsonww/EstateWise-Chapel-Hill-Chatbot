import { Agent, AgentContext, AgentMessage, PlanStep } from "../core/types.js";

/** Canonical keys for coordinator-managed steps. */
type StepKey =
  | "parseGoal"
  | "webResearch"
  | "lookup"
  | "search"
  | "summarize"
  | "groupByZip"
  | "dedupeRank"
  | "graph"
  | "comparePairs"
  | "map"
  | "mortgage"
  | "affordability"
  | "compliance";

const WEB_RESEARCH_HINT_RE =
  /\b(latest|current|today|recent|news|update|updated|trend|trends|mortgage rate|interest rate|fed|inflation|inventory|source|citation|web|internet|browse)\b/i;

/** Drives plan execution and marks steps running/done as results arrive. */
export class CoordinatorAgent implements Agent {
  role: "coordinator" = "coordinator";

  /** Return tool completion status from history for one of the provided tool names. */
  private findToolOutcome(
    ctx: AgentContext,
    toolNames: string[],
  ): "result" | "error" | null {
    for (let i = ctx.history.length - 1; i >= 0; i--) {
      const m = ctx.history[i];
      if (typeof m.content !== "string") continue;
      for (const t of toolNames) {
        if (m.content.startsWith(`Tool ${t} result`)) return "result";
        if (m.content.startsWith(`Tool ${t} error`)) return "error";
      }
    }
    return null;
  }

  /** Initialize a default plan if the blackboard lacks one. */
  private ensurePlan(ctx: AgentContext) {
    if (ctx.blackboard.plan) return;
    const steps: PlanStep[] = [
      {
        key: "parseGoal",
        description: "Parse goal for filters",
        status: "pending",
      },
      {
        key: "webResearch",
        description: "Search web for current context when needed",
        status: "pending",
      },
      {
        key: "lookup",
        description: "Lookup ZPIDs from filters",
        status: "pending",
      },
      { key: "search", description: "Run property search", status: "pending" },
      {
        key: "summarize",
        description: "Summarize search analytics",
        status: "pending",
      },
      {
        key: "groupByZip",
        description: "Group results by ZIP",
        status: "pending",
      },
      {
        key: "dedupeRank",
        description: "Dedupe and rank ZPIDs",
        status: "pending",
      },
      {
        key: "graph",
        description: "Explain/Similars in graph",
        status: "pending",
      },
      {
        key: "comparePairs",
        description: "Compare adjacent pairs in graph",
        status: "pending",
      },
      { key: "map", description: "Build map deep link", status: "pending" },
      {
        key: "mortgage",
        description: "Estimate mortgage payments",
        status: "pending",
      },
      {
        key: "affordability",
        description: "Estimate max affordable price",
        status: "pending",
      },
      {
        key: "compliance",
        description: "Run compliance and sanity checks",
        status: "pending",
      },
    ];
    ctx.blackboard.plan = { steps };
  }

  /** Identify current step: running step key or the next pending step key. */
  private currentStep(ctx: AgentContext): StepKey | null {
    const plan = ctx.blackboard.plan!;
    const running = plan.steps.find((s) => s.status === "running");
    if (running?.key) return running.key as StepKey;
    const next = plan.steps.find((s) => s.status === "pending");
    return (next?.key as StepKey) || null;
  }

  /** Mark a step done and clear in-flight state. */
  private markDone(ctx: AgentContext, key: StepKey) {
    const st = ctx.blackboard.plan?.steps.find((s) => s.key === key);
    if (st) st.status = "done";
    if (ctx.blackboard.plan) ctx.blackboard.plan.inFlightStepKey = undefined;
  }

  /** Mark a step failed and clear in-flight state so the plan can continue. */
  private markError(ctx: AgentContext, key: StepKey) {
    const st = ctx.blackboard.plan?.steps.find((s) => s.key === key);
    if (st) st.status = "error";
    if (ctx.blackboard.plan) ctx.blackboard.plan.inFlightStepKey = undefined;
  }

  /** Mark a step as running and set in-flight key. */
  private markRunning(ctx: AgentContext, key: StepKey) {
    const st = ctx.blackboard.plan?.steps.find((s) => s.key === key);
    if (st) st.status = "running";
    if (ctx.blackboard.plan) ctx.blackboard.plan.inFlightStepKey = key;
  }

  /** Heuristic for deciding whether external web context is likely needed. */
  private shouldRunWebResearch(goal: string): boolean {
    return WEB_RESEARCH_HINT_RE.test(goal);
  }

  /**
   * Decide next action for the coordinator: set in-flight tool calls, or
   * perform inline steps (dedupe/compliance), or confirm completion.
   */
  async think(ctx: AgentContext): Promise<AgentMessage> {
    this.ensurePlan(ctx);
    const plan = ctx.blackboard.plan!;

    // If something is in-flight and we have its result, mark it done.
    if (plan.inFlightStepKey) {
      const inFlightKey = plan.inFlightStepKey as StepKey;
      const outcome = this.findToolOutcome(ctx, expectedTools(inFlightKey));
      if (outcome === "result") {
        this.markDone(ctx, plan.inFlightStepKey as StepKey);
        return {
          from: this.role,
          content: `Step ${plan.inFlightStepKey} completed.`,
        };
      }
      if (outcome === "error") {
        this.markError(ctx, inFlightKey);
        return {
          from: this.role,
          content: `Step ${inFlightKey} failed; continuing with remaining plan.`,
        };
      }
      // Still waiting for result
      return {
        from: this.role,
        content: `Waiting on ${plan.inFlightStepKey}…`,
      };
    }

    // Determine next pending step, and trigger tool if applicable.
    const key = this.currentStep(ctx);
    if (!key) return { from: this.role, content: "Plan complete." };

    // Some steps can be no-ops based on current blackboard state; mark as done
    if (key === "lookup") {
      if ((ctx.blackboard.zpids || []).length) {
        this.markDone(ctx, key);
        return {
          from: this.role,
          content: "Lookup skipped (ZPIDs already known).",
        };
      }
    }
    if (key === "graph") {
      const n = (ctx.blackboard.zpids || []).length;
      if (!n) {
        // No ZPIDs to graph yet — push back until we have some after search
        // Defer by letting search/summarize run first
      }
    }

    // Compute tool call or perform inline action for this step
    switch (key) {
      case "dedupeRank": {
        // Inline: dedupe and cap
        const set = new Set<number>();
        const ranked: number[] = [];
        for (const id of ctx.blackboard.zpids || []) {
          if (!Number.isFinite(id)) continue;
          if (!set.has(id)) {
            set.add(id);
            ranked.push(id);
          }
        }
        ctx.blackboard.rankedZpids = ranked.slice(0, 100);
        ctx.blackboard.zpids = ctx.blackboard.rankedZpids.slice();
        this.markDone(ctx, key);
        return {
          from: this.role,
          content: `Dedupe+rank complete (${ctx.blackboard.zpids.length} ZPIDs).`,
        };
      }
      case "compliance": {
        const issues: string[] = [];
        const s = (ctx.blackboard.analytics?.summary || {}) as any;
        if (s) {
          if (s.medianPrice != null && s.medianPrice < 0)
            issues.push("Median price negative.");
          if (s.medianSqft != null && s.medianSqft <= 0)
            issues.push("Median sqft not positive.");
          if (s.medianPricePerSqft != null && s.medianPricePerSqft <= 0)
            issues.push("Median $/sqft not positive.");
        }
        const m = (ctx.blackboard.mortgage || {}) as any;
        if (m) {
          if (m.apr != null && (m.apr < 0 || m.apr > 20))
            issues.push("APR unusually out of range (0-20%).");
          if (m.total != null && m.total < 0)
            issues.push("Monthly payment negative.");
        }
        const count = (ctx.blackboard.zpids || []).length;
        if (count > 200)
          issues.push("Too many ZPIDs collected; consider narrowing filters.");
        ctx.blackboard.compliance = { ok: issues.length === 0, issues };
        this.markDone(ctx, key);
        return {
          from: this.role,
          content: issues.length
            ? `Compliance issues: ${issues.join(" | ")}`
            : "Compliance checks passed.",
        };
      }
      case "parseGoal": {
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Parsing goal",
          data: { tool: { name: "util.parseGoal", args: { text: ctx.goal } } },
        };
      }
      case "webResearch": {
        if (!this.shouldRunWebResearch(ctx.goal)) {
          this.markDone(ctx, key);
          return {
            from: this.role,
            content: "Web research skipped (no explicit fresh-data signal).",
          };
        }
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Searching web for current context",
          data: {
            tool: { name: "web.search", args: { q: ctx.goal, limit: 5 } },
          },
        };
      }
      case "lookup": {
        const p = ctx.blackboard.parsed || ({} as any);
        const args: Record<string, unknown> = {};
        if (p.city) args.city = p.city;
        if (p.state) args.state = p.state;
        if (p.zipcode) args.zipcode = p.zipcode;
        if (p.beds != null) args.beds = p.beds;
        if (p.baths != null) args.baths = p.baths;
        const addr = (ctx.goal.match(/\b\d+\s+[A-Za-z][\w\s]+\b/) || [])[0];
        if (addr) args.address = addr;
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Looking up ZPIDs",
          data: { tool: { name: "properties.lookup", args } },
        };
      }
      case "search": {
        const p = ctx.blackboard.parsed || ({} as any);
        const adv: Record<string, unknown> = {};
        if (p.city && p.state) adv.city = `${p.city}, ${p.state}`;
        else if (p.city) adv.city = p.city;
        if (p.zipcode) adv.zipcode = p.zipcode;
        if (p.beds != null) adv.beds = p.beds;
        if (p.baths != null) adv.baths = p.baths;
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Running property search",
          data: {
            tool: Object.keys(adv).length
              ? {
                  name: "properties.searchAdvanced",
                  args: { ...adv, topK: 100 },
                }
              : { name: "properties.search", args: { q: ctx.goal, topK: 100 } },
          },
        };
      }
      case "summarize": {
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Summarizing search",
          data: {
            tool: {
              name: "analytics.summarizeSearch",
              args: { q: ctx.goal, topK: 200 },
            },
          },
        };
      }
      case "groupByZip": {
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Grouping by ZIP",
          data: {
            tool: {
              name: "analytics.groupByZip",
              args: { q: ctx.goal, topK: 200 },
            },
          },
        };
      }
      case "graph": {
        const zpids = ctx.blackboard.zpids || [];
        if (zpids.length >= 2) {
          this.markRunning(ctx, key);
          return {
            from: this.role,
            content: "Explaining relationship",
            data: {
              tool: {
                name: "graph.explain",
                args: { from: zpids[0], to: zpids[1] },
              },
            },
          };
        }
        if (zpids.length === 1) {
          this.markRunning(ctx, key);
          return {
            from: this.role,
            content: "Fetching similars",
            data: {
              tool: {
                name: "graph.similar",
                args: { zpid: zpids[0], limit: 10 },
              },
            },
          };
        }
        // No zpid yet; skip for now
        this.markDone(ctx, key);
        return { from: this.role, content: "Graph step skipped (no ZPIDs)." };
      }
      case "comparePairs": {
        const zpids = ctx.blackboard.zpids || [];
        if (zpids.length >= 3) {
          this.markRunning(ctx, key);
          return {
            from: this.role,
            content: "Comparing adjacent pairs",
            data: {
              tool: {
                name: "graph.comparePairs",
                args: { zpids: zpids.slice(0, 6) },
              },
            },
          };
        }
        this.markDone(ctx, key);
        return {
          from: this.role,
          content: "Compare step skipped (insufficient ZPIDs).",
        };
      }
      case "map": {
        const zpids = ctx.blackboard.zpids || [];
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Building map link",
          data: zpids.length
            ? {
                tool: {
                  name: "map.linkForZpids",
                  args: { ids: zpids.slice(0, 50) },
                },
              }
            : { tool: { name: "map.buildLinkByQuery", args: { q: ctx.goal } } },
        };
      }
      case "mortgage": {
        const mRate = ctx.goal.match(/(\d+(?:\.\d+)?)%/);
        const apr = mRate
          ? Number(mRate[1])
          : (ctx.blackboard.parsed?.apr ?? 6.5);
        const years = ctx.blackboard.parsed?.years ?? 30;
        const medPrice = (ctx.blackboard.analytics?.summary as any)
          ?.medianPrice as number | undefined;
        const mPrice = ctx.goal.match(/\$?(\d{3,}[,\d]*)/);
        const price =
          medPrice ?? (mPrice ? Number(mPrice[1].replace(/,/g, "")) : 600000);
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Estimating mortgage",
          data: {
            tool: {
              name: "finance.mortgage",
              args: { price, apr, years, downPct: 20 },
            },
          },
        };
      }
      case "affordability": {
        const incomeMatch = ctx.goal.match(
          /\$?(\d{2,3}[,\d]*)\s*(?:income|salary)/i,
        );
        const annualIncome = incomeMatch
          ? Number(incomeMatch[1].replace(/,/g, ""))
          : undefined;
        this.markRunning(ctx, key);
        return {
          from: this.role,
          content: "Estimating affordability",
          data: {
            tool: {
              name: "finance.affordability",
              args: annualIncome ? { annualIncome } : { monthlyBudget: 4000 },
            },
          },
        };
      }
      default:
        return { from: this.role, content: "Idle." };
    }
  }
}

/** Expected tools that complete each step, by key. */
function expectedTools(key: StepKey): string[] {
  switch (key) {
    case "parseGoal":
      return ["util.parseGoal"];
    case "webResearch":
      return ["web.search"];
    case "lookup":
      return ["properties.lookup"];
    case "search":
      return ["properties.search", "properties.searchAdvanced"];
    case "summarize":
      return ["analytics.summarizeSearch"];
    case "groupByZip":
      return ["analytics.groupByZip"];
    case "graph":
      return ["graph.explain", "graph.similar"];
    case "comparePairs":
      return ["graph.comparePairs", "graph.pathMatrix"];
    case "map":
      return ["map.linkForZpids", "map.buildLinkByQuery"];
    case "mortgage":
      return ["finance.mortgage"];
    case "affordability":
      return ["finance.affordability"];
    default:
      return [];
  }
}
