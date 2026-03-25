# Bead Task Decomposition System

> The Flywheel methodology's execution substrate. Beads are the smallest unit of work that produce verifiable artifacts. This directory (`.beads/`) is the single source of truth for all task state, agent coordination, and session memory.

## Directory Structure

```
.beads/
├── .status.json                    # Bead DAG — the single source of truth for all bead state
├── README.md                       # This file
├── agent-mail/                     # Agent coordination layer
│   ├── agents.json                 # Registered agent identities
│   ├── reservations.json           # Active advisory file locks (TTL-based)
│   ├── messages/                   # Direct agent-to-agent messages
│   │   └── .gitkeep
│   └── threads/                    # Bead-threaded discussions
│       └── .gitkeep
├── messages/                       # Bead-specific handoff notes (legacy)
│   └── .gitkeep
└── session-memory/                 # 3-layer learning system (CASS-lite)
    ├── .current-sessions.json      # Active session index
    ├── episodic/                   # Layer 1: raw event logs (JSONL, append-only)
    ├── working/                    # Layer 2: structured session summaries (JSON)
    └── procedural/                 # Layer 3: distilled rules with confidence scores
```

## Schema Specification (v2.0.0)

### Status File Format

`.status.json` contains a schema header and a `beads` map keyed by bead ID:

```json
{
  "lastUpdated": "2026-03-25T18:00:00Z",
  "schema": {
    "version": "2.0.0",
    "flywheel": true,
    "fields": [
      "id", "title", "domain", "status", "assignedAgent", "priority",
      "dependsOn", "description", "rationale", "verification", "artifact",
      "testObligations", "acceptanceCriteria"
    ]
  },
  "beads": { ... }
}
```

### Bead ID Format

```
<DOMAIN>-<NNN>
```

| Domain  | Code   | Scope                                    | Examples |
|---------|--------|------------------------------------------|----------|
| ORCH    | `orchestration` | Supervisor, agent registry, routing, error recovery, budgets | ORCH-001 – ORCH-008 |
| CCFG    | `configuration` | Claude Code config, skills, DCG, agent pipeline              | CCFG-001 – CCFG-006 |
| PRMT    | `prompts`       | System prompts, grounding rules, schemas, caching            | PRMT-001 – PRMT-008 |
| MCP     | `mcp`           | Tool servers, auth, rate limiting, domain scaffolds           | MCP-001 – MCP-008 |
| CTX     | `context`       | Context engineering, knowledge graph, RAG pipeline            | CTX-001 – CTX-007 |
| CROSS   | `cross-cutting` | Integration tests, contract alignment, E2E flows             | CROSS-001 – CROSS-004 |
| TEST    | `testing`       | Test infrastructure, coverage gates, CI integration           | TEST-001 – TEST-005 |

### Bead Schema (v2.0)

```json
{
  "id": "ORCH-001",
  "title": "Short imperative description",
  "domain": "orchestration",
  "status": "open | claimed | implementing | verifying | done | blocked",
  "assignedAgent": "claude-opus | claude-sonnet | codex | human",
  "priority": "p0 | p1 | p2",
  "dependsOn": ["ORCH-000"],
  "description": "Full context so an agent can implement without external briefing",
  "rationale": "Why this bead exists and what problem it solves",
  "verification": "cd agentic-ai && npm run build && npm run test",
  "artifact": "path/to/primary/output",
  "testObligations": ["What must be tested before marking done"],
  "acceptanceCriteria": ["Observable outcomes that prove correctness"]
}
```

**v2.0 additions** (not in v1): `description`, `rationale`, `testObligations`, `acceptanceCriteria`. These fields ensure beads are self-contained — agents never need to ask "what exactly should I do?"

### Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Short imperative description (< 80 chars) |
| `domain` | string | ✅ | One of: orchestration, configuration, prompts, mcp, context, cross-cutting, testing |
| `status` | enum | ✅ | Current state: `open`, `claimed`, `implementing`, `verifying`, `done`, `blocked` |
| `assignedAgent` | string | ❌ | Agent identity that currently owns this bead |
| `priority` | enum | ✅ | `p0` (critical path), `p1` (important), `p2` (nice-to-have) |
| `dependsOn` | string[] | ✅ | Bead IDs that must be `done` before this bead can start (empty = no deps) |
| `description` | string | ✅ | Complete task description with enough context to implement without external info |
| `rationale` | string | ✅ | Why this bead exists — what problem it solves or what breaks without it |
| `verification` | string | ✅ | Shell command or checklist that proves the bead is correctly done |
| `artifact` | string | ✅ | File path to the primary deliverable |
| `testObligations` | string[] | ✅ | Specific things that must have tests before marking done |
| `acceptanceCriteria` | string[] | ✅ | Observable outcomes that an independent reviewer can verify |

### Priority Levels

| Level | Meaning | Guidance |
|-------|---------|----------|
| `p0` | **Critical path** — blocks other beads or the project | Work on these first; they have the highest PageRank scores |
| `p1` | **Important** — significant value but doesn't block critical path | Schedule after p0 beads are done or while waiting on blocked p0s |
| `p2` | **Enhancement** — nice-to-have, polish, or optimization | Only pick these up when all p0/p1 beads in your domain are done |

## State Machine

```
                    ┌───────────────────────────────────────────────┐
                    │                                               │
                    ▼                                               │
  ┌──────┐    ┌─────────┐    ┌──────────────┐    ┌───────────┐    │    ┌──────┐
  │ open │───▶│ claimed │───▶│ implementing │───▶│ verifying │────┼───▶│ done │
  └──┬───┘    └────┬────┘    └──────────────┘    └─────┬─────┘    │    └──────┘
     │             │                                    │          │
     │             │         (agent releases)           │          │
     │             └─────────────────┐                  │          │
     │                               ▼                  │          │
     │                          back to open             │          │
     │                                                   │          │
     │         (verification fails — rework)             │          │
     │                                   ┌───────────────┘          │
     │                                   ▼                          │
     │                            implementing ─────────────────────┘
     │
     │  (dependencies not met)
     ▼
  ┌─────────┐
  │ blocked │ ──── (deps resolved) ──▶ open
  └─────────┘
```

**Transition rules:**
- `open → claimed`: Agent sets `assignedAgent` and claims via `bv.mjs claim <id>`
- `claimed → implementing`: Agent begins work
- `implementing → verifying`: Agent runs `verification` command
- `verifying → done`: Verification passes; all `dependsOn` beads are `done`
- `verifying → implementing`: Verification fails; agent reworks
- `open → blocked`: A dependency bead is not `done`
- `blocked → open`: All dependencies resolve to `done`
- `claimed → open`: Agent releases the bead (e.g., context compaction, crash)

**Invariant**: A bead cannot reach `done` if any bead in its `dependsOn` array is not `done`.

## Workflow

### Standard Bead Lifecycle

1. **Triage** — Run `node tools/bv.mjs --robot-next` to find the optimal next bead based on graph-theory analysis (PageRank, betweenness centrality, critical path).
2. **Claim** — Run `node tools/bv.mjs claim <BEAD_ID>`. This atomically sets `status: "claimed"` and `assignedAgent`.
3. **Reserve** — Reserve the bead's artifact file(s) via `node tools/agent-mail.mjs reserve <glob> --ttl 3600 --reason "br-<BEAD_ID>"`.
4. **Implement** — Write code, config, or docs. Status transitions to `implementing`.
5. **Verify** — Run the bead's `verification` command. Status transitions to `verifying`.
6. **Converge** — Polish the implementation 4–6 times (self-review, cross-agent review, random exploration, hardening, convergence check). If verification fails, transition back to `implementing`.
7. **Commit** — Stage only the bead's artifact(s). Make a focused git commit.
8. **Complete** — Run `node tools/bv.mjs complete <BEAD_ID>`. Status transitions to `done`.
9. **Release** — Release file reservations via `node tools/agent-mail.mjs release <glob>`.
10. **Learn** — If the bead revealed a reusable pattern, log it via `node tools/session-memory.mjs log <agent> discovery "<pattern>"` and consider adding it to `.claude/skills/` or `CLAUDE.md`.

