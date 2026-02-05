/**
 * Task Workbench API Routes
 * 
 * Provides endpoints for the Task Workbench UI:
 * - GET /api/tasks/workbench - List tasks by tab (DRAFT, IN_PROGRESS, NEED_ATTENTION, DONE)
 * - GET /api/tasks/workbench/counts - Get counts for each tab
 * - GET /api/tasks/:id/quick-view - Get task details with messages for quick view panel
 * - POST /api/tasks/:id/messages - Add a message to a task
 */

const express = require('express');
const router = express.Router();
const { getPool } = require('../middleware/database');

// Helper to get DB pool
const getDbPool = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

// Middleware to check authentication (re-use from existing routes)
function authenticateUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
}

/**
 * Tab status mappings
 */
const TAB_STATUS_MAPPING = {
  DRAFT: ['DRAFT'],
  IN_PROGRESS: ['OPEN', 'IN_PROGRESS', 'IN_REVIEW'],
  NEED_ATTENTION: ['BLOCKED'], // Plus overdue tasks handled specially
  DONE: ['COMPLETED'],
};

/**
 * GET /api/tasks/workbench
 * Get tasks for a specific workbench tab
 */
router.get('/', authenticateUser, async (req, res) => {
  try {
    const { tab = 'IN_PROGRESS', page = 1, limit = 20 } = req.query;
    const userId = req.user.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query;
    let countQuery;
    const params = [];
    const countParams = [];
    let paramIndex = 1;

    if (tab === 'NEED_ATTENTION') {
      // Special handling: blocked OR overdue (any status except DONE)
      query = `
        SELECT 
          t.*,
          c.id as creator_uuid, c.username as creator_name, c.first_name as creator_first_name, c.last_name as creator_last_name,
          a.id as assignee_uuid, a.username as assignee_name, a.first_name as assignee_first_name, a.last_name as assignee_last_name,
          (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
          (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
        FROM workflow_tasks t
        LEFT JOIN users_enhanced c ON t.creator_id = c.id::text
        LEFT JOIN users_enhanced a ON t.assignee_id = a.id::text
        WHERE (
          t.status = 'BLOCKED'
          OR (t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED'))
        )
        AND (t.creator_id = $${paramIndex}::text OR t.assignee_id = $${paramIndex}::text OR t.approver_id = $${paramIndex}::text)
        ORDER BY t.updated_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;
      params.push(userId, parseInt(limit), offset);

      countQuery = `
        SELECT COUNT(*) FROM workflow_tasks t
        WHERE (
          t.status = 'BLOCKED'
          OR (t.due_date IS NOT NULL AND t.due_date < NOW() AND t.status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED'))
        )
        AND (t.creator_id = $1::text OR t.assignee_id = $1::text OR t.approver_id = $1::text)
      `;
      countParams.push(userId);
    } else {
      // Standard tab filtering by status
      const statuses = TAB_STATUS_MAPPING[tab] || TAB_STATUS_MAPPING.IN_PROGRESS;
      const statusPlaceholders = statuses.map((_, i) => `$${i + 1}`).join(', ');
      paramIndex = statuses.length + 1;

      query = `
        SELECT 
          t.*,
          c.id as creator_uuid, c.username as creator_name, c.first_name as creator_first_name, c.last_name as creator_last_name,
          a.id as assignee_uuid, a.username as assignee_name, a.first_name as assignee_first_name, a.last_name as assignee_last_name,
          (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
          (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
        FROM workflow_tasks t
        LEFT JOIN users_enhanced c ON t.creator_id = c.id::text
        LEFT JOIN users_enhanced a ON t.assignee_id = a.id::text
        WHERE t.status IN (${statusPlaceholders})
        AND (t.creator_id = $${paramIndex}::text OR t.assignee_id = $${paramIndex}::text OR t.approver_id = $${paramIndex}::text)
        ORDER BY t.updated_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;
      params.push(...statuses, userId, parseInt(limit), offset);

      countQuery = `
        SELECT COUNT(*) FROM workflow_tasks t
        WHERE t.status IN (${statusPlaceholders})
        AND (t.creator_id = $${statuses.length + 1}::text OR t.assignee_id = $${statuses.length + 1}::text OR t.approver_id = $${statuses.length + 1}::text)
      `;
      countParams.push(...statuses, userId);
    }

    const pool = getDbPool();
    const [tasksResult, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams),
    ]);

    const tasks = tasksResult.rows.map(transformTaskRow);
    const total = parseInt(countResult.rows[0]?.count || 0);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching workbench tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message,
    });
  }
});

/**
 * GET /api/tasks/workbench/counts
 * Get task counts for each tab
 */
