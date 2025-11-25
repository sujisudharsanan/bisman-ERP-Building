/**
 * Task Controller
 * Business logic for task management with approval hierarchy
 */

const pool = require('../middleware/database');
const { validationResult } = require('express-validator');

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user has permission to access/modify task
 */
const hasTaskPermission = async (taskId, userId, action = 'view') => {
  const query = `
    SELECT t.*, 
           tp.user_id as participant_id,
           tp.can_edit, tp.can_comment, tp.can_approve
    FROM tasks t
    LEFT JOIN task_participants tp ON t.id = tp.task_id AND tp.user_id = $2
    WHERE t.id = $1
  `;
  
  const result = await pool.query(query, [taskId, userId]);
  
  if (result.rows.length === 0) {
    return { hasPermission: false, message: 'Task not found' };
  }
  
  const task = result.rows[0];
  
  // Creator, assignee, and approver always have access
  if (task.creator_id === userId || task.assignee_id === userId || task.approver_id === userId) {
    return { hasPermission: true, task };
  }
  
  // Check participant permissions
  if (task.participant_id === userId) {
    if (action === 'view' || action === 'comment') {
      return { hasPermission: task.can_comment, task };
    }
    if (action === 'edit') {
      return { hasPermission: task.can_edit, task };
    }
    if (action === 'approve') {
      return { hasPermission: task.can_approve, task };
    }
  }
  
  return { hasPermission: false, message: 'Insufficient permissions' };
};

/**
 * Check for duplicate tasks
 */
const checkForDuplicates = async (title, assigneeId, creatorId, excludeTaskId = null) => {
  // Skip duplicate check for drafts (when assigneeId is null)
  if (!assigneeId) {
    return [];
  }
  
  let query = `
    SELECT id, title, status, created_at
    FROM tasks
    WHERE LOWER(title) = LOWER($1)
      AND assignee_id = $2
      AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED')
  `;
  
  const params = [title, assigneeId];
  
  if (excludeTaskId) {
    query += ` AND id != $3`;
    params.push(excludeTaskId);
  }
  
  const result = await pool.query(query, params);
  return result.rows;
};

/**
 * Create system message
 */
const createSystemMessage = async (taskId, messageText, userId) => {
  const query = `
    INSERT INTO task_messages (task_id, sender_id, message_text, message_type, is_system_message)
    VALUES ($1, $2, $3, 'SYSTEM', true)
    RETURNING *
  `;
  
  const result = await pool.query(query, [taskId, userId, messageText]);
  return result.rows[0];
};

/**
 * Get task with full details
 */
const getTaskWithDetails = async (taskId) => {
  const query = `
    SELECT 
      t.*,
      creator.id as creator_id, creator.username as creator_name, creator.email as creator_email,
      assignee.id as assignee_id, assignee.username as assignee_name, assignee.email as assignee_email,
      approver.id as approver_id, approver.username as approver_name, approver.email as approver_email,
      (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
      (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
    FROM tasks t
    LEFT JOIN users creator ON t.creator_id = creator.id
    LEFT JOIN users assignee ON t.assignee_id = assignee.id
    LEFT JOIN users approver ON t.approver_id = approver.id
    WHERE t.id = $1
  `;
  
  const result = await pool.query(query, [taskId]);
  return result.rows[0];
};

// ============================================
// TASK CRUD OPERATIONS
// ============================================

/**
 * Create a new task
 */
exports.createTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      title,
      description,
      serialNumber,
      assigneeId: rawAssigneeId,
      approverId: rawApproverId,
      priority = 'MEDIUM',
      dueDate,
      estimatedHours,
      requiresApproval = false,
      organizationId,
      departmentId,
      status = 'OPEN'
    } = req.body;
    
    // Parse IDs (handle both JSON numbers and FormData strings)
    const assigneeId = rawAssigneeId ? parseInt(rawAssigneeId) : null;
    const approverId = rawApproverId ? parseInt(rawApproverId) : null;
    
    const creatorId = req.user.id;
    
    // Validation - for drafts, only title is required
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    // For non-draft tasks, assignee is required
    if (status !== 'DRAFT' && !assigneeId) {
      return res.status(400).json({
        success: false,
        error: 'Assignee is required for non-draft tasks'
      });
    }
    
    // Check for duplicates
    const duplicates = await checkForDuplicates(title, assigneeId, creatorId);
    
    if (duplicates.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'A similar task already exists',
        duplicate: duplicates[0]
      });
    }
    
    // Create task
    const taskQuery = `
      INSERT INTO tasks (
        title, description, serial_number, creator_id, assignee_id, approver_id,
        priority, due_date, estimated_hours, requires_approval,
        approval_status, organization_id, department_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;
    
    const taskResult = await client.query(taskQuery, [
      title, description || '', serialNumber, creatorId, assigneeId, approverId,
      priority, dueDate || null, estimatedHours || null, requiresApproval,
      requiresApproval ? 'PENDING' : 'NOT_REQUIRED',
      organizationId || null, departmentId || null, status
    ]);
    
    const task = taskResult.rows[0];
    
    // Handle file attachments
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        await client.query(
          `INSERT INTO task_attachments (task_id, file_name, file_url, file_type, file_size, uploaded_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [task.id, file.originalname, file.path, file.mimetype, file.size, creatorId]
        );
      }
    }
    
    // Create initial system message
    await createSystemMessage(
      task.id,
      `Task created by ${req.user.username}`,
      creatorId
    );
    
    await client.query('COMMIT');
    
    // Fetch full task details
    const fullTask = await getTaskWithDetails(task.id);
    
    // Emit real-time event
    const io = req.app.get('io') || global.io;
    if (io) {
      const { emitTaskCreated } = require('../socket/taskSocket');
      emitTaskCreated(io, fullTask, creatorId);
    }
    
    res.status(201).json({
      success: true,
      data: fullTask,
      message: 'Task created successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  } finally {
    client.release();
  }
};

