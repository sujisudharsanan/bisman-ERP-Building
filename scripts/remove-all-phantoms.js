#!/usr/bin/env node
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function main() {
  try {
    // Get file routes
    const fileRoutes = fs.readFileSync('/tmp/file_routes.txt', 'utf-8').trim().split('\n');
    const normalize = (r) => r.replace(/\[[^\]]+\]/g, '[id]');
    const fileSet = new Set(fileRoutes.map(normalize));
    
    // Get all phantom pages
    const result = await pool.query('SELECT id, route FROM pages_master WHERE is_active = TRUE ORDER BY route');
    const phantoms = result.rows.filter(r => !fileSet.has(normalize(r.route)));
    
    console.log('Phantom routes to remove:', phantoms.length);
    phantoms.forEach(p => console.log('  ', p.route));
    
    if (phantoms.length > 0) {
      const ids = phantoms.map(p => p.id);
      
      // First remove role_page_access references
      const roleDeleted = await pool.query(
        'DELETE FROM role_page_access WHERE page_id = ANY($1) RETURNING page_id',
        [ids]
      );
      console.log('\nDeleted role_page_access entries:', roleDeleted.rows.length);
      
      // Remove base_user_pages references
      const baseDeleted = await pool.query(
        'DELETE FROM base_user_pages WHERE page_id = ANY($1) RETURNING page_id',
        [ids]
      );
      console.log('Deleted base_user_pages entries:', baseDeleted.rows.length);
      
      // Deactivate the pages
      const pagesDeleted = await pool.query(
        `UPDATE pages_master SET is_active = FALSE, status = 'inactive', show_in_sidebar = FALSE, updated_at = NOW() WHERE id = ANY($1) RETURNING route`,
        [ids]
      );
      console.log('Deactivated pages:', pagesDeleted.rows.length);
      
      // Verify
      const remaining = await pool.query('SELECT COUNT(*) as count FROM pages_master WHERE is_active = TRUE');
      console.log('\n=== RESULT ===');
      console.log('Remaining active pages:', remaining.rows[0].count);
    }
    
  } finally {
    await pool.end();
  }
}

main();
