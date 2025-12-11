/**
 * Enhanced Task Controller v2
 * Complete task management with Socket.IO real-time updates
 * 
 * Features:
 * - Full CRUD operations
 * - Status transitions with validation
 * - Messages/Comments
 * - Attachments
 * - Real-time Socket.IO events
 * - Audit logging
 */

const { getPool } = require('../middleware/database');
const path = require('path');
const fs = require('fs');

// Lazy pool getter
const getDbPool = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

// Task Status enum
const TaskStatus = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  BLOCKED: 'BLOCKED',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ARCHIVED: 'ARCHIVED'
};

// Task Priority enum
const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
  CRITICAL: 'CRITICAL'
};

// Valid status transitions
const validTransitions = {
  [TaskStatus.DRAFT]: [TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.OPEN]: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.OPEN],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.CANCELLED, 'DONE'], // DONE is alias for COMPLETED
  [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED, 'DONE'],
  [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
  [TaskStatus.CANCELLED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: [],
  // Legacy/Alternative status names (for backward compatibility)
  'TODO': [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED], // Same as OPEN
  'PENDING': [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED], // Same as OPEN
  'DONE': [TaskStatus.ARCHIVED], // Same as COMPLETED
};

// Socket.IO instance (set from app.js)
let io = null;
const setSocketIO = (socketIO) => {
  io = socketIO;
};

// Emit event to tenant room
const emitToTenant = (tenantId, event, data) => {
  if (io && tenantId) {
    io.to(`tenant:${tenantId}`).emit(event, data);
    console.log(`[Socket] Emitted ${event} to tenant:${tenantId}`);
  }
};

// ============================================
// TASK CRUD OPERATIONS
// ============================================

/**
 * GET /api/v2/tasks
 * List tasks with filters
 */
const listTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { status, assigneeId, creatorId, search, priority, page = 1, limit = 50 } = req.query;
    
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE (t.is_archived = FALSE OR t.is_archived IS NULL)
    `;
    
    const params = [];
    let paramCount = 0;
    
    // Filter by tenant if available
    if (tenantId) {
      paramCount++;
      query += ` AND t.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }
    
    // User can see tasks they created, are assigned to, or participate in
    paramCount++;
    query += ` AND (
      t.creator_id = $${paramCount} 
      OR t.assignee_id = $${paramCount}
      OR t.approver_id = $${paramCount}
      OR EXISTS (SELECT 1 FROM task_participants tp WHERE tp.task_id = t.id AND tp.user_id = $${paramCount})
    )`;
    params.push(userId);
    
    // Status filter
    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      paramCount++;
      query += ` AND t.status = ANY($${paramCount}::text[])`;
      params.push(statuses);
    }
    
    // Assignee filter
    if (assigneeId) {
      paramCount++;
      query += ` AND t.assignee_id = $${paramCount}`;
      params.push(parseInt(assigneeId));
    }
    
    // Creator filter
    if (creatorId) {
      paramCount++;
      query += ` AND t.creator_id = $${paramCount}`;
      params.push(parseInt(creatorId));
    }
    
    // Priority filter
    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority.toUpperCase());
    }
    
    // Search filter
    if (search) {
      paramCount++;
      query += ` AND (
        t.title ILIKE $${paramCount} 
        OR t.description ILIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }
    
    // Order and pagination
    query += ` ORDER BY t.position ASC, t.created_at DESC`;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);
    
    const result = await getDbPool().query(query, params);
    
    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM workflow_tasks t
      WHERE (t.is_archived = FALSE OR t.is_archived IS NULL)
    `;
    // Note: simplified count query - production should match filters
    const countResult = await getDbPool().query(countQuery);
    const total = parseInt(countResult.rows[0]?.total || 0);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('[TaskController] listTasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
};

/**
 * GET /api/v2/tasks/kanban
 * Get tasks grouped by status for Kanban board
 */
const getKanbanTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    // Build query with mandatory tenant isolation
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE (t.is_archived = FALSE OR t.is_archived IS NULL)
        AND t.status NOT IN ('CANCELLED', 'ARCHIVED')
    `;
    
    const params = [];
    let paramCount = 0;
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      paramCount++;
      query += ` AND t.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }
    
    // User can see tasks they created, are assigned to, or participate in
    paramCount++;
    query += ` AND (
      t.creator_id = $${paramCount}
      OR t.assignee_id = $${paramCount}
      OR EXISTS (SELECT 1 FROM task_participants tp WHERE tp.task_id = t.id AND tp.user_id = $${paramCount})
    )`;
    params.push(userId);
    
    query += ` ORDER BY t.position ASC, t.created_at DESC`;
    
    const result = await getDbPool().query(query, params);
    
    // Group by status for Kanban
    const grouped = {
      ASSIGNED: [],
      IN_PROGRESS: [],
      NEED_ATTENTION: [],
      DONE: []
    };
    
    result.rows.forEach(task => {
      const isCreator = task.creator_id === userId;
      const isAssignee = task.assignee_id === userId;
      
      // Add role info
      task.statusInfo = {
        isCreator,
        isAssignee,
        canComplete: isAssignee && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status),
        canCancel: isCreator && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status)
      };
      
      // Transform for Kanban display
      task.subItems = task.description ? [{ id: `${task.id}-desc`, text: task.description.substring(0, 100) }] : [];
      task.comments = parseInt(task.message_count) || 0;
      task.attachments = parseInt(task.attachment_count) || 0;
      task.color = {
        LOW: 'blue',
        MEDIUM: 'yellow',
        HIGH: 'purple',
        URGENT: 'pink',
        CRITICAL: 'pink'
      }[task.priority] || 'blue';
      
      // Group logic
      if (['DRAFT', 'OPEN', 'ASSIGNED'].includes(task.status)) {
        if (isCreator) {
          grouped.ASSIGNED.push(task);
        } else if (isAssignee) {
          grouped.IN_PROGRESS.push(task);
        }
      } else if (task.status === 'IN_PROGRESS') {
        grouped.IN_PROGRESS.push(task);
      } else if (['IN_REVIEW', 'BLOCKED'].includes(task.status)) {
        grouped.NEED_ATTENTION.push(task);
      } else if (['COMPLETED', 'DONE'].includes(task.status)) {
        grouped.DONE.push(task);
      }
    });
    
    res.json({
      success: true,
      data: grouped
    });
    
  } catch (error) {
    console.error('[TaskController] getKanbanTasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Kanban tasks'
    });
  }
};

