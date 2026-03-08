###############################################################################
# Makefile for the EstateWise Monorepo
#
# Description:
#   This Makefile orchestrates installation, building, development, testing,
#   data upsert, Docker workflows, and deployment for both the backend and
#   frontend parts of the EstateWise intelligent estate assistant.
#
# Setup Requirements:
#   1. Install Node.js (v16+) and npm.
#   2. (For Docker targets) Install Docker Engine and docker-compose.
#   3. Create a `.env` file in the backend directory containing:
#        MONGO_URI=<your_mongo_uri>
#        JWT_SECRET=<your_jwt_secret>
#        GOOGLE_AI_API_KEY=<your_google_ai_api_key>
#        PINECONE_API_KEY=<your_pinecone_api_key>
#        PINECONE_INDEX=estatewise-index
#   4. Ensure you have created the Pinecone index "estatewise-index" and that
#      your data files are ready for upsert.
#   5. Adjust BACKEND_DIR, FRONTEND_DIR, or SHELL_DIR variables below if your
#      folder structure differs.
#
# Usage:
#   make <target>
#
# Common targets:
#   install           Install dependencies for both backend & frontend
#   backend-install   Install only backend dependencies
#   frontend-install  Install only frontend dependencies
#
#   backend-setup     Install, build & launch backend in dev mode
#   frontend-setup    Install, build & launch frontend in dev mode
#   run-local, dev    Run backend & frontend concurrently (via shell/run_local.sh)
#
#   build             Build production artifacts for both services
#   build-backend     Build backend (npm run build)
#   build-frontend    Build frontend (npm run build)
#
#   upsert            Upsert property data into Pinecone index
#
#   test              Run unit & integration tests (Jest, React Testing Library)
#   lint              Run ESLint on backend & frontend
#   format            Run Prettier/formatter on backend & frontend
#
#   docker-up         Start all services via Docker Compose
#   docker-down       Stop Docker Compose services
#   deploy            Build & launch via shell/deploy.sh
#
#   build-images      Build all Docker images (backend, crawler, newsletters)
#   push-images       Push all Docker images to registry
#
#   backend-dev       Start backend in dev mode (npm run dev)
#   frontend-dev      Start frontend in dev mode (npm run dev)
#
# Example Workflows:
#   # Install everything
#   make install
#
#   # Spin up local dev environment
#   make dev
#
#   # Build production bundles
#   make build
#
#   # Upsert data into Pinecone
#   make upsert
#
#   # Bring services up with Docker
#   make docker-up
#
#   # Run tests, lint & format
#   make test
#   make lint
#   make format
#
###############################################################################

# Default goal
.DEFAULT_GOAL := help

# Directories
BACKEND_DIR   := backend
FRONTEND_DIR  := frontend
SHELL_DIR     := shell

#——————————————————————————————————————————————————————————————
# PHONY TARGETS
.PHONY: help install backend-install frontend-install \
        backend-setup frontend-setup run-local dev \
        build build-backend build-frontend upsert \
        test lint format \
        docker-up docker-down deploy \
        build-images push-images \
        backend-dev frontend-dev

#——————————————————————————————————————————————————————————————
help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  install             Install dependencies (backend & frontend)"
	@echo "  backend-install     Install backend dependencies"
	@echo "  frontend-install    Install frontend dependencies"
	@echo ""
	@echo "  backend-setup       Install, build & start backend in dev mode"
	@echo "  frontend-setup      Install, build & start frontend in dev mode"
	@echo "  run-local           Run both backend & frontend concurrently"
	@echo "  dev                 Alias for run-local"
	@echo ""
	@echo "  build               Build both backend & frontend for production"
	@echo "  build-backend       Build backend"
	@echo "  build-frontend      Build frontend"
	@echo ""
	@echo "  upsert              Upsert property data into Pinecone"
	@echo ""
	@echo "  test                Run backend & frontend unit tests"
	@echo ""
	@echo "  lint                Run ESLint on backend & frontend"
	@echo "  format              Run Prettier/formatter on backend & frontend"
	@echo ""
	@echo "  docker-up           Start services via Docker Compose"
	@echo "  docker-down         Stop services"
	@echo "  deploy              Build & launch services via your deploy.sh"
	@echo ""
	@echo "  build-images        Build all Docker images"
	@echo "  push-images         Push all Docker images to registry"
	@echo ""
	@echo "  backend-dev         Start backend in dev mode"
	@echo "  frontend-dev        Start frontend in dev mode"
	@echo ""

#——————————————————————————————————————————————————————————————
# INSTALL
install: backend-install frontend-install

backend-install:
	cd $(BACKEND_DIR) && npm install

frontend-install:
	cd $(FRONTEND_DIR) && npm install

#——————————————————————————————————————————————————————————————
# SETUP (uses your existing shell scripts)
backend-setup:
	bash $(SHELL_DIR)/setup_backend.sh

frontend-setup:
	bash $(SHELL_DIR)/setup_frontend.sh

run-local:
	bash $(SHELL_DIR)/run_local.sh

dev: run-local

#——————————————————————————————————————————————————————————————
# BUILD
build: build-backend build-frontend

build-backend:
	cd $(BACKEND_DIR) && npm run build

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

#——————————————————————————————————————————————————————————————
# DATA UPLOAD
upsert:
	cd $(BACKEND_DIR) && npm run upsert

#——————————————————————————————————————————————————————————————
# TESTS, LINT & FORMAT
test:
	cd $(BACKEND_DIR) && npm run test
	cd $(FRONTEND_DIR) && npm run test

lint:
	cd $(BACKEND_DIR) && npm run lint
	cd $(FRONTEND_DIR) && npm run lint

format:
	cd $(BACKEND_DIR) && npm run format
	cd $(FRONTEND_DIR) && npm run format

#——————————————————————————————————————————————————————————————
# DOCKER & DEPLOY
docker-up:
	docker-compose up -d --build

docker-down:
	docker-compose down

deploy:
	bash $(SHELL_DIR)/deploy.sh

#——————————————————————————————————————————————————————————————
# DOCKER IMAGE WORKFLOWS
build-images:
	bash $(SHELL_DIR)/build_images.sh

push-images:
	bash $(SHELL_DIR)/push_images.sh

#——————————————————————————————————————————————————————————————
# DIRECT DEV (if you prefer calling npm scripts yourself)
backend-dev:
	cd $(BACKEND_DIR) && npm run dev

frontend-dev:
	cd $(FRONTEND_DIR) && npm run dev
