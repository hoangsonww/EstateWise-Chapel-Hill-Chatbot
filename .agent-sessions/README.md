# CASS-Lite: Claude Agent Session Storage

> Lightweight session persistence layer for maintaining agent state across Claude Code sessions. Sessions bridge the gap between ephemeral agent context windows and the durable bead system (`.beads/`).

## Overview

When an agent works on beads, its in-flight context (which files it read, what decisions it made, where it left off) is lost if the process crashes or the context window compacts. Agent sessions capture this transient state so any replacement agent can resume seamlessly.

**Key principle**: Sessions are the **checkpoint mechanism** for the flywheel. Beads track *what* needs to be done; sessions track *where an agent is* in doing it.

## Directory Structure

```
.agent-sessions/
├── README.md                        # This file
├── SCHEMA.md                        # Detailed schema reference
├── archive/                         # Sessions older than 7 days
│   └── .gitkeep
├── templates/
│   └── session-template.json        # Blank template for new sessions
└── *.json                           # Active session files (one per agent session)
```

## Session File Format

Session logs are stored as JSON files named `<session-id>.json` in this directory.

```json
{
  "sessionId": "ses-a1b2c3d4-e5f6",
  "createdAt": "2026-03-25T14:00:00Z",
  "lastActiveAt": "2026-03-25T16:45:00Z",
  "agent": "claude-opus",
  "agentIdentity": "Scarlet Falcon",
  "goal": "Implement orchestration engine core: agent registry, intent classifier, circuit breakers",
  "context": {
    "branch": "main",
    "beads": ["ORCH-001", "ORCH-002", "ORCH-003"],
    "filesModified": [
      "agentic-ai/src/orchestration/agent-registry.ts",
      "agentic-ai/src/orchestration/supervisor.ts"
    ],
    "filesRead": [
      "AGENTS.md",
      ".beads/.status.json",
      "agentic-ai/src/orchestration/types.ts"
    ],
    "reservations": ["agentic-ai/src/orchestration/*.ts"],
    "dependencies": {
      "upstream": [],
      "downstream": ["ORCH-004", "ORCH-005", "ORCH-006"]
    }
  },
  "decisions": [
    {
      "timestamp": "2026-03-25T14:15:00Z",
      "decision": "Use keyword matching for intent classification instead of LLM-based NLU",
      "rationale": "Deterministic, zero-latency, zero-cost, fully testable. LLM fallback can be added later.",
      "beadId": "ORCH-002",
      "reversible": true
    }
  ],
  "log": [
    {
      "timestamp": "2026-03-25T14:00:00Z",
      "action": "read",
      "detail": "Read AGENTS.md and .beads/.status.json for current state",
      "artifacts": []
    },
    {
      "timestamp": "2026-03-25T14:05:00Z",
      "action": "claim",
      "detail": "Claimed ORCH-001 via bv.mjs, reserved agentic-ai/src/orchestration/*.ts",
      "artifacts": [],
      "beadId": "ORCH-001"
    },
    {
      "timestamp": "2026-03-25T15:30:00Z",
      "action": "write",
      "detail": "Implemented AgentRegistry with CRUD, circuit breakers, capability lookup, 9 default agents",
      "artifacts": ["agentic-ai/src/orchestration/agent-registry.ts"],
      "beadId": "ORCH-001"
    },
    {
      "timestamp": "2026-03-25T15:45:00Z",
      "action": "test",
      "detail": "cd agentic-ai && npm run build && npm run test — all passing",
      "artifacts": ["agentic-ai/tests/orchestration.test.mjs"],
      "beadId": "ORCH-001",
      "result": "pass"
    },
    {
      "timestamp": "2026-03-25T15:50:00Z",
      "action": "commit",
      "detail": "Committed ORCH-001: Add agent registry with circuit breakers and 9 default agents",
      "artifacts": ["agentic-ai/src/orchestration/agent-registry.ts"],
      "beadId": "ORCH-001",
      "commitSha": "a1b2c3d"
    },
    {
      "timestamp": "2026-03-25T16:00:00Z",
      "action": "claim",
      "detail": "Completed ORCH-001, claimed ORCH-002 (intent classifier)",
      "artifacts": [],
      "beadId": "ORCH-002"
    },
    {
      "timestamp": "2026-03-25T16:45:00Z",
      "action": "write",
      "detail": "Implemented classifyIntent() with 10 patterns, entity extraction, confidence scoring",
      "artifacts": ["agentic-ai/src/orchestration/supervisor.ts"],
      "beadId": "ORCH-002"
    }
  ],
  "outcome": "success",
  "summary": "Completed ORCH-001 (agent registry) and ORCH-002 (intent classifier). Both verified and committed. ORCH-003 (circuit breaker) claimed but not started — left for next session.",
  "handoffNote": null,
  "metrics": {
    "beadsCompleted": 2,
    "beadsClaimed": 3,
    "filesModified": 2,
    "commitsCreated": 2,
    "testsRun": 2,
    "testsPassed": 2,
    "testsFailed": 0,
    "durationMinutes": 165
  }
}
```

