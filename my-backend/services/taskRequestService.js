/**
 * Task Request Service
 * Handles hierarchical task request workflow
 * 
 * Business Rule: Subordinates cannot assign tasks to superiors.
 * They can only send requests that superiors must accept/delegate/reject.
 */

const { getPool } = require('../middleware/database');

// Request Status enum (mirrors DB constraint)
const RequestStatus = {
  REQUESTED: 'REQUESTED',
  NEED_INFO: 'NEED_INFO',
  DEFERRED: 'DEFERRED',
  ACCEPTED: 'ACCEPTED',
  DELEGATED: 'DELEGATED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
};

// Resolution Actions
const ResolutionAction = {
  ACCEPTED: 'ACCEPTED',
  DELEGATED: 'DELEGATED',
  REJECTED: 'REJECTED',
  DEFERRED: 'DEFERRED',
  NEED_INFO: 'NEED_INFO',
  CANCELLED: 'CANCELLED'
};

// Valid state transitions for the request state machine
const validRequestTransitions = {
  [RequestStatus.REQUESTED]: [
    RequestStatus.ACCEPTED,
    RequestStatus.DELEGATED,
    RequestStatus.REJECTED,
    RequestStatus.DEFERRED,
    RequestStatus.NEED_INFO,
    RequestStatus.CANCELLED
  ],
  [RequestStatus.NEED_INFO]: [
    RequestStatus.REQUESTED,  // After clarification provided
    RequestStatus.ACCEPTED,
    RequestStatus.DELEGATED,
    RequestStatus.REJECTED,
    RequestStatus.DEFERRED,
    RequestStatus.CANCELLED
  ],
  [RequestStatus.DEFERRED]: [
    RequestStatus.REQUESTED,  // Re-activate
    RequestStatus.ACCEPTED,
    RequestStatus.DELEGATED,
    RequestStatus.REJECTED,
    RequestStatus.CANCELLED
  ],
  // Terminal states - no transitions allowed
  [RequestStatus.ACCEPTED]: [],
  [RequestStatus.DELEGATED]: [],
  [RequestStatus.REJECTED]: [],
  [RequestStatus.CANCELLED]: []
};

// Lazy pool getter
const getDbPool = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

/**
 * Get user's role level from database
 */
const getUserRoleLevel = async (userId, client = null) => {
  const pool = client || getDbPool();
  const result = await pool.query(`
    SELECT COALESCE(r.level, 0) as level, r.display_name as role_name
    FROM users u
    LEFT JOIN rbac_roles r ON u.role_id = r.id
    WHERE u.id = $1
  `, [userId]);
  
  if (result.rows.length === 0) {
    throw new Error(`User ${userId} not found`);
  }
  
  return {
    level: result.rows[0].level || 0,
    roleName: result.rows[0].role_name || 'Unknown'
  };
};

/**
 * Check if direct task assignment is allowed
 * Returns { canAssignDirectly: boolean, requiresRequest: boolean, reason: string }
 */
const checkAssignmentHierarchy = async (creatorId, assigneeId, client = null) => {
  if (!assigneeId) {
    return {
      canAssignDirectly: true,
      requiresRequest: false,
      reason: 'No assignee specified'
    };
  }
  
  if (creatorId === assigneeId) {
    return {
      canAssignDirectly: true,
      requiresRequest: false,
      reason: 'Self-assignment allowed'
    };
  }
  
  const creatorRole = await getUserRoleLevel(creatorId, client);
  const assigneeRole = await getUserRoleLevel(assigneeId, client);
  
  // Creator can directly assign if their level >= assignee's level
  if (creatorRole.level >= assigneeRole.level) {
    return {
      canAssignDirectly: true,
      requiresRequest: false,
      reason: `Direct assignment allowed (${creatorRole.roleName} → ${assigneeRole.roleName})`,
      creatorLevel: creatorRole.level,
      assigneeLevel: assigneeRole.level
    };
  }
  
  // Subordinate trying to assign to superior - requires request
  return {
    canAssignDirectly: false,
    requiresRequest: true,
    reason: `Request-based workflow required. ${creatorRole.roleName} (L${creatorRole.level}) cannot directly assign to ${assigneeRole.roleName} (L${assigneeRole.level})`,
    creatorLevel: creatorRole.level,
    assigneeLevel: assigneeRole.level,
    creatorRoleName: creatorRole.roleName,
    assigneeRoleName: assigneeRole.roleName
  };
};

