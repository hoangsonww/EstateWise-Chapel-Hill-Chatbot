# Codex Setup

This repository now ships with a project-level Codex layer for multi-agent roles, project rules, and Codex-specific contributor workflows.

## What is included

- `config.toml`: enables `features.multi_agent`, raises the project guidance byte budget, and registers shared roles plus the OpenAI Developers MCP server.
- `agents/explorer.toml`: read-only codebase mapper for locating ownership boundaries and execution paths.
- `agents/reviewer.toml`: read-only reviewer for correctness, security, regressions, and missing tests.
- `agents/docs-researcher.toml`: read-only documentation verifier that uses the OpenAI Developers MCP server.
- `agents/browser-debugger.toml`: browser evidence collector for frontend and integration failures.
- `agents/worker.toml`: implementation-focused role for small, targeted fixes.
- `agents/monitor.toml`: wait/poll role for long-running tests, builds, or deploy checks.
- `rules/estatewise.rules`: project approval rules for risky commands like `git push`, `npm install`, `kubectl`, `helm`, `terraform`, `docker push`, and recursive deletes.
- `.agents/skills/`: Codex repo skills for engineering, review, contracts, AI runtime work, Codex support, local stack debugging, and ops work.
- package-level `AGENTS.md` files: narrower instructions for `backend/`, `frontend/`, `mcp/`, `agentic-ai/`, `grpc/`, and `deployment-control/`.

## Enablement

1. Restart Codex after pulling these files so the project config is loaded.
2. If your Codex client does not automatically honor the project config yet, enable Multi-agents from `/experimental` once and restart.
3. Use `/agent` in the CLI to inspect or switch between active agent threads.

## OpenAI Developers MCP

The project config registers:

```toml
[mcp_servers.openaiDeveloperDocs]
url = "https://developers.openai.com/mcp"
```

Use the `docs_researcher` role when you need exact OpenAI/Codex behavior verified against current developer documentation instead of relying on memory.

## Skills And Guidance Layering

Codex support in this repo now uses three layers together:

1. Root `AGENTS.md` for repository-wide rules and structure.
2. Nested package `AGENTS.md` files for subsystem-specific guidance.
3. Repo skills under `.agents/skills/` for deeper on-demand workflows.

That keeps always-on guidance relatively stable while moving heavier procedures into skills that Codex can load only when needed.

## Recommended workflows

### PR review

Ask Codex to split review concerns across agents:

```text
Review this branch against main. Have explorer map the affected code paths, reviewer find correctness and security risks, and docs_researcher verify any OpenAI or framework APIs the patch depends on.
```

### UI / integration debugging

Use the browser role before editing:

```text
Investigate why the insights page fails to load saved comparisons. Have browser_debugger reproduce it, explorer trace the responsible code path, and worker implement the smallest fix once the failure mode is clear.
```

### Long-running validation

Use the monitor role for waits and polls:

```text
Run the targeted build and test commands, have monitor watch the long-running checks, and summarize failures by package.
```

## Sandbox and approvals

- Sub-agents inherit the parent sandbox policy.
- Sub-agents run with non-interactive approvals, so any action that would require a fresh approval fails and bubbles back to the parent workflow.
- Keep read-only work in `explorer`, `reviewer`, `docs_researcher`, and `monitor`; reserve `worker` and `browser_debugger` for workflows that actually need write-capable or browser-capable execution.
- Project rules under `.codex/rules/` add extra prompt gates for high-risk command families when Codex requests execution outside the sandbox.
