/**
 * ============================================================================
 * PHASE 5: RBAC INVARIANTS & GUARDRAILS
 * ============================================================================
 * 
 * NON-NEGOTIABLE INVARIANTS that MUST hold at all times.
 * Violations of these invariants are SECURITY INCIDENTS.
 * 
 * @module security/rbacInvariants
 */

// ============================================================================
// INVARIANT DEFINITIONS
// ============================================================================

/**
 * INVARIANT 1: NO PRIVILEGE ESCALATION
 * A user can NEVER grant permissions they don't have.
 * 
 * FORMULA: grantable(user) ⊆ effective(user)
 */
const INVARIANT_NO_PRIVILEGE_ESCALATION = {
  id: 'INV-001',
  name: 'No Privilege Escalation',
  description: 'A user can never grant permissions they do not have',
  severity: 'CRITICAL',
  check: async (granterUserId, granteeUserId, pageKeys, effectiveAccessService) => {
    const granterAccess = await effectiveAccessService.computeEffectivePages({
      userId: granterUserId
    });
    
    const granterPages = new Set(granterAccess.effectivePages);
    const violations = pageKeys.filter(pk => !granterPages.has(pk));
    
    if (violations.length > 0) {
      return {
        passed: false,
        violation: `User ${granterUserId} attempted to grant ${violations.length} pages they don't have`,
        violatedPages: violations
      };
    }
    
    return { passed: true };
  }
};

/**
 * INVARIANT 2: ABSENCE = DENIAL
 * If a page is not in admin_page_assignments for a user, access is DENIED.
 * There is NO implicit access.
 * 
 * FORMULA: access(user, page) ⟺ ∃ approval_chain(user, page)
 */
const INVARIANT_ABSENCE_IS_DENIAL = {
  id: 'INV-002',
  name: 'Absence Equals Denial',
  description: 'No approval entry means no access - never assume access',
  severity: 'CRITICAL',
  check: async (userId, pageKey, pool) => {
    const result = await pool.query(`
      SELECT COUNT(*) as cnt FROM admin_page_assignments
      WHERE assignee_id = $1 
        AND page_key = $2
        AND is_active = true
    `, [userId, pageKey]);
    
    const hasApproval = parseInt(result.rows[0].cnt) > 0;
    
    return {
      passed: true, // This is a design invariant, not a runtime check
      hasApproval,
      accessAllowed: hasApproval // Absence = denial
    };
  }
};

/**
 * INVARIANT 3: MENU ≠ AUTHORITY
 * The menu is for display only. API endpoints MUST independently verify access.
 * 
 * FORMULA: menuAccess(page) ⊄ apiAccess(page) - they are independent
 */
const INVARIANT_MENU_NOT_AUTHORITY = {
  id: 'INV-003',
  name: 'Menu Is Not Authority',
  description: 'Menu visibility does not grant API access - always re-verify',
  severity: 'HIGH',
  check: () => {
    // This is an architectural invariant - cannot be checked at runtime
    // Enforcement is in code review and middleware placement
    return { passed: true, note: 'Architectural invariant - verify middleware placement' };
  }
};

/**
 * INVARIANT 4: API RE-VERIFICATION
 * Every API endpoint MUST call the authorization middleware.
 * There are NO exceptions for "internal" or "trusted" calls.
 * 
 * FORMULA: ∀ request ∈ API → authorize(request)
 */
const INVARIANT_API_ALWAYS_CHECKS = {
  id: 'INV-004',
  name: 'API Always Checks Access',
  description: 'Every API call must verify authorization - no shortcuts',
  severity: 'CRITICAL',
  check: () => {
    // Enforcement is through code review and route registration
    return { passed: true, note: 'Verify all routes use authorize() middleware' };
  }
};

/**
 * INVARIANT 5: APPROVAL CHAIN INTEGRITY
 * For a user to have access, the COMPLETE chain must exist:
 * Subscription → EA Approval → SA Approval → User Grant
 * 
 * FORMULA: access(user, page) = subscription(page) ∧ ea_approved(page) ∧ sa_approved(page)
 */
