/**
 * RBAC Metrics Instrumentation
 * 
 * Prometheus metrics for RBAC security monitoring.
 * These metrics power the alerting rules in rbac-security-alerts.yml.
 * 
 * @module lib/rbacMetrics
 */

// Try to use prom-client if available, fallback to no-op
let client;
let registry;

try {
  client = require('prom-client');
  registry = client.register;
} catch (e) {
  console.warn('[rbacMetrics] prom-client not available, metrics disabled');
  client = null;
  registry = null;
}

// ============================================================
// Permission Change Metrics
// ============================================================

const permissionChangesCounter = client ? new client.Counter({
  name: 'rbac_permission_changes_total',
  help: 'Total number of RBAC permission changes',
  labelNames: ['user_id', 'role_id', 'role_name', 'role_level', 'action', 'tenant_id']
}) : null;

const roleCreatedCounter = client ? new client.Counter({
  name: 'rbac_role_created_total',
  help: 'Total number of roles created',
  labelNames: ['user_id', 'role_name', 'role_level', 'tenant_id']
}) : null;

// ============================================================
// Security Violation Metrics
// ============================================================

const roleLevelViolationsCounter = client ? new client.Counter({
  name: 'rbac_role_level_violations_total',
  help: 'Total number of role level violation attempts (privilege escalation attempts)',
  labelNames: ['user_id', 'attempted_level', 'user_level', 'tenant_id']
}) : null;

const crossTenantViolationsCounter = client ? new client.Counter({
  name: 'rbac_cross_tenant_violations_total',
  help: 'Total number of cross-tenant access violation attempts',
  labelNames: ['user_id', 'user_tenant', 'target_tenant', 'role_id']
}) : null;

// ============================================================
// System Health Metrics
// ============================================================

const permissionCheckErrorsCounter = client ? new client.Counter({
  name: 'rbac_permission_check_errors_total',
  help: 'Total number of permission check failures',
  labelNames: ['error_type']
}) : null;

const cacheInvalidationQueueGauge = client ? new client.Gauge({
  name: 'rbac_cache_invalidation_queue_size',
  help: 'Current size of the cache invalidation queue'
}) : null;

const lastCacheInvalidationGauge = client ? new client.Gauge({
  name: 'rbac_last_cache_invalidation_timestamp',
  help: 'Timestamp of the last cache invalidation'
}) : null;

const auditLogErrorsCounter = client ? new client.Counter({
  name: 'rbac_audit_log_errors_total',
  help: 'Total number of audit log write failures',
  labelNames: ['error_type']
}) : null;

// ============================================================
// Permission Check Performance Metrics
// ============================================================

