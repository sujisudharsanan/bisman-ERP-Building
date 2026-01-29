/* eslint-env node, commonjs, es6 */
/* global console, require, module, process */
/**
 * Migration 043: Add Compulsory and Default Page Columns
 * =========================================================
 * 
 * PURPOSE:
 * Define platform-guaranteed pages that cannot be revoked and default pages
 * that are auto-assigned to new roles.
 * 
 * SCHEMA CHANGES:
 * - Add is_compulsory: Pages that are ALWAYS accessible (cannot be revoked)
 * - Add is_default_for_roles: Pages auto-selected when creating new roles
 * 
 * PAGE CLASSIFICATION:
 * - Compulsory: Dashboard, Settings, Calendar, Notifications, Profile
 * - Default: Core workflows that new roles should have by default
 * 
 * @migration 043
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function migrate() {
  const pool = new Pool({ connectionString: DATABASE_URL });
  
  console.log('🚀 Migration 043: Adding compulsory and default page columns...\n');
  
  try {
    // =========================================================================
    // STEP 1: Add columns to pages_master
    // =========================================================================
    console.log('STEP 1: Adding columns to pages_master...');
    
    // Check if columns exist
    const existingCols = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'pages_master' 
        AND column_name IN ('is_compulsory', 'is_default_for_roles')
    `);
    
    const existingColNames = existingCols.rows.map(r => r.column_name);
    
    if (!existingColNames.includes('is_compulsory')) {
      await pool.query(`
        ALTER TABLE pages_master 
        ADD COLUMN is_compulsory BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('   ✅ Added is_compulsory column');
    } else {
      console.log('   ℹ️  is_compulsory column already exists');
    }
    
    if (!existingColNames.includes('is_default_for_roles')) {
      await pool.query(`
        ALTER TABLE pages_master 
        ADD COLUMN is_default_for_roles BOOLEAN NOT NULL DEFAULT false
      `);
      console.log('   ✅ Added is_default_for_roles column');
    } else {
      console.log('   ℹ️  is_default_for_roles column already exists');
    }
    
    // =========================================================================
    // STEP 2: Mark compulsory pages
    // =========================================================================
    console.log('\nSTEP 2: Marking compulsory pages...');
    
    // These pages are PLATFORM GUARANTEES - users cannot function without them
    const compulsoryPages = [
      // Dashboard - landing page
      'DASHBOARD',
      'ADMIN_DASHBOARD',
      'SUPER_ADMIN_DASHBOARD',
      'ENTERPRISE_ADMIN_DASHBOARD',
      
      // User profile and settings
      'USER_PROFILE',
      'USER_SETTINGS',
      'COMMON_USER_SETTINGS',
      
      // Calendar - core utility
      'COMMON_CALENDAR',
      'CALENDAR',
      
      // Notifications - system messages
      'COMMON_NOTIFICATIONS',
      'NOTIFICATIONS',
      
      // Chat - communication
      'CHAT',
      'COMMON_CHAT'
    ];
    
    const compulsoryResult = await pool.query(`
      UPDATE pages_master 
      SET is_compulsory = true, is_default_for_roles = true
      WHERE page_code = ANY($1::text[])
      RETURNING page_code, display_name
    `, [compulsoryPages]);
    
    console.log(`   ✅ Marked ${compulsoryResult.rowCount} pages as compulsory:`);
    compulsoryResult.rows.forEach(r => console.log(`      - ${r.page_code}: ${r.display_name}`));
    
    // =========================================================================
    // STEP 3: Mark default pages for roles
    // =========================================================================
    console.log('\nSTEP 3: Marking default pages for new roles...');
    
    // These pages are auto-selected for new roles but CAN be removed with warning
    const defaultPages = [
      // Analytics - basic reporting
      'COMMON_ANALYTICS',
      'ANALYTICS',
      
      // Help/Support
      'HELP',
      'SUPPORT',
      
      // Basic task management
      'TASK_LIST',
      'TASK_MANAGEMENT',
      
      // Basic inventory view
      'INVENTORY_VIEW',
      
      // Basic reports
      'REPORTS_VIEW'
    ];
    
    const defaultResult = await pool.query(`
      UPDATE pages_master 
      SET is_default_for_roles = true
      WHERE page_code = ANY($1::text[])
        AND is_compulsory = false
      RETURNING page_code, display_name
    `, [defaultPages]);
    
    console.log(`   ✅ Marked ${defaultResult.rowCount} additional pages as default:`);
    defaultResult.rows.forEach(r => console.log(`      - ${r.page_code}: ${r.display_name}`));
    
    // =========================================================================
    // STEP 4: Create index for performance
    // =========================================================================
    console.log('\nSTEP 4: Creating indexes...');
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pages_master_compulsory 
      ON pages_master (is_compulsory) 
      WHERE is_compulsory = true
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_pages_master_default_roles 
      ON pages_master (is_default_for_roles) 
      WHERE is_default_for_roles = true
    `);
    
    console.log('   ✅ Indexes created');
    
    // =========================================================================
    // STEP 5: Verify
    // =========================================================================
    console.log('\nSTEP 5: Verification...');
    
    const stats = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE is_compulsory = true) as compulsory_count,
        COUNT(*) FILTER (WHERE is_default_for_roles = true) as default_count,
        COUNT(*) as total_pages
      FROM pages_master
      WHERE status = 'active'
    `);
    
    console.log(`   📊 Compulsory pages: ${stats.rows[0].compulsory_count}`);
    console.log(`   📊 Default pages: ${stats.rows[0].default_count}`);
    console.log(`   📊 Total active pages: ${stats.rows[0].total_pages}`);
    
    console.log('\n✅ Migration 043 completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  migrate().catch(err => {
    console.error('Migration error:', err);
    process.exit(1);
  });
}

module.exports = { migrate };
