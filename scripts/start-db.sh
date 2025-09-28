#!/usr/bin/env bash
set -euo pipefail

# scripts/start-db.sh
# Starts docker compose services and ensures the erp_admin role and erp_main DB exist.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# CLI flags
DRY_RUN=0
VERBOSE=0
while [ "$#" -gt 0 ]; do
  case "$1" in
    --dry-run|-n)
      DRY_RUN=1; shift ;;
    --verbose|-v)
      VERBOSE=1; shift ;;
    --help|-h)
      echo "Usage: $0 [--dry-run|-n] [--verbose|-v]"; exit 0 ;;
    *)
      echo "Unknown argument: $1"; echo "Usage: $0 [--dry-run|-n] [--verbose|-v]"; exit 2 ;;
  esac
done

# helper to run or print commands depending on DRY_RUN/VERBOSE
run_cmd() {
  cmd="$1"
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "DRY RUN: $cmd"
    return 0
  fi
  if [ "$VERBOSE" -eq 1 ]; then
    echo "+ $cmd"
  fi
  eval "$cmd"
}

## Allow a fallback to using the system `psql` client when Docker is not available.
## Set USE_PSQL=yes to run the psql path non-interactively (useful in CI or headless machines).
if ! command -v docker >/dev/null 2>&1; then
  echo "WARNING: docker not found. You can either install Docker Desktop or let this script run psql directly to create the role/database."

  # Defaults for psql fallback (can be overridden in environment)
  PGHOST=${PGHOST:-localhost}
  PGPORT=${PGPORT:-5432}
  PG_SUPERUSER=${PG_SUPERUSER:-postgres}
  ERP_ADMIN_PASSWORD=${ERP_ADMIN_PASSWORD:-Suji@123}

  if [ "${USE_PSQL:-}" = "yes" ] || [ "${USE_PSQL:-}" = "1" ]; then
    echo "USE_PSQL=yes detected — running psql fallback non-interactively using host=${PGHOST} port=${PGPORT} superuser=${PG_SUPERUSER}"
    PSQL_FALLBACK=1
  else
    # If psql is available, prompt interactively; otherwise abort.
    if command -v psql >/dev/null 2>&1; then
      # If this is a non-interactive shell, do not prompt — ask the user to re-run with USE_PSQL=yes
      if [ -t 0 ]; then
        read -r -p "Run psql fallback to create role/db on ${PGHOST}:${PGPORT} as superuser '${PG_SUPERUSER}'? [y/N] " reply || true
        case "$reply" in
          [Yy]*) PSQL_FALLBACK=1 ;;
          *) echo "Aborting: docker not found and psql fallback not confirmed. Install Docker or re-run with USE_PSQL=yes"; exit 1 ;;
        esac
      else
        echo "Non-interactive shell and USE_PSQL not set — aborting. To run psql fallback non-interactively set USE_PSQL=yes and ensure PGPASSWORD is exported if needed.";
        exit 1
      fi
    else
      echo "ERROR: docker not found and psql client not available. Please install Docker Desktop or install psql."
      exit 1
    fi
  fi

  if [ "${PSQL_FALLBACK:-0}" = "1" ]; then
    echo "Running psql fallback commands..."
    # Use PGPASSWORD env if provided by the caller for non-interactive superuser auth.
    # Idempotently create role and database.
  psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='erp_admin') THEN CREATE ROLE erp_admin WITH LOGIN PASSWORD '${ERP_ADMIN_PASSWORD}'; END IF; END $$;"

    psql -h "$PGHOST" -p "$PGPORT" -U "$PG_SUPERUSER" -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname='erp_main') THEN CREATE DATABASE erp_main OWNER erp_admin; END IF; END $$;"

    echo "psql fallback finished. Verify with: psql -h $PGHOST -p $PGPORT -U $PG_SUPERUSER -c '\\du' and -c '\\l'"
    exit 0
  fi
fi

# Ensure ERP_ADMIN_PASSWORD is set for docker path as well
ERP_ADMIN_PASSWORD=${ERP_ADMIN_PASSWORD:-Suji@123}
echo "Starting docker compose..."
run_cmd "docker compose up -d"

echo "Waiting for Postgres container to be healthy (up to 60s) ..."
TRIES=30
SLEEP=2
for i in $(seq 1 $TRIES); do
  # Use docker compose exec -T pg_isready (no tty); if exec fails because container not up, ignore
  if run_cmd "docker compose exec -T postgres pg_isready -U erp_admin >/dev/null 2>&1"; then
    echo "Postgres is ready"
    break
  fi
  if [ $i -eq $TRIES ]; then
    echo "Timed out waiting for Postgres to become ready"
    run_cmd "docker compose logs postgres --no-color | tail -n 50"
    exit 2
  fi
  sleep $SLEEP
done

echo "Ensuring role 'erp_admin' exists (password: ${ERP_ADMIN_PASSWORD})"
run_cmd "docker compose exec postgres psql -U postgres -c \"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='erp_admin') THEN CREATE ROLE erp_admin WITH LOGIN PASSWORD '${ERP_ADMIN_PASSWORD}'; END IF; END $$;\""

echo "Ensuring database 'erp_main' exists and is owned by erp_admin"
run_cmd "docker compose exec postgres psql -U postgres -c \"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_database WHERE datname='erp_main') THEN CREATE DATABASE erp_main OWNER erp_admin; END IF; END $$;\""

echo "Done. Verify with: run_cmd \"docker compose exec postgres psql -U postgres -c '\\\\du'\" and run_cmd \"docker compose exec postgres psql -U postgres -c '\\\\l'\""
