#!/usr/bin/env bash

# Migrate all tables (schema + data by default) from a source Postgres to Railway Postgres.
# Uses connection URLs for both ends. Requires pg_dump and pg_restore.
#
# Usage:
#   export SRC_DATABASE_URL="postgresql://user:pass@localhost:5432/mydb"
#   export DST_DATABASE_URL="postgresql://user:pass@gondola.proxy.rlwy.net:53308/railway?sslmode=require"
#   # Optional: SCHEMA_ONLY=true for only schema
#   # Optional: DROP_DESTINATION=true to drop objects before restore (dangerous)
#   bash scripts/pg-migrate-to-railway.sh
#
# Notes:
# - If connecting to Railway via public proxy, keep ?sslmode=require in DST_DATABASE_URL.
# - This script is idempotent for schema-only runs when using pg_dump --schema-only.

set -euo pipefail

command -v pg_dump >/dev/null 2>&1 || { echo "pg_dump is required but not installed." >&2; exit 1; }
command -v pg_restore >/dev/null 2>&1 || { echo "pg_restore is required but not installed." >&2; exit 1; }

SRC_DATABASE_URL=${SRC_DATABASE_URL:-}
DST_DATABASE_URL=${DST_DATABASE_URL:-${RAILWAY_DATABASE_URL:-}}
SCHEMA_ONLY=${SCHEMA_ONLY:-false}
DROP_DESTINATION=${DROP_DESTINATION:-false}

if [[ -z "$SRC_DATABASE_URL" ]]; then
  echo "SRC_DATABASE_URL is not set." >&2
  exit 1
fi
if [[ -z "$DST_DATABASE_URL" ]]; then
  echo "DST_DATABASE_URL (or RAILWAY_DATABASE_URL) is not set." >&2
  exit 1
fi

TMP_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t pgmigrate)
DUMP_FILE="$TMP_DIR/src.dump"

echo "Source:      $SRC_DATABASE_URL"
echo "Destination: ${DST_DATABASE_URL}"
echo "Schema only: $SCHEMA_ONLY"
echo "Drop dest:   $DROP_DESTINATION"
echo "Working dir: $TMP_DIR"

cleanup() {
  rm -rf "$TMP_DIR" || true
}
trap cleanup EXIT INT TERM

echo "==> Dumping from source..."
if [[ "$SCHEMA_ONLY" == "true" ]]; then
  pg_dump --no-owner --no-privileges --format=custom --schema-only \
    --file="$DUMP_FILE" "$SRC_DATABASE_URL"
else
  pg_dump --no-owner --no-privileges --format=custom \
    --file="$DUMP_FILE" "$SRC_DATABASE_URL"
fi

echo "==> Restoring to destination..."
RESTORE_FLAGS=(--no-owner --no-privileges)
if [[ "$DROP_DESTINATION" == "true" ]]; then
  RESTORE_FLAGS+=(--clean --if-exists)
fi

pg_restore "${RESTORE_FLAGS[@]}" --dbname="$DST_DATABASE_URL" "$DUMP_FILE"

echo "✅ Migration completed successfully."
