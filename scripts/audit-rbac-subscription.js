/**
 * RBAC + Subscription Audit Script
 * =================================
 * Verifies that the "Dashboard-Only" bug cannot recur.
 * 
 * Checks:
 * 1. Module code case consistency
 * 2. Plan module access configuration
 * 3. Effective access computation for test user
 * 
 * Usage: node scripts/audit-rbac-subscription.js
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
});

// Constants from effectiveAccessService.js (AUDIT FIX: now UPPERCASE)
const ALWAYS_ACCESSIBLE_MODULES = ['DASHBOARD', 'COMMON'];

async function auditModuleCodeConsistency() {
  console.log('\n' + '='.repeat(60));
  console.log('1️⃣  MODULE CODE CASE CONSISTENCY AUDIT');
  console.log('='.repeat(60));
  
  // Check modules_master
  const modules = await pool.query(`
    SELECT module_code, display_name, is_active 
    FROM modules_master 
    ORDER BY module_code
  `);
  
  const uppercaseModules = [];
  const lowercaseModules = [];
  const mixedCaseModules = [];
  
  for (const m of modules.rows) {
    const code = m.module_code;
    if (code === code.toUpperCase()) {
      uppercaseModules.push(code);
    } else if (code === code.toLowerCase()) {
      lowercaseModules.push(code);
    } else {
      mixedCaseModules.push(code);
    }
  }
  
  console.log(`\nTotal modules: ${modules.rows.length}`);
  console.log(`UPPERCASE: ${uppercaseModules.length} (${uppercaseModules.slice(0, 5).join(', ')}...)`);
  console.log(`lowercase: ${lowercaseModules.length} (${lowercaseModules.slice(0, 5).join(', ')}...)`);
  console.log(`MixedCase: ${mixedCaseModules.length} (${mixedCaseModules.join(', ')})`);
  
  // Check plan_module_access
  const planModuleAccess = await pool.query(`
    SELECT DISTINCT module_id FROM plan_module_access
  `);
  
  const planModuleCodes = planModuleAccess.rows.map(r => r.module_id);
  console.log(`\nPlan module access entries: ${planModuleCodes.length}`);
  console.log(`Sample: ${planModuleCodes.slice(0, 10).join(', ')}`);
  
  // Check for ALWAYS_ACCESSIBLE_MODULES presence
  console.log('\n📋 ALWAYS_ACCESSIBLE_MODULES check:');
  
  for (const mod of ALWAYS_ACCESSIBLE_MODULES) {
    const exists = modules.rows.find(m => m.module_code.toUpperCase() === mod.toUpperCase());
    const exactMatch = modules.rows.find(m => m.module_code === mod);
    console.log(`  ${mod}: DB has "${exists?.module_code || 'NOT FOUND'}" | Exact match: ${exactMatch ? '✅' : '❌'}`);
  }
  
  // Case mismatch detection (now checking if DB matches our UPPERCASE constants)
  const codesMismatch = [];
  for (const mod of ALWAYS_ACCESSIBLE_MODULES) {
    const dbModule = modules.rows.find(m => m.module_code.toUpperCase() === mod.toUpperCase());
    if (dbModule && dbModule.module_code !== mod) {
      codesMismatch.push({ expected: mod, actual: dbModule.module_code });
    }
  }
  
  if (codesMismatch.length > 0) {
    console.log('\n⚠️  CASE MISMATCH DETECTED:');
    for (const m of codesMismatch) {
      console.log(`   Code uses "${m.expected}" but DB has "${m.actual}"`);
    }
  } else {
    console.log('\n✅ No case mismatches in ALWAYS_ACCESSIBLE_MODULES');
  }
  
  return { uppercaseModules, lowercaseModules, codesMismatch };
}

async function auditPlanModuleAccess() {
  console.log('\n' + '='.repeat(60));
  console.log('2️⃣  PLAN MODULE ACCESS AUDIT');
  console.log('='.repeat(60));
  
  // Get all plans
  const plans = await pool.query(`
    SELECT id, plan_code, name FROM subscription_plans ORDER BY id
  `);
  
  console.log('\nSubscription Plans:');
  for (const plan of plans.rows) {
    const moduleCount = await pool.query(`
      SELECT COUNT(*) as count, 
             COUNT(*) FILTER (WHERE access_level != 'none') as active_count
      FROM plan_module_access 
      WHERE plan_id = $1
    `, [plan.id]);
    
    console.log(`  Plan ${plan.id} (${plan.plan_code}): ${moduleCount.rows[0].active_count}/${moduleCount.rows[0].count} active modules`);
    
    // Check if ADMIN module is included (case-insensitive)
    const adminModule = await pool.query(`
      SELECT module_id, access_level 
      FROM plan_module_access 
      WHERE plan_id = $1 AND LOWER(module_id) = 'admin'
    `, [plan.id]);
    
    if (adminModule.rows.length > 0) {
      console.log(`    → ADMIN module: ${adminModule.rows[0].module_id} (${adminModule.rows[0].access_level})`);
    } else {
      console.log(`    → ADMIN module: NOT INCLUDED`);
    }
  }
  
  // Plan 1 (FREE) specific check
  console.log('\n📋 Plan 1 (FREE) Module Check:');
  const plan1Modules = await pool.query(`
    SELECT module_id, access_level 
    FROM plan_module_access 
    WHERE plan_id = 1 AND access_level != 'none'
    ORDER BY module_id
  `);
  
  if (plan1Modules.rows.length === 0) {
    console.log('  ⚠️  Plan 1 has NO active modules!');
  } else {
    console.log(`  Active modules: ${plan1Modules.rows.map(r => r.module_id).join(', ')}`);
  }
  
  return { plans: plans.rows };
}

async function auditAdminRoleAssignments() {
  console.log('\n' + '='.repeat(60));
  console.log('3️⃣  ADMIN ROLE PAGE ASSIGNMENTS AUDIT');
  console.log('='.repeat(60));
  
  // Check EA assignments for ADMIN role
  const adminRoleAssignments = await pool.query(`
    SELECT COUNT(*) as count
    FROM admin_page_assignments apa
    WHERE apa.assignee_type = 'ADMIN'
      AND apa.assigner_type = 'ENTERPRISE_ADMIN'
      AND apa.is_active = true
  `);
  
  console.log(`\nADMIN role page assignments (from EA): ${adminRoleAssignments.rows[0].count}`);
  
  if (parseInt(adminRoleAssignments.rows[0].count) === 0) {
    console.log('  ⚠️  No EA assignments for ADMIN role - users will only see ALWAYS_ACCESSIBLE pages!');
  }
  
  // Get sample pages assigned to ADMIN
  const samplePages = await pool.query(`
    SELECT pm.page_code, pm.route, mm.module_code
    FROM admin_page_assignments apa
    JOIN pages_master pm ON pm.id = apa.page_id
    LEFT JOIN modules_master mm ON pm.module_id = mm.id
    WHERE apa.assignee_type = 'ADMIN'
      AND apa.assigner_type = 'ENTERPRISE_ADMIN'
      AND apa.is_active = true
    LIMIT 10
  `);
  
  if (samplePages.rows.length > 0) {
    console.log('\nSample ADMIN pages:');
    for (const p of samplePages.rows) {
      console.log(`  ${p.page_code} (${p.module_code}) → ${p.route}`);
    }
  }
}

async function simulateEffectiveAccess() {
  console.log('\n' + '='.repeat(60));
  console.log('4️⃣  EFFECTIVE ACCESS SIMULATION (ADMIN role, Plan 5)');
  console.log('='.repeat(60));
  
  const planId = 5; // Typical non-free plan
  const role = 'ADMIN';
  
  // Get subscription pages for plan
  const moduleAccess = await pool.query(`
    SELECT module_id FROM plan_module_access 
    WHERE plan_id = $1 AND access_level != 'none'
  `, [planId]);
  
  const accessibleModules = [
    ...ALWAYS_ACCESSIBLE_MODULES, // Using UPPERCASE per DB standard (AUDIT FIX)
    ...moduleAccess.rows.map(m => m.module_id)
  ];
  
  console.log(`\nAccessible modules (Plan ${planId}): ${accessibleModules.join(', ')}`);
  
  // Get pages from those modules
  const subscriptionPages = await pool.query(`
    SELECT pm.page_code, pm.route, mm.module_code
    FROM pages_master pm
    JOIN modules_master mm ON pm.module_id = mm.id
    WHERE mm.module_code = ANY($1::text[])
      AND pm.is_active = true
  `, [accessibleModules]);
  
  console.log(`Subscription pages: ${subscriptionPages.rows.length}`);
  
  // Get role-based assignments
  const roleAssignments = await pool.query(`
    SELECT DISTINCT pm.page_code, pm.route
    FROM admin_page_assignments apa
    JOIN pages_master pm ON pm.id = apa.page_id
    WHERE apa.assignee_type = $1
      AND apa.assigner_type = 'ENTERPRISE_ADMIN'
      AND apa.is_active = true
      AND pm.is_active = true
  `, [role]);
  
  console.log(`Role-based assignments: ${roleAssignments.rows.length}`);
  
  // Compute intersection
  const subscriptionSet = new Set(subscriptionPages.rows.map(p => p.page_code));
  const roleSet = new Set(roleAssignments.rows.map(p => p.page_code));
  
  const effectivePages = [];
  for (const pageCode of subscriptionSet) {
    if (roleSet.has(pageCode)) {
      effectivePages.push(pageCode);
    }
  }
  
  console.log(`\n📊 EFFECTIVE PAGES (intersection): ${effectivePages.length}`);
  
  if (effectivePages.length === 0 || effectivePages.length < 5) {
    console.log('  ⚠️  POTENTIAL "DASHBOARD-ONLY" BUG!');
    console.log('  Subscription pages not matching role assignments.');
    console.log('\n  Debug: First 5 subscription pages:', [...subscriptionSet].slice(0, 5));
    console.log('  Debug: First 5 role assignment pages:', [...roleSet].slice(0, 5));
  } else {
    console.log('  ✅ Effective access looks healthy');
    console.log(`  Sample: ${effectivePages.slice(0, 5).join(', ')}...`);
  }
}

async function checkJWTInjection() {
  console.log('\n' + '='.repeat(60));
  console.log('5️⃣  JWT plan_id INJECTION VERIFICATION');
  console.log('='.repeat(60));
  
  // Check if client_subscriptions has data
  const subCount = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE is_active = true) as active,
      COUNT(*) FILTER (WHERE plan_id IS NULL) as null_plan
    FROM client_subscriptions
  `);
  
  console.log('\nClient Subscriptions:');
  console.log(`  Total: ${subCount.rows[0].total}`);
  console.log(`  Active: ${subCount.rows[0].active}`);
  console.log(`  Missing plan_id: ${subCount.rows[0].null_plan}`);
  
  if (parseInt(subCount.rows[0].null_plan) > 0) {
    console.log('  ⚠️  Some subscriptions have NULL plan_id!');
  }
  
  // Check for tenants without subscriptions
  const tenantsWithoutSub = await pool.query(`
    SELECT COUNT(*) as count
    FROM clients c
    LEFT JOIN client_subscriptions cs ON cs.client_id = c.id AND cs.is_active = true
    WHERE cs.id IS NULL
  `);
  
  console.log(`\nTenants without active subscription: ${tenantsWithoutSub.rows[0].count}`);
  
  if (parseInt(tenantsWithoutSub.rows[0].count) > 0) {
    console.log('  ⚠️  These tenants will fall back to plan_id = 1 (FREE)');
  }
}

async function runAudit() {
  console.log('🔍 RBAC + SUBSCRIPTION AUDIT');
  console.log('============================');
  console.log('Preventing "Dashboard-Only" bugs');
  console.log('Date:', new Date().toISOString());
  
  try {
    await auditModuleCodeConsistency();
    await auditPlanModuleAccess();
    await auditAdminRoleAssignments();
    await simulateEffectiveAccess();
    await checkJWTInjection();
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ AUDIT COMPLETE');
    console.log('='.repeat(60));
    console.log('\nReview the output above for any ⚠️  warnings.');
    console.log('See docs/RBAC_SUBSCRIPTION_AUDIT_REPORT.md for full analysis.');
    
  } catch (error) {
    console.error('\n❌ AUDIT FAILED:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

runAudit();
