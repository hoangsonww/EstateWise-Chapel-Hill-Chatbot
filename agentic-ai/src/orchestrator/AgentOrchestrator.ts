import {
  Agent,
  AgentContext,
  AgentMessage,
  Blackboard,
} from "../core/types.js";
import { ToolClient } from "../mcp/ToolClient.js";
import { getRequiredToolsForRuntime } from "../mcp/contracts.js";

function extractToolText(result: unknown) {
  const res = result as any;
  const content = Array.isArray(res?.content) ? res.content : [];
  const block = content.find((c: any) => c?.type === "text");
  if (block && typeof block.text === "string") return block.text;
  try {
    return JSON.stringify(result);
  } catch (_err) {
    return String(result);
  }
}

/**
 * Event payloads emitted during a streaming run.
 */
export type AgentStreamEvent =
  | { type: "start"; goal: string; rounds: number }
  | { type: "message"; message: AgentMessage }
  | {
      type: "tool";
      name: string;
      args: Record<string, unknown>;
      resultText?: string;
      ok: boolean;
      error?: string;
    }
  | { type: "done"; history: AgentMessage[] };

/**
 * Orchestrates a round-based multi-agent loop. Supports both batch `run`
 * and incremental `runStream` with per-message/tool events.
 */
export class AgentOrchestrator {
  private agents: Agent[] = [];
  private toolClient = new ToolClient();
  private blackboard: Blackboard = { zpids: [] };

  register(...agents: Agent[]) {
    this.agents.push(...agents);
    return this;
  }

  /**
   * Run the orchestrator to completion and return the full message history.
   * @param goal Freeform user instruction
   * @param rounds Number of full agent passes (default 4)
   */
  async run(goal: string, rounds = 4): Promise<AgentMessage[]> {
    await this.toolClient.start({
      requiredTools: getRequiredToolsForRuntime("default"),
    });
    const history: AgentMessage[] = [];
    const ctx = ((): AgentContext => ({
      goal,
      history,
      blackboard: this.blackboard,
    }))();

    for (let i = 0; i < rounds; i++) {
      for (const agent of this.agents) {
        const msg = await agent.think(ctx);
        history.push(msg);

        // If the agent proposes a tool call, execute it via MCP
        const tool = (msg.data as any)?.tool;
        if (tool?.name) {
          try {
            const result = await this.callWithRetry(tool.name, tool.args || {});
            const textBlock = extractToolText(result);
            history.push({
              from: agent.role,
              content: `Tool ${tool.name} result`,
              data: { result, resultText: textBlock },
            });
            this.updateBlackboard(tool.name, textBlock);
          } catch (err: any) {
            history.push({
              from: agent.role,
              content: `Tool ${tool.name} error: ${err?.message || String(err)}`,
            });
          }
        }
      }
    }

    await this.toolClient.stop();
    return history;
  }

  /**
   * Stream a run via callback events. Emits start, each message, tool results,
   * and a final done event with the full history.
   */
  async runStream(
    goal: string,
    rounds: number,
    onEvent: (e: AgentStreamEvent) => void,
  ): Promise<void> {
    await this.toolClient.start({
      requiredTools: getRequiredToolsForRuntime("default"),
    });
    const history: AgentMessage[] = [];
    const ctx = ((): AgentContext => ({
      goal,
      history,
      blackboard: this.blackboard,
    }))();
    onEvent({ type: "start", goal, rounds });

    for (let i = 0; i < rounds; i++) {
      for (const agent of this.agents) {
        const msg = await agent.think(ctx);
        history.push(msg);
        onEvent({ type: "message", message: msg });

        const tool = (msg.data as any)?.tool;
        if (tool?.name) {
          try {
            const result = await this.callWithRetry(tool.name, tool.args || {});
            const textBlock = extractToolText(result);
            history.push({
              from: agent.role,
              content: `Tool ${tool.name} result`,
              data: { result, resultText: textBlock },
            });
            onEvent({
              type: "tool",
              name: tool.name,
              args: tool.args || {},
              resultText: textBlock,
              ok: true,
            });
            this.updateBlackboard(tool.name, textBlock);
          } catch (err: any) {
            history.push({
              from: agent.role,
              content: `Tool ${tool.name} error: ${err?.message || String(err)}`,
            });
            onEvent({
              type: "tool",
              name: tool.name,
              args: tool.args || {},
              ok: false,
              error: err?.message || String(err),
            });
          }
        }
      }
    }

    await this.toolClient.stop();
    onEvent({ type: "done", history });
  }

  private async callWithRetry(name: string, args: Record<string, unknown>) {
    try {
      return await this.toolClient.callTool(name, args);
    } catch (e) {
      // simple one-time retry
      return await this.toolClient.callTool(name, args);
    }
  }

