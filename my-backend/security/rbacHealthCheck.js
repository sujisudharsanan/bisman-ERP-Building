/**
 * ============================================================================
 * PHASE 5: RBAC HEALTH CHECK
 * ============================================================================
 * 
 * Runtime health check for RBAC system integrity.
 * Run periodically to detect issues before they become security holes.
 * 
 * @module security/rbacHealthCheck
 */

const { Pool } = require('pg');

// ============================================================================
// HEALTH CHECK QUERIES
// ============================================================================

const HEALTH_CHECKS = {
  // Check 1: Are there users without any approval chain entries?
  USERS_WITHOUT_APPROVALS: {
    id: 'HC-001',
    name: 'Users Without Approvals',
    severity: 'HIGH',
    query: `
      SELECT u.id, u.email, u.role_id, r.name as role_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN admin_page_assignments apa ON apa.assignee_id = u.id
      WHERE u.is_active = true
        AND r.name NOT IN ('ENTERPRISE_ADMIN', 'SUPER_ADMIN')
        AND apa.id IS NULL
    `,
    threshold: 0,
    message: 'Active users with no approval chain entries'
  },
  
  // Check 2: Are there orphan entries in admin_page_assignments?
  ORPHAN_APPROVALS: {
    id: 'HC-002',
    name: 'Orphan Approvals',
    severity: 'MEDIUM',
    query: `
      SELECT apa.id, apa.page_key, apa.assignee_id
      FROM admin_page_assignments apa
      LEFT JOIN users u ON apa.assignee_id = u.id
      WHERE u.id IS NULL OR u.is_active = false
    `,
    threshold: 0,
    message: 'Approval entries for non-existent or inactive users'
  },
  
  // Check 3: Are there pages in subscription but not in EA approvals for SA?
  SUBSCRIPTION_EA_GAP: {
    id: 'HC-003',
    name: 'Subscription-EA Gap',
    severity: 'HIGH',
    query: `
      WITH subscribed_pages AS (
        SELECT DISTINCT pm.page_code
        FROM pages_master pm
        JOIN modules_master mm ON pm.module_id = mm.id
        JOIN plan_module_access pma ON pma.module_id = mm.module_code
        JOIN client_subscriptions cs ON cs.plan_id = pma.plan_id
        WHERE cs.state = 'ACTIVE'
      ),
      ea_approved_pages AS (
        SELECT DISTINCT page_key
        FROM admin_page_assignments
        WHERE assigner_type = 'ENTERPRISE_ADMIN'
          AND is_active = true
      )
      SELECT sp.page_code
      FROM subscribed_pages sp
      LEFT JOIN ea_approved_pages eap ON sp.page_code = eap.page_key
      WHERE eap.page_key IS NULL
    `,
    threshold: 10, // Some gap is expected during rollout
    message: 'Subscribed pages not approved by EA'
  },
  
  // Check 4: SUPER_ADMIN should have entries
  SA_HAS_APPROVALS: {
    id: 'HC-004',
    name: 'SuperAdmin Has Approvals',
    severity: 'CRITICAL',
    query: `
      SELECT u.id, u.email
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN admin_page_assignments apa 
        ON apa.assignee_id = u.id AND apa.is_active = true
      WHERE r.name = 'SUPER_ADMIN'
        AND u.is_active = true
        AND apa.id IS NULL
    `,
    threshold: 0,
    message: 'Active SuperAdmins without approval chain entries'
  },
  
  // Check 5: admin_page_assignments table not empty
  APPROVALS_NOT_EMPTY: {
    id: 'HC-005',
    name: 'Approvals Table Not Empty',
    severity: 'CRITICAL',
    query: `
      SELECT COUNT(*) as total FROM admin_page_assignments WHERE is_active = true
    `,
    thresholdCheck: (result) => result.rows[0].total < 100,
    message: 'admin_page_assignments has suspiciously few entries'
  },
  
  // Check 6: Are there circular approval chains?
  NO_CIRCULAR_CHAINS: {
    id: 'HC-006',
    name: 'No Circular Approval Chains',
    severity: 'CRITICAL',
    query: `
      SELECT apa.id, apa.assignee_id, apa.assigner_id
      FROM admin_page_assignments apa
      WHERE apa.assignee_id = apa.assigner_id
    `,
    threshold: 0,
    message: 'Self-referential approval chain entries found'
  },
  
  // Check 7: role_page_access being deprecated correctly
  LEGACY_TABLE_STATUS: {
    id: 'HC-007',
    name: 'Legacy Table Status',
    severity: 'LOW',
    query: `
      SELECT 
        (SELECT COUNT(*) FROM role_page_access) as role_page_count,
        (SELECT COUNT(*) FROM admin_page_assignments) as approval_count
    `,
    thresholdCheck: (result) => {
      // Warning if legacy table has more entries than new system
      const rpc = result.rows[0].role_page_count;
      const apc = result.rows[0].approval_count;
      return rpc > apc * 2;
    },
    message: 'Legacy role_page_access has significantly more entries than approval chain'
  }
};