/**
 * GET /api/v2/tasks/:id
 * Get single task with details
 */
const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    // Build query with tenant isolation
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.id = $1
    `;
    
    const params = [id];
    let paramCount = 1;
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      paramCount++;
      query += ` AND t.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }
    
    const result = await getDbPool().query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const task = result.rows[0];
    
    // Check permission
    const hasAccess = task.creator_id === userId || 
                      task.assignee_id === userId ||
                      task.approver_id === String(userId);
    
    if (!hasAccess) {
      // Check if participant
      const participantCheck = await getDbPool().query(
        'SELECT 1 FROM task_participants WHERE task_id = $1 AND user_id = $2',
        [id, userId]
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
    
    // Add role info
    task.statusInfo = {
      isCreator: task.creator_id === userId,
      isAssignee: task.assignee_id === userId,
      canComplete: task.assignee_id === userId && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status),
      canCancel: task.creator_id === userId && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status)
    };
    
    res.json({
      success: true,
      data: task
    });
    
  } catch (error) {
    console.error('[TaskController] getTaskById error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task'
    });
  }
};

/**
 * POST /api/v2/tasks
 * Create new task
 */
const createTask = async (req, res) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const {
      title,
      description,
      assigneeId,
      priority = 'MEDIUM',
      dueDate,
      status: rawStatus = 'OPEN',
      tags = []
    } = req.body;
    
    // Normalize status to uppercase for consistency
    const status = rawStatus.toUpperCase();
    
    // Validate status is a known value
    if (!Object.values(TaskStatus).includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status: ${status}. Must be one of: ${Object.values(TaskStatus).join(', ')}`
      });
    }
    
    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required'
      });
    }
    
    // Generate serial number
    const serialResult = await getDbPool().query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(serial_number FROM 5) AS INTEGER)), 0) + 1 as next_serial
      FROM workflow_tasks
      WHERE serial_number LIKE 'TSK-%'
    `);
    const nextSerial = serialResult.rows[0]?.next_serial || 1;
    const serialNumber = `TSK-${String(nextSerial).padStart(5, '0')}`;
    
    // Get max position for ordering
    const posResult = await getDbPool().query(`
      SELECT COALESCE(MAX(position), 0) + 1 as next_pos
      FROM workflow_tasks
      WHERE status = $1
    `, [status]);
    const position = posResult.rows[0]?.next_pos || 0;
    
    const query = `
      INSERT INTO workflow_tasks (
        title, description, status, priority, 
        creator_id, assignee_id, tenant_id,
        due_date, tags, serial_number, position,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await getDbPool().query(query, [
      title,
      description,
      status,
      priority.toUpperCase(),
      userId,
      assigneeId || null,
      tenantId || null,
      dueDate || null,
      tags,
      serialNumber,
      position
    ]);
    
    const task = result.rows[0];
    
    // Create initial system message
    await getDbPool().query(`
      INSERT INTO task_messages (task_id, sender_id, content, message_type, is_system_message, tenant_id)
      VALUES ($1, $2, $3, 'SYSTEM', true, $4)
    `, [task.id, userId, `Task created by ${req.user.username}`, tenantId]);
    
    // Log to audit with tenant isolation
    await logAudit(userId, 'CREATE', 'workflow_tasks', task.id, null, task, tenantId);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:created', { task });
    
    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    });
    
  } catch (error) {
    console.error('[TaskController] createTask error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  }
};

/**
 * PUT /api/v2/tasks/:id
 * Update task
 */
const updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const {
      title,
      description,
      assigneeId,
      priority,
      dueDate,
      progress,
      tags
    } = req.body;
    
    // Get existing task with tenant isolation
    let existingQuery = 'SELECT * FROM workflow_tasks WHERE id = $1';
    const existingParams = [id];
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      existingQuery += ' AND tenant_id = $2';
      existingParams.push(tenantId);
    }
    
    const existingResult = await getDbPool().query(existingQuery, existingParams);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const existingTask = existingResult.rows[0];
    
    // Check permission (creator or assignee can edit)
    if (existingTask.creator_id !== userId && existingTask.assignee_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this task'
      });
    }
    
    // Build update query
    const updates = [];
    const values = [];
    let paramCount = 0;
    
    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }
    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }
    if (assigneeId !== undefined) {
      paramCount++;
      updates.push(`assignee_id = $${paramCount}`);
      values.push(assigneeId);
    }
    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      values.push(priority.toUpperCase());
    }
    if (dueDate !== undefined) {
      paramCount++;
      updates.push(`due_date = $${paramCount}`);
      values.push(dueDate);
    }
    if (progress !== undefined) {
      paramCount++;
      updates.push(`progress = $${paramCount}`);
      values.push(Math.min(100, Math.max(0, parseInt(progress))));
    }
    if (tags !== undefined) {
      paramCount++;
      updates.push(`tags = $${paramCount}`);
      values.push(tags);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }
    
    paramCount++;
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const query = `
      UPDATE workflow_tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await getDbPool().query(query, values);
    const updatedTask = result.rows[0];
    
    // Log to audit with tenant isolation
    await logAudit(userId, 'UPDATE', 'workflow_tasks', id, existingTask, updatedTask, tenantId);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:updated', { task: updatedTask });
    
    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    });
    
  } catch (error) {
    console.error('[TaskController] updateTask error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task'
    });
  }
};

