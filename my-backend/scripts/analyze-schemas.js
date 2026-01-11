#!/usr/bin/env node
/**
 * Analyze ERP schema usage
 */

const knex = require('../database/knex');

async function analyzeSchemas() {
  try {
    console.log('📊 ERP Schema Tables - Row Counts:\n');
    
    const erpTables = await knex.db.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'erp' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    let totalErpRows = 0;
    for (const t of erpTables.rows) {
      try {
        const count = await knex.db.raw(`SELECT COUNT(*) as cnt FROM erp."${t.table_name}"`);
        const cnt = parseInt(count.rows[0].cnt);
        totalErpRows += cnt;
        console.log(`  erp.${t.table_name}: ${cnt} rows`);
      } catch(e) {
        console.log(`  erp.${t.table_name}: ERROR - ${e.message}`);
      }
    }
    console.log(`\n  TOTAL ERP ROWS: ${totalErpRows}`);
    
    console.log('\n🔍 Tables in BOTH schemas (duplicates):');
    const duplicates = await knex.db.raw(`
      SELECT p.table_name FROM information_schema.tables p
      JOIN information_schema.tables e ON p.table_name = e.table_name
      WHERE p.table_schema = 'public' AND e.table_schema = 'erp'
      AND p.table_type = 'BASE TABLE' ORDER BY p.table_name
    `);
    if (duplicates.rows.length === 0) {
      console.log('  (none)');
    } else {
      duplicates.rows.forEach(t => console.log(`  - ${t.table_name}`));
    }
    
    process.exit(0);
  } catch(e) { 
    console.error('Error:', e.message); 
    process.exit(1); 
  }
}

analyzeSchemas();
