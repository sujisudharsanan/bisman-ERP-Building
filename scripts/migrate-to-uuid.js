#!/usr/bin/env node
/**
 * UUID Migration Script - 053
 * 
 * This script migrates all core tables from INT/TEXT IDs to UUID
 * with proper foreign key handling and rollback capability.
 * 
 * Usage:
 *   node scripts/migrate-to-uuid.js --dry-run    # Preview changes
 *   node scripts/migrate-to-uuid.js --execute    # Run migration
 *   node scripts/migrate-to-uuid.js --verify     # Verify migration
 *   node scripts/migrate-to-uuid.js --cleanup    # Remove old columns (DANGER!)
 */

const { Pool } = require('pg');

// Configuration
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

const pool = new Pool({ connectionString: DATABASE_URL });

// Tables to migrate
const MIGRATION_CONFIG = {
  chat_conversations: {
    idColumn: 'id',
    oldType: 'int4',
    userColumns: ['user_id']
  },
  chat_messages: {
    idColumn: 'id',
    oldType: 'int4',
    userColumns: ['user_id'],
    foreignKeys: [
      { column: 'conversation_id', referencesTable: 'chat_conversations', referencesColumn: 'id' }
    ]
  },
  workflow_tasks: {
    idColumn: 'id',
    oldType: 'int4',
    userColumns: ['creator_id', 'assignee_id', 'approver_id']
  },
  task_requests: {
    idColumn: 'id',
    oldType: 'int4',
    foreignKeys: [
      { column: 'converted_task_id', referencesTable: 'workflow_tasks', referencesColumn: 'id' }
    ]
  },
  task_messages: {
    idColumn: 'id',
    oldType: 'int4',
    userColumns: ['sender_id'],
    foreignKeys: [
      { column: 'task_id', referencesTable: 'workflow_tasks', referencesColumn: 'id' },
      { column: 'reply_to_id', referencesTable: 'task_messages', referencesColumn: 'id' }
    ]
  },
  threads: {
    idColumn: 'id',
    oldType: 'text'
  },
  thread_messages: {
    idColumn: 'id',
    oldType: 'text',
    foreignKeys: [
      { column: 'threadId', referencesTable: 'threads', referencesColumn: 'id', newName: 'thread_id' },
      { column: 'replyToId', referencesTable: 'thread_messages', referencesColumn: 'id', newName: 'reply_to_id' }
    ]
  },
  rbac_user_permissions: {
    idColumn: null, // Don't change PK, only user_id
    userColumns: ['user_id']
  }
};

// Utility functions
function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    step: '🔧'
  }[level] || '•';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

async function getTableRowCount(tableName) {
  const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
  return parseInt(result.rows[0].count);
}

async function columnExists(tableName, columnName) {
  const result = await pool.query(`
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = $1 AND column_name = $2
  `, [tableName, columnName]);
  return result.rows.length > 0;
}

async function constraintExists(constraintName) {
  const result = await pool.query(`
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = $1
  `, [constraintName]);
  return result.rows.length > 0;
}

// Migration phases
async function phase1_addUuidColumns(dryRun = true) {
  log('step', 'Phase 1: Adding UUID columns to all tables');
  
  for (const [tableName, config] of Object.entries(MIGRATION_CONFIG)) {
    // Add id_uuid if this table needs PK migration
    if (config.idColumn) {
      const hasIdUuid = await columnExists(tableName, 'id_uuid');
      if (!hasIdUuid) {
        const sql = `ALTER TABLE ${tableName} ADD COLUMN id_uuid UUID DEFAULT uuid_generate_v4()`;
        log('info', `  ${tableName}: Adding id_uuid column`);
        if (!dryRun) await pool.query(sql);
      }
    }
    
    // Add user_id_uuid columns
    if (config.userColumns) {
      for (const col of config.userColumns) {
        const hasUuidCol = await columnExists(tableName, `${col}_uuid`);
        if (!hasUuidCol) {
          const sql = `ALTER TABLE ${tableName} ADD COLUMN ${col}_uuid UUID`;
          log('info', `  ${tableName}: Adding ${col}_uuid column`);
          if (!dryRun) await pool.query(sql);
        }
      }
    }
    
    // Add foreign key UUID columns
    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        const uuidColName = `${fk.newName || fk.column}_uuid`;
        const hasUuidCol = await columnExists(tableName, uuidColName);
        if (!hasUuidCol) {
          const sql = `ALTER TABLE ${tableName} ADD COLUMN ${uuidColName} UUID`;
          log('info', `  ${tableName}: Adding ${uuidColName} column`);
          if (!dryRun) await pool.query(sql);
        }
      }
    }
  }
  
  log('success', 'Phase 1 complete');
}

