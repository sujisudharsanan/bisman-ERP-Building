#!/bin/bash
# Quick migration runner for subscription access control tables
# Usage: ./run-migration-030.sh
# Set DATABASE_URL environment variable before running

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL environment variable is not set"
  echo ""
  echo "Please set it with your Railway PostgreSQL URL:"
  echo "  export DATABASE_URL='postgresql://user:pass@host:port/dbname'"
  echo ""
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MIGRATION_FILE="$SCRIPT_DIR/migrations/030_subscription_access_control_tables.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

echo "🚀 Running migration: 030_subscription_access_control_tables.sql"
echo "   Database: $DATABASE_URL"
echo ""

# Run the migration
psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "Tables created:"
  echo "  - plan_module_access"
  echo "  - plan_module_access_draft"
  echo "  - plan_feature_controls_draft"
  echo "  - tenant_module_overrides"
  echo "  - subscription_publish_history"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi
