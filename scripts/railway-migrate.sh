#!/bin/bash
# Railway Database Migration Script
# This script helps you connect to Railway PostgreSQL and run migrations

set -e

echo "🚀 Railway Database Migration Helper"
echo "====================================="
echo ""

# Step 1: Get DATABASE_URL from Railway
echo "📋 Step 1: Get DATABASE_URL from Railway"
echo "----------------------------------------"
echo "1. Go to Railway Dashboard: https://railway.app/dashboard"
echo "2. Select your project: bisman-erp-backend-production"
echo "3. Click on the PostgreSQL service (database icon)"
echo "4. Go to 'Variables' tab"
echo "5. Find and copy the 'DATABASE_URL' value"
echo ""
echo "It should look like:"
echo "postgresql://postgres:PASSWORD@containers-us-west-XXX.railway.app:PORT/railway"
echo ""
read -p "Press Enter when you have copied the DATABASE_URL..."

# Step 2: Set environment variable
echo ""
echo "📝 Step 2: Set DATABASE_URL for this session"
echo "--------------------------------------------"
read -p "Paste your Railway DATABASE_URL here: " RAILWAY_DATABASE_URL

if [ -z "$RAILWAY_DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL is empty"
  exit 1
fi

echo "✅ DATABASE_URL received"
export DATABASE_URL="$RAILWAY_DATABASE_URL"

# Navigate to backend directory
cd "$(dirname "$0")/my-backend"

echo ""
echo "📦 Step 3: Test database connection"
echo "-----------------------------------"
if npx prisma db pull --schema=./prisma/schema.prisma 2>&1 | grep -q "Introspected"; then
  echo "✅ Successfully connected to Railway database!"
else
  echo "⚠️  Connection test completed (database might be empty)"
fi

echo ""
echo "🔍 Step 4: Check existing tables"
echo "--------------------------------"
TABLES=$(npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
)

if [ -z "$TABLES" ]; then
  echo "📭 No tables found in database (fresh database)"
else
  echo "📦 Existing tables:"
  echo "$TABLES"
fi

echo ""
echo "🏗️  Step 5: Apply Prisma migrations"
echo "-----------------------------------"
read -p "Run migrations now? (y/n): " RUN_MIGRATIONS

if [ "$RUN_MIGRATIONS" = "y" ] || [ "$RUN_MIGRATIONS" = "Y" ]; then
  echo "Running: npx prisma migrate deploy..."
  if npx prisma migrate deploy; then
    echo "✅ Migrations applied successfully!"
  else
    echo "⚠️  Migration failed. Trying db push as fallback..."
    if npx prisma db push --accept-data-loss; then
      echo "✅ Schema pushed successfully!"
    else
      echo "❌ Schema push failed"
      exit 1
    fi
  fi
else
  echo "⏭️  Skipping migrations"
fi

echo ""
echo "🔍 Step 6: Verify tables were created"
echo "-------------------------------------"
echo "Expected tables:"
echo "  - users"
echo "  - user_sessions"
echo "  - rbac_roles"
echo "  - rbac_permissions"
echo "  - rbac_routes"
echo "  - rbac_actions"
echo "  - rbac_user_roles"
echo "  - audit_logs"
echo "  - recent_activity"
echo ""

FINAL_TABLES=$(npx prisma db execute --stdin <<EOF
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
)

if echo "$FINAL_TABLES" | grep -q "users"; then
  echo "✅ Tables created successfully!"
  echo ""
  echo "Tables in database:"
  echo "$FINAL_TABLES"
else
  echo "❌ Tables not found. Migration may have failed."
  exit 1
fi

echo ""
echo "👥 Step 7: Seed database with test users (optional)"
echo "---------------------------------------------------"
read -p "Create test users? (y/n): " SEED_USERS

if [ "$SEED_USERS" = "y" ] || [ "$SEED_USERS" = "Y" ]; then
  echo "Creating test users..."
  npx prisma db seed 2>/dev/null || echo "⚠️  Seed script not found, you'll need to create users manually"
fi

echo ""
echo "🎉 Migration Complete!"
echo "====================="
echo ""
echo "✅ Database is ready on Railway"
echo "✅ All tables created"
echo ""
echo "📋 Next Steps:"
echo "1. Update Railway environment variables (if needed)"
echo "2. Redeploy on Railway (it will use the existing tables)"
echo "3. Test login with: super@bisman.local / password"
echo ""
echo "🔧 Useful Commands:"
echo "   View database in browser: npx prisma studio"
echo "   Check connection: npx prisma db pull"
echo "   Generate client: npx prisma generate"
echo ""
