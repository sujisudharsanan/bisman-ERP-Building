/**
 * Task Request Routes
 * Handles hierarchical task request workflow API endpoints
 * 
 * Business Rule: Subordinates cannot assign tasks to superiors.
 * They can only send requests that superiors must accept/delegate/reject.
 */

const express = require('express');
const router = express.Router();

// Service
const taskRequestService = require('../services/taskRequestService');

// Middleware
const { authenticate: authenticateToken } = require('../middleware/auth');

// Helper to extract actor info from request
const getActorInfo = (req) => ({
  userId: req.user.legacyId || req.user.id,
  tenantId: req.user.tenant_id,
  ipAddress: req.ip || req.connection?.remoteAddress,
  userAgent: req.headers['user-agent'],
  sessionId: req.sessionID || req.headers['x-session-id']
});

// ============================================
// HIERARCHY CHECK
// ============================================

/**
 * @route   POST /api/task-requests/check-hierarchy
 * @desc    Check if direct assignment is allowed or request is required
 * @access  Private
 */
router.post('/check-hierarchy', authenticateToken, async (req, res) => {
  try {
    const { userId } = getActorInfo(req);
    const { assigneeId } = req.body;
    
    if (!assigneeId) {
      return res.json({
        success: true,
        canAssignDirectly: true,
        requiresRequest: false,
        reason: 'No assignee specified'
      });
    }
    
    const result = await taskRequestService.checkAssignmentHierarchy(userId, assigneeId);
    
    res.json({
      success: true,
      ...result
    });
    
  } catch (error) {
    console.error('[TaskRequests] check-hierarchy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check hierarchy'
    });
  }
});

/**
 * @route   GET /api/task-requests/check-hierarchy/:assigneeId
 * @desc    Check hierarchy for GET request (used by frontend hook)
 * @access  Private
 */
router.get('/check-hierarchy/:assigneeId', authenticateToken, async (req, res) => {
  try {
    const { userId } = getActorInfo(req);
    const { assigneeId } = req.params;
    
    if (!assigneeId) {
      return res.json({
        success: true,
        isViolation: false,
        canAssignDirectly: true,
        creatorLevel: 0,
        assigneeLevel: 0,
        creatorRoleName: 'Unknown',
        assigneeRoleName: 'Unknown'
      });
    }
    
    const result = await taskRequestService.checkAssignmentHierarchy(userId, parseInt(assigneeId));
    
    res.json({
      success: true,
      isViolation: result.requiresRequest,
      canAssignDirectly: result.canAssignDirectly,
      creatorLevel: result.creatorLevel,
      assigneeLevel: result.assigneeLevel,
      creatorRoleName: result.creatorRoleName,
      assigneeRoleName: result.assigneeRoleName
    });
    
  } catch (error) {
    console.error('[TaskRequests] GET check-hierarchy error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to check hierarchy'
    });
  }
});

/**
 * @route   GET /api/task-requests/user-role-level/:userId
 * @desc    Get role level for a specific user
 * @access  Private
 */
router.get('/user-role-level/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await taskRequestService.getUserRoleLevel(parseInt(userId));
    
    res.json({
      success: true,
      userId: parseInt(userId),
      level: result.level,
      roleName: result.roleName
    });
    
  } catch (error) {
    console.error('[TaskRequests] user-role-level error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get user role level'
    });
  }
});

// ============================================
// REQUEST CRUD
// ============================================

/**
 * @route   POST /api/task-requests
 * @desc    Create a new task request (subordinate → superior)
 * @access  Private
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const actorInfo = getActorInfo(req);
    const {
      title,
      description,
      priority,
      suggestedDueDate,
      requestedTo,
      tags
    } = req.body;
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    if (!requestedTo) {
      return res.status(400).json({
        success: false,
        error: 'Target user (requestedTo) is required'
      });
    }
    
    const result = await taskRequestService.createTaskRequest({
      title,
      description,
      priority,
      suggestedDueDate,
      requestedTo: parseInt(requestedTo),
      tags,
      tenantId: actorInfo.tenantId
    }, actorInfo);
    
    res.status(201).json(result);
    
  } catch (error) {
    console.error('[TaskRequests] create error:', error);
    
    // Handle specific errors
    if (error.message.includes('Direct assignment is allowed')) {
      return res.status(400).json({
        success: false,
        error: error.message,
        code: 'DIRECT_ASSIGNMENT_ALLOWED'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create task request'
    });
  }
});

/**
 * @route   GET /api/task-requests/inbox
 * @desc    Get requests received by current user (as superior)
 * @access  Private
 */
router.get('/inbox', authenticateToken, async (req, res) => {
  try {
    const { userId, tenantId } = getActorInfo(req);
    const { status, priority, limit, offset } = req.query;
    
    const result = await taskRequestService.getRequestsForUser(
      userId,
      'inbox',
      { status, priority, limit, offset },
      tenantId
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] inbox error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get inbox'
    });
  }
});

/**
 * @route   GET /api/task-requests/outbox
 * @desc    Get requests sent by current user (as subordinate)
 * @access  Private
 */
router.get('/outbox', authenticateToken, async (req, res) => {
  try {
    const { userId, tenantId } = getActorInfo(req);
    const { status, priority, limit, offset } = req.query;
    
    const result = await taskRequestService.getRequestsForUser(
      userId,
      'outbox',
      { status, priority, limit, offset },
      tenantId
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] outbox error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get outbox'
    });
  }
});

