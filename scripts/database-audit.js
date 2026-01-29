#!/usr/bin/env node
/**
 * 🧠🧱 COMPLETE DATABASE AUDIT (PRODUCTION-GRADE)
 * Scope: Schema · Data · Security · Performance · Governance · Scalability
 * 
 * Run: node scripts/database-audit.js
 */

const { Pool } = require('pg');

const CONNECTION_STRING = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: CONNECTION_STRING });

// Audit results storage
const audit = {
  timestamp: new Date().toISOString(),
  phases: {},
  summary: {
    passed: 0,
    failed: 0,
    warnings: 0
  },
  verdict: 'PENDING'
};

// Helper functions
function log(msg) { console.log(msg); }
function pass(msg) { log(`   ✅ ${msg}`); audit.summary.passed++; }
function fail(msg) { log(`   ❌ ${msg}`); audit.summary.failed++; }
function warn(msg) { log(`   ⚠️  ${msg}`); audit.summary.warnings++; }
function info(msg) { log(`   ℹ️  ${msg}`); }

async function query(sql, params = []) {
  const result = await pool.query(sql, params);
  return result.rows;
}

// ============================================================================
// PHASE 0: DATABASE TRUTH SNAPSHOT
// ============================================================================
async function phase0_inventory() {
  log('\n' + '='.repeat(70));
  log('📦 PHASE 0: DATABASE TRUTH SNAPSHOT');
  log('='.repeat(70));
  
  const phase = { tables: [], views: [], functions: [], indexes: [], triggers: [], sequences: [], extensions: [], roles: [] };
  
  // Tables
  log('\n📋 Tables:');
  phase.tables = await query(`
    SELECT schemaname, tablename, tableowner
    FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  log(`   Found ${phase.tables.length} tables`);
  
  // Views
  log('\n📋 Views:');
  phase.views = await query(`
    SELECT schemaname, viewname, viewowner
    FROM pg_views WHERE schemaname = 'public'
  `);
  log(`   Found ${phase.views.length} views`);
  
  // Materialized Views
  const matViews = await query(`
    SELECT schemaname, matviewname, matviewowner
    FROM pg_matviews WHERE schemaname = 'public'
  `);
  log(`   Found ${matViews.length} materialized views`);
  
  // Functions
  log('\n📋 Functions:');
  phase.functions = await query(`
    SELECT routine_name, routine_type, data_type
    FROM information_schema.routines 
    WHERE routine_schema = 'public'
    ORDER BY routine_name
  `);
  log(`   Found ${phase.functions.length} functions`);
  
  // Indexes
  log('\n📋 Indexes:');
  phase.indexes = await query(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes WHERE schemaname = 'public'
  `);
  log(`   Found ${phase.indexes.length} indexes`);
  
  // Triggers
  log('\n📋 Triggers:');
  phase.triggers = await query(`
    SELECT trigger_name, event_object_table, action_timing, event_manipulation
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
  `);
  log(`   Found ${phase.triggers.length} triggers`);
  
  // Sequences
  log('\n📋 Sequences:');
  phase.sequences = await query(`
    SELECT sequencename, start_value, increment_by
    FROM pg_sequences WHERE schemaname = 'public'
  `);
  log(`   Found ${phase.sequences.length} sequences`);
  
  // Extensions
  log('\n📋 Extensions:');
  phase.extensions = await query(`SELECT extname, extversion FROM pg_extension`);
  log(`   Found ${phase.extensions.length} extensions: ${phase.extensions.map(e => e.extname).join(', ')}`);
  
  // Roles
  log('\n📋 Database Roles:');
  phase.roles = await query(`
    SELECT rolname, rolsuper, rolcreaterole, rolcreatedb, rolbypassrls, rolcanlogin
    FROM pg_roles WHERE rolname NOT LIKE 'pg_%'
  `);
  phase.roles.forEach(r => {
    const flags = [];
    if (r.rolsuper) flags.push('SUPERUSER');
    if (r.rolbypassrls) flags.push('BYPASSRLS');
    if (r.rolcanlogin) flags.push('LOGIN');
    log(`   ${r.rolname}: ${flags.join(', ') || 'no special flags'}`);
  });
  
  audit.phases.phase0 = phase;
  return phase;
}

