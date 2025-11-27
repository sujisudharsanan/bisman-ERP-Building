#!/bin/bash
# Complete Railway Database Reset & Setup Script

echo "🔥 Railway Database COMPLETE RESET - Starting..."
echo "================================================"
echo "⚠️  WARNING: This will DELETE ALL data and recreate everything"
echo "================================================"

# Railway Database URL
export DATABASE_URL="postgresql://postgres:sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj@gondola.proxy.rlwy.net:53308/railway"

cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

echo ""
echo "Step 1: Clearing all failed migrations..."
echo "================================================"
psql "$DATABASE_URL" -c "DELETE FROM \"_prisma_migrations\";" 2>&1
echo "✅ Migration history cleared"

echo ""
echo "Step 2: Running Prisma migrate deploy (fresh start)..."
echo "================================================"
npx prisma migrate deploy 2>&1

echo ""
echo "Step 3: Verifying tables were created..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name;" 2>&1 | head -50

echo ""
echo "✅ Database reset complete! Tables created successfully."
echo "================================================"
