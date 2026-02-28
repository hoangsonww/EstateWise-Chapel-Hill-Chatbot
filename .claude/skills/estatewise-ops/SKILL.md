---
name: estatewise-ops
description: Manual playbook for deployment-control, Docker, Kubernetes, Helm, Terraform, Jenkins, and cloud deployment assets in EstateWise.
argument-hint: [ops-scope]
disable-model-invocation: true
---

# EstateWise Ops

Invoke this skill manually for infrastructure, deployment-control, or operational workflow changes.

## Scope

- `deployment-control/`
- `docker/`
- `kubernetes/`
- `helm/`
- `terraform/`
- `aws/`, `azure/`, `gcp/`, `oracle-cloud/`, `hashicorp/`
- `jenkins/`, `gitlab/`
- root docs: `DEPLOYMENTS.md`, `DEVOPS.md`

## Guardrails

- Do not run destructive deployment or cluster commands unless the task explicitly requires it.
- Preserve rollout semantics for blue-green, canary, and rolling paths.
- Keep environment-specific defaults backward compatible unless explicitly asked to change them.
- Treat `deployment-control` as trusted-environment software unless the task adds auth/RBAC deliberately.

## Important EstateWise Details

- `deployment-control/src/server.ts` builds shell commands for rollout and scale actions.
- Job lifecycle semantics matter: `queued`, `running`, `succeeded`, `failed`.
- UI is served separately via Nuxt on port `3000`; API defaults to `4100`.
- MCP and agentic-ai deployments are often sidecar or bundled runtime patterns, not generic stateless web apps.
- MCP is stdio-oriented; deployment docs must preserve that mental model.

## Validation

### Deployment Control

```bash
cd deployment-control
npm run build:api
npm run build:ui
```

### Docker / Compose docs or manifests

- Validate referenced image names, env vars, and sidecar assumptions against existing files.

### Kubernetes / Helm / Terraform

- Prefer static validation and focused manifest inspection unless the task explicitly requests live cluster actions.
- Confirm values stay aligned with service ports, env vars, and container entrypoints used elsewhere in the repo.

## Documentation To Update

- `deployment-control/README.md`
- `docker/README.md`
- `kubernetes/README.md`
- `helm/estatewise/README.md`
- `DEPLOYMENTS.md`
- `DEVOPS.md`
- cloud-specific READMEs when their deployment path changes

## Review Questions

- Does the change increase operational blast radius?
- Does it change the contract between deployment-control API and UI?
- Does it change how MCP or agentic-ai is launched or wired?
- Are auth/security assumptions still explicitly documented?
- Are rollback and status-observability paths still intact?