/**
 * Get all tasks with filters
 */
exports.getTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assigneeId,
      creatorId,
      approverId,
      search,
      page = 1,
      limit = 50
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        approver.username as approver_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users approver ON t.approver_id = approver.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Apply filters
    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }
    
    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }
    
    if (assigneeId) {
      paramCount++;
      query += ` AND t.assignee_id = $${paramCount}`;
      params.push(assigneeId);
    }
    
    if (creatorId) {
      paramCount++;
      query += ` AND t.creator_id = $${paramCount}`;
      params.push(creatorId);
    }
    
    if (approverId) {
      paramCount++;
      query += ` AND t.approver_id = $${paramCount}`;
      params.push(approverId);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (LOWER(t.title) LIKE LOWER($${paramCount}) OR LOWER(t.description) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countQuery = query.split('ORDER BY')[0].replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pageSize: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get dashboard tasks grouped by status
 */
exports.getDashboardTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE (t.creator_id = $1 OR t.assignee_id = $1 OR t.approver_id = $1)
        AND t.status NOT IN ('ARCHIVED', 'CANCELLED')
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    // Group by status
    const groupedTasks = {
      DRAFT: [],
      IN_PROGRESS: [],
      EDITING: [], // Map IN_REVIEW to EDITING
      DONE: []
    };
    
    result.rows.forEach(task => {
      if (task.status === 'DRAFT') {
        groupedTasks.DRAFT.push(task);
      } else if (task.status === 'IN_PROGRESS' || task.status === 'OPEN') {
        groupedTasks.IN_PROGRESS.push(task);
      } else if (task.status === 'IN_REVIEW' || task.status === 'BLOCKED') {
        groupedTasks.EDITING.push(task);
      } else if (task.status === 'COMPLETED') {
        groupedTasks.DONE.push(task);
      }
    });
    
    res.json({
      success: true,
      data: groupedTasks
    });
    
  } catch (error) {
    console.error('Error fetching dashboard tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard tasks'
    });
  }
};

/**
 * Get task statistics
 */
exports.getTaskStats = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        COUNT(CASE WHEN status = 'DRAFT' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'OPEN' THEN 1 END) as open_count,
        COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_count,
        COUNT(CASE WHEN status = 'IN_REVIEW' THEN 1 END) as review_count,
        COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END) as blocked_count,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_count,
        COUNT(CASE WHEN due_date < NOW() AND status NOT IN ('COMPLETED', 'CANCELLED', 'ARCHIVED') THEN 1 END) as overdue_count,
        COUNT(*) as total_tasks
      FROM tasks
      WHERE (creator_id = $1 OR assignee_id = $1 OR approver_id = $1)
        AND status NOT IN ('ARCHIVED', 'CANCELLED')
    `;
    
    const result = await pool.query(query, [userId]);
    const stats = result.rows[0];
    
    // Calculate completion rate
    const completionRate = stats.total_tasks > 0
      ? (parseInt(stats.completed_count) / parseInt(stats.total_tasks)) * 100
      : 0;
    
    res.json({
      success: true,
      data: {
        ...stats,
        completionRate: Math.round(completionRate * 10) / 10
      }
    });
    
  } catch (error) {
    console.error('Error fetching task stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task statistics'
    });
  }
};

/**
 * Get single task by ID
 */
exports.getTaskById = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: permission.message || 'Access denied'
      });
    }
    
    // Get task with details
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Get messages
    const messagesQuery = `
      SELECT 
        tm.*,
        u.username as sender_name, u.email as sender_email
      FROM task_messages tm
      LEFT JOIN users u ON tm.sender_id = u.id
      WHERE tm.task_id = $1
      ORDER BY tm.created_at ASC
    `;
    const messages = await pool.query(messagesQuery, [taskId]);
    
    // Get attachments
    const attachmentsQuery = `
      SELECT * FROM task_attachments
      WHERE task_id = $1
      ORDER BY uploaded_at DESC
    `;
    const attachments = await pool.query(attachmentsQuery, [taskId]);
    
    res.json({
      success: true,
      data: {
        ...task,
        messages: messages.rows,
        attachments: attachments.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
};

/**
 * Update task
 */
exports.updateTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'edit');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const {
      title,
      description,
      status,
      priority,
      assigneeId,
      approverId,
      dueDate,
      progress
    } = req.body;
    
    // Build update query
    const updates = [];
    const params = [taskId];
    let paramCount = 1;
    
    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      params.push(title);
    }
    
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }
    
    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
      
      // Update completed_at if status is COMPLETED
      if (status === 'COMPLETED') {
        updates.push(`completed_at = NOW()`);
      }
    }
    
    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      params.push(priority);
    }
    
    if (assigneeId !== undefined) {
      paramCount++;
      updates.push(`assignee_id = $${paramCount}`);
      params.push(assigneeId);
    }
    
    if (approverId !== undefined) {
      paramCount++;
      updates.push(`approver_id = $${paramCount}`);
      params.push(approverId);
    }
    
    if (dueDate !== undefined) {
      paramCount++;
      updates.push(`due_date = $${paramCount}`);
      params.push(dueDate);
    }
    
    if (progress !== undefined) {
      paramCount++;
      updates.push(`progress = $${paramCount}`);
      params.push(progress);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, params);
    
    await client.query('COMMIT');
    
    // Fetch full task details
    const fullTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:updated', { task: fullTask, userId });
    }
    
    res.json({
      success: true,
      data: fullTask,
      message: 'Task updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete/Archive task
 */
exports.deleteTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions (only creator can delete)
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (task.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only task creator can delete the task'
      });
    }
    
    // Archive instead of hard delete
    await client.query(
      `UPDATE tasks SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    await createSystemMessage(taskId, `Task archived by ${req.user.username}`, userId);
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:deleted', { taskId, userId });
    }
    
    res.json({
      success: true,
      message: 'Task archived successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  } finally {
    client.release();
  }
};

