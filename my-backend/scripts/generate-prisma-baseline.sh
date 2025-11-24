#!/usr/bin/env bash
set -euo pipefail
# Generates a baseline migration plan when legacy DB already has tables.
# Usage: ./scripts/generate-prisma-baseline.sh
# Requires: prisma CLI, pg_dump, diff

if ! command -v prisma >/dev/null 2>&1; then
  echo "prisma CLI not found; install dev dependencies first" >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL not set" >&2
  exit 1
fi

TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="baseline-migration-${TS}"
mkdir -p "$OUT_DIR"

echo "[baseline] Exporting current schema via introspection"
prisma db pull >/dev/null
cp prisma/schema.prisma "$OUT_DIR/schema.introspected.prisma"

cat > "$OUT_DIR/README.txt" <<'EOT'
Baseline Migration Instructions
--------------------------------
1. Ensure the Prisma schema (schema.prisma) reflects desired final models.
2. Run `prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > baseline.sql`
3. Review baseline.sql for destructive changes; remove drops unless intentional.
4. Apply baseline.sql manually: `psql $DATABASE_URL -f baseline.sql`
5. Mark migration applied: create a migration folder `prisma/migrations/0000_baseline` with empty migration.sql or note.
6. Future changes: use `prisma migrate dev` normally.
EOT

echo "[baseline] Generating SQL diff (empty -> target)"
prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "$OUT_DIR/baseline.sql"

echo "[baseline] Done. See $OUT_DIR/ for artifacts."