/**
 * Create a task request (subordinate → superior)
 */
const createTaskRequest = async (requestData, actorInfo, client = null) => {
  const pool = client || getDbPool();
  
  const {
    title,
    description,
    priority = 'MEDIUM',
    suggestedDueDate,
    requestedTo,
    tags = [],
    tenantId
  } = requestData;
  
  const { userId, ipAddress, userAgent, sessionId } = actorInfo;
  
  // Validate hierarchy
  const hierarchyCheck = await checkAssignmentHierarchy(userId, requestedTo, pool);
  
  if (!hierarchyCheck.requiresRequest) {
    throw new Error('Direct assignment is allowed for this user combination. Use normal task creation.');
  }
  
  // Generate request number
  const requestNumber = await generateRequestNumber(pool);
  
  // Create the request
  const result = await pool.query(`
    INSERT INTO task_requests (
      request_number, title, description, priority, suggested_due_date,
      requested_by, requested_to,
      requester_role_level, target_role_level,
      status, tags, tenant_id,
      created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    RETURNING *
  `, [
    requestNumber,
    title,
    description,
    priority.toUpperCase(),
    suggestedDueDate || null,
    userId,
    requestedTo,
    hierarchyCheck.creatorLevel,
    hierarchyCheck.assigneeLevel,
    RequestStatus.REQUESTED,
    tags,
    tenantId
  ]);
  
  const request = result.rows[0];
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId: request.id,
    actorId: userId,
    action: 'REQUEST_CREATED',
    actionCategory: 'CREATE',
    newStatus: RequestStatus.REQUESTED,
    reason: `Request sent to ${hierarchyCheck.assigneeRoleName}`,
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  });
  
  // Create system message
  await pool.query(`
    INSERT INTO task_request_messages (
      request_id, sender_id, content, message_type, is_system_message, tenant_id
    )
    VALUES ($1, $2, $3, 'SYSTEM', true, $4)
  `, [
    request.id,
    userId,
    `Task request submitted for approval`,
    tenantId
  ]);
  
  return {
    success: true,
    request,
    message: 'Task request submitted successfully. Awaiting approval from superior.'
  };
};

/**
 * Generate unique request number
 */
const generateRequestNumber = async (pool) => {
  const result = await pool.query(`SELECT generate_request_number() as num`);
  return result.rows[0].num;
};

/**
 * Get task requests for a user
 * @param userId - The user ID
 * @param type - 'inbox' (received) or 'outbox' (sent)
 */
