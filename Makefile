SHELL := /bin/bash
.PHONY: up down logs rebuild

up:
	@echo "Starting services..."
	docker compose up -d

down:
	@echo "Stopping and removing services..."
	docker compose down

logs:
	@echo "Tailing logs for services (press Ctrl+C to stop)..."
	docker compose logs -f

rebuild:
	@echo "Rebuilding and starting services..."
	docker compose up -d --build