// ============================================================================
// PHASE 1: SCHEMA STRUCTURAL AUDIT
// ============================================================================
async function phase1_schema() {
  log('\n' + '='.repeat(70));
  log('🏗️  PHASE 1: SCHEMA STRUCTURAL AUDIT');
  log('='.repeat(70));
  
  const phase = { issues: [], tables: [] };
  
  // Get all tables with their columns
  const tables = await query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  
  for (const t of tables) {
    const tableName = t.table_name;
    const tableAudit = { name: tableName, issues: [] };
    
    // Check primary key
    const pk = await query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY'
    `, [tableName]);
    
    if (pk.length === 0) {
      tableAudit.issues.push('NO_PRIMARY_KEY');
      phase.issues.push({ table: tableName, issue: 'NO_PRIMARY_KEY', severity: 'HIGH' });
    }
    
    // Check for created_at/updated_at
    const cols = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
    `, [tableName]);
    
    const colNames = cols.map(c => c.column_name);
    if (!colNames.includes('created_at') && !colNames.includes('createdat')) {
      tableAudit.issues.push('NO_CREATED_AT');
    }
    if (!colNames.includes('updated_at') && !colNames.includes('updatedat')) {
      tableAudit.issues.push('NO_UPDATED_AT');
    }
    
    // Check for JSON columns (potential misuse)
    const jsonCols = cols.filter(c => c.data_type === 'json' || c.data_type === 'jsonb');
    if (jsonCols.length > 3) {
      tableAudit.issues.push(`EXCESSIVE_JSON_COLUMNS: ${jsonCols.length}`);
      phase.issues.push({ table: tableName, issue: 'EXCESSIVE_JSON', severity: 'MEDIUM' });
    }
    
    phase.tables.push(tableAudit);
  }
  
  // Summary
  log('\n📊 Schema Audit Summary:');
  const noPK = phase.issues.filter(i => i.issue === 'NO_PRIMARY_KEY');
  if (noPK.length > 0) {
    fail(`${noPK.length} tables without primary key`);
    noPK.slice(0, 5).forEach(i => info(`  - ${i.table}`));
  } else {
    pass('All tables have primary keys');
  }
  
  const excessiveJson = phase.issues.filter(i => i.issue === 'EXCESSIVE_JSON');
  if (excessiveJson.length > 0) {
    warn(`${excessiveJson.length} tables with excessive JSON columns`);
  }
  
  audit.phases.phase1 = phase;
  return phase;
}

// ============================================================================
// PHASE 2: RELATIONAL INTEGRITY AUDIT
// ============================================================================
async function phase2_relations() {
  log('\n' + '='.repeat(70));
  log('🔗 PHASE 2: RELATIONAL INTEGRITY AUDIT');
  log('='.repeat(70));
  
  const phase = { foreignKeys: [], orphanRisks: [] };
  
  // Get all foreign keys
  phase.foreignKeys = await query(`
    SELECT
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule,
      rc.update_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
    ORDER BY tc.table_name
  `);
  
  log(`\n📊 Foreign Keys: ${phase.foreignKeys.length} found`);
  
  // Check cascade risks
  const cascades = phase.foreignKeys.filter(fk => fk.delete_rule === 'CASCADE');
  if (cascades.length > 0) {
    warn(`${cascades.length} CASCADE DELETE rules found - review for data safety`);
    cascades.slice(0, 3).forEach(c => info(`  - ${c.table_name}.${c.column_name} → ${c.foreign_table_name}`));
  }
  
  // Check for missing FKs on common patterns
  const tablesWithUserId = await query(`
    SELECT table_name FROM information_schema.columns
    WHERE column_name IN ('user_id', 'created_by', 'updated_by', 'assigned_to')
      AND table_schema = 'public'
  `);
  
  const tablesWithFK = new Set(phase.foreignKeys.map(fk => fk.table_name));
  const potentialMissing = tablesWithUserId.filter(t => !tablesWithFK.has(t.table_name));
  
  if (potentialMissing.length > 0) {
    warn(`${potentialMissing.length} tables have user_id columns without FK constraints`);
  }
  
  pass(`Foreign key audit complete`);
  
  audit.phases.phase2 = phase;
  return phase;
}