const getRequestsForUser = async (userId, type = 'inbox', filters = {}, tenantId = null) => {
  const pool = getDbPool();
  
  let query;
  const params = [userId];
  let paramCount = 1;
  
  if (type === 'inbox') {
    // Requests received by this user (as superior)
    query = `
      SELECT 
        r.*,
        requester.username AS requester_name,
        requester.email AS requester_email,
        requester_role.display_name AS requester_role,
        (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count,
        (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id AND NOT ($1 = ANY(read_by))) AS unread_count
      FROM task_requests r
      LEFT JOIN users requester ON r.requested_by = requester.id
      LEFT JOIN rbac_roles requester_role ON requester.role_id = requester_role.id
      WHERE r.requested_to = $1
    `;
  } else {
    // Requests sent by this user (as subordinate)
    query = `
      SELECT 
        r.*,
        target.username AS target_name,
        target.email AS target_email,
        target_role.display_name AS target_role,
        (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
      FROM task_requests r
      LEFT JOIN users target ON r.requested_to = target.id
      LEFT JOIN rbac_roles target_role ON target.role_id = target_role.id
      WHERE r.requested_by = $1
    `;
  }
  
  // Tenant filter
  if (tenantId) {
    paramCount++;
    query += ` AND r.tenant_id = $${paramCount}`;
    params.push(tenantId);
  }
  
  // Status filter
  if (filters.status) {
    const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
    paramCount++;
    query += ` AND r.status = ANY($${paramCount}::text[])`;
    params.push(statuses);
  } else if (type === 'inbox') {
    // Default: show pending requests for inbox
    query += ` AND r.status IN ('REQUESTED', 'NEED_INFO')`;
  }
  
  // Priority filter
  if (filters.priority) {
    paramCount++;
    query += ` AND r.priority = $${paramCount}`;
    params.push(filters.priority.toUpperCase());
  }
  
  // Order by priority and date
  query += `
    ORDER BY 
      CASE r.priority 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'URGENT' THEN 2 
        WHEN 'HIGH' THEN 3 
        WHEN 'MEDIUM' THEN 4 
        ELSE 5 
      END,
      r.created_at DESC
  `;
  
  // Pagination
  if (filters.limit) {
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(filters.limit));
  }
  
  if (filters.offset) {
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(filters.offset));
  }
  
  const result = await pool.query(query, params);
  
  return {
    success: true,
    requests: result.rows,
    type,
    count: result.rows.length
  };
};

/**
 * Get single request by ID
 */
const getRequestById = async (requestId, userId, tenantId = null) => {
  const pool = getDbPool();
  
  let query = `
    SELECT 
      r.*,
      requester.username AS requester_name,
      requester.email AS requester_email,
      requester_role.display_name AS requester_role,
      target.username AS target_name,
      target.email AS target_email,
      target_role.display_name AS target_role,
      (SELECT COUNT(*) FROM task_request_messages WHERE request_id = r.id) AS message_count
    FROM task_requests r
    LEFT JOIN users requester ON r.requested_by = requester.id
    LEFT JOIN rbac_roles requester_role ON requester.role_id = requester_role.id
    LEFT JOIN users target ON r.requested_to = target.id
    LEFT JOIN rbac_roles target_role ON target.role_id = target_role.id
    WHERE r.id = $1
  `;
  
  const params = [requestId];
  
  if (tenantId) {
    query += ` AND r.tenant_id = $2`;
    params.push(tenantId);
  }
  
  const result = await pool.query(query, params);
  
  if (result.rows.length === 0) {
    return { success: false, error: 'Request not found' };
  }
  
  const request = result.rows[0];
  
  // Check access - only requester or target can view
  if (request.requested_by !== userId && request.requested_to !== userId) {
    // Check if watcher
    if (!request.watcher_ids?.includes(userId)) {
      return { success: false, error: 'Access denied' };
    }
  }
  
  // Determine available actions based on role
  const isRequester = request.requested_by === userId;
  const isTarget = request.requested_to === userId;
  
  const availableActions = [];
  
  if (isTarget && ['REQUESTED', 'NEED_INFO'].includes(request.status)) {
    availableActions.push('ACCEPT', 'DELEGATE', 'REJECT', 'DEFER', 'ASK_CLARIFICATION');
  }
  
  if (isRequester && request.status === 'NEED_INFO') {
    availableActions.push('PROVIDE_CLARIFICATION');
  }
  
  if (isRequester && ['REQUESTED', 'NEED_INFO', 'DEFERRED'].includes(request.status)) {
    availableActions.push('CANCEL');
  }
  
  return {
    success: true,
    request,
    permissions: {
      isRequester,
      isTarget,
      canModify: isTarget && !['ACCEPTED', 'DELEGATED', 'REJECTED', 'CANCELLED'].includes(request.status),
      availableActions
    }
  };
};

/**
 * Accept request and convert to task
 */
