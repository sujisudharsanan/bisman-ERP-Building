SHELL := /bin/bash
.PHONY: setup build package lint clean

VENV := .venv_docs
PY := $(VENV)/bin/python
PIP := $(VENV)/bin/pip

setup:
	@echo "🛠️  Setting up docs virtualenv and installing dependencies..."
	python3 -m venv $(VENV)
	$(PIP) install --upgrade pip
	$(PIP) install -r system-docs/requirements.txt
	@echo "✅ Setup complete. Activate with: source $(VENV)/bin/activate"

build:
	@echo "🔧 Building living documentation (fill dates, extract code/schema, build site)..."
	$(PY) system-docs/scripts/generate_docs.py --fill-dates --gen-code --gen-schema --build
	@echo "✅ Build complete. Site available at: system-docs-site/"

package:
	@echo "📦 Packaging documentation (zip)..."
	# Use git tag or commit SHA if available
	VER=$$(git describe --tags --always 2>/dev/null || echo dev)
	$(PY) system-docs/scripts/package_docs.py --version $$VER
	@echo "✅ Package step finished. Artifacts in system-docs/artifacts/"

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
	@echo "📄 Generating PDF from built site..."
	$(PY) system-docs/scripts/generate_pdf.py
	@echo "✅ PDF generation complete. Output: system-docs/artifacts/latest.pdf"

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
