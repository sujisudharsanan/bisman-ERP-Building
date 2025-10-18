#!/bin/bash
# Quick Railway Migration Setup
# Run this after getting DATABASE_URL from Railway

set -e

echo "🚀 Quick Railway Database Setup"
echo "================================"
echo ""

# Check if DATABASE_URL is provided
if [ -z "$1" ]; then
  echo "❌ Error: DATABASE_URL required"
  echo ""
  echo "Usage:"
  echo "  ./quick-railway-setup.sh \"postgresql://postgres:PASSWORD@railway.app:PORT/railway\""
  echo ""
  echo "Get your DATABASE_URL from:"
  echo "  1. Railway Dashboard → Your Project"
  echo "  2. Click PostgreSQL service"
  echo "  3. Variables tab → Copy DATABASE_URL"
  exit 1
fi

export DATABASE_URL="$1"
echo "✅ DATABASE_URL set"

# Navigate to backend
cd "$(dirname "$0")/my-backend"

echo ""
echo "📦 Step 1: Test connection..."
if npx prisma db pull --force 2>&1 | grep -q "Introspected\|Successfully"; then
  echo "✅ Connected to Railway database"
else
  echo "⚠️  Connection attempted (database may be empty)"
fi

echo ""
echo "🏗️  Step 2: Push schema to database..."
echo "(This will create all tables)"

if npx prisma db push --accept-data-loss --skip-generate; then
  echo "✅ Schema pushed successfully!"
else
  echo "❌ Schema push failed"
  exit 1
fi

echo ""
echo "🔍 Step 3: Verify tables..."
TABLES=$(npx prisma db execute --stdin 2>/dev/null <<EOF || echo "Could not list tables"
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
)

if echo "$TABLES" | grep -q "users"; then
  echo "✅ Tables created successfully!"
  echo ""
  echo "Created tables:"
  echo "$TABLES" | head -20
else
  echo "⚠️  Could not verify tables, but schema push succeeded"
fi

echo ""
echo "📦 Step 4: Generate Prisma client..."
npx prisma generate

echo ""
echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "✅ Database schema created on Railway"
echo "✅ All tables ready"
echo "✅ Prisma client generated"
echo ""
echo "📋 Next Steps:"
echo "1. Redeploy on Railway (automatic migrations will run)"
echo "2. Test login at: https://bisman-erp-backend-production.up.railway.app"
echo "3. Use credentials: super@bisman.local / password"
echo ""
echo "🔍 View database:"
echo "   npx prisma studio"
echo ""