const acceptRequest = async (requestId, actorInfo, options = {}) => {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { userId, ipAddress, userAgent, sessionId, tenantId } = actorInfo;
    
    // Get request with lock
    const requestResult = await client.query(
      'SELECT * FROM task_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      throw new Error('Request not found');
    }
    
    const request = requestResult.rows[0];
    
    // Validate actor is the target
    if (request.requested_to !== userId) {
      throw new Error('Only the assigned superior can accept this request');
    }
    
    // Validate status allows acceptance
    if (!validRequestTransitions[request.status]?.includes(RequestStatus.ACCEPTED)) {
      throw new Error(`Cannot accept request in status: ${request.status}`);
    }
    
    // Create the actual task
    const serialResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(serial_number FROM 5) AS INTEGER)), 0) + 1 as next_serial
      FROM workflow_tasks
      WHERE serial_number LIKE 'TSK-%'
    `);
    const nextSerial = serialResult.rows[0]?.next_serial || 1;
    const serialNumber = `TSK-${String(nextSerial).padStart(5, '0')}`;
    
    const taskResult = await client.query(`
      INSERT INTO workflow_tasks (
        title, description, status, priority,
        creator_id, assignee_id, tenant_id,
        due_date, tags, serial_number,
        source_request_id,
        created_at, updated_at
      )
      VALUES ($1, $2, 'ASSIGNED', $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      request.title,
      request.description,
      request.priority,
      request.requested_by,  // Original requester becomes creator
      userId,                // Superior (acceptor) becomes assignee
      tenantId || request.tenant_id,
      request.suggested_due_date,
      request.tags,
      serialNumber,
      request.id
    ]);
    
    const task = taskResult.rows[0];
    
    // Add requester as watcher
    await client.query(`
      INSERT INTO task_participants (task_id, user_id, role, added_by, can_comment)
      VALUES ($1, $2, 'VIEWER', $3, true)
      ON CONFLICT (task_id, user_id) DO NOTHING
    `, [task.id, request.requested_by, userId]);
    
    // Update request status
    await client.query(`
      UPDATE task_requests SET
        status = $1,
        resolved_at = NOW(),
        resolved_by = $2,
        resolution_action = $3,
        resolution_reason = $4,
        converted_task_id = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [
      RequestStatus.ACCEPTED,
      userId,
      ResolutionAction.ACCEPTED,
      options.reason || 'Request accepted',
      task.id,
      requestId
    ]);
    
    // Log to audit
    await logRequestHistory(client, {
      requestId,
      actorId: userId,
      action: 'REQUEST_ACCEPTED',
      actionCategory: 'RESOLUTION',
      previousStatus: request.status,
      newStatus: RequestStatus.ACCEPTED,
      reason: options.reason || 'Request accepted',
      fieldChanged: 'converted_task_id',
      newValue: String(task.id),
      ipAddress,
      userAgent,
      sessionId,
      tenantId
    });
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Request accepted and converted to task',
      task,
      request: { ...request, status: RequestStatus.ACCEPTED }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Delegate request to another user
 */
const delegateRequest = async (requestId, delegateToId, actorInfo, options = {}) => {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { userId, ipAddress, userAgent, sessionId, tenantId } = actorInfo;
    
    // Get request with lock
    const requestResult = await client.query(
      'SELECT * FROM task_requests WHERE id = $1 FOR UPDATE',
      [requestId]
    );
    
    if (requestResult.rows.length === 0) {
      throw new Error('Request not found');
    }
    
    const request = requestResult.rows[0];
    
    // Validate actor is the target
    if (request.requested_to !== userId) {
      throw new Error('Only the assigned superior can delegate this request');
    }
    
    // Validate status allows delegation
    if (!validRequestTransitions[request.status]?.includes(RequestStatus.DELEGATED)) {
      throw new Error(`Cannot delegate request in status: ${request.status}`);
    }
    
    // Validate delegate target - must be subordinate to the actor
    const actorRole = await getUserRoleLevel(userId, client);
    const delegateRole = await getUserRoleLevel(delegateToId, client);
    
    if (delegateRole.level >= actorRole.level) {
      throw new Error('Can only delegate to subordinates (users with lower role level)');
    }
    
    // Create the actual task assigned to delegate
    const serialResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(serial_number FROM 5) AS INTEGER)), 0) + 1 as next_serial
      FROM workflow_tasks
      WHERE serial_number LIKE 'TSK-%'
    `);
    const nextSerial = serialResult.rows[0]?.next_serial || 1;
    const serialNumber = `TSK-${String(nextSerial).padStart(5, '0')}`;
    
    const taskResult = await client.query(`
      INSERT INTO workflow_tasks (
        title, description, status, priority,
        creator_id, assignee_id, approver_id, tenant_id,
        due_date, tags, serial_number,
        source_request_id,
        created_at, updated_at
      )
      VALUES ($1, $2, 'ASSIGNED', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      request.title,
      request.description,
      request.priority,
      userId,             // Delegator becomes creator
      delegateToId,       // Delegate becomes assignee
      userId,             // Delegator is approver
      tenantId || request.tenant_id,
      request.suggested_due_date,
      request.tags,
      serialNumber,
      request.id
    ]);
    
    const task = taskResult.rows[0];
    
    // Add original requester as watcher
    await client.query(`
      INSERT INTO task_participants (task_id, user_id, role, added_by, can_comment)
      VALUES ($1, $2, 'VIEWER', $3, true)
      ON CONFLICT (task_id, user_id) DO NOTHING
    `, [task.id, request.requested_by, userId]);
    
    // Update request status
    await client.query(`
      UPDATE task_requests SET
        status = $1,
        resolved_at = NOW(),
        resolved_by = $2,
        resolution_action = $3,
        resolution_reason = $4,
        converted_task_id = $5,
        delegated_to = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      RequestStatus.DELEGATED,
      userId,
      ResolutionAction.DELEGATED,
      options.reason || `Delegated to ${delegateRole.roleName}`,
      task.id,
      delegateToId,
      requestId
    ]);
    
    // Log to audit
    await logRequestHistory(client, {
      requestId,
      actorId: userId,
      action: 'REQUEST_DELEGATED',
      actionCategory: 'RESOLUTION',
      previousStatus: request.status,
      newStatus: RequestStatus.DELEGATED,
      reason: options.reason || `Delegated to user ${delegateToId}`,
      fieldChanged: 'delegated_to',
      newValue: String(delegateToId),
      ipAddress,
      userAgent,
      sessionId,
      tenantId
    });
    
    await client.query('COMMIT');
    
    return {
      success: true,
      message: 'Request delegated successfully',
      task,
      delegatedTo: delegateToId,
      request: { ...request, status: RequestStatus.DELEGATED }
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Reject request
 */
const rejectRequest = async (requestId, actorInfo, reason) => {
  const pool = getDbPool();
  
  if (!reason || reason.trim().length === 0) {
    throw new Error('Rejection reason is required');
  }
  
  const { userId, ipAddress, userAgent, sessionId, tenantId } = actorInfo;
  
  // Get request
  const requestResult = await pool.query(
    'SELECT * FROM task_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error('Request not found');
  }
  
  const request = requestResult.rows[0];
  
  // Validate actor is the target
  if (request.requested_to !== userId) {
    throw new Error('Only the assigned superior can reject this request');
  }
  
  // Validate status allows rejection
  if (!validRequestTransitions[request.status]?.includes(RequestStatus.REJECTED)) {
    throw new Error(`Cannot reject request in status: ${request.status}`);
  }
  
  // Update request
  await pool.query(`
    UPDATE task_requests SET
      status = $1,
      resolved_at = NOW(),
      resolved_by = $2,
      resolution_action = $3,
      resolution_reason = $4,
      updated_at = NOW()
    WHERE id = $5
  `, [
    RequestStatus.REJECTED,
    userId,
    ResolutionAction.REJECTED,
    reason,
    requestId
  ]);
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId,
    actorId: userId,
    action: 'REQUEST_REJECTED',
    actionCategory: 'RESOLUTION',
    previousStatus: request.status,
    newStatus: RequestStatus.REJECTED,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  });
  
  // Create rejection message
  await pool.query(`
    INSERT INTO task_request_messages (
      request_id, sender_id, content, message_type, is_system_message, tenant_id
    )
    VALUES ($1, $2, $3, 'REJECTION_NOTICE', true, $4)
  `, [requestId, userId, `Request rejected: ${reason}`, tenantId]);
  
  return {
    success: true,
    message: 'Request rejected',
    request: { ...request, status: RequestStatus.REJECTED }
  };
};

