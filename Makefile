# HimVote Platform Orchestrator Makefile
# Professional development and operations automation

.DEFAULT_GOAL := help
SHELL := /bin/bash
PYTHON := python3

.PHONY: help setup verify_env generate_env verify_integrations test_tools test_all lint_all build_web dev_up dev_down dev_logs clean

help:
	@echo "============================================================"
	@echo "HimVote Developer Automation and Orchestration Targets"
	@echo "============================================================"
	@echo "  make help                 Show this documentation overview"
	@echo "  make setup                Install local development tools"
	@echo "  make verify_env           Validate environment variables"
	@echo "  make generate_env         Create local development .env file"
	@echo "  make verify_integrations  Verify all ports and integrations"
	@echo "  make test_tools           Run developer tool unit tests"
	@echo "  make test_all             Run complete automated test suite"
	@echo "  make dev_up               Start container services"
	@echo "  make dev_down             Stop container services"
	@echo "  make dev_logs             Follow container logs"
	@echo "  make clean                Clean cache and temporary files"
	@echo "============================================================"

setup:
	@echo "Setting up local developer tools..."
	$(PYTHON) tools/env_loader.py check

verify_env:
	@echo "Verifying environment settings..."
	$(PYTHON) tools/env_loader.py check

generate_env:
	@echo "Generating local developer environment configuration..."
	$(PYTHON) tools/env_loader.py generate_dev

verify_integrations:
	@echo "Verifying cross service integrations and service ports..."
	$(PYTHON) tools/verify_integrations.py

test_tools:
	@echo "Executing unit tests for developer tooling..."
	$(PYTHON) -m unittest discover tests/unit

test_all:
	@echo "Executing entire test suite..."
	$(PYTHON) tests/run_tests.py

dev_up:
	@echo "Starting HimVote service stack..."
	docker compose up

dev_down:
	@echo "Stopping HimVote service stack..."
	docker compose down

dev_logs:
	@echo "Streaming service logs..."
	docker compose logs

clean:
	@echo "Cleaning temporary build artifacts..."
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