// ============================================================================
// PHASE 3: TENANCY & ISOLATION AUDIT
// ============================================================================
async function phase3_tenancy() {
  log('\n' + '='.repeat(70));
  log('🏢 PHASE 3: TENANCY & ISOLATION AUDIT');
  log('='.repeat(70));
  
  const phase = { tablesWithTenant: [], tablesWithoutTenant: [], rlsEnabled: [] };
  
  // Find tables with tenant_id
  phase.tablesWithTenant = await query(`
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'tenant_id' AND table_schema = 'public'
  `);
  
  // Find business tables without tenant_id
  const allTables = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  
  const tenantTables = new Set(phase.tablesWithTenant.map(t => t.table_name));
  const systemTables = ['_prisma_migrations', 'schema_migrations', 'spatial_ref_sys', 'security_access_log'];
  
  phase.tablesWithoutTenant = allTables
    .map(t => t.table_name)
    .filter(t => !tenantTables.has(t) && !systemTables.includes(t) && !t.startsWith('_'));
  
  log(`\n📊 Tenancy Analysis:`);
  log(`   Tables with tenant_id: ${phase.tablesWithTenant.length}`);
  log(`   Tables without tenant_id: ${phase.tablesWithoutTenant.length}`);
  
  // Check RLS status
  phase.rlsEnabled = await query(`
    SELECT relname, relrowsecurity, relforcerowsecurity
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relkind = 'r'
      AND relrowsecurity = true
  `);
  
  log(`   Tables with RLS enabled: ${phase.rlsEnabled.length}`);
  
  if (phase.rlsEnabled.length > 0) {
    pass(`RLS enabled on ${phase.rlsEnabled.length} tables`);
  } else {
    warn('No RLS policies detected');
  }
  
  // Flag critical business tables without tenant isolation
  const criticalTables = ['tasks', 'payments', 'invoices', 'contracts', 'users'];
  const unprotected = phase.tablesWithoutTenant.filter(t => 
    criticalTables.some(ct => t.toLowerCase().includes(ct))
  );
  
  if (unprotected.length > 0) {
    warn(`Critical tables potentially missing tenant isolation: ${unprotected.join(', ')}`);
  }
  
  audit.phases.phase3 = phase;
  return phase;
}

// ============================================================================
// PHASE 4: DATA OWNERSHIP & SCOPE AUDIT
// ============================================================================
async function phase4_ownership() {
  log('\n' + '='.repeat(70));
  log('👤 PHASE 4: DATA OWNERSHIP & SCOPE AUDIT');
  log('='.repeat(70));
  
  const phase = { ownership: [] };
  
  // Check for ownership columns
  const ownershipColumns = ['created_by', 'updated_by', 'assigned_to', 'owner_id', 'user_id'];
  
  for (const col of ownershipColumns) {
    const tables = await query(`
      SELECT table_name FROM information_schema.columns
      WHERE column_name = $1 AND table_schema = 'public'
    `, [col]);
    phase.ownership.push({ column: col, tableCount: tables.length });
    log(`   ${col}: ${tables.length} tables`);
  }
  
  // Check for org/department scoping
  const scopeColumns = await query(`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE column_name IN ('department_id', 'branch_id', 'org_unit_id', 'data_scope')
      AND table_schema = 'public'
  `);
  
  log(`\n📊 Scope columns found: ${scopeColumns.length}`);
  if (scopeColumns.length > 0) {
    pass(`Data scoping columns present in ${scopeColumns.length} locations`);
  }
  
  audit.phases.phase4 = phase;
  return phase;
}

