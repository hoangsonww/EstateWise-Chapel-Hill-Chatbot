# Shell Utilities

Production-oriented helper scripts for development, CI, Docker builds, and
Terraform workflows. These are thin wrappers around npm, Docker, and Terraform
commands with safety checks.

## Prerequisites
- Node.js + npm
- Docker (for image build/push)
- Terraform (for IaC workflows)
- AWS CLI v2 (for AWS deploy/login via ECR)
- `concurrently` on your PATH (optional; `run_local.sh` falls back to `npx`)

## Core Scripts
- `doctor.sh`: Validate local toolchain and repo layout.
- `bootstrap.sh`: Install backend + frontend dependencies.
- `setup_backend.sh`: Install/build/start backend in dev mode.
- `setup_frontend.sh`: Install/build/start frontend in dev mode.
- `run_local.sh`: Run backend + frontend concurrently.

## Build, Test, Lint, Format
- `build_backend.sh`, `build_frontend.sh`, `build_all.sh`
- `test_backend.sh`, `test_frontend.sh`, `test_all.sh`
- `lint_frontend.sh`, `lint_all.sh`
- `format_backend.sh`, `format_frontend.sh`, `format_all.sh`

## Docker
- `docker_build_backend.sh`, `docker_build_frontend.sh`
- `docker_push_backend.sh`, `docker_push_frontend.sh`
- `docker_login.sh` (supports `REGISTRY_PROVIDER=ghcr|ecr`)
- `build_images.sh`, `push_images.sh`

## Terraform
- `terraform_plan.sh`
- `terraform_apply.sh`
- `terraform_destroy.sh`

## Utilities
- `health_check.sh`: HTTP health probe against a URL.
- `Makefile`: Convenience targets for common tasks.

## Usage
From repo root:

```bash
bash shell/doctor.sh
bash shell/bootstrap.sh
bash shell/run_local.sh
```

Build/test:
```bash
bash shell/build_all.sh
bash shell/test_all.sh
```

Docker (override image tags as needed):
```bash
BACKEND_IMAGE=ghcr.io/you/estatewise-backend:latest \
FRONTEND_IMAGE=ghcr.io/you/estatewise-frontend:latest \
  bash shell/build_images.sh

REGISTRY_PROVIDER=ghcr \
GITHUB_ACTOR=you \
GH_TOKEN=... \
BACKEND_IMAGE=ghcr.io/you/estatewise-backend:latest \
FRONTEND_IMAGE=ghcr.io/you/estatewise-frontend:latest \
  bash shell/push_images.sh
```

Terraform:
```bash
CONTAINER_IMAGE=123456789012.dkr.ecr.us-east-1.amazonaws.com/estatewise-backend:latest \
  bash shell/terraform_plan.sh
```

## Notes
- `setup_backend.sh` and `setup_frontend.sh` support `SKIP_INSTALL=1` and
  `SKIP_BUILD=1` for faster iterations.
- `docker_login.sh` skips login when `REGISTRY_PROVIDER` is unset.
- `health_check.sh` expects a `200` response code.
