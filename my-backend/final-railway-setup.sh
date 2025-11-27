#!/bin/bash
# Final Railway Setup Script - Complete Process

set -e  # Exit on any error

echo "🚀 FINAL Railway Database Setup"
echo "================================================"

export DATABASE_URL="postgresql://postgres:sstdOVvKqTCiPiKRKtRSpnrtkgEUdKnj@gondola.proxy.rlwy.net:53308/railway"
cd "/Users/abhi/Desktop/BISMAN ERP/my-backend"

echo ""
echo "📊 Step 1: Check current table count..."
echo "================================================"
psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"

echo ""
echo "✅ Step 2: Now running the seed script..."
echo "================================================"
echo "This will create:"
echo "  - Super Admin (if not exists)"
echo "  - Client/Tenant (if not exists)"
echo "  - Branch"
echo "  - 10 Demo Users with complete profiles"
echo ""

DATABASE_URL="$DATABASE_URL" npx ts-node prisma/seed-complete-users.ts

echo ""
echo "📊 Step 3: Verify data was created..."
echo "================================================"
psql "$DATABASE_URL" -c "
SELECT 
    'Users' as entity, COUNT(*) as count FROM users
UNION ALL SELECT 'User Profiles', COUNT(*) FROM user_profiles  
UNION ALL SELECT 'User Addresses', COUNT(*) FROM user_addresses
UNION ALL SELECT 'User KYC', COUNT(*) FROM user_kyc
UNION ALL SELECT 'User Bank Accounts', COUNT(*) FROM user_bank_accounts
UNION ALL SELECT 'User Skills', COUNT(*) FROM user_skills
UNION ALL SELECT 'Branches', COUNT(*) FROM branches;
"

echo ""
echo "✅ Step 4: List demo users created..."
echo "================================================"
psql "$DATABASE_URL" -c "SELECT email, role, is_active FROM users ORDER BY created_at DESC LIMIT 10;"

echo ""
echo "🎉 SUCCESS! Railway database is fully set up!"
echo "================================================"
echo ""
echo "You can now test login with any of these users:"
echo "  Email: arun.kumar@bisman.demo"
echo "  Password: Demo@123"
echo ""
