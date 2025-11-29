// Task Workflow API Routes
// Handles CRUD operations, transitions, history, and realtime updates

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const {
  TASK_STATUSES,
  processTransition,
  canPerformAction,
  getAvailableActions,
  getStatusColor
} = require('../services/taskStateMachine');

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
 */
router.post('/', authenticateUser, async (req, res) => {
  try {
    const { title, description, priority, due_date, tags } = req.body;
    const { id: userId, userType, name } = req.user;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
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
router.post('/:id/transition', authenticateUser, async (req, res) => {
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
 * GET /api/tasks/stats
 * Get task statistics
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
 * DELETE /api/tasks/:id
 * Delete task (only creator in draft status)
 */
router.delete('/:id', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, userType } = req.user;

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
