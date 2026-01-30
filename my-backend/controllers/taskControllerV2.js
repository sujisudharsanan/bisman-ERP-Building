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

// Lazy pool getter
const getDbPool = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

/**
 * Resolve user ID (UUID to legacy integer ID)
 * The workflow_tasks table uses integer user IDs, but auth returns UUID.
 * This helper looks up the legacy_id from users_enhanced for UUID users.
 */
const resolveUserId = async (rawId, client = null) => {
  if (!rawId) return null;
  
  // If it's already a valid integer, return it
  const parsedInt = parseInt(rawId);
  if (!isNaN(parsedInt) && parsedInt > 0 && String(parsedInt) === String(rawId)) {
    return parsedInt;
  }
  
  // Check if it's a UUID (36 char format with dashes)
  const isUUID = typeof rawId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId);
  
  if (isUUID) {
    try {
      // Look up legacy_id from users_enhanced table
      const pool = client || getDbPool();
      const result = await pool.query(
        'SELECT legacy_id FROM users_enhanced WHERE id = $1',
        [rawId]
      );
      if (result.rows.length > 0 && result.rows[0].legacy_id) {
        return result.rows[0].legacy_id;
      }
      console.warn(`[resolveUserId] UUID ${rawId} has no legacy_id mapping`);
    } catch (e) {
      console.error('[resolveUserId] Lookup failed:', e.message);
    }
    return null;
  }
  
  return null;
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
  ARCHIVED: 'ARCHIVED',
  // Cancel flow statuses
  CANCEL_REQUESTED: 'CANCEL_REQUESTED',
  // Clarification flow status
  WAITING_FOR_CLARIFICATION: 'WAITING_FOR_CLARIFICATION'
};

// Task Priority enum
const TaskPriority = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
  CRITICAL: 'CRITICAL'
};

