/**
 * EstateWise MCP Agent Authorization
 *
 * Defines which agent roles can access which domain servers and in what mode.
 * Every tool call routes through canAccess() before execution.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AgentPermission {
  /** Agent role identifier */
  agentId: string;
  /** Servers this agent may call */
  allowedServers: string[];
  /** Access mode – read is query-only, write permits mutations */
  accessMode: "read" | "write" | "all";
}

// ---------------------------------------------------------------------------
// Permission registry (9 entries)
// ---------------------------------------------------------------------------

const AGENT_PERMISSIONS: AgentPermission[] = [
  {
    agentId: "supervisor",
    allowedServers: [
      "property-db",
      "vector-search",
      "graph-query",
      "geocoding",
      "market-data",
      "user-preferences",
    ],
    accessMode: "all",
  },
  {
    agentId: "property-search",
    allowedServers: ["property-db", "vector-search"],
    accessMode: "read",
  },
  {
    agentId: "property-search-lite",
    allowedServers: ["property-db"],
    accessMode: "read",
  },
  {
    agentId: "market-analyst",
    allowedServers: ["market-data", "graph-query"],
    accessMode: "read",
  },
  {
    agentId: "market-analyst-lite",
    allowedServers: ["market-data"],
    accessMode: "read",
  },
  {
    agentId: "data-enrichment",
    allowedServers: ["graph-query", "geocoding", "property-db"],
    accessMode: "write",
  },
  {
    agentId: "recommendation",
    allowedServers: ["property-db", "vector-search", "user-preferences"],
    accessMode: "read",
  },
  {
    agentId: "conversation-mgr",
    allowedServers: ["user-preferences"],
    accessMode: "read",
  },
  {
    agentId: "quality-reviewer",
    allowedServers: [],
    accessMode: "read",
  },
];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether an agent is allowed to call a specific server.
 *
 * @param agentId   The agent role requesting access.
 * @param serverId  The domain server being called.
 * @param mode      The required access mode ('read' or 'write').
 * @returns `true` if the agent has sufficient permissions.
 */
export function canAccess(
  agentId: string,
  serverId: string,
  mode: "read" | "write" = "read",
): boolean {
  const perm = AGENT_PERMISSIONS.find((p) => p.agentId === agentId);
  if (!perm) return false;
  if (!perm.allowedServers.includes(serverId)) return false;
  if (perm.accessMode === "all") return true;
  if (mode === "read") return true; // read is always ok if server is allowed
  return perm.accessMode === "write";
}

/**
 * Return the full permission record for a given agent.
 *
 * @param agentId  The agent role to look up.
 * @returns The permission entry, or `undefined` if the agent is unknown.
 */
export function getAgentPermissions(
  agentId: string,
): AgentPermission | undefined {
  return AGENT_PERMISSIONS.find((p) => p.agentId === agentId);
}

/**
 * List tool names an agent is allowed to invoke, given a tool-to-server map.
 *
 * @param agentId       The agent role.
 * @param toolServerMap Map of toolName -> serverId.
 * @param mode          Access mode to check against ('read' by default).
 * @returns Array of tool names the agent may call.
 */
export function listAllowedTools(
  agentId: string,
  toolServerMap: Record<string, string>,
  mode: "read" | "write" = "read",
): string[] {
  return Object.entries(toolServerMap)
    .filter(([, serverId]) => canAccess(agentId, serverId, mode))
    .map(([toolName]) => toolName);
}
