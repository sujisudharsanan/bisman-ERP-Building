/**
 * Task Clarification Service
 * 
 * Handles cross-user/cross-department clarification requests
 * WITHOUT changing task ownership, approval chain, or authority.
 * 
 * Key Features:
 * - Request clarification from any user or department
 * - Read-only view for responders
 * - Configurable SLA pause during clarification
 * - Automatic task resume after response
 * - Limit concurrent clarifications
 * - Full audit logging
 * - Cross-department support
 * 
 * Rules:
 * - Clarification is read-only for the responder
 * - Task ownership and approval chain remain unchanged
 * - No approval, reassignment, or escalation through clarification
 */

const { getPool } = require('../middleware/database');

// Constants
const CLARIFICATION_STATUS = {
  PENDING: 'pending',
  RESPONDED: 'responded',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
};

const CLARIFICATION_URGENCY = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const DEFAULT_EXPIRY_HOURS = 48;
const DEFAULT_MAX_CONCURRENT = 3;

// Helper to get DB pool
const getDbPool = () => {
  const pool = getPool();
  if (!pool) {
    throw new Error('Database connection not available');
  }
  return pool;
};

/**
 * Create a new clarification request
 * 
 * @param {Object} params
 * @param {number} params.taskId - The task requiring clarification
 * @param {number} params.requesterId - User requesting clarification
 * @param {number} [params.responderId] - Target user (if specific user)
 * @param {string} [params.responderDepartmentId] - Target department (if department-wide)
 * @param {string} params.question - Clarification question
 * @param {Array} [params.attachments] - Optional attachments
 * @param {boolean} [params.pauseSla=true] - Whether to pause SLA
 * @param {number} [params.expiryHours=48] - Hours before expiry
 * @param {string} [params.urgency='normal'] - Urgency level
 * @param {string} [params.tenantId] - Tenant ID for multi-tenancy
 */