/**
 * @route   GET /api/task-requests/my-requests
 * @desc    Get both incoming and outgoing requests for current user
 * @access  Private
 */
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const { userId, tenantId } = getActorInfo(req);
    const { status, priority, limit, offset } = req.query;
    
    // Fetch both inbox and outbox in parallel
    const [inboxResult, outboxResult] = await Promise.all([
      taskRequestService.getRequestsForUser(
        userId,
        'inbox',
        { status, priority, limit, offset },
        tenantId
      ),
      taskRequestService.getRequestsForUser(
        userId,
        'outbox',
        { status, priority, limit, offset },
        tenantId
      )
    ]);
    
    res.json({
      success: true,
      incoming: inboxResult.success ? inboxResult.requests : [],
      outgoing: outboxResult.success ? outboxResult.requests : [],
      incomingCount: inboxResult.success ? inboxResult.total : 0,
      outgoingCount: outboxResult.success ? outboxResult.total : 0
    });
    
  } catch (error) {
    console.error('[TaskRequests] my-requests error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get requests'
    });
  }
});

/**
 * @route   GET /api/task-requests/counts
 * @desc    Get request counts for dashboard badges
 * @access  Private
 */
router.get('/counts', authenticateToken, async (req, res) => {
  try {
    const { userId, tenantId } = getActorInfo(req);
    
    const counts = await taskRequestService.getRequestCounts(userId, tenantId);
    
    res.json({
      success: true,
      counts
    });
    
  } catch (error) {
    console.error('[TaskRequests] counts error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get counts'
    });
  }
});

/**
 * @route   GET /api/task-requests/:id
 * @desc    Get single request by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = getActorInfo(req);
    
    const result = await taskRequestService.getRequestById(
      parseInt(id),
      userId,
      tenantId
    );
    
    if (!result.success) {
      return res.status(404).json(result);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] get by id error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get request'
    });
  }
});

/**
 * @route   GET /api/task-requests/:id/messages
 * @desc    Get messages for a request
 * @access  Private
 */
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = getActorInfo(req);
    
    const result = await taskRequestService.getRequestMessages(
      parseInt(id),
      userId,
      tenantId
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] get messages error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get messages'
    });
  }
});

/**
 * @route   GET /api/task-requests/:id/history
 * @desc    Get audit history for a request
 * @access  Private
 */
router.get('/:id/history', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, tenantId } = getActorInfo(req);
    
    const result = await taskRequestService.getRequestHistory(
      parseInt(id),
      userId,
      tenantId
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] get history error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get history'
    });
  }
});

// ============================================
// SUPERIOR ACTIONS
// ============================================

/**
 * @route   POST /api/task-requests/:id/accept
 * @desc    Accept request and convert to task
 * @access  Private (Target superior only)
 */
router.post('/:id/accept', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { reason } = req.body;
    
    const result = await taskRequestService.acceptRequest(
      parseInt(id),
      actorInfo,
      { reason }
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] accept error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to accept request'
    });
  }
});

/**
 * @route   POST /api/task-requests/:id/delegate
 * @desc    Delegate request to a subordinate
 * @access  Private (Target superior only)
 */
router.post('/:id/delegate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { delegateToId, reason } = req.body;
    
    if (!delegateToId) {
      return res.status(400).json({
        success: false,
        error: 'Delegate target (delegateToId) is required'
      });
    }
    
    const result = await taskRequestService.delegateRequest(
      parseInt(id),
      parseInt(delegateToId),
      actorInfo,
      { reason }
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] delegate error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to delegate request'
    });
  }
});

/**
 * @route   POST /api/task-requests/:id/reject
 * @desc    Reject request (reason required)
 * @access  Private (Target superior only)
 */
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { reason } = req.body;
    
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    const result = await taskRequestService.rejectRequest(
      parseInt(id),
      actorInfo,
      reason
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] reject error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to reject request'
    });
  }
});

/**
 * @route   POST /api/task-requests/:id/defer
 * @desc    Defer request for later review
 * @access  Private (Target superior only)
 */
router.post('/:id/defer', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { deferredUntil, reason } = req.body;
    
    const result = await taskRequestService.deferRequest(
      parseInt(id),
      actorInfo,
      deferredUntil ? new Date(deferredUntil) : null,
      reason
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] defer error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to defer request'
    });
  }
});

/**
 * @route   POST /api/task-requests/:id/ask-clarification
 * @desc    Ask requester for clarification
 * @access  Private (Target superior only)
 */
router.post('/:id/ask-clarification', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { question } = req.body;
    
    if (!question || question.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clarification question is required'
      });
    }
    
    const result = await taskRequestService.askClarification(
      parseInt(id),
      actorInfo,
      question
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] ask-clarification error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to request clarification'
    });
  }
});

// ============================================
// REQUESTER ACTIONS
// ============================================

/**
 * @route   POST /api/task-requests/:id/provide-clarification
 * @desc    Provide clarification response
 * @access  Private (Original requester only)
 */
router.post('/:id/provide-clarification', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { response } = req.body;
    
    if (!response || response.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Clarification response is required'
      });
    }
    
    const result = await taskRequestService.provideClarification(
      parseInt(id),
      actorInfo,
      response
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] provide-clarification error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to provide clarification'
    });
  }
});

/**
 * @route   POST /api/task-requests/:id/cancel
 * @desc    Cancel request
 * @access  Private (Original requester only)
 */
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const actorInfo = getActorInfo(req);
    const { reason } = req.body;
    
    const result = await taskRequestService.cancelRequest(
      parseInt(id),
      actorInfo,
      reason
    );
    
    res.json(result);
    
  } catch (error) {
    console.error('[TaskRequests] cancel error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel request'
    });
  }
});

module.exports = router;
