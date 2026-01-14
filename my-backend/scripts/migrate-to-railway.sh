#!/bin/bash
# ============================================================================
# BISMAN ERP - Railway Database Migration Script
# ============================================================================
# 
# Run this script to apply Phase 1 & Phase 2 migrations to Railway
#
# Usage: 
#   chmod +x scripts/migrate-to-railway.sh
#   ./scripts/migrate-to-railway.sh
# ============================================================================

set -e

# Railway Database URL
export DATABASE_URL="postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway"

echo "🚀 BISMAN ERP - Railway Database Migration"
echo "==========================================="
echo ""

# Step 1: Test connection
echo "📡 Step 1: Testing connection to Railway..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000
});
pool.query('SELECT NOW()')
  .then(() => { console.log('✅ Connected to Railway'); pool.end(); })
  .catch(e => { console.error('❌ Connection failed:', e.message); pool.end(); process.exit(1); });
"

# Step 2: Run Phase 1 migration (creates tables)
echo ""
echo "📦 Step 2: Running Phase 1 migration (tables)..."
psql "$DATABASE_URL" -f database/migrations/20260114_modules_pages_master.sql || echo "⚠️ Migration may already exist"

# Step 3: Run Phase 1 seed
echo ""
echo "🌱 Step 3: Running Phase 1 seed (modules & pages)..."
node scripts/seed-modules-pages.js

# Step 4: Run Phase 2 seed (missing pages & roles)
echo ""
echo "🌱 Step 4: Running Phase 2 seed (missing pages & roles)..."
node scripts/seed-missing-pages-phase2.js

# Step 5: Verify
echo ""
echo "✅ Step 5: Verifying migration..."
node -e "
const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
Promise.all([
  pool.query('SELECT COUNT(*) as count FROM modules_master'),
  pool.query('SELECT COUNT(*) as count FROM pages_master'),
  pool.query('SELECT COUNT(*) as count FROM role_page_access'),
  pool.query('SELECT COUNT(DISTINCT role_name) as count FROM role_page_access')
]).then(([modules, pages, access, roles]) => {
  console.log('📊 Migration Results:');
  console.log('   Modules:', modules.rows[0].count);
  console.log('   Pages:', pages.rows[0].count);
  console.log('   Role-Page Access:', access.rows[0].count);
  console.log('   Roles with Access:', roles.rows[0].count);
  pool.end();
}).catch(e => { console.error('Error:', e.message); pool.end(); });
"

echo ""
echo "🎉 Migration complete!"