const permissionCheckDurationHistogram = client ? new client.Histogram({
  name: 'rbac_permission_check_duration_seconds',
  help: 'Duration of permission checks',
  labelNames: ['cache_hit'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
}) : null;

// ============================================================
// Metric Recording Functions
// ============================================================

/**
 * Record a permission change event
 * @param {Object} params - Event parameters
 * @param {string|number} params.userId - User who made the change
 * @param {string|number} params.roleId - Role that was modified
 * @param {string} params.roleName - Name of the role
 * @param {number} params.roleLevel - Level of the role
 * @param {string} params.action - Type of change (add, remove, update)
 * @param {string} [params.tenantId] - Tenant ID (if applicable)
 */
function recordPermissionChange({ userId, roleId, roleName, roleLevel, action, tenantId = 'global' }) {
  if (!permissionChangesCounter) return;
  
  permissionChangesCounter.inc({
    user_id: String(userId),
    role_id: String(roleId),
    role_name: roleName || 'unknown',
    role_level: String(roleLevel || 0),
    action: action || 'update',
    tenant_id: tenantId || 'global'
  });
}

/**
 * Record a role creation event
 * @param {Object} params - Event parameters
 * @param {string|number} params.userId - User who created the role
 * @param {string} params.roleName - Name of the new role
 * @param {number} params.roleLevel - Level of the new role
 * @param {string} [params.tenantId] - Tenant ID (if applicable)
 */
function recordRoleCreation({ userId, roleName, roleLevel, tenantId = 'global' }) {
  if (!roleCreatedCounter) return;
  
  roleCreatedCounter.inc({
    user_id: String(userId),
    role_name: roleName,
    role_level: String(roleLevel || 0),
    tenant_id: tenantId || 'global'
  });
}

/**
 * Record a role level violation attempt (privilege escalation)
 * @param {Object} params - Event parameters
 * @param {string|number} params.userId - User who attempted the action
 * @param {number} params.attemptedLevel - Level they tried to access
 * @param {number} params.userLevel - User's actual level
 * @param {string} [params.tenantId] - Tenant ID (if applicable)
 */
function recordRoleLevelViolation({ userId, attemptedLevel, userLevel, tenantId = 'global' }) {
  if (!roleLevelViolationsCounter) return;
  
  roleLevelViolationsCounter.inc({
    user_id: String(userId),
    attempted_level: String(attemptedLevel),
    user_level: String(userLevel),
    tenant_id: tenantId || 'global'
  });
  
  console.warn(`[rbacMetrics] Role level violation: user ${userId} (level ${userLevel}) attempted level ${attemptedLevel}`);
}

/**
 * Record a cross-tenant access violation
 * @param {Object} params - Event parameters
 * @param {string|number} params.userId - User who attempted the action
 * @param {string} params.userTenant - User's tenant
 * @param {string} params.targetTenant - Target role's tenant
 * @param {string|number} params.roleId - Role they tried to access
 */
function recordCrossTenantViolation({ userId, userTenant, targetTenant, roleId }) {
  if (!crossTenantViolationsCounter) return;
  
  crossTenantViolationsCounter.inc({
    user_id: String(userId),
    user_tenant: userTenant || 'unknown',
    target_tenant: targetTenant || 'unknown',
    role_id: String(roleId)
  });
  
  console.warn(`[rbacMetrics] Cross-tenant violation: user ${userId} (${userTenant}) tried to access role ${roleId} (${targetTenant})`);
}

/**
 * Record a permission check error
 * @param {string} errorType - Type of error (database, cache, timeout, etc.)
 */
function recordPermissionCheckError(errorType) {
  if (!permissionCheckErrorsCounter) return;
  
  permissionCheckErrorsCounter.inc({
    error_type: errorType || 'unknown'
  });
}

/**
 * Record an audit log write error
 * @param {string} errorType - Type of error
 */
function recordAuditLogError(errorType) {
  if (!auditLogErrorsCounter) return;
  
  auditLogErrorsCounter.inc({
    error_type: errorType || 'unknown'
  });
}

/**
 * Update cache invalidation queue size
 * @param {number} size - Current queue size
 */
function setCacheInvalidationQueueSize(size) {
  if (!cacheInvalidationQueueGauge) return;
  
  cacheInvalidationQueueGauge.set(size);
}

/**
 * Record a cache invalidation event
 */
function recordCacheInvalidation() {
  if (!lastCacheInvalidationGauge) return;
  
  lastCacheInvalidationGauge.set(Date.now() / 1000);
}

/**
 * Record a permission check with timing
 * @param {boolean} cacheHit - Whether the check was served from cache
 * @param {number} durationMs - Duration in milliseconds
 */
function recordPermissionCheckDuration(cacheHit, durationMs) {
  if (!permissionCheckDurationHistogram) return;
  
  permissionCheckDurationHistogram.observe(
    { cache_hit: cacheHit ? 'true' : 'false' },
    durationMs / 1000
  );
}

// ============================================================
// Exports
// ============================================================

module.exports = {
  // Recording functions
  recordPermissionChange,
  recordRoleCreation,
  recordRoleLevelViolation,
  recordCrossTenantViolation,
  recordPermissionCheckError,
  recordAuditLogError,
  setCacheInvalidationQueueSize,
  recordCacheInvalidation,
  recordPermissionCheckDuration,
  
  // Access to registry for custom integrations
  registry,
  
  // Check if metrics are available
  isEnabled: () => !!client
};
