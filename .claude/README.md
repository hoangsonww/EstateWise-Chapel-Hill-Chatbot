# Claude Code Setup

This folder contains the project-level Claude Code extensions for EstateWise.

## What is here

- `settings.json`: shared project settings. It connects Claude Code to the local EstateWise MCP server and registers a post-edit hook.
- `hooks/post-edit-reminder.sh`: lightweight deterministic hook that emits targeted validation and contract reminders after file edits.
- `skills/estatewise-engineering/`: default coding playbook for most changes in the monorepo.
- `skills/estatewise-review/`: findings-first review workflow for bugs, regressions, security, and missing tests.
- `skills/estatewise-contracts/`: producer-consumer audit workflow for REST, tRPC, MCP, gRPC, and A2A changes.
- `skills/estatewise-ai-runtime/`: MCP + agentic-ai + A2A + web-grounding playbook.
- `skills/estatewise-local-stack/`: manual runbook for local setup and service debugging.
- `skills/estatewise-ops/`: manual playbook for deployment-control and infrastructure work.

## Why the setup is split this way

- `CLAUDE.md` stays small and always-on.
- Deep repo knowledge and repeatable workflows live in skills so they load on demand.
- The hook is deterministic and low-noise: it only prints short reminders after edits and only when the edited path matches a known high-risk surface.

## Recommended usage

- Use `/estatewise-engineering` for most implementation work.
- Use `/estatewise-review` for review tasks before switching into edit mode.
- Use `/estatewise-contracts` any time a request might change a contract across packages.
- Use `/estatewise-ai-runtime` when touching MCP, agentic-ai, A2A, or tool-call behavior.
- Invoke `/estatewise-local-stack` manually when the task is about running or debugging services.
- Invoke `/estatewise-ops` manually for deployment-control, Docker, Kubernetes, Helm, Terraform, or CI/CD assets.

## MCP note

Project settings connect Claude Code to the local EstateWise MCP server via:

```json
{
  "mcpServers": {
    "estatewise": {
      "command": "npx",
      "args": ["tsx", "mcp/src/server.ts"]
    }
  }
}
```

That keeps tool access available in shared project config without requiring each developer to recreate the setup manually.
