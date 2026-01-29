/**
 * ============================================================================
 * ACCESS REQUESTS API ROUTES
 * ============================================================================
 * 
 * Handles feature access requests from non-admin users.
 * 
 * Flow:
 * 1. User requests access to a feature (edit/export/etc)
 * 2. Admin receives notification with upgrade suggestion
 * 3. Admin can view, approve, or deny requests
 * 
 * @module routes/accessRequests
 */

const express = require('express');
const router = express.Router();
const { asyncHandler } = require('../middleware/errorHandler');
const { 
  subscriptionPageAccessService 
} = require('../services/subscriptionPageAccessService');
const { isUserAdmin } = require('../middleware/subscriptionFeatureGate');

// ============================================================================
// USER ENDPOINTS
// ============================================================================

/**
 * POST /api/access-requests
 * Create a new access request (for non-admin users)
 */
router.post('/', asyncHandler(async (req, res) => {
  const { pageCode, action, reason } = req.body;
  const tenantId = req.user?.tenantId || req.user?.clientId;
  const userId = req.user?.id;
  
  if (!tenantId || !userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
  }
  
  if (!pageCode || !action) {
    return res.status(400).json({
      success: false,
      error: 'pageCode and action are required',
    });
  }
  
  // Validate action
  const validActions = ['edit', 'create', 'delete', 'export', 'download'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Invalid action. Must be one of: ${validActions.join(', ')}`,
    });
  }
  
  // Check if user is admin (admins should upgrade, not request)
  if (isUserAdmin(req.user)) {
    return res.status(400).json({
      success: false,
      error: 'Administrators should upgrade the plan instead of requesting access.',
      upgradeUrl: '/settings/billing/upgrade',
    });
  }
  
  const result = await subscriptionPageAccessService.createAccessRequest({
    tenantId,
    userId,
    pageCode,
    action,
    reason,
  });
  
  if (!result.success) {
    return res.status(409).json({
      success: false,
      error: result.error,
      message: result.message,
      requestId: result.requestId,
    });
  }
  
  res.status(201).json({
    success: true,
    requestId: result.requestId,
    message: result.message,
  });
}));

/**
 * GET /api/access-requests/my-requests
 * Get current user's pending requests
 */
router.get('/my-requests', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenantId || req.user?.clientId;
  const userId = req.user?.id;
  
  if (!tenantId || !userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  const result = await pool.query(`
    SELECT 
      ar.id,
      ar.page_code,
      ar.requested_action,
      ar.status,
      ar.reason,
      ar.created_at,
      ar.reviewed_at,
      ar.review_notes,
      pm.display_name as page_name
    FROM access_requests ar
    LEFT JOIN pages_master pm ON ar.page_code = pm.page_code
    WHERE ar.tenant_id = $1 AND ar.user_id = $2
    ORDER BY ar.created_at DESC
    LIMIT 50
  `, [tenantId, userId]);
  
  await pool.end();
  
  res.json({
    success: true,
    requests: result.rows,
  });
}));

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * GET /api/access-requests/pending
 * Get all pending requests for admin review
 */
router.get('/pending', asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenantId || req.user?.clientId;
  const userId = req.user?.id;
  
  if (!tenantId || !userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  // Verify user is admin
  if (!isUserAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Only administrators can view pending requests',
    });
  }
  
  const requests = await subscriptionPageAccessService.getPendingRequestsForAdmin(
    tenantId, 
    userId
  );
  
  res.json({
    success: true,
    requests,
    count: requests.length,
  });
}));

/**
 * POST /api/access-requests/:id/review
 * Approve or deny an access request
 */
router.post('/:id/review', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action, notes } = req.body;
  const adminUserId = req.user?.id;
  
  if (!adminUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  // Verify user is admin
  if (!isUserAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Only administrators can review requests',
    });
  }
  
  if (!action || !['APPROVED', 'DENIED'].includes(action)) {
    return res.status(400).json({
      success: false,
      error: 'action must be APPROVED or DENIED',
    });
  }
  
  const result = await subscriptionPageAccessService.reviewAccessRequest({
    requestId: parseInt(id),
    adminUserId,
    action,
    notes,
  });
  
  res.json({
    success: true,
    message: `Request ${action.toLowerCase()}`,
    request: result.request,
  });
}));

/**
 * GET /api/access-requests/notifications
 * Get admin notifications for access requests
 */
router.get('/notifications', asyncHandler(async (req, res) => {
  const adminUserId = req.user?.id;
  
  if (!adminUserId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  if (!isUserAdmin(req.user)) {
    return res.status(403).json({
      success: false,
      error: 'Only administrators can view notifications',
    });
  }
  
  const notifications = await subscriptionPageAccessService.getAdminNotifications(adminUserId);
  
  res.json({
    success: true,
    notifications,
    unreadCount: notifications.length,
  });
}));

/**
 * POST /api/access-requests/notifications/:id/read
 * Mark notification as read
 */
router.post('/notifications/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { actionTaken } = req.body;
  
  await subscriptionPageAccessService.markNotificationRead(parseInt(id), actionTaken);
  
  res.json({
    success: true,
    message: 'Notification marked as read',
  });
}));

// ============================================================================
// PAGE ACCESS INFO ENDPOINT
// ============================================================================

/**
 * GET /api/access-requests/page-access/:pageCode
 * Get subscription access info for a page
 */
router.get('/page-access/:pageCode', asyncHandler(async (req, res) => {
  const { pageCode } = req.params;
  const tenantId = req.user?.tenantId || req.user?.clientId;
  const userId = req.user?.id;
  
  if (!tenantId || !userId) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  
  const access = await subscriptionPageAccessService.getPageAccess({
    tenantId,
    userId,
    pageCode,
    isAdmin: isUserAdmin(req.user),
  });
  
  res.json({
    success: true,
    pageCode,
    ...access,
  });
}));

module.exports = router;
