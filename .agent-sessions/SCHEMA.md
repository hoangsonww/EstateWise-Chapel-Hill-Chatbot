# Agent Session Schema Reference

> Detailed schema specification for `.agent-sessions/*.json` session files. For usage guidance, see `README.md`.

## Schema Version

Current: **1.1.0**

Changes from 1.0.0:
- Added `agentIdentity` field (whimsical Agent Mail name)
- Added `context.filesRead` array
- Added `context.reservations` array
- Added `context.dependencies` object (upstream/downstream bead tracking)
- Added `decisions` array for design decision logging
- Added `metrics` object for session-end summary statistics
- Added `summary` field for natural-language session recap
- Added `result` and `commitSha` optional fields on log entries

## Top-Level Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | string | ✅ | Unique identifier. Format: `ses-<uuid-prefix>` (e.g., `ses-a1b2c3d4-e5f6`). Generated at session start. |
| `createdAt` | string (ISO-8601) | ✅ | Timestamp when the session was created. |
| `lastActiveAt` | string (ISO-8601) | ✅ | Timestamp of the most recent log entry or status update. Updated on every append. |
| `agent` | string | ✅ | Model identifier: `claude-opus`, `claude-sonnet`, `codex`, `human`. |
| `agentIdentity` | string | ❌ | Whimsical Agent Mail identity (e.g., "Scarlet Falcon"). Set via `agent-mail.mjs register`. |
| `goal` | string | ✅ | High-level objective for this session. Should map to one or more bead IDs. |
| `context` | object | ✅ | Session context snapshot. See [Context Object](#context-object). |
| `decisions` | array | ✅ | Design decisions made during the session. See [Decision Object](#decision-object). |
| `log` | array | ✅ | Chronological action log. See [Log Entry Object](#log-entry-object). |
| `outcome` | enum | ✅ | Session result: `success`, `partial`, `failed`, `handed-off`. |
| `summary` | string \| null | ❌ | Natural-language recap of what was accomplished. Written at session end. |
| `handoffNote` | string \| null | ❌ | Context for the next agent if `outcome` is `handed-off`. |
| `metrics` | object | ❌ | Summary statistics. See [Metrics Object](#metrics-object). Populated at session end. |

## Context Object

```typescript
interface SessionContext {
  branch: string;                    // Git branch (typically "main")
  beads: string[];                   // Bead IDs worked on (e.g., ["ORCH-001", "ORCH-002"])
  filesModified: string[];           // Files created or edited
  filesRead: string[];               // Files read for context (key ones only)
  reservations: string[];            // Active file reservation globs
  dependencies: {
    upstream: string[];              // Bead IDs this session's beads depend on
    downstream: string[];            // Bead IDs that depend on this session's beads
  };
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `branch` | string | ✅ | Git branch. Flywheel methodology uses `main` exclusively. |
| `beads` | string[] | ✅ | Bead IDs claimed, worked on, or completed in this session. |
| `filesModified` | string[] | ✅ | Relative paths of files created or modified. |
| `filesRead` | string[] | ❌ | Key files read for context (not every file — just the important ones). |
| `reservations` | string[] | ❌ | Active Agent Mail file reservation globs held during this session. |
| `dependencies.upstream` | string[] | ❌ | Bead IDs that must be done before this session's beads can start. |
| `dependencies.downstream` | string[] | ❌ | Bead IDs that are unblocked by completing this session's beads. |

## Decision Object

```typescript
interface Decision {
  timestamp: string;     // ISO-8601
  decision: string;      // What was decided (< 200 chars)
  rationale: string;     // Why this choice was made
  beadId: string;        // Which bead this decision relates to
  reversible: boolean;   // Can this be changed later without major rework?
}
```

Decisions should be logged for **non-obvious** choices. Don't log trivial decisions like variable names or import styles. Do log:
- Architecture choices (e.g., "use keyword matching over LLM classification")
- Trade-offs (e.g., "chose in-memory LRU over Redis for L1 cache")
- Scope decisions (e.g., "deferred Neo4j integration to CTX-006")
- Contract changes (e.g., "changed return type from string to structured object")

## Log Entry Object

```typescript
interface LogEntry {
  timestamp: string;         // ISO-8601
  action: LogAction;         // See Action Types below
  detail: string;            // Human-readable summary (< 200 chars)
  artifacts: string[];       // File paths relevant to this action
  beadId?: string;           // Bead ID if action relates to a specific bead
  result?: "pass" | "fail";  // For test/verify actions
  commitSha?: string;        // For commit actions (short SHA)
}

type LogAction =
  | "read"      // Reading files for context
  | "write"     // Creating or modifying files
  | "test"      // Running tests or verification commands
  | "commit"    // Creating a git commit
  | "claim"     // Claiming or completing a bead via bv.mjs
  | "error"     // Encountering an error or unexpected behavior
  | "handoff"   // Transferring work to another agent
  | "decision"  // (legacy) Design decision — prefer decisions[] array
  ;
```

### Action Type Details

| Action | When to Log | `artifacts` Contains | Optional Fields |
|--------|-------------|----------------------|-----------------|
| `read` | Reading files for context gathering | Files read | — |
| `write` | Creating or editing source files, config, docs | Files modified | `beadId` |
| `test` | Running `npm run test`, `npm run build`, or bead `verification` | Test files or output | `beadId`, `result` |
| `commit` | After `git commit` | Files committed | `beadId`, `commitSha` |
| `claim` | After `bv.mjs claim` or `bv.mjs complete` | — | `beadId` |
| `error` | When something fails unexpectedly | Relevant files | `beadId` |
| `handoff` | When transferring work to another agent | — | `beadId` |

## Metrics Object

```typescript
interface SessionMetrics {
  beadsCompleted: number;     // Beads that reached "done" status
  beadsClaimed: number;       // Beads claimed during this session (including completed)
  filesModified: number;      // Count of unique files modified
  commitsCreated: number;     // Number of git commits
  testsRun: number;           // Number of test/verify actions
  testsPassed: number;        // Tests with result: "pass"
  testsFailed: number;        // Tests with result: "fail"
  durationMinutes: number;    // Wall-clock duration (lastActiveAt - createdAt)
}
```

Metrics are populated **at session end** (when `outcome` transitions to a terminal state). They provide quick-scan visibility into session productivity without parsing the full `log` array.

## Session ID Generation

Session IDs follow the format `ses-<8-char-uuid>`:

```
ses-a1b2c3d4-e5f6
ses-cc1de4ef-2a0
```

The prefix `ses-` distinguishes session files from other JSON files. The UUID portion should be generated via `crypto.randomUUID()` or equivalent.

## File Naming

Session files are named `<sessionId>.json` and stored directly in `.agent-sessions/`:

```
.agent-sessions/ses-a1b2c3d4-e5f6.json
.agent-sessions/ses-bb7890ab-cd12.json
```

Archived sessions move to `.agent-sessions/archive/` with the same filename.

## Validation Rules

1. `sessionId` must be unique across all session files
2. `createdAt` must be ≤ `lastActiveAt`
3. `log` entries must be chronologically ordered by `timestamp`
4. `context.beads` must reference valid bead IDs from `.beads/.status.json`
5. `outcome` must be one of: `success`, `partial`, `failed`, `handed-off`
6. If `outcome` is `handed-off`, `handoffNote` should be non-null
7. `metrics.beadsCompleted` ≤ `metrics.beadsClaimed`
8. `metrics.testsPassed` + `metrics.testsFailed` ≤ `metrics.testsRun`

## Example: Minimal Session

```json
{
  "sessionId": "ses-min-example",
  "createdAt": "2026-03-25T10:00:00Z",
  "lastActiveAt": "2026-03-25T10:30:00Z",
  "agent": "claude-sonnet",
  "goal": "Fix typo in PRMT-003 prompt template",
  "context": {
    "branch": "main",
    "beads": ["PRMT-003"],
    "filesModified": ["agentic-ai/src/prompts/versioning.ts"]
  },
  "decisions": [],
  "log": [
    {
      "timestamp": "2026-03-25T10:00:00Z",
      "action": "claim",
      "detail": "Claimed PRMT-003 for minor fix",
      "artifacts": [],
      "beadId": "PRMT-003"
    },
    {
      "timestamp": "2026-03-25T10:15:00Z",
      "action": "write",
      "detail": "Fixed template variable interpolation in versioning.ts",
      "artifacts": ["agentic-ai/src/prompts/versioning.ts"],
      "beadId": "PRMT-003"
    },
    {
      "timestamp": "2026-03-25T10:25:00Z",
      "action": "test",
      "detail": "cd agentic-ai && npm run build — passed",
      "artifacts": [],
      "beadId": "PRMT-003",
      "result": "pass"
    },
    {
      "timestamp": "2026-03-25T10:30:00Z",
      "action": "commit",
      "detail": "Fix prompt template variable interpolation",
      "artifacts": ["agentic-ai/src/prompts/versioning.ts"],
      "beadId": "PRMT-003",
      "commitSha": "f4e5d6c"
    }
  ],
  "outcome": "success",
  "summary": "Fixed PRMT-003 template variable interpolation. Build passes.",
  "metrics": {
    "beadsCompleted": 1,
    "beadsClaimed": 1,
    "filesModified": 1,
    "commitsCreated": 1,
    "testsRun": 1,
    "testsPassed": 1,
    "testsFailed": 0,
    "durationMinutes": 30
  }
}
```

## Example: Handoff Session

```json
{
  "sessionId": "ses-handoff-ex",
  "createdAt": "2026-03-25T11:00:00Z",
  "lastActiveAt": "2026-03-25T13:00:00Z",
  "agent": "claude-opus",
  "agentIdentity": "Azure Brook",
  "goal": "Implement MCP domain servers for property and market data",
  "context": {
    "branch": "main",
    "beads": ["MCP-004", "MCP-005"],
    "filesModified": ["mcp/servers/property/index.ts", "mcp/servers/property/tools.ts"],
    "filesRead": ["mcp/src/server.ts", "mcp/src/core/config.ts", "mcp/shared/auth.ts"],
    "reservations": ["mcp/servers/property/**"],
    "dependencies": {
      "upstream": ["MCP-001", "MCP-003"],
      "downstream": ["CROSS-001"]
    }
  },
  "decisions": [
    {
      "timestamp": "2026-03-25T11:20:00Z",
      "decision": "Use Zod schemas for all tool input validation rather than manual checks",
      "rationale": "Single source of truth for runtime + compile-time types. Consistent with orchestration schemas.",
      "beadId": "MCP-004",
      "reversible": false
    }
  ],
  "log": [
    {
      "timestamp": "2026-03-25T11:00:00Z",
      "action": "read",
      "detail": "Read MCP core: server.ts, config.ts, auth.ts for patterns",
      "artifacts": ["mcp/src/server.ts", "mcp/src/core/config.ts", "mcp/shared/auth.ts"]
    },
    {
      "timestamp": "2026-03-25T11:05:00Z",
      "action": "claim",
      "detail": "Claimed MCP-004 (property server), reserved mcp/servers/property/**",
      "artifacts": [],
      "beadId": "MCP-004"
    },
    {
      "timestamp": "2026-03-25T12:30:00Z",
      "action": "write",
      "detail": "Implemented property server with search, detail, ZPID, comparison tools",
      "artifacts": ["mcp/servers/property/index.ts", "mcp/servers/property/tools.ts"],
      "beadId": "MCP-004"
    },
    {
      "timestamp": "2026-03-25T12:45:00Z",
      "action": "test",
      "detail": "cd mcp && npm run build — passed",
      "artifacts": [],
      "beadId": "MCP-004",
      "result": "pass"
    },
    {
      "timestamp": "2026-03-25T13:00:00Z",
      "action": "error",
      "detail": "Context window compacting — saving state and handing off MCP-005",
      "artifacts": [],
      "beadId": "MCP-005"
    }
  ],
  "outcome": "handed-off",
  "summary": "Completed MCP-004 (property server). MCP-005 (vector search) not started due to context compaction.",
  "handoffNote": "MCP-004 is done and verified. MCP-005 needs implementation: follow same pattern as property server. Key files to read: mcp/servers/property/ for the pattern, mcp/src/core/config.ts for env loading. Zod schemas go in a schemas.ts file co-located with tools.ts.",
  "metrics": {
    "beadsCompleted": 1,
    "beadsClaimed": 2,
    "filesModified": 2,
    "commitsCreated": 1,
    "testsRun": 1,
    "testsPassed": 1,
    "testsFailed": 0,
    "durationMinutes": 120
  }
}
```

## Example: Failed Session

```json
{
  "sessionId": "ses-failed-ex",
  "createdAt": "2026-03-25T09:00:00Z",
  "lastActiveAt": "2026-03-25T09:45:00Z",
  "agent": "claude-sonnet",
  "agentIdentity": "Crimson Tide",
  "goal": "Wire Neo4j graph queries into MCP graph server",
  "context": {
    "branch": "main",
    "beads": ["MCP-006"],
    "filesModified": [],
    "filesRead": ["mcp/servers/graph/index.ts", "backend/src/graph/neo4j.service.ts"],
    "reservations": ["mcp/servers/graph/**"],
    "dependencies": {
      "upstream": ["MCP-003"],
      "downstream": []
    }
  },
  "decisions": [],
  "log": [
    {
      "timestamp": "2026-03-25T09:00:00Z",
      "action": "claim",
      "detail": "Claimed MCP-006, reserved mcp/servers/graph/**",
      "artifacts": [],
      "beadId": "MCP-006"
    },
    {
      "timestamp": "2026-03-25T09:20:00Z",
      "action": "error",
      "detail": "Neo4j connection refused — NEO4J_URI not configured in .env",
      "artifacts": [],
      "beadId": "MCP-006"
    },
    {
      "timestamp": "2026-03-25T09:45:00Z",
      "action": "error",
      "detail": "Cannot proceed without Neo4j. Releasing bead back to open.",
      "artifacts": [],
      "beadId": "MCP-006"
    }
  ],
  "outcome": "failed",
  "summary": "Could not implement MCP-006: Neo4j not available in local environment. Bead released back to open. Needs NEO4J_URI, NEO4J_USERNAME, NEO4J_PASSWORD configured.",
  "handoffNote": "Neo4j must be running and configured before this bead can be worked on. See backend/.env.example for required vars.",
  "metrics": {
    "beadsCompleted": 0,
    "beadsClaimed": 1,
    "filesModified": 0,
    "commitsCreated": 0,
    "testsRun": 0,
    "testsPassed": 0,
    "testsFailed": 0,
    "durationMinutes": 45
  }
}
```
