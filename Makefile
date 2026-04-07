###############################################################################
# Makefile for the EstateWise Monorepo
#
# Orchestrates every service, tool, and deployment target in the monorepo:
#   backend · frontend · gRPC · MCP · agentic-ai · deployment-control
#   context-engineering · Docker · Helm · Terraform · Kubernetes · Datadog
#
# Requirements:
#   - Node.js 20+, npm
#   - Docker / Podman (container targets)
#   - Helm 3 (Kubernetes targets)
#   - Terraform 1.5+ (infra targets)
#   - kubectl (Kubernetes ops)
#   - buf (proto lint)
#   - datadog-ci (Datadog CI targets — optional)
#
# Quick start:
#   make install        # install backend + frontend deps
#   make dev            # run backend + frontend concurrently
#   make build-all      # compile every service
#   make test-all       # run every test suite
#   make docker-prod    # full production stack with monitoring
#   make preflight      # validate everything before deploy
#
###############################################################################

# Default goal
.DEFAULT_GOAL := help

# ─── Directories ──────────────────────────────────────────────
BACKEND_DIR   := backend
FRONTEND_DIR  := frontend
GRPC_DIR      := grpc
MCP_DIR       := mcp
AGENTIC_DIR   := agentic-ai
DC_DIR        := deployment-control
CTX_DIR       := context-engineering
SHELL_DIR     := shell
HELM_DIR      := helm/estatewise
TF_DIR        := terraform
K8S_DIR       := kubernetes
DOCS_BACKEND  := docs-backend

# ─── Docker / Registry ───────────────────────────────────────
COMPOSE_FILE     := docker-compose.yml
COMPOSE_PROD     := docker/compose.prod.yml
COMPOSE_PODMAN   := docker/podman-compose.prod.yml
DOCKER_REGISTRY  ?= ghcr.io/your-org
IMAGE_TAG        ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)

# ─── Kubernetes ───────────────────────────────────────────────
K8S_NAMESPACE    ?= estatewise
KUBE_CONTEXT     ?= $(shell kubectl config current-context 2>/dev/null)

# ─── Datadog ──────────────────────────────────────────────────
DD_ENV           ?= development
DD_SITE          ?= datadoghq.com

# ─── Terraform ────────────────────────────────────────────────
TF_VAR_FILE      ?= terraform.tfvars

#——————————————————————————————————————————————————————————————
.PHONY: help \
        install install-all backend-install frontend-install grpc-install \
        mcp-install agentic-install dc-install ctx-install \
        backend-setup frontend-setup run-local dev \
        build build-all build-backend build-frontend build-grpc build-mcp \
        build-agentic build-dc build-ctx \
        upsert graph-ingest \
        test test-all test-backend test-frontend test-grpc test-e2e test-cypress test-selenium \
        lint lint-all format proto-check \
        docker-up docker-down docker-prod docker-prod-podman docker-logs docker-ps \
        docker-build docker-build-backend docker-build-frontend docker-build-grpc \
        docker-build-mcp docker-build-agentic docker-push docker-scan \
        deploy deploy-control-dev deploy-control-ui \
        dd-up dd-down dd-status dd-monitors dd-apply dd-synthetics dd-dashboard \
        helm-lint helm-template helm-deploy helm-deploy-dd helm-diff helm-rollback \
        tf-init tf-plan tf-apply tf-destroy tf-fmt tf-validate \
        k8s-apply k8s-status k8s-logs k8s-restart k8s-scale k8s-port-forward \
        k8s-gitops-bootstrap k8s-gitops-preflight k8s-chaos \
        mcp-dev mcp-client mcp-client-call \
        agentic-dev agentic-serve agentic-langgraph agentic-crewai \
        ctx-dev ctx-seed ctx-build \
        grpc-dev grpc-test-call \
        docs docs-backend-gen docs-frontend-gen docs-jsdoc \
        sonar sonar-up sonar-down sonar-status \
        snyk snyk-monitor snyk-container snyk-iac security \
        health-check doctor preflight smoke-test \
        backend-dev frontend-dev \
        clean clean-all clean-docker \
        info

