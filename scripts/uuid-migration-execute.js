#!/usr/bin/env node
/**
 * UUID Migration Executor
 * 
 * This script performs a safe, phased migration from mixed ID types to UUID-only.
 * It includes validation, backup, migration, and rollback capabilities.
 * 
 * Usage:
 *   node scripts/uuid-migration-execute.js --phase=1    # Audit only
 *   node scripts/uuid-migration-execute.js --phase=2    # Backup & Migrate
 *   node scripts/uuid-migration-execute.js --phase=3    # Drop legacy columns
 *   node scripts/uuid-migration-execute.js --phase=4    # Validate
 *   node scripts/uuid-migration-execute.js --phase=all  # Full migration
 *   node scripts/uuid-migration-execute.js --rollback   # Rollback from backup
 */

const { Pool } = require('pg');
const fs = require('fs');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ 
  connectionString: DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Migration configuration
const CONFIG = {
  backupSchema: 'uuid_migration_backup',
  logFile: './scripts/uuid-migration-log.json',
  dryRun: process.argv.includes('--dry-run'),
  verbose: process.argv.includes('--verbose')
};

// Tables that need migration
const MIGRATION_TARGETS = {
  // Tables with INTEGER user/tenant IDs that should be UUID
  integerToUuid: [
    { table: 'users_enhanced', column: 'super_admin_id', type: 'int4' },
    { table: 'effective_access_cache', column: 'user_id', type: 'int4' },
    { table: 'thread_messages', column: 'senderId', type: 'int4' },
    { table: 'thread_members', column: 'userId', type: 'int4' },
    { table: 'approvals', column: 'approverId', type: 'int4' },
    { table: 'approver_configurations', column: 'userId', type: 'int4' },
    { table: 'assistant_memory', column: 'userId', type: 'int4' },
    { table: 'support_tickets', column: 'assigned_to', type: 'int4' },
    { table: 'task_reviews', column: 'sender_id', type: 'int4' },
    { table: 'payment_activity_logs', column: 'userId', type: 'int4' },
    { table: 'api_keys', column: 'client_id', type: 'int4' },
    { table: 'clients', column: 'super_admin_id', type: 'int4' },
    { table: 'module_assignments', column: 'super_admin_id', type: 'int4' },
    { table: 'audit_logs', column: 'super_admin_id', type: 'int4' }
  ],
  
  // Tables with VARCHAR tenant_id that should be UUID
  varcharToUuid: [
    { table: 'effective_access_cache', column: 'tenant_id' },
    { table: 'tenant_usage', column: 'tenant_id' },
    { table: 'admin_page_assignments', column: 'tenant_id' },
    { table: 'admin_role_grants', column: 'tenant_id' },
    { table: 'subscription_access_audit_log', column: 'tenant_id' }
  ],
  
  // Legacy columns to drop
  legacyColumns: [
    { table: 'chat_conversations', columns: ['id_old', 'user_id_old'] },
    { table: 'chat_messages', columns: ['id_old', 'conversation_id_old', 'user_id_old'] },
    { table: 'task_messages', columns: ['id_old', 'reply_to_id_old', 'sender_id_old', 'task_id_old'] },
    { table: 'task_requests', columns: ['id_old', 'converted_task_id_old'] },
    { table: 'thread_messages', columns: ['id_old', 'reply_to_id_old', 'thread_id_old'] },
    { table: 'thread_members', columns: ['thread_id_old'] },
    { table: 'threads', columns: ['id_old'] },
    { table: 'workflow_tasks', columns: ['id_old', 'approver_id_old', 'assignee_id_old', 'creator_id_old'] },
    { table: 'rbac_user_permissions', columns: ['user_id_old'] }
  ]
};

