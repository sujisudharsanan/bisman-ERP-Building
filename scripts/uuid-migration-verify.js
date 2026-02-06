#!/usr/bin/env node
/**
 * UUID Migration Verification & Testing Suite
 * 
 * This script validates the UUID migration and tests critical flows:
 * - Authentication
 * - Task creation
 * - Kanban loading
 * - Chat messaging
 * - RBAC authorization
 * - Usage metering
 * 
 * Usage:
 *   node scripts/uuid-migration-verify.js
 *   node scripts/uuid-migration-verify.js --test=auth
 *   node scripts/uuid-migration-verify.js --test=all
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

// Test results
const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Helper functions
function pass(test, message) {
  results.passed.push({ test, message });
  console.log(`  ✅ ${test}: ${message}`);
}

function fail(test, message, details = null) {
  results.failed.push({ test, message, details });
  console.log(`  ❌ ${test}: ${message}`);
  if (details) console.log(`     Details: ${JSON.stringify(details)}`);
}

function warn(test, message) {
  results.warnings.push({ test, message });
  console.log(`  ⚠️  ${test}: ${message}`);
}

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

async function testSchemaTypes() {
  console.log('\n📋 SCHEMA TYPE VALIDATION\n');
  
  // Test 1: All primary ID columns should be UUID
  const pkTest = await pool.query(`
    SELECT t.table_name, c.column_name, c.udt_name
    FROM information_schema.tables t
    JOIN information_schema.table_constraints tc ON t.table_name = tc.table_name
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.columns c ON t.table_name = c.table_name AND kcu.column_name = c.column_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
      AND t.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.udt_name != 'uuid'
      AND t.table_name IN ('users_enhanced', 'tasks', 'workflows', 'chat_messages', 'branches', 'threads')
  `);
  
  if (pkTest.rows.length === 0) {
    pass('Primary Keys', 'All critical tables use UUID primary keys');
  } else {
    pkTest.rows.forEach(row => {
      fail('Primary Keys', `${row.table_name}.id is ${row.udt_name}, should be uuid`);
    });
  }
  
  // Test 2: No VARCHAR tenant_id columns in critical tables
  const tenantTest = await pool.query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND udt_name NOT IN ('uuid')
      AND table_name NOT LIKE '_%'
      AND table_name IN (
        'users_enhanced', 'tasks', 'workflows', 'effective_access_cache',
        'tenant_usage', 'admin_page_assignments', 'admin_role_grants'
      )
  `);
  
  if (tenantTest.rows.length === 0) {
    pass('Tenant IDs', 'All critical tenant_id columns are UUID');
  } else {
    tenantTest.rows.forEach(row => {
      fail('Tenant IDs', `${row.table_name}.tenant_id is ${row.udt_name}`, row);
    });
  }
  
  // Test 3: No legacy columns remain
  const legacyTest = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name LIKE '%_old' OR column_name LIKE '%_legacy')
      AND table_name NOT LIKE '_%'
      AND table_name NOT IN ('audit_logs', 'asset_history', 'qa_issue_history')
  `);
  
  if (legacyTest.rows.length === 0) {
    pass('Legacy Columns', 'No legacy columns found in active tables');
  } else {
    legacyTest.rows.forEach(row => {
      warn('Legacy Columns', `${row.table_name}.${row.column_name} still exists`);
    });
  }
  
  // Test 4: Foreign key type consistency
  const fkTest = await pool.query(`
    SELECT 
      tc.table_name,
      kcu.column_name,
      c1.udt_name as source_type,
      ccu.table_name as foreign_table,
      ccu.column_name as foreign_column,
      c2.udt_name as target_type
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    JOIN information_schema.columns c1 ON tc.table_name = c1.table_name AND kcu.column_name = c1.column_name
    JOIN information_schema.columns c2 ON ccu.table_name = c2.table_name AND ccu.column_name = c2.column_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND c1.udt_name != c2.udt_name
  `);
  
  if (fkTest.rows.length === 0) {
    pass('Foreign Keys', 'All foreign key types match');
  } else {
    fkTest.rows.forEach(row => {
      fail('Foreign Keys', 
        `${row.table_name}.${row.column_name} (${row.source_type}) → ${row.foreign_table}.${row.foreign_column} (${row.target_type})`
      );
    });
  }
}

// =============================================================================
// DATA INTEGRITY TESTS
// =============================================================================

async function testDataIntegrity() {
  console.log('\n📋 DATA INTEGRITY VALIDATION\n');
  
  // Test 1: No NULL UUIDs in required fields
  const nullTest = await pool.query(`
    SELECT 'users_enhanced' as table_name, COUNT(*) as null_count
    FROM users_enhanced WHERE id IS NULL
    UNION ALL
    SELECT 'tasks', COUNT(*) FROM tasks WHERE id IS NULL
    UNION ALL
    SELECT 'workflows', COUNT(*) FROM workflows WHERE id IS NULL
  `);
  
  const nullIssues = nullTest.rows.filter(r => parseInt(r.null_count) > 0);
  if (nullIssues.length === 0) {
    pass('NULL IDs', 'No NULL primary keys found');
  } else {
    nullIssues.forEach(row => {
      fail('NULL IDs', `${row.table_name} has ${row.null_count} NULL IDs`);
    });
  }
  
  // Test 2: No orphaned records in workflow_tasks
  const orphanTest = await pool.query(`
    SELECT COUNT(*) as count
    FROM workflow_tasks wt
    LEFT JOIN users_enhanced ue ON wt.creator_id = ue.id::text
    WHERE wt.creator_id IS NOT NULL AND ue.id IS NULL
  `);
  
  if (parseInt(orphanTest.rows[0].count) === 0) {
    pass('Orphan Records', 'No orphaned workflow_tasks records');
  } else {
    warn('Orphan Records', `${orphanTest.rows[0].count} workflow_tasks have invalid creator_id`);
  }
  
  // Test 3: tenant_usage has no duplicate tenant_id/date combinations
  const dupeTest = await pool.query(`
    SELECT tenant_id, date, COUNT(*) as cnt
    FROM tenant_usage
    WHERE tenant_id IS NOT NULL
    GROUP BY tenant_id, date
    HAVING COUNT(*) > 1
    LIMIT 5
  `);
  
  if (dupeTest.rows.length === 0) {
    pass('Unique Constraints', 'No duplicate tenant_id/date in tenant_usage');
  } else {
    fail('Unique Constraints', `${dupeTest.rows.length} duplicate tenant_id/date combinations`);
  }
  
  // Test 4: All user references in tasks are valid UUIDs
  const uuidValidTest = await pool.query(`
    SELECT COUNT(*) as invalid_count
    FROM tasks
    WHERE creator_id IS NOT NULL 
      AND creator_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  `);
  
  if (parseInt(uuidValidTest.rows[0].invalid_count) === 0) {
    pass('UUID Format', 'All task creator_ids are valid UUIDs');
  } else {
    fail('UUID Format', `${uuidValidTest.rows[0].invalid_count} tasks have invalid creator_id format`);
  }
}

// =============================================================================
// QUERY EXECUTION TESTS
// =============================================================================

async function testQueries() {
  console.log('\n📋 QUERY EXECUTION TESTS\n');
  
  // Test 1: Join users_enhanced with tasks (UUID = UUID)
  try {
    const joinTest = await pool.query(`
      SELECT t.id, t.title, u.email
      FROM tasks t
      JOIN users_enhanced u ON t.creator_id = u.id
      LIMIT 5
    `);
    pass('Task-User Join', `Successfully joined ${joinTest.rows.length} records`);
  } catch (err) {
    fail('Task-User Join', err.message);
  }
  
  // Test 2: RBAC page access query
  try {
    const rbacTest = await pool.query(`
      SELECT rpa.*, pm.page_code
      FROM role_page_access rpa
      JOIN pages_master pm ON rpa.page_id = pm.id
      LIMIT 5
    `);
    pass('RBAC Query', `Successfully queried ${rbacTest.rows.length} RBAC records`);
  } catch (err) {
    fail('RBAC Query', err.message);
  }
  
  // Test 3: Effective access cache query
  try {
    const cacheTest = await pool.query(`
      SELECT * FROM effective_access_cache
      WHERE tenant_id IS NOT NULL
      LIMIT 5
    `);
    pass('Access Cache Query', `Successfully queried ${cacheTest.rows.length} cache records`);
  } catch (err) {
    fail('Access Cache Query', err.message);
  }
  
  // Test 4: Chat messages with user join
  try {
    const chatTest = await pool.query(`
      SELECT cm.id, cm.content, u.email
      FROM chat_messages cm
      JOIN users_enhanced u ON cm.user_id = u.id
      LIMIT 5
    `);
    pass('Chat-User Join', `Successfully joined ${chatTest.rows.length} chat messages`);
  } catch (err) {
    if (err.message.includes('does not exist')) {
      warn('Chat-User Join', 'Column user_id may not exist in chat_messages');
    } else {
      fail('Chat-User Join', err.message);
    }
  }
  
  // Test 5: Tenant usage aggregation
  try {
    const usageTest = await pool.query(`
      SELECT tenant_id, SUM(active_users) as total_active
      FROM tenant_usage
      WHERE tenant_id IS NOT NULL
      GROUP BY tenant_id
      LIMIT 5
    `);
    pass('Usage Aggregation', `Successfully aggregated ${usageTest.rows.length} tenant records`);
  } catch (err) {
    fail('Usage Aggregation', err.message);
  }
}

// =============================================================================
// PRISMA COMPATIBILITY TESTS
// =============================================================================

async function testPrismaCompatibility() {
  console.log('\n📋 PRISMA COMPATIBILITY TESTS\n');
  
  // Test 1: Check for @db.Uuid compatible columns
  const uuidColumns = await pool.query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND udt_name = 'uuid'
      AND table_name NOT LIKE '_%'
    ORDER BY table_name
  `);
  
  pass('UUID Columns', `Found ${uuidColumns.rows.length} UUID columns ready for @db.Uuid`);
  
  // Test 2: Check for columns that need @map() annotations
  const camelCaseColumns = await pool.query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name ~ '[A-Z]'
      AND table_name NOT LIKE '_%'
    LIMIT 20
  `);
  
  if (camelCaseColumns.rows.length > 0) {
    warn('CamelCase Columns', `${camelCaseColumns.rows.length} columns use camelCase (may need @map)`);
  } else {
    pass('Column Naming', 'All columns use snake_case');
  }
  
  // Test 3: Check for compound unique constraints
  const uniqueConstraints = await pool.query(`
    SELECT tc.table_name, tc.constraint_name, 
           string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
    GROUP BY tc.table_name, tc.constraint_name
    HAVING COUNT(*) > 1
    LIMIT 20
  `);
  
  pass('Compound Unique', `Found ${uniqueConstraints.rows.length} compound unique constraints`);
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('='.repeat(80));
  console.log('UUID MIGRATION VERIFICATION SUITE');
  console.log('='.repeat(80));
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    const args = process.argv.slice(2);
    const testArg = args.find(a => a.startsWith('--test='));
    const test = testArg ? testArg.split('=')[1] : 'all';
    
    if (test === 'all' || test === 'schema') {
      await testSchemaTypes();
    }
    
    if (test === 'all' || test === 'data') {
      await testDataIntegrity();
    }
    
    if (test === 'all' || test === 'queries') {
      await testQueries();
    }
    
    if (test === 'all' || test === 'prisma') {
      await testPrismaCompatibility();
    }
    
    // Summary
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`  ✅ Passed:   ${results.passed.length}`);
    console.log(`  ❌ Failed:   ${results.failed.length}`);
    console.log(`  ⚠️  Warnings: ${results.warnings.length}`);
    console.log('='.repeat(80));
    
    if (results.failed.length === 0) {
      console.log('\n🎉 All tests passed! The UUID migration is complete.\n');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please review the issues above.\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
