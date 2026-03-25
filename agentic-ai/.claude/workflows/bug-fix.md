# Bug Fix Workflow

## Steps
1. **Reproduce** — Identify exact failure condition
2. **Isolate** — Find root cause, not just symptom
3. **Fix** — Minimal change
4. **Test** — Write regression test that would have caught it
5. **Verify** — `npm test -- --bail && npm run typecheck`
6. **Document** — Add to CLAUDE.md gotchas if systemic
