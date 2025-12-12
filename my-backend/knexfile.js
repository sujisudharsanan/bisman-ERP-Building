/**
 * Knex Configuration File
 * BISMAN ERP Database Migration Management
 * 
 * Supports multiple environments: development, staging, production
 * Uses environment variables for connection strings
 */

require('dotenv').config({ path: '.env.local' });

// Parse DATABASE_URL or use individual env vars
function parseConnectionString(url) {
  if (!url) return null;
  
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      user: parsed.username,
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.slice(1), // Remove leading /
      ssl: parsed.searchParams.get('sslmode') === 'require' 
        ? { rejectUnauthorized: false } 
        : false,
    };
  } catch (e) {
    console.error('Failed to parse DATABASE_URL:', e.message);
    return null;
  }
}

// Get connection config from DATABASE_URL or individual vars
function getConnection() {
  const dbUrl = process.env.DATABASE_URL;
  
  if (dbUrl) {
    return parseConnectionString(dbUrl);
  }
  
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'BISMAN',
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  };
}

// Common pool configuration
const poolConfig = {
  min: 2,
  max: 10,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 100,
};

// Migration configuration
const migrationConfig = {
  directory: './database/knex-migrations',
  tableName: 'knex_migrations',
  extension: 'js',
  loadExtensions: ['.js'],
  schemaName: 'public',
};

// Seed configuration  
const seedConfig = {
  directory: './database/knex-seeds',
  loadExtensions: ['.js'],
};

module.exports = {
  // Development - Local PostgreSQL
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'BISMAN',
    },
    pool: poolConfig,
    migrations: migrationConfig,
    seeds: seedConfig,
    debug: process.env.KNEX_DEBUG === 'true',
  },

  // Staging - Railway/Render staging
  staging: {
    client: 'pg',
    connection: getConnection('staging'),
    pool: {
      ...poolConfig,
      min: 1,
      max: 5,
    },
    migrations: migrationConfig,
    seeds: seedConfig,
  },

  // Production - Railway/Render production
  production: {
    client: 'pg',
    connection: getConnection('production'),
    pool: {
      ...poolConfig,
      min: 2,
      max: 20,
    },
    migrations: {
      ...migrationConfig,
      disableTransactions: false, // Ensure atomic migrations
    },
    seeds: seedConfig,
    acquireConnectionTimeout: 60000,
  },
};