### Convergence Protocol

First drafts are expected to be incomplete. Each bead should go through 4–6 refinement passes:

| Pass | Focus | Exit Criteria |
|------|-------|---------------|
| **1. Draft** | Core logic, happy path | Compiles, basic functionality works |
| **2. Self-review** | Edge cases, error handling, input validation | No unhandled error paths |
| **3. Cross-agent review** | Integration with dependent/consuming beads | Contract types match, no breaking changes |
| **4. Random exploration** | Unexpected inputs, concurrency, timing | No crashes on adversarial input |
| **5. Hardening** | Tests, documentation, type safety | `testObligations` passing, docs updated |
| **6. Convergence check** | Full re-review with fresh eyes | Zero new findings = converged |

## Graph-Theory Triage (bv.mjs)

The `bv.mjs` tool (`tools/bv.mjs`) treats `.status.json` as a directed acyclic graph and applies six algorithms to help agents choose optimal next work:

| Algorithm | What It Computes | Why It Matters |
|-----------|-----------------|----------------|
| **PageRank** (damping=0.85, 100 iters) | Importance based on incoming dependencies | High-PageRank beads unblock the most downstream work |
| **Betweenness Centrality** | Fraction of shortest paths passing through a bead | High-betweenness beads are structural bottlenecks |
| **HITS** (100 iters) | Hub score (many outgoing deps) vs authority score (many incoming) | Separates "gateway" beads from "foundation" beads |
| **Critical Path** | Longest dependency chain | Determines minimum project duration |
| **Cycle Detection** (DFS) | Circular dependencies | Deadlock prevention — cycles must be broken |
| **Execution Levels** (BFS wavefront) | Groups beads into parallel waves | Enables concurrent execution by independent agents |

### CLI Quick Reference

```bash
# Machine-readable outputs (always use --robot-* flags in agent sessions)
node tools/bv.mjs --robot-triage       # Full graph metrics as JSON
node tools/bv.mjs --robot-next         # Single optimal next bead + claim command
node tools/bv.mjs --robot-plan         # Parallel execution tracks (wave-based)
node tools/bv.mjs --robot-insights     # Critical paths, bottlenecks, cycle warnings
node tools/bv.mjs --robot-priority     # Priority-weighted ordering
node tools/bv.mjs --robot-diff --diff-since <status>  # Diff since a previous state

# State mutations
node tools/bv.mjs claim <BEAD_ID>      # Atomically claim a bead
node tools/bv.mjs complete <BEAD_ID>   # Mark bead done

# Filtering
node tools/bv.mjs --status open        # Filter by status
node tools/bv.mjs --domain mcp         # Filter by domain
node tools/bv.mjs --json               # Raw JSON output
```

**⚠️ CRITICAL**: Always use `--robot-*` flags in agent sessions. Never run bare `bv` — it produces human-formatted output that wastes agent context tokens.

## Agent Mail Coordination

Agent Mail (`tools/agent-mail.mjs`) provides the coordination layer for multi-agent swarms. All state persists to `.beads/agent-mail/` for crash survival.

### Identity Management

```bash
node tools/agent-mail.mjs register <name>     # Register agent identity (auto-generates whimsical name)
node tools/agent-mail.mjs whoami               # Current agent identity
node tools/agent-mail.mjs list-agents          # All registered agents
```

### Messaging

```bash
node tools/agent-mail.mjs send <to> "<subject>" "<body>"  # Direct message
node tools/agent-mail.mjs inbox                             # All messages
node tools/agent-mail.mjs inbox --unread                    # Unread only
node tools/agent-mail.mjs thread <bead-id>                  # Bead-threaded messages
```

