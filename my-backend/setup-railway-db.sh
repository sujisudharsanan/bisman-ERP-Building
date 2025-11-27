#!/bin/bash
# Railway Database Migration & Seeding Script

echo "🚀 Railway Database Setup - Starting..."
echo "================================================"

# Railway Database URL
export DATABASE_URL="postgresql://postgres:sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj@gondola.proxy.rlwy.net:53308/railway"

cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

echo ""
echo "Step 1: Checking failed migrations..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT migration_name, finished_at, success FROM \"_prisma_migrations\" WHERE success = false ORDER BY finished_at DESC;" 2>&1

echo ""
echo "Step 2: Removing failed migration (if exists)..."
echo "================================================"
psql "$DATABASE_URL" -c "DELETE FROM \"_prisma_migrations\" WHERE migration_name = 'add_payment_approval_system' AND success = false;" 2>&1
echo "✅ Failed migration removed"

echo ""
echo "Step 3: Running Prisma migrations..."
echo "================================================"
npx prisma migrate deploy 2>&1

echo ""
echo "Step 4: Verifying tables were created..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'user_%' ORDER BY table_name;" 2>&1

echo ""
echo "Step 5: Checking for existing super_admin and client..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT id, email FROM super_admins LIMIT 1;" 2>&1
psql "$DATABASE_URL" -c "SELECT id, name FROM clients LIMIT 1;" 2>&1

echo ""
echo "Step 6: Running seed script to create demo users..."
echo "================================================"
echo "This will create 10 demo users with complete profiles..."
npx ts-node prisma/seed-complete-users.ts 2>&1

echo ""
echo "Step 7: Verifying users were created..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT id, email, role FROM users ORDER BY created_at DESC LIMIT 10;" 2>&1

echo ""
echo "✅ Railway database setup complete!"
echo "================================================"
echo ""
echo "📊 Summary:"
psql "$DATABASE_URL" -c "SELECT 'Users' as table_name, COUNT(*) as count FROM users UNION ALL SELECT 'User Profiles', COUNT(*) FROM user_profiles UNION ALL SELECT 'User Addresses', COUNT(*) FROM user_addresses UNION ALL SELECT 'User KYC', COUNT(*) FROM user_kyc;" 2>&1

echo ""
echo "🎉 Done! Your Railway database is ready."
