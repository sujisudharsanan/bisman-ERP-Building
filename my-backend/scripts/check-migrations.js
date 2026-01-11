#!/usr/bin/env node
/**
 * Check pending database migrations
 */

const knex = require('../database/knex');

async function checkMigrations() {
  try {
    console.log('🔍 Checking database migration status...\n');

    // Check migration_history table
    const r1 = await knex.db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'migration_history'
      ) as exists
    `);
    console.log('migration_history table exists:', r1.rows[0].exists);

    if (r1.rows[0].exists) {
      const history = await knex.db('migration_history')
        .select('*')
        .orderBy('applied_at', 'desc')
        .limit(20);
      console.log('\nRecent migrations from migration_history:');
      if (history.length === 0) {
        console.log('  (no migrations recorded)');
      } else {
        history.forEach(m => console.log(`  - ${m.migration_name} (applied: ${m.applied_at})`));
      }
    }

    // Check knex_migrations table
    const r2 = await knex.db.raw(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'knex_migrations'
      ) as exists
    `);
    console.log('\nknex_migrations table exists:', r2.rows[0].exists);

    if (r2.rows[0].exists) {
      const knexHistory = await knex.db('knex_migrations')
        .select('*')
        .orderBy('id', 'desc')
        .limit(20);
      console.log('\nKnex migrations applied:');
      if (knexHistory.length === 0) {
        console.log('  (no migrations recorded)');
      } else {
        knexHistory.forEach(m => console.log(`  - ${m.name} (batch: ${m.batch})`));
      }
    }

    // List migration files in directory
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../../database/migrations');
    
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();
      console.log(`\n📁 Migration files in database/migrations (${files.length} total):`);
      files.slice(-10).forEach(f => console.log(`  - ${f}`));
      if (files.length > 10) {
        console.log(`  ... and ${files.length - 10} more`);
      }
    }

    console.log('\n✅ Migration check complete');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkMigrations();
