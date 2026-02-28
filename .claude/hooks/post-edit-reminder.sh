#!/usr/bin/env bash
set -euo pipefail

payload="$(cat || true)"

if [[ -z "${payload}" ]]; then
  exit 0
fi

CLAUDE_HOOK_PAYLOAD="${payload}" python3 <<'PY'
import json
import os
import sys

payload = os.environ.get("CLAUDE_HOOK_PAYLOAD", "").strip()
if not payload:
    raise SystemExit(0)

try:
    data = json.loads(payload)
except Exception:
    raise SystemExit(0)

tool_input = data.get("tool_input") or {}
paths = []

for key in ("file_path", "path"):
    value = tool_input.get(key)
    if isinstance(value, str) and value:
        paths.append(value)

edits = tool_input.get("edits")
if isinstance(edits, list):
    for edit in edits:
        if isinstance(edit, dict):
            value = edit.get("file_path") or edit.get("path")
            if isinstance(value, str) and value:
                paths.append(value)

if not paths:
    raise SystemExit(0)

messages = []

def add(message: str) -> None:
    if message not in messages:
        messages.append(message)

for path in paths:
    if path == "CLAUDE.md" or path.startswith(".claude/"):
        add("Claude reminder: keep always-on memory lean; move heavy reference material into skills instead of CLAUDE.md.")
    if path == "backend/src/server.ts":
        add("Backend reminder: server middleware and route order matter; keep /metrics, /status, /swagger.json, /api-docs, REST, tRPC, and error handling coherent.")
    elif path.startswith("backend/"):
        add("Backend reminder: if an API payload or auth rule changed, update frontend callers, MCP wrappers, and package docs in the same task.")
    if path == "frontend/lib/api.ts" or path.startswith("frontend/pages/"):
        add("Frontend reminder: backend URLs and payload assumptions are duplicated across multiple pages; search frontend for estatewise-backend.vercel.app or API_BASE_URL before treating one edit as complete.")
    if path.startswith("mcp/"):
        add("MCP reminder: validate with cd mcp && npm run build plus a focused npm run client:call -- <tool> '<json>'; npm run dev waits for a stdio client and looks idle.")
    if path.startswith("agentic-ai/"):
        add('Agentic reminder: keep MCP contracts aligned and validate with cd agentic-ai && npm run build plus a realistic npm run dev "goal" run when behavior changes.')
    if path.startswith("grpc/proto/"):
        add("gRPC reminder: proto is the contract source; run cd grpc && npm run proto:check && npm run test after proto changes.")
    elif path.startswith("grpc/"):
        add("gRPC reminder: validate with cd grpc && npm run build && npm run test for service changes.")
    if path.startswith("deployment-control/"):
        add("Deployment-control reminder: preserve queued/running/succeeded/failed job semantics, validate both API and UI builds, and remember there is no built-in auth/RBAC.")

if messages:
    print("\n".join(messages[:3]))
PY
