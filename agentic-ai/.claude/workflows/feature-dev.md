# Feature Development Workflow

## Steps
1. **Understand** — Read relevant beads in `.beads/`, read existing code, identify dependencies
2. **Implement** — TypeScript strict, Zod at boundaries, named exports
3. **Test** — `npm run typecheck && npm test -- --bail && npm run lint`
4. **Review** — Grounding validator on AI outputs, security check, error handling
5. **Compound** — Run `/compound-review`, document learnings
6. **Commit** — `git commit -m "[BEAD-ID] description"`
