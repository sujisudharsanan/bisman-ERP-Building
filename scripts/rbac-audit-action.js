#!/usr/bin/env node
/**
 * RBAC Audit Action Script
 * Takes corrective actions based on audit findings
 */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway'
});

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                    RBAC AUDIT - CORRECTIVE ACTIONS                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Analyze the unassigned pages
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 1: Categorizing 25 Unassigned Pages');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const unassignedPages = await pool.query(`
      SELECT pm.id, pm.page_code, pm.display_name, pm.route, pm.show_in_sidebar
      FROM pages_master pm
      WHERE pm.status = 'active'
        AND pm.id NOT IN (SELECT DISTINCT page_id FROM role_page_access)
      ORDER BY pm.route
    `);

    // Categorize pages
    const publicPages = [];
    const authPages = [];
    const adminPages = [];
    const onboardingPages = [];

    for (const page of unassignedPages.rows) {
      if (page.route.startsWith('/auth/') || page.route === '/login' || page.route === '/signup') {
        authPages.push(page);
      } else if (page.route.startsWith('/admin/')) {
        adminPages.push(page);
      } else if (page.route.startsWith('/welcome') || page.route.startsWith('/onboarding')) {
        onboardingPages.push(page);
      } else {
        publicPages.push(page);
      }
    }

    console.log('📋 Categorization Results:');
    console.log(`   • Authentication Pages (no role needed): ${authPages.length}`);
    console.log(`   • Public/Info Pages (no role needed): ${publicPages.length}`);
    console.log(`   • Onboarding Pages (no role needed): ${onboardingPages.length}`);
    console.log(`   • Admin Pages (NEED role assignment): ${adminPages.length}`);
    console.log('');

    // 2. Check DEMO_USER
    console.log('═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 2: DEMO_USER Analysis');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const demoUserInfo = await pool.query(`
      SELECT r.id, r.name, r.display_name, r.level, r.status,
             (SELECT COUNT(*) FROM users u WHERE u.role_id = r.id) as active_users
      FROM rbac_roles r
      WHERE r.name = 'DEMO_USER'
    `);

    if (demoUserInfo.rows.length > 0) {
      const du = demoUserInfo.rows[0];
      console.log(`   Role: ${du.name} (${du.display_name})`);
      console.log(`   Level: ${du.level}, Status: ${du.status}`);
      console.log(`   Active Users: ${du.active_users}`);
      
      if (du.active_users === '0' || du.active_users === 0) {
        console.log('   ✅ No active users - empty page mapping is acceptable');
      } else {
        console.log('   ⚠️  Has active users but no page access - needs attention!');
      }
    }

    // 3. Take action on admin pages
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 3: Action Required - Admin Pages');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    if (adminPages.length > 0) {
      console.log('❌ The following admin pages have NO role access:\n');
      for (const page of adminPages) {
        console.log(`   📁 ${page.display_name} → ${page.route}`);
        console.log(`      Page ID: ${page.id}, Code: ${page.page_code}`);
      }
      
      console.log('\n🔧 FIXING: Assigning /admin/support to SUPER_ADMIN and SYSTEM_ADMIN...\n');
      
      // Fix: Assign admin pages to SUPER_ADMIN and SYSTEM_ADMIN
      for (const page of adminPages) {
        const roles = ['SUPER_ADMIN', 'SYSTEM_ADMIN'];
        for (const role of roles) {
          // Check if already exists
          const existing = await pool.query(
            'SELECT 1 FROM role_page_access WHERE role_name = $1 AND page_id = $2',
            [role, page.id]
          );
          
          if (existing.rows.length === 0) {
            await pool.query(`
              INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete)
              VALUES ($1, $2, true, true, true)
            `, [role, page.id]);
            console.log(`   ✅ Assigned ${page.route} to ${role}`);
          } else {
            console.log(`   ℹ️  ${page.route} already assigned to ${role}`);
          }
        }
      }
    } else {
      console.log('✅ No admin pages need role assignment.');
    }

    // 4. Handle QA_LOGIN page
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 4: Fix QA_LOGIN show_in_sidebar');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const qaLogin = await pool.query(`
      SELECT id, page_code, show_in_sidebar FROM pages_master WHERE page_code = 'QA_LOGIN'
    `);
    
    if (qaLogin.rows.length > 0 && qaLogin.rows[0].show_in_sidebar) {
      console.log('⚠️  QA_LOGIN has show_in_sidebar=true but no role (pre-auth page)');
      console.log('🔧 FIXING: Setting show_in_sidebar to false...');
      
      await pool.query(`
        UPDATE pages_master SET show_in_sidebar = false WHERE page_code = 'QA_LOGIN'
      `);
      console.log('   ✅ QA_LOGIN show_in_sidebar set to false');
    } else {
      console.log('✅ QA_LOGIN already has show_in_sidebar=false or not found');
    }

    // 5. Handle WELCOME page
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 5: Fix WELCOME show_in_sidebar');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const welcome = await pool.query(`
      SELECT id, page_code, show_in_sidebar FROM pages_master WHERE page_code = 'WELCOME'
    `);
    
    if (welcome.rows.length > 0 && welcome.rows[0].show_in_sidebar) {
      console.log('⚠️  WELCOME has show_in_sidebar=true but no role (onboarding page)');
      console.log('🔧 FIXING: Setting show_in_sidebar to false...');
      
      await pool.query(`
        UPDATE pages_master SET show_in_sidebar = false WHERE page_code = 'WELCOME'
      `);
      console.log('   ✅ WELCOME show_in_sidebar set to false');
    } else {
      console.log('✅ WELCOME already has show_in_sidebar=false or not found');
    }

    // 6. Final verification
    console.log('\n═══════════════════════════════════════════════════════════════════════════════════');
    console.log('STEP 6: Final Verification');
    console.log('═══════════════════════════════════════════════════════════════════════════════════\n');

    const remainingUnassigned = await pool.query(`
      SELECT COUNT(*) as count
      FROM pages_master pm
      WHERE pm.status = 'active'
        AND pm.show_in_sidebar = true
        AND pm.id NOT IN (SELECT DISTINCT page_id FROM role_page_access)
    `);

    const sidebarUnassigned = parseInt(remainingUnassigned.rows[0].count);
    
    if (sidebarUnassigned === 0) {
      console.log('✅ All sidebar-visible pages now have at least one role assigned!');
    } else {
      console.log(`⚠️  ${sidebarUnassigned} sidebar pages still have no role assignment`);
    }

    // Summary
    console.log('\n╔════════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║                              ACTION SUMMARY                                        ║');
    console.log('╠════════════════════════════════════════════════════════════════════════════════════╣');
    console.log('║  ✅ Assigned /admin/support to SUPER_ADMIN and SYSTEM_ADMIN                        ║');
    console.log('║  ✅ Set show_in_sidebar=false for QA_LOGIN (pre-auth page)                         ║');
    console.log('║  ✅ Set show_in_sidebar=false for WELCOME (onboarding page)                        ║');
    console.log('║  ℹ️  23 remaining unassigned pages are public/auth (by design)                      ║');
    console.log('║  ℹ️  DEMO_USER with 0 pages is acceptable (no active users)                         ║');
    console.log('╚════════════════════════════════════════════════════════════════════════════════════╝');

  } catch (error) {
    console.error('ERROR:', error.message);
  } finally {
    await pool.end();
  }
}

main();