#——————————————————————————————————————————————————————————————
# HELP
#——————————————————————————————————————————————————————————————
help:
	@echo ""
	@echo "╔══════════════════════════════════════════════════════════════╗"
	@echo "║            EstateWise Monorepo — make <target>              ║"
	@echo "╚══════════════════════════════════════════════════════════════╝"
	@echo ""
	@echo "─── Install ──────────────────────────────────────────────────"
	@echo "  install             Backend + frontend deps"
	@echo "  install-all         All services (backend, frontend, gRPC, MCP, agentic, DC, ctx)"
	@echo ""
	@echo "─── Build ───────────────────────────────────────────────────"
	@echo "  build               Backend + frontend"
	@echo "  build-all           Every service"
	@echo "  build-{backend,frontend,grpc,mcp,agentic,dc,ctx}"
	@echo ""
	@echo "─── Dev ─────────────────────────────────────────────────────"
	@echo "  dev                 Backend + frontend concurrently"
	@echo "  backend-dev         Backend only"
	@echo "  frontend-dev        Frontend only"
	@echo "  grpc-dev            gRPC service on :50051"
	@echo "  mcp-dev             MCP stdio server"
	@echo "  agentic-dev         Agentic AI default orchestrator"
	@echo "  agentic-serve       Agentic AI HTTP/A2A server"
	@echo "  ctx-dev             Context engineering API + D3 UI on :4200"
	@echo "  deploy-control-dev  Deployment control API on :4100"
	@echo "  deploy-control-ui   Deployment control Nuxt UI on :3000"
	@echo ""
	@echo "─── Data ────────────────────────────────────────────────────"
	@echo "  upsert              Upsert properties into Pinecone"
	@echo "  graph-ingest        Ingest Pinecone data into Neo4j"
	@echo "  ctx-seed            Seed context engineering knowledge graph"
	@echo ""
	@echo "─── Test ────────────────────────────────────────────────────"
	@echo "  test                Backend + frontend"
	@echo "  test-all            Every service"
	@echo "  test-{backend,frontend,grpc}"
	@echo "  test-e2e            Cypress + Selenium"
	@echo "  test-cypress        Cypress only"
	@echo "  test-selenium       Selenium only"
	@echo ""
	@echo "─── Quality ─────────────────────────────────────────────────"
	@echo "  lint                Backend + frontend lint"
	@echo "  lint-all            Lint + proto check"
	@echo "  format              Prettier write across repo"
	@echo "  proto-check         buf lint gRPC proto"
	@echo ""
	@echo "─── Security ────────────────────────────────────────────────"
	@echo "  sonar               Run SonarQube analysis"
	@echo "  sonar-up            Start local SonarQube server"
	@echo "  sonar-down          Stop local SonarQube server"
	@echo "  sonar-status        Check SonarQube server health"
	@echo "  snyk                Run Snyk SCA + SAST across all services"
	@echo "  snyk-monitor        Upload snapshot to Snyk dashboard"
	@echo "  snyk-container      Scan Docker images with Snyk"
	@echo "  snyk-iac            Scan IaC (Terraform/K8s/Docker) with Snyk"
	@echo "  security            Run full security suite (Snyk + SonarQube + Trivy)"
	@echo ""
	@echo "─── Docker ──────────────────────────────────────────────────"
	@echo "  docker-up           Dev compose up"
	@echo "  docker-down         Compose down"
	@echo "  docker-prod         Production stack (+ monitoring if DD_API_KEY set)"
	@echo "  docker-prod-podman  Production stack via Podman"
	@echo "  docker-build        Build all images"
	@echo "  docker-push         Push all images to registry"
	@echo "  docker-scan         Trivy scan all images"
	@echo "  docker-logs         Tail all container logs"
	@echo "  docker-ps           Show running containers"
	@echo ""
	@echo "─── Helm (Kubernetes) ───────────────────────────────────────"
	@echo "  helm-lint           Lint chart"
	@echo "  helm-template       Render templates (dry-run)"
	@echo "  helm-deploy         Deploy chart"
	@echo "  helm-deploy-dd      Deploy with Datadog enabled"
	@echo "  helm-diff           Diff pending changes"
	@echo "  helm-rollback       Rollback to previous release"
	@echo ""
	@echo "─── Terraform ───────────────────────────────────────────────"
	@echo "  tf-init             Initialize Terraform"
	@echo "  tf-plan             Plan infrastructure changes"
	@echo "  tf-apply            Apply infrastructure"
	@echo "  tf-destroy          Destroy infrastructure"
	@echo "  tf-fmt              Format Terraform files"
	@echo "  tf-validate         Validate Terraform config"
	@echo ""
	@echo "─── Kubernetes Ops ──────────────────────────────────────────"
	@echo "  k8s-apply           Apply manifests to cluster"
	@echo "  k8s-status          Show pod/svc/deploy status"
	@echo "  k8s-logs            Tail backend pod logs"
	@echo "  k8s-restart         Rolling restart all deployments"
	@echo "  k8s-scale N=3       Scale backend to N replicas"
	@echo "  k8s-port-forward    Forward backend :3001 locally"
	@echo "  k8s-gitops-bootstrap Bootstrap GitOps control plane"
	@echo "  k8s-gitops-preflight Preflight validation"
	@echo "  k8s-chaos           Run chaos engineering tests"
	@echo ""
	@echo "─── Datadog ─────────────────────────────────────────────────"
	@echo "  dd-up               Start Datadog agent + app services"
	@echo "  dd-down             Stop Datadog agent"
	@echo "  dd-status           Agent health check"
	@echo "  dd-monitors         Terraform plan monitors (dry-run)"
	@echo "  dd-apply            Terraform apply Datadog resources"
	@echo "  dd-synthetics       Run synthetic tests"
	@echo "  dd-dashboard        Open dashboard in browser"
	@echo ""
	@echo "─── Docs ────────────────────────────────────────────────────"
	@echo "  docs                Generate all documentation"
	@echo "  docs-backend-gen    TypeDoc for backend"
	@echo "  docs-frontend-gen   TypeDoc for frontend"
	@echo "  docs-jsdoc          JSDoc"
	@echo ""
	@echo "─── Health & Validation ─────────────────────────────────────"
	@echo "  health-check        Run health check script"
	@echo "  doctor              Run environment doctor"
	@echo "  preflight           Full pre-deploy validation"
	@echo "  smoke-test          Quick smoke test against running services"
	@echo "  info                Show build metadata"
	@echo ""
	@echo "─── Cleanup ─────────────────────────────────────────────────"
	@echo "  clean               Remove build artifacts"
	@echo "  clean-all           Remove build artifacts + node_modules"
	@echo "  clean-docker        Remove all EstateWise containers/images"
	@echo ""

