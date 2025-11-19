#!/usr/bin/env bash
# Example nightly backup script (idempotent) - Place secrets in environment (DATABASE_URL, BACKUP_DIR)
# Usage (cron): 0 2 * * * bash backup-nightly-example.sh
set -euo pipefail
DATE=$(date +%Y%m%d-%H%M%S)
: "${BACKUP_DIR:=./backups/nightly}"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/bisman-db-$DATE.dump"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set; aborting." >&2
  exit 1
fi

pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$FILE"
sha256sum "$FILE" > "$FILE.sha256"
# Retain last 14 backups; delete older
ls -1t "$BACKUP_DIR"/*.dump | tail -n +15 | xargs -I{} rm -f "{}" || true

echo "Backup complete: $FILE"
