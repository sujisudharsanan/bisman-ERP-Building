/**
 * Intelligent Chat Engine API Routes (JavaScript version)
 * 
 * This is the main routing file for the intelligent chat engine.
 * All intelligence comes from pattern matching, fuzzy logic, and NLP - NO external AI APIs.
 * 
 * Features:
 * - Intent detection via pattern matching
 * - Fuzzy text correction for typos
 * - Entity extraction (dates, amounts, priorities)
 * - Multi-turn clarifying questions
 * - Task creation and management
 * - Role-based access control (RBAC)
 * 
 * Endpoints:
 * - POST /api/chat/message - Main chat endpoint
 * - GET /api/chat/tasks/pending - Get pending tasks
 * - GET /api/chat/tasks/stats - Get task statistics
 * - GET /api/chat/tasks/:id - Get specific task
 * - PATCH /api/chat/tasks/:id - Update task status
 * - DELETE /api/chat/tasks/:id - Delete task
 * - GET /api/chat/intents - Get all available intents
 * - GET /api/chat/context - Get current conversation context
 * - DELETE /api/chat/context - Clear conversation context
 * - POST /api/chat/feedback - Provide feedback on responses
 * - GET /api/chat/health - Health check endpoint
 * - GET /api/chat/stats - Get chat engine statistics
 */

const express = require('express');
const router = express.Router();
const ChatService = require('../services/chat/chatService');
const TaskService = require('../services/chat/taskService');

// Import authentication middleware (assumes it exists in your project)
let authenticate, requireRole;
try {
  const auth = require('../middleware/auth');
  authenticate = auth.authenticate;
  requireRole = auth.requireRole;
} catch (e) {
  console.warn('[chatRoutes] Auth middleware not found, routes will be unprotected');
  // Fallback - no-op middleware if auth doesn't exist
  authenticate = (req, res, next) => next();
  requireRole = () => (req, res, next) => next();
}

// Initialize services
const chatService = new ChatService();
const taskService = new TaskService();

// Middleware to extract user info from request
const extractUserInfo = (req, res, next) => {
  // Try to get user info from authenticated request
  req.chatUser = {
    userId: req.user?.id || req.user?.userId || 'anonymous',
    username: req.user?.username || req.user?.name || 'Guest',
    role: req.user?.role || 'viewer',
    organizationId: req.user?.organizationId || req.user?.tenant_id || 'default'
  };
  next();
};

// ============================================================================
// MAIN CHAT ENDPOINT
// ============================================================================

/**
 * POST /api/chat/message
 * Main chat endpoint - processes user messages and returns intelligent responses
 * 
 * Body:
 * {
 *   "message": "create task for inventory check tomorrow",
 *   "context": { ... } // optional previous context
 * }
 * 
 * Response:
 * {
 *   "response": "I'll create an inventory check task for tomorrow...",
 *   "intent": "create_task",
 *   "confidence": 0.95,
 *   "entities": { date: "2024-01-15", ... },
 *   "suggestedActions": [...],
 *   "context": { ... }
 * }
 */
router.post('/message', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { message, context } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Message is required and must be a string',
        code: 'INVALID_INPUT'
      });
    }

    const { userId, username, role, organizationId } = req.chatUser;

    // Process message through chat service
    const result = await chatService.handleMessage(
      message,
      userId,
      organizationId,
      context || {},
      username,
      role
    );

    return res.json(result);

  } catch (error) {
    console.error('[chatRoutes] Error processing message:', error);
    return res.status(500).json({
      error: 'Failed to process message',
      code: 'PROCESSING_ERROR',
      details: process.env.NODE_ENV !== 'production' ? error.message : undefined
    });
  }
});

// ============================================================================
// TASK MANAGEMENT ENDPOINTS
// ============================================================================

/**
 * GET /api/chat/tasks/pending
 * Get all pending tasks for the authenticated user
 */
