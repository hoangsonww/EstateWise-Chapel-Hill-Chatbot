---
name: estatewise-ops
description: Work on EstateWise deployment-control, Docker, Kubernetes, Helm, Terraform, Jenkins, and cloud deployment assets. Use for infrastructure and operational workflow changes, not ordinary application feature work.
---

# EstateWise Ops

Use this skill for infrastructure, deployment-control, or operational workflow changes.

## Scope

- `deployment-control/`
- `docker/`
- `kubernetes/`
- `helm/`
- `terraform/`
- `aws/`, `azure/`, `gcp/`, `oracle-cloud/`, `hashicorp/`
- `jenkins/`, `gitlab/`
- root docs such as `DEPLOYMENTS.md` and `DEVOPS.md`

## Guardrails

1. Do not run destructive deployment or cluster commands unless explicitly requested.
2. Preserve rollout semantics for blue-green, canary, and rolling paths.
3. Keep environment defaults backward compatible unless asked to change them.
4. Remember `deployment-control` has no built-in auth/RBAC.

## EstateWise-Specific Notes

- `deployment-control/src/server.ts` builds shell commands for rollout and scale actions.
- Job lifecycle semantics matter: `queued`, `running`, `succeeded`, `failed`.
- UI is separate from the API and typically runs on port `3000`; API defaults to `4100`.
- MCP and agentic-ai deployments often use sidecar or bundled-runtime patterns rather than generic web deployment patterns.
- MCP is stdio-oriented; deployment docs and manifests should preserve that model.

## Validation

### Deployment Control

```bash
cd deployment-control
npm run build:api
npm run build:ui
```

### Infra Changes

- Prefer focused static validation and manifest inspection unless the task explicitly asks for live environment changes.
- Confirm service ports, env vars, and container entrypoints remain aligned with the rest of the repo.

## Documentation To Update

- `deployment-control/README.md`
- `docker/README.md`
- `kubernetes/README.md`
- `helm/estatewise/README.md`
- `DEPLOYMENTS.md`
- `DEVOPS.md`
- cloud-specific READMEs when their workflows changed
