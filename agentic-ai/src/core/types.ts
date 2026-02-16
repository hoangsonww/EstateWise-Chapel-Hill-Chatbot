/**
 * Enumerates all agent roles in the Agentic AI orchestrator.
 */
export type Role =
  | "planner"
  | "coordinator"
  | "graph-analyst"
  | "property-analyst"
  | "map-analyst"
  | "finance-analyst"
  | "zpid-finder"
  | "analytics-analyst"
  | "ranker-analyst"
  | "compliance-analyst"
  | "reporter";

/**
 * Single message posted by an agent during a run.
 */
export interface AgentMessage {
  from: Role;
  to?: Role | "all";
  content: string;
  data?: unknown;
}

/**
 * Description of a single tool invocation.
 */
export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

/**
 * One step in a hierarchical plan, optionally linked to a tool call.
 */
export interface PlanStep {
  description: string;
  tool?: ToolCall;
  next?: PlanStep[];
  key?: string;
  role?: Role;
  status?: "pending" | "running" | "done" | "skipped" | "error";
}

/** Full plan with top-level goal and ordered steps. */
export interface Plan {
  goal: string;
  steps: PlanStep[];
}

/**
 * Shared blackboard state used by all agents to coordinate work and persist results.
 */
export interface Blackboard {
  zpids: number[];
  rankedZpids?: number[];
  plan?: { steps: PlanStep[]; inFlightStepKey?: string };
  parsed?: {
    zpids?: number[];
    zipcode?: string | null;
    city?: string | null;
    state?: string | null;
    beds?: number | null;
    baths?: number | null;
    price?: number | null;
    apr?: number | null;
    years?: number | null;
  };
  analytics?: {
    summary?: Record<string, unknown> | null;
    groups?: Array<Record<string, unknown>> | null;
  };
  mapLink?: string | null;
  mortgage?: Record<string, unknown> | null;
  affordability?: Record<string, unknown> | null;
  web?: {
    search?: Record<string, unknown> | null;
    pages?: Array<Record<string, unknown>> | null;
  };
  pairs?: Array<Record<string, unknown>> | null;
  compliance?: { ok: boolean; issues: string[] } | null;
}

/** Context object provided to each agent on every turn. */
export interface AgentContext {
  goal: string;
  history: AgentMessage[];
  blackboard: Blackboard;
}

/** Base interface for all agents. */
export interface Agent {
  role: Role;
  think(ctx: AgentContext): Promise<AgentMessage>;
}
