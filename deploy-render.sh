#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${RENDER_DEPLOY_HOOK_URL:-}" ]]; then
  echo "ERROR: RENDER_DEPLOY_HOOK_URL is not set" >&2
  exit 1
fi

echo "Triggering Render deploy via deploy hook..."
curl -fsSL -X POST "$RENDER_DEPLOY_HOOK_URL" -H 'Content-Type: application/json' -d '{"source":"github-actions"}'
echo "\nRender deploy hook triggered successfully."
