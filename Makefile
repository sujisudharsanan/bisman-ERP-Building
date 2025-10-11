SHELL := /bin/bash
.PHONY: setup build package lint clean


setup:
	@echo "⚠️  Docs python toolchain removed — no setup performed."

build:
	@echo "⚠️  Docs build disabled: python toolchain removed."

package:
	@echo "⚠️  Docs packaging disabled: python toolchain removed."

lint:
	@echo "🔎 Linting Markdown files with markdownlint..."
	npx markdownlint "system-docs/**/*.md" --config .markdownlint.json || true
	@echo "✅ Lint complete (warnings shown above)."

clean:
	@echo "🧹 Cleaning generated docs and artifacts..."
	rm -rf system-docs-site
	rm -rf system-docs/artifacts/*.zip || true
	rm -f system-docs/artifacts/latest.pdf || true
	@echo "✅ Clean complete."


pdf:
	@echo "⚠️  Docs pdf generation disabled: python toolchain removed."

show-pdf:
	@echo "🔍 Opening PDF (macOS 'open' command is used)..."
	if [ -f system-docs/artifacts/latest.pdf ]; then open system-docs/artifacts/latest.pdf; else echo "PDF not found; run 'make pdf' first"; fi
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
