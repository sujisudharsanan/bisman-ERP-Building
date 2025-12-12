/**
 * Knex Database Connection Module
 * BISMAN ERP - Centralized database connection using Knex
 * 
 * Usage:
 *   const { db, raw } = require('./database/knex');
 *   const users = await db('users').select('*');
 */

const knex = require('knex');
const config = require('../knexfile');

// Determine environment
const environment = process.env.NODE_ENV || 'development';
const dbConfig = config[environment];

if (!dbConfig) {
  throw new Error(`No Knex configuration found for environment: ${environment}`);
}

// Create Knex instance
const db = knex(dbConfig);

// Connection health check
async function checkConnection() {
  try {
    await db.raw('SELECT 1');
    console.log(`✓ Knex connected to ${environment} database`);
    return true;
  } catch (error) {
    console.error(`✗ Knex connection failed:`, error.message);
    return false;
  }
}

// Get migration status
async function getMigrationStatus() {
  try {
    const [completed, pending] = await Promise.all([
      db.migrate.list().then(([completed]) => completed),
      db.migrate.list().then(([, pending]) => pending),
    ]);
    
    return {
      completed: completed.length,
      pending: pending.length,
      completedMigrations: completed,
      pendingMigrations: pending,
    };
  } catch (error) {
    console.error('Failed to get migration status:', error.message);
    return null;
  }
}

// Run pending migrations
async function runMigrations() {
  try {
    const [batchNo, migrations] = await db.migrate.latest();
    if (migrations.length === 0) {
      console.log('✓ Database is up to date');
    } else {
      console.log(`✓ Ran ${migrations.length} migrations in batch ${batchNo}:`);
      migrations.forEach(m => console.log(`  - ${m}`));
    }
    return { batchNo, migrations };
  } catch (error) {
    console.error('Migration failed:', error.message);
    throw error;
  }
}

// Rollback last batch
async function rollbackMigrations() {
  try {
    const [batchNo, migrations] = await db.migrate.rollback();
    if (migrations.length === 0) {
      console.log('✓ No migrations to rollback');
    } else {
      console.log(`✓ Rolled back ${migrations.length} migrations from batch ${batchNo}:`);
      migrations.forEach(m => console.log(`  - ${m}`));
    }
    return { batchNo, migrations };
  } catch (error) {
    console.error('Rollback failed:', error.message);
    throw error;
  }
}

// Graceful shutdown
async function destroy() {
  await db.destroy();
  console.log('✓ Knex connection pool destroyed');
}

// Handle process termination
process.on('SIGTERM', async () => {
  await destroy();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await destroy();
  process.exit(0);
});

module.exports = {
  db,
  raw: db.raw.bind(db),
  checkConnection,
  getMigrationStatus,
  runMigrations,
  rollbackMigrations,
  destroy,
  knex: db, // Alias for compatibility
};
