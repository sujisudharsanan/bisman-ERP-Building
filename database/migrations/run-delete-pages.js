#!/usr/bin/env node
/* eslint-disable no-undef */
/**
 * Run delete-pages migration on Railway database
 * Usage: node run-delete-pages.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = 'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';

async function runMigration() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Railway database...');
    const client = await pool.connect();
    
    console.log('Reading migration file...');
    const sqlPath = path.join(__dirname, 'delete-pages-2026-01-21.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Running migration...');
    await client.query(sql);
    
    console.log('✅ Migration completed successfully!');
    
    // Verify the changes
    const result = await client.query(`
      SELECT COUNT(*) as count FROM pages_master WHERE is_active = false AND route IN (
        '/super-admin/system/deployment-tools',
        '/super-admin/system/fallback-recovery',
        '/super-admin/decision-load',
        '/dashboard/requests',
        '/system/pages-roles-report',
        '/common/hr-policy',
        '/common/change-password',
        '/common/help-center'
      )
    `);
    
    console.log(`Deactivated pages count: ${result.rows[0].count}`);
    
    client.release();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
