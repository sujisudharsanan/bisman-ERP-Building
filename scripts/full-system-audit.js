/**
 * FULL SYSTEM FORENSIC AUDIT
 * Principal Software Architect Production Stability Audit
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ 
  connectionString: 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway' 
});

const REPORT = {
  timestamp: new Date().toISOString(),
  database: {},
  application: {},
  prisma: {},
  rbac: {},
  rootCauseMatrix: [],
  recommendations: []
};

async function auditDatabase() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1.1: DATABASE FORENSIC AUDIT');
  console.log('='.repeat(70));

  // 1. Schema Overview
  const tables = await pool.query(`
    SELECT table_name, 
           (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as col_count
    FROM information_schema.tables t
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  console.log(`\n📊 Total Tables: ${tables.rows.length}`);

  // 2. Type Distribution for ID columns
  const idTypes = await pool.query(`
    SELECT data_type, COUNT(*) as count
    FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'id'
    GROUP BY data_type
    ORDER BY count DESC
  `);
  console.log('\n📋 ID Column Type Distribution:');
  idTypes.rows.forEach(r => console.log(`   ${r.data_type}: ${r.count} tables`));
  REPORT.database.idTypeDistribution = idTypes.rows;

  // 3. Non-UUID Primary Keys (Critical Issue)
  const nonUuidPK = await pool.query(`
    SELECT t.table_name, c.column_name, c.data_type
    FROM information_schema.columns c
    JOIN information_schema.tables t ON t.table_name = c.table_name
    WHERE t.table_schema = 'public'
      AND c.column_name = 'id'
      AND c.data_type NOT IN ('uuid')
      AND t.table_type = 'BASE TABLE'
      AND t.table_name NOT LIKE '_backup%'
      AND t.table_name NOT LIKE '_legacy%'
      AND t.table_name NOT LIKE '%_p20%'
      AND t.table_name NOT LIKE 'knex_%'
      AND t.table_name NOT LIKE '_prisma%'
      AND t.table_name NOT LIKE '_schema%'
    ORDER BY c.data_type, t.table_name
  `);
  console.log(`\n❌ Non-UUID Primary Keys: ${nonUuidPK.rows.length} tables`);
  REPORT.database.nonUuidPrimaryKeys = nonUuidPK.rows;

  // 4. Legacy _old columns
  const oldCols = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name LIKE '%_old'
    ORDER BY table_name
  `);
  console.log(`\n⚠️  Legacy _old Columns: ${oldCols.rows.length}`);
  REPORT.database.legacyOldColumns = oldCols.rows;

  // 5. Non-UUID tenant_id columns
  const nonUuidTenant = await pool.query(`
    SELECT table_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name = 'tenant_id'
      AND data_type NOT IN ('uuid')
  `);
  console.log(`\n❌ Non-UUID tenant_id: ${nonUuidTenant.rows.length} tables`);
  REPORT.database.nonUuidTenantId = nonUuidTenant.rows;

  // 6. Non-UUID user reference columns
  const nonUuidUserRefs = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name LIKE '%user_id' OR column_name LIKE '%_by' OR column_name IN ('senderId', 'userId', 'createdById', 'assignee_id', 'creator_id', 'approver_id'))
      AND data_type IN ('integer', 'bigint', 'text', 'character varying')
      AND table_name NOT LIKE '_backup%'
    ORDER BY table_name
  `);
  console.log(`\n❌ Non-UUID User References: ${nonUuidUserRefs.rows.length} columns`);
  REPORT.database.nonUuidUserRefs = nonUuidUserRefs.rows;

  // 7. Missing Foreign Key Constraints
  const missingFKs = await pool.query(`
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND (c.column_name LIKE '%_id' OR c.column_name LIKE '%Id')
      AND c.column_name != 'id'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.key_column_usage kcu
        JOIN information_schema.table_constraints tc ON kcu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.table_name = c.table_name
          AND kcu.column_name = c.column_name
      )
      AND c.table_name NOT LIKE '_backup%'
      AND c.table_name NOT LIKE '%_p20%'
    ORDER BY c.table_name
    LIMIT 50
  `);
  console.log(`\n⚠️  Columns Missing FK Constraints: ${missingFKs.rows.length}+ (showing first 50)`);
  REPORT.database.missingForeignKeys = missingFKs.rows;

  // 8. Nullable Critical IDs
  const nullableIds = await pool.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('id', 'tenant_id')
      AND is_nullable = 'YES'
      AND table_name NOT LIKE '_backup%'
  `);
  console.log(`\n⚠️  Nullable Critical IDs: ${nullableIds.rows.length}`);
  REPORT.database.nullableCriticalIds = nullableIds.rows;

  // 9. Duplicate/Conflicting Indexes
  const duplicateIdx = await pool.query(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (indexname LIKE '%_duplicate%' OR indexname LIKE '%_old%')
  `);
  console.log(`\n⚠️  Potentially Duplicate Indexes: ${duplicateIdx.rows.length}`);

  // 10. Tables with mixed ID types (critical architectural issue)
  const mixedIdTables = await pool.query(`
    SELECT table_name,
           array_agg(column_name || ':' || data_type) as id_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (column_name = 'id' OR column_name LIKE '%_id' OR column_name LIKE '%_uuid')
      AND table_name NOT LIKE '_backup%'
    GROUP BY table_name
    HAVING COUNT(DISTINCT data_type) > 1
    ORDER BY table_name
    LIMIT 30
  `);
  console.log(`\n🔴 Tables with MIXED ID Types: ${mixedIdTables.rows.length}`);
  REPORT.database.mixedIdTypeTables = mixedIdTables.rows;

  return REPORT.database;
}

async function auditCriticalTables() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1.2: CRITICAL TABLE DEEP AUDIT');
  console.log('='.repeat(70));

  const criticalTables = [
    'users', 'tenants', 'tasks', 'threads', 'thread_messages', 'thread_members',
    'chat_conversations', 'chat_messages', 'workflow_tasks', 'rbac_user_roles',
    'rbac_permissions', 'role_page_access', 'effective_access_cache',
    'audit_logs', 'tenant_usage', 'subscription_plans'
  ];

  const tableAudits = [];
  
  for (const table of criticalTables) {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [table]);
    
    if (cols.rows.length > 0) {
      const idCol = cols.rows.find(c => c.column_name === 'id');
      const tenantCol = cols.rows.find(c => c.column_name === 'tenant_id');
      
      const issues = [];
      if (idCol && idCol.data_type !== 'uuid') issues.push(`id is ${idCol.data_type}`);
      if (tenantCol && tenantCol.data_type !== 'uuid') issues.push(`tenant_id is ${tenantCol.data_type}`);
      
      const oldCols = cols.rows.filter(c => c.column_name.includes('_old'));
      if (oldCols.length > 0) issues.push(`${oldCols.length} legacy _old columns`);
      
      const status = issues.length === 0 ? '✅' : '❌';
      console.log(`\n${status} ${table}:`);
      if (idCol) console.log(`   id: ${idCol.data_type}`);
      if (tenantCol) console.log(`   tenant_id: ${tenantCol.data_type}`);
      if (issues.length > 0) {
        issues.forEach(i => console.log(`   ⚠️  ${i}`));
      }
      
      tableAudits.push({ table, columns: cols.rows.length, issues });
    }
  }
  
  REPORT.database.criticalTableAudit = tableAudits;
}

async function auditRBAC() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1.3: RBAC & ACCESS CONTROL AUDIT');
  console.log('='.repeat(70));

  // 1. RBAC User Roles consistency
  const rbacUserRoles = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(user_id) as has_user_id,
      COUNT(user_id_uuid) as has_user_id_uuid,
      COUNT(CASE WHEN user_id_uuid IS NULL AND user_id IS NOT NULL THEN 1 END) as missing_uuid
    FROM rbac_user_roles
  `);
  console.log('\n📋 RBAC User Roles:');
  console.log(`   Total: ${rbacUserRoles.rows[0].total}`);
  console.log(`   Has user_id: ${rbacUserRoles.rows[0].has_user_id}`);
  console.log(`   Has user_id_uuid: ${rbacUserRoles.rows[0].has_user_id_uuid}`);
  console.log(`   Missing UUID: ${rbacUserRoles.rows[0].missing_uuid}`);
  REPORT.rbac.userRoles = rbacUserRoles.rows[0];

  // 2. Role-Page Access completeness
  const rolePageAccess = await pool.query(`
    SELECT 
      COUNT(DISTINCT role_name) as roles_with_access,
      COUNT(DISTINCT page_id) as pages_assigned,
      (SELECT COUNT(*) FROM pages_master WHERE status = 'active') as total_active_pages
    FROM role_page_access
  `);
  console.log('\n📋 Role-Page Access:');
  console.log(`   Roles with access: ${rolePageAccess.rows[0].roles_with_access}`);
  console.log(`   Pages assigned: ${rolePageAccess.rows[0].pages_assigned}`);
  console.log(`   Total active pages: ${rolePageAccess.rows[0].total_active_pages}`);
  REPORT.rbac.rolePageAccess = rolePageAccess.rows[0];

  // 3. Orphan permissions (users without roles)
  const orphanPerms = await pool.query(`
    SELECT COUNT(*) as count
    FROM rbac_user_permissions p
    WHERE NOT EXISTS (
      SELECT 1 FROM rbac_user_roles r WHERE r.user_id = p.user_id OR r.user_id_uuid::text = p.user_id
    )
  `);
  console.log(`\n⚠️  Orphan Permissions: ${orphanPerms.rows[0].count}`);

  // 4. Effective Access Cache staleness
  const cacheStatus = await pool.query(`
    SELECT 
      COUNT(*) as total,
      COUNT(CASE WHEN expires_at < NOW() THEN 1 END) as expired,
      MAX(updated_at) as last_update
    FROM effective_access_cache
  `);
  console.log('\n📋 Effective Access Cache:');
  console.log(`   Total entries: ${cacheStatus.rows[0].total}`);
  console.log(`   Expired: ${cacheStatus.rows[0].expired}`);
  console.log(`   Last update: ${cacheStatus.rows[0].last_update}`);
  REPORT.rbac.cacheStatus = cacheStatus.rows[0];

  // 5. Subscription plan assignment gaps
  const planGaps = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM tenants) as total_tenants,
      (SELECT COUNT(DISTINCT tenant_id) FROM tenant_subscription) as tenants_with_subscription,
      (SELECT COUNT(*) FROM subscription_plans WHERE is_active = true) as active_plans
  `);
  console.log('\n📋 Subscription Coverage:');
  console.log(`   Total tenants: ${planGaps.rows[0].total_tenants}`);
  console.log(`   With subscription: ${planGaps.rows[0].tenants_with_subscription}`);
  console.log(`   Active plans: ${planGaps.rows[0].active_plans}`);
  REPORT.rbac.subscriptionCoverage = planGaps.rows[0];
}

async function auditDataIntegrity() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 1.4: DATA INTEGRITY AUDIT');
  console.log('='.repeat(70));

  // 1. Orphan records in critical tables
  const orphanChecks = [
    {
      name: 'thread_messages without valid thread',
      query: `SELECT COUNT(*) FROM thread_messages tm WHERE NOT EXISTS (SELECT 1 FROM threads t WHERE t.id = tm.thread_id)`
    },
    {
      name: 'chat_messages without valid conversation',
      query: `SELECT COUNT(*) FROM chat_messages cm WHERE NOT EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = cm.conversation_id)`
    },
    {
      name: 'role_page_access with invalid page_id',
      query: `SELECT COUNT(*) FROM role_page_access rpa WHERE NOT EXISTS (SELECT 1 FROM pages_master p WHERE p.id = rpa.page_id)`
    }
  ];

  console.log('\n📋 Orphan Records:');
  for (const check of orphanChecks) {
    try {
      const result = await pool.query(check.query);
      const count = result.rows[0].count;
      const status = count === '0' ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${count}`);
    } catch (err) {
      console.log(`   ⚠️  ${check.name}: Error - ${err.message}`);
    }
  }

  // 2. Null values in critical columns
  const nullChecks = await pool.query(`
    SELECT 'users.tenant_id' as col, COUNT(*) as null_count FROM users WHERE tenant_id IS NULL
    UNION ALL
    SELECT 'tasks.tenant_id', COUNT(*) FROM tasks WHERE tenant_id IS NULL
    UNION ALL
    SELECT 'audit_logs.tenant_id', COUNT(*) FROM audit_logs WHERE tenant_id IS NULL
  `);
  console.log('\n📋 Null Values in Critical Columns:');
  nullChecks.rows.forEach(r => {
    const status = r.null_count === '0' ? '✅' : '⚠️';
    console.log(`   ${status} ${r.col}: ${r.null_count} nulls`);
  });
}

async function generateRootCauseMatrix() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 2: ROOT CAUSE MATRIX');
  console.log('='.repeat(70));

  const matrix = [
    {
      symptom: 'UUID = TEXT operator errors',
      rootCause: 'Mixed identifier types across tables',
      impact: 'Query failures, data isolation breaks',
      fix: 'Convert all ID columns to UUID type',
      priority: 'CRITICAL'
    },
    {
      symptom: 'RBAC denial on valid users',
      rootCause: 'rbac_user_roles.user_id is TEXT with legacy integers',
      impact: 'Permission lookups fail for UUID users',
      fix: 'Use user_id_uuid column, migrate all data',
      priority: 'CRITICAL'
    },
    {
      symptom: 'Prisma field mismatch errors',
      rootCause: 'Schema drift between DB and Prisma',
      impact: 'ORM operations fail',
      fix: 'Regenerate Prisma schema from DB',
      priority: 'HIGH'
    },
    {
      symptom: 'parseInt/Number on UUIDs in code',
      rootCause: 'Legacy code assumed integer IDs',
      impact: 'NaN values, broken queries',
      fix: 'Remove all parseInt/Number on ID fields',
      priority: 'HIGH'
    },
    {
      symptom: 'Legacy _old columns cause insert failures',
      rootCause: 'Incomplete migration cleanup',
      impact: 'New data inserts fail',
      fix: 'Drop all _old columns after verification',
      priority: 'MEDIUM'
    },
    {
      symptom: 'Missing FK constraints',
      rootCause: 'Referential integrity not enforced',
      impact: 'Orphan records, data inconsistency',
      fix: 'Add FK constraints with proper cleanup',
      priority: 'MEDIUM'
    },
    {
      symptom: 'Nullable tenant_id in critical tables',
      rootCause: 'Multi-tenancy not enforced at DB level',
      impact: 'Data leakage between tenants',
      fix: 'Add NOT NULL constraints after backfill',
      priority: 'CRITICAL'
    },
    {
      symptom: 'WebSocket endpoints fail',
      rootCause: 'Hardcoded localhost references',
      impact: 'Real-time features broken in production',
      fix: 'Use environment-based URL configuration',
      priority: 'HIGH'
    }
  ];

  console.log('\n| Symptom | Root Cause | Impact | Priority |');
  console.log('|---------|------------|--------|----------|');
  matrix.forEach(m => {
    console.log(`| ${m.symptom.substring(0,30)}... | ${m.rootCause.substring(0,25)}... | ${m.impact.substring(0,20)}... | ${m.priority} |`);
  });

  REPORT.rootCauseMatrix = matrix;
  return matrix;
}

async function generateRecommendations() {
  console.log('\n' + '='.repeat(70));
  console.log('PHASE 3-9: RECOMMENDATIONS & ACTION PLAN');
  console.log('='.repeat(70));

  const recommendations = [
    {
      phase: 3,
      title: 'Schema Normalization',
      actions: [
        'Convert remaining non-UUID ID columns to UUID',
        'Drop all legacy _old columns',
        'Add NOT NULL constraints to tenant_id',
        'Add FK constraints for referential integrity'
      ]
    },
    {
      phase: 4,
      title: 'Prisma Reconciliation',
      actions: [
        'Run npx prisma db pull to sync schema',
        'Add @db.Uuid annotations where missing',
        'Verify all @@unique constraints',
        'Remove phantom fields from schema'
      ]
    },
    {
      phase: 5,
      title: 'Query Hardening',
      actions: [
        'Replace parseInt/Number on IDs with String/UUID handling',
        'Eliminate SELECT * in production queries',
        'Use parameterized queries only',
        'Add query validation middleware'
      ]
    },
    {
      phase: 6,
      title: 'Access Control Rebuild',
      actions: [
        'Migrate rbac_user_roles to UUID-only',
        'Rebuild effective_access_cache computation',
        'Add audit logging for all access decisions',
        'Implement deterministic role resolution'
      ]
    },
    {
      phase: 7,
      title: 'Observability',
      actions: [
        'Add constraint violation monitoring',
        'Implement Prisma query logging',
        'Create RBAC denial alerts',
        'Set up migration drift detection'
      ]
    },
    {
      phase: 8,
      title: 'Certification Testing',
      actions: [
        'Create E2E tests for authentication',
        'Add RBAC permission tests',
        'Test all critical workflows',
        'Implement pre-deploy test gates'
      ]
    },
    {
      phase: 9,
      title: 'Production Hardening',
      actions: [
        'Audit for localhost references',
        'Enforce environment validation',
        'Enable automated backups',
        'Lock migration state'
      ]
    }
  ];

  recommendations.forEach(r => {
    console.log(`\n📋 Phase ${r.phase}: ${r.title}`);
    r.actions.forEach((a, i) => console.log(`   ${i+1}. ${a}`));
  });

  REPORT.recommendations = recommendations;
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     FULL SYSTEM FORENSIC AUDIT - PRODUCTION STABILITY ANALYSIS       ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    await auditDatabase();
    await auditCriticalTables();
    await auditRBAC();
    await auditDataIntegrity();
    await generateRootCauseMatrix();
    await generateRecommendations();

    // Save report
    fs.writeFileSync(
      path.join(__dirname, 'full-system-audit-report.json'),
      JSON.stringify(REPORT, null, 2)
    );
    console.log('\n✅ Full report saved to scripts/full-system-audit-report.json');

  } catch (err) {
    console.error('\n❌ Audit Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
