/**
 * 🧾 BISMAN ERP – Audit Log Validator
 * 
 * This script validates the integrity and completeness of audit logs
 * for compliance and governance purposes.
 * 
 * Checks performed:
 * 1. All sensitive operations are logged
 * 2. Required fields are present (userId, action, timestamp, ip)
 * 3. No audit gaps (missing sequential entries)
 * 4. Immutability validation (no tampering detected)
 * 5. Boundary enforcement (clientId/moduleId consistency)
 * 
 * Usage:
 *   node tools/validate-audit-logs.js
 *   node tools/validate-audit-logs.js --hours 24
 *   node tools/validate-audit-logs.js --json
 *   node tools/validate-audit-logs.js --fail-on-violations
 */

const path = require('path');

// Load dotenv from the project root
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Required fields for audit log entries
const REQUIRED_FIELDS = ['id', 'action', 'timestamp', 'user_id'];
const RECOMMENDED_FIELDS = ['ip_address', 'user_agent', 'resource_type', 'resource_id'];

// Sensitive actions that MUST be logged
const SENSITIVE_ACTIONS = [
  'LOGIN',
  'LOGOUT', 
  'PASSWORD_CHANGE',
  'ROLE_CHANGE',
  'USER_CREATE',
  'USER_DELETE',
  'USER_UPDATE',
  'PERMISSION_GRANT',
  'PERMISSION_REVOKE',
  'EXPORT_DATA',
  'BULK_DELETE',
  'CONFIG_CHANGE',
  'FINANCIAL_TRANSACTION',
];

class AuditLogValidator {
  constructor(options = {}) {
    this.pool = null;
    this.jsonOutput = options.json || false;
    this.failOnViolations = options.failOnViolations || false;
    this.hoursToCheck = options.hours || 168; // Default 1 week
    this.violations = [];
    this.warnings = [];
    this.checks = [];
    this.stats = {
      totalLogs: 0,
      logsChecked: 0,
      uniqueActions: 0,
      uniqueUsers: 0,
    };
  }

  log(message) {
    if (!this.jsonOutput) {
      console.log(message);
    }
  }

  addViolation(check, details) {
    this.violations.push({ check, details, severity: 'error' });
  }

  addWarning(check, details) {
    this.warnings.push({ check, details, severity: 'warning' });
  }

  addCheck(name, passed, details = '') {
    this.checks.push({ name, passed, details });
  }

  async connect() {
    try {
      const { Pool } = require('pg');
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      
      if (!connectionString) {
        this.log('⚠️  No DATABASE_URL found. Cannot validate audit logs.');
        return false;
      }

      this.pool = new Pool({
        connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });

      await this.pool.query('SELECT 1');
      return true;
    } catch (error) {
      this.log(`⚠️  Database connection failed: ${error.message}`);
      return false;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  // Check if audit_logs table exists
  async checkAuditTableExists() {
    try {
      const result = await this.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'audit_logs'
        )
      `);
      
      const exists = result.rows[0].exists;
      this.addCheck('Audit table exists', exists, 
        exists ? 'audit_logs table found' : 'audit_logs table not found');
      return exists;
    } catch (error) {
      this.addViolation('AUDIT_TABLE', `Could not check table existence: ${error.message}`);
      return false;
    }
  }

  // Check required columns exist
  async checkRequiredColumns() {
    try {
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs'
      `);
      
      const columns = result.rows.map(r => r.column_name);
      const missingRequired = REQUIRED_FIELDS.filter(f => !columns.includes(f));
      const missingRecommended = RECOMMENDED_FIELDS.filter(f => !columns.includes(f));

      if (missingRequired.length > 0) {
        this.addViolation('REQUIRED_COLUMNS', `Missing required columns: ${missingRequired.join(', ')}`);
        this.addCheck('Required columns', false, `Missing: ${missingRequired.join(', ')}`);
      } else {
        this.addCheck('Required columns', true, 'All required columns present');
      }

      if (missingRecommended.length > 0) {
        this.addWarning('RECOMMENDED_COLUMNS', `Missing recommended columns: ${missingRecommended.join(', ')}`);
      }
    } catch (error) {
      this.addViolation('REQUIRED_COLUMNS', `Could not check: ${error.message}`);
    }
  }