// Logging utility
const log = {
  entries: [],
  add(level, message, data = null) {
    const entry = { timestamp: new Date().toISOString(), level, message, data };
    this.entries.push(entry);
    const prefix = level === 'ERROR' ? '❌' : level === 'WARN' ? '⚠️' : level === 'SUCCESS' ? '✅' : '📋';
    console.log(`${prefix} [${level}] ${message}`);
    if (data && CONFIG.verbose) console.log('  ', JSON.stringify(data, null, 2));
  },
  info(msg, data) { this.add('INFO', msg, data); },
  warn(msg, data) { this.add('WARN', msg, data); },
  error(msg, data) { this.add('ERROR', msg, data); },
  success(msg, data) { this.add('SUCCESS', msg, data); },
  save() {
    fs.writeFileSync(CONFIG.logFile, JSON.stringify({ 
      migrationId: Date.now(),
      dryRun: CONFIG.dryRun,
      entries: this.entries 
    }, null, 2));
  }
};

// Database helper functions
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

async function tableExists(tableName) {
  const result = await query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = $1
    ) as exists
  `, [tableName]);
  return result.rows[0].exists;
}

async function columnExists(tableName, columnName) {
  const result = await query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    ) as exists
  `, [tableName, columnName]);
  return result.rows[0].exists;
}

