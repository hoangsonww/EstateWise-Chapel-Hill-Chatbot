# Travis CI

This project includes a Travis CI pipeline that keeps the backend and frontend healthy by installing dependencies, building the code, and running automated tests in separate stages. 
The configuration lives in `.travis.yml` at the repository root.

> [!NOTE]
> **Note:** While Travis CI is still supported, EstateWise has evolved to use **Jenkins** as the primary CI/CD platform for production deployments with advanced features like Blue-Green and Canary deployments. See [jenkins/README.md](jenkins/README.md) and [DEVOPS.md](DEVOPS.md) for comprehensive CI/CD documentation.

## Pipeline Overview

- **Environment:** Ubuntu Focal images with Node.js 20.
- **Caching:** npm cache is persisted between runs to speed up installs.
- **Global variables:** `CI=true`, `NEXT_TELEMETRY_DISABLED=1`, and a quieter npm log level are exported for consistency with other CI providers.
- **Stages:**
  - **Backend build & tests:** Runs `npm --prefix backend ci`, `npm --prefix backend run build`, and `npm --prefix backend test`.
  - **Frontend build & tests:** Runs `npm --prefix frontend ci`, `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and `npm --prefix frontend test`.

## Enabling Travis CI for the Repository

1. Sign in to [Travis CI](https://app.travis-ci.com/) with your GitHub account and authorize access to the repository.
2. From your Travis CI dashboard, enable the repository and trigger the first build (either from the Travis UI or by pushing a commit).
3. In the Travis project settings, add encrypted environment variables for the secrets the build requires, such as:
   - `MONGO_URI`
   - `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
   - `GOOGLE_AI_API_KEY`
   - `PINECONE_API_KEY`
   - Any additional keys used by optional integrations (e.g., analytics, mapping providers).
4. If the build needs access to external services (databases, APIs), make sure the credentials are scoped to CI usage and read-only where possible.

## Working Locally with Travis Commands

- Run `npm --prefix backend run build` and `npm --prefix backend test` to reproduce backend stages locally.
- Run `npm --prefix frontend run lint`, `npm --prefix frontend run build`, and `npm --prefix frontend test` to mirror the frontend stage.
- Keep local Node.js versions aligned with the CI default (Node 20) to minimize discrepancies.

## Maintenance Tips

- Update `.travis.yml` whenever backend/frontend build commands change so CI remains accurate.
- Monitor Travis build history for flaky tests; stabilize or quarantine failing suites before merging.
- Use Travis build badges or links in documentation so contributors can quickly verify build status.
- Combine Travis with existing GitHub Actions workflows when you want redundant CI or different gating logic.

## Comparison: Travis CI vs Jenkins Pipeline

EstateWise has evolved to use a comprehensive Jenkins pipeline for production deployments. Here's how they compare:

| Feature | Travis CI | Jenkins (EstateWise) |
|---------|-----------|---------------------|
| **Basic CI** | ✅ Build, test, lint | ✅ Build, test, lint |
| **Security Scanning** | ❌ Not included | ✅ 5-layer scanning (npm audit, SAST, secrets, container scan, best practices) |
| **Code Coverage** | ❌ Manual setup | ✅ Automated with reporting |
| **Deployment Strategies** | ❌ Basic only | ✅ Blue-Green, Canary, Rolling |
| **Multi-Cloud** | ❌ Manual scripting | ✅ AWS, Azure, GCP, Kubernetes parallel deployment |
| **Monitoring Integration** | ❌ Limited | ✅ Prometheus, Grafana, AlertManager |
| **Automated Rollback** | ❌ Not supported | ✅ Instant rollback (< 1 second) |
| **Production-Ready** | ⚠️ Basic CI only | ✅ Enterprise-grade DevOps |

### When to Use Travis CI

Travis CI is suitable for:
- ✅ Simple CI needs (build, test, lint)
- ✅ Open-source projects (free tier)
- ✅ GitHub-first workflows
- ✅ Redundant CI alongside Jenkins

### When to Use Jenkins

Jenkins is recommended for:
- ✅ Production deployments with advanced strategies
- ✅ Multi-cloud deployments
- ✅ Comprehensive security scanning
- ✅ Zero-downtime requirements
- ✅ Enterprise compliance needs

## Migration Path

To migrate from Travis CI to Jenkins for production deployments:

1. **Keep Travis CI** for basic PR validation
2. **Use Jenkins** for:
   - Production deployments
   - Security scanning
   - Blue-Green/Canary rollouts
   - Multi-cloud infrastructure

See [jenkins/README.md](jenkins/README.md) for Jenkins setup and [DEVOPS.md](DEVOPS.md) for comprehensive deployment strategies.