### File Reservations

```bash
node tools/agent-mail.mjs reserve <glob> --ttl 3600 --reason "br-ORCH-001"  # Reserve files
node tools/agent-mail.mjs release <glob>                                     # Release reservation
node tools/agent-mail.mjs reservations                                       # List active reservations
node tools/agent-mail.mjs check <file>                                       # Check if file is reserved
```

### Conflict Zones vs Safe Zones

| Zone Type | Files | Rule |
|-----------|-------|------|
| **Conflict zone** (single-agent only) | `package.json`, `package-lock.json`, `docker-compose.yml`, shared type defs, config files, `.beads/.status.json` | Must reserve before editing; use `bv claim/complete` for status.json |
| **Safe parallel zone** | Individual MCP servers (`mcp/servers/<name>/`), agent modules, test files, docs | Multiple agents can work concurrently |

## Session Memory (CASS-lite)

The session memory system (`tools/session-memory.mjs`) closes the flywheel loop by converting session experience into reusable knowledge.

### Three-Layer Architecture

| Layer | Storage Path | Format | Lifecycle |
|-------|-------------|--------|-----------|
| **Episodic** | `session-memory/episodic/` | JSONL (append-only) | Immutable event log |
| **Working** | `session-memory/working/` | JSON per session | Updated at session end |
| **Procedural** | `session-memory/procedural/rules.json` | JSON rules array | Continuously refined |

### Event Types

`task-start`, `task-complete`, `task-fail`, `decision`, `discovery`, `workaround`, `error`, `review`, `handoff`

### Confidence Scoring

- Initial confidence: `0.50`
- Helpful confirmation: `+0.10`
- Harmful feedback: `−0.40` (4× multiplier)
- Decay: 90-day half-life
- Range: `[0.01, 0.99]`

### Rule Stages

`candidate` → `established` → `proven`

### CLI Quick Reference

```bash
node tools/session-memory.mjs log <agent> <type> "<description>"  # Log event
node tools/session-memory.mjs reflect                              # Distill rules from episodes
node tools/session-memory.mjs context "<description>"              # Get relevant memories
node tools/session-memory.mjs rules                                # List procedural rules
```

## Destructive Command Guard (DCG)

The DCG (`tools/dcg.mjs`) mechanically blocks dangerous operations before they execute.

### Blocked Patterns

| Pattern | Severity | Safe Alternative |
|---------|----------|------------------|
| `git reset --hard` | critical | `git stash` |
| `git clean -fd` | critical | `git clean -fdn` (preview first) |
| `git checkout -- <file>` | high | `git stash push <file>` |
| `git push --force` | critical | `git push --force-with-lease` |
| `rm -rf /` or parent paths | critical | `rm -ri <path>` (interactive) |
| `git branch -D` | medium | `git branch -d` (safe delete) |
| + 5 more patterns | varies | Safer alternatives provided |

### Integration

```bash
node tools/dcg.mjs <command>         # Validate before execution (exit 0 = safe, exit 1 = blocked)
node tools/dcg.mjs --test            # Run self-tests (19 tests)
node tools/dcg.mjs --install         # Install as git pre-commit hook
node tools/dcg.mjs --check-staged    # Scan staged files for secrets/dangerous patterns
```

## Flywheel Invariants (The 9 Rules)

These are non-negotiable rules that every agent (human or AI) must follow:

1. **Plan-first** — Global reasoning belongs in plan space (`PLAN.md`), not scattered across code.
2. **Comprehensive plans** — The markdown plan must be comprehensive before any bead is created.
3. **Self-contained beads** — Plan-to-beads is a distinct translation problem. Beads carry all context.
4. **Beads as substrate** — Every change maps to a bead. Nothing happens outside the bead graph.
5. **Convergence over drafts** — Polish beads 4–6 times minimum. First drafts are never final.
6. **Fungible agents** — No specialist bottlenecks. Any agent can work on any bead.
7. **Crash-proof coordination** — AGENTS.md + Agent Mail + beads + bv survive process death.
8. **Feedback loop** — Session history feeds back into infrastructure via session-memory.
9. **Review is core** — Testing, review, and hardening are part of the method, not afterthoughts.

