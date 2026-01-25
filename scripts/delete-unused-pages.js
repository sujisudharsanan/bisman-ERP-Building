/**
 * Script to delete unused pages from the database
 * Pages being removed:
 * - /ai-training
 * - /clients/usage-dashboard
 * - /hub-incharge
 * - /legal
 * - /banker
 * - /task-dashboard
 * - /trace
 * - /tasks/clarifications
 * - /tasks/reviews
 * - /staff
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

const PAGES_TO_DELETE = [
  '/ai-training',
  '/clients/usage-dashboard',
  '/hub-incharge',
  '/legal',
  '/banker',
  '/task-dashboard',
  '/trace',
  '/tasks/clarifications',
  '/tasks/reviews',
  '/staff',
];

async function main() {
  console.log('=== DELETE UNUSED PAGES ===\n');
  
  try {
    // First, find the page IDs
    const pagesResult = await pool.query(
      `SELECT id, page_code, route, display_name FROM pages_master WHERE route = ANY($1)`,
      [PAGES_TO_DELETE]
    );
    
    if (pagesResult.rows.length === 0) {
      console.log('No matching pages found in database.');
      return;
    }
    
    console.log('Pages to delete:');
    console.table(pagesResult.rows);
    
    const pageIds = pagesResult.rows.map(r => r.id);
    
    // Delete role_page_access entries first (foreign key constraint)
    const roleAccessResult = await pool.query(
      `DELETE FROM role_page_access WHERE page_id = ANY($1) RETURNING page_id, role_name`,
      [pageIds]
    );
    console.log(`\nDeleted ${roleAccessResult.rowCount} role_page_access entries`);
    
    // Delete the pages from pages_master
    const pagesDeleteResult = await pool.query(
      `DELETE FROM pages_master WHERE id = ANY($1) RETURNING id, page_code, route`,
      [pageIds]
    );
    console.log(`Deleted ${pagesDeleteResult.rowCount} pages from pages_master`);
    
    console.log('\n=== DELETION COMPLETE ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
