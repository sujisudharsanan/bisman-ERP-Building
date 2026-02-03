/**
 * Verify ADMIN page visibility fix
 * 
 * This script simulates what menuRoutesSecure does after the fix:
 * 1. Get tenant_id from user
 * 2. Fetch plan_id from client_subscriptions 
 * 3. Compute effective pages with correct plan
 */
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

const ALWAYS_ACCESSIBLE_PAGES = ['/dashboard', '/common/user-settings'];
const ALWAYS_ACCESSIBLE_MODULES = ['COMMON', 'DASHBOARD'];

async function testADMINUserWithFix() {
  try {
    console.log('=== VERIFYING ADMIN PAGE VISIBILITY FIX ===\n');
    
    // ADMIN user data
    const userId = 2;
    const tenantId = '6b68f86a-225f-480f-ae29-292da9e565d3';
    const role = 'ADMIN';
    
    // STEP 1: Simulate JWT that lacks plan_id (old sessions)
    console.log('STEP 1: Simulate JWT missing plan_id');
    console.log(`  User: id=${userId}, tenant=${tenantId}, role=${role}`);
    console.log('  plan_id in JWT: undefined (missing)\n');
    
    // STEP 2: Fetch plan_id from client_subscriptions (the FIX)
    console.log('STEP 2: Fetch plan_id from client_subscriptions (NEW FIX)');
    const subResult = await pool.query(`
      SELECT plan_id FROM client_subscriptions 
      WHERE client_id = $1 AND is_active = true 
      ORDER BY created_at DESC LIMIT 1
    `, [tenantId]);
    
    const fetchedPlanId = subResult.rows.length > 0 ? subResult.rows[0].plan_id : 1;
    console.log(`  Fetched plan_id: ${fetchedPlanId}`);
    
    // STEP 3: Get subscription pages with CORRECT plan
    console.log('\nSTEP 3: Get subscription pages (Layer 1)');
    const moduleAccess = await pool.query(`
      SELECT module_id FROM plan_module_access 
      WHERE plan_id = $1 AND access_level != 'none'
    `, [fetchedPlanId]);
    
    const accessibleModules = [
      ...ALWAYS_ACCESSIBLE_MODULES,
      ...moduleAccess.rows.map(m => m.module_id)
    ];
    console.log(`  Accessible modules: ${accessibleModules.length}`);
    
    const subscriptionPagesResult = await pool.query(`
      SELECT pm.page_code, pm.route, mm.module_code
      FROM pages_master pm
      JOIN modules_master mm ON pm.module_id = mm.id
      WHERE mm.module_code = ANY($1::text[])
        AND pm.is_active = true
    `, [accessibleModules]);
    
    const subscriptionPages = new Set(ALWAYS_ACCESSIBLE_PAGES);
    for (const page of subscriptionPagesResult.rows) {
      if (page.page_code) subscriptionPages.add(page.page_code);
      if (page.route) subscriptionPages.add(page.route);
    }
    console.log(`  Subscription pages: ${subscriptionPages.size}`);
    
    // STEP 4: Get role-based assignments for ADMIN (Layer 3)
    console.log('\nSTEP 4: Get role-based EA assignments (Layer 3)');
    const roleAssignments = await pool.query(`
      SELECT DISTINCT pm.page_code, pm.route
      FROM admin_page_assignments apa
      JOIN pages_master pm ON pm.id = apa.page_id
      WHERE apa.assignee_type = $1
        AND apa.assigner_type = 'ENTERPRISE_ADMIN'
        AND apa.is_active = true
        AND pm.is_active = true
    `, [role]);
    
    const saApprovedPages = new Set(ALWAYS_ACCESSIBLE_PAGES);
    for (const a of roleAssignments.rows) {
      if (a.page_code) saApprovedPages.add(a.page_code);
      if (a.route) saApprovedPages.add(a.route);
    }
    console.log(`  SA/EA approved pages: ${saApprovedPages.size}`);
    
    // STEP 5: COMPUTE INTERSECTION
    console.log('\nSTEP 5: Compute intersection');
    const effectivePages = [];
    for (const pageKey of subscriptionPages) {
      if (saApprovedPages.has(pageKey)) {
        effectivePages.push(pageKey);
      }
    }
    console.log(`  Effective pages: ${effectivePages.length}`);
    
    // STEP 6: Filter for sidebar-visible pages
    console.log('\nSTEP 6: Filter for sidebar visibility');
    const sidebarPages = await pool.query(`
      SELECT page_code, route, display_name, show_in_sidebar
      FROM pages_master
      WHERE page_code = ANY($1::text[])
        AND is_active = true
        AND show_in_sidebar = true
    `, [effectivePages]);
    
    console.log(`  Sidebar-visible pages: ${sidebarPages.rows.length}`);
    
    console.log('\n=== RESULT ===');
    console.log('ADMIN user should see these pages in sidebar:');
    console.table(sidebarPages.rows.map(p => ({ name: p.display_name, route: p.route })));
    
    if (sidebarPages.rows.length > 1) {
      console.log('\n✅ FIX VERIFIED: ADMIN user should see more than just "My Dashboard"');
    } else {
      console.log('\n❌ FIX FAILED: ADMIN user still only sees "My Dashboard"');
    }
    
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
  } finally {
    await pool.end();
  }
}

testADMINUserWithFix();