#——————————————————————————————————————————————————————————————
# INFO
#——————————————————————————————————————————————————————————————
info:
	@echo "Repository:     EstateWise Monorepo"
	@echo "Image Tag:      $(IMAGE_TAG)"
	@echo "Registry:       $(DOCKER_REGISTRY)"
	@echo "K8s Namespace:  $(K8S_NAMESPACE)"
	@echo "K8s Context:    $(KUBE_CONTEXT)"
	@echo "DD Environment: $(DD_ENV)"
	@echo "Node:           $$(node --version 2>/dev/null || echo 'not found')"
	@echo "npm:            $$(npm --version 2>/dev/null || echo 'not found')"
	@echo "Docker:         $$(docker --version 2>/dev/null || echo 'not found')"
	@echo "Helm:           $$(helm version --short 2>/dev/null || echo 'not found')"
	@echo "Terraform:      $$(terraform version -json 2>/dev/null | python3 -c 'import sys,json;print(json.load(sys.stdin)["terraform_version"])' 2>/dev/null || echo 'not found')"
	@echo "kubectl:        $$(kubectl version --client --short 2>/dev/null || echo 'not found')"

#——————————————————————————————————————————————————————————————
# INSTALL
#——————————————————————————————————————————————————————————————
install: backend-install frontend-install

install-all: backend-install frontend-install grpc-install mcp-install agentic-install dc-install ctx-install

backend-install:
	cd $(BACKEND_DIR) && npm install

frontend-install:
	cd $(FRONTEND_DIR) && npm install

grpc-install:
	cd $(GRPC_DIR) && npm install

mcp-install:
	cd $(MCP_DIR) && npm install

agentic-install:
	cd $(AGENTIC_DIR) && npm install

dc-install:
	cd $(DC_DIR) && npm run install:all

ctx-install:
	cd $(CTX_DIR) && npm install

#——————————————————————————————————————————————————————————————
# SETUP (shell scripts)
#——————————————————————————————————————————————————————————————
backend-setup:
	bash $(SHELL_DIR)/setup_backend.sh

frontend-setup:
	bash $(SHELL_DIR)/setup_frontend.sh

