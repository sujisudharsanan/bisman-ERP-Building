#!/usr/bin/env node
/**
 * UUID Migration Audit Script
 * Phase 1: Full Schema Analysis for UUID Normalization
 * 
 * This script scans the PostgreSQL schema and identifies:
 * 1. All ID columns and their types
 * 2. Mismatched ID types (INT/BIGINT/TEXT where UUID should be used)
 * 3. Legacy columns (*_old, *_legacy, *_int)
 * 4. Foreign key relationships
 * 5. Missing constraints
 */

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

const CRITICAL_TABLES = [
  'users_enhanced',
  'users',
  'tasks',
  'chats',
  'chat_messages',
  'workflows',
  'branches',
  'audit_logs',
  'tenant_usage',
  'rbac_roles',
  'role_page_access',
  'admin_role_assignments',
  'admin_page_assignments',
  'admin_role_grants',
  'effective_access_cache',
  'subscription_access_audit_log'
];

const ID_COLUMN_PATTERNS = [
  'id',
  'user_id',
  'tenant_id',
  'creator_id',
  'sender_id',
  'branch_id',
  'client_id',
  'owner_id',
  'assigned_to',
  'approver_id',
  'reviewer_id',
  'created_by',
  'updated_by',
  'super_admin_id',
  'parent_id',
  'reports_to'
];

