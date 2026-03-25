# CASS-Lite: Claude Agent Session Storage

Lightweight session memory format for persisting agent state across Claude Code sessions.

## Session File Format

Session logs are stored as JSON files named `<session-id>.json` in this directory.

```json
{
  "sessionId": "uuid-v4",
  "createdAt": "ISO-8601",
  "lastActiveAt": "ISO-8601",
  "agent": "claude-opus | claude-sonnet | codex",
  "goal": "High-level objective for this session",
  "context": {
    "branch": "git branch name",
    "beads": ["ORCH-001", "ORCH-002"],
    "filesModified": ["path/to/file.ts"]
  },
  "log": [
    {
      "timestamp": "ISO-8601",
      "action": "read | write | test | commit | error | handoff",
      "detail": "Human-readable summary of what happened",
      "artifacts": ["path/to/output"]
    }
  ],
  "outcome": "success | partial | failed | handed-off",
  "handoffNote": "Optional note for the next agent picking up this work"
}
```

## Lifecycle

1. **Start** -- When an agent begins work, create a new session file or resume an existing one.
2. **Append** -- After each significant action (file edit, test run, commit), append to the `log` array.
3. **Pause** -- Update `lastActiveAt` and set `outcome: "partial"` if the session is interrupted.
4. **Complete** -- Set `outcome: "success"` or `"failed"` and record final artifacts.
5. **Handoff** -- Set `outcome: "handed-off"`, write `handoffNote`, and reference in `.beads/messages/`.

## Conventions

- Session files are **append-only** during a session. Never rewrite history.
- Keep `detail` strings under 200 characters. Link to files for full context.
- The `beads` array tracks which bead IDs were worked on in this session.
- Old sessions (> 7 days) may be archived to `.agent-sessions/archive/`.
- Do not store secrets, API keys, or environment values in session logs.

## Querying Sessions

```bash
# Find sessions for a specific bead
grep -rl "ORCH-001" .agent-sessions/

# Find recent sessions
ls -lt .agent-sessions/*.json | head -5

# Find failed sessions
grep -l '"failed"' .agent-sessions/*.json
```
