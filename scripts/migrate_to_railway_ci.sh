#!/usr/bin/env bash
set -euo pipefail
# Wrapper for CI usage. Reads env vars and invokes migrate_to_railway.sh non-interactively.
# Required env vars: RAILWAY_HOST, RAILWAY_PORT, RAILWAY_DB, RAILWAY_USER, RAILWAY_PASSWORD
# Optional: MIGRATION_NO_DROP=1 to skip drop phase.

: "${RAILWAY_HOST:?RAILWAY_HOST required}" 
: "${RAILWAY_PORT:?RAILWAY_PORT required}" 
: "${RAILWAY_DB:?RAILWAY_DB required}" 
: "${RAILWAY_USER:?RAILWAY_USER required}" 
: "${RAILWAY_PASSWORD:?RAILWAY_PASSWORD required}" 

FLAGS=("--yes")
if [ "${MIGRATION_NO_DROP:-0}" = "1" ]; then
  FLAGS+=("--no-drop")
fi

./scripts/migrate_to_railway.sh "${FLAGS[@]}" "$RAILWAY_HOST" "$RAILWAY_PORT" "$RAILWAY_DB" "$RAILWAY_USER" "$RAILWAY_PASSWORD"
echo "Row diff artifacts (if generated):"; ls -1 /tmp/*row_diff_* 2>/dev/null || echo "No row diff json found."