/**
 * Defer request
 */
const deferRequest = async (requestId, actorInfo, deferredUntil, reason) => {
  const pool = getDbPool();
  
  const { userId, ipAddress, userAgent, sessionId, tenantId } = actorInfo;
  
  // Get request
  const requestResult = await pool.query(
    'SELECT * FROM task_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error('Request not found');
  }
  
  const request = requestResult.rows[0];
  
  // Validate actor is the target
  if (request.requested_to !== userId) {
    throw new Error('Only the assigned superior can defer this request');
  }
  
  // Validate status allows deferral
  if (!validRequestTransitions[request.status]?.includes(RequestStatus.DEFERRED)) {
    throw new Error(`Cannot defer request in status: ${request.status}`);
  }
  
  // Update request
  await pool.query(`
    UPDATE task_requests SET
      status = $1,
      deferred_until = $2,
      resolution_reason = $3,
      updated_at = NOW()
    WHERE id = $4
  `, [
    RequestStatus.DEFERRED,
    deferredUntil || null,
    reason || 'Deferred for later review',
    requestId
  ]);
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId,
    actorId: userId,
    action: 'REQUEST_DEFERRED',
    actionCategory: 'STATUS_CHANGE',
    previousStatus: request.status,
    newStatus: RequestStatus.DEFERRED,
    reason: reason || 'Deferred for later review',
    fieldChanged: 'deferred_until',
    newValue: deferredUntil ? deferredUntil.toString() : null,
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  });
  
  return {
    success: true,
    message: 'Request deferred',
    deferredUntil,
    request: { ...request, status: RequestStatus.DEFERRED }
  };
};

