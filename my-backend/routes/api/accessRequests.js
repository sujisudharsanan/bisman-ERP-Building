/**
 * ============================================================================
 * ACCESS REQUEST API ROUTES
 * ============================================================================
 * 
 * Handles access request workflow:
 * - Users request elevated access (EDIT/EXPORT/DOWNLOAD)
 * - Admins receive notifications
 * - Admins review and approve/deny requests
 * 
 * @module routes/accessRequests
 */

const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://postgres:JNdJhwkgAhtLbiGOFDEZZRGOtCvQumvd@hopper.proxy.rlwy.net:30204/railway';
const pool = new Pool({ connectionString: DATABASE_URL });

// Valid request actions
const VALID_REQUEST_ACTIONS = ['EDIT', 'EXPORT', 'DOWNLOAD', 'CREATE', 'DELETE'];

// ===========================================================================
// POST /api/access-requests - Submit access request
// ===========================================================================

/**
 * @route POST /api/access-requests
 * @desc Submit a request for elevated access
 * @body { pageKey: string, requestedAction: string, reason?: string }
 * @returns { success: boolean, requestId: number, message: string }
 */
router.post('/', async (req, res) => {
  try {
    const { pageKey, requestedAction, reason } = req.body;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;

    // Validate input
    if (!pageKey || !requestedAction) {
      return res.status(400).json({
        error: 'pageKey and requestedAction are required',
        errorCode: 'INVALID_REQUEST',
      });
    }

    const actionUpper = requestedAction.toUpperCase();
    if (!VALID_REQUEST_ACTIONS.includes(actionUpper)) {
      return res.status(400).json({
        error: `Invalid action. Valid: ${VALID_REQUEST_ACTIONS.join(', ')}`,
        errorCode: 'INVALID_ACTION',
      });
    }

    // Check for existing pending request
    const existing = await pool.query(`
      SELECT id FROM access_requests 
      WHERE tenant_id = $1 AND user_id = $2 AND page_code = $3 
        AND requested_action = $4 AND status = 'PENDING'
    `, [tenantId, userId, pageKey, actionUpper]);

    if (existing.rows.length > 0) {
      return res.status(409).json({
        error: 'You already have a pending request for this feature.',
        errorCode: 'REQUEST_ALREADY_EXISTS',
        requestId: existing.rows[0].id,
      });
    }

    // Create the request
    const result = await pool.query(`
      INSERT INTO access_requests 
        (tenant_id, user_id, page_code, requested_action, reason, status)
      VALUES ($1, $2, $3, $4, $5, 'PENDING')
      RETURNING id, created_at
    `, [tenantId, userId, pageKey, actionUpper, reason || null]);

    const request = result.rows[0];

    // Notify admins
    await notifyAdmins(tenantId, request.id, userId, pageKey, actionUpper);

    res.status(201).json({
      success: true,
      requestId: request.id,
      message: 'Your request has been submitted. An administrator will review it.',
    });

  } catch (error) {
    console.error('[AccessRequests] Create error:', error.message);
    res.status(500).json({
      error: 'Failed to submit access request',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// GET /api/access-requests/my-requests - Get user's own requests
// ===========================================================================

router.get('/my-requests', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;

    const result = await pool.query(`
      SELECT 
        ar.id,
        ar.page_code,
        ar.requested_action,
        ar.reason,
        ar.status,
        ar.review_notes,
        ar.created_at,
        ar.reviewed_at,
        pm.display_name as page_name
      FROM access_requests ar
      LEFT JOIN pages_master pm ON ar.page_code = pm.page_code
      WHERE ar.tenant_id = $1 AND ar.user_id = $2
      ORDER BY ar.created_at DESC
      LIMIT 50
    `, [tenantId, userId]);

    res.json({
      requests: result.rows,
    });

  } catch (error) {
    console.error('[AccessRequests] Get my requests error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch requests',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// GET /api/access-requests/pending - Get pending requests (Admin only)
// ===========================================================================

router.get('/pending', async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const isAdmin = req.user?.isAdmin || ['ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'].includes(req.user?.role);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
        errorCode: 'FORBIDDEN',
      });
    }

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

    res.json({
      requests: result.rows,
      count: result.rows.length,
    });

  } catch (error) {
    console.error('[AccessRequests] Get pending error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch pending requests',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// PUT /api/access-requests/:id/review - Review request (Admin only)
// ===========================================================================

router.put('/:id/review', async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body;
    const adminUserId = req.user?.id || req.user?.userId;
    const tenantId = req.user?.tenantId || req.user?.tenant_id;
    const isAdmin = req.user?.isAdmin || ['ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'].includes(req.user?.role);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
        errorCode: 'FORBIDDEN',
      });
    }

    const actionUpper = action?.toUpperCase();
    if (!['APPROVED', 'DENIED'].includes(actionUpper)) {
      return res.status(400).json({
        error: 'action must be APPROVED or DENIED',
        errorCode: 'INVALID_ACTION',
      });
    }

    // Verify request belongs to tenant
    const check = await pool.query(`
      SELECT id FROM access_requests 
      WHERE id = $1 AND tenant_id = $2 AND status = 'PENDING'
    `, [id, tenantId]);

    if (check.rows.length === 0) {
      return res.status(404).json({
        error: 'Request not found or already reviewed',
        errorCode: 'NOT_FOUND',
      });
    }

    // Update the request
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
    `, [actionUpper, adminUserId, notes || null, id]);

    // TODO: Notify user of decision (email/notification)

    res.json({
      success: true,
      request: result.rows[0],
      message: `Request ${actionUpper.toLowerCase()}.`,
    });

  } catch (error) {
    console.error('[AccessRequests] Review error:', error.message);
    res.status(500).json({
      error: 'Failed to review request',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// GET /api/access-requests/notifications - Get admin notifications
// ===========================================================================

router.get('/notifications', async (req, res) => {
  try {
    const adminUserId = req.user?.id || req.user?.userId;
    const isAdmin = req.user?.isAdmin || ['ADMIN', 'SUPER_ADMIN', 'CLIENT_ADMIN'].includes(req.user?.role);

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Admin access required',
        errorCode: 'FORBIDDEN',
      });
    }

    const result = await pool.query(`
      SELECT 
        aan.id,
        aan.title,
        aan.message,
        aan.upgrade_suggestion,
        aan.suggested_plan_id,
        aan.is_read,
        aan.created_at,
        ar.id as request_id,
        ar.page_code,
        ar.requested_action,
        ar.status as request_status,
        CONCAT(u.first_name, ' ', u.last_name) as user_name
      FROM admin_access_notifications aan
      JOIN access_requests ar ON aan.access_request_id = ar.id
      JOIN users_enhanced u ON ar.user_id = u.id
      WHERE aan.admin_user_id = $1
      ORDER BY aan.created_at DESC
      LIMIT 50
    `, [adminUserId]);

    res.json({
      notifications: result.rows,
      unreadCount: result.rows.filter(n => !n.is_read).length,
    });

  } catch (error) {
    console.error('[AccessRequests] Get notifications error:', error.message);
    res.status(500).json({
      error: 'Failed to fetch notifications',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// PUT /api/access-requests/notifications/:id/read - Mark notification as read
// ===========================================================================

router.put('/notifications/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const adminUserId = req.user?.id || req.user?.userId;

    await pool.query(`
      UPDATE admin_access_notifications
      SET is_read = true, read_at = NOW()
      WHERE id = $1 AND admin_user_id = $2
    `, [id, adminUserId]);

    res.json({ success: true });

  } catch (error) {
    console.error('[AccessRequests] Mark read error:', error.message);
    res.status(500).json({
      error: 'Failed to mark notification as read',
      errorCode: 'INTERNAL_ERROR',
    });
  }
});

// ===========================================================================
// HELPER: Notify Admins
// ===========================================================================

async function notifyAdmins(tenantId, requestId, userId, pageKey, action) {
  try {
    // Get user info
    const userResult = await pool.query(`
      SELECT CONCAT(first_name, ' ', last_name) as name, email 
      FROM users_enhanced WHERE id = $1
    `, [userId]);
    const user = userResult.rows[0] || { name: 'Unknown', email: '' };

    // Get page info
    const pageResult = await pool.query(`
      SELECT display_name FROM pages_master WHERE page_code = $1
    `, [pageKey]);
    const pageName = pageResult.rows[0]?.display_name || pageKey;

    // Get subscription plan
    const planResult = await pool.query(`
      SELECT sp.id, sp.name 
      FROM client_subscriptions cs
      JOIN subscription_plans sp ON cs.plan_id = sp.id
      WHERE cs.client_id = $1 AND cs.state = 'ACTIVE'
      ORDER BY cs.created_at DESC LIMIT 1
    `, [tenantId]);
    const currentPlan = planResult.rows[0]?.name || 'Free';

    // Find a plan that allows this action
    const upgradePlanResult = await pool.query(`
      SELECT sp.id, sp.name
      FROM subscription_page_features spf
      JOIN subscription_plans sp ON spf.plan_id = sp.id
      WHERE spf.page_code = $1 
        AND CASE 
          WHEN $2 = 'EDIT' THEN spf.can_edit
          WHEN $2 = 'EXPORT' THEN spf.can_export
          WHEN $2 = 'DOWNLOAD' THEN spf.can_download
          WHEN $2 = 'CREATE' THEN spf.can_create
          WHEN $2 = 'DELETE' THEN spf.can_delete
          ELSE false
        END = true
      ORDER BY sp.id
      LIMIT 1
    `, [pageKey, action]);
    const suggestedPlan = upgradePlanResult.rows[0];

    // Get admin users
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
        : `Consider upgrading your plan.`);

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
        suggestedPlan?.id || null,
      ]);
    }

    // Mark request as notified
    await pool.query(`
      UPDATE access_requests SET admin_notified = true, admin_notified_at = NOW()
      WHERE id = $1
    `, [requestId]);

  } catch (error) {
    console.warn('[AccessRequests] Notify admins failed:', error.message);
    // Don't fail the request creation
  }
}

module.exports = router;
