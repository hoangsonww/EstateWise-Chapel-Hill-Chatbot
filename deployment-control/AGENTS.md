## Deployment Control Guidance

- Owns the deployment operations API and separate Nuxt UI.
- Preserve job lifecycle semantics: `queued`, `running`, `succeeded`, `failed`.
- Remember the UI is separate from the API and there is no built-in auth/RBAC.
- Treat rollout, scale, and cluster-summary behavior as operationally sensitive.

## Validation

- `npm run build:api`
- `npm run build:ui`
- or `npm run build`

## Docs

- Update `deployment-control/README.md` when API behavior, UI workflow, or operational assumptions change.