/**
 * Get tasks assigned to current user
 */
exports.getMyTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        approver.username as approver_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users approver ON t.approver_id = approver.id
      WHERE t.assignee_id = $1
        AND t.status NOT IN ('ARCHIVED', 'CANCELLED')
      ORDER BY t.priority DESC, t.due_date ASC NULLS LAST
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching my tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get tasks created by current user
 */
exports.getCreatedByMe = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        t.*,
        assignee.username as assignee_name,
        approver.username as approver_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users approver ON t.approver_id = approver.id
      WHERE t.creator_id = $1
        AND t.status NOT IN ('ARCHIVED', 'CANCELLED')
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching created tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks'
    });
  }
};

/**
 * Get tasks pending approval
 */
exports.getPendingApproval = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.approver_id = $1
        AND t.approval_status = 'PENDING'
        AND t.status NOT IN ('ARCHIVED', 'CANCELLED')
      ORDER BY t.created_at ASC
    `;
    
    const result = await pool.query(query, [userId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
};

/**
 * Check for duplicate tasks (endpoint)
 */
exports.checkDuplicates = async (req, res) => {
  try {
    const { title, assigneeId } = req.query;
    const userId = req.user.id;
    
    if (!title || !assigneeId) {
      return res.status(400).json({
        success: false,
        error: 'Title and assigneeId are required'
      });
    }
    
    const duplicates = await checkForDuplicates(title, assigneeId, userId);
    
    res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates
    });
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check duplicates'
    });
  }
};

/**
 * Check duplicate before create (middleware endpoint)
 */
exports.checkDuplicateBeforeCreate = async (req, res) => {
  try {
    const { title, assigneeId } = req.body;
    const userId = req.user.id;
    
    if (!title || !assigneeId) {
      return res.json({
        success: true,
        hasDuplicates: false
      });
    }
    
    const duplicates = await checkForDuplicates(title, assigneeId, userId);
    
    res.json({
      success: true,
      hasDuplicates: duplicates.length > 0,
      duplicates: duplicates.map(d => ({
        id: d.id,
        title: d.title,
        status: d.status,
        createdAt: d.created_at
      }))
    });
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check duplicates'
    });
  }
};

// ============================================
// TASK MESSAGES
// ============================================

/**
 * Get all messages for a task
 */
exports.getTaskMessages = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const query = `
      SELECT 
        tm.*,
        u.username as sender_name,
        u.email as sender_email
      FROM task_messages tm
      LEFT JOIN users u ON tm.sender_id = u.id
      WHERE tm.task_id = $1
      ORDER BY tm.created_at ASC
    `;
    
    const result = await pool.query(query, [taskId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
};

/**
 * Add a message to task
 */
exports.addTaskMessage = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { messageText, messageType = 'TEXT' } = req.body;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'comment');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    if (!messageText || messageText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }
    
    // Add message
    const query = `
      INSERT INTO task_messages (task_id, sender_id, message_text, message_type)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await client.query(query, [taskId, userId, messageText, messageType]);
    const message = result.rows[0];
    
    // Get sender details
    const senderQuery = `
      SELECT username, email FROM users WHERE id = $1
    `;
    const senderResult = await client.query(senderQuery, [userId]);
    const sender = senderResult.rows[0];
    
    await client.query('COMMIT');
    
    const fullMessage = {
      ...message,
      sender_name: sender.username,
      sender_email: sender.email
    };
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:message', { taskId, message: fullMessage, userId });
    }
    
    res.status(201).json({
      success: true,
      data: fullMessage,
      message: 'Message added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add message'
    });
  } finally {
    client.release();
  }
};

/**
 * Edit a message
 */