async function phase2_populateUuids(dryRun = true) {
  log('step', 'Phase 2: Populating UUID values');
  
  for (const [tableName, config] of Object.entries(MIGRATION_CONFIG)) {
    const rowCount = await getTableRowCount(tableName);
    log('info', `  ${tableName}: ${rowCount} rows`);
    
    // Generate UUIDs for id column
    if (config.idColumn) {
      const sql = `UPDATE ${tableName} SET id_uuid = uuid_generate_v4() WHERE id_uuid IS NULL`;
      log('info', `    Generating UUIDs for id column`);
      if (!dryRun) {
        const result = await pool.query(sql);
        log('info', `    Updated ${result.rowCount} rows`);
      }
    }
    
    // Link user columns to users_enhanced
    if (config.userColumns) {
      for (const col of config.userColumns) {
        const sql = `
          UPDATE ${tableName} t
          SET ${col}_uuid = ue.id
          FROM users_enhanced ue
          WHERE t.${col} = ue.id::text
            AND t.${col}_uuid IS NULL
        `;
        log('info', `    Linking ${col} to users_enhanced`);
        if (!dryRun) {
          const result = await pool.query(sql);
          log('info', `    Linked ${result.rowCount} rows`);
        }
      }
    }
  }
  
  log('success', 'Phase 2 complete');
}

async function phase3_linkForeignKeys(dryRun = true) {
  log('step', 'Phase 3: Linking foreign key UUIDs');
  
  // First, ensure parent tables are processed
  const order = [
    'chat_conversations',
    'workflow_tasks', 
    'threads',
    'chat_messages',
    'task_messages',
    'thread_messages',
    'task_requests'
  ];
  
  for (const tableName of order) {
    const config = MIGRATION_CONFIG[tableName];
    if (!config?.foreignKeys) continue;
    
    for (const fk of config.foreignKeys) {
      const uuidColName = `${fk.newName || fk.column}_uuid`;
      
      // Handle camelCase column names
      const sourceCol = fk.column.includes('Id') ? `"${fk.column}"` : fk.column;
      
      const sql = `
        UPDATE ${tableName} t
        SET ${uuidColName} = ref.id_uuid
        FROM ${fk.referencesTable} ref
        WHERE t.${sourceCol} = ref.${fk.referencesColumn}${config.oldType === 'text' ? '' : '::text'}
          AND t.${uuidColName} IS NULL
      `;
      
      log('info', `  ${tableName}.${fk.column} → ${fk.referencesTable}.${fk.referencesColumn}`);
      if (!dryRun) {
        try {
          const result = await pool.query(sql);
          log('info', `    Linked ${result.rowCount} rows`);
        } catch (err) {
          log('warning', `    Failed: ${err.message}`);
        }
      }
    }
  }
  
  log('success', 'Phase 3 complete');
}

async function phase4_dropConstraints(dryRun = true) {
  log('step', 'Phase 4: Dropping old foreign key constraints');
  
  const constraintsToDrop = [
    'chat_messages_conversation_id_fkey',
    'fk_chat_messages_conversation',
    'task_messages_task_id_fkey',
    'fk_task_messages_task',
    'task_messages_reply_to_id_fkey',
    'thread_messages_threadId_fkey',
    'thread_messages_replyToId_fkey'
  ];
  
  for (const constraint of constraintsToDrop) {
    const exists = await constraintExists(constraint);
    if (exists) {
      // Need to find which table owns this constraint
      const result = await pool.query(`
        SELECT table_name FROM information_schema.table_constraints 
        WHERE constraint_name = $1
      `, [constraint]);
      
      if (result.rows.length > 0) {
        const tableName = result.rows[0].table_name;
        const sql = `ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS "${constraint}"`;
        log('info', `  Dropping ${tableName}.${constraint}`);
        if (!dryRun) await pool.query(sql);
      }
    }
  }
  
  log('success', 'Phase 4 complete');
}

