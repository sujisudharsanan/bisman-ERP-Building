#!/usr/bin/env sh
set -e

# Start ollama in background bound to provided PORT (Railway sets $PORT)
export OLLAMA_HOST="0.0.0.0:${PORT:-11434}"
echo "Starting Ollama on ${OLLAMA_HOST}"
ollama serve &

# Optionally pre-pull models (comma-separated in OLLAMA_MODELS)
if [ -n "${OLLAMA_MODELS}" ]; then
  IFS=','
  set -- $OLLAMA_MODELS
  for m in "$@"; do
    echo "Pulling model: $m"
    ollama pull "$m" || true
  done
fi

wait -n
