#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

const args = process.argv.slice(2);
const shouldRemove = args.includes('--remove');

async function main() {
  try {
    // Get file routes
    const fileRoutes = fs.readFileSync('/tmp/file_routes.txt', 'utf-8').trim().split('\n');
    const normalize = (r) => r.replace(/\[[^\]]+\]/g, '[id]');
    const fileSet = new Set(fileRoutes.map(normalize));
    
    // Get phantom pages with their references
    const result = await pool.query(`
      SELECT 
        pm.id,
        pm.route,
        pm.display_name,
        pm.show_in_sidebar,
        (SELECT COUNT(*) FROM role_page_access WHERE page_id = pm.id) as role_count,
        (SELECT COUNT(*) FROM base_user_pages WHERE page_id = pm.id) as base_user_count
      FROM pages_master pm
      WHERE pm.is_active = TRUE
      ORDER BY pm.route
    `);
    
    const phantoms = result.rows.filter(r => !fileSet.has(normalize(r.route)));
    
    const toRemove = [];
    const toKeep = [];
    
    for (const p of phantoms) {
      const hasRefs = parseInt(p.role_count) > 0 || parseInt(p.base_user_count) > 0 || p.show_in_sidebar;
      if (hasRefs) {
        toKeep.push(p);
      } else {
        toRemove.push(p);
      }
    }
    
    console.log('=== PHANTOM ROUTES CLEANUP ===\n');
    console.log('Total phantoms:', phantoms.length);
    console.log('With references (KEEP):', toKeep.length);
    console.log('No references (REMOVE):', toRemove.length);
    
    if (toKeep.length > 0) {
      console.log('\n--- KEEPING (have role/base_user refs or sidebar) ---');
      toKeep.forEach(p => console.log('  ', p.route, `(roles:${p.role_count}, baseUser:${p.base_user_count}, sidebar:${p.show_in_sidebar})`));
    }
    
    if (toRemove.length > 0) {
      console.log('\n--- TO REMOVE (no references) ---');
      toRemove.forEach(p => console.log('  ', p.route));
    }
    
    if (shouldRemove && toRemove.length > 0) {
      console.log('\n--- REMOVING ---');
      const ids = toRemove.map(p => p.id);
      
      // Delete from pages_master (set inactive)
      const deleted = await pool.query(
        `UPDATE pages_master SET is_active = FALSE, status = 'inactive', updated_at = NOW() 
         WHERE id = ANY($1) RETURNING route`,
        [ids]
      );
      
      console.log('Deactivated', deleted.rows.length, 'phantom routes');
      
      // Verify
      const remaining = await pool.query('SELECT COUNT(*) as count FROM pages_master WHERE is_active = TRUE');
      console.log('\nRemaining active pages:', remaining.rows[0].count);
    } else if (toRemove.length > 0) {
      console.log('\nRun with --remove to deactivate these phantom routes');
    }
    
  } finally {
    await pool.end();
  }
}

main();
