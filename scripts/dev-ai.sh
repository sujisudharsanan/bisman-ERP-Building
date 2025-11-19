#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "[AI] Preparing local AI server (Ollama)…"

chmod +x ./ollama-setup.sh || true
./ollama-setup.sh || true

# Wait until the Ollama HTTP port is reachable
HOST=127.0.0.1
PORT=11434
RETRIES=30
SLEEP=1
printf "[AI] Waiting for ollama at http://$HOST:$PORT "
for i in $(seq 1 $RETRIES); do
  if nc -z $HOST $PORT 2>/dev/null; then
    echo "\n[AI] Ollama is up at http://$HOST:$PORT"
    break
  fi
  printf '.'
  sleep $SLEEP
done

if ! nc -z $HOST $PORT 2>/dev/null; then
  echo "\n[AI] Warning: ollama didn't open $PORT in time. It may still be starting."
fi

echo "[AI] Ready. Keeping this process alive so concurrent dev stays running (Ctrl+C to exit)."
tail -f /dev/null