## Crash Recovery

All coordination state survives process death:

| Artifact | Survives? | Recovery Action |
|----------|-----------|-----------------|
| Bead state (`.status.json`) | ✅ | Read directly, resume or reclaim stale beads |
| Agent identities (`agent-mail/agents.json`) | ✅ | New agent re-registers, reads existing state |
| File reservations (`agent-mail/reservations.json`) | ✅ | TTL-based expiry auto-cleans stale locks |
| Messages (`agent-mail/messages/`) | ✅ | New agent reads inbox for context |
| Session checkpoints (`.agent-sessions/`) | ✅ | Resume from last committed state |
| Episodic memory (`session-memory/episodic/`) | ✅ | Append-only JSONL, never lost |
| Procedural rules (`session-memory/procedural/rules.json`) | ✅ | Confidence-scored rules persist |
| In-flight LLM context | ❌ | Reconstruct from bead description + checkpoint |

### Post-Compaction Checklist

After every context compaction (when an agent's context window is truncated), immediately:

1. Re-read `AGENTS.md` so coordination rules are fresh
2. Check Agent Mail inbox: `node tools/agent-mail.mjs inbox --unread`
3. Use `node tools/bv.mjs --robot-triage` to find next work
4. Review `.beads/.status.json` for current state

## Integration Points

| System | How Beads Integrate | Direction |
|--------|---------------------|-----------|
| **Orchestration Engine** | `Bead replay` error recovery strategy replays reasoning chains from `.beads/` snapshots | Orchestration reads beads |
| **Context Management** | `.beads/` serves as the L3 disk cache (24h TTL, >40% hit target) for session replay | Context layer reads beads |
| **Observability** | Bead state transitions emit structured events (`bead.claim`, `bead.implement`, `bead.verify`, `bead.complete`) | Tracing reads beads |
| **Agent Sessions** | `.agent-sessions/` checkpoints reference active bead IDs for resume-after-crash | Bidirectional |
| **Cost Tracking** | Token usage per LLM call is attributed to the active bead for per-bead cost analysis | Observability aggregates |

## Current Bead Inventory

As of schema v2.0.0, the repository tracks **45 beads** across 7 domains:

| Domain | Count | Status | Priority Split |
|--------|-------|--------|----------------|
| ORCH (Orchestration) | 8 | All done | 4×p0, 4×p1 |
| CCFG (Configuration) | 6 | All done | 1×p0, 5×p1 |
| PRMT (Prompts) | 8 | All done | 3×p0, 3×p1, 2×p2 |
| MCP (Tool Servers) | 8 | All done | 2×p0, 5×p1, 1×p2 |
| CTX (Context) | 7 | All done | 3×p0, 3×p1, 1×p2 |
| CROSS (Integration) | 4 | All done | 2×p0, 1×p1, 1×p2 |
| TEST (Testing) | 5 | All done | 3×p0, 2×p1 |
| **Total** | **46** | **46 done** | **18×p0, 23×p1, 5×p2** |

## Rules

- One agent per bead at a time. Use Agent Mail for handoff communication.
- A bead cannot move to `done` until its `dependsOn` beads are all `done`.
- If blocked, set `status: "blocked"` and send a message via `node tools/agent-mail.mjs send <agent> "[br-<BEAD_ID>] Blocked" "<reason>"`.
- Never modify another agent's in-progress bead without explicit handoff.
- Keep bead scope small: if a bead takes more than ~30 minutes of agent time, split it.
- The `.status.json` file is the **single source of truth** for bead state. Never edit it directly — use `bv.mjs claim` and `bv.mjs complete`.
- All agents work on `main` branch. No worktrees. No per-agent feature branches.
- Pull latest before claiming. Commit and push immediately after completing.
