---
name: estatewise-codex-support
description: Extend or audit Codex support in the EstateWise repository. Use when changing .codex config, .codex/rules, .agents/skills, AGENTS.md layering, multi-agent roles, project guidance discovery, or Codex-specific documentation and workflows.
---

# EstateWise Codex Support

Use this skill when the task is about Codex itself in this repository rather than product code.

## Codex Extension Surfaces In This Repo

- Root guidance: `AGENTS.md`
- Nested guidance: package-level `AGENTS.md` files under repo subdirectories
- Codex skills: `.agents/skills/`
- Codex config: `.codex/config.toml`
- Codex multi-agent role configs: `.codex/agents/*.toml`
- Codex rules: `.codex/rules/*.rules`

Read `references/codex-extension-checklist.md` when the change spans more than one of these surfaces.

## Design Rules

1. Keep root `AGENTS.md` repository-wide and stable.
2. Put subsystem-specific guidance into nested `AGENTS.md` files close to the owning package.
3. Keep each skill focused on one job with a sharp description that clearly states when it should and should not trigger.
4. Use `agents/openai.yaml` for UI metadata and invocation policy rather than bloating `SKILL.md`.
5. Prefer concise metadata and concise skill bodies; move heavier material into `references/`.
6. Only add rules for command families that are genuinely risky or repeatedly worth controlling.
7. Use the OpenAI Developers docs MCP server when verifying current Codex behavior instead of relying on memory.

## Skill Creation Checklist

For each new or updated skill:

1. Keep frontmatter to `name` and `description` only.
2. Make the description explicit about trigger scope and non-goals.
3. Keep the body imperative and procedural.
4. Add `agents/openai.yaml` with:
   - `interface.display_name`
   - `interface.short_description`
   - `interface.default_prompt`
   - `policy.allow_implicit_invocation`
5. Add `references/` only when the extra material is genuinely needed later.
6. Do not add README or changelog files inside the skill directory.

## AGENTS Layering Checklist

When adding nested `AGENTS.md` files:

1. Keep them narrower than the root file.
2. Focus on package ownership, high-risk files, contract edges, and validation commands.
3. Avoid restating large portions of the root instructions.
4. Place overrides as close to specialized work as possible.

## Rules Checklist

When adding `.codex/rules/*.rules`:

1. Use `prompt` for risky command families with legitimate uses.
2. Use `forbidden` only when the alternative is clear and the project truly never wants the command.
3. Add `match` and `not_match` examples to catch mistakes.
4. Prefer exact prefixes over broad wrappers like `bash -lc`.

## Validation

After editing Codex support files:

- Re-read affected `AGENTS.md`, skill, config, and rules files for conflicts.
- Validate TOML/JSON syntax where relevant.
- Run `git diff --check`.
- If you added or changed rules, sanity-check the rule shapes and examples carefully.

## Documentation

Update these when Codex support changes:

- `.agents/README.md`
- `.codex/README.md`
- root `README.md` only if repository-wide contributor workflow materially changed
