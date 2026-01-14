###############################################################################
# Makefile for shell/ directory
#
# Description:
#   Provides convenient Make targets to invoke the various shell scripts
#   in this directory for building images, deploying, setting up services,
#   and running backend & frontend locally.
#
# Usage:
#   cd shell
#   make <target>
#
###############################################################################

.DEFAULT_GOAL := help

.PHONY: help doctor bootstrap \
        build-images push-images docker-build-backend docker-build-frontend \
        docker-push-backend docker-push-frontend deploy \
        setup-backend setup-frontend run-local \
        build-backend build-frontend build-all \
        test-backend test-frontend test-all \
        lint-frontend lint-all \
        format-backend format-frontend format-all \
        tf-plan tf-apply tf-destroy health-check

help:
	@echo ""
	@echo "Usage: make <target>"
	@echo ""
	@echo "  doctor             Validate local toolchain"
	@echo "  bootstrap          Install backend + frontend dependencies"
	@echo ""
	@echo "  build-images       Build backend + frontend Docker images"
	@echo "  push-images        Push backend + frontend Docker images"
	@echo "  docker-build-backend  Build backend Docker image"
	@echo "  docker-build-frontend Build frontend Docker image"
	@echo "  docker-push-backend   Push backend Docker image"
	@echo "  docker-push-frontend  Push frontend Docker image"
	@echo "  deploy             Deploy via legacy deploy.sh"
	@echo ""
	@echo "  setup-backend      Install/build/start backend in dev mode"
	@echo "  setup-frontend     Install/build/start frontend in dev mode"
	@echo "  run-local          Run backend + frontend concurrently"
	@echo ""
	@echo "  build-backend      Build backend"
	@echo "  build-frontend     Build frontend"
	@echo "  build-all          Build backend + frontend"
	@echo ""
	@echo "  test-backend       Run backend tests"
	@echo "  test-frontend      Run frontend tests"
	@echo "  test-all           Run backend + frontend tests"
	@echo ""
	@echo "  lint-frontend      Lint frontend"
	@echo "  lint-all           Lint frontend"
	@echo ""
	@echo "  format-backend     Format backend"
	@echo "  format-frontend    Format frontend"
	@echo "  format-all         Format backend + frontend"
	@echo ""
	@echo "  tf-plan            Terraform plan"
	@echo "  tf-apply           Terraform apply"
	@echo "  tf-destroy         Terraform destroy"
	@echo ""
	@echo "  health-check       Run health check (HEALTHCHECK_URL required)"
	@echo ""

doctor:
	@bash doctor.sh

bootstrap:
	@bash bootstrap.sh

build-images:
	@bash build_images.sh

push-images:
	@bash push_images.sh

docker-build-backend:
	@bash docker_build_backend.sh

docker-build-frontend:
	@bash docker_build_frontend.sh

docker-push-backend:
	@bash docker_push_backend.sh

docker-push-frontend:
	@bash docker_push_frontend.sh

deploy:
	@bash deploy.sh

setup-backend:
	@bash setup_backend.sh

setup-frontend:
	@bash setup_frontend.sh

run-local:
	@bash run_local.sh

build-backend:
	@bash build_backend.sh

build-frontend:
	@bash build_frontend.sh

build-all:
	@bash build_all.sh

test-backend:
	@bash test_backend.sh

test-frontend:
	@bash test_frontend.sh

test-all:
	@bash test_all.sh

lint-frontend:
	@bash lint_frontend.sh

lint-all:
	@bash lint_all.sh

format-backend:
	@bash format_backend.sh

format-frontend:
	@bash format_frontend.sh

format-all:
	@bash format_all.sh

tf-plan:
	@bash terraform_plan.sh

tf-apply:
	@bash terraform_apply.sh

tf-destroy:
	@bash terraform_destroy.sh

health-check:
	@bash health_check.sh