async function getColumnType(tableName, columnName) {
  const result = await query(`
    SELECT udt_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  return result.rows[0]?.udt_name;
}

// =============================================================================
// PHASE 1: AUDIT
// =============================================================================
async function phase1Audit() {
  log.info('Starting Phase 1: Comprehensive Audit');
  
  const issues = {
    integerColumns: [],
    varcharColumns: [],
    legacyColumns: [],
    mismatchedFKs: [],
    missingConstraints: []
  };
  
  // Check integer columns
  for (const target of MIGRATION_TARGETS.integerToUuid) {
    const exists = await tableExists(target.table);
    if (!exists) {
      log.warn(`Table ${target.table} does not exist`, target);
      continue;
    }
    
    const colExists = await columnExists(target.table, target.column);
    if (!colExists) {
      log.info(`Column ${target.table}.${target.column} already removed or renamed`);
      continue;
    }
    
    const colType = await getColumnType(target.table, target.column);
    if (colType !== 'uuid') {
      issues.integerColumns.push({ ...target, currentType: colType });
      log.warn(`${target.table}.${target.column} is ${colType}, needs UUID`);
    }
  }
  
  // Check varchar columns
  for (const target of MIGRATION_TARGETS.varcharToUuid) {
    const exists = await tableExists(target.table);
    if (!exists) continue;
    
    const colExists = await columnExists(target.table, target.column);
    if (!colExists) continue;
    
    const colType = await getColumnType(target.table, target.column);
    if (colType !== 'uuid') {
      issues.varcharColumns.push({ ...target, currentType: colType });
      log.warn(`${target.table}.${target.column} is ${colType}, needs UUID`);
    }
  }
  
  // Check legacy columns
  for (const target of MIGRATION_TARGETS.legacyColumns) {
    const exists = await tableExists(target.table);
    if (!exists) continue;
    
    for (const col of target.columns) {
      const colExists = await columnExists(target.table, col);
      if (colExists) {
        issues.legacyColumns.push({ table: target.table, column: col });
        log.warn(`Legacy column found: ${target.table}.${col}`);
      }
    }
  }
  
  // Check tenant_usage for compound unique constraint
  const constraintCheck = await query(`
    SELECT constraint_name FROM information_schema.table_constraints
    WHERE table_name = 'tenant_usage' AND constraint_type = 'UNIQUE'
  `);
  
  const hasCompoundUnique = constraintCheck.rows.some(r => 
    r.constraint_name.includes('tenant') && r.constraint_name.includes('date')
  );
  
  if (!hasCompoundUnique) {
    issues.missingConstraints.push({ table: 'tenant_usage', constraint: 'tenant_date_unique' });
    log.warn('Missing compound unique constraint on tenant_usage(tenant_id, date)');
  }
  
  // Summary
  log.info('=== AUDIT SUMMARY ===');
  log.info(`Integer columns needing migration: ${issues.integerColumns.length}`);
  log.info(`VARCHAR columns needing migration: ${issues.varcharColumns.length}`);
  log.info(`Legacy columns to remove: ${issues.legacyColumns.length}`);
  log.info(`Missing constraints: ${issues.missingConstraints.length}`);
  
  return issues;
}

// =============================================================================
// PHASE 2: BACKUP AND MIGRATE
// =============================================================================
async function phase2Migrate() {
  log.info('Starting Phase 2: Backup and Migration');
  
  if (CONFIG.dryRun) {
    log.info('DRY RUN - No changes will be made');
  }
  
  // Create backup schema
  if (!CONFIG.dryRun) {
    await query(`CREATE SCHEMA IF NOT EXISTS ${CONFIG.backupSchema}`);
    log.success('Created backup schema');
  }
  
  // Backup critical tables
  const tablesToBackup = [
    'users_enhanced', 'chat_messages', 'chat_conversations', 
    'effective_access_cache', 'tenant_usage', 'workflow_tasks'
  ];
  
  for (const table of tablesToBackup) {
    const exists = await tableExists(table);
    if (!exists) continue;
    
    const backupTable = `${CONFIG.backupSchema}.${table}_backup_${Date.now()}`;
    if (!CONFIG.dryRun) {
      await query(`CREATE TABLE IF NOT EXISTS ${backupTable} AS SELECT * FROM ${table}`);
    }
    log.success(`Backed up ${table}`);
  }
  
  // Migrate VARCHAR tenant_id columns to UUID
  for (const target of MIGRATION_TARGETS.varcharToUuid) {
    const exists = await tableExists(target.table);
    if (!exists) continue;
    
    const colType = await getColumnType(target.table, target.column);
    if (colType === 'uuid') {
      log.info(`${target.table}.${target.column} is already UUID`);
      continue;
    }
    
    if (!CONFIG.dryRun) {
      try {
        // Use safe casting that handles invalid UUIDs
        await query(`
          ALTER TABLE ${target.table} 
          ALTER COLUMN ${target.column} TYPE UUID USING (
            CASE 
              WHEN ${target.column} ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' 
              THEN ${target.column}::uuid 
              ELSE NULL 
            END
          )
        `);
        log.success(`Migrated ${target.table}.${target.column} to UUID`);
      } catch (err) {
        log.error(`Failed to migrate ${target.table}.${target.column}`, { error: err.message });
      }
    } else {
      log.info(`Would migrate ${target.table}.${target.column} from ${colType} to UUID`);
    }
  }
  
  // For integer columns, we need a more careful approach
  // Add new UUID columns and create mapping
  for (const target of MIGRATION_TARGETS.integerToUuid) {
    const exists = await tableExists(target.table);
    if (!exists) continue;
    
    const colType = await getColumnType(target.table, target.column);
    if (colType === 'uuid') {
      log.info(`${target.table}.${target.column} is already UUID`);
      continue;
    }
    
    const newColName = `${target.column}_uuid`;
    const newColExists = await columnExists(target.table, newColName);
    
    if (!newColExists && !CONFIG.dryRun) {
      try {
        // Add new UUID column
        await query(`ALTER TABLE ${target.table} ADD COLUMN IF NOT EXISTS ${newColName} UUID`);
        
        // For user-related columns, try to map via users_enhanced.legacy_id
        if (target.column.toLowerCase().includes('user') || 
            target.column.toLowerCase().includes('sender') ||
            target.column.toLowerCase().includes('approver') ||
            target.column === 'assigned_to') {
          await query(`
            UPDATE ${target.table} t
            SET ${newColName} = ue.id
            FROM users_enhanced ue
            WHERE ue.legacy_id::text = t.${target.column}::text
          `);
        }
        
        log.success(`Added UUID column ${target.table}.${newColName} and mapped values`);
      } catch (err) {
        log.error(`Failed to add UUID column for ${target.table}.${target.column}`, { error: err.message });
      }
    } else {
      log.info(`Would add ${target.table}.${newColName} and map from ${target.column}`);
    }
  }
  
  log.success('Phase 2 complete');
}

// =============================================================================
// PHASE 3: DROP LEGACY COLUMNS
// =============================================================================
async function phase3DropLegacy() {
  log.info('Starting Phase 3: Drop Legacy Columns');
  
  if (CONFIG.dryRun) {
    log.info('DRY RUN - No changes will be made');
  }
  
  for (const target of MIGRATION_TARGETS.legacyColumns) {
    const exists = await tableExists(target.table);
    if (!exists) {
      log.info(`Table ${target.table} does not exist, skipping`);
      continue;
    }
    
    for (const col of target.columns) {
      const colExists = await columnExists(target.table, col);
      if (!colExists) {
        log.info(`Column ${target.table}.${col} already removed`);
        continue;
      }
      
      if (!CONFIG.dryRun) {
        try {
          await query(`ALTER TABLE ${target.table} DROP COLUMN IF EXISTS "${col}"`);
          log.success(`Dropped ${target.table}.${col}`);
        } catch (err) {
          log.error(`Failed to drop ${target.table}.${col}`, { error: err.message });
        }
      } else {
        log.info(`Would drop ${target.table}.${col}`);
      }
    }
  }
  
  log.success('Phase 3 complete');
}

// =============================================================================
// PHASE 4: VALIDATION
// =============================================================================
async function phase4Validate() {
  log.info('Starting Phase 4: Validation');
  
  const issues = [];
  
  // Check all critical tables have UUID primary keys
  const criticalTables = ['users_enhanced', 'tasks', 'workflows', 'chat_messages', 'branches'];
  
  for (const table of criticalTables) {
    const exists = await tableExists(table);
    if (!exists) continue;
    
    const pkType = await query(`
      SELECT c.udt_name 
      FROM information_schema.columns c
      JOIN information_schema.table_constraints tc ON tc.table_name = c.table_name
      JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY' 
        AND c.table_name = $1 
        AND c.column_name = kcu.column_name
    `, [table]);
    
    if (pkType.rows.length > 0 && pkType.rows[0].udt_name !== 'uuid') {
      issues.push({ table, column: 'id', issue: `PK is ${pkType.rows[0].udt_name}, not UUID` });
    }
  }
  
  // Check for remaining INTEGER user_id columns
  const intUserIdCheck = await query(`
    SELECT table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('user_id', 'tenant_id', 'sender_id', 'creator_id')
      AND udt_name NOT IN ('uuid')
      AND table_name NOT LIKE '_%'
    ORDER BY table_name
  `);
  
  for (const row of intUserIdCheck.rows) {
    issues.push({ 
      table: row.table_name, 
      column: row.column_name, 
      issue: `Still ${row.udt_name}, should be UUID` 
    });
  }
  
  // Check for orphaned records
  const orphanCheck = await query(`
    SELECT 'workflow_tasks' as table_name, COUNT(*) as orphan_count
    FROM workflow_tasks wt
    LEFT JOIN users_enhanced ue ON wt.creator_id = ue.id::text
    WHERE wt.creator_id IS NOT NULL AND ue.id IS NULL
  `);
  
  if (orphanCheck.rows[0]?.orphan_count > 0) {
    issues.push({
      table: 'workflow_tasks',
      issue: `${orphanCheck.rows[0].orphan_count} orphaned records (creator_id not in users_enhanced)`
    });
  }
  
  // Summary
  if (issues.length === 0) {
    log.success('Validation passed - no issues found');
  } else {
    log.warn(`Validation found ${issues.length} issues`);
    issues.forEach(i => log.warn(`${i.table}.${i.column || ''}: ${i.issue}`));
  }
  
  return issues;
}

// =============================================================================
// PHASE 5: ADD CONSTRAINTS
// =============================================================================
async function phase5Constraints() {
  log.info('Starting Phase 5: Add Constraints');
  
  // Add compound unique constraint to tenant_usage
  const constraintExists = await query(`
    SELECT 1 FROM pg_constraint WHERE conname = 'tenant_usage_tenant_date_unique'
  `);
  
  if (constraintExists.rows.length === 0) {
    // Check for duplicates first
    const dupeCheck = await query(`
      SELECT tenant_id, date, COUNT(*) as cnt
      FROM tenant_usage
      WHERE tenant_id IS NOT NULL
      GROUP BY tenant_id, date
      HAVING COUNT(*) > 1
    `);
    
    if (dupeCheck.rows.length > 0) {
      log.warn(`Found ${dupeCheck.rows.length} duplicate tenant_id/date combinations`);
      
      // Remove duplicates keeping the latest
      if (!CONFIG.dryRun) {
        await query(`
          DELETE FROM tenant_usage a USING tenant_usage b
          WHERE a.id < b.id 
            AND a.tenant_id = b.tenant_id 
            AND a.date = b.date
        `);
        log.success('Removed duplicate tenant_usage records');
      }
    }
    
    if (!CONFIG.dryRun) {
      try {
        await query(`
          ALTER TABLE tenant_usage 
          ADD CONSTRAINT tenant_usage_tenant_date_unique 
          UNIQUE (tenant_id, date)
        `);
        log.success('Added tenant_usage_tenant_date_unique constraint');
      } catch (err) {
        log.error('Failed to add constraint', { error: err.message });
      }
    }
  } else {
    log.info('Constraint tenant_usage_tenant_date_unique already exists');
  }
  
  log.success('Phase 5 complete');
}

// =============================================================================
// ROLLBACK
// =============================================================================
async function rollback() {
  log.info('Starting Rollback');
  
  // List available backups
  const backups = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = $1
    ORDER BY table_name
  `, [CONFIG.backupSchema]);
  
  if (backups.rows.length === 0) {
    log.error('No backup tables found');
    return;
  }
  
  log.info(`Found ${backups.rows.length} backup tables`);
  backups.rows.forEach(r => log.info(`  - ${r.table_name}`));
  
  // TODO: Implement actual rollback logic based on backup tables
  log.warn('Rollback requires manual intervention - backup tables are available');
}