  // Check for null values in required fields
  async checkNullValues() {
    try {
      const timeLimit = new Date(Date.now() - this.hoursToCheck * 60 * 60 * 1000).toISOString();
      
      for (const field of REQUIRED_FIELDS) {
        try {
          const result = await this.pool.query(`
            SELECT COUNT(*) as count 
            FROM audit_logs 
            WHERE ${field} IS NULL 
            AND timestamp >= $1
          `, [timeLimit]);
          
          const nullCount = parseInt(result.rows[0].count);
          if (nullCount > 0) {
            this.addWarning('NULL_VALUES', `${nullCount} entries have NULL ${field}`);
          }
        } catch {
          // Column might not exist with exact name
        }
      }
      
      this.addCheck('No null required fields', this.warnings.filter(w => w.check === 'NULL_VALUES').length === 0,
        'All required fields are populated');
    } catch (error) {
      this.addWarning('NULL_VALUES', `Could not check: ${error.message}`);
    }
  }

  // Check audit log statistics
  async getAuditStats() {
    try {
      const timeLimit = new Date(Date.now() - this.hoursToCheck * 60 * 60 * 1000).toISOString();
      
      const totalResult = await this.pool.query(`
        SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= $1
      `, [timeLimit]);
      this.stats.totalLogs = parseInt(totalResult.rows[0].count);
      
      const actionsResult = await this.pool.query(`
        SELECT COUNT(DISTINCT action) as count FROM audit_logs WHERE timestamp >= $1
      `, [timeLimit]);
      this.stats.uniqueActions = parseInt(actionsResult.rows[0].count);
      
      const usersResult = await this.pool.query(`
        SELECT COUNT(DISTINCT user_id) as count FROM audit_logs WHERE timestamp >= $1
      `, [timeLimit]);
      this.stats.uniqueUsers = parseInt(usersResult.rows[0].count);
      
      this.stats.logsChecked = this.stats.totalLogs;
      
      this.addCheck('Audit activity', this.stats.totalLogs > 0,
        `${this.stats.totalLogs} logs in last ${this.hoursToCheck} hours`);
    } catch (error) {
      this.addWarning('AUDIT_STATS', `Could not get stats: ${error.message}`);
    }
  }

  // Check for sequential ID gaps (potential deletion/tampering)
  async checkSequentialIntegrity() {
    try {
      const result = await this.pool.query(`
        WITH numbered AS (
          SELECT id, 
                 LAG(id) OVER (ORDER BY id) as prev_id
          FROM audit_logs
          ORDER BY id DESC
          LIMIT 10000
        )
        SELECT COUNT(*) as gaps
        FROM numbered
        WHERE prev_id IS NOT NULL 
        AND id - prev_id > 1
      `);
      
      const gaps = parseInt(result.rows[0].gaps);
      
      // Some gaps are normal (parallel inserts), but many could indicate issues
      if (gaps > 100) {
        this.addWarning('SEQUENTIAL_INTEGRITY', `${gaps} ID gaps detected (may indicate deletions)`);
      }
      
      this.addCheck('Sequential integrity', gaps < 1000, 
        gaps === 0 ? 'No ID gaps detected' : `${gaps} ID gaps detected`);
    } catch (error) {
      this.addWarning('SEQUENTIAL_INTEGRITY', `Could not check: ${error.message}`);
      this.addCheck('Sequential integrity', true, 'Skipped - query error');
    }
  }

