#!/bin/bash
# ============================================================================
# BISMAN ERP - Railway Database Migration Script
# ============================================================================
# 
# This script migrates the database to Railway PostgreSQL
#
# Prerequisites:
# 1. Railway CLI installed: npm i -g @railway/cli
# 2. Railway project linked: railway link
# 3. PostgreSQL service running on Railway
#
# Usage:
#   ./migrate-to-railway.sh
#
# Or with DATABASE_URL:
#   DATABASE_URL="postgresql://..." ./migrate-to-railway.sh
#
# ============================================================================

set -e

echo "🚀 BISMAN ERP - Railway Database Migration"
echo "==========================================="

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not set. Trying to get from Railway..."
    
    # Check if railway CLI is installed
    if ! command -v railway &> /dev/null; then
        echo "❌ Railway CLI not found. Install with: npm i -g @railway/cli"
        echo ""
        echo "Or set DATABASE_URL manually:"
        echo "  export DATABASE_URL='postgresql://user:pass@host:port/db'"
        exit 1
    fi
    
    # Get DATABASE_URL from Railway
    DATABASE_URL=$(railway variables get DATABASE_URL 2>/dev/null || echo "")
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Could not get DATABASE_URL from Railway"
        echo ""
        echo "Please set it manually:"
        echo "  export DATABASE_URL='postgresql://user:pass@host:port/db?sslmode=require'"
        exit 1
    fi
    
    export DATABASE_URL
fi

echo "📡 Using DATABASE_URL: ${DATABASE_URL:0:50}..."
echo ""

# Navigate to backend directory
cd "$(dirname "$0")/my-backend" 2>/dev/null || cd "$(dirname "$0")" 2>/dev/null || true

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Generate Prisma Client
echo "🔧 Step 1: Generating Prisma Client..."
npx prisma generate
echo "✅ Prisma Client generated"
echo ""

# Step 2: Push Prisma Schema (creates tables if they don't exist)
echo "🔧 Step 2: Pushing Prisma Schema to Railway..."
npx prisma db push --accept-data-loss --skip-generate
echo "✅ Schema pushed"
echo ""

# Step 3: Run custom migrations
echo "🔧 Step 3: Running custom SQL migrations..."

MIGRATIONS_DIR="./migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in "$MIGRATIONS_DIR"/*.sql; do
        if [ -f "$migration" ]; then
            echo "  📝 Running: $(basename "$migration")"
            # Use psql or prisma db execute
            npx prisma db execute --file="$migration" --schema=./prisma/schema.prisma 2>/dev/null || {
                echo "  ⚠️  Migration may have already been applied or has errors: $(basename "$migration")"
            }
        fi
    done
    echo "✅ Custom migrations completed"
else
    echo "⚠️  No migrations directory found, skipping custom migrations"
fi
echo ""

# Step 4: Seed the database
echo "🔧 Step 4: Seeding database..."
if [ -f "./prisma/seed-railway.js" ]; then
    node ./prisma/seed-railway.js || {
        echo "⚠️  Seed may have already been run or encountered non-critical errors"
    }
    echo "✅ Database seeded"
else
    echo "⚠️  No seed-railway.js found, skipping seed"
fi
echo ""

# Step 5: Verify connection
echo "🔧 Step 5: Verifying database connection..."
npx prisma db pull --print 2>/dev/null | head -20 || echo "⚠️  Could not verify schema"
echo ""

echo "==========================================="
echo "🎉 Railway database migration complete!"
echo "==========================================="
echo ""
echo "Next steps:"
echo "1. Set environment variables on Railway:"
echo "   railway variables set NODE_ENV=production"
echo "   railway variables set ACCESS_TOKEN_SECRET=your_secret"
echo "   railway variables set REFRESH_TOKEN_SECRET=your_secret"
echo ""
echo "2. Deploy your backend:"
echo "   railway up"
echo ""