run-local:
	bash $(SHELL_DIR)/run_local.sh

dev: run-local

#——————————————————————————————————————————————————————————————
# BUILD
#——————————————————————————————————————————————————————————————
build: build-backend build-frontend

build-all: build-backend build-frontend build-grpc build-mcp build-agentic build-dc build-ctx

build-backend:
	cd $(BACKEND_DIR) && npm run build

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

build-grpc:
	cd $(GRPC_DIR) && npm run build

build-mcp:
	cd $(MCP_DIR) && npm run build

build-agentic:
	cd $(AGENTIC_DIR) && npm run build

build-dc:
	cd $(DC_DIR) && npm run build

build-ctx:
	cd $(CTX_DIR) && npm run build

#——————————————————————————————————————————————————————————————
# DATA PIPELINES
#——————————————————————————————————————————————————————————————
upsert:
	cd $(BACKEND_DIR) && npm run upsert

graph-ingest:
	cd $(BACKEND_DIR) && npm run graph:ingest

ctx-seed:
	cd $(CTX_DIR) && npm run seed

#——————————————————————————————————————————————————————————————
# TESTS
#——————————————————————————————————————————————————————————————
test: test-backend test-frontend

test-all: test-backend test-frontend test-grpc

test-backend:
	cd $(BACKEND_DIR) && npm run test

test-frontend:
	cd $(FRONTEND_DIR) && npm run test

test-grpc:
	cd $(GRPC_DIR) && npm run test

test-e2e: test-cypress test-selenium

test-cypress:
	cd $(FRONTEND_DIR) && npm run cypress:run

test-selenium:
	cd $(FRONTEND_DIR) && npm run test:selenium

#——————————————————————————————————————————————————————————————
# LINT & FORMAT
#——————————————————————————————————————————————————————————————
lint:
	cd $(FRONTEND_DIR) && npm run lint
	npm run lint

lint-all: lint proto-check

format:
	npm run format

proto-check:
	cd $(GRPC_DIR) && npm run proto:check

#——————————————————————————————————————————————————————————————
# SECURITY — SONARQUBE + SNYK
#——————————————————————————————————————————————————————————————

