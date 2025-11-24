#!/usr/bin/env node

/**
 * BISMAN ERP - Database Indexing Audit System
 * 
 * Comprehensive PostgreSQL index analysis and optimization tool
 * 
 * Features:
 * - Missing index detection
 * - Unused index identification
 * - Index bloat analysis
 * - Query performance recommendations
 * - Auto-generate CREATE INDEX statements
 * 
 * Usage:
 *   node scripts/database-index-audit.js
 *   node scripts/database-index-audit.js --fix   # Apply suggested indexes
 *   node scripts/database-index-audit.js --cleanup # Remove unused indexes
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

// Database connection
const pool = new Pool({
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME || 'bisman_erp',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD,
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function log(message) {
  console.log(`${colors.blue}[${new Date().toISOString()}]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.green}✓${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

function logError(message) {
  console.log(`${colors.red}✗${colors.reset} ${message}`);
}

// ============================================================================
// AUDIT FUNCTIONS
// ============================================================================

/**
 * Get all tables and their sizes
 */
async function getTableStats() {
  log('Analyzing tables...');
  
  const query = `
    SELECT
      schemaname,
      tablename,
      pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
      pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes,
      n_live_tup AS row_count,
      n_dead_tup AS dead_rows,
      ROUND(n_dead_tup::numeric / NULLIF(n_live_tup, 0) * 100, 2) AS dead_ratio,
      last_vacuum,
      last_autovacuum
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY size_bytes DESC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get all indexes and their usage stats
 */
async function getIndexStats() {
  log('Analyzing indexes...');
  
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan AS scans,
      idx_tup_read AS tuples_read,
      idx_tup_fetch AS tuples_fetched,
      pg_size_pretty(pg_relation_size(indexrelid)) AS size,
      pg_relation_size(indexrelid) AS size_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
    ORDER BY idx_scan ASC, size_bytes DESC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Find unused indexes
 */
async function findUnusedIndexes() {
  log('Finding unused indexes...');
  
  const query = `
    SELECT
      schemaname,
      tablename,
      indexname,
      idx_scan,
      pg_size_pretty(pg_relation_size(indexrelid)) AS size,
      pg_relation_size(indexrelid) AS size_bytes
    FROM pg_stat_user_indexes
    WHERE schemaname = 'public'
      AND idx_scan = 0
      AND indexname NOT LIKE '%_pkey'  -- Exclude primary keys
    ORDER BY size_bytes DESC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Find missing indexes based on sequential scans
 */
async function findMissingIndexes() {
  log('Finding missing indexes (tables with many sequential scans)...');
  
  const query = `
    SELECT
      schemaname,
      tablename,
      seq_scan,
      seq_tup_read,
      idx_scan,
      CASE
        WHEN seq_scan = 0 THEN 0
        ELSE ROUND((seq_tup_read::numeric / seq_scan), 0)
      END AS avg_rows_per_seq_scan,
      pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
      n_live_tup AS row_count
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
      AND seq_scan > 100  -- Many sequential scans
      AND seq_tup_read > 10000  -- Reading many rows
    ORDER BY seq_tup_read DESC;
  `;
  
  const result = await pool.query(query);
  return result.rows;
}

/**
 * Get slow queries from pg_stat_statements (if available)
 */
async function getSlowQueries() {
  log('Analyzing slow queries...');
  
  try {
    // Check if pg_stat_statements is enabled
    const checkExt = await pool.query(`
      SELECT * FROM pg_extension WHERE extname = 'pg_stat_statements';
    `);
    
    if (checkExt.rows.length === 0) {
      logWarning('pg_stat_statements extension not enabled');
      logWarning('Enable it with: CREATE EXTENSION pg_stat_statements;');
      return [];
    }
    
    const query = `
      SELECT
        query,
        calls,
        ROUND(total_exec_time::numeric, 2) AS total_time_ms,
        ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
        ROUND(max_exec_time::numeric, 2) AS max_time_ms,
        rows
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
        AND query NOT LIKE '%pg_catalog%'
      ORDER BY mean_exec_time DESC
      LIMIT 20;
    `;
    
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logWarning(`Could not analyze slow queries: ${error.message}`);
    return [];
  }
}

/**
 * Get duplicate indexes
 */
async function findDuplicateIndexes() {
  log('Finding duplicate indexes...');
  
  const query = `
    SELECT
      pg_size_pretty(SUM(pg_relation_size(idx))::BIGINT) AS total_size,
      (array_agg(idx))[1] AS first_index,
      array_agg(idx) AS indexes
    FROM (
      SELECT
        indexrelid::regclass AS idx,
        (indrelid::text ||E'\n'|| indclass::text ||E'\n'|| indkey::text ||E'\n'||
         COALESCE(indexprs::text,'')||E'\n' || COALESCE(indpred::text,'')) AS key
      FROM pg_index
    ) sub
    GROUP BY key
    HAVING COUNT(*) > 1
    ORDER BY SUM(pg_relation_size(idx)) DESC;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logWarning(`Could not find duplicate indexes: ${error.message}`);
    return [];
  }
}

/**
 * Generate index suggestions based on foreign keys
 */
async function suggestForeignKeyIndexes() {
  log('Checking foreign key indexes...');
  
  const query = `
    SELECT
      c.conrelid::regclass AS table_name,
      string_agg(a.attname, ', ') AS column_names,
      c.conname AS constraint_name
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
    WHERE c.contype = 'f'  -- Foreign key constraints
      AND NOT EXISTS (
        SELECT 1
        FROM pg_index i
        WHERE i.indrelid = c.conrelid
          AND c.conkey[1] = ANY(i.indkey)
      )
    GROUP BY c.conrelid, c.conname
    ORDER BY table_name;
  `;
  
  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logWarning(`Could not check foreign key indexes: ${error.message}`);
    return [];
  }
}

// ============================================================================
// RECOMMENDATIONS
// ============================================================================

/**
 * Generate index creation SQL
 */
function generateIndexSQL(tableName, columnName, indexType = 'btree') {
  const indexName = `idx_${tableName}_${columnName}`.toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `CREATE INDEX CONCURRENTLY ${indexName} ON "${tableName}" USING ${indexType} ("${columnName}");`;
}

/**
 * Generate index drop SQL
 */
function generateDropSQL(indexName) {
  return `DROP INDEX CONCURRENTLY IF EXISTS "${indexName}";`;
}

// ============================================================================
// REPORTING
// ============================================================================

/**
 * Print table statistics report
 */
function printTableStats(tables) {
  console.log(`\n${colors.bright}${colors.blue}TABLE STATISTICS${colors.reset}`);
  console.log('═'.repeat(80));
  
  console.log(`\n${colors.cyan}Top 10 Largest Tables:${colors.reset}\n`);
  
  tables.slice(0, 10).forEach(table => {
    console.log(`  ${colors.bright}${table.tablename}${colors.reset}`);
    console.log(`    Size: ${table.size} | Rows: ${table.row_count.toLocaleString()}`);
    
    if (table.dead_ratio > 20) {
      console.log(`    ${colors.red}⚠ Dead rows: ${table.dead_ratio}% - Run VACUUM ANALYZE${colors.reset}`);
    }
    console.log('');
  });
}

/**
 * Print index statistics report
 */
function printIndexStats(indexes) {
  console.log(`\n${colors.bright}${colors.blue}INDEX STATISTICS${colors.reset}`);
  console.log('═'.repeat(80));
  
  const totalSize = indexes.reduce((sum, idx) => sum + parseInt(idx.size_bytes), 0);
  console.log(`\nTotal index size: ${formatBytes(totalSize)}`);
  console.log(`Total indexes: ${indexes.length}\n`);
}

/**
 * Print unused indexes report
 */
function printUnusedIndexes(unused) {
  console.log(`\n${colors.bright}${colors.yellow}UNUSED INDEXES${colors.reset}`);
  console.log('═'.repeat(80));
  
  if (unused.length === 0) {
    logSuccess('No unused indexes found!');
    return;
  }
  
  console.log(`\n${colors.red}Found ${unused.length} unused indexes:${colors.reset}\n`);
  
  const totalWaste = unused.reduce((sum, idx) => sum + parseInt(idx.size_bytes), 0);
  console.log(`Total wasted space: ${formatBytes(totalWaste)}\n`);
  
  unused.forEach(idx => {
    console.log(`  ${colors.bright}${idx.indexname}${colors.reset}`);
    console.log(`    Table: ${idx.tablename}`);
    console.log(`    Size: ${idx.size}`);
    console.log(`    Scans: ${idx.idx_scan}`);
    console.log(`    ${colors.yellow}Recommendation: Consider dropping${colors.reset}`);
    console.log(`    SQL: ${generateDropSQL(idx.indexname)}`);
    console.log('');
  });
}

/**
 * Print missing indexes report
 */
function printMissingIndexes(missing, fkSuggestions) {
  console.log(`\n${colors.bright}${colors.yellow}MISSING INDEXES${colors.reset}`);
  console.log('═'.repeat(80));
  
  if (missing.length === 0 && fkSuggestions.length === 0) {
    logSuccess('No obvious missing indexes found!');
    return;
  }
  
  if (missing.length > 0) {
    console.log(`\n${colors.red}Tables with high sequential scan activity:${colors.reset}\n`);
    
    missing.forEach(table => {
      console.log(`  ${colors.bright}${table.tablename}${colors.reset}`);
      console.log(`    Sequential scans: ${table.seq_scan.toLocaleString()}`);
      console.log(`    Rows read: ${table.seq_tup_read.toLocaleString()}`);
      console.log(`    Avg rows per scan: ${table.avg_rows_per_seq_scan.toLocaleString()}`);
      console.log(`    ${colors.yellow}Recommendation: Add indexes on frequently queried columns${colors.reset}`);
      console.log('');
    });
  }
  
  if (fkSuggestions.length > 0) {
    console.log(`\n${colors.red}Foreign keys without indexes:${colors.reset}\n`);
    
    fkSuggestions.forEach(fk => {
      console.log(`  ${colors.bright}${fk.table_name}${colors.reset}`);
      console.log(`    Columns: ${fk.column_names}`);
      console.log(`    Constraint: ${fk.constraint_name}`);
      console.log(`    ${colors.yellow}Recommendation: Add index on foreign key column${colors.reset}`);
      console.log(`    SQL: ${generateIndexSQL(fk.table_name, fk.column_names.split(', ')[0])}`);
      console.log('');
    });
  }
}

/**
 * Print slow queries report
 */
function printSlowQueries(queries) {
  console.log(`\n${colors.bright}${colors.blue}SLOW QUERIES${colors.reset}`);
  console.log('═'.repeat(80));
  
  if (queries.length === 0) {
    logWarning('pg_stat_statements not available or no slow queries found');
    return;
  }
  
  console.log(`\n${colors.red}Top 10 slowest queries:${colors.reset}\n`);
  
  queries.slice(0, 10).forEach((q, i) => {
    console.log(`  ${colors.bright}${i + 1}. Query${colors.reset}`);
    console.log(`    Calls: ${q.calls.toLocaleString()}`);
    console.log(`    Avg time: ${q.avg_time_ms}ms`);
    console.log(`    Max time: ${q.max_time_ms}ms`);
    console.log(`    Total time: ${q.total_time_ms}ms`);
    console.log(`    Query: ${q.query.substring(0, 100)}...`);
    console.log('');
  });
}

/**
 * Print duplicate indexes report
 */
function printDuplicateIndexes(duplicates) {
  console.log(`\n${colors.bright}${colors.yellow}DUPLICATE INDEXES${colors.reset}`);
  console.log('═'.repeat(80));
  
  if (duplicates.length === 0) {
    logSuccess('No duplicate indexes found!');
    return;
  }
  
  console.log(`\n${colors.red}Found ${duplicates.length} sets of duplicate indexes:${colors.reset}\n`);
  
  duplicates.forEach((dup, i) => {
    console.log(`  ${colors.bright}Duplicate Set ${i + 1}${colors.reset}`);
    console.log(`    Wasted space: ${dup.total_size}`);
    console.log(`    Indexes: ${dup.indexes.join(', ')}`);
    console.log(`    ${colors.yellow}Recommendation: Keep one, drop others${colors.reset}`);
    console.log('');
  });
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log(`${colors.blue}${colors.bright}`);
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     📊 DATABASE INDEXING AUDIT SYSTEM                ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}\n`);
  
  try {
    // Test connection
    await pool.query('SELECT 1');
    logSuccess('Connected to database');
    
    // Gather data
    const tables = await getTableStats();
    const indexes = await getIndexStats();
    const unused = await findUnusedIndexes();
    const missing = await findMissingIndexes();
    const slowQueries = await getSlowQueries();
    const duplicates = await findDuplicateIndexes();
    const fkSuggestions = await suggestForeignKeyIndexes();
    
    // Print reports
    printTableStats(tables);
    printIndexStats(indexes);
    printUnusedIndexes(unused);
    printMissingIndexes(missing, fkSuggestions);
    printSlowQueries(slowQueries);
    printDuplicateIndexes(duplicates);
    
    // Summary
    console.log(`\n${colors.bright}${colors.green}SUMMARY${colors.reset}`);
    console.log('═'.repeat(80));
    console.log(`\nTables analyzed: ${tables.length}`);
    console.log(`Indexes analyzed: ${indexes.length}`);
    console.log(`${colors.yellow}Unused indexes: ${unused.length}${colors.reset}`);
    console.log(`${colors.yellow}Tables needing indexes: ${missing.length}${colors.reset}`);
    console.log(`${colors.yellow}Foreign keys without indexes: ${fkSuggestions.length}${colors.reset}`);
    console.log(`${colors.yellow}Duplicate index sets: ${duplicates.length}${colors.reset}`);
    
    // Generate SQL file
    const sqlPath = path.join(__dirname, 'index-optimization.sql');
    let sql = `-- Generated by Database Indexing Audit\n`;
    sql += `-- Date: ${new Date().toISOString()}\n\n`;
    
    sql += `-- ============================================================================\n`;
    sql += `-- FOREIGN KEY INDEXES (High Priority)\n`;
    sql += `-- ============================================================================\n\n`;
    
    fkSuggestions.forEach(fk => {
      sql += `-- Table: ${fk.table_name}, Column: ${fk.column_names}\n`;
      sql += generateIndexSQL(fk.table_name, fk.column_names.split(', ')[0]) + '\n\n';
    });
    
    sql += `\n-- ============================================================================\n`;
    sql += `-- UNUSED INDEXES (Consider Dropping)\n`;
    sql += `-- ============================================================================\n\n`;
    
    unused.forEach(idx => {
      sql += `-- Table: ${idx.tablename}, Size: ${idx.size}, Scans: ${idx.idx_scan}\n`;
      sql += `-- ${generateDropSQL(idx.indexname)}\n\n`;
    });
    
    fs.writeFileSync(sqlPath, sql);
    console.log(`\n${colors.green}SQL file generated: ${sqlPath}${colors.reset}`);
    
    console.log(`\n${colors.bright}${colors.cyan}Next Steps:${colors.reset}`);
    console.log('1. Review the generated SQL file');
    console.log('2. Test index changes in staging environment');
    console.log('3. Apply changes using: psql -f index-optimization.sql');
    console.log('4. Monitor query performance after changes\n');
    
  } catch (error) {
    logError(`Error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };
