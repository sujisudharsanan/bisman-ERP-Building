#!/usr/bin/env node
/**
 * Post-Migration Verification Check
 * Checks the state of the database after UUID migration
 */

const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

async function runCheck() {
  console.log('='.repeat(60));
  console.log('POST-MIGRATION VERIFICATION');
  console.log('='.repeat(60));
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // 1. Non-UUID primary keys
    const nonUuidPK = await pool.query(`
      SELECT t.table_name, c.column_name, c.data_type
      FROM information_schema.columns c
      JOIN information_schema.tables t ON t.table_name = c.table_name
      WHERE t.table_schema = 'public'
        AND c.column_name = 'id'
        AND c.data_type NOT IN ('uuid')
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);
    
    console.log('\n📋 NON-UUID PRIMARY KEY TABLES:');
    if (nonUuidPK.rows.length > 0) {
      console.table(nonUuidPK.rows);
    } else {
      console.log('  ✅ All primary keys are UUID!');
    }

    // 2. Legacy _old columns
    const oldCols = await pool.query(`
      SELECT table_name, column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND column_name LIKE '%_old'
      ORDER BY table_name
    `);
    
    console.log('\n📋 LEGACY _OLD COLUMNS:');
    if (oldCols.rows.length > 0) {
      console.table(oldCols.rows);
    } else {
      console.log('  ✅ No legacy _old columns remaining!');
    }

    // 3. Non-UUID tenant_id columns
    const textTenant = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
        AND data_type NOT IN ('uuid')
    `);
    
    console.log('\n📋 NON-UUID TENANT_ID COLUMNS:');
    if (textTenant.rows.length > 0) {
      console.table(textTenant.rows);
    } else {
      console.log('  ✅ All tenant_id columns are UUID!');
    }

    // 4. INTEGER user references
    const intUserRefs = await pool.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (column_name LIKE '%user_id' 
             OR column_name LIKE '%sender_id%' 
             OR column_name LIKE '%approver_id%'
             OR column_name LIKE '%creator_id%'
             OR column_name LIKE '%assignee_id%')
        AND data_type = 'integer'
    `);
    
    console.log('\n📋 INTEGER USER REFERENCE COLUMNS:');
    if (intUserRefs.rows.length > 0) {
      console.table(intUserRefs.rows);
    } else {
      console.log('  ✅ All user references are UUID!');
    }

    // 5. Summary statistics
    const totalUuid = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND data_type = 'uuid'
    `);

    const totalTables = await pool.query(`
      SELECT COUNT(*) as count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);

    console.log('\n📊 SUMMARY STATISTICS:');
    console.log(`  - Total UUID columns: ${totalUuid.rows[0].count}`);
    console.log(`  - Total tables: ${totalTables.rows[0].count}`);
    console.log(`  - Non-UUID PKs remaining: ${nonUuidPK.rows.length}`);
    console.log(`  - Legacy _old columns: ${oldCols.rows.length}`);
    console.log(`  - Non-UUID tenant_ids: ${textTenant.rows.length}`);
    console.log(`  - Integer user refs: ${intUserRefs.rows.length}`);

    // 6. Critical tables check
    console.log('\n📋 CRITICAL TABLES COLUMN TYPES:');
    const criticalTables = ['users', 'tenants', 'tasks', 'chat_conversations', 'chat_messages', 'threads', 'thread_messages'];
    
    for (const table of criticalTables) {
      const cols = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name IN ('id', 'user_id', 'tenant_id', 'created_by', 'sender_id')
        ORDER BY column_name
      `, [table]);
      
      if (cols.rows.length > 0) {
        console.log(`\n  ${table}:`);
        cols.rows.forEach(r => {
          const icon = r.data_type === 'uuid' ? '✅' : '⚠️';
          console.log(`    ${icon} ${r.column_name}: ${r.data_type}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION COMPLETE');
    console.log('='.repeat(60));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

runCheck();