exports.editTaskMessage = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: taskId, messageId } = req.params;
    const userId = req.user.id;
    const { messageText } = req.body;
    
    if (!messageText || messageText.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Message text is required'
      });
    }
    
    // Check if message exists and user is the sender
    const checkQuery = `
      SELECT * FROM task_messages
      WHERE id = $1 AND task_id = $2 AND sender_id = $3 AND is_system_message = false
    `;
    const checkResult = await client.query(checkQuery, [messageId, taskId, userId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: 'Cannot edit this message'
      });
    }
    
    // Update message
    const updateQuery = `
      UPDATE task_messages
      SET message_text = $1, is_edited = true, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [messageText, messageId]);
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:message:updated', { taskId, messageId, userId });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'Message updated successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error editing message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to edit message'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete a message
 */
exports.deleteTaskMessage = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: taskId, messageId } = req.params;
    const userId = req.user.id;
    
    // Check if message exists and user is the sender or task creator
    const checkQuery = `
      SELECT tm.*, t.creator_id
      FROM task_messages tm
      JOIN tasks t ON tm.task_id = t.id
      WHERE tm.id = $1 AND tm.task_id = $2 AND tm.is_system_message = false
    `;
    const checkResult = await client.query(checkQuery, [messageId, taskId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }
    
    const message = checkResult.rows[0];
    
    // Only sender or task creator can delete
    if (message.sender_id !== userId && message.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete this message'
      });
    }
    
    // Soft delete
    await client.query(
      `UPDATE task_messages SET is_deleted = true WHERE id = $1`,
      [messageId]
    );
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:message:deleted', { taskId, messageId, userId });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  } finally {
    client.release();
  }
};

/**
 * Mark message as read
 */
exports.markMessageAsRead = async (req, res) => {
  try {
    const { id: taskId, messageId } = req.params;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Update read status
    await pool.query(
      `UPDATE task_messages 
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND task_id = $2`,
      [messageId, taskId]
    );
    
    res.json({
      success: true,
      message: 'Message marked as read'
    });
    
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark message as read'
    });
  }
};

// ============================================
// ATTACHMENTS
// ============================================

/**
 * Get all attachments for a task
 */
exports.getTaskAttachments = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const query = `
      SELECT 
        ta.*,
        u.username as uploader_name
      FROM task_attachments ta
      LEFT JOIN users u ON ta.uploaded_by = u.id
      WHERE ta.task_id = $1
      ORDER BY ta.uploaded_at DESC
    `;
    
    const result = await pool.query(query, [taskId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachments'
    });
  }
};

/**
 * Add attachments to task
 */
exports.addTaskAttachments = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'comment');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }
    
    const attachments = [];
    
    for (const file of req.files) {
      const query = `
        INSERT INTO task_attachments (task_id, file_name, file_url, file_type, file_size, uploaded_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const result = await client.query(query, [
        taskId,
        file.originalname,
        file.path,
        file.mimetype,
        file.size,
        userId
      ]);
      
      attachments.push(result.rows[0]);
    }
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:attachments:added', { taskId, attachments, userId });
    }
    
    res.status(201).json({
      success: true,
      data: attachments,
      message: 'Attachments added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add attachments'
    });
  } finally {
    client.release();
  }
};

/**
 * Delete an attachment
 */
exports.deleteAttachment = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: taskId, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Check if attachment exists
    const checkQuery = `
      SELECT ta.*, t.creator_id
      FROM task_attachments ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.id = $1 AND ta.task_id = $2
    `;
    const checkResult = await client.query(checkQuery, [attachmentId, taskId]);
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }
    
    const attachment = checkResult.rows[0];
    
    // Only uploader or task creator can delete
    if (attachment.uploaded_by !== userId && attachment.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Cannot delete this attachment'
      });
    }
    
    // Delete from database
    await client.query(`DELETE FROM task_attachments WHERE id = $1`, [attachmentId]);
    
    // TODO: Delete physical file from filesystem/cloud storage
    
    await client.query('COMMIT');
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:attachment:deleted', { taskId, attachmentId, userId });
    }
    
    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attachment'
    });
  } finally {
    client.release();
  }
};

// ============================================
// STATUS TRANSITIONS
// ============================================

/**
 * Start working on a task
 */
exports.startTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Only assignee can start
    if (task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only assignee can start the task'
      });
    }
    
    if (task.status !== 'OPEN' && task.status !== 'DRAFT') {
      return res.status(400).json({
        success: false,
        error: 'Task cannot be started from current status'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET status = 'IN_PROGRESS', started_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    await createSystemMessage(taskId, `Task started by ${req.user.username}`, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task started successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error starting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start task'
    });
  } finally {
    client.release();
  }
};

/**
 * Complete a task
 */
exports.completeTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { notes } = req.body;
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Only assignee can complete
    if (task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only assignee can complete the task'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET status = 'COMPLETED', progress = 100, completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    let message = `Task completed by ${req.user.username}`;
    if (notes) {
      message += `: ${notes}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task completed successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error completing task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to complete task'
    });
  } finally {
    client.release();
  }
};

/**
 * Reopen a completed task
 */
exports.reopenTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Creator or assignee can reopen
    if (task.creator_id !== userId && task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    if (task.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        error: 'Only completed tasks can be reopened'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET status = 'IN_PROGRESS', completed_at = NULL, updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    let message = `Task reopened by ${req.user.username}`;
    if (reason) {
      message += `: ${reason}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task reopened successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reopening task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reopen task'
    });
  } finally {
    client.release();
  }
};

