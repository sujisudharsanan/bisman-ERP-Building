/**
 * BackgroundJobRLS - Security-enforced execution wrapper for background jobs
 * ===========================================================================
 * 
 * SECURITY CRITICAL:
 * - NO background job may execute database queries without RLS context
 * - ALL jobs must explicitly pass tenant context
 * - NO implicit "ALL" scope for non-system jobs
 * - FAIL CLOSED on missing context
 * 
 * This module provides a mandatory wrapper for all background job execution.
 * 
 * @module security/BackgroundJobRLS
 * @requires pg
 */

const { Pool } = require('pg');

// Database connection using non-superuser role (CRITICAL: must be NOBYPASSRLS)
const DATABASE_URL = process.env.DATABASE_URL_APP || process.env.DATABASE_URL ||
  'postgresql://bisman_app:BismanApp2026Secure!@hopper.proxy.rlwy.net:30204/railway';

// Valid data scopes
const VALID_SCOPES = ['ALL', 'TENANT', 'ORG', 'BRANCH', 'DEPARTMENT', 'TEAM', 'SELF', 'CUSTOM'];

// Jobs that are explicitly approved for ALL scope (platform-level operations)
const APPROVED_ALL_SCOPE_JOBS = [
  'platform-health-check',
  'platform-metrics-aggregation',
  'billing-invoice-generation',
  'security-audit-report'
];

// Audit log table for job executions
const JOB_AUDIT_TABLE = 'background_job_audit';

/**
 * Security context for job execution
 * @typedef {Object} JobSecurityContext
 * @property {string} tenantId - Tenant UUID (required)
 * @property {number} userId - User ID (required)
 * @property {'ALL'|'TENANT'|'ORG'|'BRANCH'|'DEPARTMENT'|'TEAM'|'SELF'|'CUSTOM'} dataScope - Data scope
 * @property {string} [role] - Optional role name
 * @property {string} [department] - Optional department
 */

/**
 * Job metadata for tracking
 * @typedef {Object} JobMetadata
 * @property {string} jobName - Name of the job
 * @property {string} [jobId] - Unique job ID
 * @property {boolean} [isSystemJob] - Whether this is a platform-level job
 */

/**
 * Audit entry for job execution
 * @typedef {Object} JobAuditEntry
 * @property {string} jobName
 * @property {string} tenantId
 * @property {number} userId
 * @property {string} dataScope
 * @property {string} status - 'started' | 'completed' | 'failed'
 * @property {number} [durationMs]
 * @property {string} [error]
 */

/**
 * BackgroundJobRLS - Security wrapper class
 */
