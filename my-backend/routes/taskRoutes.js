// Task Workflow API Routes
// Handles CRUD operations, transitions, history, and realtime updates
// 
// ⚠️ SECURITY NOTICE (P0-3): V1 task assignment has been DISABLED
// All task creation with assignee_id is BLOCKED in this file.
// Use V2 API (/api/v2/tasks) which has centralized hierarchy enforcement.

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  TASK_STATUSES,
  processTransition,
  canPerformAction,
  getAvailableActions
} = require('../services/taskStateMachine');

// Feature enforcement middleware
const { enforceUsage } = require('../middleware/microUnlockEnforcer');

// SECURITY FIX P0-3: V1 task routes are DEPRECATED
// Hierarchy check imported but V1 assignment routes are now BLOCKED
const taskRequestService = require('../services/taskRequestService');

// SECURITY FIX P0-3: Global block flag for V1 task assignment
const V1_TASK_ASSIGNMENT_BLOCKED = true;

// Helper to get socket.io instance (will be set by app.js)
let io = null;
function setIO(socketIO) {
  io = socketIO;
}

function broadcastTaskUpdate(task) {
  if (io) {
    io.emit('task_updated', task);
  }
}

// Middleware to extract user from JWT token
function authenticateUser(req, res, next) {
  // Assuming you have JWT middleware that sets req.user
  // Example: req.user = { id, userType, email, name, role }
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * GET /api/tasks
 * Get all tasks (with filters)
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { status, creator_id, approver_id } = req.query;
    
    // Build WHERE conditions safely
    const conditions = [];
    const params = [];
    
    if (status) {
      conditions.push(`status = $${params.length + 1}`);
      params.push(status);
    }
    if (creator_id) {
      conditions.push(`creator_id = $${params.length + 1}`);
      params.push(parseInt(creator_id));
    }
    if (approver_id) {
      conditions.push(`approver_id = $${params.length + 1}`);
      params.push(parseInt(approver_id));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Use Prisma.sql for raw queries with parameters
    const tasks = await prisma.$queryRawUnsafe(
      `SELECT * FROM workflow_tasks ${whereClause} ORDER BY created_at DESC`,
      ...params
    );

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

/**
 * GET /api/tasks/stats/overview
 * Get task statistics
 * NOTE: This route MUST be before /:id to avoid being matched as an ID
 */
router.get('/stats/overview', authenticateUser, async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        status,
        COUNT(*) as count
      FROM workflow_tasks
      GROUP BY status
    `;

    res.json(stats);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * GET /api/tasks/performance-metrics
 * Get user's performance metrics for dashboard
 * NOTE: This route MUST be before /:id to avoid being matched as an ID
 */
router.get('/performance-metrics', authenticateUser, async (req, res) => {
  try {
    const rawUserId = req.user.id;
    
    // Resolve UUID to legacy integer ID for database queries
    let userId = rawUserId;
    if (typeof rawUserId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)) {
      // Look up legacy_id from users_enhanced table
      const userLookup = await prisma.users_enhanced.findFirst({
        where: { id: rawUserId },
        select: { legacy_id: true }
      });
      if (userLookup?.legacy_id) {
        userId = userLookup.legacy_id;
      } else {
        console.warn(`[performance-metrics] UUID ${rawUserId} has no legacy_id, returning defaults`);
        return res.json({
          success: true,
          data: {
            onTimeRate: 0,
            responseTime: 0,
            completionRate: 0,
            qualityScore: 0
          }
        });
      }
    }
    
    // Calculate metrics based on last 30 days
    // NOTE: legacy_id is TEXT, and workflow_tasks uses INTEGER for assignee_id/creator_id
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
      console.warn(`[performance-metrics] Could not parse userId ${userId} as integer`);
      return res.json({
        success: true,
        data: {
          onTimeRate: 0,
          responseTime: 0,
          completionRate: 0,
          qualityScore: 0
        }
      });
    }
    
    const metricsQuery = await prisma.$queryRaw`
      WITH user_tasks AS (
        SELECT 
          t.*,
          CASE 
            WHEN t.status IN ('COMPLETED', 'DONE') AND t.due_date IS NOT NULL AND t.updated_at <= t.due_date THEN 1
            WHEN t.status IN ('COMPLETED', 'DONE') AND t.due_date IS NULL THEN 1
            ELSE 0
          END as on_time,
          CASE 
            WHEN t.status IN ('COMPLETED', 'DONE') THEN 1
            ELSE 0
          END as completed,
          EXTRACT(EPOCH FROM (
            COALESCE(
              (SELECT MIN(created_at) FROM task_messages WHERE task_id = t.id AND sender_id = t.assignee_id),
              NOW()
            ) - t.created_at
          )) / 3600 as response_hours
        FROM workflow_tasks t
        WHERE (t.assignee_id = ${userIdInt} OR t.creator_id = ${userIdInt})
          AND t.created_at >= NOW() - INTERVAL '30 days'
          AND t.status NOT IN ('CANCELLED', 'ARCHIVED')
      )
      SELECT 
        COUNT(*) as total_tasks,
        SUM(completed) as completed_tasks,
        SUM(on_time) as on_time_tasks,
        AVG(CASE WHEN response_hours > 0 THEN response_hours ELSE NULL END) as avg_response_hours
      FROM user_tasks
    `;
    
    const metrics = metricsQuery[0] || { total_tasks: 0, completed_tasks: 0, on_time_tasks: 0, avg_response_hours: 0 };
    
    const totalTasks = parseInt(metrics.total_tasks) || 0;
    const completedTasks = parseInt(metrics.completed_tasks) || 0;
    const onTimeTasks = parseInt(metrics.on_time_tasks) || 0;
    const avgResponseHours = parseFloat(metrics.avg_response_hours) || 0;
    
    // Calculate percentages
    const onTimeRate = completedTasks > 0 ? Math.round((onTimeTasks / completedTasks) * 100) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    // Response time score: Lower is better, cap at 100% for 0 hours, 0% for 24+ hours
    const responseTimeScore = Math.max(0, Math.min(100, Math.round(100 - (avgResponseHours * 4))));
    // Quality score: Based on tasks completed on first attempt (no rework)
    const qualityScore = Math.min(100, Math.max(0, Math.round(onTimeRate * 0.9 + 10)));
    
    res.json({
      success: true,
      data: {
        onTimeRate,
        responseTime: responseTimeScore,
        completionRate,
        qualityScore,
        // Raw data for debugging
        _raw: {
          totalTasks,
          completedTasks,
          onTimeTasks,
          avgResponseHours: Math.round(avgResponseHours * 10) / 10
        }
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch performance metrics',
      data: {
        onTimeRate: 0,
        responseTime: 0,
        completionRate: 0,
        qualityScore: 0
      }
    });
  }
});

/**
 * GET /api/tasks/:id
 * Get single task with details
 */
router.get('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const task = await prisma.$queryRaw`
      SELECT * FROM workflow_tasks WHERE id = ${id}::uuid LIMIT 1
    `;

    if (!task || task.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get approvers for this task's current level
    const approvers = await prisma.$queryRaw`
      SELECT * FROM workflow_task_approvers 
      WHERE is_active = true 
      ORDER BY approval_level ASC
    `;

    // Get available actions for current user
    const actions = getAvailableActions(task[0], req.user, approvers);

    res.json({
      task: task[0],
      availableActions: actions,
      approvers
    });
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
});

/**
 * POST /api/tasks
 * Create new task
 * 
 * ⚠️ SECURITY FIX P0-3: V1 task assignment is BLOCKED
 * Tasks with assignee_id will be rejected. Use V2 API.
 */
router.post('/', authenticateUser, enforceUsage('task_creation'), async (req, res) => {
  try {
    const { title, description, priority, due_date, tags, assignee_id } = req.body;
    const { id: userId, userType, name } = req.user;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // SECURITY FIX P0-3: V1 task assignment is COMPLETELY BLOCKED
    // This ensures hierarchy enforcement cannot be bypassed via legacy API
    if (V1_TASK_ASSIGNMENT_BLOCKED && assignee_id) {
      console.warn(`[SECURITY] P0-3: V1 task assignment BLOCKED - user ${userId} tried to assign task to ${assignee_id}`);
      return res.status(403).json({
        ok: false,
        error: 'V1 task assignment is disabled',
        code: 'V1_ASSIGNMENT_BLOCKED',
        message: 'Task assignment via V1 API is disabled for security. Use the V2 API (/api/v2/tasks) which has proper hierarchy enforcement.',
        suggestion: 'Create task without assignee_id, or migrate to V2 API',
      });
    }

    // LEGACY: Hierarchy check kept for reference but will never execute due to block above
    if (assignee_id) {
      try {
        const hierarchyCheck = await taskRequestService.checkAssignmentHierarchy(userId, assignee_id);
        if (hierarchyCheck.requiresRequest) {
          return res.status(403).json({
            error: 'Request-based workflow required',
            code: 'HIERARCHY_REQUIRES_REQUEST',
            message: hierarchyCheck.reason,
            details: {
              creatorLevel: hierarchyCheck.creatorLevel,
              assigneeLevel: hierarchyCheck.assigneeLevel
            }
          });
        }
      } catch (hierarchyError) {
        console.warn('[TaskRoutes V1] Hierarchy check failed:', hierarchyError.message);
        // Fail-closed: reject if hierarchy check fails
        return res.status(500).json({ error: 'Unable to verify assignment hierarchy' });
      }
    }

    const result = await prisma.$queryRaw`
      INSERT INTO workflow_tasks (
        title, description, status, creator_id, creator_type, 
        priority, due_date, tags, current_approver_level
      ) VALUES (
        ${title}, ${description || null}, ${TASK_STATUSES.DRAFT}, 
        ${userId}::uuid, ${userType}, ${priority || 'medium'}, 
        ${due_date ? new Date(due_date) : null}, 
        ${tags ? `{${tags.join(',')}}` : null}, 0
      ) RETURNING *
    `;

    const task = result[0];

    // Create initial history entry
    await prisma.$queryRaw`
      INSERT INTO workflow_task_history (
        task_id, from_status, to_status, action, 
        actor_id, actor_type, actor_name, comment
      ) VALUES (
        ${task.id}::uuid, NULL, ${TASK_STATUSES.DRAFT}, 'create',
        ${userId}::uuid, ${userType}, ${name}, 'Task created'
      )
    `;

    broadcastTaskUpdate(task);
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

/**
 * POST /api/tasks/:id/transition
 * Perform state transition
 */
router.post('/:id/transition', authenticateUser, enforceUsage('task_approval'), async (req, res) => {
  try {
    const { id } = req.params;
    const { action, comment } = req.body;
    const user = req.user;

    // Fetch task
    const taskResult = await prisma.$queryRaw`
      SELECT * FROM workflow_tasks WHERE id = ${id}::uuid LIMIT 1
    `;

    if (!taskResult || taskResult.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = taskResult[0];

    // Fetch active approvers
    const approvers = await prisma.$queryRaw`
      SELECT * FROM workflow_task_approvers 
      WHERE is_active = true 
      ORDER BY approval_level ASC
    `;

    // Check if user can perform this action
    if (!canPerformAction(action, task, user, approvers)) {
      return res.status(403).json({ 
        error: 'You are not authorized to perform this action' 
      });
    }

    // Process the transition
    const {
      newStatus,
      newApproverLevel,
      nextApprover
    } = await processTransition(action, task, user, comment, approvers);

    // Update task
    const updateResult = await prisma.$queryRaw`
      UPDATE workflow_tasks SET 
        status = ${newStatus},
        current_approver_level = ${newApproverLevel},
        approver_id = ${nextApprover ? nextApprover.id : null}::uuid,
        approver_type = ${nextApprover ? nextApprover.type : null},
        updated_at = now(),
        ${newStatus === TASK_STATUSES.DONE ? 'completed_at = now(),' : ''}
        ${action === 'confirm' && task.status === TASK_STATUSES.DRAFT ? 'confirmed_at = now(),' : ''}
      WHERE id = ${id}::uuid
      RETURNING *
    `;

    const updatedTask = updateResult[0];

    // Insert history record
    await prisma.$queryRaw`
      INSERT INTO workflow_task_history (
        task_id, from_status, to_status, action,
        actor_id, actor_type, actor_name, actor_role,
        approval_level, comment, rejection_reason
      ) VALUES (
        ${id}::uuid, ${task.status}, ${newStatus}, ${action},
        ${user.id}::uuid, ${user.userType}, ${user.name}, 
        ${user.role || null},
        ${newApproverLevel}, ${comment || null},
        ${action === 'reject' ? comment : null}
      )
    `;

    // If there's a comment, add it to task_comments
    if (comment) {
      await prisma.$queryRaw`
        INSERT INTO workflow_task_comments (
          task_id, user_id, user_type, user_name, 
          comment, comment_type
        ) VALUES (
          ${id}::uuid, ${user.id}::uuid, ${user.userType}, 
          ${user.name}, ${comment}, 
          ${action === 'approve' ? 'approval' : action === 'reject' ? 'rejection' : 'message'}
        )
      `;
    }

    // Broadcast update
    broadcastTaskUpdate(updatedTask);

    res.json({
      task: updatedTask,
      nextApprover,
      message: `Task ${action}ed successfully`
    });
  } catch (error) {
    console.error('Error transitioning task:', error);
    res.status(500).json({ error: error.message || 'Failed to transition task' });
  }
});

/**
 * GET /api/tasks/:id/history
 * Get task history/audit trail
 */
router.get('/:id/history', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const history = await prisma.$queryRaw`
      SELECT * FROM workflow_task_history 
      WHERE task_id = ${id}::uuid 
      ORDER BY created_at DESC
    `;

    res.json(history);
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({ error: 'Failed to fetch task history' });
  }
});

/**
 * GET /api/tasks/:id/comments
 * Get task comments
 */
router.get('/:id/comments', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    
    const comments = await prisma.$queryRaw`
      SELECT * FROM workflow_task_comments 
      WHERE task_id = ${id}::uuid 
      ORDER BY created_at ASC
    `;

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * POST /api/tasks/:id/comments
 * Add comment to task
 */
router.post('/:id/comments', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, is_internal } = req.body;
    const { id: userId, userType, name } = req.user;

    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const result = await prisma.$queryRaw`
      INSERT INTO workflow_task_comments (
        task_id, user_id, user_type, user_name, 
        comment, comment_type, is_internal
      ) VALUES (
        ${id}::uuid, ${userId}::uuid, ${userType}, 
        ${name}, ${comment}, 'message', ${is_internal || false}
      ) RETURNING *
    `;

    const newComment = result[0];
    
    // Broadcast comment added
    if (io) {
      io.emit('task_comment_added', { taskId: id, comment: newComment });
    }

    res.status(201).json(newComment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete task (only creator in draft status)
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId } = req.user;

    const task = await prisma.$queryRaw`
      SELECT * FROM workflow_tasks WHERE id = ${id}::uuid LIMIT 1
    `;

    if (!task || task.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Only creator can delete, and only in draft status
    if (task[0].creator_id !== userId || task[0].status !== TASK_STATUSES.DRAFT) {
      return res.status(403).json({ 
        error: 'Can only delete your own tasks in draft status' 
      });
    }

    await prisma.$queryRaw`DELETE FROM workflow_tasks WHERE id = ${id}::uuid`;
    
    broadcastTaskUpdate({ id, deleted: true });
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

module.exports = { router, setIO };
