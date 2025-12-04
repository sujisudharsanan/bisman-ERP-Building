/**
 * Audit Service
 * 
 * Provides application-level audit logging functions.
 * Works with the database audit triggers and tables.
 * 
 * @module services/auditService
 */

const { getPrisma } = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');

class AuditService {
  constructor() {
    this.prisma = null;
    this.serviceName = process.env.SERVICE_NAME || 'backend';
  }

  getPrisma() {
    if (!this.prisma) {
      this.prisma = getPrisma();
    }
    return this.prisma;
  }

  /**
   * Set audit context for the current request
   * Should be called at the start of each request
   */
  async setContext(req) {
    const prisma = this.getPrisma();
    const requestId = req.headers['x-request-id'] || uuidv4();
    
    // Store request ID in req for tracing
    req.requestId = requestId;

    try {
      await prisma.$executeRaw`
        SELECT set_audit_context(
          ${req.user?.id || null}::INTEGER,
          ${req.user?.tenant_id || req.user?.tenantId || null}::UUID,
          ${req.user?.super_admin_id || req.user?.superAdminId || null}::INTEGER,
          ${this.serviceName},
          ${requestId}::UUID,
          ${req.user?.userType === 'ENTERPRISE_ADMIN'}
        )
      `;
    } catch (error) {
      console.warn('[AuditService] Could not set context:', error.message);
    }
  }

  /**
   * Log a security event
   */
  async logSecurityEvent(eventType, options = {}) {
    const prisma = this.getPrisma();
    const {
      severity = 'INFO',
      userId = null,
      userEmail = null,
      userType = null,
      ipAddress = null,
      details = null
    } = options;

    try {
      const result = await prisma.$queryRaw`
        SELECT log_security_event(
          ${eventType},
          ${severity},
          ${userId}::INTEGER,
          ${userEmail},
          ${userType},
          ${ipAddress}::INET,
          ${details ? JSON.stringify(details) : null}::JSONB
        ) as event_id
      `;
      return result[0]?.event_id;
    } catch (error) {
      console.error('[AuditService] Failed to log security event:', error.message);
      return null;
    }
  }

  /**
   * Log a login attempt
   */
  async logLoginAttempt(success, userEmail, ipAddress, details = {}) {
    return this.logSecurityEvent(
      success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILURE',
      {
        severity: success ? 'INFO' : 'WARNING',
        userEmail,
        ipAddress,
        details: {
          ...details,
          timestamp: new Date().toISOString()
        }
      }
    );
  }

  /**
   * Log a permission denied event
   */
  async logPermissionDenied(req, requiredPermission) {
    return this.logSecurityEvent('PERMISSION_DENIED', {
      severity: 'WARNING',
      userId: req.user?.id,
      userEmail: req.user?.email,
      userType: req.user?.userType,
      ipAddress: req.ip,
      details: {
        path: req.path,
        method: req.method,
        requiredPermission,
        userRole: req.user?.roleName
      }
    });
  }

  /**
   * Log a suspicious activity
   */
  async logSuspiciousActivity(type, req, details = {}) {
    return this.logSecurityEvent(`SUSPICIOUS_${type}`, {
      severity: 'ERROR',
      userId: req.user?.id,
      userEmail: req.user?.email,
      ipAddress: req.ip,
      details: {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        ...details
      }
    });
  }

  /**
   * Update service table usage statistics
   */
  async trackTableUsage(tableName, operation, executionMs = null, success = true) {
    const prisma = this.getPrisma();
    
    try {
      await prisma.$executeRaw`
        SELECT update_service_usage(
          ${this.serviceName},
          ${tableName},
          ${operation},
          ${executionMs}::INTEGER,
          ${success}
        )
      `;
    } catch (error) {
      // Don't fail operations due to usage tracking
      console.warn('[AuditService] Failed to track usage:', error.message);
    }
  }

  /**
   * Log a statement for debugging (optional)
   */
  async logStatement(statement, options = {}) {
    const prisma = this.getPrisma();
    const {
      statementType = 'SELECT',
      tableNames = [],
      executionTimeMs = null,
      rowsAffected = null,
      errorMessage = null,
      requestId = null,
      userId = null,
      tenantId = null
    } = options;

    try {
      // Create a hash of the query for deduplication
      const crypto = require('crypto');
      const queryHash = crypto
        .createHash('sha256')
        .update(statement.substring(0, 1000))
        .digest('hex');

      await prisma.$executeRaw`
        INSERT INTO statement_logs (
          service_name, statement_type, table_names, query_hash,
          query_sample, execution_time_ms, rows_affected, error_message,
          request_id, user_id, tenant_id
        ) VALUES (
          ${this.serviceName},
          ${statementType},
          ${tableNames}::TEXT[],
          ${queryHash},
          ${statement.substring(0, 500)},
          ${executionTimeMs}::INTEGER,
          ${rowsAffected}::INTEGER,
          ${errorMessage},
          ${requestId}::UUID,
          ${userId}::INTEGER,
          ${tenantId}::UUID
        )
      `;
    } catch (error) {
      // Don't fail operations due to statement logging
      console.warn('[AuditService] Failed to log statement:', error.message);
    }
  }

  /**
   * Get audit summary for the last 24 hours
   */
  async getAuditSummary() {
    const prisma = this.getPrisma();
    try {
      return await prisma.$queryRaw`SELECT * FROM v_audit_summary_24h`;
    } catch (error) {
      console.error('[AuditService] Failed to get audit summary:', error.message);
      return [];
    }
  }

  /**
   * Get service usage summary
   */
  async getServiceUsage() {
    const prisma = this.getPrisma();
    try {
      return await prisma.$queryRaw`SELECT * FROM v_service_usage_summary`;
    } catch (error) {
      console.error('[AuditService] Failed to get service usage:', error.message);
      return [];
    }
  }

  /**
   * Get security events summary
   */
  async getSecuritySummary() {
    const prisma = this.getPrisma();
    try {
      return await prisma.$queryRaw`SELECT * FROM v_security_events_24h`;
    } catch (error) {
      console.error('[AuditService] Failed to get security summary:', error.message);
      return [];
    }
  }
}

// Export singleton instance
const auditService = new AuditService();

module.exports = {
  auditService,
  AuditService
};