router.get('/tasks/pending', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { userId } = req.chatUser;
    const tasks = await taskService.getPendingTasks(userId);

    return res.json({
      success: true,
      tasks,
      count: tasks.length
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching pending tasks:', error);
    return res.status(500).json({
      error: 'Failed to fetch pending tasks',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/chat/tasks/stats
 * Get task statistics for the authenticated user
 */
router.get('/tasks/stats', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { userId } = req.chatUser;
    const stats = await taskService.getTaskStats(userId);

    return res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching task stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch task statistics',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/chat/tasks/:id
 * Get a specific task by ID
 */
router.get('/tasks/:id', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.chatUser;

    const task = await taskService.getTaskById(id, userId);

    if (!task) {
      return res.status(404).json({
        error: 'Task not found',
        code: 'NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      task
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching task:', error);
    return res.status(500).json({
      error: 'Failed to fetch task',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * PATCH /api/chat/tasks/:id
 * Update a task's status or other properties
 * 
 * Body: { status: 'completed', priority: 'high', ... }
 */
router.patch('/tasks/:id', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.chatUser;
    const updates = req.body;

    const updatedTask = await taskService.updateTask(id, userId, updates);

    if (!updatedTask) {
      return res.status(404).json({
        error: 'Task not found or unauthorized',
        code: 'NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      task: updatedTask,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('[chatRoutes] Error updating task:', error);
    return res.status(500).json({
      error: 'Failed to update task',
      code: 'UPDATE_ERROR'
    });
  }
});

/**
 * DELETE /api/chat/tasks/:id
 * Delete a task
 */
router.delete('/tasks/:id', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.chatUser;

    const deleted = await taskService.deleteTask(id, userId);

    if (!deleted) {
      return res.status(404).json({
        error: 'Task not found or unauthorized',
        code: 'NOT_FOUND'
      });
    }

    return res.json({
      success: true,
      message: 'Task deleted successfully'
    });

  } catch (error) {
    console.error('[chatRoutes] Error deleting task:', error);
    return res.status(500).json({
      error: 'Failed to delete task',
      code: 'DELETE_ERROR'
    });
  }
});

// ============================================================================
// INTENT & CONTEXT ENDPOINTS
// ============================================================================

/**
 * GET /api/chat/intents
 * Get all available intents and their permissions based on user role
 */
router.get('/intents', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { role } = req.chatUser;
    const intents = chatService.getAvailableIntents(role);

    return res.json({
      success: true,
      intents,
      role,
      count: intents.length
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching intents:', error);
    return res.status(500).json({
      error: 'Failed to fetch intents',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * GET /api/chat/context
 * Get current conversation context for the user
 */
router.get('/context', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { userId } = req.chatUser;
    const context = chatService.getContext(userId);

    return res.json({
      success: true,
      context
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching context:', error);
    return res.status(500).json({
      error: 'Failed to fetch context',
      code: 'FETCH_ERROR'
    });
  }
});

/**
 * DELETE /api/chat/context
 * Clear conversation context (start fresh conversation)
 */
router.delete('/context', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { userId } = req.chatUser;
    chatService.clearContext(userId);

    return res.json({
      success: true,
      message: 'Conversation context cleared'
    });

  } catch (error) {
    console.error('[chatRoutes] Error clearing context:', error);
    return res.status(500).json({
      error: 'Failed to clear context',
      code: 'CLEAR_ERROR'
    });
  }
});

// ============================================================================
// FEEDBACK & ANALYTICS ENDPOINTS
// ============================================================================

/**
 * POST /api/chat/feedback
 * Provide feedback on chat responses for improvement
 * 
 * Body:
 * {
 *   "messageId": "msg_123",
 *   "rating": 5,
 *   "feedback": "Very helpful!",
 *   "intent": "create_task"
 * }
 */
router.post('/feedback', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { messageId, rating, feedback, intent } = req.body;
    const { userId, username } = req.chatUser;

    // Store feedback (you can implement this in a separate service/database)
    const feedbackRecord = {
      messageId,
      userId,
      username,
      rating,
      feedback,
      intent,
      timestamp: new Date().toISOString()
    };

    // TODO: Store in database
    console.log('[chatRoutes] Feedback received:', feedbackRecord);

    return res.json({
      success: true,
      message: 'Feedback recorded successfully'
    });

  } catch (error) {
    console.error('[chatRoutes] Error recording feedback:', error);
    return res.status(500).json({
      error: 'Failed to record feedback',
      code: 'FEEDBACK_ERROR'
    });
  }
});

/**
 * GET /api/chat/stats
 * Get chat engine statistics (admin only)
 */
router.get('/stats', authenticate, extractUserInfo, async (req, res) => {
  try {
    const { role } = req.chatUser;

    // Only allow admins to view stats
    if (!['super-admin', 'admin', 'ENTERPRISE_ADMIN'].includes(role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN'
      });
    }

    const stats = chatService.getStats();

    return res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('[chatRoutes] Error fetching stats:', error);
    return res.status(500).json({
      error: 'Failed to fetch statistics',
      code: 'FETCH_ERROR'
    });
  }
});

// ============================================================================
// HEALTH CHECK ENDPOINT
// ============================================================================

/**
 * GET /api/chat/health
 * Health check endpoint for monitoring
 */
router.get('/health', (req, res) => {
  try {
    return res.json({
      status: 'ok',
      service: 'Intelligent Chat Engine',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      features: {
        intentDetection: true,
        fuzzyMatching: true,
        entityExtraction: true,
        taskManagement: true,
        rbac: true,
        multiTurn: true
      }
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

module.exports = router;
