# Shell Utilities

Helper scripts for local development and basic deployment workflows. These are
thin wrappers around npm, Docker, and AWS CLI commands.

## Prerequisites
- Node.js + npm
- Docker (for image build/push)
- AWS CLI v2 (for `deploy.sh`)
- `concurrently` on your PATH (used by `run_local.sh`)
  - `npm install -g concurrently`

## Scripts
- `build_images.sh`: Builds Docker images for backend/crawler/newsletters.
- `push_images.sh`: Pushes Docker images for backend/crawler/newsletters.
- `deploy.sh`: End-to-end AWS deploy (ECR + ECS/Fargate + ALB + DocumentDB).
- `setup_backend.sh`: Installs deps, builds, and starts backend in dev mode.
- `setup_frontend.sh`: Installs deps, builds, and starts frontend in dev mode.
- `run_local.sh`: Runs backend + frontend concurrently.
- `Makefile`: Convenience targets for all scripts.

## Usage
From repo root:

```bash
bash shell/setup_backend.sh
bash shell/setup_frontend.sh
bash shell/run_local.sh
```

Or via Makefile:

```bash
cd shell
make run-local
```

## Notes
- `setup_backend.sh` and `deploy.sh` currently `cd` into `server/`. If your
  backend lives in `backend/`, update those scripts accordingly.
- `build_images.sh` and `push_images.sh` expect these scripts/directories to
  exist:
  - `publish_estatewise.sh`
  - `crawler/publish_crawler.sh`
  - `newsletters/publish_newsletters.sh`
  If they are missing in your checkout, adjust the scripts or provide them.
- `deploy.sh` requires the following env vars:
  `AWS_REGION`, `DOCDB_MASTER_USERNAME`, `DOCDB_MASTER_PASSWORD`, `JWT_SECRET`,
  `GOOGLE_AI_API_KEY`, `PINECONE_API_KEY`, and optionally `MONGO_INITDB_DATABASE`,
  `PINECONE_INDEX`.