// =============================================================================
// MAIN
// =============================================================================
async function main() {
  console.log('');
  console.log('='.repeat(80));
  console.log('UUID MIGRATION EXECUTOR');
  console.log('='.repeat(80));
  console.log(`Database: ${DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Dry Run: ${CONFIG.dryRun}`);
  console.log('');
  
  const args = process.argv.slice(2);
  const phaseArg = args.find(a => a.startsWith('--phase='));
  const phase = phaseArg ? phaseArg.split('=')[1] : 'audit';
  
  try {
    if (args.includes('--rollback')) {
      await rollback();
    } else if (phase === '1' || phase === 'audit') {
      await phase1Audit();
    } else if (phase === '2' || phase === 'migrate') {
      await phase2Migrate();
    } else if (phase === '3' || phase === 'drop') {
      await phase3DropLegacy();
    } else if (phase === '4' || phase === 'validate') {
      await phase4Validate();
    } else if (phase === '5' || phase === 'constraints') {
      await phase5Constraints();
    } else if (phase === 'all') {
      log.info('Running all phases...');
      await phase1Audit();
      await phase2Migrate();
      await phase3DropLegacy();
      await phase5Constraints();
      await phase4Validate();
    } else {
      console.log('Usage:');
      console.log('  node scripts/uuid-migration-execute.js --phase=1        # Audit only');
      console.log('  node scripts/uuid-migration-execute.js --phase=2        # Backup & Migrate');
      console.log('  node scripts/uuid-migration-execute.js --phase=3        # Drop legacy columns');
      console.log('  node scripts/uuid-migration-execute.js --phase=4        # Validate');
      console.log('  node scripts/uuid-migration-execute.js --phase=5        # Add constraints');
      console.log('  node scripts/uuid-migration-execute.js --phase=all      # Full migration');
      console.log('  node scripts/uuid-migration-execute.js --rollback       # Rollback');
      console.log('');
      console.log('Options:');
      console.log('  --dry-run    Show what would be done without making changes');
      console.log('  --verbose    Show detailed output');
    }
  } catch (error) {
    log.error('Migration failed', { error: error.message, stack: error.stack });
  } finally {
    log.save();
    await pool.end();
  }
}

main();
