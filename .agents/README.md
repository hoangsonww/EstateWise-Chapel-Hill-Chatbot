# .agents Directory

This folder stores local Codex agent assets used in this repository.

## Structure

- `skills/`: Project-specific skills available to Codex in this workspace.
  - `estatewise-engineering/`: Workflow and guardrails for production-safe changes in this monorepo.

## Purpose

The `.agents` directory helps keep agent behavior consistent by defining reusable instructions (skills) close to the codebase.

## Maintenance

- Keep skill instructions focused, explicit, and repository-specific.
- Update skill docs when workflows, commands, or service boundaries change.
- Avoid committing secrets or environment-specific values in any skill files.
