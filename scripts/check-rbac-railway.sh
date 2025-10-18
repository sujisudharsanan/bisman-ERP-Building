#!/usr/bin/env bash
set -euo pipefail

# Verify RBAC tables on a PostgreSQL database using DATABASE_URL
# Usage:
#   export DATABASE_URL="postgresql://user:pass@host:port/railway?sslmode=require"
#   ./scripts/check-rbac-railway.sh

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL is not set" >&2
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 <<'SQL'
\timing
SELECT 'rbac_roles' AS table, to_regclass('public.rbac_roles') IS NOT NULL AS exists, (SELECT COUNT(*) FROM public.rbac_roles) AS count
WHERE to_regclass('public.rbac_roles') IS NOT NULL
UNION ALL
SELECT 'rbac_actions', to_regclass('public.rbac_actions') IS NOT NULL, (SELECT COUNT(*) FROM public.rbac_actions)
WHERE to_regclass('public.rbac_actions') IS NOT NULL
UNION ALL
SELECT 'rbac_routes', to_regclass('public.rbac_routes') IS NOT NULL, (SELECT COUNT(*) FROM public.rbac_routes)
WHERE to_regclass('public.rbac_routes') IS NOT NULL
UNION ALL
SELECT 'rbac_permissions', to_regclass('public.rbac_permissions') IS NOT NULL, (SELECT COUNT(*) FROM public.rbac_permissions)
WHERE to_regclass('public.rbac_permissions') IS NOT NULL
UNION ALL
SELECT 'rbac_user_roles', to_regclass('public.rbac_user_roles') IS NOT NULL, (SELECT COUNT(*) FROM public.rbac_user_roles)
WHERE to_regclass('public.rbac_user_roles') IS NOT NULL;
SQL

echo "\nIf no rows returned above, RBAC tables likely do not exist."
