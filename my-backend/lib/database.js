/**
 * Database Pool Wrapper
 * =====================
 * Provides getPool function for raw SQL queries
 * Used by authorityLevel.js and other modules
 */

const { getPgPool } = require('./pgPool');

/**
 * Get the PostgreSQL pool for raw queries
 * @returns {Pool|null} PostgreSQL pool or null if not configured
 */
function getPool() {
  return getPgPool();
}

module.exports = { getPool };