// ============================================================================
// HEALTH CHECK RUNNER
// ============================================================================

/**
 * Run all health checks and return results
 */
async function runHealthChecks(pool) {
  const results = {
    timestamp: new Date().toISOString(),
    overall: 'HEALTHY',
    checks: [],
    criticalIssues: [],
    warnings: []
  };
  
  for (const [, check] of Object.entries(HEALTH_CHECKS)) {
    try {
      const queryResult = await pool.query(check.query);
      
      let failed = false;
      let count = 0;
      
      if (check.thresholdCheck) {
        failed = check.thresholdCheck(queryResult);
        count = queryResult.rows[0]?.total || queryResult.rows.length;
      } else {
        count = queryResult.rows.length;
        failed = count > check.threshold;
      }
      
      const checkResult = {
        id: check.id,
        name: check.name,
        status: failed ? 'FAILED' : 'PASSED',
        severity: check.severity,
        count,
        threshold: check.threshold,
        message: failed ? check.message : null,
        details: failed ? queryResult.rows.slice(0, 5) : null // First 5 issues
      };
      
      results.checks.push(checkResult);
      
      if (failed) {
        if (check.severity === 'CRITICAL') {
          results.criticalIssues.push(checkResult);
          results.overall = 'CRITICAL';
        } else if (check.severity === 'HIGH') {
          results.warnings.push(checkResult);
          if (results.overall === 'HEALTHY') {
            results.overall = 'DEGRADED';
          }
        }
      }
      
    } catch (error) {
      results.checks.push({
        id: check.id,
        name: check.name,
        status: 'ERROR',
        severity: 'CRITICAL',
        error: error.message
      });
      results.overall = 'ERROR';
    }
  }
  
  return results;
}

/**
 * Run health check and return summary
 */
async function getHealthSummary(pool) {
  const results = await runHealthChecks(pool);
  
  return {
    status: results.overall,
    timestamp: results.timestamp,
    passed: results.checks.filter(c => c.status === 'PASSED').length,
    failed: results.checks.filter(c => c.status === 'FAILED').length,
    errors: results.checks.filter(c => c.status === 'ERROR').length,
    criticalCount: results.criticalIssues.length,
    warningCount: results.warnings.length
  };
}

// ============================================================================
// EXPRESS ROUTE HANDLER
// ============================================================================

/**
 * Express handler for health check endpoint
 * GET /api/admin/rbac-health
 */
async function healthCheckHandler(req, res) {
  try {
    const pool = req.app.get('dbPool') || new Pool({
      connectionString: process.env.DATABASE_URL
    });
    
    const results = await runHealthChecks(pool);
    
    const statusCode = results.overall === 'CRITICAL' ? 503 :
                       results.overall === 'ERROR' ? 500 :
                       results.overall === 'DEGRADED' ? 200 : 200;
    
    return res.status(statusCode).json({
      success: results.overall !== 'CRITICAL',
      data: results
    });
    
  } catch (error) {
    console.error('[RbacHealthCheck] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Health check failed',
      message: error.message
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  HEALTH_CHECKS,
  runHealthChecks,
  getHealthSummary,
  healthCheckHandler
};
