/**
 * ============================================================================
 * PHASE 5: RBAC AUDIT LOGGER
 * ============================================================================
 * 
 * Structured logging for ALL RBAC decisions and security events.
 * Every decision MUST be logged for audit trail.
 * 
 * @module security/rbacAuditLogger
 */

const { REQUIRED_LOG_EVENTS } = require('./rbacInvariants');

// ============================================================================
// LOG LEVELS
// ============================================================================

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  CRITICAL: 4
};

// Current log level (configurable via env)
const CURRENT_LEVEL = LOG_LEVELS[process.env.RBAC_LOG_LEVEL || 'INFO'];

// ============================================================================
// STRUCTURED LOGGER
// ============================================================================

/**
 * Log an RBAC event with structured data
 */
function logRbacEvent(eventType, data) {
  const eventConfig = REQUIRED_LOG_EVENTS[eventType];
  
  if (!eventConfig) {
    console.warn(`[RbacLogger] Unknown event type: ${eventType}`);
  }
  
  const level = eventConfig?.level || 'INFO';
  
  if (LOG_LEVELS[level] < CURRENT_LEVEL) {
    return; // Skip if below current log level
  }
  
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: eventType,
    level,
    ...data,
    // Always include these for traceability
    service: 'bisman-erp',
    component: 'rbac'
  };
  
  // Validate required fields
  if (eventConfig?.fields) {
    const missing = eventConfig.fields.filter(f => !(f in data));
    if (missing.length > 0) {
      logEntry._missingFields = missing;
    }
  }
  
  // Output as JSON for log aggregation
  const output = JSON.stringify(logEntry);
  
  switch (level) {
    case 'ERROR':
    case 'CRITICAL':
      console.error(`[RBAC] ${output}`);
      break;
    case 'WARN':
      console.warn(`[RBAC] ${output}`);
      break;
    default:
      console.log(`[RBAC] ${output}`);
  }
  
  return logEntry;
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * Log authorization ALLOW decision
 */
function logAuthAllow(userId, pageKey, req, effectivePagesCount) {
  return logRbacEvent('AUTH_ALLOW', {
    userId,
    pageKey,
    method: req?.method,
    route: req?.originalUrl || req?.path,
    effectivePagesCount,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent')
  });
}

/**
 * Log authorization DENY decision
 */
function logAuthDeny(userId, pageKey, req, reason, effectivePagesCount) {
  return logRbacEvent('AUTH_DENY', {
    userId,
    pageKey,
    method: req?.method,
    route: req?.originalUrl || req?.path,
    reason,
    effectivePagesCount,
    ip: req?.ip,
    userAgent: req?.get?.('user-agent')
  });
}

/**
 * Log permission grant
 */
function logPermissionGrant(granterId, granteeId, pageKey, tenantId) {
  return logRbacEvent('PERMISSION_GRANT', {
    granterId,
    granteeId,
    pageKey,
    tenantId
  });
}

/**
 * Log permission revoke
 */
function logPermissionRevoke(revokerId, userId, pageKey, tenantId, reason) {
  return logRbacEvent('PERMISSION_REVOKE', {
    revokerId,
    userId,
    pageKey,
    tenantId,
    reason
  });
}

/**
 * Log invariant violation (CRITICAL)
 */
function logInvariantViolation(invariantId, message, context, userId, tenantId) {
  return logRbacEvent('INVARIANT_VIOLATION', {
    invariantId,
    message,
    context,
    userId,
    tenantId
  });
}

/**
 * Log privilege escalation attempt (CRITICAL)
 */
function logPrivilegeEscalation(attempterId, targetId, attemptedPages, actualPages) {
  return logRbacEvent('PRIVILEGE_ESCALATION_ATTEMPT', {
    attempterId,
    targetId,
    attemptedPages,
    actualPages
  });
}

/**
 * Log approval creation
 */
function logApprovalCreated(assignerId, assignerType, assigneeId, assigneeType, pageKey) {
  return logRbacEvent('APPROVAL_CREATED', {
    assignerId,
    assignerType,
    assigneeId,
    assigneeType,
    pageKey
  });
}

/**
 * Log approval revocation
 */
function logApprovalRevoked(revokerId, assigneeId, pageKey, reason) {
  return logRbacEvent('APPROVAL_REVOKED', {
    revokerId,
    assigneeId,
    pageKey,
    reason
  });
}

// ============================================================================
// DECISION CODE TRACKING
// ============================================================================

/**
 * Decision codes for audit trail
 * Every authorization decision MUST have a code
 */
const DECISION_CODES = {
  // ALLOW reasons
  ALLOW_EFFECTIVE_ACCESS: 'A001', // User has effective access
  ALLOW_ALWAYS_ACCESSIBLE: 'A002', // Page is in ALWAYS_ACCESSIBLE_PAGES
  ALLOW_EA_OVERRIDE: 'A003', // Enterprise admin override (rare)
  
  // DENY reasons
  DENY_NO_USER: 'D001', // No user in request
  DENY_NO_EFFECTIVE_ACCESS: 'D002', // User lacks effective access
  DENY_CHAIN_BROKEN: 'D003', // Approval chain incomplete
  DENY_SUBSCRIPTION_MISSING: 'D004', // Page not in subscription
  DENY_EA_NOT_APPROVED: 'D005', // EA hasn't approved for SA
  DENY_SA_NOT_APPROVED: 'D006', // SA hasn't approved for user
  DENY_INVALID_PAGE: 'D007', // Page key doesn't exist
  DENY_PRIVILEGE_ESCALATION: 'D008', // Attempting to exceed own access
  DENY_INVARIANT_VIOLATION: 'D009', // Security invariant violated
  DENY_ERROR: 'D999', // Error during check (fail-closed)
};

/**
 * Log a decision with code
 */
function logDecision(decisionCode, userId, pageKey, req, details = {}) {
  const isAllow = decisionCode.startsWith('A');
  
  if (isAllow) {
    logAuthAllow(userId, pageKey, req, details.effectivePagesCount);
  } else {
    logAuthDeny(userId, pageKey, req, decisionCode, details.effectivePagesCount);
  }
  
  return {
    decision: isAllow ? 'ALLOW' : 'DENY',
    code: decisionCode,
    userId,
    pageKey,
    ...details
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Core
  logRbacEvent,
  
  // Convenience methods
  logAuthAllow,
  logAuthDeny,
  logPermissionGrant,
  logPermissionRevoke,
  logInvariantViolation,
  logPrivilegeEscalation,
  logApprovalCreated,
  logApprovalRevoked,
  
  // Decision tracking
  DECISION_CODES,
  logDecision,
  
  // Constants
  LOG_LEVELS
};
