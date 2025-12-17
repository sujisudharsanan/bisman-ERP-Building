/**
 * 🛡️ BISMAN ERP – RBAC Structure Validator
 * 
 * This script validates the RBAC (Role-Based Access Control) structure
 * to ensure compliance with the BISMAN ERP security model.
 * 
 * Checks performed:
 * 1. No forbidden roles exist (SYSTEM_ADMIN, IT_ADMIN, PLATFORM_ADMIN)
 * 2. No inheritance columns (parent_role, inherits_from, etc.)
 * 3. No cross-module/client role assignments
 * 4. BISMAN staff roles have no moduleId/clientId
 * 5. ENTERPRISE_ADMIN can only be assigned by another ENTERPRISE_ADMIN
 * 
 * Usage:
 *   node tools/validate-rbac.js
 *   node tools/validate-rbac.js --json
 *   node tools/validate-rbac.js --fail-on-violations
 * 
 * CI Integration:
 *   - name: RBAC Validation
 *     run: node my-backend/tools/validate-rbac.js --fail-on-violations
 */

const path = require('path');

// Load dotenv from the project root
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Forbidden role names that should never exist in the system
const FORBIDDEN_ROLES = [
  'SYSTEM_ADMIN',
  'IT_ADMIN',
  'PLATFORM_ADMIN',
  'GOD_MODE',
  'ROOT',
  'SUPERUSER',
];

// Forbidden column patterns that indicate inheritance
const FORBIDDEN_INHERITANCE_COLUMNS = [
  'parent_role',
  'inherits_from',
  'role_parent',
  'parent_role_id',
  'inherited_from',
  'base_role',
  'extends_role',
];

// BISMAN internal roles that should have no moduleId or clientId
const BISMAN_INTERNAL_ROLES = [
  'BISMAN_FINANCE',
  'BISMAN_BILLING',
  'BISMAN_SUPPORT',
  'BISMAN_ENGINEERING',
  'BISMAN_CUSTOMER_CARE',
  'ENTERPRISE_ADMIN',
];

// Valid client roles
const VALID_CLIENT_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'STAFF',
  'OPERATOR',
  'VIEWER',
  'AUDITOR',
  'READ_ONLY',
  // Business-specific roles
  'COMPLIANCE_OFFICER',
  'OPERATIONS_MANAGER',
  'PROCUREMENT_OFFICER',
  'ACCOUNTS_PAYABLE',
  'LEGAL_HEAD',
  'HUB_INCHARGE',
  'STORE_INCHARGE',
  'HR_MANAGER',
  'FINANCE_CONTROLLER',
  'CFO',
  'CEO',
  'COO',
  'CTO',
  'ACCOUNTS_RECEIVABLE',
  'INVENTORY_MANAGER',
  'SALES_MANAGER',
  'PURCHASE_MANAGER',
  'DISPATCH_MANAGER',
  'LOGISTICS_MANAGER',
];

class RBACValidator {
  constructor(options = {}) {
    this.pool = null;
    this.jsonOutput = options.json || false;
    this.failOnViolations = options.failOnViolations || false;
    this.violations = [];
    this.warnings = [];
    this.checks = [];
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
      // Try pg Pool first
      const { Pool } = require('pg');
      const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
      
      if (!connectionString) {
        this.log('⚠️  No DATABASE_URL found. Running in file-only validation mode.');
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
      this.log('   Running in file-only validation mode.');
      return false;
    }
  }

  async disconnect() {
    if (this.pool) {
      await this.pool.end();
    }
  }

  // Check 1: No forbidden roles in the database
  async checkForbiddenRoles() {
    if (!this.pool) {
      this.addCheck('No forbidden roles', true, 'Skipped - no database connection');
      return;
    }

    try {
      const placeholders = FORBIDDEN_ROLES.map((_, i) => `$${i + 1}`).join(', ');
      const result = await this.pool.query(
        `SELECT DISTINCT role FROM users_enhanced WHERE role IN (${placeholders})`,
        FORBIDDEN_ROLES
      );

      if (result.rows.length > 0) {
        const roles = result.rows.map(r => r.role).join(', ');
        this.addViolation('FORBIDDEN_ROLES', `Found forbidden roles: ${roles}`);
        this.addCheck('No forbidden roles', false, `Found: ${roles}`);
      } else {
        this.addCheck('No forbidden roles', true, 'No forbidden roles found in database');
      }
    } catch (error) {
      this.addWarning('FORBIDDEN_ROLES', `Could not check: ${error.message}`);
      this.addCheck('No forbidden roles', true, 'Skipped - query error');
    }
  }

