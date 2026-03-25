# Bead Task Decomposition System

## Format Specification

Each **bead** is the smallest unit of work that produces a verifiable artifact. Beads are tracked in `.beads/.status.json`.

### Bead ID Format

```
<DOMAIN>-<NNN>
```

| Domain  | Scope                            |
|---------|----------------------------------|
| ORCH    | Orchestration / agent routing    |
| CCFG    | Claude Code configuration        |
| PRMT    | Prompt engineering               |
| MCP     | MCP server / tools               |
| CTX     | Context engineering              |
| CROSS   | Cross-cutting / integration      |
| TEST    | Testing infrastructure           |

### Bead Schema

```json
{
  "id": "ORCH-001",
  "title": "Short imperative description",
  "domain": "orchestration",
  "status": "open | claimed | implementing | verifying | done | blocked",
  "assignedAgent": "claude-opus | claude-sonnet | codex | human",
  "priority": "p0 | p1 | p2",
  "dependsOn": ["ORCH-000"],
  "artifact": "path/to/output",
  "verification": "command or checklist to prove done"
}
```

## Workflow

1. **Claim** -- Set `status: "claimed"` and `assignedAgent`.
2. **Implement** -- Write code / config / docs. Set `status: "implementing"`.
3. **Verify** -- Run the bead's verification step. Set `status: "verifying"`.
4. **Commit** -- Stage only the bead's artifact(s). Set `status: "done"`.
5. **Learn** -- If the bead revealed a reusable pattern, add it to `.claude/skills/` or `CLAUDE.md`.

## Rules

- One agent per bead at a time. Use `.beads/messages/` for handoff.
- A bead cannot move to `done` until its `dependsOn` beads are all `done`.
- If blocked, set `status: "blocked"` and leave a message in `.beads/messages/<BEAD_ID>.md`.
- Never modify another agent's in-progress bead without explicit handoff.
- Keep bead scope small: if a bead takes more than ~30 minutes of agent time, split it.
- The `.status.json` file is the single source of truth for bead state.