async function phase5_renameColumns(dryRun = true) {
  log('step', 'Phase 5: Renaming columns (old → backup, uuid → main)');
  
  for (const [tableName, config] of Object.entries(MIGRATION_CONFIG)) {
    log('info', `  Processing ${tableName}`);
    
    // Rename id column
    if (config.idColumn) {
      const hasIdOld = await columnExists(tableName, 'id_old');
      if (!hasIdOld) {
        if (!dryRun) {
          await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN id TO id_old`);
          await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN id_uuid TO id`);
        }
        log('info', `    id → id_old, id_uuid → id`);
      }
    }
    
    // Rename user columns
    if (config.userColumns) {
      for (const col of config.userColumns) {
        const hasOld = await columnExists(tableName, `${col}_old`);
        if (!hasOld) {
          if (!dryRun) {
            await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN ${col} TO ${col}_old`);
            await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN ${col}_uuid TO ${col}`);
          }
          log('info', `    ${col} → ${col}_old, ${col}_uuid → ${col}`);
        }
      }
    }
    
    // Rename foreign key columns
    if (config.foreignKeys) {
      for (const fk of config.foreignKeys) {
        const newName = fk.newName || fk.column;
        const sourceCol = fk.column;
        const hasOld = await columnExists(tableName, `${newName}_old`);
        
        if (!hasOld) {
          if (!dryRun) {
            // Handle camelCase
            const quotedSource = sourceCol.includes('I') ? `"${sourceCol}"` : sourceCol;
            await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN ${quotedSource} TO ${newName}_old`);
            await pool.query(`ALTER TABLE ${tableName} RENAME COLUMN ${newName}_uuid TO ${newName}`);
          }
          log('info', `    ${sourceCol} → ${newName}_old, ${newName}_uuid → ${newName}`);
        }
      }
    }
  }
  
  log('success', 'Phase 5 complete');
}

async function phase6_createConstraints(dryRun = true) {
  log('step', 'Phase 6: Creating new primary and foreign key constraints');
  
  // Tables that need new PKs
  const tablesWithNewPK = [
    'chat_conversations',
    'chat_messages', 
    'workflow_tasks',
    'task_requests',
    'task_messages',
    'threads',
    'thread_messages'
  ];
  
  for (const tableName of tablesWithNewPK) {
    log('info', `  ${tableName}: Setting up primary key`);
    if (!dryRun) {
      try {
        await pool.query(`ALTER TABLE ${tableName} DROP CONSTRAINT IF EXISTS ${tableName}_pkey`);
        await pool.query(`ALTER TABLE ${tableName} ADD PRIMARY KEY (id)`);
      } catch (err) {
        log('warning', `    PK already exists or error: ${err.message}`);
      }
    }
  }
  
  // Foreign key constraints
  const fkConstraints = [
    { table: 'chat_messages', column: 'conversation_id', refs: 'chat_conversations(id)', onDelete: 'CASCADE' },
    { table: 'chat_messages', column: 'user_id', refs: 'users_enhanced(id)', onDelete: 'SET NULL' },
    { table: 'chat_conversations', column: 'user_id', refs: 'users_enhanced(id)', onDelete: 'SET NULL' },
    { table: 'task_messages', column: 'task_id', refs: 'workflow_tasks(id)', onDelete: 'CASCADE' },
    { table: 'task_messages', column: 'sender_id', refs: 'users_enhanced(id)', onDelete: 'SET NULL' },
    { table: 'thread_messages', column: 'thread_id', refs: 'threads(id)', onDelete: 'CASCADE' },
    { table: 'workflow_tasks', column: 'creator_id', refs: 'users_enhanced(id)', onDelete: 'SET NULL' },
    { table: 'workflow_tasks', column: 'assignee_id', refs: 'users_enhanced(id)', onDelete: 'SET NULL' }
  ];
  
  for (const fk of fkConstraints) {
    const constraintName = `fk_${fk.table}_${fk.column}`;
    log('info', `  ${fk.table}.${fk.column} → ${fk.refs}`);
    if (!dryRun) {
      try {
        await pool.query(`
          ALTER TABLE ${fk.table} 
          ADD CONSTRAINT ${constraintName} 
          FOREIGN KEY (${fk.column}) REFERENCES ${fk.refs} 
          ON DELETE ${fk.onDelete}
        `);
      } catch (err) {
        log('warning', `    FK error: ${err.message}`);
      }
    }
  }
  
  log('success', 'Phase 6 complete');
}

async function phase7_createIndexes(dryRun = true) {
  log('step', 'Phase 7: Creating indexes');
  
  const indexes = [
    { table: 'chat_conversations', column: 'user_id' },
    { table: 'chat_messages', column: 'conversation_id' },
    { table: 'chat_messages', column: 'user_id' },
    { table: 'workflow_tasks', column: 'creator_id' },
    { table: 'workflow_tasks', column: 'assignee_id' },
    { table: 'task_messages', column: 'task_id' },
    { table: 'task_messages', column: 'sender_id' },
    { table: 'thread_messages', column: 'thread_id' },
    { table: 'rbac_user_permissions', column: 'user_id' }
  ];
  
  for (const idx of indexes) {
    const indexName = `idx_${idx.table}_${idx.column}_uuid`;
    log('info', `  Creating ${indexName}`);
    if (!dryRun) {
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${idx.table}(${idx.column})`);
      } catch (err) {
        log('warning', `    Index error: ${err.message}`);
      }
    }
  }
  
  log('success', 'Phase 7 complete');
}

