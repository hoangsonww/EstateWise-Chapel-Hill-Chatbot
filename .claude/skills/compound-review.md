# Skill: Compound Review

Flywheel compound step: review completed work, update session logs, refresh shared memory, advance bead status, and check downstream impact.

## When to Use

Run this skill after completing a significant unit of work (a bead, a feature, or a bug fix) to ensure all shared state is up to date.

## Steps

### 1. Review Work

Audit what was just done:

```bash
# See what changed
git diff --stat HEAD~1
git log --oneline -3

# Verify no untracked artifacts left behind
git status
```

Confirm:
- All modified files are intentional
- No secrets or `.env` values were committed
- No unrelated files were changed

### 2. Update Session Log

Append to the current session in `.agent-sessions/`:

```bash
# Find the active session
ls -lt .agent-sessions/*.json 2>/dev/null | head -1
```

Add a log entry:

```json
{
  "timestamp": "<now ISO-8601>",
  "action": "commit",
  "detail": "Completed <bead-id>: <short description>",
  "artifacts": ["path/to/changed/file"]
}
```

If no session file exists yet, create one following the format in `.agent-sessions/README.md`.

### 3. Update CLAUDE.md If Needed

Check if any of the following changed:
- New entry points or high-signal files
- New validation commands
- New gotchas discovered during implementation
- New environment variables required

If so, update `CLAUDE.md` with the minimal necessary addition. Keep it lean.

### 4. Update Bead Status

If the work corresponds to a bead in `.beads/.status.json`:

```bash
# View current status
python3 -c "
import json
with open('.beads/.status.json') as f:
    data = json.load(f)
    for k, v in data['beads'].items():
        if v['status'] != 'done':
            print(k, v['title'], '->', v['status'])
"
```

Set the completed bead to `"status": "done"` and update `lastUpdated`.

### 5. Check Downstream Impact

Look for beads that depend on the one just completed:

```bash
python3 -c "
import json
with open('.beads/.status.json') as f:
    data = json.load(f)
    completed = '<BEAD-ID>'
    for k, v in data['beads'].items():
        if completed in v.get('dependsOn', []) and v['status'] != 'done':
            print('UNBLOCKED:', k, v['title'])
"
```

If downstream beads are now unblocked:
- Note them in the session log
- If you are continuing work, claim the next bead
- If handing off, leave a message in `.beads/messages/`

## Checklist

- [ ] All changes reviewed and intentional
- [ ] Session log updated with latest action
- [ ] CLAUDE.md updated if new patterns/gotchas discovered
- [ ] Bead status advanced to `done`
- [ ] Downstream beads identified and noted
- [ ] No orphaned work or loose ends
