# Codex Extension Checklist

Use this reference when the change spans multiple Codex support surfaces.

## 1. Root guidance

- Root `AGENTS.md` should cover repository-wide rules only.
- Keep it stable and avoid package-specific duplication.

## 2. Nested guidance

- Add `AGENTS.md` files inside packages when work in that package benefits from narrower instructions.
- Keep nested files smaller and more specific than the root file.

## 3. Skills

- Store repository skills in `.agents/skills/`.
- Each skill folder should contain:
  - `SKILL.md`
  - optional `agents/openai.yaml`
  - optional `references/`, `scripts/`, `assets/`
- Keep names lowercase and hyphenated.
- Keep the `description` sharp because implicit invocation depends on it.

## 4. Config

- `.codex/config.toml` is the project-level Codex config.
- Use it for:
  - feature flags such as `multi_agent`
  - project guidance discovery settings
  - shared agent role declarations
  - MCP server registration

## 5. Rules

- Put project rules under `.codex/rules/`.
- Favor prompt rules for risky write or deployment commands.
- Add inline examples for every rule.

## 6. Multi-agent roles

- Keep role descriptions narrow and job-oriented.
- Use read-only explorers/reviewers where possible.
- Prefer worker roles only for targeted implementation tasks.

## 7. Documentation

After editing Codex support, update:

- `.agents/README.md`
- `.codex/README.md`
- root docs only when contributor workflow changed in a way humans need to know