/**
 * PATCH /api/v2/tasks/:id/status
 * Update task status with validation
 */
const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { status, reason } = req.body;
    
    if (!status) {
      return res.status(400).json({
        success: false,
        error: 'Status is required'
      });
    }
    
    // Get existing task with tenant isolation
    let existingQuery = 'SELECT * FROM workflow_tasks WHERE id = $1';
    const existingParams = [id];
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      existingQuery += ' AND tenant_id = $2';
      existingParams.push(tenantId);
    }
    
    const existingResult = await getDbPool().query(existingQuery, existingParams);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const existingTask = existingResult.rows[0];
    // Normalize to uppercase for consistent lookup
    const oldStatus = (existingTask.status || '').toUpperCase();
    let newStatus = status.toUpperCase();
    
    // Map legacy status names to canonical names
    const statusAliasMap = {
      'DONE': 'COMPLETED',
      'TODO': 'OPEN',
      'PENDING': 'OPEN'
    };
    const canonicalNewStatus = statusAliasMap[newStatus] || newStatus;
    
    // Check if transition is valid (check both the requested status and canonical status)
    const allowedTransitions = validTransitions[oldStatus] || [];
    if (!allowedTransitions.includes(newStatus) && !allowedTransitions.includes(canonicalNewStatus) && oldStatus !== newStatus) {
      // Log blocked transition for audit
      console.log(`[Audit] Status transition blocked: user=${userId}, task=${id}, from=${oldStatus}, to=${newStatus}`);
      
      return res.status(409).json({
        success: false,
        error: 'Invalid status transition',
        message: `Cannot change status from "${oldStatus}" to "${newStatus}". ${
          allowedTransitions.length > 0 
            ? `Allowed transitions from ${oldStatus}: ${allowedTransitions.join(', ')}`
            : `Status "${oldStatus}" does not allow any transitions. Please check the task workflow rules.`
        }`,
        currentStatus: oldStatus,
        requestedStatus: newStatus,
        allowedTransitions,
        hint: 'See API docs for workflow transition rules'
      });
    }
    
    // Use canonical status for database storage
    newStatus = canonicalNewStatus;
    
    // Check permission
    const isCreator = existingTask.creator_id === userId;
    const isAssignee = existingTask.assignee_id === userId;
    
    // Only assignee can mark as complete, only creator can cancel
    if (newStatus === 'COMPLETED' && !isAssignee) {
      return res.status(403).json({
        success: false,
        error: 'Only the assignee can mark the task as completed'
      });
    }
    
    if (newStatus === 'CANCELLED' && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can cancel the task'
      });
    }
    
    // Update status
    const completedAt = newStatus === 'COMPLETED' ? 'NOW()' : 'completed_at';
    const query = `
      UPDATE workflow_tasks
      SET status = $1, 
          updated_at = NOW(),
          completed_at = ${newStatus === 'COMPLETED' ? 'NOW()' : 'completed_at'}
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await getDbPool().query(query, [newStatus, id]);
    const updatedTask = result.rows[0];
    
    // Create status change message
    const messageText = reason 
      ? `Status changed from ${oldStatus} to ${newStatus}. Reason: ${reason}`
      : `Status changed from ${oldStatus} to ${newStatus}`;
    
    await getDbPool().query(`
      INSERT INTO task_messages (task_id, sender_id, content, message_type, is_system_message, tenant_id)
      VALUES ($1, $2, $3, 'STATUS_CHANGE', true, $4)
    `, [id, userId, messageText, tenantId]);
    
    // Log to audit with tenant isolation
    await logAudit(userId, 'STATUS_CHANGE', 'workflow_tasks', id, { status: oldStatus }, { status: newStatus, reason }, tenantId);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:updated', { 
      task: updatedTask,
      change: { type: 'status', from: oldStatus, to: newStatus }
    });
    
    res.json({
      success: true,
      data: updatedTask,
      message: `Task status updated to ${newStatus}`
    });
    
  } catch (error) {
    console.error('[TaskController] updateTaskStatus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task status'
    });
  }
};

/**
 * PATCH /api/v2/tasks/:id/position
 * Update task position (for drag-and-drop)
 */
const updateTaskPosition = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { position, status } = req.body;
    
    // Get existing task with tenant isolation
    let existingQuery = 'SELECT * FROM workflow_tasks WHERE id = $1';
    const existingParams = [id];
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      existingQuery += ' AND tenant_id = $2';
      existingParams.push(tenantId);
    }
    
    const existingResult = await getDbPool().query(existingQuery, existingParams);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const existingTask = existingResult.rows[0];
    const oldStatus = existingTask.status;
    const newStatus = status || oldStatus;
    
    // Update position and optionally status (include tenant_id in WHERE for safety)
    let updateQuery = `
      UPDATE workflow_tasks
      SET position = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3
    `;
    const updateParams = [position, newStatus, id];
    
    if (tenantId) {
      updateQuery = updateQuery.replace('WHERE id = $3', 'WHERE id = $3 AND tenant_id = $4');
      updateParams.push(tenantId);
    }
    
    updateQuery += ' RETURNING *';
    
    const result = await getDbPool().query(updateQuery, updateParams);
    const updatedTask = result.rows[0];
    
    // If status changed, create message
    if (oldStatus !== newStatus) {
      await getDbPool().query(`
        INSERT INTO task_messages (task_id, sender_id, content, message_type, is_system_message, tenant_id)
        VALUES ($1, $2, $3, 'STATUS_CHANGE', true, $4)
      `, [id, userId, `Task moved from ${oldStatus} to ${newStatus}`, tenantId]);
    }
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:moved', { 
      taskId: id,
      task: updatedTask,
      fromStatus: oldStatus,
      toStatus: newStatus,
      position
    });
    
    res.json({
      success: true,
      data: updatedTask
    });
    
  } catch (error) {
    console.error('[TaskController] updateTaskPosition error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task position'
    });
  }
};

/**
 * DELETE /api/v2/tasks/:id
 * Soft delete (archive) task
 */
const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    // Get existing task with tenant isolation
    let existingQuery = 'SELECT * FROM workflow_tasks WHERE id = $1';
    const existingParams = [id];
    
    // CRITICAL: Always filter by tenant_id for data isolation
    if (tenantId) {
      existingQuery += ' AND tenant_id = $2';
      existingParams.push(tenantId);
    }
    
    const existingResult = await getDbPool().query(existingQuery, existingParams);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const existingTask = existingResult.rows[0];
    
    // Only creator can delete
    if (existingTask.creator_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Only the task creator can delete this task'
      });
    }
    
    // Soft delete (archive) with tenant isolation
    let deleteQuery = `
      UPDATE workflow_tasks
      SET is_archived = TRUE,
          archived_at = NOW(),
          status = 'ARCHIVED',
          updated_at = NOW()
      WHERE id = $1
    `;
    const deleteParams = [id];
    
    if (tenantId) {
      deleteQuery = deleteQuery.replace('WHERE id = $1', 'WHERE id = $1 AND tenant_id = $2');
      deleteParams.push(tenantId);
    }
    
    await getDbPool().query(deleteQuery, deleteParams);
    
    // Log to audit with tenant isolation
    await logAudit(userId, 'DELETE', 'workflow_tasks', id, existingTask, { archived: true }, tenantId);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:deleted', { taskId: id });
    
    res.json({
      success: true,
      message: 'Task archived successfully'
    });
    
  } catch (error) {
    console.error('[TaskController] deleteTask error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete task'
    });
  }
};

// ============================================
// MESSAGES/COMMENTS
// ============================================

/**
 * GET /api/v2/tasks/:id/messages
 * Get task messages/comments
 */
const getTaskMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const { limit = 50, before } = req.query;
    
    let query = `
      SELECT 
        m.*,
        u.username as sender_name,
        u.email as sender_email,
        u.profile_pic_url as sender_avatar
      FROM task_messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.task_id = $1
    `;
    
    const params = [id];
    let paramCount = 1;
    
    // CRITICAL: Filter by tenant_id for data isolation
    if (tenantId) {
      paramCount++;
      query += ` AND m.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }
    
    if (before) {
      paramCount++;
      query += ` AND m.id < $${paramCount}`;
      params.push(parseInt(before));
    }
    
    query += ` ORDER BY m.created_at DESC`;
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));
    
    const result = await getDbPool().query(query, params);
    
    // Reverse to show oldest first
    const messages = result.rows.reverse();
    
    res.json({
      success: true,
      data: messages,
      pagination: {
        hasMore: result.rows.length === parseInt(limit),
        nextCursor: result.rows.length > 0 ? result.rows[0].id : null
      }
    });
    
  } catch (error) {
    console.error('[TaskController] getTaskMessages error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
};

/**
 * POST /api/v2/tasks/:id/messages
 * Add message/comment to task
 */
const createTaskMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    const { content, replyToId } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Message content is required'
      });
    }
    
    const query = `
      INSERT INTO task_messages (task_id, sender_id, content, message_type, reply_to_id, tenant_id)
      VALUES ($1, $2, $3, 'TEXT', $4, $5)
      RETURNING *
    `;
    
    const result = await getDbPool().query(query, [
      id,
      userId,
      content.trim(),
      replyToId || null,
      tenantId
    ]);
    
    const message = result.rows[0];
    
    // Get sender info
    const senderResult = await getDbPool().query(
      'SELECT username, email, profile_pic_url FROM users WHERE id = $1',
      [userId]
    );
    
    message.sender_name = senderResult.rows[0]?.username;
    message.sender_email = senderResult.rows[0]?.email;
    message.sender_avatar = senderResult.rows[0]?.profile_pic_url;
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:commentAdded', { 
      taskId: id,
      message 
    });
    
    res.status(201).json({
      success: true,
      data: message
    });
    
  } catch (error) {
    console.error('[TaskController] createTaskMessage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create message'
    });
  }
};