/**
 * Ask for clarification
 */
const askClarification = async (requestId, actorInfo, question) => {
  const pool = getDbPool();
  
  if (!question || question.trim().length === 0) {
    throw new Error('Clarification question is required');
  }
  
  const { userId, tenantId } = actorInfo;
  
  // Get request
  const requestResult = await pool.query(
    'SELECT * FROM task_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error('Request not found');
  }
  
  const request = requestResult.rows[0];
  
  // Validate actor is the target
  if (request.requested_to !== userId) {
    throw new Error('Only the assigned superior can ask for clarification');
  }
  
  // Update request status and clarification count
  await pool.query(`
    UPDATE task_requests SET
      status = $1,
      clarification_count = clarification_count + 1,
      last_clarification_at = NOW(),
      updated_at = NOW()
    WHERE id = $2
  `, [RequestStatus.NEED_INFO, requestId]);
  
  // Create clarification message
  await pool.query(`
    INSERT INTO task_request_messages (
      request_id, sender_id, content, message_type, 
      is_clarification_request, tenant_id
    )
    VALUES ($1, $2, $3, 'CLARIFICATION_REQUEST', true, $4)
  `, [requestId, userId, question, tenantId]);
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId,
    actorId: userId,
    action: 'CLARIFICATION_REQUESTED',
    actionCategory: 'STATUS_CHANGE',
    previousStatus: request.status,
    newStatus: RequestStatus.NEED_INFO,
    reason: question,
    tenantId
  });
  
  return {
    success: true,
    message: 'Clarification requested',
    request: { ...request, status: RequestStatus.NEED_INFO }
  };
};

/**
 * Provide clarification (by requester)
 */
