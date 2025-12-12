/**
 * Migration: 20251211000000_baseline_schema
 * 
 * Purpose: Baseline migration to establish Knex migration tracking
 * This marks the current schema as the starting point for Knex migrations.
 * 
 * Note: This migration does NOT modify any existing tables.
 * It only creates the knex_migrations tracking table and records
 * that the existing schema is already in place.
 */

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function(knex) {
  console.log('📌 Baseline migration - establishing Knex tracking');
  
  // Create a schema_info table to track migration metadata
  const hasSchemaInfo = await knex.schema.hasTable('_schema_info');
  
  if (!hasSchemaInfo) {
    await knex.schema.createTable('_schema_info', (table) => {
      table.increments('id').primary();
      table.string('key', 100).unique().notNullable();
      table.text('value');
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    
    // Record baseline info
    await knex('_schema_info').insert([
      { key: 'baseline_migration', value: '20251211000000_baseline_schema' },
      { key: 'baseline_date', value: new Date().toISOString() },
      { key: 'migration_tool', value: 'knex' },
    ]);
    
    console.log('✓ Created _schema_info table');
  } else {
    console.log('→ _schema_info table already exists, skipping');
  }
  
  // Log current table count for reference
  const result = await knex.raw(`
    SELECT COUNT(*) as table_count 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
  `);
  
  const tableCount = result.rows[0].table_count;
  console.log(`✓ Baseline established with ${tableCount} existing tables`);
  
  // Update schema info with table count
  await knex('_schema_info')
    .insert({ key: 'baseline_table_count', value: tableCount.toString() })
    .onConflict('key')
    .merge();
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function(knex) {
  console.log('⏪ Rolling back baseline migration');
  
  const hasSchemaInfo = await knex.schema.hasTable('_schema_info');
  
  if (hasSchemaInfo) {
    await knex.schema.dropTable('_schema_info');
    console.log('✓ Dropped _schema_info table');
  }
};