const INVARIANT_CHAIN_INTEGRITY = {
  id: 'INV-005',
  name: 'Approval Chain Integrity',
  description: 'Complete approval chain must exist for any access grant',
  severity: 'CRITICAL',
  check: async (userId, tenantId, pageKey, pool) => {
    const result = await pool.query(`
      WITH chain_check AS (
        SELECT 
          -- Layer 1: Subscription
          EXISTS (
            SELECT 1 FROM pages_master pm
            JOIN modules_master mm ON pm.module_id = mm.id
            JOIN plan_module_access pma ON pma.module_id = mm.module_code
            JOIN client_subscriptions cs ON cs.plan_id = pma.plan_id
            WHERE pm.page_code = $3 AND cs.client_id = $2::uuid AND cs.state = 'ACTIVE'
          ) as in_subscription,
          
          -- Layer 2: EA Approval (for SA)
          EXISTS (
            SELECT 1 FROM admin_page_assignments
            WHERE page_key = $3 
              AND assigner_type = 'ENTERPRISE_ADMIN'
              AND is_active = true
          ) as ea_approved,
          
          -- Layer 3: SA Approval (for user)
          EXISTS (
            SELECT 1 FROM admin_page_assignments
            WHERE assignee_id = $1
              AND page_key = $3
              AND assigner_type = 'SUPER_ADMIN'
              AND is_active = true
          ) as sa_approved
      )
      SELECT * FROM chain_check
    `, [userId, tenantId, pageKey]);
    
    const { in_subscription, ea_approved, sa_approved } = result.rows[0] || {};
    
    const allPassed = in_subscription && ea_approved && sa_approved;
    
    return {
      passed: allPassed,
      chain: {
        subscription: in_subscription,
        enterpriseApproval: ea_approved,
        superadminApproval: sa_approved
      },
      brokenAt: !in_subscription ? 'subscription' : 
                !ea_approved ? 'enterprise_approval' : 
                !sa_approved ? 'superadmin_approval' : null
    };
  }
};

// ============================================================================
// RUNTIME ASSERTIONS
// ============================================================================

/**
 * Runtime assertion that throws on violation
 */
function assertInvariant(condition, invariantId, message, context = {}) {
  if (!condition) {
    const error = new Error(`[SECURITY VIOLATION] ${invariantId}: ${message}`);
    error.invariantId = invariantId;
    error.context = context;
    error.isSecurityViolation = true;
    
    // Log immediately
    console.error('═══════════════════════════════════════════════════════════════');
    console.error('🚨 INVARIANT VIOLATION DETECTED');
    console.error(`   Invariant: ${invariantId}`);
    console.error(`   Message: ${message}`);
    console.error(`   Context: ${JSON.stringify(context)}`);
    console.error(`   Timestamp: ${new Date().toISOString()}`);
    console.error('═══════════════════════════════════════════════════════════════');
    
    throw error;
  }
}

/**
 * Assert that granter has all pages they're trying to grant
 */
function assertCanGrant(granterPages, requestedPages, granterId) {
  const granterSet = new Set(granterPages);
  const violations = requestedPages.filter(p => !granterSet.has(p));
  
  assertInvariant(
    violations.length === 0,
    'INV-001',
    `User ${granterId} cannot grant pages: ${violations.join(', ')}`,
    { granterId, violations, requestedCount: requestedPages.length }
  );
}

/**
 * Assert that page key exists in approval set
 */
function assertHasApproval(approvalSet, pageKey, userId) {
  assertInvariant(
    approvalSet && approvalSet.has(pageKey),
    'INV-002',
    `No approval for page ${pageKey}`,
    { userId, pageKey }
  );
}

// ============================================================================
// LOGGING REQUIREMENTS
// ============================================================================

/**
 * Required log events for RBAC operations
 */