const provideClarification = async (requestId, actorInfo, response) => {
  const pool = getDbPool();
  
  if (!response || response.trim().length === 0) {
    throw new Error('Clarification response is required');
  }
  
  const { userId, tenantId } = actorInfo;
  
  // Get request
  const requestResult = await pool.query(
    'SELECT * FROM task_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error('Request not found');
  }
  
  const request = requestResult.rows[0];
  
  // Validate actor is the requester
  if (request.requested_by !== userId) {
    throw new Error('Only the requester can provide clarification');
  }
  
  // Validate request is in NEED_INFO status
  if (request.status !== RequestStatus.NEED_INFO) {
    throw new Error('Request is not awaiting clarification');
  }
  
  // Update request status back to REQUESTED
  await pool.query(`
    UPDATE task_requests SET
      status = $1,
      updated_at = NOW()
    WHERE id = $2
  `, [RequestStatus.REQUESTED, requestId]);
  
  // Create response message
  await pool.query(`
    INSERT INTO task_request_messages (
      request_id, sender_id, content, message_type, 
      is_clarification_response, tenant_id
    )
    VALUES ($1, $2, $3, 'CLARIFICATION_RESPONSE', true, $4)
  `, [requestId, userId, response, tenantId]);
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId,
    actorId: userId,
    action: 'CLARIFICATION_PROVIDED',
    actionCategory: 'STATUS_CHANGE',
    previousStatus: request.status,
    newStatus: RequestStatus.REQUESTED,
    reason: response,
    tenantId
  });
  
  return {
    success: true,
    message: 'Clarification provided, request resubmitted',
    request: { ...request, status: RequestStatus.REQUESTED }
  };
};

/**
 * Cancel request (by requester)
 */
const cancelRequest = async (requestId, actorInfo, reason) => {
  const pool = getDbPool();
  
  const { userId, ipAddress, userAgent, sessionId, tenantId } = actorInfo;
  
  // Get request
  const requestResult = await pool.query(
    'SELECT * FROM task_requests WHERE id = $1',
    [requestId]
  );
  
  if (requestResult.rows.length === 0) {
    throw new Error('Request not found');
  }
  
  const request = requestResult.rows[0];
  
  // Validate actor is the requester
  if (request.requested_by !== userId) {
    throw new Error('Only the requester can cancel this request');
  }
  
  // Validate status allows cancellation
  if (!validRequestTransitions[request.status]?.includes(RequestStatus.CANCELLED)) {
    throw new Error(`Cannot cancel request in status: ${request.status}`);
  }
  
  // Update request
  await pool.query(`
    UPDATE task_requests SET
      status = $1,
      resolved_at = NOW(),
      resolved_by = $2,
      resolution_action = $3,
      resolution_reason = $4,
      updated_at = NOW()
    WHERE id = $5
  `, [
    RequestStatus.CANCELLED,
    userId,
    ResolutionAction.CANCELLED,
    reason || 'Cancelled by requester',
    requestId
  ]);
  
  // Log to audit
  await logRequestHistory(pool, {
    requestId,
    actorId: userId,
    action: 'REQUEST_CANCELLED',
    actionCategory: 'RESOLUTION',
    previousStatus: request.status,
    newStatus: RequestStatus.CANCELLED,
    reason: reason || 'Cancelled by requester',
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  });
  
  return {
    success: true,
    message: 'Request cancelled',
    request: { ...request, status: RequestStatus.CANCELLED }
  };
};

/**
 * Get request messages
 */
const getRequestMessages = async (requestId, userId, tenantId = null) => {
  const pool = getDbPool();
  
  // Verify access
  const accessCheck = await getRequestById(requestId, userId, tenantId);
  if (!accessCheck.success) {
    throw new Error(accessCheck.error);
  }
  
  const result = await pool.query(`
    SELECT 
      m.*,
      sender.username AS sender_name,
      sender.email AS sender_email
    FROM task_request_messages m
    LEFT JOIN users sender ON m.sender_id = sender.id
    WHERE m.request_id = $1
    ORDER BY m.created_at ASC
  `, [requestId]);
  
  // Mark as read
  await pool.query(`
    UPDATE task_request_messages 
    SET read_by = array_append(read_by, $1)
    WHERE request_id = $2 AND NOT ($1 = ANY(read_by))
  `, [userId, requestId]);
  
  return {
    success: true,
    messages: result.rows
  };
};