class BackgroundJobRLS {
  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
    this.initialized = false;
  }

  /**
   * Initialize the RLS wrapper (verify audit table exists)
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Verify audit table exists (don't create - admin should have created it)
      const tableCheck = await this.pool.query(`
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'background_job_audit' 
        AND table_schema = 'public'
      `);
      
      if (tableCheck.rows.length === 0) {
        console.warn('[BackgroundJobRLS] ⚠️  background_job_audit table not found - audit logging disabled');
        this.auditEnabled = false;
      } else {
        this.auditEnabled = true;
      }

      this.initialized = true;
      console.log('[BackgroundJobRLS] ✅ Initialized');
    } catch (error) {
      console.error('[BackgroundJobRLS] ❌ Initialization failed:', error.message);
      // Don't fail - audit table is optional
      this.initialized = true;
      this.auditEnabled = false;
    }
  }

  /**
   * Validate security context
   * 
   * @param {JobSecurityContext} context - Security context to validate
   * @param {JobMetadata} metadata - Job metadata
   * @throws {Error} If context is invalid
   */
  validateContext(context, metadata) {
    const errors = [];

    // Required fields
    if (!context.tenantId) {
      errors.push('tenantId is required');
    }
    if (!context.userId) {
      errors.push('userId is required');
    }
    if (!context.dataScope) {
      errors.push('dataScope is required');
    }

    // Validate data scope
    if (context.dataScope && !VALID_SCOPES.includes(context.dataScope.toUpperCase())) {
      errors.push(`Invalid dataScope: ${context.dataScope}. Valid: ${VALID_SCOPES.join(', ')}`);
    }

    // ALL scope restriction - only allowed for approved system jobs
    if (context.dataScope === 'ALL') {
      if (!metadata.isSystemJob && !APPROVED_ALL_SCOPE_JOBS.includes(metadata.jobName)) {
        errors.push(
          `ALL scope denied for job "${metadata.jobName}". ` +
          `Only approved system jobs may use ALL scope. ` +
          `Use TENANT scope instead.`
        );
      }
    }

    // Throw combined errors
    if (errors.length > 0) {
      const errorMsg = `[BackgroundJobRLS] SECURITY CONTEXT INVALID:\n  - ${errors.join('\n  - ')}`;
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
  }

  /**
   * Execute a job callback within RLS-enforced context
   * 
   * @param {JobSecurityContext} context - Security context
   * @param {JobMetadata} metadata - Job metadata
   * @param {Function} callback - Async callback to execute (receives client)
   * @returns {Promise<any>} Result from callback
   * @throws {Error} On security violation or callback error
   * 
   * @example
   * const result = await backgroundJobRLS.runWithRLSContext(
   *   { tenantId: 'uuid', userId: 1, dataScope: 'TENANT' },
   *   { jobName: 'send-daily-report' },
   *   async (client) => {
   *     const rows = await client.query('SELECT * FROM orders WHERE status = $1', ['pending']);
   *     return rows;
   *   }
   * );
   */
  async runWithRLSContext(context, metadata, callback) {
    await this.initialize();

    // Validate context BEFORE acquiring connection
    this.validateContext(context, metadata);

    const jobId = metadata.jobId || `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let client = null;

    // Log job start
    await this.logJobAudit({
      jobId,
      jobName: metadata.jobName,
      tenantId: context.tenantId,
      userId: context.userId,
      dataScope: context.dataScope,
      status: 'started',
      metadata: metadata
    });

    try {
      // Acquire dedicated connection
      client = await this.pool.connect();

      // Start transaction (RLS context is transaction-scoped)
      await client.query('BEGIN');

      // Set RLS context using set_config (transaction-scoped with is_local=true)
      await client.query(`SELECT set_config('app.user_id', $1, true)`, [String(context.userId)]);
      await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [String(context.tenantId)]);
      await client.query(`SELECT set_config('app.data_scope', $1, true)`, [context.dataScope.toUpperCase()]);
      await client.query(`SELECT set_config('app.role', $1, true)`, [context.role || 'BACKGROUND_JOB']);
      await client.query(`SELECT set_config('app.department', $1, true)`, [context.department || '']);
      await client.query(`SELECT set_config('app.context_set', 'true', true)`);

      // VERIFY context is set (fail-closed check)
      const verification = await client.query(`SELECT is_security_context_set() as is_set`);
      
      if (!verification.rows[0]?.is_set) {
        throw new Error('SECURITY CONTEXT NOT SET - RLS verification failed');
      }

      // Execute the job callback with the secured client
      const result = await callback(client);

      // Commit transaction
      await client.query('COMMIT');

      const durationMs = Date.now() - startTime;

      // Log successful completion
      await this.logJobAudit({
        jobId,
        jobName: metadata.jobName,
        tenantId: context.tenantId,
        userId: context.userId,
        dataScope: context.dataScope,
        status: 'completed',
        durationMs,
        metadata: metadata
      });

      console.log(
        `[BackgroundJobRLS] ✅ Job "${metadata.jobName}" completed in ${durationMs}ms ` +
        `(tenant: ${context.tenantId}, scope: ${context.dataScope})`
      );

      return result;

    } catch (error) {
      // Rollback on any error
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('[BackgroundJobRLS] Rollback failed:', rollbackError.message);
        }
      }

      const durationMs = Date.now() - startTime;

      // Log failure
      await this.logJobAudit({
        jobId,
        jobName: metadata.jobName,
        tenantId: context.tenantId,
        userId: context.userId,
        dataScope: context.dataScope,
        status: 'failed',
        durationMs,
        error: error.message,
        metadata: metadata
      });

      console.error(
        `[BackgroundJobRLS] ❌ Job "${metadata.jobName}" failed after ${durationMs}ms: ${error.message}`
      );

      throw error;

    } finally {
      // CRITICAL: Always release connection and reset context
      if (client) {
        try {
          // Explicit context reset (belt and suspenders with transaction end)
          await client.query(`
            RESET app.user_id;
            RESET app.tenant_id;
            RESET app.data_scope;
            RESET app.role;
            RESET app.department;
            RESET app.context_set;
          `);
        } catch {
          // Ignore reset errors - connection will be discarded
        }
        client.release();
      }
    }
  }

  /**
   * Execute a job for ALL tenants (iterates one by one with proper context)
   * Use this for jobs that need to process all tenants (e.g., trial expiry)
   * 
   * @param {JobMetadata} metadata - Job metadata
   * @param {number} systemUserId - System user ID for audit
   * @param {Function} getTenants - Async function returning tenant list
   * @param {Function} perTenantCallback - Callback per tenant (receives client, tenantId)
   */
  async runForAllTenants(metadata, systemUserId, getTenants, perTenantCallback) {
    await this.initialize();

    // First, get the list of tenants (without RLS - use admin connection)
    const adminClient = await this.pool.connect();
    let tenants;
    
    try {
      const result = await adminClient.query(`
        SELECT id FROM clients WHERE is_active = true
      `);
      tenants = result.rows.map(r => r.id);
    } finally {
      adminClient.release();
    }

    console.log(`[BackgroundJobRLS] Processing ${tenants.length} tenants for "${metadata.jobName}"`);

    const results = {
      processed: 0,
      failed: 0,
      errors: []
    };

    // Process each tenant with its own RLS context
    for (const tenantId of tenants) {
      try {
        await this.runWithRLSContext(
          {
            tenantId: String(tenantId),
            userId: systemUserId,
            dataScope: 'TENANT',
            role: 'SYSTEM_JOB'
          },
          { ...metadata, isSystemJob: true },
          async (client) => {
            await perTenantCallback(client, tenantId);
          }
        );
        results.processed++;
      } catch (error) {
        results.failed++;
        results.errors.push({ tenantId, error: error.message });
        console.error(`[BackgroundJobRLS] Tenant ${tenantId} failed:`, error.message);
      }
    }

    console.log(
      `[BackgroundJobRLS] "${metadata.jobName}" complete: ` +
      `${results.processed} processed, ${results.failed} failed`
    );

    return results;
  }

  /**
   * Log job execution to audit table
   */
  async logJobAudit(entry) {
    // Skip if audit not enabled
    if (!this.auditEnabled) return;
    
    try {
      if (entry.status === 'started') {
        await this.pool.query(`
          INSERT INTO ${JOB_AUDIT_TABLE} 
          (job_id, job_name, tenant_id, user_id, data_scope, status, metadata)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          entry.jobId,
          entry.jobName,
          entry.tenantId,
          entry.userId,
          entry.dataScope,
          entry.status,
          JSON.stringify(entry.metadata || {})
        ]);
      } else {
        await this.pool.query(`
          UPDATE ${JOB_AUDIT_TABLE}
          SET status = $1, completed_at = NOW(), duration_ms = $2, error = $3
          WHERE job_id = $4
        `, [
          entry.status,
          entry.durationMs || null,
          entry.error || null,
          entry.jobId
        ]);
      }
    } catch (error) {
      // Audit logging should never fail the job
      console.warn('[BackgroundJobRLS] Audit log failed:', error.message);
    }
  }

  /**
   * Get job audit history
   */
  async getJobAuditHistory(options = {}) {
    const { jobName, tenantId, status, limit = 100 } = options;
    
    let query = `SELECT * FROM ${JOB_AUDIT_TABLE} WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (jobName) {
      query += ` AND job_name = $${paramIndex++}`;
      params.push(jobName);
    }
    if (tenantId) {
      query += ` AND tenant_id = $${paramIndex++}`;
      params.push(tenantId);
    }
    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY started_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Validate that a query can only see tenant-scoped data
   * For testing purposes
   */
  async validateRLSEnforcement(context, testQuery) {
    return await this.runWithRLSContext(
      context,
      { jobName: 'rls-validation-test' },
      async (client) => {
        const result = await client.query(testQuery);
        
        // Verify all returned rows belong to the context tenant
        for (const row of result.rows) {
          if (row.tenant_id && row.tenant_id !== context.tenantId) {
            throw new Error(
              `RLS VIOLATION: Query returned data from tenant ${row.tenant_id} ` +
              `but context is ${context.tenantId}`
            );
          }
        }
        
        return {
          valid: true,
          rowCount: result.rows.length
        };
      }
    );
  }

  /**
   * Close the pool
   */
  async close() {
    await this.pool.end();
  }
}

// Singleton instance
const backgroundJobRLS = new BackgroundJobRLS();

/**
 * Convenience function for running jobs with RLS context
 * 
 * @param {JobSecurityContext} context - Security context
 * @param {JobMetadata} metadata - Job metadata
 * @param {Function} callback - Async callback to execute
 */
async function runWithRLSContext(context, metadata, callback) {
  return backgroundJobRLS.runWithRLSContext(context, metadata, callback);
}

/**
 * Convenience function for running jobs across all tenants
 */
async function runForAllTenants(metadata, systemUserId, getTenants, perTenantCallback) {
  return backgroundJobRLS.runForAllTenants(metadata, systemUserId, getTenants, perTenantCallback);
}

module.exports = {
  BackgroundJobRLS,
  backgroundJobRLS,
  runWithRLSContext,
  runForAllTenants,
  VALID_SCOPES,
  APPROVED_ALL_SCOPE_JOBS
};
