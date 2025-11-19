#!/bin/bash

echo "🚀 Restoring Local Database to Railway PostgreSQL"
echo "=================================================="
echo ""

# Check if Railway CLI is available
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Please install it first."
    exit 1
fi

# Check if database dump exists
DUMP_FILE="database-backups/bisman_backup_20251114_012648.dump"
if [ ! -f "$DUMP_FILE" ]; then
    echo "❌ Database dump file not found: $DUMP_FILE"
    exit 1
fi

echo "📦 Found database dump: $DUMP_FILE"
echo "📊 File size: $(ls -lh "$DUMP_FILE" | awk '{print $5}')"
echo ""

# Get Railway database connection string
echo "🔗 Getting Railway database connection..."
DB_URL=$(railway variables --service bisman-erp-db | grep "DATABASE_URL" | cut -d'=' -f2- | tr -d ' ')

if [ -z "$DB_URL" ]; then
    echo "❌ Could not get DATABASE_URL from Railway"
    echo "💡 Try running: railway link"
    exit 1
fi

echo "✅ Database connection obtained"
echo ""

# Drop all existing tables (clean slate)
echo "🗑️  Dropping existing tables..."
railway connect bisman-erp-db <<EOF
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO PUBLIC;
\q
EOF

echo "✅ Database cleaned"
echo ""

# Restore the database using pg_restore
echo "📥 Restoring database from dump..."
echo "   This may take a few minutes..."
echo ""

# Use pg_restore with the database URL
PGPASSWORD="" pg_restore --verbose --clean --no-acl --no-owner \
    --dbname="$DB_URL" \
    "$DUMP_FILE" 2>&1 | grep -E "(restoring|creating|processing|error|ERROR)" | head -50

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database restored successfully!"
else
    echo ""
    echo "⚠️  Restore completed with warnings (this is normal for some PostgreSQL dumps)"
fi

echo ""
echo "🔍 Verifying restoration..."
railway connect bisman-erp-db <<EOF
-- Count tables
SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema='public';

-- Count users
SELECT 'Users:' as type, COUNT(*) as count FROM users;
SELECT 'Super Admins:' as type, COUNT(*) as count FROM super_admins;
SELECT 'Enterprise Admins:' as type, COUNT(*) as count FROM enterprise_admins;

-- Show first few users
SELECT email, role FROM users LIMIT 5;
\q
EOF

echo ""
echo "✅ Database restoration complete!"
echo "🌐 You can now login to your Railway-deployed application"
echo ""
echo "📝 Demo Credentials:"
echo "   Email: demo_hub_incharge@bisman.demo"
echo "   Password: (check your local demo password)"
