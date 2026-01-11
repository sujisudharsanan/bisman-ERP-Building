#!/usr/bin/env node
/**
 * Check Railway Database Schema
 * Run with: railway run node scripts/check-railway-schema.js
 */

const { Client } = require('pg');

async function checkRailwaySchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to Railway PostgreSQL\n');

    // Get schema counts
    const schemaCounts = await client.query(`
      SELECT table_schema, COUNT(*) as table_count
      FROM information_schema.tables 
      WHERE table_type = 'BASE TABLE'
      AND table_schema NOT IN ('pg_catalog', 'information_schema')
      GROUP BY table_schema
      ORDER BY table_schema
    `);

    console.log('📊 Table Count by Schema:\n');
    let total = 0;
    for (const row of schemaCounts.rows) {
      console.log(`  ${row.table_schema}: ${row.table_count} tables`);
      total += parseInt(row.table_count);
    }
    console.log(`\n  TOTAL: ${total} tables`);

    // Check migration tables
    console.log('\n📋 Migration Tracking Tables:');
    
    const migrationTables = ['migration_history', 'knex_migrations', '_prisma_migrations', 'schema_migrations'];
    for (const table of migrationTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as cnt FROM public.${table}`);
        console.log(`  ${table}: ${result.rows[0].cnt} records`);
      } catch (_) {
        console.log(`  ${table}: not found`);
      }
    }

    // List tables in public schema
    console.log('\n📋 Tables in public schema (first 30):');
    const publicTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name LIMIT 30
    `);
    publicTables.rows.forEach(t => console.log(`  - ${t.table_name}`));

    // Check erp schema
    const erpTables = await client.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'erp' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    if (erpTables.rows.length > 0) {
      console.log(`\n📋 Tables in erp schema (${erpTables.rows.length} total):`);
      
      let totalErpRows = 0;
      for (const t of erpTables.rows) {
        try {
          const count = await client.query(`SELECT COUNT(*) as cnt FROM erp."${t.table_name}"`);
          const cnt = parseInt(count.rows[0].cnt);
          totalErpRows += cnt;
          console.log(`  erp.${t.table_name}: ${cnt} rows`);
        } catch (e) {
          console.log(`  erp.${t.table_name}: error`);
        }
      }
      console.log(`\n  TOTAL ERP ROWS: ${totalErpRows}`);
    }

    console.log('\n✅ Railway schema check complete');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkRailwaySchema();