/**
 * Submit task for review
 */
exports.submitForReview = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { notes } = req.body;
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Only assignee can submit for review
    if (task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only assignee can submit for review'
      });
    }
    
    if (task.status !== 'IN_PROGRESS') {
      return res.status(400).json({
        success: false,
        error: 'Task must be in progress to submit for review'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET status = 'IN_REVIEW', approval_status = 'PENDING', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    let message = `Task submitted for review by ${req.user.username}`;
    if (notes) {
      message += `: ${notes}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task submitted for review'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting task for review:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit task for review'
    });
  } finally {
    client.release();
  }
};

/**
 * Approve a task
 */
exports.approveTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { comments } = req.body;
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Only approver can approve
    if (task.approver_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only designated approver can approve this task'
      });
    }
    
    if (task.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Task is not pending approval'
      });
    }
    
    // Update approval status
    await client.query(
      `UPDATE tasks SET approval_status = 'APPROVED', approved_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    let message = `Task approved by ${req.user.username}`;
    if (comments) {
      message += `: ${comments}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:approved', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task approved successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error approving task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to approve task'
    });
  } finally {
    client.release();
  }
};

/**
 * Reject a task
 */
exports.rejectTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required'
      });
    }
    
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    // Only approver can reject
    if (task.approver_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only designated approver can reject this task'
      });
    }
    
    if (task.approval_status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        error: 'Task is not pending approval'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET approval_status = 'REJECTED', status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    await createSystemMessage(taskId, `Task rejected by ${req.user.username}: ${reason}`, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:rejected', { task: updatedTask, userId, reason });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task rejected'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rejecting task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reject task'
    });
  } finally {
    client.release();
  }
};

/**
 * Block a task
 */
exports.blockTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;
    
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Block reason is required'
      });
    }
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'edit');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Update status
    await client.query(
      `UPDATE tasks SET status = 'BLOCKED', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    await createSystemMessage(taskId, `Task blocked by ${req.user.username}: ${reason}`, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task blocked'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error blocking task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to block task'
    });
  } finally {
    client.release();
  }
};

/**
 * Unblock a task
 */
exports.unblockTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { notes } = req.body;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'edit');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const task = permission.task;
    
    if (task.status !== 'BLOCKED') {
      return res.status(400).json({
        success: false,
        error: 'Task is not blocked'
      });
    }
    
    // Update status back to IN_PROGRESS
    await client.query(
      `UPDATE tasks SET status = 'IN_PROGRESS', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
    
    // Create system message
    let message = `Task unblocked by ${req.user.username}`;
    if (notes) {
      message += `: ${notes}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:status_changed', { task: updatedTask, userId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task unblocked'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error unblocking task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unblock task'
    });
  } finally {
    client.release();
  }
};

// ============================================
// PARTICIPANTS
// ============================================

/**
 * Get task participants
 */
exports.getTaskParticipants = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const query = `
      SELECT 
        tp.*,
        u.username, u.email
      FROM task_participants tp
      LEFT JOIN users u ON tp.user_id = u.id
      WHERE tp.task_id = $1
      ORDER BY tp.added_at ASC
    `;
    
    const result = await pool.query(query, [taskId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch participants'
    });
  }
};

/**
 * Add participant to task
 */
