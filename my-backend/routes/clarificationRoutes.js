/**
 * Task Clarification API Routes
 * 
 * Handles cross-user/cross-department clarification requests
 * WITHOUT changing task ownership, approval chain, or authority.
 * 
 * Endpoints:
 * - POST   /api/clarifications                 - Request clarification
 * - GET    /api/clarifications/pending         - Get pending clarifications for current user
 * - GET    /api/clarifications/:id             - Get clarification details
 * - POST   /api/clarifications/:id/respond     - Respond to clarification
 * - POST   /api/clarifications/:id/cancel      - Cancel clarification
 * - GET    /api/clarifications/task/:taskId    - Get all clarifications for a task
 * - GET    /api/clarifications/:id/audit       - Get audit log for clarification
 * - GET    /api/clarifications/stats           - Get clarification statistics
 */

const express = require('express');
const router = express.Router();
const clarificationService = require('../services/clarificationService');

// Helper to get user from request
const getUserFromRequest = (req) => {
  const user = req.user;
  if (!user || !user.id) {
    throw new Error('Authentication required');
  }
  return {
    id: typeof user.id === 'string' ? parseInt(user.id) : user.id,
    tenantId: user.tenant_id || user.tenantId || null,
    name: user.name || user.username,
    email: user.email,
  };
};

// Helper to resolve user ID (UUID to integer)
const resolveUserId = async (rawId) => {
  if (!rawId) return null;
  
  const parsedInt = parseInt(rawId);
  if (!isNaN(parsedInt) && parsedInt > 0 && String(parsedInt) === String(rawId)) {
    return parsedInt;
  }
  
  // If UUID, try to look up legacy_id
  if (typeof rawId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
    const { getPool } = require('../middleware/database');
    const pool = getPool();
    const result = await pool.query(
      'SELECT legacy_id FROM users_enhanced WHERE id = $1',
      [rawId]
    );
    if (result.rows.length > 0 && result.rows[0].legacy_id) {
      return result.rows[0].legacy_id;
    }
  }
  
  return null;
};

/**
 * POST /api/clarifications
 * Request clarification on a task
 * 
 * Body:
 * - taskId: number (required)
 * - responderId?: number (user to respond)
 * - responderDepartmentId?: string (department to respond)
 * - question: string (required)
 * - attachments?: array
 * - pauseSla?: boolean (default: true)
 * - expiryHours?: number (default: 48)
 * - urgency?: 'low' | 'normal' | 'high' | 'critical'
 */
router.post('/', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const userId = await resolveUserId(user.id) || user.id;
    
    const {
      taskId,
      responderId,
      responderDepartmentId,
      question,
      attachments,
      pauseSla,
      expiryHours,
      urgency,
    } = req.body;
    
    // Validate required fields
    if (!taskId) {
      return res.status(400).json({
        success: false,
        error: 'Task ID is required',
        code: 'MISSING_TASK_ID',
      });
    }
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clarification question is required',
        code: 'MISSING_QUESTION',
      });
    }
    
    if (!responderId && !responderDepartmentId) {
      return res.status(400).json({
        success: false,
        error: 'Must specify either a user or department to request clarification from',
        code: 'MISSING_RESPONDER',
      });
    }
    
    const result = await clarificationService.requestClarification({
      taskId: parseInt(taskId),
      requesterId: userId,
      responderId: responderId ? parseInt(responderId) : null,
      responderDepartmentId,
      question: question.trim(),
      attachments,
      pauseSla: pauseSla !== false, // default true
      expiryHours: expiryHours || 48,
      urgency: urgency || 'normal',
      tenantId: user.tenantId,
    });
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('[Clarification] Request error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message,
      code: 'CLARIFICATION_REQUEST_ERROR',
    });
  }
});

/**
 * GET /api/clarifications/pending
 * Get clarifications pending response from current user
 */
router.get('/pending', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const userId = await resolveUserId(user.id) || user.id;
    
    const { page = 1, limit = 20 } = req.query;
    
    const result = await clarificationService.getPendingClarificationsForUser(userId, {
      tenantId: user.tenantId,
      page: parseInt(page),
      limit: parseInt(limit),
    });
    
    res.json({
      success: true,
      ...result,
    });
    
  } catch (error) {
    console.error('[Clarification] Get pending error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending clarifications',
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /api/clarifications/stats
 * Get clarification statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    
    const stats = await clarificationService.getClarificationStats(user.tenantId);
    
    res.json({
      success: true,
      stats,
    });
    
  } catch (error) {
    console.error('[Clarification] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clarification statistics',
      code: 'STATS_ERROR',
    });
  }
});

/**
 * GET /api/clarifications/task/:taskId
 * Get all clarifications for a specific task
 */
router.get('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, includeResponded } = req.query;
    
    const clarifications = await clarificationService.getTaskClarifications(
      parseInt(taskId),
      {
        status,
        includeResponded: includeResponded !== 'false',
      }
    );
    
    res.json({
      success: true,
      clarifications,
      count: clarifications.length,
    });
    
  } catch (error) {
    console.error('[Clarification] Get task clarifications error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task clarifications',
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /api/clarifications/:id
 * Get clarification details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const clarification = await clarificationService.getClarificationById(id);
    
    if (!clarification) {
      return res.status(404).json({
        success: false,
        error: 'Clarification not found',
        code: 'NOT_FOUND',
      });
    }
    
    res.json({
      success: true,
      clarification,
    });
    
  } catch (error) {
    console.error('[Clarification] Get by ID error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch clarification',
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * GET /api/clarifications/:id/audit
 * Get audit log for a clarification
 */
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params;
    
    const auditLog = await clarificationService.getClarificationAuditLog(id);
    
    res.json({
      success: true,
      auditLog,
    });
    
  } catch (error) {
    console.error('[Clarification] Get audit log error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch audit log',
      code: 'FETCH_ERROR',
    });
  }
});

/**
 * POST /api/clarifications/:id/respond
 * Respond to a clarification request
 * 
 * Body:
 * - response: string (required)
 * - attachments?: array
 */
router.post('/:id/respond', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const userId = await resolveUserId(user.id) || user.id;
    
    const { id } = req.params;
    const { response, attachments } = req.body;
    
    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Response text is required',
        code: 'MISSING_RESPONSE',
      });
    }
    
    const result = await clarificationService.respondToClarification({
      clarificationId: id,
      responderId: userId,
      response: response.trim(),
      attachments,
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('[Clarification] Respond error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message,
      code: 'RESPOND_ERROR',
    });
  }
});

/**
 * POST /api/clarifications/:id/cancel
 * Cancel a pending clarification request
 * 
 * Body:
 * - reason?: string
 */
router.post('/:id/cancel', async (req, res) => {
  try {
    const user = getUserFromRequest(req);
    const userId = await resolveUserId(user.id) || user.id;
    
    const { id } = req.params;
    const { reason } = req.body;
    
    const result = await clarificationService.cancelClarification({
      clarificationId: id,
      userId,
      reason,
    });
    
    res.json(result);
    
  } catch (error) {
    console.error('[Clarification] Cancel error:', error);
    res.status(error.message.includes('not found') ? 404 : 400).json({
      success: false,
      error: error.message,
      code: 'CANCEL_ERROR',
    });
  }
});

module.exports = router;