// ============================================================================
// PHASE 5: SECURITY & ACCESS CONTROL AUDIT
// ============================================================================
async function phase5_security() {
  log('\n' + '='.repeat(70));
  log('🔐 PHASE 5: SECURITY & ACCESS CONTROL AUDIT');
  log('='.repeat(70));
  
  const phase = { authTables: [], rbacTables: [], issues: [] };
  
  // Check authentication tables
  log('\n📋 Authentication Tables:');
  
  const usersTable = await query(`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'users_enhanced' AND table_schema = 'public'
  `);
  
  if (usersTable.length > 0) {
    const cols = usersTable.map(c => c.column_name);
    
    // Check password storage
    if (cols.includes('password') || cols.includes('password_hash')) {
      pass('Password column exists');
    } else {
      fail('No password column found in users_enhanced');
    }
    
    // Check MFA
    if (cols.includes('mfa_enabled') || cols.includes('two_factor_enabled')) {
      pass('MFA support present');
    } else {
      warn('No MFA columns detected');
    }
    
    phase.authTables.push({ table: 'users_enhanced', columns: cols });
  }
  
  // Check session management
  const sessionTables = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name LIKE '%session%' AND table_schema = 'public'
  `);
  log(`   Session tables: ${sessionTables.length}`);
  
  // Check RBAC tables
  log('\n📋 RBAC Tables:');
  const rbacTables = ['rbac_roles', 'role_page_access', 'admin_page_assignments', 'pages_master'];
  
  for (const table of rbacTables) {
    const exists = await query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = $1 AND table_schema = 'public'
    `, [table]);
    
    if (exists.length > 0) {
      pass(`${table} exists`);
      phase.rbacTables.push(table);
    } else {
      fail(`${table} missing`);
    }
  }
  
  audit.phases.phase5 = phase;
  return phase;
}

// ============================================================================
// PHASE 6: RLS READINESS AUDIT
// ============================================================================
async function phase6_rls() {
  log('\n' + '='.repeat(70));
  log('🛡️  PHASE 6: ROW-LEVEL SECURITY READINESS');
  log('='.repeat(70));
  
  const phase = { rlsTables: [], policies: [], contextFunctions: [] };
  
  // Check RLS-enabled tables
  phase.rlsTables = await query(`
    SELECT c.relname as table_name, c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.relname
  `);
  
  const rlsCount = phase.rlsTables.filter(t => t.rls_enabled).length;
  log(`\n📊 RLS Status: ${rlsCount}/${phase.rlsTables.length} tables with RLS enabled`);
  
  // Check RLS policies
  phase.policies = await query(`
    SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
    FROM pg_policies WHERE schemaname = 'public'
  `);
  log(`   Total RLS policies: ${phase.policies.length}`);
  
  // Check security context functions
  const contextFuncs = await query(`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public' 
      AND routine_name IN ('set_security_context', 'is_security_context_set', 'get_current_tenant_id')
  `);
  
  log(`\n📋 Security Context Functions:`);
  contextFuncs.forEach(f => pass(`${f.routine_name}() exists`));
  
  if (rlsCount > 15) {
    pass(`RLS enabled on ${rlsCount} tables - good coverage`);
  } else if (rlsCount > 0) {
    warn(`RLS only on ${rlsCount} tables - may need expansion`);
  } else {
    fail('No RLS policies active');
  }
  
  audit.phases.phase6 = phase;
  return phase;
}