router.get('/counts', authenticateUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const pool = getDbPool();

    // Get counts for each tab in parallel
    const [draftResult, inProgressResult, needAttentionResult, doneResult] = await Promise.all([
      // DRAFT count
      pool.query(
        `SELECT COUNT(*) FROM workflow_tasks 
         WHERE status = 'DRAFT' 
         AND (creator_id = $1::text OR assignee_id = $1::text OR approver_id = $1::text)`,
        [userId]
      ),
      
      // IN_PROGRESS count (OPEN, IN_PROGRESS, IN_REVIEW)
      pool.query(
        `SELECT COUNT(*) FROM workflow_tasks 
         WHERE status IN ('OPEN', 'IN_PROGRESS', 'IN_REVIEW') 
         AND (creator_id = $1::text OR assignee_id = $1::text OR approver_id = $1::text)`,
        [userId]
      ),
      
      // NEED_ATTENTION count (BLOCKED or overdue)
      pool.query(
        `SELECT COUNT(*) FROM workflow_tasks 
         WHERE (
           status = 'BLOCKED'
           OR (due_date IS NOT NULL AND due_date < NOW() AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED'))
         )
         AND (creator_id = $1::text OR assignee_id = $1::text OR approver_id = $1::text)`,
        [userId]
      ),
      
      // DONE count
      pool.query(
        `SELECT COUNT(*) FROM workflow_tasks 
         WHERE status = 'COMPLETED' 
         AND (creator_id = $1::text OR assignee_id = $1::text OR approver_id = $1::text)`,
        [userId]
      ),
    ]);

    res.json({
      success: true,
      counts: {
        DRAFT: parseInt(draftResult.rows[0]?.count || 0),
        IN_PROGRESS: parseInt(inProgressResult.rows[0]?.count || 0),
        NEED_ATTENTION: parseInt(needAttentionResult.rows[0]?.count || 0),
        DONE: parseInt(doneResult.rows[0]?.count || 0),
      },
    });
  } catch (error) {
    console.error('Error fetching workbench counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch counts',
    });
  }
});

/**
 * GET /api/tasks/:id/quick-view
 * Get task details with messages for quick view panel
 */
router.get('/:id/quick-view', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const pool = getDbPool();

    // Fetch task with user details - use users_enhanced and TEXT comparison for UUIDs
    const taskQuery = `
      SELECT 
        t.*,
        c.id as creator_uuid, c.username as creator_name, c.first_name as creator_first_name, c.last_name as creator_last_name, c.email as creator_email,
        a.id as assignee_uuid, a.username as assignee_name, a.first_name as assignee_first_name, a.last_name as assignee_last_name, a.email as assignee_email,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users_enhanced c ON t.creator_id = c.id::text
      LEFT JOIN users_enhanced a ON t.assignee_id = a.id::text
      WHERE t.id = $1
    `;

    // Fetch messages - use users_enhanced for sender
    const messagesQuery = `
      SELECT 
        m.id,
        m.task_id,
        m.sender_id,
        m.message_text as content,
        m.message_type,
        m.is_system_message,
        m.created_at,
        s.username as sender_name,
        s.first_name as sender_first_name,
        s.last_name as sender_last_name
      FROM task_messages m
      LEFT JOIN users_enhanced s ON m.sender_id = s.id::text
      WHERE m.task_id = $1
      ORDER BY m.created_at ASC
      LIMIT 100
    `;

    const [taskResult, messagesResult] = await Promise.all([
      pool.query(taskQuery, [id]),
      pool.query(messagesQuery, [id]),
    ]);

    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }

    const task = transformTaskRow(taskResult.rows[0]);
    const messages = messagesResult.rows.map(row => ({
      id: row.id,
      senderId: row.sender_id,
      senderName: row.sender_first_name && row.sender_last_name 
        ? `${row.sender_first_name} ${row.sender_last_name}`
        : row.sender_name || 'System',
      senderType: row.is_system_message ? 'system' : 'user',
      content: row.content,
      createdAt: row.created_at,
    }));

    res.json({
      success: true,
      task,
      messages,
    });
  } catch (error) {
    console.error('Error fetching task quick view:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      details: error.message,
    });
  }
});

/**
 * POST /api/tasks/:id/messages
 * Add a message to a task
 */
router.post('/:id/messages', authenticateUser, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const { id: userId, username, firstName, lastName } = req.user;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    const pool = getDbPool();

    // Insert message
    const insertQuery = `
      INSERT INTO task_messages (task_id, sender_id, message_text, message_type, is_system_message)
      VALUES ($1, $2, $3, 'TEXT', false)
      RETURNING *
    `;

    const result = await pool.query(insertQuery, [id, userId, message.trim()]);
    const newMessage = result.rows[0];

    // Emit socket event if available
    const io = req.app.get('io') || global.io;
    if (io) {
      io.emit('task_message_added', {
        taskId: id,
        message: {
          id: newMessage.id,
          senderId: userId,
          senderName: firstName && lastName ? `${firstName} ${lastName}` : username,
          senderType: 'user',
          content: newMessage.message_text,
          createdAt: newMessage.created_at,
        },
      });
    }

    res.json({
      success: true,
      message: {
        id: newMessage.id,
        senderId: userId,
        senderName: firstName && lastName ? `${firstName} ${lastName}` : username,
        senderType: 'user',
        content: newMessage.message_text,
        createdAt: newMessage.created_at,
      },
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message',
    });
  }
});

/**
 * Transform database row to API response format
 */
function transformTaskRow(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority || 'MEDIUM',
    creatorId: row.creator_id,
    assigneeId: row.assignee_id,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messageCount: parseInt(row.message_count || 0),
    attachmentCount: parseInt(row.attachment_count || 0),
    creator: row.creator_name ? {
      id: row.creator_id,
      username: row.creator_name,
      firstName: row.creator_first_name,
      lastName: row.creator_last_name,
    } : null,
    assignee: row.assignee_name ? {
      id: row.assignee_id,
      username: row.assignee_name,
      firstName: row.assignee_first_name,
      lastName: row.assignee_last_name,
    } : null,
  };
}

module.exports = router;