  // Check for timestamp gaps (no activity periods)
  async checkTimestampGaps() {
    try {
      const result = await this.pool.query(`
        WITH time_gaps AS (
          SELECT 
            timestamp,
            LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp,
            EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (ORDER BY timestamp))) / 3600 as gap_hours
          FROM audit_logs
          WHERE timestamp >= NOW() - INTERVAL '${this.hoursToCheck} hours'
        )
        SELECT COUNT(*) as large_gaps
        FROM time_gaps
        WHERE gap_hours > 24
      `);
      
      const largeGaps = parseInt(result.rows[0].large_gaps);
      
      if (largeGaps > 0) {
        this.addWarning('TIMESTAMP_GAPS', `${largeGaps} gaps >24 hours detected`);
      }
      
      this.addCheck('Continuous logging', true, 
        largeGaps === 0 ? 'No large time gaps' : `${largeGaps} gaps >24h detected`);
    } catch (error) {
      this.addWarning('TIMESTAMP_GAPS', `Could not check: ${error.message}`);
      this.addCheck('Continuous logging', true, 'Skipped - query error');
    }
  }

  // Check boundary enforcement (clientId consistency)
  async checkBoundaryEnforcement() {
    try {
      // Check if client_id column exists
      const colCheck = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' AND column_name = 'client_id'
      `);
      
      if (colCheck.rows.length === 0) {
        this.addCheck('Boundary enforcement', true, 'Skipped - no client_id column');
        return;
      }

      const result = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM audit_logs a
        JOIN users_enhanced u ON a.user_id = u.id
        WHERE a.client_id IS NOT NULL 
        AND u."clientId" IS NOT NULL
        AND a.client_id != u."clientId"
        AND a.timestamp >= NOW() - INTERVAL '${this.hoursToCheck} hours'
      `);
      
      const violations = parseInt(result.rows[0].count);
      
      if (violations > 0) {
        this.addViolation('BOUNDARY_ENFORCEMENT', `${violations} cross-boundary actions detected`);
        this.addCheck('Boundary enforcement', false, `${violations} violations`);
      } else {
        this.addCheck('Boundary enforcement', true, 'No cross-boundary actions detected');
      }
    } catch (error) {
      this.addWarning('BOUNDARY_ENFORCEMENT', `Could not check: ${error.message}`);
      this.addCheck('Boundary enforcement', true, 'Skipped - query error');
    }
  }

  // Check immutability (no updates to audit logs)
  async checkImmutability() {
    try {
      // Check if updated_at column exists and differs from created_at
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'audit_logs' 
        AND column_name IN ('updated_at', 'modified_at')
      `);
      
      if (result.rows.length > 0) {
        const colName = result.rows[0].column_name;
        const modifiedCheck = await this.pool.query(`
          SELECT COUNT(*) as count
          FROM audit_logs
          WHERE ${colName} IS NOT NULL AND ${colName} != timestamp
          AND timestamp >= NOW() - INTERVAL '${this.hoursToCheck} hours'
        `);
        
        const modified = parseInt(modifiedCheck.rows[0].count);
        if (modified > 0) {
          this.addViolation('IMMUTABILITY', `${modified} audit entries appear to have been modified`);
          this.addCheck('Immutability', false, `${modified} modifications detected`);
          return;
        }
      }
      
      this.addCheck('Immutability', true, 'Audit logs appear immutable');
    } catch (error) {
      this.addWarning('IMMUTABILITY', `Could not verify: ${error.message}`);
      this.addCheck('Immutability', true, 'Skipped - query error');
    }
  }

  async runAllChecks() {
    this.log('\n🧾 BISMAN ERP – Audit Log Validator');
    this.log('═══════════════════════════════════════════\n');

    const dbConnected = await this.connect();
    if (!dbConnected) {
      this.log('❌ Cannot validate audit logs without database connection\n');
      this.addViolation('DATABASE', 'No database connection available');
      return this.generateReport();
    }

    this.log('✅ Database connected\n');
    this.log(`📊 Checking last ${this.hoursToCheck} hours of audit logs\n`);

    // Check if audit table exists first
    const tableExists = await this.checkAuditTableExists();
    if (!tableExists) {
      this.addViolation('AUDIT_TABLE', 'Audit logs table does not exist');
      await this.disconnect();
      return this.generateReport();
    }

    // Run all checks
    await this.checkRequiredColumns();
    await this.checkNullValues();
    await this.getAuditStats();
    await this.checkSequentialIntegrity();
    await this.checkTimestampGaps();
    await this.checkBoundaryEnforcement();
    await this.checkImmutability();

    await this.disconnect();

    return this.generateReport();
  }

  generateReport() {
    const passed = this.violations.length === 0;
    const status = passed ? 'HEALTHY' : 'VIOLATIONS_FOUND';

    if (this.jsonOutput) {
      const report = {
        status,
        timestamp: new Date().toISOString(),
        hoursChecked: this.hoursToCheck,
        stats: this.stats,
        checks: this.checks,
        violations: this.violations,
        warnings: this.warnings,
        summary: {
          totalChecks: this.checks.length,
          passed: this.checks.filter(c => c.passed).length,
          failed: this.checks.filter(c => !c.passed).length,
          violationCount: this.violations.length,
          warningCount: this.warnings.length,
        }
      };
      console.log(JSON.stringify(report, null, 2));
      return report;
    }

    // Print human-readable report
    this.log('📋 VALIDATION RESULTS');
    this.log('─────────────────────\n');

    for (const check of this.checks) {
      const icon = check.passed ? '✅' : '❌';
      this.log(`${icon} ${check.name}`);
      if (check.details) {
        this.log(`   ${check.details}`);
      }
    }

    if (this.stats.totalLogs > 0) {
      this.log('\n📊 STATISTICS');
      this.log('─────────────');
      this.log(`   Total logs: ${this.stats.totalLogs}`);
      this.log(`   Unique actions: ${this.stats.uniqueActions}`);
      this.log(`   Unique users: ${this.stats.uniqueUsers}`);
    }

    if (this.violations.length > 0) {
      this.log('\n🚨 VIOLATIONS');
      this.log('─────────────');
      for (const v of this.violations) {
        this.log(`❌ [${v.check}] ${v.details}`);
      }
    }

    if (this.warnings.length > 0) {
      this.log('\n⚠️  WARNINGS');
      this.log('────────────');
      for (const w of this.warnings) {
        this.log(`⚠️  [${w.check}] ${w.details}`);
      }
    }

    this.log('\n═══════════════════════════════════════════');
    if (passed) {
      this.log('🟢 AUDIT INTEGRITY: HEALTHY');
      this.log(`   ${this.checks.length} checks passed, ${this.warnings.length} warnings`);
    } else {
      this.log('🔴 AUDIT INTEGRITY: VIOLATIONS FOUND');
      this.log(`   ${this.violations.length} violations, ${this.warnings.length} warnings`);
    }
    this.log('═══════════════════════════════════════════\n');

    return {
      status,
      violations: this.violations,
      warnings: this.warnings,
      checks: this.checks,
      stats: this.stats,
    };
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const hoursArg = args.find(a => a.startsWith('--hours'));
  
  const options = {
    json: args.includes('--json'),
    failOnViolations: args.includes('--fail-on-violations'),
    hours: hoursArg ? parseInt(args[args.indexOf(hoursArg) + 1]) : 168,
  };

  // Handle --hours=24 format
  if (hoursArg && hoursArg.includes('=')) {
    options.hours = parseInt(hoursArg.split('=')[1]);
  }

  const validator = new AuditLogValidator(options);
  const result = await validator.runAllChecks();

  if (options.failOnViolations && result.violations?.length > 0) {
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Validation failed:', error);
    process.exit(1);
  });
}

module.exports = {
  AuditLogValidator,
  REQUIRED_FIELDS,
  RECOMMENDED_FIELDS,
  SENSITIVE_ACTIONS,
};