// ============================================================================
// PHASE 7: DATA CONSISTENCY & QUALITY
// ============================================================================
async function phase7_quality() {
  log('\n' + '='.repeat(70));
  log('📊 PHASE 7: DATA CONSISTENCY & QUALITY');
  log('='.repeat(70));
  
  const phase = { issues: [] };
  
  // Check for NULL abuse in boolean columns
  const boolNulls = await query(`
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE data_type = 'boolean' AND is_nullable = 'YES'
      AND table_schema = 'public'
    LIMIT 20
  `);
  
  if (boolNulls.length > 10) {
    warn(`${boolNulls.length} nullable boolean columns - consider defaults`);
  }
  
  // Check for potential enum inconsistencies
  const statusColumns = await query(`
    SELECT DISTINCT table_name, column_name
    FROM information_schema.columns
    WHERE column_name LIKE '%status%' AND table_schema = 'public'
  `);
  log(`   Status columns found: ${statusColumns.length}`);
  
  // Sample check for users_enhanced status values
  try {
    const statusValues = await query(`
      SELECT DISTINCT status, COUNT(*) as count
      FROM users_enhanced
      WHERE status IS NOT NULL
      GROUP BY status
    `);
    log(`   User status values: ${statusValues.map(s => `${s.status}(${s.count})`).join(', ')}`);
  } catch {
    info('Could not check user status values');
  }
  
  pass('Data quality spot check complete');
  
  audit.phases.phase7 = phase;
  return phase;
}

// ============================================================================
// PHASE 8: PERFORMANCE & INDEX AUDIT
// ============================================================================
async function phase8_performance() {
  log('\n' + '='.repeat(70));
  log('⚡ PHASE 8: PERFORMANCE & INDEX AUDIT');
  log('='.repeat(70));
  
  const phase = { largestTables: [], indexAnalysis: [] };
  
  // Get largest tables
  phase.largestTables = await query(`
    SELECT 
      relname as table_name,
      n_live_tup as row_count,
      pg_size_pretty(pg_total_relation_size(relid)) as total_size
    FROM pg_stat_user_tables
    ORDER BY n_live_tup DESC
    LIMIT 15
  `);
  
  log('\n📋 Largest Tables (by row count):');
  phase.largestTables.forEach(t => {
    log(`   ${t.table_name}: ${t.row_count.toLocaleString()} rows (${t.total_size})`);
  });
  
  // Check index usage
  const unusedIndexes = await query(`
    SELECT schemaname, relname, indexrelname, idx_scan
    FROM pg_stat_user_indexes
    WHERE idx_scan = 0 AND indexrelname NOT LIKE '%pkey%'
    LIMIT 10
  `);
  
  if (unusedIndexes.length > 0) {
    warn(`${unusedIndexes.length} indexes with zero scans - consider removing`);
  }
  
  // Check for tables without indexes (besides PK)
  const tablesWithoutIdx = await query(`
    SELECT t.relname as table_name
    FROM pg_stat_user_tables t
    LEFT JOIN pg_indexes i ON t.relname = i.tablename AND i.indexname NOT LIKE '%pkey%'
    WHERE i.indexname IS NULL AND t.n_live_tup > 1000
  `);
  
  if (tablesWithoutIdx.length > 0) {
    warn(`${tablesWithoutIdx.length} large tables without non-PK indexes`);
  }
  
  pass('Performance audit complete');
  
  audit.phases.phase8 = phase;
  return phase;
}

// ============================================================================
// PHASE 9: QUERY & CODE COUPLING (Static Analysis)
// ============================================================================
async function phase9_coupling() {
  log('\n' + '='.repeat(70));
  log('🔌 PHASE 9: QUERY & CODE COUPLING AUDIT');
  log('='.repeat(70));
  
  const phase = { tableUsage: [] };
  
  // This would normally analyze code - for now, check pg_stat for table usage
  const tableStats = await query(`
    SELECT 
      relname,
      seq_scan,
      idx_scan,
      n_tup_ins,
      n_tup_upd,
      n_tup_del
    FROM pg_stat_user_tables
    WHERE seq_scan + idx_scan > 0
    ORDER BY seq_scan + idx_scan DESC
    LIMIT 20
  `);
  
  log('\n📋 Most Accessed Tables:');
  tableStats.slice(0, 10).forEach(t => {
    log(`   ${t.relname}: ${(parseInt(t.seq_scan) + parseInt(t.idx_scan)).toLocaleString()} scans`);
  });
  
  // Find potentially unused tables
  const unusedTables = await query(`
    SELECT relname
    FROM pg_stat_user_tables
    WHERE seq_scan = 0 AND idx_scan = 0 AND n_tup_ins = 0
      AND relname NOT LIKE '_%'
  `);
  
  if (unusedTables.length > 0) {
    warn(`${unusedTables.length} tables with no activity - may be unused`);
    unusedTables.slice(0, 5).forEach(t => info(`  - ${t.relname}`));
  }
  
  phase.tableUsage = tableStats;
  audit.phases.phase9 = phase;
  return phase;
}

// ============================================================================
// PHASE 10: DATA LIFECYCLE & GOVERNANCE
// ============================================================================
async function phase10_governance() {
  log('\n' + '='.repeat(70));
  log('📜 PHASE 10: DATA LIFECYCLE & GOVERNANCE');
  log('='.repeat(70));
  
  const phase = { auditTables: [], softDelete: [] };
  
  // Check for audit log tables
  const auditTables = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name LIKE '%audit%' OR table_name LIKE '%log%'
      AND table_schema = 'public'
  `);
  
  log(`\n📋 Audit/Log Tables: ${auditTables.length}`);
  auditTables.forEach(t => log(`   - ${t.table_name}`));
  phase.auditTables = auditTables;
  
  // Check for soft delete patterns
  const softDeleteTables = await query(`
    SELECT table_name FROM information_schema.columns
    WHERE column_name IN ('deleted_at', 'is_deleted', 'deleted')
      AND table_schema = 'public'
  `);
  
  log(`\n📋 Soft Delete Support: ${softDeleteTables.length} tables`);
  phase.softDelete = softDeleteTables;
  
  if (auditTables.length > 0) {
    pass('Audit logging tables present');
  } else {
    fail('No audit logging tables found');
  }
  
  audit.phases.phase10 = phase;
  return phase;
}

// ============================================================================
// PHASE 11: SCALABILITY & FUTURE READINESS
// ============================================================================
async function phase11_scalability() {
  log('\n' + '='.repeat(70));
  log('📈 PHASE 11: SCALABILITY & FUTURE READINESS');
  log('='.repeat(70));
  
  const phase = { hotTables: [], partitioning: false };
  
  // Identify hot tables (high write activity)
  phase.hotTables = await query(`
    SELECT relname, n_tup_ins + n_tup_upd + n_tup_del as write_ops
    FROM pg_stat_user_tables
    ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC
    LIMIT 10
  `);
  
  log('\n📋 Hottest Tables (by writes):');
  phase.hotTables.forEach(t => {
    log(`   ${t.relname}: ${parseInt(t.write_ops).toLocaleString()} write ops`);
  });
  
  // Check for partitioned tables
  const partitioned = await query(`
    SELECT relname FROM pg_class
    WHERE relkind = 'p' AND relnamespace = 'public'::regnamespace
  `);
  
  if (partitioned.length > 0) {
    pass(`${partitioned.length} partitioned tables found`);
    phase.partitioning = true;
  } else {
    info('No table partitioning in use');
  }
  
  // Check database size
  const dbSize = await query(`SELECT pg_size_pretty(pg_database_size(current_database())) as size`);
  log(`\n📊 Database Size: ${dbSize[0].size}`);
  
  audit.phases.phase11 = phase;
  return phase;
}

// ============================================================================
// PHASE 12: LEGACY, EXCESS & RISK REGISTER
// ============================================================================
async function phase12_risk() {
  log('\n' + '='.repeat(70));
  log('⚠️  PHASE 12: LEGACY, EXCESS & RISK REGISTER');
  log('='.repeat(70));
  
  const phase = { required: [], legacy: [], excess: [] };
  
  // Required core tables
  phase.required = [
    'users_enhanced', 'tenants', 'rbac_roles', 'pages_master', 'modules_master',
    'admin_page_assignments', 'role_page_access', 'subscription_plans', 'tasks'
  ];
  
  log('\n✅ REQUIRED (System Critical):');
  for (const table of phase.required) {
    const exists = await query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = $1 AND table_schema = 'public'
    `, [table]);
    
    if (exists.length > 0) {
      pass(table);
    } else {
      fail(`${table} - MISSING!`);
    }
  }
  
  // Legacy patterns
  log('\n⚠️  LEGACY (Review for deprecation):');
  const legacyPatterns = await query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_name LIKE '%old%' OR table_name LIKE '%backup%' OR table_name LIKE '%temp%'
      AND table_schema = 'public'
  `);
  
  if (legacyPatterns.length > 0) {
    legacyPatterns.forEach(t => warn(t.table_name));
    phase.legacy = legacyPatterns.map(t => t.table_name);
  } else {
    info('No obvious legacy tables detected');
  }
  
  // Excess (zero rows, no activity)
  log('\n❌ EXCESS (Consider removal):');
  const excessTables = await query(`
    SELECT relname FROM pg_stat_user_tables
    WHERE n_live_tup = 0 AND seq_scan = 0 AND idx_scan = 0
      AND relname NOT LIKE '_%'
    LIMIT 15
  `);
  
  if (excessTables.length > 0) {
    excessTables.forEach(t => warn(t.relname));
    phase.excess = excessTables.map(t => t.relname);
  } else {
    info('No obvious excess tables');
  }
  
  audit.phases.phase12 = phase;
  return phase;
}

// ============================================================================
// PHASE 13: FINAL VERDICT
// ============================================================================
function phase13_verdict() {
  log('\n' + '='.repeat(70));
  log('🎯 PHASE 13: FINAL VERDICT');
  log('='.repeat(70));
  
  log('\n📊 AUDIT SUMMARY:');
  log(`   ✅ Passed: ${audit.summary.passed}`);
  log(`   ❌ Failed: ${audit.summary.failed}`);
  log(`   ⚠️  Warnings: ${audit.summary.warnings}`);
  
  // Determine verdict
  if (audit.summary.failed === 0) {
    audit.verdict = '🟢 PRODUCTION-SAFE';
  } else if (audit.summary.failed <= 3) {
    audit.verdict = '🟡 SAFE WITH REMEDIATION';
  } else {
    audit.verdict = '🔴 UNSAFE - BLOCK DEPLOYMENT';
  }
  
  log('\n' + '='.repeat(70));
  log(`VERDICT: ${audit.verdict}`);
  log('='.repeat(70));
  
  if (audit.summary.failed > 0) {
    log('\n🚨 BLOCKING ISSUES:');
    log('   Review failed checks above and address before deployment');
  }
  
  if (audit.summary.warnings > 0) {
    log('\n⚠️  WARNINGS TO ADDRESS:');
    log('   Review warnings for potential improvements');
  }
  
  return audit.verdict;
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
async function runAudit() {
  console.log('\n' + '█'.repeat(70));
  console.log('🧠🧱 COMPLETE DATABASE AUDIT (PRODUCTION-GRADE)');
  console.log('   BISMAN ERP - Railway PostgreSQL');
  console.log('   Timestamp: ' + new Date().toISOString());
  console.log('█'.repeat(70));
  
  try {
    await phase0_inventory();
    await phase1_schema();
    await phase2_relations();
    await phase3_tenancy();
    await phase4_ownership();
    await phase5_security();
    await phase6_rls();
    await phase7_quality();
    await phase8_performance();
    await phase9_coupling();
    await phase10_governance();
    await phase11_scalability();
    await phase12_risk();
    phase13_verdict();
    
    // Save report
    const reportPath = '/Users/abhi/Desktop/BISMAN ERP/docs/DATABASE_AUDIT_REPORT.json';
    require('fs').writeFileSync(reportPath, JSON.stringify(audit, null, 2));
    log(`\n📄 Full report saved to: docs/DATABASE_AUDIT_REPORT.json`);
    
  } catch (error) {
    console.error('❌ Audit failed:', error.message);
  } finally {
    await pool.end();
  }
}

runAudit();