exports.addTaskParticipant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { 
      participantUserId, 
      role = 'VIEWER',
      canEdit = false, 
      canComment = true, 
      canApprove = false 
    } = req.body;
    
    if (!participantUserId) {
      return res.status(400).json({
        success: false,
        error: 'Participant user ID is required'
      });
    }
    
    // Check permissions (creator or assignee can add participants)
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (task.creator_id !== userId && task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only creator or assignee can add participants'
      });
    }
    
    // Check if user exists
    const userCheck = await client.query('SELECT id, username FROM users WHERE id = $1', [participantUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check if already a participant
    const existingCheck = await client.query(
      'SELECT id FROM task_participants WHERE task_id = $1 AND user_id = $2',
      [taskId, participantUserId]
    );
    
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'User is already a participant'
      });
    }
    
    // Add participant
    const query = `
      INSERT INTO task_participants (task_id, user_id, role, can_edit, can_comment, can_approve, added_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      taskId, participantUserId, role, canEdit, canComment, canApprove, userId
    ]);
    
    // Create system message
    const participantName = userCheck.rows[0].username;
    await createSystemMessage(taskId, `${participantName} added as ${role} by ${req.user.username}`, userId);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Participant added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add participant'
    });
  } finally {
    client.release();
  }
};

/**
 * Remove participant from task
 */
exports.removeTaskParticipant = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: taskId, userId: participantId } = req.params;
    const userId = req.user.id;
    
    // Check permissions
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (task.creator_id !== userId && task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only creator or assignee can remove participants'
      });
    }
    
    // Remove participant
    const result = await client.query(
      `DELETE FROM task_participants WHERE task_id = $1 AND user_id = $2 RETURNING *`,
      [taskId, participantId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Participant not found'
      });
    }
    
    // Get participant name for message
    const userResult = await client.query('SELECT username FROM users WHERE id = $1', [participantId]);
    const participantName = userResult.rows[0]?.username || 'User';
    
    // Create system message
    await createSystemMessage(taskId, `${participantName} removed from task by ${req.user.username}`, userId);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Participant removed successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing participant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove participant'
    });
  } finally {
    client.release();
  }
};

// ============================================
// HISTORY
// ============================================

/**
 * Get task history/audit trail
 */
exports.getTaskHistory = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const query = `
      SELECT 
        th.*,
        u.username as changed_by_name
      FROM task_history th
      LEFT JOIN users u ON th.changed_by = u.id
      WHERE th.task_id = $1
      ORDER BY th.changed_at DESC
    `;
    
    const result = await pool.query(query, [taskId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task history'
    });
  }
};

// ============================================
// DEPENDENCIES
// ============================================

/**
 * Get task dependencies
 */
exports.getTaskDependencies = async (req, res) => {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'view');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    const query = `
      SELECT 
        td.*,
        t.title as depends_on_title,
        t.status as depends_on_status
      FROM task_dependencies td
      LEFT JOIN tasks t ON td.depends_on_task_id = t.id
      WHERE td.task_id = $1
      ORDER BY td.created_at ASC
    `;
    
    const result = await pool.query(query, [taskId]);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dependencies'
    });
  }
};

/**
 * Add task dependency
 */
exports.addTaskDependency = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { dependsOnTaskId, dependencyType = 'BLOCKS' } = req.body;
    
    if (!dependsOnTaskId) {
      return res.status(400).json({
        success: false,
        error: 'Depends on task ID is required'
      });
    }
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'edit');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Verify the dependency task exists
    const dependencyTask = await client.query(
      'SELECT id, title FROM tasks WHERE id = $1',
      [dependsOnTaskId]
    );
    
    if (dependencyTask.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dependency task not found'
      });
    }
    
    // Check for circular dependencies
    const circularCheck = await client.query(
      'SELECT id FROM task_dependencies WHERE task_id = $1 AND depends_on_task_id = $2',
      [dependsOnTaskId, taskId]
    );
    
    if (circularCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Circular dependency detected'
      });
    }
    
    // Add dependency
    const query = `
      INSERT INTO task_dependencies (task_id, depends_on_task_id, dependency_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await client.query(query, [taskId, dependsOnTaskId, dependencyType, userId]);
    
    // Create system message
    const depTaskTitle = dependencyTask.rows[0].title;
    await createSystemMessage(
      taskId,
      `Dependency added: ${dependencyType} "${depTaskTitle}" by ${req.user.username}`,
      userId
    );
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Dependency added successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding dependency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add dependency'
    });
  } finally {
    client.release();
  }
};

/**
 * Remove task dependency
 */
exports.removeTaskDependency = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { id: taskId, dependencyId } = req.params;
    const userId = req.user.id;
    
    // Check permissions
    const permission = await hasTaskPermission(taskId, userId, 'edit');
    if (!permission.hasPermission) {
      return res.status(403).json({
        success: false,
        error: 'Access denied'
      });
    }
    
    // Remove dependency
    const result = await client.query(
      `DELETE FROM task_dependencies WHERE id = $1 AND task_id = $2 RETURNING *`,
      [dependencyId, taskId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Dependency not found'
      });
    }
    
    // Create system message
    await createSystemMessage(taskId, `Dependency removed by ${req.user.username}`, userId);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Dependency removed successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing dependency:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove dependency'
    });
  } finally {
    client.release();
  }
};

// ============================================
// TEMPLATES
// ============================================

/**
 * Get all task templates
 */
exports.getTaskTemplates = async (req, res) => {
  try {
    const userId = req.user.id;
    const { organizationId, departmentId } = req.query;
    
    let query = `
      SELECT 
        tt.*,
        u.username as created_by_name
      FROM task_templates tt
      LEFT JOIN users u ON tt.created_by = u.id
      WHERE tt.is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (organizationId) {
      paramCount++;
      query += ` AND (tt.organization_id = $${paramCount} OR tt.organization_id IS NULL)`;
      params.push(organizationId);
    }
    
    if (departmentId) {
      paramCount++;
      query += ` AND (tt.department_id = $${paramCount} OR tt.department_id IS NULL)`;
      params.push(departmentId);
    }
    
    query += ` ORDER BY tt.template_name ASC`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch templates'
    });
  }
};

/**
 * Create task template
 */
exports.createTaskTemplate = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const {
      templateName,
      description,
      defaultTitle,
      defaultDescription,
      defaultPriority = 'MEDIUM',
      estimatedHours,
      requiresApproval = false,
      organizationId,
      departmentId,
      tags
    } = req.body;
    
    if (!templateName) {
      return res.status(400).json({
        success: false,
        error: 'Template name is required'
      });
    }
    
    const query = `
      INSERT INTO task_templates (
        template_name, description, default_title, default_description,
        default_priority, estimated_hours, requires_approval,
        organization_id, department_id, tags, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const result = await client.query(query, [
      templateName, description, defaultTitle, defaultDescription,
      defaultPriority, estimatedHours, requiresApproval,
      organizationId || null, departmentId || null, tags || null, userId
    ]);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'Template created successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create template'
    });
  } finally {
    client.release();
  }
};

