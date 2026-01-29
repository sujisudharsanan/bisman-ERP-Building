/**
 * ============================================================================
 * SUBSCRIPTION-AWARE PAGE ACCESS SERVICE
 * ============================================================================
 * 
 * Implements the THREE LAYER ACCESS MODEL:
 * 
 * Layer 1 (APPROVAL)     → Page VISIBILITY (RBAC)
 * Layer 2 (SUBSCRIPTION) → Page ACTIONS (edit/export/download)
 * Layer 3 (DATA SCOPE)   → DATA access (RLS)
 * 
 * GOLDEN RULES:
 * 1. Approval decides if you can SEE a page
 * 2. Subscription decides what you can DO on that page
 * 3. Subscription NEVER grants visibility alone
 * 
 * @module services/subscriptionPageAccessService
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { Pool } = require('pg');

// ============================================================================
// ERROR CODES
// ============================================================================

const SUBSCRIPTION_ERROR_CODES = {
  FEATURE_NOT_ALLOWED: 'FEATURE_NOT_ALLOWED',
  PLAN_UPGRADE_REQUIRED: 'PLAN_UPGRADE_REQUIRED',
  ACTION_LIMIT_EXCEEDED: 'ACTION_LIMIT_EXCEEDED',
  ACCESS_REQUEST_PENDING: 'ACCESS_REQUEST_PENDING',
};

// ============================================================================
// USER-FACING MESSAGES (BY ROLE)
// ============================================================================

const MESSAGES = {
  // For Admin/Client (Decision Makers)
  ADMIN: {
    UPGRADE_REQUIRED: 'Your current plan does not include this feature. Upgrade to unlock.',
    ACTION_BLOCKED: 'This action requires a plan upgrade.',
    VIEW_ONLY: 'You can view this data, but editing requires a plan upgrade.',
  },
  
  // For Regular Users (Non-decision makers)
  USER: {
    REQUEST_ACCESS: 'Contact your administrator to request access.',
    ACTION_BLOCKED: 'This action is not available. Request access from your administrator.',
    VIEW_ONLY: 'You can view this data. Contact your administrator for edit access.',
  },
};

// ============================================================================
// CORE SERVICE CLASS
// ============================================================================

class SubscriptionPageAccessService {
  constructor() {
    this.pool = null;
  }
  
  /**
   * Get or create pool connection
   */
  getPool() {
    if (!this.pool) {
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    }
    return this.pool;
  }
  
  // ==========================================================================
  // MAIN ACCESS CHECK (Called on page load)
  // ==========================================================================
  
  /**
   * Get complete page access info for a user
   * 
   * @param {Object} params
   * @param {string} params.tenantId - Tenant UUID
   * @param {number} params.userId - User ID
   * @param {string} params.pageCode - Page code from pages_master
   * @param {boolean} params.isAdmin - Is user an admin/client
   * @returns {Object} Access info
   */
  async getPageAccess({ tenantId, userId, pageCode, isAdmin = false }) {
    const pool = this.getPool();
    
    try {
      // Step 1: Check RBAC/Approval first (Layer 1)
      const hasPageApproval = await this.checkPageApproval(userId, pageCode);
      
      if (!hasPageApproval) {
        // Page not visible - return immediately
        return {
          pageCode,
          visible: false,
          reason: 'PAGE_ACCESS_DENIED',
          access: null,
        };
      }
      
      // Step 2: Get subscription features (Layer 2)
      const result = await pool.query(
        `SELECT check_subscription_page_access($1, $2) as access`,
        [tenantId, pageCode]
      );
      
      const subscriptionAccess = result.rows[0]?.access || {
        canView: true,
        canEdit: false,
        canDelete: false,
        canExport: false,
        canDownload: false,
        canCreate: false,
        subscriptionRestricted: true,
      };
      
      // Step 3: Check for pending access requests
      const pendingRequest = await this.getPendingAccessRequest(tenantId, userId, pageCode);
      
      // Step 4: Build response based on user role
      return {
        pageCode,
        visible: true,
        access: {
          canView: subscriptionAccess.canView,
          canEdit: subscriptionAccess.canEdit,
          canDelete: subscriptionAccess.canDelete,
          canExport: subscriptionAccess.canExport,
          canDownload: subscriptionAccess.canDownload,
          canCreate: subscriptionAccess.canCreate,
        },
        subscriptionRestricted: subscriptionAccess.subscriptionRestricted,
        userRole: isAdmin ? 'ADMIN' : 'USER',
        planId: subscriptionAccess.planId,
        
        // Role-specific UI hints
        ui: this.getUIHints(isAdmin, subscriptionAccess.subscriptionRestricted, pendingRequest),
        
        // Pending request info (if any)
        pendingRequest: pendingRequest ? {
          id: pendingRequest.id,
          action: pendingRequest.requested_action,
          createdAt: pendingRequest.created_at,
        } : null,
      };
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get UI hints based on user role and subscription status
   */
  getUIHints(isAdmin, subscriptionRestricted, pendingRequest) {
    if (!subscriptionRestricted) {
      return { showUpgradeBanner: false, showRequestButton: false };
    }
    
    if (isAdmin) {
      // Admin sees upgrade CTA
      return {
        showUpgradeBanner: true,
        showRequestButton: false,
        bannerMessage: MESSAGES.ADMIN.UPGRADE_REQUIRED,
        ctaText: 'Upgrade Plan',
        ctaAction: '/settings/billing/upgrade',
      };
    } else {
      // Non-admin sees request access
      return {
        showUpgradeBanner: false,
        showRequestButton: !pendingRequest,
        hasPendingRequest: !!pendingRequest,
        message: pendingRequest 
          ? 'Your access request is pending review.'
          : MESSAGES.USER.REQUEST_ACCESS,
        ctaText: pendingRequest ? null : 'Request Access',
      };
    }
  }
  
  // ==========================================================================
  // ACTION CHECK (Called before edit/export/download)
  // ==========================================================================
  
  /**
   * Check if a specific action is allowed
   * 
   * @param {Object} params
   * @param {string} params.tenantId
   * @param {number} params.userId
   * @param {string} params.pageCode
   * @param {string} params.action - 'edit', 'export', 'download', 'create', 'delete'
   * @param {boolean} params.isAdmin
   * @param {Object} params.req - Express request for audit
   * @returns {Object} { allowed, error, message }
   */
  async checkAction({ tenantId, userId, pageCode, action, isAdmin = false, req = null }) {
    const pool = this.getPool();
    
    try {
      // Get subscription access
      const result = await pool.query(
        `SELECT check_subscription_page_access($1, $2, $3) as access`,
        [tenantId, pageCode, action]
      );
      
      const access = result.rows[0]?.access || {};
      const allowed = access.actionAllowed === true;
      
      // Audit the action attempt
      await this.auditActionAttempt({
        tenantId,
        userId,
        pageCode,
        action,
        allowed,
        denialReason: access.denialReason,
        planId: access.planId,
        req,
      });
      
      if (!allowed) {
        return {
          allowed: false,
          error: SUBSCRIPTION_ERROR_CODES.FEATURE_NOT_ALLOWED,
          message: isAdmin ? MESSAGES.ADMIN.ACTION_BLOCKED : MESSAGES.USER.ACTION_BLOCKED,
          upgradeRequired: true,
          planId: access.planId,
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Action check error:', error.message);
      throw error;
    }
  }
  
  // ==========================================================================
  // ACCESS REQUESTS
  // ==========================================================================
  
  /**
   * Create an access request (for non-admin users)
   */
  async createAccessRequest({ tenantId, userId, pageCode, action, reason = null }) {
    const pool = this.getPool();
    
    try {
      // Check for existing pending request
      const existing = await pool.query(`
        SELECT id FROM access_requests 
        WHERE tenant_id = $1 AND user_id = $2 AND page_code = $3 
          AND requested_action = $4 AND status = 'PENDING'
      `, [tenantId, userId, pageCode, action]);
      
      if (existing.rows.length > 0) {
        return {
          success: false,
          error: SUBSCRIPTION_ERROR_CODES.ACCESS_REQUEST_PENDING,
          message: 'You already have a pending request for this feature.',
          requestId: existing.rows[0].id,
        };
      }
      
      // Create the request
      const result = await pool.query(`
        INSERT INTO access_requests 
          (tenant_id, user_id, page_code, requested_action, reason)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, created_at
      `, [tenantId, userId, pageCode, action, reason]);
      
      const request = result.rows[0];
      
      // Notify admins
      await this.notifyAdmins(tenantId, request.id, userId, pageCode, action);
      
      return {
        success: true,
        requestId: request.id,
        message: 'Your request has been submitted. An administrator will review it.',
      };
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Create request error:', error.message);
      throw error;
    }
  }
  
  /**
   * Get pending access request for a user
   */
  async getPendingAccessRequest(tenantId, userId, pageCode) {
    const pool = this.getPool();
    
    const result = await pool.query(`
      SELECT id, requested_action, created_at
      FROM access_requests
      WHERE tenant_id = $1 AND user_id = $2 AND page_code = $3 AND status = 'PENDING'
      ORDER BY created_at DESC
      LIMIT 1
    `, [tenantId, userId, pageCode]);
    
    return result.rows[0] || null;
  }
  
  /**
   * Get all pending requests for admin
   */
  async getPendingRequestsForAdmin(tenantId, _adminUserId) {
    const pool = this.getPool();
    
    const result = await pool.query(`
      SELECT 
        ar.id,
        ar.user_id,
        ar.page_code,
        ar.requested_action,
        ar.reason,
        ar.created_at,
        CONCAT(u.first_name, ' ', u.last_name) as user_name,
        u.email as user_email,
        pm.display_name as page_name
      FROM access_requests ar
      JOIN users_enhanced u ON ar.user_id = u.id
      LEFT JOIN pages_master pm ON ar.page_code = pm.page_code
      WHERE ar.tenant_id = $1 AND ar.status = 'PENDING'
      ORDER BY ar.created_at DESC
    `, [tenantId]);
    
    return result.rows;
  }
  
  /**
   * Review an access request (admin action)
   */
  async reviewAccessRequest({ requestId, adminUserId, action, notes = null }) {
    const pool = this.getPool();
    
    if (!['APPROVED', 'DENIED'].includes(action)) {
      throw new Error('Invalid review action');
    }
    
    const result = await pool.query(`
      UPDATE access_requests
      SET 
        status = $1,
        reviewed_by = $2,
        reviewed_at = NOW(),
        review_notes = $3,
        updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [action, adminUserId, notes, requestId]);
    
    if (result.rows.length === 0) {
      throw new Error('Access request not found');
    }
    
    // TODO: Notify user of the decision
    
    return {
      success: true,
      request: result.rows[0],
    };
  }
  
  // ==========================================================================
  // ADMIN NOTIFICATIONS
  // ==========================================================================
  
  /**
   * Notify admins about an access request
   */
  async notifyAdmins(tenantId, requestId, userId, pageCode, action) {
    const pool = this.getPool();
    
    try {
      // Get user info
      const userResult = await pool.query(
        `SELECT CONCAT(first_name, ' ', last_name) as name, email FROM users_enhanced WHERE id = $1`,
        [userId]
      );
      const user = userResult.rows[0] || { name: 'Unknown', email: '' };
      
      // Get page info
      const pageResult = await pool.query(
        `SELECT display_name FROM pages_master WHERE page_code = $1`,
        [pageCode]
      );
      const pageName = pageResult.rows[0]?.display_name || pageCode;
      
      // Get tenant's subscription plan
      const planResult = await pool.query(`
        SELECT sp.id, sp.name 
        FROM client_subscriptions cs
        JOIN subscription_plans sp ON cs.plan_id = sp.id
        WHERE cs.client_id = $1 AND cs.state = 'ACTIVE'
        ORDER BY cs.created_at DESC LIMIT 1
      `, [tenantId]);
      const currentPlan = planResult.rows[0]?.name || 'Free';
      
      // Find a plan that includes this feature
      const upgradePlanResult = await pool.query(`
        SELECT sp.id, sp.name
        FROM subscription_page_features spf
        JOIN subscription_plans sp ON spf.plan_id = sp.id
        WHERE spf.page_code = $1 AND spf.can_edit = true
        ORDER BY sp.id
        LIMIT 1
      `, [pageCode]);
      const suggestedPlan = upgradePlanResult.rows[0];
      
      // Get admin users for this tenant
      const adminsResult = await pool.query(`
        SELECT id FROM users_enhanced 
        WHERE tenant_id = $1 AND role IN ('ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN')
        AND is_active = true
      `, [tenantId]);
      
      // Create notification for each admin
      const title = `Access Request: ${user.name} needs ${action} access`;
      const message = `User ${user.name} (${user.email}) requested ${action} access to ${pageName}. ` +
        `Current plan: ${currentPlan}. ` +
        (suggestedPlan 
          ? `This feature is available in the ${suggestedPlan.name} plan.`
          : `Consider upgrading your plan to unlock this feature.`);
      
      for (const admin of adminsResult.rows) {
        await pool.query(`
          INSERT INTO admin_access_notifications 
            (tenant_id, access_request_id, admin_user_id, title, message, upgrade_suggestion, suggested_plan_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [
          tenantId, 
          requestId, 
          admin.id, 
          title, 
          message,
          suggestedPlan ? `Upgrade to ${suggestedPlan.name}` : null,
          suggestedPlan?.id
        ]);
      }
      
      // Mark request as notified
      await pool.query(`
        UPDATE access_requests SET admin_notified = true, admin_notified_at = NOW()
        WHERE id = $1
      `, [requestId]);
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Notify admins error:', error.message);
      // Don't throw - notification failure shouldn't block the request
    }
  }
  
  /**
   * Get unread notifications for admin
   */
  async getAdminNotifications(adminUserId) {
    const pool = this.getPool();
    
    const result = await pool.query(`
      SELECT 
        aan.id,
        aan.message,
        aan.upgrade_suggestion,
        aan.suggested_plan_id,
        aan.created_at,
        ar.id as request_id,
        ar.page_code,
        ar.requested_action,
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM admin_access_notifications aan
      JOIN access_requests ar ON aan.access_request_id = ar.id
      JOIN users_enhanced u ON ar.user_id = u.id
      WHERE aan.admin_user_id = $1 AND aan.is_read = false
      ORDER BY aan.created_at DESC
    `, [adminUserId]);
    
    return result.rows;
  }
  
  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId, action = null) {
    const pool = this.getPool();
    
    await pool.query(`
      UPDATE admin_access_notifications
      SET is_read = true, read_at = NOW(), action_taken = $2, action_at = NOW()
      WHERE id = $1
    `, [notificationId, action]);
  }
  
  // ==========================================================================
  // AUDIT
  // ==========================================================================
  
  /**
   * Audit action attempt
   */
  async auditActionAttempt({ tenantId, userId, pageCode, action, allowed, denialReason, planId, req }) {
    const pool = this.getPool();
    
    try {
      // Get plan name
      let planName = null;
      if (planId) {
        const planResult = await pool.query(
          `SELECT name FROM subscription_plans WHERE id = $1`,
          [planId]
        );
        planName = planResult.rows[0]?.name;
      }
      
      await pool.query(`
        INSERT INTO subscription_action_audit 
          (tenant_id, user_id, page_code, action_attempted, allowed, denial_reason, plan_id, plan_name, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        tenantId,
        userId,
        pageCode,
        action,
        allowed,
        denialReason,
        planId,
        planName,
        req?.ip,
        req?.headers?.['user-agent'],
      ]);
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Audit error:', error.message);
      // Don't throw - audit failure shouldn't block the action
    }
  }
  
  // ==========================================================================
  // HELPERS
  // ==========================================================================
  
  /**
   * Check if user has page approval (Layer 1 - RBAC)
   */
  async checkPageApproval(userId, pageCode) {
    try {
      // Check role_page_access (join on role_name = role)
      const result = await prisma.$queryRaw`
        SELECT 1 FROM role_page_access rpa
        JOIN users_enhanced u ON rpa.role_name = u.role
        JOIN pages_master pm ON rpa.page_id = pm.id
        WHERE u.id = ${userId}::uuid AND pm.page_code = ${pageCode} AND rpa.can_view = true
        LIMIT 1
      `;
      
      return result.length > 0;
      
    } catch (error) {
      console.error('[SubscriptionPageAccess] Page approval check error:', error.message);
      return false;
    }
  }
  
  /**
   * Close pool connection
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Singleton instance
const subscriptionPageAccessService = new SubscriptionPageAccessService();

module.exports = {
  subscriptionPageAccessService,
  SUBSCRIPTION_ERROR_CODES,
  MESSAGES,
};
