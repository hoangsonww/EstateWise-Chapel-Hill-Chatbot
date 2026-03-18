import { Agent, AgentContext, AgentMessage } from "../core/types.js";

/**
 * Assembles and manages context for the other agents.
 *
 * On each turn it inspects the current goal and conversation history to decide
 * whether enriching the blackboard with fresh context data would help.  It
 * either calls `context.assembleContext` for a holistic context window or
 * falls back to `context.search` for a targeted keyword search, and writes
 * the result into `blackboard.contextData`.
 */
export class ContextEngineerAgent implements Agent {
  role: "context-engineer" = "context-engineer";

  async think(ctx: AgentContext): Promise<AgentMessage> {
    // Yield while the coordinator is managing an in-flight step
    if (ctx.blackboard.plan?.inFlightStepKey) {
      return {
        from: this.role,
        content: "Coordinator in-flight; waiting.",
      };
    }

    const goal = ctx.goal.trim();

    // Skip re-assembly when we already have fresh context for this goal
    const existing = ctx.blackboard.contextData?.latest;
    if (existing) {
      return {
        from: this.role,
        content: "Context already assembled; skipping re-assembly.",
      };
    }

    // Determine whether we have enough prior tool results to warrant a full
    // context assembly, or whether a targeted search is sufficient.
    const historyText = ctx.history.map((m) => m.content).join("\n");
    const hasRichHistory = ctx.history.length > 4 || historyText.length > 500;

    if (hasRichHistory) {
      // Derive the agent role of the next likely consumer from recent messages
      const lastRoles = ctx.history
        .slice(-4)
        .map((m) => m.from)
        .filter((r) => r !== this.role);
      const agentRole =
        lastRoles.length > 0 ? lastRoles[lastRoles.length - 1] : undefined;

      return {
        from: this.role,
        content: "Assembling full context window for current goal",
        data: {
          tool: {
            name: "context.assembleContext",
            args: {
              query: goal,
              ...(agentRole ? { agentRole } : {}),
              maxTokens: 4096,
            },
          },
        },
      };
    }

    // Fall back to a targeted semantic search when history is sparse
    return {
      from: this.role,
      content: "Searching context knowledge base for goal-relevant documents",
      data: {
        tool: {
          name: "context.search",
          args: {
            query: goal,
            strategy: "hybrid",
            limit: 10,
          },
        },
      },
    };
  }
}