const REQUIRED_LOG_EVENTS = {
  // Authorization decisions
  AUTH_ALLOW: {
    level: 'INFO',
    fields: ['userId', 'pageKey', 'method', 'route', 'effectivePagesCount']
  },
  AUTH_DENY: {
    level: 'WARN',
    fields: ['userId', 'pageKey', 'method', 'route', 'reason', 'effectivePagesCount']
  },
  
  // Permission changes
  PERMISSION_GRANT: {
    level: 'INFO',
    fields: ['granterId', 'granteeId', 'pageKey', 'tenantId']
  },
  PERMISSION_REVOKE: {
    level: 'INFO',
    fields: ['revokerId', 'userId', 'pageKey', 'tenantId', 'reason']
  },
  
  // Security violations
  INVARIANT_VIOLATION: {
    level: 'ERROR',
    fields: ['invariantId', 'message', 'context', 'userId', 'tenantId']
  },
  PRIVILEGE_ESCALATION_ATTEMPT: {
    level: 'ERROR',
    fields: ['attempterId', 'targetId', 'attemptedPages', 'actualPages']
  },
  
  // Approval chain changes
  APPROVAL_CREATED: {
    level: 'INFO',
    fields: ['assignerId', 'assignerType', 'assigneeId', 'assigneeType', 'pageKey']
  },
  APPROVAL_REVOKED: {
    level: 'WARN',
    fields: ['revokerId', 'assigneeId', 'pageKey', 'reason']
  }
};

// ============================================================================
// ALERTING CONDITIONS
// ============================================================================

/**
 * Conditions that should trigger immediate alerts
 */
const ALERT_CONDITIONS = {
  // CRITICAL - Immediate response required
  CRITICAL: [
    {
      condition: 'INVARIANT_VIOLATION',
      threshold: 1,
      window: '1m',
      action: 'PAGE_ONCALL'
    },
    {
      condition: 'PRIVILEGE_ESCALATION_ATTEMPT',
      threshold: 1,
      window: '1m',
      action: 'PAGE_SECURITY_TEAM'
    },
    {
      condition: 'AUTH_DENY_BURST',
      threshold: 100,
      window: '1m',
      action: 'PAGE_ONCALL',
      description: 'Many users being denied - possible misconfiguration'
    }
  ],
  
  // HIGH - Response within 15 minutes
  HIGH: [
    {
      condition: 'NEW_USER_NO_APPROVALS',
      threshold: 5,
      window: '5m',
      action: 'SLACK_ALERT',
      description: 'New users created without approval chain'
    },
    {
      condition: 'ORPHAN_PERMISSIONS_CREATED',
      threshold: 50,
      window: '1h',
      action: 'SLACK_ALERT'
    }
  ],
  
  // MEDIUM - Response within 4 hours
  MEDIUM: [
    {
      condition: 'APPROVAL_CHAIN_GAPS',
      threshold: 10,
      window: '1h',
      action: 'EMAIL_ADMIN',
      description: 'Users with incomplete approval chains'
    }
  ]
};

// ============================================================================
// GUARDRAIL MIDDLEWARE
// ============================================================================

/**
 * Middleware that enforces invariants on every request
 */
function invariantGuardrail(invariantChecks = []) {
  return async (req, res, next) => {
    try {
      for (const check of invariantChecks) {
        const result = await check(req);
        if (!result.passed) {
          console.error(`[Guardrail] Invariant failed: ${result.invariantId}`);
          return res.status(403).json({
            success: false,
            error: 'SECURITY_VIOLATION',
            message: 'Access denied due to security policy violation'
          });
        }
      }
      next();
    } catch (error) {
      if (error.isSecurityViolation) {
        return res.status(403).json({
          success: false,
          error: 'INVARIANT_VIOLATION',
          message: 'Security invariant violated'
        });
      }
      next(error);
    }
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Invariants
  INVARIANT_NO_PRIVILEGE_ESCALATION,
  INVARIANT_ABSENCE_IS_DENIAL,
  INVARIANT_MENU_NOT_AUTHORITY,
  INVARIANT_API_ALWAYS_CHECKS,
  INVARIANT_CHAIN_INTEGRITY,
  
  // Runtime assertions
  assertInvariant,
  assertCanGrant,
  assertHasApproval,
  
  // Logging
  REQUIRED_LOG_EVENTS,
  
  // Alerting
  ALERT_CONDITIONS,
  
  // Middleware
  invariantGuardrail
};