/**
 * Create task from template
 */
exports.createTaskFromTemplate = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { templateId } = req.params;
    const userId = req.user.id;
    const { assigneeId, approverId, dueDate, customTitle, customDescription } = req.body;
    
    if (!assigneeId) {
      return res.status(400).json({
        success: false,
        error: 'Assignee is required'
      });
    }
    
    // Get template
    const templateResult = await client.query(
      'SELECT * FROM task_templates WHERE id = $1 AND is_active = true',
      [templateId]
    );
    
    if (templateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Template not found'
      });
    }
    
    const template = templateResult.rows[0];
    
    // Create task from template
    const taskQuery = `
      INSERT INTO tasks (
        title, description, creator_id, assignee_id, approver_id,
        priority, due_date, estimated_hours, requires_approval,
        approval_status, organization_id, department_id, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'OPEN')
      RETURNING *
    `;
    
    const title = customTitle || template.default_title || template.template_name;
    const description = customDescription || template.default_description;
    
    const taskResult = await client.query(taskQuery, [
      title, description, userId, assigneeId, approverId || null,
      template.default_priority, dueDate || null, template.estimated_hours,
      template.requires_approval,
      template.requires_approval ? 'PENDING' : 'NOT_REQUIRED',
      template.organization_id, template.department_id
    ]);
    
    const task = taskResult.rows[0];
    
    // Increment usage count
    await client.query(
      'UPDATE task_templates SET usage_count = usage_count + 1 WHERE id = $1',
      [templateId]
    );
    
    // Create system message
    await createSystemMessage(
      task.id,
      `Task created from template "${template.template_name}" by ${req.user.username}`,
      userId
    );
    
    await client.query('COMMIT');
    
    const fullTask = await getTaskWithDetails(task.id);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:created', { task: fullTask, userId });
    }
    
    res.status(201).json({
      success: true,
      data: fullTask,
      message: 'Task created from template'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating task from template:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task from template'
    });
  } finally {
    client.release();
  }
};

// ============================================
// ASSIGNMENT
// ============================================

/**
 * Reassign task to different user
 */
exports.reassignTask = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const taskId = req.params.id;
    const userId = req.user.id;
    const { newAssigneeId, reason } = req.body;
    
    if (!newAssigneeId) {
      return res.status(400).json({
        success: false,
        error: 'New assignee ID is required'
      });
    }
    
    // Check permissions (creator or current assignee can reassign)
    const task = await getTaskWithDetails(taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    if (task.creator_id !== userId && task.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only creator or current assignee can reassign the task'
      });
    }
    
    // Verify new assignee exists
    const userCheck = await client.query('SELECT id, username FROM users WHERE id = $1', [newAssigneeId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'New assignee not found'
      });
    }
    
    const oldAssigneeName = task.assignee_name;
    const newAssigneeName = userCheck.rows[0].username;
    
    // Update assignee
    await client.query(
      `UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2`,
      [newAssigneeId, taskId]
    );
    
    // Create system message
    let message = `Task reassigned from ${oldAssigneeName} to ${newAssigneeName} by ${req.user.username}`;
    if (reason) {
      message += `: ${reason}`;
    }
    await createSystemMessage(taskId, message, userId);
    
    await client.query('COMMIT');
    
    const updatedTask = await getTaskWithDetails(taskId);
    
    // Emit real-time event
    if (req.io) {
      req.io.emit('task:reassigned', { task: updatedTask, userId, oldAssigneeId: task.assignee_id, newAssigneeId });
    }
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task reassigned successfully'
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reassigning task:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reassign task'
    });
  } finally {
    client.release();
  }
};

/**
 * Get list of users who can be assigned tasks
 */