## Lifecycle

1. **Start** — When an agent begins work, create a new session file using the template or resume an existing one from `sessionId` in `.current-sessions.json`.
2. **Claim** — When claiming beads, add to the `context.beads` array and log the claim action.
3. **Decide** — When making non-trivial design decisions, add to the `decisions` array with rationale.
4. **Append** — After each significant action (file edit, test run, commit), append to the `log` array.
5. **Pause** — Update `lastActiveAt` and set `outcome: "partial"` if the session is interrupted or context compacts.
6. **Complete** — Set `outcome: "success"` or `"failed"`, write `summary`, and record final `metrics`.
7. **Handoff** — Set `outcome: "handed-off"`, write `handoffNote` with context the next agent needs, and notify via Agent Mail.
8. **Archive** — Sessions older than 7 days are moved to `archive/` to keep the directory scannable.

## Outcome Values

| Outcome | Meaning | Next Action |
|---------|---------|-------------|
| `success` | All claimed beads completed and verified | No action needed |
| `partial` | Some beads completed, others still in progress | Resume session or hand off |
| `failed` | Beads could not be completed (blocked, bugs, external deps) | Review `log` for failure details, possibly re-open beads |
| `handed-off` | Work explicitly transferred to another agent | New agent reads `handoffNote` and resumes |

## Action Types

| Action | When to Log | Required Fields |
|--------|-------------|-----------------|
| `read` | Reading files for context | `detail`, `artifacts` (files read) |
| `write` | Creating or modifying files | `detail`, `artifacts` (files changed), `beadId` |
| `test` | Running tests or verification commands | `detail`, `result` (pass/fail), `beadId` |
| `commit` | Creating a git commit | `detail`, `commitSha`, `beadId` |
| `claim` | Claiming or completing a bead | `detail`, `beadId` |
| `error` | Encountering an error or unexpected behavior | `detail`, `beadId` (if applicable) |
| `decision` | Making a design/implementation decision | Use `decisions` array instead |
| `handoff` | Transferring work to another agent | `detail`, `beadId` |

## Conventions

- Session files are **append-only** during a session. Never rewrite history.
- Keep `detail` strings under 200 characters. Link to files for full context.
- The `context.beads` array tracks which bead IDs were worked on in this session.
- Log entries should include `beadId` when the action relates to a specific bead.
- Always populate `decisions` for non-obvious choices — this is critical context for handoffs.
- The `metrics` object is populated at session end for quick scanning.
- Old sessions (> 7 days) should be moved to `.agent-sessions/archive/`.
- Do not store secrets, API keys, or environment values in session logs.

## Querying Sessions

```bash
# Find sessions for a specific bead
grep -rl "ORCH-001" .agent-sessions/

# Find recent sessions
ls -lt .agent-sessions/*.json | head -5

# Find failed sessions
grep -l '"failed"' .agent-sessions/*.json

# Find sessions by agent
grep -l '"claude-opus"' .agent-sessions/*.json

# Find sessions with handoff notes
grep -l '"handed-off"' .agent-sessions/*.json

# Count beads completed across all sessions
grep -o '"beadsCompleted": [0-9]*' .agent-sessions/*.json | awk -F: '{sum+=$NF} END {print sum}'
```

## Integration with Beads System

Sessions and beads are complementary:

| Concern | Beads (`.beads/`) | Sessions (`.agent-sessions/`) |
|---------|-------------------|-------------------------------|
| **What** needs to be done | ✅ Bead descriptions, acceptance criteria | ❌ |
| **Who** is doing it | ✅ `assignedAgent` field | ✅ `agent` + `agentIdentity` fields |
| **Where** the agent left off | ❌ | ✅ `log` array with chronological actions |
| **Why** decisions were made | ❌ | ✅ `decisions` array with rationale |
| **How** to verify | ✅ `verification` command | ✅ `log` entries with test results |
| **Crash recovery** | ✅ Bead state persists | ✅ Session checkpoint persists |

**Recovery flow**: When an agent crashes, the replacement agent reads (1) `.beads/.status.json` to find in-progress beads, then (2) the session file to understand where the previous agent left off, what files it modified, and what decisions it made.