/**
 * Get request audit history
 */
const getRequestHistory = async (requestId, userId, tenantId = null) => {
  const pool = getDbPool();
  
  // Verify access
  const accessCheck = await getRequestById(requestId, userId, tenantId);
  if (!accessCheck.success) {
    throw new Error(accessCheck.error);
  }
  
  const result = await pool.query(`
    SELECT 
      h.*,
      actor.username AS actor_name
    FROM task_request_history h
    LEFT JOIN users actor ON h.actor_id = actor.id
    WHERE h.request_id = $1
    ORDER BY h.created_at DESC
  `, [requestId]);
  
  return {
    success: true,
    history: result.rows
  };
};

/**
 * Log to request history (audit)
 */
const logRequestHistory = async (pool, data) => {
  const {
    requestId,
    actorId,
    action,
    actionCategory,
    previousStatus,
    newStatus,
    fieldChanged,
    oldValue,
    newValue,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  } = data;
  
  // Get actor role info
  let actorRoleLevel = null;
  let actorRoleName = null;
  
  try {
    const roleInfo = await getUserRoleLevel(actorId, pool);
    actorRoleLevel = roleInfo.level;
    actorRoleName = roleInfo.roleName;
  } catch (e) {
    // Ignore - actor info is optional
  }
  
  await pool.query(`
    INSERT INTO task_request_history (
      request_id, actor_id, actor_role_level, actor_role_name,
      action, action_category, previous_status, new_status,
      field_changed, old_value, new_value, reason,
      ip_address, user_agent, session_id, tenant_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
  `, [
    requestId,
    actorId,
    actorRoleLevel,
    actorRoleName,
    action,
    actionCategory,
    previousStatus,
    newStatus,
    fieldChanged,
    oldValue,
    newValue,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    tenantId
  ]);
};

/**
 * Get request counts for dashboard
 */
const getRequestCounts = async (userId, tenantId = null) => {
  const pool = getDbPool();
  
  const result = await pool.query(`
    SELECT 
      COUNT(CASE WHEN requested_to = $1 AND status = 'REQUESTED' THEN 1 END) AS inbox_pending,
      COUNT(CASE WHEN requested_to = $1 AND status = 'NEED_INFO' THEN 1 END) AS inbox_need_info,
      COUNT(CASE WHEN requested_by = $1 AND status = 'REQUESTED' THEN 1 END) AS outbox_pending,
      COUNT(CASE WHEN requested_by = $1 AND status = 'NEED_INFO' THEN 1 END) AS outbox_need_info,
      COUNT(CASE WHEN requested_by = $1 AND status = 'DEFERRED' THEN 1 END) AS outbox_deferred
    FROM task_requests
    WHERE (requested_by = $1 OR requested_to = $1)
    ${tenantId ? 'AND tenant_id = $2' : ''}
  `, tenantId ? [userId, tenantId] : [userId]);
  
  return result.rows[0] || {
    inbox_pending: 0,
    inbox_need_info: 0,
    outbox_pending: 0,
    outbox_need_info: 0,
    outbox_deferred: 0
  };
};

module.exports = {
  // Enums
  RequestStatus,
  ResolutionAction,
  validRequestTransitions,
  
  // Core functions
  checkAssignmentHierarchy,
  getUserRoleLevel,
  
  // Request CRUD
  createTaskRequest,
  getRequestsForUser,
  getRequestById,
  getRequestMessages,
  getRequestHistory,
  getRequestCounts,
  
  // Actions
  acceptRequest,
  delegateRequest,
  rejectRequest,
  deferRequest,
  askClarification,
  provideClarification,
  cancelRequest
};