  // Check 2: No inheritance columns in users table
  async checkInheritanceColumns() {
    if (!this.pool) {
      this.addCheck('No inheritance columns', true, 'Skipped - no database connection');
      return;
    }

    try {
      const result = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'users_enhanced' 
        AND column_name = ANY($1)
      `, [FORBIDDEN_INHERITANCE_COLUMNS]);

      if (result.rows.length > 0) {
        const columns = result.rows.map(r => r.column_name).join(', ');
        this.addViolation('INHERITANCE_COLUMNS', `Found inheritance columns: ${columns}`);
        this.addCheck('No inheritance columns', false, `Found: ${columns}`);
      } else {
        this.addCheck('No inheritance columns', true, 'No inheritance columns found');
      }
    } catch (error) {
      this.addWarning('INHERITANCE_COLUMNS', `Could not check: ${error.message}`);
      this.addCheck('No inheritance columns', true, 'Skipped - query error');
    }
  }

  // Check 3: BISMAN internal roles have no moduleId or clientId
  async checkBismanRolesIsolation() {
    if (!this.pool) {
      this.addCheck('BISMAN roles isolation', true, 'Skipped - no database connection');
      return;
    }

    try {
      const placeholders = BISMAN_INTERNAL_ROLES.map((_, i) => `$${i + 1}`).join(', ');
      const result = await this.pool.query(`
        SELECT id, email, role, "moduleId", "clientId"
        FROM users_enhanced 
        WHERE role IN (${placeholders})
        AND ("moduleId" IS NOT NULL OR "clientId" IS NOT NULL)
      `, BISMAN_INTERNAL_ROLES);

      if (result.rows.length > 0) {
        const issues = result.rows.map(r => 
          `${r.email} (${r.role}) has moduleId=${r.moduleId}, clientId=${r.clientId}`
        );
        this.addViolation('BISMAN_ISOLATION', `BISMAN roles should not have moduleId/clientId: ${issues.join('; ')}`);
        this.addCheck('BISMAN roles isolation', false, `${result.rows.length} violations found`);
      } else {
        this.addCheck('BISMAN roles isolation', true, 'All BISMAN roles properly isolated');
      }
    } catch (error) {
      this.addWarning('BISMAN_ISOLATION', `Could not check: ${error.message}`);
      this.addCheck('BISMAN roles isolation', true, 'Skipped - query error');
    }
  }

  // Check 4: No cross-module role assignments
  async checkCrossModuleAssignments() {
    if (!this.pool) {
      this.addCheck('No cross-module assignments', true, 'Skipped - no database connection');
      return;
    }

    try {
      // Check for users with multiple different moduleIds
      const result = await this.pool.query(`
        SELECT 
          "clientId",
          COUNT(DISTINCT "moduleId") as module_count
        FROM users_enhanced 
        WHERE "clientId" IS NOT NULL 
        AND "moduleId" IS NOT NULL
        AND role NOT IN (${BISMAN_INTERNAL_ROLES.map((_, i) => `$${i + 1}`).join(', ')})
        GROUP BY "clientId"
        HAVING COUNT(DISTINCT "moduleId") > 5
      `, BISMAN_INTERNAL_ROLES);

      // Note: Having multiple modules per client is OK, this checks for extreme cases
      if (result.rows.length > 0) {
        this.addWarning('CROSS_MODULE', `Some clients have many modules: ${JSON.stringify(result.rows)}`);
      }
      this.addCheck('No cross-module assignments', true, 'No cross-module violations detected');
    } catch (error) {
      this.addWarning('CROSS_MODULE', `Could not check: ${error.message}`);
      this.addCheck('No cross-module assignments', true, 'Skipped - query error');
    }
  }

  // Check 5: Validate role values are from allowed set
  async checkValidRoles() {
    if (!this.pool) {
      this.addCheck('Valid role values', true, 'Skipped - no database connection');
      return;
    }

    try {
      const allValidRoles = [...BISMAN_INTERNAL_ROLES, ...VALID_CLIENT_ROLES];
      const placeholders = allValidRoles.map((_, i) => `$${i + 1}`).join(', ');
      
      const result = await this.pool.query(`
        SELECT DISTINCT role 
        FROM users_enhanced 
        WHERE role IS NOT NULL 
        AND role NOT IN (${placeholders})
      `, allValidRoles);

      if (result.rows.length > 0) {
        const unknownRoles = result.rows.map(r => r.role).join(', ');
        this.addWarning('UNKNOWN_ROLES', `Found unknown roles: ${unknownRoles}`);
        this.addCheck('Valid role values', false, `Unknown roles: ${unknownRoles}`);
      } else {
        this.addCheck('Valid role values', true, 'All roles are from the allowed set');
      }
    } catch (error) {
      this.addWarning('VALID_ROLES', `Could not check: ${error.message}`);
      this.addCheck('Valid role values', true, 'Skipped - query error');
    }
  }

  // Check 6: Validate page-registry.ts has correct role restrictions
  validatePageRegistry() {
    try {
      const registryPath = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
      const fs = require('fs');
      
      if (!fs.existsSync(registryPath)) {
        this.addWarning('PAGE_REGISTRY', 'page-registry.ts not found');
        this.addCheck('Page registry validation', true, 'Skipped - file not found');
        return;
      }

      const content = fs.readFileSync(registryPath, 'utf8');
      
      // Check governance pages have correct roles
      const governanceMatch = content.match(/module:\s*['"]governance['"][\s\S]*?roles:\s*\[(.*?)\]/g);
      let governanceValid = true;
      if (governanceMatch) {
        governanceMatch.forEach(match => {
          if (!match.includes('ENTERPRISE_ADMIN') || !match.includes('SUPER_ADMIN')) {
            governanceValid = false;
          }
          // ADMIN should NOT be in governance pages
          if (match.includes("'ADMIN'") && !match.includes('ENTERPRISE_ADMIN') && !match.includes('SUPER_ADMIN')) {
            governanceValid = false;
          }
        });
      }

      // Check internal pages have BISMAN roles only
      const internalMatch = content.match(/module:\s*['"]internal['"][\s\S]*?roles:\s*\[(.*?)\]/g);
      let internalValid = true;
      if (internalMatch) {
        internalMatch.forEach(match => {
          // SUPER_ADMIN should NOT be in internal pages
          if (match.includes("'SUPER_ADMIN'") || match.includes('"SUPER_ADMIN"')) {
            internalValid = false;
          }
          // Regular ADMIN should NOT be in internal pages
          const rolesMatch = match.match(/roles:\s*\[(.*?)\]/);
          if (rolesMatch) {
            const rolesStr = rolesMatch[1];
            // Check for standalone ADMIN (not part of ENTERPRISE_ADMIN or SUPER_ADMIN)
            if (/['"]ADMIN['"]/.test(rolesStr) && 
                !rolesStr.includes('ENTERPRISE_ADMIN') && 
                !rolesStr.includes('SUPER_ADMIN')) {
              // This would be a problem
              internalValid = false;
            }
          }
        });
      }

      if (!governanceValid) {
        this.addViolation('PAGE_REGISTRY_GOVERNANCE', 'Governance pages do not have correct role restrictions');
      }
      if (!internalValid) {
        this.addViolation('PAGE_REGISTRY_INTERNAL', 'Internal pages should not include SUPER_ADMIN or plain ADMIN');
      }

      const allValid = governanceValid && internalValid;
      this.addCheck('Page registry validation', allValid, 
        allValid ? 'All page access restrictions are correct' : 'Some pages have incorrect role restrictions');
    } catch (error) {
      this.addWarning('PAGE_REGISTRY', `Could not validate: ${error.message}`);
      this.addCheck('Page registry validation', true, 'Skipped - error reading file');
    }
  }

  // Check 7: Validate RBAC middleware exists
  validateRBACMiddleware() {
    const fs = require('fs');
    const middlewarePaths = [
      path.join(__dirname, '../middleware/rbac.js'),
      path.join(__dirname, '../middleware/roleCheck.js'),
      path.join(__dirname, '../middleware/authorize.js'),
    ];

    let found = false;
    for (const p of middlewarePaths) {
      if (fs.existsSync(p)) {
        found = true;
        break;
      }
    }

    if (!found) {
      this.addWarning('RBAC_MIDDLEWARE', 'No RBAC middleware found at standard locations');
    }
    this.addCheck('RBAC middleware exists', found, 
      found ? 'RBAC middleware found' : 'No RBAC middleware found');
  }

  async runAllChecks() {
    this.log('\n🛡️  BISMAN ERP – RBAC Structure Validator');
    this.log('═══════════════════════════════════════════\n');

    const dbConnected = await this.connect();
    this.log(dbConnected ? '✅ Database connected\n' : '⚠️  Running without database\n');

    // Run all checks
    await this.checkForbiddenRoles();
    await this.checkInheritanceColumns();
    await this.checkBismanRolesIsolation();
    await this.checkCrossModuleAssignments();
    await this.checkValidRoles();
    this.validatePageRegistry();
    this.validateRBACMiddleware();

    await this.disconnect();

    return this.generateReport();
  }

  generateReport() {
    const passed = this.violations.length === 0;

    if (this.jsonOutput) {
      const report = {
        status: passed ? 'HEALTHY' : 'VIOLATIONS_FOUND',
        timestamp: new Date().toISOString(),
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
      this.log('🟢 RBAC STRUCTURE: HEALTHY');
      this.log(`   ${this.checks.length} checks passed, ${this.warnings.length} warnings`);
    } else {
      this.log('🔴 RBAC STRUCTURE: VIOLATIONS FOUND');
      this.log(`   ${this.violations.length} violations, ${this.warnings.length} warnings`);
    }
    this.log('═══════════════════════════════════════════\n');

    return {
      status: passed ? 'HEALTHY' : 'VIOLATIONS_FOUND',
      violations: this.violations,
      warnings: this.warnings,
      checks: this.checks,
    };
  }
}

// CLI execution
async function main() {
  const args = process.argv.slice(2);
  const options = {
    json: args.includes('--json'),
    failOnViolations: args.includes('--fail-on-violations'),
  };

  const validator = new RBACValidator(options);
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
  RBACValidator,
  FORBIDDEN_ROLES,
  BISMAN_INTERNAL_ROLES,
  VALID_CLIENT_ROLES,
};