// ============================================
// ATTACHMENTS
// ============================================

/**
 * GET /api/v2/tasks/:id/attachments
 * Get task attachments
 */
const getTaskAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    
    let query = `
      SELECT 
        a.*,
        u.username as uploader_name
      FROM task_attachments a
      JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = $1
    `;
    
    const params = [id];
    let paramCount = 1;
    
    // CRITICAL: Filter by tenant_id for data isolation
    if (tenantId) {
      paramCount++;
      query += ` AND a.tenant_id = $${paramCount}`;
      params.push(tenantId);
    }
    
    query += ` ORDER BY a.created_at DESC`;
    
    const result = await getDbPool().query(query, params);
    
    res.json({
      success: true,
      data: result.rows
    });
    
  } catch (error) {
    console.error('[TaskController] getTaskAttachments error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachments'
    });
  }
};

/**
 * POST /api/v2/tasks/:id/attachments
 * Upload attachment to task
 */
const uploadTaskAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }
    
    const file = req.file;
    
    const query = `
      INSERT INTO task_attachments (
        task_id, tenant_id, filename, original_name, 
        file_url, file_type, file_size, mime_type,
        storage_provider, storage_key, uploaded_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const fileUrl = `/uploads/tasks/${id}/${file.filename}`;
    
    const result = await getDbPool().query(query, [
      id,
      tenantId,
      file.filename,
      file.originalname,
      fileUrl,
      path.extname(file.originalname).toLowerCase(),
      file.size,
      file.mimetype,
      'LOCAL',
      file.path,
      userId
    ]);
    
    const attachment = result.rows[0];
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:attachmentAdded', { 
      taskId: id,
      attachment 
    });
    
    res.status(201).json({
      success: true,
      data: attachment
    });
    
  } catch (error) {
    console.error('[TaskController] uploadTaskAttachment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload attachment'
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log audit trail
 * @param {number} userId - User performing the action
 * @param {string} action - Action type: CREATE, UPDATE, DELETE, STATUS_CHANGE, etc.
 * @param {string} tableName - Table being modified
 * @param {string|number} recordId - ID of the record being modified
 * @param {object} oldValues - Previous values (null for CREATE)
 * @param {object} newValues - New values (null for DELETE)
 * @param {number} tenantId - Tenant ID for data isolation
 */
const logAudit = async (userId, action, tableName, recordId, oldValues, newValues, tenantId = null) => {
  try {
    await getDbPool().query(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_values, new_values, tenant_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      userId, 
      action, 
      tableName, 
      recordId ? String(recordId) : null, 
      oldValues ? JSON.stringify(oldValues) : null, 
      newValues ? JSON.stringify(newValues) : null,
      tenantId
    ]);
  } catch (error) {
    // Don't fail the main operation if audit logging fails, but log the error
    console.error('[Audit] Failed to log:', error.message);
  }
};

// ============================================
// EXPORTS
// ============================================

module.exports = {
  // Task CRUD
  listTasks,
  getKanbanTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  updateTaskPosition,
  deleteTask,
  
  // Messages
  getTaskMessages,
  createTaskMessage,
  
  // Attachments
  getTaskAttachments,
  uploadTaskAttachment,
  
  // Socket.IO
  setSocketIO,
  
  // Enums
  TaskStatus,
  TaskPriority
};
