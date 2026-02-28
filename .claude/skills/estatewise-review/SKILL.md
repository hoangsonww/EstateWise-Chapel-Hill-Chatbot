---
name: estatewise-review
description: Findings-first review playbook for EstateWise changes. Use for PR review, diff review, bug hunts, regression checks, security review, or missing-test analysis.
argument-hint: [branch-diff-or-scope]
---

# EstateWise Review

Use this skill when the task is review-oriented rather than implementation-oriented.

## Primary Output Contract

Lead with findings, ordered by severity. Keep summaries short and secondary.

Each finding should include:

1. Severity and impact.
2. Exact file and symbol or route.
3. Why the behavior is risky or incorrect.
4. Reproduction path or failure mode when possible.
5. Missing tests or documentation if that increases risk.

If no findings are discovered, say so explicitly and mention residual risks or validation gaps.

## Severity Order

- `critical`: security issue, data loss, auth bypass, production outage risk, destructive deployment risk.
- `high`: behavior regression, broken contract, guaranteed runtime failure, invalid assumptions across services.
- `medium`: correctness hole, edge case failure, missing validation, flaky or weak test coverage.
- `low`: maintainability issue that could plausibly cause defects later.

Do not lead with style-only issues unless they hide a real bug or maintenance trap.

## Review Checklist By Subsystem

### Backend

- Did route or middleware order change in `backend/src/server.ts`?
- Did auth requirements change accidentally?
- Did the response shape change without updating frontend or MCP consumers?
- Are `/metrics`, `/status`, `/swagger.json`, or `/api-docs` still reachable?
- Are graph endpoints still guarded correctly when Neo4j is disabled?

### Frontend

- Were shared payload assumptions updated everywhere they are duplicated?
- If `frontend/lib/api.ts` changed, did direct page-level fetches stay aligned?
- If chat changed, does streaming, title generation, rating, and conversation CRUD still make sense together?
- If map/insights changed, is marker/query volume still bounded and graph failures surfaced cleanly?
- If auth pages changed, are hardcoded backend URLs still correct for local vs deployed behavior?

### MCP

- Do tool names, descriptions, and JSON schemas still match implementation?
- Are outputs still MCP-client-friendly text blocks?
- If backend endpoints changed, do MCP wrappers still parse and format results correctly?
- If A2A changed, are `a2a.*` tools still consistent with `agentic-ai` HTTP/A2A endpoints?

### Agentic AI

- Do orchestrator, LangGraph, and CrewAI still agree on tool expectations where relevant?
- If HTTP/A2A behavior changed, are `/run`, `/run/stream`, agent card, and task endpoints still coherent?
- If a runtime flag changed, are docs and examples still correct?

### gRPC

- Was the proto changed first?
- Are handlers and server wiring aligned with the proto?
- Were proto lint and tests added or updated where necessary?

### Deployment Control / Infra

- Did the change increase blast radius for deployment commands?
- Are job states, output capture, and command construction still sane?
- Did any cluster or rollout command become more destructive or less observable?
- Is the lack of built-in auth/RBAC still acknowledged in docs and assumptions?

## EstateWise-Specific Risk Patterns

- Hardcoded backend URLs in multiple frontend files can make one-page fixes appear complete when they are not.
- MCP changes often require docs and agentic-ai follow-up even when TypeScript compiles.
- `backend/src/services/geminiChat.service.ts` can hide regressions behind prompt or retry changes that unit tests may miss.
- Graph and AI features are environment-sensitive; “works in CI” does not prove runtime correctness without required services.
- Deployment-control and infra changes can be syntactically correct but operationally unsafe.

## Evidence Gathering

- Prefer exact file references, routes, or tool names over vague statements.
- Read the consumer side for every contract claim.
- If a test is missing, explain which failure would have been caught.
- When you infer behavior from docs or naming rather than code, say it is an inference.

## Closeout

After findings, optionally include:

- Open questions or assumptions.
- A brief change summary.
- Validation gaps that block stronger confidence.
