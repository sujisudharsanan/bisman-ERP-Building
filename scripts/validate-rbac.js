#!/usr/bin/env node

/**
 * ============================================================================
 * BISMAN ERP - RBAC Validation Script
 * ============================================================================
 * 
 * Validates RBAC configuration after restructuring.
 * 
 * Usage:
 *   node scripts/validate-rbac.js
 * 
 * Created: 2026-01-25
 * ============================================================================
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

// Expected page count ranges per role type
const EXPECTED_RANGES = {
  PLATFORM: { min: 15, max: 150 },      // SYSTEM_ADMIN, ENTERPRISE_ADMIN, SUPER_ADMIN
  TENANT_ADMIN: { min: 15, max: 50 },   // ADMIN, ADMIN_OPS
  EXECUTIVE: { min: 20, max: 110 },     // CEO, CFO, COO, CTO (high visibility)
  MANAGER: { min: 20, max: 80 },        // Various managers
  STAFF: { min: 15, max: 60 },          // Staff, Data Entry
  INTERNAL: { min: 3, max: 20 }         // BISMAN_* roles
};

const ROLE_TYPES = {
  'SYSTEM_ADMIN': 'PLATFORM',
  'ENTERPRISE_ADMIN': 'PLATFORM',
  'SUPER_ADMIN': 'PLATFORM',
  'ADMIN': 'TENANT_ADMIN',
  'ADMIN_OPS': 'TENANT_ADMIN',
  'IT_ADMIN': 'TENANT_ADMIN',
  'CEO': 'EXECUTIVE',
  'CFO': 'EXECUTIVE',
  'COO': 'EXECUTIVE',
  'CTO': 'EXECUTIVE',
  'HR_MANAGER': 'MANAGER',
  'OPERATIONS_MANAGER': 'MANAGER',
  'FINANCE_CONTROLLER': 'MANAGER',
  'MANAGER': 'MANAGER',
  'SUPERVISOR': 'STAFF',
  'STAFF': 'STAFF',
  'DATA_ENTRY': 'STAFF',
  'INTERN': 'STAFF',
  'BISMAN_ENGINEERING': 'INTERNAL',
  'BISMAN_SUPPORT': 'INTERNAL',
  'BISMAN_BILLING': 'INTERNAL',
  'BISMAN_FINANCE': 'INTERNAL',
  'BISMAN_CUSTOMER_CARE': 'INTERNAL',
  'QA': 'INTERNAL'
};

async function runValidation() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('                    BISMAN ERP - RBAC VALIDATION REPORT');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`Date: ${new Date().toISOString()}\n`);

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  try {
    // ========================================================================
    // TEST 1: PUBLIC pages should have 0 role assignments
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 1: PUBLIC pages have no role assignments                       │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    // Check if category column exists
    const categoryExists = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pages_master' AND column_name = 'category'
    `);
    
    let publicRoles;
    if (categoryExists.rows.length > 0) {
      publicRoles = await pool.query(`
        SELECT pm.route, rpa.role_name
        FROM pages_master pm
        JOIN role_page_access rpa ON rpa.page_id = pm.id
        WHERE pm.category = 'PUBLIC'
      `);
    } else {
      // Fallback: use route patterns for PUBLIC pages
      publicRoles = await pool.query(`
        SELECT pm.route, rpa.role_name
        FROM pages_master pm
        JOIN role_page_access rpa ON rpa.page_id = pm.id
        WHERE pm.route IN (
          '/landing', '/login', '/signup', '/access-denied', '/unauthorized',
          '/status', '/pricing', '/get-started', '/privacy', '/terms',
          '/legal/agreements', '/trust-security'
        ) OR pm.route LIKE '/auth/%'
      `);
    }
    
    if (publicRoles.rows.length === 0) {
      console.log('✅ PASSED: PUBLIC pages have 0 role assignments');
      passed++;
    } else {
      console.log(`❌ FAILED: PUBLIC pages have ${publicRoles.rows.length} role assignments`);
      publicRoles.rows.slice(0, 5).forEach(r => console.log(`   - ${r.route} assigned to ${r.role_name}`));
      failed++;
    }

    // ========================================================================
    // TEST 2: No Enterprise Admin leakage
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 2: No Enterprise Admin route leakage                           │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const eaLeakage = await pool.query(`
      SELECT rpa.role_name, pm.route
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE pm.route LIKE '/enterprise-admin%'
        AND rpa.role_name NOT IN ('ENTERPRISE_ADMIN', 'SYSTEM_ADMIN')
    `);
    
    if (eaLeakage.rows.length === 0) {
      console.log('✅ PASSED: No Enterprise Admin leakage');
      passed++;
    } else {
      console.log(`❌ FAILED: ${eaLeakage.rows.length} Enterprise Admin leakage violations`);
      eaLeakage.rows.slice(0, 5).forEach(r => console.log(`   - ${r.role_name} has ${r.route}`));
      failed++;
    }

    // ========================================================================
    // TEST 3: No Super Admin leakage
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 3: No Super Admin route leakage                                │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const saLeakage = await pool.query(`
      SELECT rpa.role_name, pm.route
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE pm.route LIKE '/super-admin%'
        AND rpa.role_name NOT IN ('SUPER_ADMIN', 'SYSTEM_ADMIN')
    `);
    
    if (saLeakage.rows.length === 0) {
      console.log('✅ PASSED: No Super Admin leakage');
      passed++;
    } else {
      console.log(`❌ FAILED: ${saLeakage.rows.length} Super Admin leakage violations`);
      saLeakage.rows.slice(0, 5).forEach(r => console.log(`   - ${r.role_name} has ${r.route}`));
      failed++;
    }

    // ========================================================================
    // TEST 4: No Admin Console leakage
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 4: No Admin Console route leakage                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const adminLeakage = await pool.query(`
      SELECT rpa.role_name, pm.route
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      WHERE pm.route LIKE '/admin%'
        AND rpa.role_name NOT IN ('ADMIN', 'ADMIN_OPS', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER_ADMIN')
    `);
    
    if (adminLeakage.rows.length === 0) {
      console.log('✅ PASSED: No Admin Console leakage');
      passed++;
    } else {
      console.log(`❌ FAILED: ${adminLeakage.rows.length} Admin Console leakage violations`);
      adminLeakage.rows.slice(0, 5).forEach(r => console.log(`   - ${r.role_name} has ${r.route}`));
      failed++;
    }

    // ========================================================================
    // TEST 5: Realistic page counts per role
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 5: Realistic page counts per role                              │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const pageCounts = await pool.query(`
      SELECT role_name, COUNT(*) as count 
      FROM role_page_access 
      GROUP BY role_name 
      ORDER BY count DESC
    `);
    
    let unrealisticCount = 0;
    console.log('\n   Role                      | Pages | Expected Range | Status');
    console.log('   ──────────────────────────┼───────┼────────────────┼────────');
    
    for (const row of pageCounts.rows) {
      const roleType = ROLE_TYPES[row.role_name] || 'STAFF';
      const range = EXPECTED_RANGES[roleType];
      const count = parseInt(row.count);
      const inRange = count >= range.min && count <= range.max;
      const status = inRange ? '✅' : '⚠️';
      
      console.log(`   ${row.role_name.padEnd(25)} | ${String(count).padStart(5)} | ${range.min}-${range.max}`.padEnd(50) + ` | ${status}`);
      
      if (!inRange) {
        unrealisticCount++;
        if (count > range.max * 2) {
          failed++;
        } else {
          warnings++;
        }
      }
    }
    
    if (unrealisticCount === 0) {
      console.log('\n✅ PASSED: All role page counts are realistic');
      passed++;
    } else {
      console.log(`\n⚠️  WARNING: ${unrealisticCount} roles have unusual page counts`);
    }

    // ========================================================================
    // TEST 6: Redundant login pages are deactivated
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 6: Redundant login pages are deactivated                       │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const logins = await pool.query(`
      SELECT route, is_active
      FROM pages_master
      WHERE route IN ('/auth/admin-login', '/auth/hub-incharge-login', '/auth/standard-login', '/qa/login')
        AND is_active = true
    `);
    
    if (logins.rows.length === 0) {
      console.log('✅ PASSED: Redundant login pages are deactivated');
      passed++;
    } else {
      console.log(`❌ FAILED: ${logins.rows.length} redundant login pages still active`);
      logins.rows.forEach(r => console.log(`   - ${r.route}`));
      failed++;
    }

    // ========================================================================
    // TEST 7: BASE_USER pages exist
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 7: BASE_USER pages table exists and populated                  │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    try {
      const baseUserPages = await pool.query(`SELECT COUNT(*) as count FROM base_user_pages`);
      const count = parseInt(baseUserPages.rows[0].count);
      
      if (count >= 15) {
        console.log(`✅ PASSED: BASE_USER has ${count} pages`);
        passed++;
      } else if (count > 0) {
        console.log(`⚠️  WARNING: BASE_USER only has ${count} pages (expected 15+)`);
        warnings++;
      } else {
        console.log(`❌ FAILED: BASE_USER has 0 pages`);
        failed++;
      }
    } catch (e) {
      console.log('❌ FAILED: base_user_pages table does not exist');
      failed++;
    }

    // ========================================================================
    // TEST 8: Dashboard pages have sidebar_order = 1
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 8: Dashboard pages have sidebar_order = 1                      │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    // Check if sidebar_order column exists
    const sidebarOrderExists = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'pages_master' AND column_name = 'sidebar_order'
    `);
    
    if (sidebarOrderExists.rows.length === 0) {
      console.log('⚠️  SKIPPED: sidebar_order column does not exist yet (run migration)');
      warnings++;
    } else {
      const dashboards = await pool.query(`
        SELECT route, sidebar_order
        FROM pages_master
        WHERE route IN ('/dashboard', '/enterprise-admin/dashboard', '/super-admin', '/admin/client-dashboard')
          AND is_active = true
      `);
      
      const wrongOrder = dashboards.rows.filter(d => d.sidebar_order !== 1);
      
      if (wrongOrder.length === 0) {
        console.log('✅ PASSED: All dashboards have sidebar_order = 1');
        passed++;
      } else {
        console.log(`⚠️  WARNING: ${wrongOrder.length} dashboards have wrong sidebar_order`);
        wrongOrder.forEach(d => console.log(`   - ${d.route} has order ${d.sidebar_order}`));
        warnings++;
      }
    }

    // ========================================================================
    // TEST 9: Each platform role has its dashboard
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 9: Platform roles have correct dashboard assignments           │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const roleDashboards = {
      'ENTERPRISE_ADMIN': '/enterprise-admin/dashboard',
      'SUPER_ADMIN': '/super-admin',
      'ADMIN': '/admin/client-dashboard'
    };
    
    let dashboardIssues = 0;
    for (const [role, dashboard] of Object.entries(roleDashboards)) {
      const check = await pool.query(`
        SELECT 1 FROM role_page_access rpa
        JOIN pages_master pm ON rpa.page_id = pm.id
        WHERE rpa.role_name = $1 AND pm.route = $2
      `, [role, dashboard]);
      
      if (check.rows.length === 0) {
        console.log(`   ❌ ${role} missing dashboard ${dashboard}`);
        dashboardIssues++;
      } else {
        console.log(`   ✅ ${role} has ${dashboard}`);
      }
    }
    
    if (dashboardIssues === 0) {
      passed++;
    } else {
      failed++;
    }

    // ========================================================================
    // TEST 10: No duplicate routes
    // ========================================================================
    console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
    console.log('│ TEST 10: No duplicate routes in pages_master                        │');
    console.log('└─────────────────────────────────────────────────────────────────────┘');
    
    const duplicates = await pool.query(`
      SELECT route, COUNT(*) as cnt
      FROM pages_master
      WHERE is_active = true
      GROUP BY route
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length === 0) {
      console.log('✅ PASSED: No duplicate routes');
      passed++;
    } else {
      console.log(`❌ FAILED: ${duplicates.rows.length} duplicate routes found`);
      duplicates.rows.forEach(d => console.log(`   - ${d.route} (${d.cnt} times)`));
      failed++;
    }

    // ========================================================================
    // SUMMARY
    // ========================================================================
    console.log('\n═══════════════════════════════════════════════════════════════════════');
    console.log('                           VALIDATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`\n   ✅ Passed:   ${passed}`);
    console.log(`   ⚠️  Warnings: ${warnings}`);
    console.log(`   ❌ Failed:   ${failed}`);
    console.log(`\n   Total:      ${passed + warnings + failed} tests\n`);
    
    if (failed > 0) {
      console.log('❌ VALIDATION FAILED - Please fix the issues above before deployment.\n');
      process.exit(1);
    } else if (warnings > 0) {
      console.log('⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings before deployment.\n');
      process.exit(0);
    } else {
      console.log('✅ VALIDATION PASSED - RBAC configuration is correct.\n');
      process.exit(0);
    }

  } catch (error) {
    console.error('\n❌ VALIDATION ERROR:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run validation
runValidation();