// Valid status transitions (including cancel flow and clarification)
const validTransitions = {
  [TaskStatus.DRAFT]: [TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.CANCELLED],
  [TaskStatus.OPEN]: [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.CANCEL_REQUESTED, TaskStatus.WAITING_FOR_CLARIFICATION],
  [TaskStatus.ASSIGNED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.OPEN, TaskStatus.CANCEL_REQUESTED, TaskStatus.WAITING_FOR_CLARIFICATION],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.IN_REVIEW, TaskStatus.BLOCKED, TaskStatus.COMPLETED, TaskStatus.CANCELLED, TaskStatus.CANCEL_REQUESTED, TaskStatus.WAITING_FOR_CLARIFICATION, 'DONE'],
  [TaskStatus.IN_REVIEW]: [TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED, TaskStatus.BLOCKED, TaskStatus.CANCEL_REQUESTED, TaskStatus.WAITING_FOR_CLARIFICATION, 'DONE'],
  [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED, TaskStatus.CANCEL_REQUESTED, TaskStatus.WAITING_FOR_CLARIFICATION],
  [TaskStatus.COMPLETED]: [TaskStatus.ARCHIVED],
  [TaskStatus.CANCELLED]: [TaskStatus.ARCHIVED],
  [TaskStatus.ARCHIVED]: [],
  // Cancel request can be acknowledged (approved) or rejected (back to previous)
  [TaskStatus.CANCEL_REQUESTED]: [TaskStatus.CANCELLED, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.OPEN],
  // Clarification: can return to any active status (controlled by clarification service)
  [TaskStatus.WAITING_FOR_CLARIFICATION]: [TaskStatus.OPEN, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW, TaskStatus.BLOCKED],
  // Legacy/Alternative status names (for backward compatibility)
  'TODO': [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  'PENDING': [TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
  'DONE': [TaskStatus.ARCHIVED],
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
    // Resolve UUID to legacy integer ID for queries
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
    // Resolve UUID to legacy integer ID for queries
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
    const tenantId = req.user.tenant_id;
    const { viewMode = 'all' } = req.query; // 'all', 'my-work', 'my-requests'
    
    console.log('[Kanban] Request:', { rawUserId, userId, tenantId, viewMode, role: req.user.role });
    
    // Build query with mandatory tenant isolation - include UUIDs for frontend comparison
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        assignee.username as assignee_name,
        creator_enh.id as creator_uuid,
        assignee_enh.id as assignee_uuid,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users_enhanced creator_enh ON creator_enh.legacy_id = t.creator_id
      LEFT JOIN users_enhanced assignee_enh ON assignee_enh.legacy_id = t.assignee_id
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
    
    // View mode filtering for Maker-Checker dual view
    paramCount++;
    if (viewMode === 'my-work') {
      // Assignee view: Tasks I need to work on
      query += ` AND t.assignee_id = $${paramCount}`;
      params.push(userId);
    } else if (viewMode === 'my-requests') {
      // Creator view: Tasks I created and need to review/track
      query += ` AND t.creator_id = $${paramCount}`;
      params.push(userId);
    } else {
      // Default: all tasks user is involved in
      query += ` AND (
        t.creator_id = $${paramCount}
        OR t.assignee_id = $${paramCount}
        OR EXISTS (SELECT 1 FROM task_participants tp WHERE tp.task_id = t.id AND tp.user_id = $${paramCount})
      )`;
      params.push(userId);
    }
    
    query += ` ORDER BY t.position ASC, t.created_at DESC`;
    
    console.log('[Kanban] Query params:', params);
    const result = await getDbPool().query(query, params);
    console.log('[Kanban] Query returned', result.rows.length, 'rows');
    if (result.rows.length > 0) {
      console.log('[Kanban] First task:', result.rows[0].id, result.rows[0].title, result.rows[0].status);
    }
    
    // Group by status for Kanban with Maker-Checker awareness
    const grouped = {
      ASSIGNED: [],
      IN_PROGRESS: [],
      IN_REVIEW: [],
      EDITING: [],
      DONE: []
    };
    
    // Helper for ID comparison (supports both UUID and legacy integer)
    const normalizeId = (id) => (id != null ? String(id) : '');
    
    result.rows.forEach(task => {
      // Compare using UUIDs first, then fallback to legacy IDs
      const creatorUuid = task.creator_uuid;
      const assigneeUuid = task.assignee_uuid;
      const isCreator = normalizeId(rawUserId) === normalizeId(creatorUuid) || 
                        normalizeId(userId) === normalizeId(task.creator_id);
      const isAssignee = normalizeId(rawUserId) === normalizeId(assigneeUuid) || 
                         normalizeId(userId) === normalizeId(task.assignee_id);
      
      // Replace task IDs with UUIDs for frontend
      task.creator_id = creatorUuid || task.creator_id;
      task.assignee_id = assigneeUuid || task.assignee_id;
      
      // Determine available actions based on maker-checker state machine
      const availableActions = [];
      if (isAssignee) {
        if (['ASSIGNED', 'OPEN', 'DRAFT'].includes(task.status)) availableActions.push('START_WORK');
        if (task.status === 'IN_PROGRESS') availableActions.push('SUBMIT_FOR_REVIEW');
        if (task.status === 'EDITING') availableActions.push('RESUBMIT');
      }
      if (isCreator) {
        if (task.status === 'IN_REVIEW') {
          availableActions.push('APPROVE', 'REJECT');
        }
      }
      
      // Add role and action info
      task.statusInfo = {
        isCreator,
        isAssignee,
        availableActions,
        canComplete: isCreator && task.status === 'IN_REVIEW',
        canReject: isCreator && task.status === 'IN_REVIEW',
        canSubmitForReview: isAssignee && task.status === 'IN_PROGRESS',
        canStartWork: isAssignee && ['ASSIGNED', 'OPEN', 'DRAFT'].includes(task.status)
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
      
      // Group by status - Maker-Checker friendly
      const status = task.status?.toUpperCase();
      if (['DRAFT', 'OPEN', 'ASSIGNED'].includes(status)) {
        grouped.ASSIGNED.push(task);
      } else if (status === 'IN_PROGRESS') {
        grouped.IN_PROGRESS.push(task);
      } else if (status === 'IN_REVIEW') {
        grouped.IN_REVIEW.push(task);
      } else if (status === 'EDITING' || status === 'BLOCKED') {
        grouped.EDITING.push(task);
      } else if (['COMPLETED', 'DONE'].includes(status)) {
        grouped.DONE.push(task);
      }
    });
    
    res.json({
      success: true,
      data: grouped,
      viewMode,
      meta: {
        totalTasks: result.rows.length,
        columns: Object.keys(grouped).map(k => ({ key: k, count: grouped[k].length }))
      }
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
    // Get raw user ID (could be UUID or legacy integer)
    const rawUserId = req.user.id;
    const tenantId = req.user.tenant_id;
    
    // Build query with tenant isolation - join to users_enhanced for UUID support
    let query = `
      SELECT 
        t.*,
        creator.username as creator_name,
        creator.email as creator_email,
        assignee.username as assignee_name,
        assignee.email as assignee_email,
        creator_enh.id as creator_uuid,
        assignee_enh.id as assignee_uuid,
        (SELECT COUNT(*) FROM task_messages WHERE task_id = t.id) as message_count,
        (SELECT COUNT(*) FROM task_attachments WHERE task_id = t.id) as attachment_count
      FROM workflow_tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      LEFT JOIN users_enhanced creator_enh ON creator_enh.legacy_id = t.creator_id
      LEFT JOIN users_enhanced assignee_enh ON assignee_enh.legacy_id = t.assignee_id
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
    
    // Resolve user ID for permission checks - use UUID from users_enhanced if available
    const userUuid = rawUserId; // The request user ID (could be UUID)
    const userCreatorUuid = task.creator_uuid;
    const userAssigneeUuid = task.assignee_uuid;
    
    // Compare using string for UUIDs, fallback to legacy integer comparison
    const normalizeId = (id) => (id != null ? String(id) : '');
    
    // Check permission - compare UUIDs first, then legacy IDs
    const isCreator = normalizeId(userUuid) === normalizeId(userCreatorUuid) || 
                      normalizeId(userUuid) === normalizeId(task.creator_id);
    const isAssignee = normalizeId(userUuid) === normalizeId(userAssigneeUuid) || 
                       normalizeId(userUuid) === normalizeId(task.assignee_id);
    const hasAccess = isCreator || isAssignee || 
                      normalizeId(userUuid) === normalizeId(task.approver_id);
    
    if (!hasAccess) {
      // Check if participant
      const participantCheck = await getDbPool().query(
        'SELECT 1 FROM task_participants WHERE task_id = $1 AND user_id = $2',
        [id, task.creator_id] // Use legacy ID for participant check
      );
      
      if (participantCheck.rows.length === 0) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }
    }
    
    // Use UUID for creator_id and assignee_id in response (for frontend comparison)
    task.creator_id = userCreatorUuid || task.creator_id;
    task.assignee_id = userAssigneeUuid || task.assignee_id;
    
    task.statusInfo = {
      isCreator,
      isAssignee,
      canComplete: isAssignee && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status),
      canCancel: isCreator && !['COMPLETED', 'DONE', 'CANCELLED'].includes(task.status)
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
    const tenantId = req.user.tenant_id;
    const {
      title,
      description,
      assigneeId: rawAssigneeId,
      priority = 'MEDIUM',
      dueDate,
      status: rawStatus = 'OPEN',
      tags = [],
      skipHierarchyCheck = false  // Allow bypassing for system-created tasks
    } = req.body;
    
    // Resolve assignee UUID to integer if needed
    const assigneeId = rawAssigneeId ? (await resolveUserId(rawAssigneeId) || rawAssigneeId) : null;
    
    // ============================================
    // HIERARCHY CHECK: Check if assigning to a higher-level user
    // Allow task creation but with warning and no priority for upward assignment
    // ============================================
    let isUpwardAssignment = false;
    let hierarchyWarning = null;
    let finalPriority = priority.toUpperCase();
    
    if (assigneeId && !skipHierarchyCheck) {
      try {
        const taskRequestService = require('../services/taskRequestService');
        const hierarchyCheck = await taskRequestService.checkAssignmentHierarchy(userId, assigneeId);
        
        if (hierarchyCheck.requiresRequest) {
          // Instead of blocking, allow with warning and no priority
          isUpwardAssignment = true;
          finalPriority = null; // No priority for upward assignments
          hierarchyWarning = `Note: You are assigning a task to ${hierarchyCheck.assigneeRoleName} (higher level). Priority has been removed. The assignee will decide the priority.`;
          console.log(`[HIERARCHY] Upward assignment: ${hierarchyCheck.creatorRoleName} (L${hierarchyCheck.creatorLevel}) → ${hierarchyCheck.assigneeRoleName} (L${hierarchyCheck.assigneeLevel})`);
        }
      } catch (hierarchyError) {
        // Log the error but allow task creation with warning
        console.warn('[HIERARCHY] Hierarchy check failed, allowing task creation with warning:', hierarchyError.message);
        hierarchyWarning = 'Unable to verify role hierarchy. Task created without priority enforcement.';
        finalPriority = null;
      }
    }
    
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
        is_upward_assignment,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await getDbPool().query(query, [
      title,
      description,
      status,
      finalPriority, // Use finalPriority (null for upward assignments)
      userId,
      assigneeId || null,
      tenantId || null,
      dueDate || null,
      tags,
      serialNumber,
      position,
      isUpwardAssignment // Track if this was an upward assignment
    ]);
    
    const task = result.rows[0];
    
    // Create initial system message with upward assignment note if applicable
    let systemMessage = `Task created by ${req.user.username}`;
    if (isUpwardAssignment) {
      systemMessage += ` (Note: This task was assigned to a higher-level role. Priority will be set by assignee.)`;
    }
    await getDbPool().query(`
      INSERT INTO task_messages (task_id, sender_id, content, message_type, is_system_message, tenant_id)
      VALUES ($1, $2, $3, 'SYSTEM', true, $4)
    `, [task.id, userId, systemMessage, tenantId]);
    
    // Log to audit with tenant isolation
    await logAudit(userId, 'CREATE', 'workflow_tasks', task.id, null, task, tenantId);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:created', { task, isUpwardAssignment });
    
    // Return success with warning if upward assignment
    const response = {
      success: true,
      data: task,
      message: isUpwardAssignment 
        ? 'Task created successfully (assigned to higher-level user)' 
        : 'Task created successfully'
    };
    
    if (hierarchyWarning) {
      response.warning = hierarchyWarning;
      response.isUpwardAssignment = true;
    }
    
    res.status(201).json(response);
    
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
    const tenantId = req.user.tenant_id;
    const {
      title,
      description,
      assigneeId: rawAssigneeId,
      priority,
      dueDate,
      progress,
      tags
    } = req.body;
    
    // Resolve assignee UUID if provided
    const assigneeId = rawAssigneeId ? (await resolveUserId(rawAssigneeId) || rawAssigneeId) : undefined;
    
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
    
    // Debug logging for permission checks
    console.log(`[TaskStatus] Permission check: userId=${userId}, creator_id=${existingTask.creator_id}, assignee_id=${existingTask.assignee_id}`);
    console.log(`[TaskStatus] isCreator=${isCreator}, isAssignee=${isAssignee}, oldStatus=${oldStatus}, newStatus=${newStatus}`);
    
    // Permission rules for starting work on a task:
    // - Only the ASSIGNEE can start work (OPEN/ASSIGNED → IN_PROGRESS)
    if (newStatus === 'IN_PROGRESS' && (oldStatus === 'OPEN' || oldStatus === 'ASSIGNED')) {
      if (!isAssignee) {
        return res.status(403).json({
          success: false,
          error: 'Only the assignee can start work on this task'
        });
      }
    }
    
    // Permission rules for completing a task:
    // - If task is IN_REVIEW: Only the CREATOR can approve and complete
    // - If task is IN_PROGRESS: Only the ASSIGNEE can complete directly
    if (newStatus === 'COMPLETED') {
      if (oldStatus === 'IN_REVIEW' && !isCreator) {
        return res.status(403).json({
          success: false,
          error: 'Only the task creator can approve and complete a task that is in review'
        });
      } else if (oldStatus === 'IN_PROGRESS' && !isAssignee) {
        return res.status(403).json({
          success: false,
          error: 'Only the assignee can mark the task as completed directly'
        });
      }
    }
    
    if (newStatus === 'CANCELLED' && !isCreator) {
      return res.status(403).json({
        success: false,
        error: 'Only the creator can cancel the task'
      });
    }
    
    // Update status
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
    
    // Emit Socket.IO events for real-time updates
    // 1. Broadcast to tenant for general updates
    emitToTenant(tenantId, 'task:updated', { 
      task: updatedTask,
      change: { type: 'status', from: oldStatus, to: newStatus }
    });
    
    // 2. Emit status_changed event for specific handling
    emitToTenant(tenantId, 'task:status_changed', { 
      task: updatedTask,
      previousStatus: oldStatus,
      newStatus: newStatus,
      updatedBy: userId
    });
    
    // 3. Specifically notify the creator when task is sent for review
    if (newStatus === 'IN_REVIEW' && io && updatedTask.creator_id) {
      io.to(`user:${updatedTask.creator_id}`).emit('task:review_requested', {
        task: updatedTask,
        requestedBy: userId,
        message: 'A task you created has been submitted for your review'
      });
      console.log(`[Socket] Notified creator ${updatedTask.creator_id} about review request for task ${id}`);
    }
    
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
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
// MAKER-CHECKER STATE TRANSITIONS
// ============================================

/**
 * Maker-Checker valid state transitions
 * OPEN/ASSIGNED → IN_PROGRESS (Assignee)
 * IN_PROGRESS → IN_REVIEW (Assignee submits for review)
 * IN_REVIEW → DONE (Creator approves)
 * IN_REVIEW → EDITING (Creator rejects → returns to IN_PROGRESS)
 */
const makerCheckerTransitions = {
  'OPEN': {
    'IN_PROGRESS': { allowedRoles: ['assignee'], action: 'START_WORK' },
  },
  'ASSIGNED': {
    'IN_PROGRESS': { allowedRoles: ['assignee'], action: 'START_WORK' },
  },
  'IN_PROGRESS': {
    'IN_REVIEW': { allowedRoles: ['assignee'], action: 'SUBMIT_FOR_REVIEW' },
  },
  'IN_REVIEW': {
    'DONE': { allowedRoles: ['creator'], action: 'APPROVE' },
    'IN_PROGRESS': { allowedRoles: ['creator'], action: 'REJECT' }, // Rejection sends back to IN_PROGRESS
  },
  'EDITING': {
    'IN_REVIEW': { allowedRoles: ['assignee'], action: 'RESUBMIT' },
  },
};

/**
 * Log to task_audit table for compliance
 */
const logTaskAudit = async (taskId, actorId, actorName, actorRole, action, fromStatus, toStatus, reason, metadata, tenantId) => {
  try {
    await getDbPool().query(`
      INSERT INTO task_audit (task_id, actor_id, actor_name, actor_role, action, from_status, to_status, reason, metadata, tenant_id, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [taskId, actorId, actorName, actorRole, action, fromStatus, toStatus, reason, metadata ? JSON.stringify(metadata) : null, tenantId]);
  } catch (error) {
    console.error('[TaskAudit] Failed to log:', error.message);
  }
};

/**
 * POST /api/v2/tasks/:id/transition
 * Handle maker-checker state transitions with full validation
 */
const transitionTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    // Resolve UUID to legacy integer ID for database operations
    const rawUserId = req.user.id;
    const userId = await resolveUserId(rawUserId) || rawUserId;
    const userName = req.user.username || req.user.email;
    const userRole = req.user.role;
    const tenantId = req.user.tenant_id;
    const { action, reason, expectedVersion } = req.body;
    
    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
        validActions: ['START_WORK', 'SUBMIT_FOR_REVIEW', 'APPROVE', 'REJECT', 'RESUBMIT']
      });
    }
    
    // Get existing task with tenant isolation
    let taskQuery = 'SELECT * FROM workflow_tasks WHERE id = $1';
    const taskParams = [id];
    
    if (tenantId) {
      taskQuery += ' AND tenant_id = $2';
      taskParams.push(tenantId);
    }
    
    const taskResult = await getDbPool().query(taskQuery, taskParams);
    
    if (taskResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }
    
    const task = taskResult.rows[0];
    const currentStatus = (task.status || '').toUpperCase();
    const currentVersion = task.version || 1;
    
    // Optimistic locking check
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      return res.status(409).json({
        success: false,
        error: 'Conflict: Task was modified by another user',
        currentVersion,
        expectedVersion,
        hint: 'Refresh the task and try again'
      });
    }
    
    // Determine user's role in relation to task
    const isCreator = task.creator_id === userId;
    const isAssignee = task.assignee_id === userId;
    
    // Find the valid transition for the action
    let targetStatus = null;
    let transitionInfo = null;
    const statusTransitions = makerCheckerTransitions[currentStatus];
    
    if (statusTransitions) {
      for (const [toStatus, info] of Object.entries(statusTransitions)) {
        if (info.action === action.toUpperCase()) {
          targetStatus = toStatus;
          transitionInfo = info;
          break;
        }
      }
    }
    
    if (!targetStatus || !transitionInfo) {
      return res.status(400).json({
        success: false,
        error: `Invalid action "${action}" for current status "${currentStatus}"`,
        currentStatus,
        availableActions: statusTransitions 
          ? Object.values(statusTransitions).map(t => t.action)
          : []
      });
    }
    
    // Check role permission
    const userTaskRole = isCreator ? 'creator' : (isAssignee ? 'assignee' : 'other');
    if (!transitionInfo.allowedRoles.includes(userTaskRole)) {
      return res.status(403).json({
        success: false,
        error: `Only ${transitionInfo.allowedRoles.join(' or ')} can perform "${action}"`,
        yourRole: userTaskRole,
        requiredRoles: transitionInfo.allowedRoles
      });
    }
    
    // Rejection requires reason
    if (action.toUpperCase() === 'REJECT' && !reason) {
      return res.status(400).json({
        success: false,
        error: 'Rejection reason is required',
        hint: 'Provide a "reason" field explaining why the task is being rejected'
      });
    }
    
    // Build update query
    const updateFields = [
      'status = $1',
      'previous_status = $2',
      'updated_at = NOW()',
      'updated_by = $3',
      'version = version + 1',
      'last_status_change_at = NOW()'
    ];
    const updateParams = [targetStatus, currentStatus, userId];
    let paramCount = 3;
    
    // Action-specific fields
    if (action.toUpperCase() === 'REJECT') {
      updateFields.push(`rejection_reason = $${++paramCount}`);
      updateParams.push(reason);
      updateFields.push(`rejection_count = COALESCE(rejection_count, 0) + 1`);
    }
    
    if (action.toUpperCase() === 'SUBMIT_FOR_REVIEW' || action.toUpperCase() === 'RESUBMIT') {
      updateFields.push(`submitted_for_review_at = NOW()`);
    }
    
    if (action.toUpperCase() === 'APPROVE') {
      updateFields.push(`review_completed_at = NOW()`);
      updateFields.push(`completed_at = NOW()`);
    }
    
    updateParams.push(id);
    const updateQuery = `
      UPDATE workflow_tasks
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;
    
    const result = await getDbPool().query(updateQuery, updateParams);
    const updatedTask = result.rows[0];
    
    // Log to task_audit table
    await logTaskAudit(
      parseInt(id),
      userId,
      userName,
      userRole,
      action.toUpperCase(),
      currentStatus,
      targetStatus,
      reason || null,
      { expectedVersion, newVersion: updatedTask.version },
      tenantId
    );
    
    // Create system message for status change
    const messageText = reason 
      ? `${userName} ${action.toLowerCase().replace(/_/g, ' ')}: ${currentStatus} → ${targetStatus}. Reason: ${reason}`
      : `${userName} ${action.toLowerCase().replace(/_/g, ' ')}: ${currentStatus} → ${targetStatus}`;
    
    await getDbPool().query(`
      INSERT INTO task_messages (task_id, sender_id, content, message_type, is_system_message, tenant_id)
      VALUES ($1, $2, $3, 'STATUS_CHANGE', true, $4)
    `, [id, userId, messageText, tenantId]);
    
    // Emit Socket.IO event
    emitToTenant(tenantId, 'task:transition', { 
      task: updatedTask,
      transition: {
        action: action.toUpperCase(),
        from: currentStatus,
        to: targetStatus,
        actorId: userId,
        actorName: userName,
        reason
      }
    });
    
    res.json({
      success: true,
      data: updatedTask,
      transition: {
        action: action.toUpperCase(),
        from: currentStatus,
        to: targetStatus
      },
      message: `Task ${action.toLowerCase().replace(/_/g, ' ')} successful`
    });
    
  } catch (error) {
    console.error('[TaskController] transitionTaskStatus error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to transition task status',
      details: error.message
    });
  }
};

/**
 * GET /api/v2/tasks/:id/audit
 * Get audit trail for a task
 */
const getTaskAuditTrail = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id;
    
    let query = `
      SELECT 
        ta.*,
        u.email as actor_email
      FROM task_audit ta
      LEFT JOIN users u ON u.id = ta.actor_id
      WHERE ta.task_id = $1
    `;
    const params = [id];
    
    if (tenantId) {
      query += ' AND ta.tenant_id = $2';
      params.push(tenantId);
    }
    
    query += ' ORDER BY ta.created_at DESC';
    
    const result = await getDbPool().query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
    
  } catch (error) {
    console.error('[TaskController] getTaskAuditTrail error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get task audit trail'
    });
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
  
  // Maker-Checker Transitions
  transitionTaskStatus,
  getTaskAuditTrail,
  
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
