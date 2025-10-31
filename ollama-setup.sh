#!/usr/bin/env bash
set -euo pipefail

# Simple macOS Ollama setup
if ! command -v ollama >/dev/null 2>&1; then
  echo "Installing Ollama..."
  curl -fsSL https://ollama.com/install.sh | sh
fi

# Start service (if not running)
if ! pgrep -x "ollama" >/dev/null; then
  echo "Starting ollama service..."
  ollama serve >/dev/null 2>&1 &
  sleep 2
fi

# Pull a default model
MODEL=${OLLAMA_MODEL:-llama3:8b}
echo "Pulling model: $MODEL"
ollama pull "$MODEL" || true

echo "Done. Export OLLAMA_MODEL to choose a different model."