async function verify() {
  log('step', 'Verifying migration...');
  
  const results = [];
  
  for (const [tableName, config] of Object.entries(MIGRATION_CONFIG)) {
    const hasOldId = config.idColumn ? await columnExists(tableName, 'id_old') : false;
    
    // Check column type
    let idType = 'N/A';
    if (config.idColumn) {
      const typeResult = await pool.query(`
        SELECT udt_name FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'id'
      `, [tableName]);
      idType = typeResult.rows[0]?.udt_name || 'missing';
    }
    
    const rowCount = await getTableRowCount(tableName);
    
    // Check null UUIDs
    let nullCount = 0;
    if (config.idColumn) {
      const nullResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName} WHERE id IS NULL`);
      nullCount = parseInt(nullResult.rows[0].count);
    }
    
    results.push({
      table: tableName,
      rows: rowCount,
      idType,
      hasBackup: hasOldId,
      nullIds: nullCount,
      status: idType === 'uuid' && nullCount === 0 ? '✅' : '❌'
    });
  }
  
  console.log('\n📊 Migration Verification Results:\n');
  console.table(results);
  
  return results.every(r => r.status === '✅');
}

async function cleanup(dryRun = true) {
  log('step', 'Phase 8: Cleanup - Removing old columns');
  log('warning', 'This is a DESTRUCTIVE operation! Make sure migration is verified.');
  
  if (dryRun) {
    log('info', 'Dry run - no changes will be made');
    return;
  }
  
  const columnsToRemove = [
    { table: 'chat_conversations', columns: ['id_old', 'user_id_old'] },
    { table: 'chat_messages', columns: ['id_old', 'conversation_id_old', 'user_id_old'] },
    { table: 'workflow_tasks', columns: ['id_old', 'creator_id_old', 'assignee_id_old', 'approver_id_old'] },
    { table: 'task_requests', columns: ['id_old', 'converted_task_id_old'] },
    { table: 'task_messages', columns: ['id_old', 'task_id_old', 'sender_id_old', 'reply_to_id_old'] },
    { table: 'threads', columns: ['id_old'] },
    { table: 'thread_messages', columns: ['id_old', 'thread_id_old', 'reply_to_id_old'] },
    { table: 'rbac_user_permissions', columns: ['user_id_old'] }
  ];
  
  for (const { table, columns } of columnsToRemove) {
    for (const col of columns) {
      const exists = await columnExists(table, col);
      if (exists) {
        log('info', `  Dropping ${table}.${col}`);
        await pool.query(`ALTER TABLE ${table} DROP COLUMN IF EXISTS ${col}`);
      }
    }
  }
  
  log('success', 'Cleanup complete');
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const verifyOnly = args.includes('--verify');
  const cleanupOnly = args.includes('--cleanup');
  
  console.log('\n' + '='.repeat(60));
  console.log('  UUID MIGRATION SCRIPT - 053');
  console.log('  Mode: ' + (dryRun ? 'DRY RUN (preview)' : '🔥 EXECUTE MODE 🔥'));
  console.log('='.repeat(60) + '\n');
  
  try {
    // Ensure uuid extension exists
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    
    if (verifyOnly) {
      const success = await verify();
      process.exit(success ? 0 : 1);
    }
    
    if (cleanupOnly) {
      await cleanup(dryRun);
      process.exit(0);
    }
    
    // Run all phases
    await phase1_addUuidColumns(dryRun);
    await phase2_populateUuids(dryRun);
    await phase3_linkForeignKeys(dryRun);
    await phase4_dropConstraints(dryRun);
    await phase5_renameColumns(dryRun);
    await phase6_createConstraints(dryRun);
    await phase7_createIndexes(dryRun);
    
    console.log('\n' + '='.repeat(60));
    if (dryRun) {
      console.log('  DRY RUN COMPLETE');
      console.log('  Run with --execute to apply changes');
    } else {
      console.log('  MIGRATION COMPLETE');
      console.log('  Run with --verify to check results');
      console.log('  Run with --cleanup --execute to remove old columns');
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    log('error', 'Migration failed', { message: error.message, stack: error.stack });
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
