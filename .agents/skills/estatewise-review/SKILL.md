---
name: estatewise-review
description: Review EstateWise changes for correctness, regressions, security issues, contract mismatches, operational risk, and missing tests. Use for PR review, diff review, bug hunts, and branch-vs-main analysis. Do not use for implementation tasks unless the user asks for fixes after findings are reported.
---

# EstateWise Review

Use this skill when the task is review-oriented rather than implementation-oriented.

## Output Contract

Lead with findings ordered by severity. Keep summaries brief and secondary.

Each finding should include:

1. Severity and impact.
2. Exact file and symbol, route, tool, or endpoint.
3. Why the behavior is risky or incorrect.
4. Reproduction path or failure mode when possible.
5. Missing tests or docs if that increases risk.

If no findings are discovered, say so explicitly and mention residual risks or validation gaps.

## Severity Guide

- `critical`: auth bypass, data loss, production outage risk, destructive deployment risk.
- `high`: broken contract, guaranteed runtime failure, clear regression, unsafe infra behavior.
- `medium`: correctness hole, flaky behavior, edge case failure, missing validation or tests.
- `low`: maintainability issue likely to cause defects later.

Do not lead with style-only comments unless they hide a real defect or maintenance trap.

## EstateWise Review Checklist

### Backend

- Did route or middleware order change in `backend/src/server.ts`?
- Did auth or cookie behavior change unintentionally?
- Did a response shape change without updating frontend or MCP consumers?
- Are `/metrics`, `/status`, `/swagger.json`, and `/api-docs` still coherent?
- Are graph endpoints still guarded correctly when Neo4j is disabled?

### Frontend

- Were shared API assumptions updated everywhere they are duplicated?
- If `frontend/lib/api.ts` changed, do direct page-level fetches still agree?
- If chat changed, do streaming, title generation, rating, and conversation CRUD still fit together?
- If map or insights changed, are marker/query limits and graph-failure handling still sane?

### MCP

- Do tool names, descriptions, and schemas still match implementation?
- Are outputs still text-first and MCP-client-friendly?
- If backend endpoints changed, do MCP wrappers still parse and format correctly?
- If A2A changed, are MCP bridge tools still aligned with the agentic AI server?

### Agentic AI

- Do orchestrator, LangGraph, CrewAI, and HTTP/A2A paths still agree where they overlap?
- If `/run`, `/run/stream`, or A2A task semantics changed, do docs and MCP bridge tools stay aligned?

### gRPC

- Was the proto changed first?
- Are handlers and server wiring aligned with the proto?
- Were proto lint and tests updated where needed?

### Deployment Control / Infra

- Did the change increase blast radius for rollout or scale commands?
- Are job status, output capture, and command construction still safe?
- Is the no-auth assumption still documented and respected?

## High-Risk Repo Patterns

- Frontend backend URLs are duplicated across multiple files and often drift.
- MCP changes often require agentic-ai and docs follow-up even when TypeScript compiles.
- `backend/src/services/geminiChat.service.ts` can hide regressions behind prompt or retry changes.
- Deployment-control and infra changes can be syntactically valid but operationally unsafe.

## Evidence Standards

- Prefer exact file references over vague statements.
- Read the consumer side for every contract claim.
- If a test is missing, explain what failure it would have caught.
- When you are inferring from naming or docs rather than code, say so.
