# .agents Directory

This folder stores local Codex agent assets used in this repository.

## Structure

- `skills/`: Project-specific skills available to Codex in this workspace.
  - `estatewise-engineering/`: Default implementation playbook for most code changes in the monorepo.
  - `estatewise-review/`: Findings-first review workflow for regressions, bugs, security, and missing tests.
  - `estatewise-contracts/`: Producer-consumer audit workflow for REST, tRPC, MCP, gRPC, and A2A changes.
  - `estatewise-ai-runtime/`: MCP, agentic-ai, web-grounding, token, and A2A playbook.
  - `estatewise-codex-support/`: Playbook for extending Codex itself in this repository.
  - `estatewise-local-stack/`: Manual runbook for local setup, service combinations, and environment debugging.
  - `estatewise-ops/`: Manual playbook for deployment-control and infrastructure work.

## Purpose

The `.agents` directory helps keep agent behavior consistent by defining reusable instructions (skills) close to the codebase.
The root skill set is intended for Codex. Keep Claude-specific guidance under `.claude/`.

## Maintenance

- Keep skill instructions focused, explicit, and repository-specific.
- Update skill docs when workflows, commands, or service boundaries change.
- Avoid committing secrets or environment-specific values in any skill files.
