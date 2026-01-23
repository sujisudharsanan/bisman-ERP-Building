#!/bin/bash
# ============================================================================
# Railway Migration Script
# Run this after logging into Railway CLI with: railway login
# ============================================================================

set -e

echo "🚀 Running migrations on Railway database..."

cd "$(dirname "$0")/.."

# Check if logged in
if ! railway whoami 2>/dev/null; then
    echo "❌ Not logged into Railway. Run: railway login"
    exit 1
fi

# Link to project if needed
echo "📦 Linking to Railway project..."
railway link

# Get the database URL
echo "🔗 Getting DATABASE_URL from Railway..."

# Run migrations using Railway's environment
echo ""
echo "📋 Running 030_subscription_access_control_tables.sql..."
railway run psql \$DATABASE_URL -f database/migrations/030_subscription_access_control_tables.sql

echo ""
echo "📋 Running 20250119_rbac_default_deny.sql..."
railway run psql \$DATABASE_URL -f database/migrations/20250119_rbac_default_deny.sql

echo ""
echo "📋 Running 20250119_permanent_page_governance.sql..."
railway run psql \$DATABASE_URL -f database/migrations/20250119_permanent_page_governance.sql

echo ""
echo "📋 Running 20260113_sync_business_level_system_scope.sql..."
railway run psql \$DATABASE_URL -f database/migrations/20260113_sync_business_level_system_scope.sql

echo ""
echo "📋 Running 20260114_modules_pages_master.sql..."
railway run psql \$DATABASE_URL -f database/migrations/20260114_modules_pages_master.sql

echo ""
echo "📋 Running delete-pages-2026-01-21.sql..."
railway run psql \$DATABASE_URL -f database/migrations/delete-pages-2026-01-21.sql

echo ""
echo "📋 Running hide-duplicate-sidebar-2026-01-21.sql..."
railway run psql \$DATABASE_URL -f database/migrations/hide-duplicate-sidebar-2026-01-21.sql

echo ""
echo "✅ All migrations completed on Railway!"
echo ""
echo "📊 Verifying tables..."
railway run psql \$DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_name IN ('admin_page_assignments', 'admin_role_grants', 'effective_access_cache', 'subscription_access_audit_log') ORDER BY table_name;"
