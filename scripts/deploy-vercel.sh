#!/usr/bin/env bash
# Simple helper to trigger a Vercel deployment via Deploy Hook
# Expects VERCEL_DEPLOY_HOOK_URL to be provided (e.g., from GitHub Actions Secret)

set -euo pipefail

echo "Triggering Vercel deploy..."

if [[ -z "${VERCEL_DEPLOY_HOOK_URL:-}" ]]; then
  echo "ERROR: VERCEL_DEPLOY_HOOK_URL is not set" >&2
  echo "Set it in your CI environment or export it locally before running this script." >&2
  exit 1
fi

# Call the Vercel Deploy Hook (returns 200/ok on success)
curl -fsSL -X POST "$VERCEL_DEPLOY_HOOK_URL" \
  -H 'Content-Type: application/json' \
  -d '{"source":"github-actions"}' >/dev/null

echo "Vercel deploy finished successfully."