  // Best-effort normalization of tool outputs into the shared blackboard
  private updateBlackboard(toolName: string, text: string) {
    const tryParse = () => {
      try {
        return JSON.parse(text);
      } catch {
        return null;
      }
    };
    const data = tryParse();
    switch (toolName) {
      case "util.parseGoal": {
        if (data) {
          this.blackboard.parsed = data;
          const z = (data.zpids || []) as number[];
          this.mergeZpids(z);
        }
        break;
      }
      case "properties.lookup": {
        const matches = data?.matches || [];
        const z: number[] = matches
          .map((m: any) => Number(m.zpid ?? m.id))
          .filter((n: number) => Number.isFinite(n));
        this.mergeZpids(z);
        break;
      }
      case "properties.search": {
        const items = Array.isArray(data?.results)
          ? data.results
          : data?.properties || [];
        const z: number[] = items
          .map((m: any) => Number(m.zpid ?? m.id))
          .filter((n: number) => Number.isFinite(n));
        this.mergeZpids(z);
        break;
      }
      case "analytics.summarizeSearch": {
        if (!this.blackboard.analytics) this.blackboard.analytics = {} as any;
        // @ts-ignore
        this.blackboard.analytics.summary = data?.summary ?? data ?? null;
        break;
      }
      case "analytics.groupByZip": {
        if (!this.blackboard.analytics) this.blackboard.analytics = {} as any;
        // @ts-ignore
        this.blackboard.analytics.groups = data?.groups ?? data ?? null;
        break;
      }
      case "graph.explain": {
        if (!this.blackboard.pairs) this.blackboard.pairs = [];
        this.blackboard.pairs.push(data ?? { raw: text });
        break;
      }
      case "graph.similar": {
        const sims = data?.results || data?.similar || [];
        const z: number[] = sims
          .map((m: any) => Number(m?.property?.zpid ?? m?.zpid ?? m?.id))
          .filter((n: number) => Number.isFinite(n));
        this.mergeZpids(z);
        break;
      }
      case "graph.comparePairs": {
        if (!this.blackboard.pairs) this.blackboard.pairs = [];
        const arr = data?.pairs || [];
        for (const p of arr) this.blackboard.pairs.push(p);
        break;
      }
      case "map.linkForZpids":
      case "map.buildLinkByQuery": {
        // Both return a URL string as text
        this.blackboard.mapLink = text.trim();
        break;
      }
      case "finance.mortgage": {
        this.blackboard.mortgage = data ?? { raw: text };
        break;
      }
      case "finance.affordability": {
        this.blackboard.affordability = data ?? { raw: text };
        break;
      }
      case "web.search": {
        const web = (this.blackboard.web ??= {});
        web.search = data ?? { raw: text };
        break;
      }
      case "web.fetch": {
        const web = (this.blackboard.web ??= {});
        const pages = Array.isArray(web.pages) ? web.pages : [];
        pages.push(data ?? { raw: text });
        web.pages = pages.slice(-5);
        break;
      }
      case "live.zillow.search": {
        const live = (this.blackboard.liveData ??= {});
        live.source = data?.source ?? "zillow-live";
        live.generatedAt = data?.generatedAt ?? null;
        live.staleHours = Number.isFinite(Number(data?.staleHours))
          ? Number(data?.staleHours)
          : null;
        live.warnings = Array.isArray(data?.warnings)
          ? data.warnings.map((item: unknown) => String(item))
          : [];
        live.metadata =
          data?.metadata && typeof data.metadata === "object"
            ? data.metadata
            : null;
        live.count = Number(data?.count ?? 0);
        live.results = Array.isArray(data?.results) ? data.results : [];
        const z: number[] = (live.results || [])
          .map((row: any) => Number(row?.zpid))
          .filter((id: number) => Number.isFinite(id));
        this.mergeZpids(z);
        break;
      }
      case "context.search":
      case "context.assembleContext": {
        if (!this.blackboard.contextData) this.blackboard.contextData = {};
        this.blackboard.contextData.latest = data ?? { raw: text };
        break;
      }
      case "context.findRelated": {
        if (!this.blackboard.contextData) this.blackboard.contextData = {};
        this.blackboard.contextData.related = data ?? { raw: text };
        break;
      }
      case "context.graphOverview": {
        if (!this.blackboard.contextData) this.blackboard.contextData = {};
        this.blackboard.contextData.graphOverview = data ?? { raw: text };
        break;
      }
      default:
        break;
    }
  }

  private mergeZpids(list: number[]) {
    const set = new Set([...(this.blackboard.zpids || []), ...list]);
    this.blackboard.zpids = Array.from(set).slice(0, 200);
  }
}