exports.getAssignableUsers = async (req, res) => {
  try {
    const { organizationId, departmentId, role, search } = req.query;
    
    let query = `
      SELECT id, username, email, role
      FROM users
      WHERE is_active = true
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (organizationId) {
      paramCount++;
      query += ` AND organization_id = $${paramCount}`;
      params.push(organizationId);
    }
    
    if (departmentId) {
      paramCount++;
      query += ` AND department_id = $${paramCount}`;
      params.push(departmentId);
    }
    
    if (role) {
      paramCount++;
      query += ` AND role = $${paramCount}`;
      params.push(role);
    }
    
    if (search) {
      paramCount++;
      query += ` AND (LOWER(username) LIKE LOWER($${paramCount}) OR LOWER(email) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }
    
    query += ` ORDER BY username ASC LIMIT 100`;
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('Error fetching assignable users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
};

// ============================================
// SEARCH
// ============================================

/**
 * Advanced task search
 */
exports.searchTasks = async (req, res) => {
  try {
    const {
      query: searchQuery,
      status,
      priority,
      assigneeId,
      creatorId,
      approverId,
      dateFrom,
      dateTo,
      tags,
      page = 1,
      limit = 50
    } = req.query;
    
    const userId = req.user.id;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        approver.username as approver_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users approver ON t.approver_id = approver.id
      WHERE (t.creator_id = $1 OR t.assignee_id = $1 OR t.approver_id = $1
             OR EXISTS (SELECT 1 FROM task_participants WHERE task_id = t.id AND user_id = $1))
        AND t.status NOT IN ('ARCHIVED')
    `;
    
    const params = [userId];
    let paramCount = 1;
    
    // Full-text search (including serial number)
    if (searchQuery) {
      paramCount++;
      query += ` AND (
        LOWER(t.title) LIKE LOWER($${paramCount})
        OR LOWER(t.description) LIKE LOWER($${paramCount})
        OR UPPER(t.serial_number) LIKE UPPER($${paramCount})
      )`;
      params.push(`%${searchQuery}%`);
    }
    
    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }
    
    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }
    
    if (assigneeId) {
      paramCount++;
      query += ` AND t.assignee_id = $${paramCount}`;
      params.push(assigneeId);
    }
    
    if (creatorId) {
      paramCount++;
      query += ` AND t.creator_id = $${paramCount}`;
      params.push(creatorId);
    }
    
    if (approverId) {
      paramCount++;
      query += ` AND t.approver_id = $${paramCount}`;
      params.push(approverId);
    }
    
    if (dateFrom) {
      paramCount++;
      query += ` AND t.created_at >= $${paramCount}`;
      params.push(dateFrom);
    }
    
    if (dateTo) {
      paramCount++;
      query += ` AND t.created_at <= $${paramCount}`;
      params.push(dateTo);
    }
    
    query += ` ORDER BY t.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    
    // Get total count
    const countQuery = query.split('ORDER BY')[0].replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM');
    const countResult = await pool.query(countQuery, params.slice(0, -2));
    
    res.json({
      success: true,
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pageSize: parseInt(limit)
    });
    
  } catch (error) {
    console.error('Error searching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tasks'
    });
  }
};

/**
 * Search task by serial number
 */
exports.searchTaskBySerialNumber = async (req, res) => {
  try {
    const { serialNumber } = req.params;
    const userId = req.user.id;
    
    if (!serialNumber) {
      return res.status(400).json({
        success: false,
        error: 'Serial number is required'
      });
    }
    
    const query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        approver.username as approver_name,
        approver.email as approver_email,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count,
        (SELECT COUNT(*) FROM task_participants WHERE task_id = t.id) as participant_count
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users approver ON t.approver_id = approver.id
      WHERE UPPER(t.serial_number) = UPPER($1)
        AND (t.creator_id = $2 OR t.assignee_id = $2 OR t.approver_id = $2
             OR EXISTS (SELECT 1 FROM task_participants WHERE task_id = t.id AND user_id = $2))
    `;
    
    const result = await pool.query(query, [serialNumber, userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found or you do not have access to this task'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Error searching task by serial number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search task by serial number'
    });
  }
};

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk update tasks
 */
exports.bulkUpdateTasks = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { taskIds, updates } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task IDs array is required'
      });
    }
    
    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Updates object is required'
      });
    }
    
    const allowedFields = ['status', 'priority', 'assignee_id', 'approver_id', 'due_date'];
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    // Build update query
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        paramCount++;
        updateFields.push(`${key} = $${paramCount}`);
        updateValues.push(value);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }
    
    // Check permissions for all tasks
    for (const taskId of taskIds) {
      const permission = await hasTaskPermission(taskId, userId, 'edit');
      if (!permission.hasPermission) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: `Access denied for task ${taskId}`
        });
      }
    }
    
    // Perform bulk update
    paramCount++;
    const query = `
      UPDATE tasks
      SET ${updateFields.join(', ')}, updated_at = NOW()
      WHERE id = ANY($${paramCount})
      RETURNING id
    `;
    
    const result = await client.query(query, [...updateValues, taskIds]);
    
    await client.query('COMMIT');
    
    // Emit real-time events
    if (req.io) {
      req.io.emit('tasks:bulk_updated', { taskIds, updates, userId });
    }
    
    res.json({
      success: true,
      updatedCount: result.rows.length,
      message: `${result.rows.length} tasks updated successfully`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk updating tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk update tasks'
    });
  } finally {
    client.release();
  }
};

/**
 * Bulk delete/archive tasks
 */
exports.bulkDeleteTasks = async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const userId = req.user.id;
    const { taskIds } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Task IDs array is required'
      });
    }
    
    // Check permissions for all tasks (only creators can delete)
    for (const taskId of taskIds) {
      const task = await getTaskWithDetails(taskId);
      if (!task || task.creator_id !== userId) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          success: false,
          error: `Access denied for task ${taskId}. Only creator can delete.`
        });
      }
    }
    
    // Archive tasks (soft delete)
    const query = `
      UPDATE tasks
      SET status = 'ARCHIVED', updated_at = NOW()
      WHERE id = ANY($1)
      RETURNING id
    `;
    
    const result = await client.query(query, [taskIds]);
    
    await client.query('COMMIT');
    
    // Emit real-time events
    if (req.io) {
      req.io.emit('tasks:bulk_deleted', { taskIds, userId });
    }
    
    res.json({
      success: true,
      deletedCount: result.rows.length,
      message: `${result.rows.length} tasks archived successfully`
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error bulk deleting tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk delete tasks'
    });
  } finally {
    client.release();
  }
};
