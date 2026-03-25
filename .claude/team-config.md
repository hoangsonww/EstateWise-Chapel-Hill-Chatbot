# Team-Scale Claude Code Configuration

## CLAUDE.md Hierarchy
1. **Root** — Global conventions, architecture, always-on rules
2. **Package-level** — backend/CLAUDE.md, frontend/CLAUDE.md, etc.
3. **Team-specific** — .claude/team-<name>.md

## Compliance Controls
- Pre-commit hooks MANDATORY — no --no-verify
- AI outputs must pass grounding validation
- Secret scanning on every commit
- Cost tracking always-on with daily budget alerts

## Hook Tiers
| Hook | When | Budget | Checks |
|------|------|--------|--------|
| pre-command | Every command | <1s | DCG patterns |
| pre-commit | Every commit | <10s | TypeCheck + ESLint + secrets |
| post-task | Bead completion | <60s | Full test suite |

## MCP Access Control
| Team | Allowed Servers |
|------|----------------|
| Frontend | property-db (read), vector-search (read), user-preferences (read) |
| Backend | All servers |
| AI/ML | All servers + orchestration |
| DevOps | deployment-control only |

## Agent Budget
- Development: $10/day, $200/month
- CI/CD: $5/day
- Production: $50/day