async function requestClarification(params) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      taskId,
      requesterId,
      responderId,
      responderDepartmentId,
      question,
      attachments = null,
      pauseSla = true,
      expiryHours = DEFAULT_EXPIRY_HOURS,
      urgency = CLARIFICATION_URGENCY.NORMAL,
      tenantId = null,
    } = params;
    
    // Validate task exists and get current state
    const taskResult = await client.query(`
      SELECT 
        t.*,
        requester.username as requester_name,
        requester.email as requester_email,
        responder.username as responder_name,
        responder.email as responder_email,
        (SELECT name FROM departments WHERE id::text = $2) as responder_department_name
      FROM workflow_tasks t
      LEFT JOIN users requester ON requester.id = $3
      LEFT JOIN users responder ON responder.id = $4
      WHERE t.id = $1
    `, [taskId, responderDepartmentId, requesterId, responderId]);
    
    if (taskResult.rows.length === 0) {
      throw new Error('Task not found');
    }
    
    const task = taskResult.rows[0];
    
    // Check if user can request clarification (must be involved in the task)
    const isInvolved = task.creator_id === requesterId || 
                       task.assignee_id === requesterId || 
                       task.approver_id === requesterId;
    
    if (!isInvolved) {
      throw new Error('You must be involved in this task to request clarification');
    }
    
    // Check concurrent clarification limit
    const activeClarifications = await client.query(`
      SELECT COUNT(*) as count 
      FROM task_clarifications 
      WHERE task_id = $1 AND status = 'pending'
    `, [taskId]);
    
    const maxConcurrent = task.max_concurrent_clarifications || DEFAULT_MAX_CONCURRENT;
    if (parseInt(activeClarifications.rows[0].count) >= maxConcurrent) {
      throw new Error(`Maximum ${maxConcurrent} concurrent clarifications allowed per task`);
    }
    
    // Validate responder or department
    if (!responderId && !responderDepartmentId) {
      throw new Error('Must specify either a user or department for clarification');
    }
    
    // Calculate expiry time
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiryHours);
    
    // Determine responder type
    const responderType = responderId ? 'user' : 'department';
    
    // Create clarification request
    const clarificationResult = await client.query(`
      INSERT INTO task_clarifications (
        task_id, tenant_id, requester_id, requester_name, requester_department,
        responder_id, responder_department_id, responder_name, responder_type,
        question, attachments, status, pause_sla, 
        sla_paused_at, expiry_hours, expires_at,
        previous_task_status, previous_task_state, urgency, created_at
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, $11, 'pending', $12,
        $13, $14, $15,
        $16, $17, $18, NOW()
      )
      RETURNING *
    `, [
      taskId,
      tenantId,
      requesterId,
      task.requester_name,
      task.requester_department || null,
      responderId,
      responderDepartmentId,
      task.responder_name || task.responder_department_name,
      responderType,
      question,
      attachments ? JSON.stringify(attachments) : null,
      pauseSla,
      pauseSla ? new Date() : null,
      expiryHours,
      expiresAt,
      task.status,
      JSON.stringify({ status: task.status, assigneeId: task.assignee_id }),
      urgency,
    ]);
    
    const clarification = clarificationResult.rows[0];
    
    // Update task to reflect clarification state
    await client.query(`
      UPDATE workflow_tasks 
      SET 
        active_clarification_count = COALESCE(active_clarification_count, 0) + 1,
        is_waiting_for_clarification = TRUE,
        status = CASE WHEN status != 'WAITING_FOR_CLARIFICATION' THEN 'WAITING_FOR_CLARIFICATION' ELSE status END,
        updated_at = NOW()
      WHERE id = $1
    `, [taskId]);
    
    // Create audit log
    await client.query(`
      INSERT INTO clarification_audit (
        clarification_id, task_id, tenant_id, 
        actor_id, actor_name, actor_role,
        action, old_status, new_status,
        comment, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        'request_clarification', NULL, 'pending',
        $7, $8, NOW()
      )
    `, [
      clarification.id,
      taskId,
      tenantId,
      requesterId,
      task.requester_name,
      null,
      `Requested clarification from ${task.responder_name || task.responder_department_name}`,
      JSON.stringify({ 
        responderId, 
        responderDepartmentId, 
        urgency,
        expiresAt: expiresAt.toISOString(),
      }),
    ]);
    
    // Also log to task_audit for task history
    await client.query(`
      INSERT INTO task_audit (
        task_id, actor_id, actor_name, action,
        from_status, to_status, reason, metadata, tenant_id, created_at
      ) VALUES (
        $1, $2, $3, 'request_clarification',
        $4, 'WAITING_FOR_CLARIFICATION', $5, $6, $7, NOW()
      )
    `, [
      taskId,
      requesterId,
      task.requester_name,
      task.status,
      question.substring(0, 500),
      JSON.stringify({ 
        clarificationId: clarification.id,
        responderId,
        responderDepartmentId,
      }),
      tenantId,
    ]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      clarification,
      message: 'Clarification request created successfully',
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Respond to a clarification request
 * 
 * @param {Object} params
 * @param {string} params.clarificationId - The clarification to respond to
 * @param {number} params.responderId - User responding
 * @param {string} params.response - Response text
 * @param {Array} [params.attachments] - Optional response attachments
 */
async function respondToClarification(params) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      clarificationId,
      responderId,
      response,
      attachments = null,
    } = params;
    
    // Get clarification and validate
    const clarResult = await client.query(`
      SELECT 
        c.*,
        t.status as task_status,
        t.active_clarification_count,
        responder.username as responder_username,
        responder.email as responder_email
      FROM task_clarifications c
      JOIN workflow_tasks t ON t.id = c.task_id
      LEFT JOIN users responder ON responder.id = $2
      WHERE c.id = $1
    `, [clarificationId, responderId]);
    
    if (clarResult.rows.length === 0) {
      throw new Error('Clarification request not found');
    }
    
    const clarification = clarResult.rows[0];
    
    // Validate status
    if (clarification.status !== CLARIFICATION_STATUS.PENDING) {
      throw new Error(`Cannot respond to a clarification with status: ${clarification.status}`);
    }
    
    // Validate responder is authorized
    const isAuthorized = clarification.responder_id === responderId ||
                         (clarification.responder_type === 'department' && 
                          clarification.responder_department_id);
    
    if (!isAuthorized) {
      throw new Error('You are not authorized to respond to this clarification');
    }
    
    // Calculate SLA pause duration if applicable
    let slaPausedHours = 0;
    if (clarification.pause_sla && clarification.sla_paused_at) {
      const pausedAt = new Date(clarification.sla_paused_at);
      const resumedAt = new Date();
      slaPausedHours = (resumedAt - pausedAt) / (1000 * 60 * 60);
    }
    
    // Update clarification with response
    await client.query(`
      UPDATE task_clarifications
      SET 
        response = $1,
        response_attachments = $2,
        responded_by_id = $3,
        responded_by_name = $4,
        responded_at = NOW(),
        status = 'responded',
        sla_resumed_at = $5,
        sla_paused_hours = $6,
        updated_at = NOW()
      WHERE id = $7
    `, [
      response,
      attachments ? JSON.stringify(attachments) : null,
      responderId,
      clarification.responder_username,
      clarification.pause_sla ? new Date() : null,
      slaPausedHours,
      clarificationId,
    ]);
    
    // Check if there are other pending clarifications
    const remainingResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM task_clarifications 
      WHERE task_id = $1 AND status = 'pending' AND id != $2
    `, [clarification.task_id, clarificationId]);
    
    const remainingPending = parseInt(remainingResult.rows[0].count);
    
    // Update task clarification state
    const newTaskStatus = remainingPending === 0 ? clarification.previous_task_status : 'WAITING_FOR_CLARIFICATION';
    
    await client.query(`
      UPDATE workflow_tasks 
      SET 
        active_clarification_count = GREATEST(COALESCE(active_clarification_count, 1) - 1, 0),
        is_waiting_for_clarification = $1,
        status = CASE 
          WHEN $1 = FALSE AND status = 'WAITING_FOR_CLARIFICATION' 
          THEN $2
          ELSE status 
        END,
        total_clarification_pause_hours = COALESCE(total_clarification_pause_hours, 0) + $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      remainingPending > 0,
      clarification.previous_task_status || 'IN_PROGRESS',
      slaPausedHours,
      clarification.task_id,
    ]);
    
    // Create audit log
    await client.query(`
      INSERT INTO clarification_audit (
        clarification_id, task_id, tenant_id, 
        actor_id, actor_name, actor_role,
        action, old_status, new_status,
        comment, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        'respond', 'pending', 'responded',
        $7, $8, NOW()
      )
    `, [
      clarificationId,
      clarification.task_id,
      clarification.tenant_id,
      responderId,
      clarification.responder_username,
      null,
      response.substring(0, 500),
      JSON.stringify({ 
        slaPausedHours,
        remainingPending,
        taskResumed: remainingPending === 0,
      }),
    ]);
    
    // Also log to task_audit
    await client.query(`
      INSERT INTO task_audit (
        task_id, actor_id, actor_name, action,
        from_status, to_status, reason, metadata, tenant_id, created_at
      ) VALUES (
        $1, $2, $3, 'clarification_response',
        'WAITING_FOR_CLARIFICATION', $4, $5, $6, $7, NOW()
      )
    `, [
      clarification.task_id,
      responderId,
      clarification.responder_username,
      remainingPending === 0 ? clarification.previous_task_status : 'WAITING_FOR_CLARIFICATION',
      response.substring(0, 500),
      JSON.stringify({ 
        clarificationId,
        taskResumed: remainingPending === 0,
      }),
      clarification.tenant_id,
    ]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      taskResumed: remainingPending === 0,
      remainingPending,
      message: remainingPending === 0 
        ? 'Response submitted and task resumed' 
        : `Response submitted. ${remainingPending} clarification(s) still pending.`,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancel a clarification request
 */
async function cancelClarification(params) {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { clarificationId, userId, reason = 'Cancelled by requester' } = params;
    
    // Get clarification
    const result = await client.query(`
      SELECT c.*, u.username as canceller_name
      FROM task_clarifications c
      LEFT JOIN users u ON u.id = $2
      WHERE c.id = $1
    `, [clarificationId, userId]);
    
    if (result.rows.length === 0) {
      throw new Error('Clarification not found');
    }
    
    const clarification = result.rows[0];
    
    // Only requester or admins can cancel
    if (clarification.requester_id !== userId) {
      throw new Error('Only the requester can cancel this clarification');
    }
    
    if (clarification.status !== CLARIFICATION_STATUS.PENDING) {
      throw new Error('Only pending clarifications can be cancelled');
    }
    
    // Calculate SLA pause time
    let slaPausedHours = 0;
    if (clarification.pause_sla && clarification.sla_paused_at) {
      const pausedAt = new Date(clarification.sla_paused_at);
      slaPausedHours = (new Date() - pausedAt) / (1000 * 60 * 60);
    }
    
    // Update clarification
    await client.query(`
      UPDATE task_clarifications
      SET 
        status = 'cancelled',
        sla_resumed_at = NOW(),
        sla_paused_hours = $1,
        updated_at = NOW()
      WHERE id = $2
    `, [slaPausedHours, clarificationId]);
    
    // Check remaining pending
    const remainingResult = await client.query(`
      SELECT COUNT(*) as count 
      FROM task_clarifications 
      WHERE task_id = $1 AND status = 'pending' AND id != $2
    `, [clarification.task_id, clarificationId]);
    
    const remainingPending = parseInt(remainingResult.rows[0].count);
    
    // Update task
    await client.query(`
      UPDATE workflow_tasks 
      SET 
        active_clarification_count = GREATEST(COALESCE(active_clarification_count, 1) - 1, 0),
        is_waiting_for_clarification = $1,
        status = CASE 
          WHEN $1 = FALSE AND status = 'WAITING_FOR_CLARIFICATION' 
          THEN $2
          ELSE status 
        END,
        total_clarification_pause_hours = COALESCE(total_clarification_pause_hours, 0) + $3,
        updated_at = NOW()
      WHERE id = $4
    `, [
      remainingPending > 0,
      clarification.previous_task_status || 'IN_PROGRESS',
      slaPausedHours,
      clarification.task_id,
    ]);
    
    // Audit log
    await client.query(`
      INSERT INTO clarification_audit (
        clarification_id, task_id, tenant_id, 
        actor_id, actor_name, action,
        old_status, new_status, comment, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, 'cancel',
        'pending', 'cancelled', $6, NOW()
      )
    `, [
      clarificationId,
      clarification.task_id,
      clarification.tenant_id,
      userId,
      clarification.canceller_name,
      reason,
    ]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      taskResumed: remainingPending === 0,
      message: 'Clarification cancelled',
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get clarifications for a task
 */
async function getTaskClarifications(taskId, options = {}) {
  const pool = getDbPool();
  const { status, includeResponded = true } = options;
  
  let query = `
    SELECT 
      c.*,
      requester.username as requester_username,
      requester.email as requester_email,
      responder.username as responder_username,
      responder.email as responder_email,
      responded_user.username as responded_by_username
    FROM task_clarifications c
    LEFT JOIN users requester ON requester.id = c.requester_id
    LEFT JOIN users responder ON responder.id = c.responder_id
    LEFT JOIN users responded_user ON responded_user.id = c.responded_by_id
    WHERE c.task_id = $1
  `;
  
  const params = [taskId];
  
  if (status) {
    params.push(status);
    query += ` AND c.status = $${params.length}`;
  } else if (!includeResponded) {
    query += ` AND c.status = 'pending'`;
  }
  
  query += ` ORDER BY c.created_at DESC`;
  
  const result = await pool.query(query, params);
  
  return result.rows;
}

/**
 * Get clarifications pending response from a user
 */
async function getPendingClarificationsForUser(userId, options = {}) {
  const pool = getDbPool();
  const { tenantId, page = 1, limit = 20 } = options;
  
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT 
      c.*,
      t.title as task_title,
      t.status as task_status,
      requester.username as requester_username,
      requester.email as requester_email
    FROM task_clarifications c
    JOIN workflow_tasks t ON t.id = c.task_id
    LEFT JOIN users requester ON requester.id = c.requester_id
    WHERE c.status = 'pending'
      AND (c.responder_id = $1 OR c.responder_department_id IN (
        SELECT department_id::text FROM user_departments WHERE user_id = $1
      ))
  `;
  
  const params = [userId];
  
  if (tenantId) {
    params.push(tenantId);
    query += ` AND c.tenant_id = $${params.length}`;
  }
  
  query += ` ORDER BY c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
  params.push(limit, offset);
  
  const result = await pool.query(query, params);
  
  // Get total count
  let countQuery = `
    SELECT COUNT(*) as total
    FROM task_clarifications c
    WHERE c.status = 'pending'
      AND (c.responder_id = $1 OR c.responder_department_id IN (
        SELECT department_id::text FROM user_departments WHERE user_id = $1
      ))
  `;
  const countParams = [userId];
  
  if (tenantId) {
    countParams.push(tenantId);
    countQuery += ` AND c.tenant_id = $${countParams.length}`;
  }
  
  const countResult = await pool.query(countQuery, countParams);
  
  return {
    clarifications: result.rows,
    total: parseInt(countResult.rows[0].total),
    page,
    limit,
    hasMore: offset + result.rows.length < parseInt(countResult.rows[0].total),
  };
}

/**
 * Get clarification by ID
 */
async function getClarificationById(clarificationId) {
  const pool = getDbPool();
  
  const result = await pool.query(`
    SELECT 
      c.*,
      t.title as task_title,
      t.description as task_description,
      t.status as current_task_status,
      t.priority as task_priority,
      requester.username as requester_username,
      requester.email as requester_email,
      responder.username as responder_username,
      responder.email as responder_email,
      responded_user.username as responded_by_username
    FROM task_clarifications c
    JOIN workflow_tasks t ON t.id = c.task_id
    LEFT JOIN users requester ON requester.id = c.requester_id
    LEFT JOIN users responder ON responder.id = c.responder_id
    LEFT JOIN users responded_user ON responded_user.id = c.responded_by_id
    WHERE c.id = $1
  `, [clarificationId]);
  
  return result.rows[0] || null;
}

/**
 * Get clarification audit log
 */
async function getClarificationAuditLog(clarificationId) {
  const pool = getDbPool();
  
  const result = await pool.query(`
    SELECT 
      ca.*,
      u.username as actor_username,
      u.email as actor_email
    FROM clarification_audit ca
    LEFT JOIN users u ON u.id = ca.actor_id
    WHERE ca.clarification_id = $1
    ORDER BY ca.created_at ASC
  `, [clarificationId]);
  
  return result.rows;
}

/**
 * Expire overdue clarifications (called by scheduler)
 */
async function expireOverdueClarifications() {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Find expired clarifications
    const expired = await client.query(`
      SELECT * FROM task_clarifications
      WHERE status = 'pending' AND expires_at < NOW()
    `);
    
    for (const clarification of expired.rows) {
      // Calculate SLA pause time
      let slaPausedHours = 0;
      if (clarification.pause_sla && clarification.sla_paused_at) {
        const pausedAt = new Date(clarification.sla_paused_at);
        slaPausedHours = (new Date() - pausedAt) / (1000 * 60 * 60);
      }
      
      // Update clarification status
      await client.query(`
        UPDATE task_clarifications
        SET 
          status = 'expired',
          sla_resumed_at = NOW(),
          sla_paused_hours = $1,
          updated_at = NOW()
        WHERE id = $2
      `, [slaPausedHours, clarification.id]);
      
      // Check remaining pending
      const remainingResult = await client.query(`
        SELECT COUNT(*) as count 
        FROM task_clarifications 
        WHERE task_id = $1 AND status = 'pending' AND id != $2
      `, [clarification.task_id, clarification.id]);
      
      const remainingPending = parseInt(remainingResult.rows[0].count);
      
      // Update task
      await client.query(`
        UPDATE workflow_tasks 
        SET 
          active_clarification_count = GREATEST(COALESCE(active_clarification_count, 1) - 1, 0),
          is_waiting_for_clarification = $1,
          status = CASE 
            WHEN $1 = FALSE AND status = 'WAITING_FOR_CLARIFICATION' 
            THEN $2
            ELSE status 
          END,
          total_clarification_pause_hours = COALESCE(total_clarification_pause_hours, 0) + $3,
          updated_at = NOW()
        WHERE id = $4
      `, [
        remainingPending > 0,
        clarification.previous_task_status || 'IN_PROGRESS',
        slaPausedHours,
        clarification.task_id,
      ]);
      
      // Audit log
      await client.query(`
        INSERT INTO clarification_audit (
          clarification_id, task_id, tenant_id, 
          actor_id, action, old_status, new_status,
          comment, created_at
        ) VALUES (
          $1, $2, $3, $4, 'expire', 'pending', 'expired',
          'Clarification expired without response', NOW()
        )
      `, [
        clarification.id,
        clarification.task_id,
        clarification.tenant_id,
        clarification.requester_id,
      ]);
    }
    
    await client.query('COMMIT');
    
    return {
      success: true,
      expiredCount: expired.rows.length,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get clarification statistics for a tenant
 */
async function getClarificationStats(tenantId) {
  const pool = getDbPool();
  
  const result = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
      COUNT(*) FILTER (WHERE status = 'responded') as responded_count,
      COUNT(*) FILTER (WHERE status = 'expired') as expired_count,
      COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_count,
      AVG(sla_paused_hours) FILTER (WHERE sla_paused_hours IS NOT NULL) as avg_pause_hours,
      AVG(EXTRACT(EPOCH FROM (responded_at - created_at)) / 3600) 
        FILTER (WHERE responded_at IS NOT NULL) as avg_response_hours
    FROM task_clarifications
    WHERE tenant_id = $1 OR $1 IS NULL
  `, [tenantId]);
  
  return result.rows[0];
}

module.exports = {
  // Constants
  CLARIFICATION_STATUS,
  CLARIFICATION_URGENCY,
  DEFAULT_EXPIRY_HOURS,
  DEFAULT_MAX_CONCURRENT,
  
  // Core functions
  requestClarification,
  respondToClarification,
  cancelClarification,
  
  // Query functions
  getTaskClarifications,
  getPendingClarificationsForUser,
  getClarificationById,
  getClarificationAuditLog,
  getClarificationStats,
  
  // Maintenance
  expireOverdueClarifications,
};