async function runAudit() {
  console.log('='.repeat(80));
  console.log('UUID MIGRATION AUDIT - Phase 1: Schema Analysis');
  console.log('='.repeat(80));
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  try {
    // 1. Get all tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 TOTAL TABLES: ${tablesResult.rows.length}\n`);

    // 2. Get all columns with ID-like names and their types
    console.log('='.repeat(80));
    console.log('SECTION 1: ALL ID-LIKE COLUMNS AND THEIR TYPES');
    console.log('='.repeat(80));

    const idColumnsQuery = `
      SELECT 
        c.table_name,
        c.column_name,
        c.data_type,
        c.udt_name,
        c.is_nullable,
        c.column_default,
        CASE 
          WHEN c.udt_name = 'uuid' THEN 'UUID'
          WHEN c.data_type IN ('integer', 'bigint', 'smallint') THEN 'INTEGER'
          WHEN c.data_type IN ('text', 'character varying') THEN 'TEXT'
          ELSE 'OTHER'
        END as type_category
      FROM information_schema.columns c
      WHERE c.table_schema = 'public'
        AND (
          c.column_name LIKE '%id%' 
          OR c.column_name LIKE '%_id'
          OR c.column_name = 'id'
          OR c.column_name LIKE '%user%'
          OR c.column_name LIKE '%creator%'
          OR c.column_name LIKE '%sender%'
          OR c.column_name LIKE '%tenant%'
          OR c.column_name LIKE '%branch%'
          OR c.column_name LIKE '%owner%'
          OR c.column_name LIKE '%assigned%'
          OR c.column_name LIKE '%approver%'
          OR c.column_name LIKE '%created_by%'
          OR c.column_name LIKE '%updated_by%'
          OR c.column_name LIKE '%reports_to%'
        )
      ORDER BY c.table_name, c.column_name
    `;

    const idColumns = await pool.query(idColumnsQuery);
    
    // Group by type category
    const byCategory = {
      UUID: [],
      INTEGER: [],
      TEXT: [],
      OTHER: []
    };

    idColumns.rows.forEach(row => {
      byCategory[row.type_category].push(row);
    });

    console.log(`\n📌 UUID columns: ${byCategory.UUID.length}`);
    console.log(`⚠️  INTEGER columns: ${byCategory.INTEGER.length}`);
    console.log(`⚠️  TEXT columns: ${byCategory.TEXT.length}`);
    console.log(`❓ OTHER columns: ${byCategory.OTHER.length}\n`);

    // 3. Identify problematic INTEGER ID columns that should be UUID
    console.log('='.repeat(80));
    console.log('SECTION 2: INTEGER COLUMNS THAT SHOULD BE UUID');
    console.log('='.repeat(80));

    const integerIdColumns = idColumns.rows.filter(r => 
      r.type_category === 'INTEGER' && 
      (r.column_name.includes('user') || 
       r.column_name.includes('tenant') || 
       r.column_name.includes('client') ||
       r.column_name.includes('creator') ||
       r.column_name.includes('sender') ||
       r.column_name.includes('approver') ||
       r.column_name.includes('assigned') ||
       r.column_name === 'created_by' ||
       r.column_name === 'updated_by' ||
       r.column_name === 'super_admin_id')
    );

    if (integerIdColumns.length > 0) {
      console.log('\n🚨 CRITICAL: These INTEGER columns reference entities that use UUID:\n');
      integerIdColumns.forEach(col => {
        console.log(`  ${col.table_name}.${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('\n✅ No problematic INTEGER columns found');
    }

    // 4. Find legacy columns
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 3: LEGACY COLUMNS (*_old, *_legacy, *_int)');
    console.log('='.repeat(80));

    const legacyColumnsQuery = `
      SELECT table_name, column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          column_name LIKE '%_old' 
          OR column_name LIKE '%_legacy'
          OR column_name LIKE '%_int'
          OR column_name LIKE '%_backup'
          OR column_name LIKE 'old_%'
          OR column_name LIKE 'legacy_%'
        )
      ORDER BY table_name, column_name
    `;

    const legacyColumns = await pool.query(legacyColumnsQuery);
    
    if (legacyColumns.rows.length > 0) {
      console.log(`\n🗑️  LEGACY COLUMNS TO REMOVE: ${legacyColumns.rows.length}\n`);
      legacyColumns.rows.forEach(col => {
        console.log(`  ${col.table_name}.${col.column_name} (${col.data_type})`);
      });
    } else {
      console.log('\n✅ No legacy columns found');
    }

    // 5. Check users_enhanced structure
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 4: USERS_ENHANCED TABLE STRUCTURE');
    console.log('='.repeat(80));

    const usersEnhancedQuery = `
      SELECT column_name, data_type, udt_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users_enhanced'
      ORDER BY ordinal_position
    `;

    const usersEnhanced = await pool.query(usersEnhancedQuery);
    console.log('\n');
    usersEnhanced.rows.forEach(col => {
      const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      const def = col.column_default ? ` DEFAULT ${col.column_default.substring(0, 50)}...` : '';
      console.log(`  ${col.column_name.padEnd(25)} ${col.udt_name.padEnd(15)} ${nullable}${def}`);
    });

    // 6. Check foreign key constraints
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 5: FOREIGN KEY CONSTRAINTS');
    console.log('='.repeat(80));

    const fkQuery = `
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name,
        c.data_type as source_type,
        c2.data_type as target_type
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      JOIN information_schema.columns c 
        ON c.table_name = tc.table_name AND c.column_name = kcu.column_name
      JOIN information_schema.columns c2 
        ON c2.table_name = ccu.table_name AND c2.column_name = ccu.column_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name
    `;

    const fks = await pool.query(fkQuery);
    
    const mismatchedFKs = fks.rows.filter(fk => fk.source_type !== fk.target_type);
    
    if (mismatchedFKs.length > 0) {
      console.log(`\n🚨 MISMATCHED FK TYPES: ${mismatchedFKs.length}\n`);
      mismatchedFKs.forEach(fk => {
        console.log(`  ${fk.table_name}.${fk.column_name} (${fk.source_type}) → ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.target_type})`);
      });
    } else {
      console.log('\n✅ All foreign keys have matching types');
    }

    console.log(`\nTotal FKs: ${fks.rows.length}`);

    // 7. Check for tables missing primary key constraints
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 6: TABLES WITHOUT PRIMARY KEY');
    console.log('='.repeat(80));

    const noPKQuery = `
      SELECT t.table_name
      FROM information_schema.tables t
      LEFT JOIN (
        SELECT tc.table_name
        FROM information_schema.table_constraints tc
        WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
      ) pk ON t.table_name = pk.table_name
      WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND pk.table_name IS NULL
      ORDER BY t.table_name
    `;

    const noPK = await pool.query(noPKQuery);
    
    if (noPK.rows.length > 0) {
      console.log(`\n⚠️  Tables without PK: ${noPK.rows.length}\n`);
      noPK.rows.forEach(t => console.log(`  ${t.table_name}`));
    } else {
      console.log('\n✅ All tables have primary keys');
    }

    // 8. Check tenant_usage for compound unique constraint
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 7: TENANT_USAGE TABLE & CONSTRAINTS');
    console.log('='.repeat(80));

    const tenantUsageQuery = `
      SELECT column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'tenant_usage'
      ORDER BY ordinal_position
    `;

    const tenantUsage = await pool.query(tenantUsageQuery);
    
    if (tenantUsage.rows.length > 0) {
      console.log('\nColumns:');
      tenantUsage.rows.forEach(col => {
        console.log(`  ${col.column_name.padEnd(20)} ${col.udt_name.padEnd(15)} ${col.is_nullable}`);
      });

      // Check for unique constraint on tenant_id + date
      const uniqueQuery = `
        SELECT constraint_name, column_name
        FROM information_schema.constraint_column_usage
        WHERE table_name = 'tenant_usage'
      `;
      const uniqueConstraints = await pool.query(uniqueQuery);
      console.log('\nConstraints:');
      uniqueConstraints.rows.forEach(c => {
        console.log(`  ${c.constraint_name}: ${c.column_name}`);
      });
    } else {
      console.log('\n⚠️  tenant_usage table not found');
    }

    // 9. RBAC Tables Check
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 8: RBAC TABLES ANALYSIS');
    console.log('='.repeat(80));

    const rbacTables = ['rbac_roles', 'role_page_access', 'pages_master', 'admin_role_assignments', 'admin_role_grants'];
    
    for (const table of rbacTables) {
      const cols = await pool.query(`
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      if (cols.rows.length > 0) {
        console.log(`\n📋 ${table}:`);
        cols.rows.forEach(col => {
          const warning = (col.column_name.includes('id') || col.column_name.includes('user')) && 
                          col.udt_name !== 'uuid' && col.udt_name !== 'int4' ? ' ⚠️' : '';
          console.log(`  ${col.column_name.padEnd(25)} ${col.udt_name}${warning}`);
        });
      }
    }

    // 10. Check for type casting issues in views
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 9: VIEWS WITH POTENTIAL TYPE ISSUES');
    console.log('='.repeat(80));

    const viewsQuery = `
      SELECT table_name as view_name, view_definition
      FROM information_schema.views
      WHERE table_schema = 'public'
    `;

    const views = await pool.query(viewsQuery);
    
    console.log(`\nTotal views: ${views.rows.length}`);
    views.rows.forEach(v => {
      if (v.view_definition && 
          (v.view_definition.includes('::integer') || 
           v.view_definition.includes('::text') ||
           v.view_definition.includes('::int'))) {
        console.log(`  ⚠️  ${v.view_name} - contains type casts`);
      }
    });

    // 11. Detailed analysis of critical tables
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 10: CRITICAL TABLES DETAILED ANALYSIS');
    console.log('='.repeat(80));

    const criticalAnalysis = [];

    for (const table of CRITICAL_TABLES) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = $1
        ) as exists
      `, [table]);

      if (!tableExists.rows[0].exists) {
        console.log(`\n❌ ${table} - TABLE NOT FOUND`);
        continue;
      }

      const cols = await pool.query(`
        SELECT column_name, data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const issues = [];
      
      cols.rows.forEach(col => {
        // Check for ID columns that should be UUID
        if ((col.column_name === 'user_id' || 
             col.column_name === 'tenant_id' || 
             col.column_name === 'client_id' ||
             col.column_name === 'creator_id' ||
             col.column_name === 'sender_id' ||
             col.column_name === 'created_by' ||
             col.column_name === 'updated_by' ||
             col.column_name === 'super_admin_id' ||
             col.column_name === 'assigned_to') && 
            col.udt_name !== 'uuid') {
          issues.push(`${col.column_name} is ${col.udt_name}, should be uuid`);
        }
        
        // Check for legacy columns
        if (col.column_name.includes('_old') || 
            col.column_name.includes('_legacy') ||
            col.column_name.includes('_int')) {
          issues.push(`Legacy column: ${col.column_name}`);
        }
      });

      if (issues.length > 0) {
        console.log(`\n🔴 ${table}:`);
        issues.forEach(i => console.log(`    - ${i}`));
        criticalAnalysis.push({ table, issues });
      } else {
        console.log(`\n✅ ${table} - OK`);
      }
    }

    // 12. Generate migration recommendations
    console.log('\n' + '='.repeat(80));
    console.log('SECTION 11: MIGRATION RECOMMENDATIONS');
    console.log('='.repeat(80));

    console.log('\n📋 REQUIRED ACTIONS:\n');

    if (integerIdColumns.length > 0) {
      console.log('1. CONVERT INTEGER ID COLUMNS TO UUID:');
      integerIdColumns.forEach(col => {
        console.log(`   ALTER TABLE ${col.table_name} ALTER COLUMN ${col.column_name} TYPE uuid USING ${col.column_name}::text::uuid;`);
      });
    }

    if (legacyColumns.rows.length > 0) {
      console.log('\n2. DROP LEGACY COLUMNS:');
      legacyColumns.rows.forEach(col => {
        console.log(`   ALTER TABLE ${col.table_name} DROP COLUMN IF EXISTS ${col.column_name};`);
      });
    }

    if (mismatchedFKs.length > 0) {
      console.log('\n3. FIX FOREIGN KEY MISMATCHES:');
      mismatchedFKs.forEach(fk => {
        console.log(`   -- Fix ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    // 13. Summary
    console.log('\n' + '='.repeat(80));
    console.log('AUDIT SUMMARY');
    console.log('='.repeat(80));
    
    console.log(`
📊 Total Tables: ${tablesResult.rows.length}
📌 UUID columns: ${byCategory.UUID.length}
⚠️  INTEGER ID columns needing migration: ${integerIdColumns.length}
🗑️  Legacy columns to remove: ${legacyColumns.rows.length}
🔗 Mismatched FK types: ${mismatchedFKs.length}
📋 Tables without PK: ${noPK.rows.length}
🔴 Critical tables with issues: ${criticalAnalysis.length}
    `);

    // Output JSON for further processing
    const auditResult = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTables: tablesResult.rows.length,
        uuidColumns: byCategory.UUID.length,
        integerColumnsToMigrate: integerIdColumns.length,
        legacyColumnsToRemove: legacyColumns.rows.length,
        mismatchedFKs: mismatchedFKs.length,
        tablesWithoutPK: noPK.rows.length,
        criticalTablesWithIssues: criticalAnalysis.length
      },
      integerColumnsToMigrate: integerIdColumns,
      legacyColumnsToRemove: legacyColumns.rows,
      mismatchedForeignKeys: mismatchedFKs,
      criticalTableIssues: criticalAnalysis
    };

    // Write audit result to file
    const fs = require('fs');
    fs.writeFileSync(
      './scripts/uuid-migration-audit-result.json',
      JSON.stringify(auditResult, null, 2)
    );
    console.log('\n📁 Detailed audit saved to: ./scripts/uuid-migration-audit-result.json');

  } catch (error) {
    console.error('\n❌ AUDIT ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

runAudit();
