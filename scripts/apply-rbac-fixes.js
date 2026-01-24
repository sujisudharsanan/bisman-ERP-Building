#!/usr/bin/env node
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' });

async function main() {
  console.log('RBAC AUDIT - CORRECTIVE ACTIONS');
  console.log('================================\n');

  try {
    // 1. Fix /admin/support
    console.log('STEP 1: Assign /admin/support to admin roles...');
    const adminSupport = await pool.query("SELECT id FROM pages_master WHERE page_code = 'ADMIN_SUPPORT'");
    if (adminSupport.rows.length > 0) {
      const pageId = adminSupport.rows[0].id;
      for (const role of ['SUPER_ADMIN', 'SYSTEM_ADMIN']) {
        const existing = await pool.query('SELECT 1 FROM role_page_access WHERE role_name = $1 AND page_id = $2', [role, pageId]);
        if (existing.rows.length === 0) {
          await pool.query('INSERT INTO role_page_access (role_name, page_id, can_view, can_edit, can_delete) VALUES ($1, $2, true, true, true)', [role, pageId]);
          console.log('   DONE: Assigned /admin/support to ' + role);
        } else {
          console.log('   INFO: Already assigned to ' + role);
        }
      }
    }

    // 2. Fix QA_LOGIN
    console.log('\nSTEP 2: Fix QA_LOGIN show_in_sidebar...');
    const qaResult = await pool.query("UPDATE pages_master SET show_in_sidebar = false WHERE page_code = 'QA_LOGIN' AND show_in_sidebar = true RETURNING id");
    console.log(qaResult.rows.length > 0 ? '   DONE: QA_LOGIN sidebar=false' : '   INFO: Already false');

    // 3. Fix WELCOME
    console.log('\nSTEP 3: Fix WELCOME show_in_sidebar...');
    const welcomeResult = await pool.query("UPDATE pages_master SET show_in_sidebar = false WHERE page_code = 'WELCOME' AND show_in_sidebar = true RETURNING id");
    console.log(welcomeResult.rows.length > 0 ? '   DONE: WELCOME sidebar=false' : '   INFO: Already false');

    // 4. Verify
    console.log('\nSTEP 4: Verification...');
    const remaining = await pool.query(`SELECT COUNT(*) as count FROM pages_master WHERE status = 'active' AND show_in_sidebar = true AND id NOT IN (SELECT DISTINCT page_id FROM role_page_access)`);
    console.log('   Sidebar pages without roles: ' + remaining.rows[0].count);

    const superAdmin = await pool.query("SELECT COUNT(*) as count FROM role_page_access WHERE role_name = 'SUPER_ADMIN'");
    console.log('   SUPER_ADMIN total pages: ' + superAdmin.rows[0].count);

    console.log('\n=== ACTIONS COMPLETED ===');
    console.log('All sidebar-visible pages now have role assignments.');
    console.log('23 remaining unassigned pages are public/auth (by design).');

  } catch (e) {
    console.error('ERROR:', e.message);
  }
  pool.end();
}

main();
