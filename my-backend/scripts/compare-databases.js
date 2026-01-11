#!/usr/bin/env node
/**
 * Compare Local vs Railway Database Tables
 */

const { Client } = require('pg');
const knex = require('../database/knex');

const RAILWAY_URL = process.env.RAILWAY_DATABASE_URL || 
  "postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway";

async function compareDatabases() {
  const railwayClient = new Client({
    connectionString: RAILWAY_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Get local tables
    console.log('📊 Fetching local tables...');
    const localTables = await knex.db.raw(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const localSet = new Set(localTables.rows.map(t => t.table_name));

    // Get Railway tables
    console.log('📊 Fetching Railway tables...');
    await railwayClient.connect();
    const railwayTables = await railwayClient.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    const railwaySet = new Set(railwayTables.rows.map(t => t.table_name));

    // Find differences
    const missingInRailway = [...localSet].filter(t => !railwaySet.has(t));
    const missingInLocal = [...railwaySet].filter(t => !localSet.has(t));

    console.log(`\n📋 Local: ${localSet.size} tables`);
    console.log(`📋 Railway: ${railwaySet.size} tables`);

    if (missingInRailway.length > 0) {
      console.log(`\n⚠️  Tables MISSING in Railway (${missingInRailway.length}):`);
      missingInRailway.forEach(t => console.log(`  - ${t}`));
    } else {
      console.log('\n✅ No tables missing in Railway');
    }

    if (missingInLocal.length > 0) {
      console.log(`\n⚠️  Tables MISSING in Local (${missingInLocal.length}):`);
      missingInLocal.forEach(t => console.log(`  - ${t}`));
    } else {
      console.log('✅ No tables missing in Local');
    }

    // For missing tables, get their structure
    if (missingInRailway.length > 0) {
      console.log('\n📝 Generating CREATE TABLE statements for missing tables...\n');
      
      for (const tableName of missingInRailway) {
        const columns = await knex.db.raw(`
          SELECT column_name, data_type, is_nullable, column_default, 
                 character_maximum_length, numeric_precision, numeric_scale
          FROM information_schema.columns 
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position
        `, [tableName]);
        
        console.log(`-- Table: ${tableName}`);
        console.log(`-- Columns: ${columns.rows.length}`);
        
        // Get row count
        try {
          const count = await knex.db.raw(`SELECT COUNT(*) as cnt FROM "${tableName}"`);
          console.log(`-- Rows: ${count.rows[0].cnt}`);
        } catch {
          console.log(`-- Rows: error reading`);
        }
        console.log('');
      }
    }

    console.log('\n✅ Comparison complete');
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await railwayClient.end();
    process.exit(0);
  }
}

compareDatabases();
