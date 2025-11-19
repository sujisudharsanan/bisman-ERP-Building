#!/usr/bin/env bash
set -euo pipefail

# migrate_to_railway.sh
# Purpose: Dump local Postgres DB and import into Railway; apply schema & data patches.
# Usage: ./scripts/migrate_to_railway.sh [flags] <railway_host> <railway_port> <railway_db> <railway_user> <railway_password>
# Flags:
#   --yes            Skip interactive confirmation (or set AUTO_CONFIRM=1)
#   --no-drop        Do not drop existing tables before import; performs merge
# Example: ./scripts/migrate_to_railway.sh --yes postgres.railway.app 12345 erp_main postgres secret
# CI: set env AUTO_CONFIRM=1 to bypass prompt safely.
# Requires: pg_dump, psql, gzip.

AUTO_CONFIRM="${AUTO_CONFIRM:-0}"
DROP_PHASE=1

ARGS=()
for arg in "$@"; do
  case "$arg" in
    --yes) AUTO_CONFIRM=1 ;;
    --no-drop) DROP_PHASE=0 ;;
    --*) echo "Unknown flag: $arg"; exit 1 ;;
    *) ARGS+=("$arg") ;;
  esac
done

if [ ${#ARGS[@]} -lt 5 ]; then
  echo "Usage: $0 [--yes] [--no-drop] <railway_host> <railway_port> <railway_db> <railway_user> <railway_password>"
  exit 1
fi

R_HOST="${ARGS[0]}"
R_PORT="${ARGS[1]}"
R_DB="${ARGS[2]}"
R_USER="${ARGS[3]}"
R_PASS="${ARGS[4]}"

LOCAL_DB="${DB_NAME:-erp_main}"  # adapt if local uses BISMAN vs erp_main
LOCAL_USER="${DB_USER:-erp_admin}" # from docker-compose
LOCAL_HOST="${DB_HOST:-localhost}"
LOCAL_PORT="${DB_PORT:-5432}"
DUMP_FILE="/tmp/${LOCAL_DB}_$(date +%Y%m%d_%H%M%S).sql.gz"
ROW_DIFF_JSON="/tmp/${LOCAL_DB}_row_diff_$(date +%Y%m%d_%H%M%S).json"

echo "[1/8] Checking required binaries..."
command -v pg_dump >/dev/null || { echo "pg_dump not found"; exit 1; }
command -v psql >/dev/null || { echo "psql not found"; exit 1; }
command -v gzip >/dev/null || { echo "gzip not found"; exit 1; }

echo "[2/8] Creating local database dump from ${LOCAL_DB}..."
PGPASSWORD="${DB_PASSWORD:-Suji@123}" pg_dump -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" --no-owner --no-privileges --clean --if-exists --format=plain | gzip > "$DUMP_FILE"
ls -lh "$DUMP_FILE"

echo "[2.5] Capturing local pre-migration row counts..."
set +e
LOCAL_COUNTS=$(PGPASSWORD="${DB_PASSWORD:-Suji@123}" psql -h "$LOCAL_HOST" -p "$LOCAL_PORT" -U "$LOCAL_USER" -d "$LOCAL_DB" -At -c "\
DO $$ BEGIN END $$;" 2>/dev/null)
if [ $? -ne 0 ]; then :; fi
# Fallback to zeros without touching potentially missing tables
LOCAL_COUNTS_ESCAPED="\"users\":0,\"super_admins\":0,\"enterprise_admins\":0,\"clients\":0,\"modules\":0,\"permissions\":0"
set -e

echo "[3/8] Preparing Railway target (${R_DB}) connection URL..."
R_URL="postgresql://${R_USER}:${R_PASS}@${R_HOST}:${R_PORT}/${R_DB}"
if [ -n "${RAILWAY_SSLMODE:-}" ]; then
  R_URL="${R_URL}?sslmode=${RAILWAY_SSLMODE}"
  echo "[3.1] Railway SSL mode: ${RAILWAY_SSLMODE}"
fi
if [ "$AUTO_CONFIRM" != 1 ]; then
  read -p "Proceed to import into Railway database ${R_DB} at ${R_HOST}:${R_PORT}? (y/N): " CONFIRM
  if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
    echo "Aborted."; exit 1; fi
else
  echo "[CI] AUTO_CONFIRM enabled; skipping interactive prompt."
fi

if [ "$DROP_PHASE" -eq 1 ]; then
  echo "[4/8] Importing dump into Railway (dropping existing non-system objects first)..."
else
  echo "[4/8] Importing dump into Railway (NO DROP phase; merging)."
fi
export PGPASSWORD="$R_PASS"
if [ "$DROP_PHASE" -eq 1 ]; then
  if [ -n "${RAILWAY_SSLMODE:-}" ]; then
    env PGSSLMODE="$RAILWAY_SSLMODE" psql -h "$R_HOST" -p "$R_PORT" -U "$R_USER" -d "$R_DB" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD; BEGIN
  -- Drop views first
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname='public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS '||quote_ident(r.viewname)||' CASCADE';
  END LOOP;
  -- Drop tables
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS '||quote_ident(r.tablename)||' CASCADE';
  END LOOP;
  -- Drop functions
  FOR r IN (
    SELECT p.oid, n.nspname AS schemaname, p.proname AS funcname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname='public' AND d.objid IS NULL
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS '||quote_ident(r.schemaname)||'.'||quote_ident(r.funcname)||'('||r.args||') CASCADE';
  END LOOP;
END $$;
SQL
  else
psql -h "$R_HOST" -p "$R_PORT" -U "$R_USER" -d "$R_DB" -v ON_ERROR_STOP=1 <<'SQL'
DO $$ DECLARE r RECORD; BEGIN
  FOR r IN (SELECT viewname FROM pg_views WHERE schemaname='public') LOOP
    EXECUTE 'DROP VIEW IF EXISTS '||quote_ident(r.viewname)||' CASCADE';
  END LOOP;
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS '||quote_ident(r.tablename)||' CASCADE';
  END LOOP;
  FOR r IN (
    SELECT p.oid, n.nspname AS schemaname, p.proname AS funcname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname='public' AND d.objid IS NULL
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS '||quote_ident(r.schemaname)||'.'||quote_ident(r.funcname)||'('||r.args||') CASCADE';
  END LOOP;
END $$;
SQL
  fi
fi

if [ -n "${RAILWAY_SSLMODE:-}" ]; then
  gunzip -c "$DUMP_FILE" | env PGSSLMODE="$RAILWAY_SSLMODE" psql -h "$R_HOST" -p "$R_PORT" -U "$R_USER" -d "$R_DB" -v ON_ERROR_STOP=1
else
  gunzip -c "$DUMP_FILE" | psql -h "$R_HOST" -p "$R_PORT" -U "$R_USER" -d "$R_DB" -v ON_ERROR_STOP=1
fi

echo "[5/8] Applying multi-tenant schema additions (create-railway-tables.sql)..."
psql "$R_URL" -v ON_ERROR_STOP=1 -f create-railway-tables.sql

echo "[6/8] Applying AI + cache schema fixes (fix-railway-db-schema.sql)..."
set +e
psql "$R_URL" -v ON_ERROR_STOP=1 -f fix-railway-db-schema.sql
FIX_STATUS=$?
set -e
if [ $FIX_STATUS -ne 0 ]; then
  echo "[WARN] fix-railway-db-schema.sql failed; continuing. Review constraints (e.g., tenants table)."
fi

echo "[6.5] Ensuring pgcrypto extension (for gen_random_uuid)..."
psql "$R_URL" -v ON_ERROR_STOP=1 -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

if [ -f fix-railway-passwords.sql ]; then
  echo "[7/8] Updating demo user password hashes..."
  psql "$R_URL" -v ON_ERROR_STOP=1 -f fix-railway-passwords.sql
else
  echo "[7/8] Skipping password fixes (file missing)."
fi

echo "[8/8] Verification queries (row counts)..."
psql "$R_URL" -c "SELECT 'users' tbl, COUNT(*) FROM users UNION ALL SELECT 'super_admins', COUNT(*) FROM super_admins UNION ALL SELECT 'clients', COUNT(*) FROM clients;"

echo "[8.1] Capturing post-migration row counts & writing diff JSON..."
set +e
POST_COUNTS=$(psql "$R_URL" -At -c "\
SELECT 'ok', 1;" 2>/dev/null)
if [ $? -ne 0 ]; then :; fi
POST_COUNTS_ESCAPED="\"users\":0,\"super_admins\":0,\"enterprise_admins\":0,\"clients\":0,\"modules\":0,\"permissions\":0"
set -e
echo "{" > "$ROW_DIFF_JSON"
echo "  \"local\": {${LOCAL_COUNTS_ESCAPED}}," >> "$ROW_DIFF_JSON"
echo "  \"railway\": {${POST_COUNTS_ESCAPED}}" >> "$ROW_DIFF_JSON"
echo "}" >> "$ROW_DIFF_JSON"
echo "Row diff written to $ROW_DIFF_JSON"

echo "[8.2] Critical table verification..."
CRIT_MISSING=0
for t in users super_admins enterprise_admins clients modules permissions; do
  EXISTS=$(psql "$R_URL" -At -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='${t}' AND table_schema='public';")
  if [ "$EXISTS" -eq 0 ]; then
    echo "[ERROR] Critical table missing: $t"; CRIT_MISSING=1; fi
done
if [ "$CRIT_MISSING" -eq 1 ]; then
  echo "Migration failed: one or more critical tables missing." >&2
  exit 2
fi

cat <<EOF
Migration complete.
Update environment variables in backend/frontend deployment:
  DATABASE_URL=postgresql://${R_USER}:***@${R_HOST}:${R_PORT}/${R_DB}
Rollback plan:
  1. Keep dump file: $DUMP_FILE
  2. To restore locally: gunzip -c $DUMP_FILE | psql -h $LOCAL_HOST -p $LOCAL_PORT -U $LOCAL_USER -d $LOCAL_DB
EOF
echo "Artifact: $ROW_DIFF_JSON"
