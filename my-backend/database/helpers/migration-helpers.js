/**
 * Knex Migration Helpers
 * BISMAN ERP - Safe, idempotent migration utilities
 * 
 * Usage in migrations:
 *   const helpers = require('../helpers/migration-helpers');
 *   await helpers.createTableIfNotExists(knex, 'my_table', (table) => { ... });
 */

/**
 * Create a table only if it doesn't exist
 */
async function createTableIfNotExists(knex, tableName, tableBuilder) {
  const exists = await knex.schema.hasTable(tableName);
  if (!exists) {
    await knex.schema.createTable(tableName, tableBuilder);
    console.log(`  ✓ Created table: ${tableName}`);
    return true;
  }
  console.log(`  → Table ${tableName} already exists, skipping`);
  return false;
}

/**
 * Drop a table only if it exists
 */
async function dropTableIfExists(knex, tableName) {
  const exists = await knex.schema.hasTable(tableName);
  if (exists) {
    await knex.schema.dropTable(tableName);
    console.log(`  ✓ Dropped table: ${tableName}`);
    return true;
  }
  console.log(`  → Table ${tableName} doesn't exist, skipping`);
  return false;
}

/**
 * Add a column only if it doesn't exist
 */
async function addColumnIfNotExists(knex, tableName, columnName, columnBuilder) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (!exists) {
    await knex.schema.alterTable(tableName, (table) => {
      columnBuilder(table);
    });
    console.log(`  ✓ Added column: ${tableName}.${columnName}`);
    return true;
  }
  console.log(`  → Column ${tableName}.${columnName} already exists, skipping`);
  return false;
}

/**
 * Drop a column only if it exists
 */
async function dropColumnIfExists(knex, tableName, columnName) {
  const exists = await knex.schema.hasColumn(tableName, columnName);
  if (exists) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropColumn(columnName);
    });
    console.log(`  ✓ Dropped column: ${tableName}.${columnName}`);
    return true;
  }
  console.log(`  → Column ${tableName}.${columnName} doesn't exist, skipping`);
  return false;
}

/**
 * Create an index if it doesn't exist
 */
async function createIndexIfNotExists(knex, tableName, indexName, columns) {
  const result = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = ? 
    AND indexname = ?
  `, [tableName, indexName]);
  
  if (result.rows.length === 0) {
    const columnList = Array.isArray(columns) ? columns.join(', ') : columns;
    await knex.raw(`CREATE INDEX "${indexName}" ON "${tableName}" (${columnList})`);
    console.log(`  ✓ Created index: ${indexName}`);
    return true;
  }
  console.log(`  → Index ${indexName} already exists, skipping`);
  return false;
}

/**
 * Drop an index if it exists
 */
async function dropIndexIfExists(knex, indexName) {
  await knex.raw(`DROP INDEX IF EXISTS "${indexName}"`);
  console.log(`  ✓ Dropped index (if existed): ${indexName}`);
  return true;
}

/**
 * Add a foreign key constraint if it doesn't exist
 */
async function addForeignKeyIfNotExists(knex, tableName, constraintName, columnName, refTable, refColumn, onDelete = 'CASCADE') {
  const result = await knex.raw(`
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = ? 
    AND table_name = ?
  `, [constraintName, tableName]);
  
  if (result.rows.length === 0) {
    await knex.raw(`
      ALTER TABLE "${tableName}" 
      ADD CONSTRAINT "${constraintName}" 
      FOREIGN KEY ("${columnName}") 
      REFERENCES "${refTable}"("${refColumn}") 
      ON DELETE ${onDelete}
    `);
    console.log(`  ✓ Added FK: ${constraintName}`);
    return true;
  }
  console.log(`  → FK ${constraintName} already exists, skipping`);
  return false;
}

/**
 * Drop a constraint if it exists
 */
async function dropConstraintIfExists(knex, tableName, constraintName) {
  const result = await knex.raw(`
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = ? 
    AND table_name = ?
  `, [constraintName, tableName]);
  
  if (result.rows.length > 0) {
    await knex.raw(`ALTER TABLE "${tableName}" DROP CONSTRAINT "${constraintName}"`);
    console.log(`  ✓ Dropped constraint: ${constraintName}`);
    return true;
  }
  console.log(`  → Constraint ${constraintName} doesn't exist, skipping`);
  return false;
}

/**
 * Add a CHECK constraint if it doesn't exist
 */
async function addCheckConstraintIfNotExists(knex, tableName, constraintName, checkExpression) {
  const result = await knex.raw(`
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = ? 
    AND constraint_type = 'CHECK'
  `, [constraintName]);
  
  if (result.rows.length === 0) {
    await knex.raw(`
      ALTER TABLE "${tableName}" 
      ADD CONSTRAINT "${constraintName}" 
      CHECK (${checkExpression})
    `);
    console.log(`  ✓ Added CHECK: ${constraintName}`);
    return true;
  }
  console.log(`  → CHECK ${constraintName} already exists, skipping`);
  return false;
}

/**
 * Rename a table if the old name exists and new name doesn't
 */
async function renameTableIfExists(knex, oldName, newName) {
  const oldExists = await knex.schema.hasTable(oldName);
  const newExists = await knex.schema.hasTable(newName);
  
  if (oldExists && !newExists) {
    await knex.schema.renameTable(oldName, newName);
    console.log(`  ✓ Renamed table: ${oldName} → ${newName}`);
    return true;
  }
  if (newExists) {
    console.log(`  → Table ${newName} already exists, skipping rename`);
  } else {
    console.log(`  → Table ${oldName} doesn't exist, skipping`);
  }
  return false;
}

/**
 * Get column type for a table column
 */
async function getColumnType(knex, tableName, columnName) {
  const result = await knex.raw(`
    SELECT data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = ? AND column_name = ?
  `, [tableName, columnName]);
  
  return result.rows[0] || null;
}

/**
 * Check if a constraint exists
 */
async function constraintExists(knex, constraintName) {
  const result = await knex.raw(`
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = ?
  `, [constraintName]);
  return result.rows.length > 0;
}

/**
 * Check if an index exists
 */
async function indexExists(knex, indexName) {
  const result = await knex.raw(`
    SELECT 1 FROM pg_indexes WHERE indexname = ?
  `, [indexName]);
  return result.rows.length > 0;
}

/**
 * Execute raw SQL with error handling
 */
async function safeRaw(knex, sql, errorMessage = 'SQL execution failed') {
  try {
    await knex.raw(sql);
    return true;
  } catch (error) {
    console.warn(`  ⚠ ${errorMessage}: ${error.message}`);
    return false;
  }
}

module.exports = {
  createTableIfNotExists,
  dropTableIfExists,
  addColumnIfNotExists,
  dropColumnIfExists,
  createIndexIfNotExists,
  dropIndexIfExists,
  addForeignKeyIfNotExists,
  dropConstraintIfExists,
  addCheckConstraintIfNotExists,
  renameTableIfExists,
  getColumnType,
  constraintExists,
  indexExists,
  safeRaw,
};