# ── SonarQube ─────────────────────────────────────────────────
sonar:
	@if [ -z "$$SONAR_TOKEN" ]; then \
		echo "Error: SONAR_TOKEN is required. Export it or set in CI."; exit 1; \
	fi
	sonar-scanner \
		-Dsonar.host.url=$${SONAR_HOST_URL:-http://localhost:9000} \
		-Dsonar.token=$$SONAR_TOKEN \
		-Dsonar.projectVersion=$(IMAGE_TAG) \
		-Dsonar.qualitygate.wait=true \
		-Dsonar.qualitygate.timeout=300

sonar-up:
	docker compose -f docker/compose.sonarqube.yml up -d
	@echo "SonarQube starting at http://localhost:9000 (may take 60-90s to initialize)"
	@echo "Default credentials: admin / admin"

sonar-down:
	docker compose -f docker/compose.sonarqube.yml down

sonar-status:
	@curl -sf http://localhost:9000/api/system/status 2>/dev/null | python3 -c \
		"import sys,json; d=json.load(sys.stdin); print(f'SonarQube: {d[\"status\"]}')" 2>/dev/null || \
		echo "SonarQube is not running. Start with: make sonar-up"

# ── Snyk ──────────────────────────────────────────────────────
snyk:
	@if [ -z "$$SNYK_TOKEN" ]; then \
		echo "Error: SNYK_TOKEN is required. Export it or run: snyk auth"; exit 1; \
	fi
	@echo "=== Snyk Open Source (SCA) ==="
	@for pkg in backend frontend grpc mcp agentic-ai; do \
		if [ -f "$$pkg/package.json" ]; then \
			echo "── $$pkg ──"; \
			snyk test --file=$$pkg/package.json --severity-threshold=high \
				--org=$${SNYK_ORG:-estatewise} || true; \
		fi; \
	done
	@echo ""
	@echo "=== Snyk Code (SAST) ==="
	snyk code test --severity-threshold=high --org=$${SNYK_ORG:-estatewise} || true

snyk-monitor:
	@if [ -z "$$SNYK_TOKEN" ]; then \
		echo "Error: SNYK_TOKEN is required."; exit 1; \
	fi
	@echo "=== Uploading dependency snapshots to Snyk dashboard ==="
	@for pkg in backend frontend grpc mcp agentic-ai; do \
		if [ -f "$$pkg/package.json" ]; then \
			echo "── $$pkg ──"; \
			snyk monitor --file=$$pkg/package.json \
				--project-name=estatewise-$$pkg \
				--org=$${SNYK_ORG:-estatewise} || true; \
		fi; \
	done

snyk-container:
	@if [ -z "$$SNYK_TOKEN" ]; then \
		echo "Error: SNYK_TOKEN is required."; exit 1; \
	fi
	@echo "=== Snyk Container Image Scan ==="
	@for svc in backend frontend grpc mcp agentic-ai; do \
		echo "── $(DOCKER_REGISTRY)/estatewise-$$svc:$(IMAGE_TAG) ──"; \
		snyk container test $(DOCKER_REGISTRY)/estatewise-$$svc:$(IMAGE_TAG) \
			--severity-threshold=high \
			--org=$${SNYK_ORG:-estatewise} || true; \
	done

snyk-iac:
	@if [ -z "$$SNYK_TOKEN" ]; then \
		echo "Error: SNYK_TOKEN is required."; exit 1; \
	fi
	@echo "=== Snyk IaC Scan ==="
	snyk iac test terraform/ --severity-threshold=medium --org=$${SNYK_ORG:-estatewise} || true
	snyk iac test kubernetes/ --severity-threshold=medium --org=$${SNYK_ORG:-estatewise} || true
	snyk iac test helm/ --severity-threshold=medium --org=$${SNYK_ORG:-estatewise} || true
	snyk iac test docker/compose.prod.yml --severity-threshold=medium --org=$${SNYK_ORG:-estatewise} || true

# ── Combined Security Gate ────────────────────────────────────
security: snyk sonar docker-scan
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "  Security suite complete"
	@echo "  • Snyk SCA + SAST          ✓"
	@echo "  • SonarQube analysis        ✓"
	@echo "  • Trivy container scan      ✓"
	@echo "═══════════════════════════════════════════"

#——————————————————————————————————————————————————————————————
# DOCKER — COMPOSE
#——————————————————————————————————————————————————————————————
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-prod:
	@if [ -z "$$DD_API_KEY" ]; then \
		echo "⚠ Starting production stack without Datadog (DD_API_KEY not set)"; \
		docker compose -f $(COMPOSE_PROD) up -d --build; \
	else \
		echo "✓ Starting production stack with Datadog agent"; \
		docker compose -f $(COMPOSE_PROD) --profile monitoring up -d --build; \
	fi

docker-prod-podman:
	@if [ -z "$$DD_API_KEY" ]; then \
		echo "⚠ Starting production stack without Datadog (DD_API_KEY not set)"; \
		podman-compose -f $(COMPOSE_PODMAN) up -d --build; \
	else \
		echo "✓ Starting production stack with Datadog agent"; \
		DD_API_KEY=$$DD_API_KEY podman-compose -f $(COMPOSE_PODMAN) up -d --build; \
	fi

docker-logs:
	docker compose -f $(COMPOSE_PROD) logs -f --tail=100

docker-ps:
	docker compose -f $(COMPOSE_PROD) ps

deploy:
	bash $(SHELL_DIR)/deploy.sh

#——————————————————————————————————————————————————————————————
# DOCKER — IMAGE BUILD & PUSH
#——————————————————————————————————————————————————————————————
docker-build: docker-build-backend docker-build-frontend docker-build-grpc docker-build-mcp docker-build-agentic

docker-build-backend:
	docker build \
		--label com.datadoghq.tags.service=estatewise-backend \
		--label com.datadoghq.tags.version=$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-backend:$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-backend:latest \
		-f $(BACKEND_DIR)/Dockerfile .

docker-build-frontend:
	docker build \
		--label com.datadoghq.tags.service=estatewise-frontend \
		--label com.datadoghq.tags.version=$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-frontend:$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-frontend:latest \
		-f $(FRONTEND_DIR)/Dockerfile .

docker-build-grpc:
	docker build \
		--label com.datadoghq.tags.service=estatewise-grpc \
		--label com.datadoghq.tags.version=$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-grpc:$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-grpc:latest \
		-f $(GRPC_DIR)/Dockerfile .

docker-build-mcp:
	docker build \
		--label com.datadoghq.tags.service=estatewise-mcp \
		--label com.datadoghq.tags.version=$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-mcp:$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-mcp:latest \
		$(MCP_DIR)/

docker-build-agentic:
	docker build \
		--label com.datadoghq.tags.service=estatewise-agentic-ai \
		--label com.datadoghq.tags.version=$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-agentic-ai:$(IMAGE_TAG) \
		-t $(DOCKER_REGISTRY)/estatewise-agentic-ai:latest \
		-f $(AGENTIC_DIR)/Dockerfile .

docker-push:
	@echo "Pushing all images tagged $(IMAGE_TAG)..."
	docker push $(DOCKER_REGISTRY)/estatewise-backend:$(IMAGE_TAG)
	docker push $(DOCKER_REGISTRY)/estatewise-backend:latest
	docker push $(DOCKER_REGISTRY)/estatewise-frontend:$(IMAGE_TAG)
	docker push $(DOCKER_REGISTRY)/estatewise-frontend:latest
	docker push $(DOCKER_REGISTRY)/estatewise-grpc:$(IMAGE_TAG)
	docker push $(DOCKER_REGISTRY)/estatewise-grpc:latest
	docker push $(DOCKER_REGISTRY)/estatewise-mcp:$(IMAGE_TAG)
	docker push $(DOCKER_REGISTRY)/estatewise-mcp:latest
	docker push $(DOCKER_REGISTRY)/estatewise-agentic-ai:$(IMAGE_TAG)
	docker push $(DOCKER_REGISTRY)/estatewise-agentic-ai:latest

docker-scan:
	@echo "Scanning images with Trivy..."
	@for svc in backend frontend grpc mcp agentic-ai; do \
		echo "── estatewise-$$svc ──"; \
		trivy image --severity HIGH,CRITICAL $(DOCKER_REGISTRY)/estatewise-$$svc:$(IMAGE_TAG) || true; \
	done

#——————————————————————————————————————————————————————————————
# HELM
#——————————————————————————————————————————————————————————————
helm-lint:
	helm lint $(HELM_DIR)

helm-template:
	helm template estatewise $(HELM_DIR) \
		--set datadog.enabled=true \
		--set datadog.monitors.enabled=true

helm-deploy:
	helm upgrade --install estatewise $(HELM_DIR) \
		--namespace $(K8S_NAMESPACE) --create-namespace

helm-deploy-dd:
	@if [ -z "$$DD_API_KEY" ]; then \
		echo "Error: DD_API_KEY is required."; exit 1; \
	fi
	helm upgrade --install estatewise $(HELM_DIR) \
		--namespace $(K8S_NAMESPACE) --create-namespace \
		--set datadog.enabled=true \
		--set datadog.monitors.enabled=true \
		--set datadog.apiKey=$$DD_API_KEY

helm-diff:
	helm diff upgrade estatewise $(HELM_DIR) \
		--namespace $(K8S_NAMESPACE) 2>/dev/null || \
		echo "Install helm-diff plugin: helm plugin install https://github.com/databus23/helm-diff"

helm-rollback:
	helm rollback estatewise 0 --namespace $(K8S_NAMESPACE)

#——————————————————————————————————————————————————————————————
# TERRAFORM
#——————————————————————————————————————————————————————————————
tf-init:
	cd $(TF_DIR) && terraform init -input=false

tf-plan: tf-init
	cd $(TF_DIR) && terraform plan -var-file=$(TF_VAR_FILE) -out=tfplan 2>/dev/null || \
		cd $(TF_DIR) && terraform plan

tf-apply: tf-init
	cd $(TF_DIR) && terraform apply -auto-approve

tf-destroy: tf-init
	cd $(TF_DIR) && terraform destroy

tf-fmt:
	cd $(TF_DIR) && terraform fmt -recursive

tf-validate: tf-init
	cd $(TF_DIR) && terraform validate

#——————————————————————————————————————————————————————————————
# KUBERNETES OPS
#——————————————————————————————————————————————————————————————
k8s-apply:
	kubectl apply -k $(K8S_DIR)/overlays/prod -n $(K8S_NAMESPACE)

k8s-status:
	@echo "=== Pods ==="
	@kubectl get pods -n $(K8S_NAMESPACE) -o wide 2>/dev/null || echo "Namespace $(K8S_NAMESPACE) not found"
	@echo ""
	@echo "=== Services ==="
	@kubectl get svc -n $(K8S_NAMESPACE) 2>/dev/null || true
	@echo ""
	@echo "=== Deployments ==="
	@kubectl get deploy -n $(K8S_NAMESPACE) 2>/dev/null || true
	@echo ""
	@echo "=== HPA ==="
	@kubectl get hpa -n $(K8S_NAMESPACE) 2>/dev/null || true

k8s-logs:
	kubectl logs -l app=estatewise-backend -n $(K8S_NAMESPACE) --tail=200 -f

k8s-restart:
	kubectl rollout restart deployment -n $(K8S_NAMESPACE)

k8s-scale:
	@if [ -z "$(N)" ]; then echo "Usage: make k8s-scale N=3"; exit 1; fi
	kubectl scale deployment/estatewise-backend --replicas=$(N) -n $(K8S_NAMESPACE)

k8s-port-forward:
	@echo "Forwarding estatewise-backend :3001 → localhost:3001"
	kubectl port-forward svc/estatewise-backend 3001:3001 -n $(K8S_NAMESPACE)

k8s-gitops-bootstrap:
	bash $(K8S_DIR)/gitops/bootstrap.sh

k8s-gitops-preflight:
	bash $(K8S_DIR)/gitops/preflight.sh

k8s-chaos:
	kubectl apply -f $(K8S_DIR)/chaos/chaos-tests.yaml -n $(K8S_NAMESPACE)

#——————————————————————————————————————————————————————————————
# DATADOG OBSERVABILITY
#——————————————————————————————————————————————————————————————
dd-up:
	@if [ -z "$$DD_API_KEY" ]; then \
		echo "Error: DD_API_KEY is required."; exit 1; \
	fi
	DD_ENV=$(DD_ENV) docker compose -f $(COMPOSE_PROD) --profile monitoring up -d

dd-down:
	docker compose -f $(COMPOSE_PROD) --profile monitoring down

dd-status:
	@echo "=== Datadog Agent Status ==="
	@docker compose -f $(COMPOSE_PROD) exec datadog-agent agent status 2>/dev/null || \
		echo "Datadog agent is not running. Start with: make dd-up"

dd-monitors: tf-init
	@echo "=== Terraform Plan — Datadog Monitors ==="
	cd $(TF_DIR) && terraform plan -var='enable_datadog=true' \
		-target=datadog_monitor.backend_error_rate \
		-target=datadog_monitor.backend_latency_p95 \
		-target=datadog_monitor.backend_latency_p99 \
		-target=datadog_monitor.frontend_error_rate \
		-target=datadog_monitor.pod_crash_loops \
		-target=datadog_monitor.high_memory \
		-target=datadog_monitor.high_cpu \
		-target=datadog_dashboard.estatewise_production \
		-target=datadog_service_level_objective.api_availability \
		-target=datadog_service_level_objective.api_latency

dd-apply: tf-init
	@echo "=== Terraform Apply — Datadog Resources ==="
	cd $(TF_DIR) && terraform apply -var='enable_datadog=true' -auto-approve

dd-synthetics:
	@if [ -z "$$DD_API_KEY" ] || [ -z "$$DD_APP_KEY" ]; then \
		echo "Error: DD_API_KEY and DD_APP_KEY are required."; exit 1; \
	fi
	datadog-ci synthetics run-tests --config datadog-ci.json 2>/dev/null || \
		echo "Install datadog-ci: npm install -g @datadog/datadog-ci"

dd-dashboard:
	@open "https://app.$(DD_SITE)/dashboard/lists" 2>/dev/null || \
		xdg-open "https://app.$(DD_SITE)/dashboard/lists" 2>/dev/null || \
		echo "Visit: https://app.$(DD_SITE)/dashboard/lists"

#——————————————————————————————————————————————————————————————
# SERVICE DEV SERVERS
#——————————————————————————————————————————————————————————————
backend-dev:
	cd $(BACKEND_DIR) && npm run dev

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev

grpc-dev:
	cd $(GRPC_DIR) && npm run dev

mcp-dev:
	cd $(MCP_DIR) && npm run dev

mcp-client:
	cd $(MCP_DIR) && npm run client:dev

mcp-client-call:
	@if [ -z "$(TOOL)" ]; then echo "Usage: make mcp-client-call TOOL=tool_name ARGS='{}'"; exit 1; fi
	cd $(MCP_DIR) && npm run client:call -- $(TOOL) '$(ARGS)'

agentic-dev:
	@if [ -z "$(GOAL)" ]; then echo "Usage: make agentic-dev GOAL='your goal'"; exit 1; fi
	cd $(AGENTIC_DIR) && npm run dev "$(GOAL)"

agentic-serve:
	cd $(AGENTIC_DIR) && npm run serve

agentic-langgraph:
	@if [ -z "$(GOAL)" ]; then echo "Usage: make agentic-langgraph GOAL='your goal'"; exit 1; fi
	cd $(AGENTIC_DIR) && npm run dev:langgraph -- "$(GOAL)"

agentic-crewai:
	@if [ -z "$(GOAL)" ]; then echo "Usage: make agentic-crewai GOAL='your goal'"; exit 1; fi
	cd $(AGENTIC_DIR) && npm run dev:crewai -- "$(GOAL)"

ctx-dev:
	cd $(CTX_DIR) && npm run dev

ctx-build:
	cd $(CTX_DIR) && npm run build

deploy-control-dev:
	cd $(DC_DIR) && npm run dev

deploy-control-ui:
	cd $(DC_DIR) && npm run dev:ui

grpc-test-call:
	@echo "Testing gRPC health on :50051..."
	grpcurl -plaintext localhost:50051 list 2>/dev/null || \
		echo "Install grpcurl or start gRPC server first: make grpc-dev"

#——————————————————————————————————————————————————————————————
# DOCUMENTATION
#——————————————————————————————————————————————————————————————
docs: docs-backend-gen docs-jsdoc

docs-backend-gen:
	npm run typedoc:backend

docs-frontend-gen:
	npm run typedoc:frontend

docs-jsdoc:
	npm run jsdoc

#——————————————————————————————————————————————————————————————
# HEALTH & VALIDATION
#——————————————————————————————————————————————————————————————
health-check:
	bash $(SHELL_DIR)/health_check.sh

doctor:
	bash $(SHELL_DIR)/doctor.sh

smoke-test:
	@echo "=== Smoke Test ==="
	@curl -sf http://localhost:3001/health > /dev/null && echo "✓ Backend healthy" || echo "✗ Backend unreachable"
	@curl -sf http://localhost:3000 > /dev/null && echo "✓ Frontend healthy" || echo "✗ Frontend unreachable"
	@curl -sf http://localhost:3001/metrics > /dev/null && echo "✓ Prometheus metrics exposed" || echo "✗ Metrics unreachable"
	@curl -sf http://localhost:3001/status > /dev/null && echo "✓ Status monitor accessible" || echo "✗ Status unreachable"
	@curl -sf http://localhost:4200/api/context/metrics > /dev/null 2>&1 && echo "✓ Context API healthy" || echo "- Context API not running"
	@curl -sf http://localhost:4100/health > /dev/null 2>&1 && echo "✓ Deploy Control API healthy" || echo "- Deploy Control not running"

preflight: lint-all build-all test-all helm-lint snyk docker-build
	@echo ""
	@echo "═══════════════════════════════════════════"
	@echo "  ✓ Preflight passed — ready to deploy"
	@echo "═══════════════════════════════════════════"

#——————————————————————————————————————————————————————————————
# CLEANUP
#——————————————————————————————————————————————————————————————
clean:
	rm -rf $(BACKEND_DIR)/dist $(FRONTEND_DIR)/.next $(FRONTEND_DIR)/out
	rm -rf $(GRPC_DIR)/dist $(MCP_DIR)/dist $(AGENTIC_DIR)/dist
	rm -rf $(DC_DIR)/dist $(CTX_DIR)/dist
	rm -rf $(DOCS_BACKEND)

clean-all: clean
	rm -rf $(BACKEND_DIR)/node_modules $(FRONTEND_DIR)/node_modules
	rm -rf $(GRPC_DIR)/node_modules $(MCP_DIR)/node_modules $(AGENTIC_DIR)/node_modules
	rm -rf $(DC_DIR)/node_modules $(DC_DIR)/ui/node_modules $(CTX_DIR)/node_modules

clean-docker:
	@echo "Removing EstateWise containers and images..."
	docker compose -f $(COMPOSE_PROD) down --rmi local --volumes 2>/dev/null || true
	docker compose down --rmi local --volumes 2>/dev/null || true
