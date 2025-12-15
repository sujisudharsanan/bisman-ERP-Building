/**
 * =====================================================
 * BEY AI TOOLS - Function Calling Definitions
 * =====================================================
 * Defines the "Hands" for Bey AI Assistant
 * These are the functions Bey can call to perform actions
 * 
 * Features:
 * - Task management (get, update, reassign)
 * - Send reminders and notifications
 * - Query data (tasks, users, reports)
 * - Writing assistance (rewrite, summarize)
 * 
 * SECURITY:
 * - All functions check user permissions before execution
 * - Sensitive data is filtered from responses
 * - Audit logging for all actions
 * =====================================================
 */

const { Pool } = require('pg');

// Database connection
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    })
  : new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'BISMAN',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

/**
 * Security Constants
 * PRIVILEGED_ROLES: Roles with elevated access to task data
 */
// eslint-disable-next-line no-unused-vars
const SENSITIVE_FIELDS = ['password', 'password_hash', 'email', 'phone', 'salary', 'bank_account', 'api_key', 'token'];
const PRIVILEGED_ROLES = ['admin', 'super_admin', 'enterprise_admin', 'hub_manager'];

/**
 * =====================================================
 * SECURITY HELPER FUNCTIONS
 * =====================================================
 */

/**
 * Check if user has access to a specific task
 * Returns: { hasAccess: boolean, accessLevel: 'owner'|'assignee'|'team'|'admin'|'none', task: object }
 */
async function checkTaskAccess(userId, taskId, userRole) {
  const numericId = String(taskId).replace(/^TSK-0*/i, '');
  
  try {
    const result = await pool.query(`
      SELECT 
        t.id, t.created_by, t.assignee_id, t.hub_id, t.business_id,
        t.title, t.status, t.priority, t.due_date,
        creator.username as creator_name, creator.first_name as creator_first,
        assignee.username as assignee_name, assignee.first_name as assignee_first
      FROM tasks t
      LEFT JOIN users creator ON t.created_by = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.id = $1 OR t.unique_id = $2
    `, [numericId, taskId]);
    
    if (result.rows.length === 0) {
      return { hasAccess: false, accessLevel: 'none', task: null, error: 'Task not found' };
    }
    
    const task = result.rows[0];
    
    // Check access levels
    const isCreator = task.created_by === userId;
    const isAssignee = task.assignee_id === userId;
    const isAdmin = ['admin', 'super_admin', 'enterprise_admin'].includes(userRole?.toLowerCase());
    
    // Check if user is in the same hub/team
    let isSameHub = false;
    if (task.hub_id) {
      const hubCheck = await pool.query(`
        SELECT 1 FROM users WHERE id = $1 AND hub_id = $2
      `, [userId, task.hub_id]);
      isSameHub = hubCheck.rows.length > 0;
    }
    
    let accessLevel = 'none';
    if (isAdmin) accessLevel = 'admin';
    else if (isCreator) accessLevel = 'owner';
    else if (isAssignee) accessLevel = 'assignee';
    else if (isSameHub) accessLevel = 'team';
    
    const hasAccess = accessLevel !== 'none';
    
    return {
      hasAccess,
      accessLevel,
      task: hasAccess ? task : null,
      isCreator,
      isAssignee,
      isAdmin
    };
  } catch (error) {
    console.error('[BeyTools] checkTaskAccess error:', error);
    return { hasAccess: false, accessLevel: 'none', task: null, error: error.message };
  }
}

/**
 * Log AI action for audit trail
 */
async function logAIAction(userId, action, taskId, details) {
  try {
    await pool.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, created_at)
      VALUES ($1, $2, 'task', $3, $4, NOW())
    `, [userId, `bey_${action}`, taskId, JSON.stringify(details)]);
  } catch (error) {
    // Don't fail the action if logging fails
    console.warn('[BeyTools] Audit log error:', error.message);
  }
}

/**
 * Sanitize user data - remove sensitive fields
 */
function sanitizeUserData(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.first_name || user.firstName || user.name || user.username,
    // Never include: email, phone, password_hash, etc.
  };
}

/**
 * Tool Definitions for OpenAI/Gemini Function Calling
 * These tell the AI what tools are available
 */
const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "get_task_details",
      description: "Get the current status and full details of a specific task by its ID. Use this when user asks about task status, details, or 'what is this task about'.",
      parameters: {
        type: "object",
        properties: {
          task_id: { 
            type: "string", 
            description: "The Task ID (numeric or TSK-XXXXX format)" 
          }
        },
        required: ["task_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_task_status",
      description: "Update the status/stage of a task. Use when user says 'move to done', 'start work', 'mark complete', 'change status to...'",
      parameters: {
        type: "object",
        properties: {
          task_id: { 
            type: "string",
            description: "The Task ID to update"
          },
          new_status: { 
            type: "string", 
            enum: ["OPEN", "ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "DONE", "BLOCKED", "CANCELLED"],
            description: "The new status to set"
          },
          comment: { 
            type: "string", 
            description: "Optional reason or note for the status change" 
          }
        },
        required: ["task_id", "new_status"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_reminder",
      description: "Send a reminder notification to a user about a task. Use when user says 'remind him', 'send reminder', 'notify them', 'ask for update'.",
      parameters: {
        type: "object",
        properties: {
          target_user_id: { 
            type: "integer",
            description: "The user ID to send reminder to"
          },
          target_user_name: {
            type: "string",
            description: "The name of the user (for generating message)"
          },
          task_id: { 
            type: "string",
            description: "The related task ID"
          },
          message: { 
            type: "string", 
            description: "The reminder message (Bey should make this polite and professional)" 
          },
          urgency: {
            type: "string",
            enum: ["low", "normal", "high", "urgent"],
            description: "How urgent is this reminder"
          }
        },
        required: ["target_user_id", "task_id", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "reassign_task",
      description: "Reassign a task to a different user. Use when user says 'assign to', 'give this to', 'transfer to', 'reassign'.",
      parameters: {
        type: "object",
        properties: {
          task_id: { 
            type: "string",
            description: "The Task ID to reassign"
          },
          new_assignee_id: { 
            type: "integer",
            description: "The user ID of the new assignee"
          },
          new_assignee_name: {
            type: "string",
            description: "Name of new assignee (for message)"
          },
          reason: { 
            type: "string", 
            description: "Reason for reassignment" 
          }
        },
        required: ["task_id", "new_assignee_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_tasks",
      description: "Get list of tasks assigned to the current user or created by them. Use when user asks 'my tasks', 'what do I have', 'show my work'.",
      parameters: {
        type: "object",
        properties: {
          filter: {
            type: "string",
            enum: ["all", "assigned_to_me", "created_by_me", "overdue", "due_today", "in_progress"],
            description: "Filter for which tasks to retrieve"
          },
          limit: {
            type: "integer",
            description: "Maximum number of tasks to return (default 10)"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_user_info",
      description: "Get information about a user by name or ID. Use when user asks 'who is...', 'find user', 'contact info for'.",
      parameters: {
        type: "object",
        properties: {
          user_name: { 
            type: "string",
            description: "Name or username to search for"
          },
          user_id: {
            type: "integer",
            description: "User ID if known"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "rewrite_message",
      description: "Rewrite or polish a message to be more professional, polite, or clear. Use when user asks 'rewrite this', 'make this polite', 'fix my message'.",
      parameters: {
        type: "object",
        properties: {
          original_text: { 
            type: "string",
            description: "The original text to rewrite"
          },
          style: {
            type: "string",
            enum: ["professional", "polite", "concise", "formal", "friendly", "urgent"],
            description: "The tone/style to apply"
          }
        },
        required: ["original_text"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "summarize_task_activity",
      description: "Get a summary of recent activity on a task. Use when user asks 'what happened', 'summarize activity', 'any updates'.",
      parameters: {
        type: "object",
        properties: {
          task_id: { 
            type: "string",
            description: "The Task ID to summarize"
          },
          days: {
            type: "integer",
            description: "How many days of activity to include (default 7)"
          }
        },
        required: ["task_id"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_task_comment",
      description: "Add a comment or message to a task thread. Use when user wants to post a message to a task.",
      parameters: {
        type: "object",
        properties: {
          task_id: { 
            type: "string",
            description: "The Task ID to comment on"
          },
          message: { 
            type: "string",
            description: "The comment content"
          },
          is_system: {
            type: "boolean",
            description: "Whether this is a system-generated message"
          }
        },
        required: ["task_id", "message"]
      }
    }
  }
];

/**
 * Tool Execution Functions
 * These actually perform the database operations
 */
const toolExecutors = {
  /**
   * Get task details by ID - WITH ACCESS CONTROL
   */
  async get_task_details(args, context) {
    const { task_id } = args;
    const { userId, userRole } = context;
    
    try {
      // Check if user has access to this task
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess) {
        return { 
          success: false, 
          error: 'You do not have permission to view this task' 
        };
      }
      
      const numericId = String(task_id).replace(/^TSK-0*/i, '');
      const result = await pool.query(`
        SELECT 
          t.id, t.unique_id, t.title, t.description, t.status, t.priority,
          t.due_date, t.created_at, t.updated_at,
          creator.username as creator_name, creator.first_name as creator_first,
          assignee.username as assignee_name, assignee.first_name as assignee_first,
          t.progress_percentage
        FROM tasks t
        LEFT JOIN users creator ON t.created_by = creator.id
        LEFT JOIN users assignee ON t.assignee_id = assignee.id
        WHERE t.id = $1 OR t.unique_id = $2
      `, [numericId, task_id]);
      
      if (result.rows.length === 0) {
        return { success: false, error: `Task ${task_id} not found` };
      }
      
      const task = result.rows[0];
      
      // Log the access
      await logAIAction(userId, 'view_task', task.id, { access_level: access.accessLevel });
      
      // Return sanitized task data - no internal IDs exposed to AI
      return {
        success: true,
        task: {
          display_id: task.unique_id || `TSK-${String(task.id).padStart(5, '0')}`,
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          due_date: task.due_date ? new Date(task.due_date).toLocaleDateString() : null,
          created_at: task.created_at ? new Date(task.created_at).toLocaleDateString() : null,
          // Only show first names for privacy
          creator: sanitizeUserData({ name: task.creator_first || task.creator_name }),
          assignee: sanitizeUserData({ name: task.assignee_first || task.assignee_name }),
          progress: task.progress_percentage,
          your_role: access.accessLevel
        }
      };
    } catch (error) {
      console.error('[BeyTools] get_task_details error:', error);
      return { success: false, error: 'Unable to retrieve task details' };
    }
  },

  /**
   * Update task status with permission check
   */
  async update_task_status(args, context) {
    const { task_id, new_status, comment } = args;
    const { userId, userName, userRole } = context;
    
    try {
      // Check if user has permission to update this task
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess) {
        return { 
          success: false, 
          error: 'You do not have permission to modify this task' 
        };
      }
      
      // Only owner, assignee, or admin can change status
      if (!['owner', 'assignee', 'admin'].includes(access.accessLevel)) {
        return { 
          success: false, 
          error: 'Only the task owner or assignee can change the status' 
        };
      }
      
      const numericId = String(task_id).replace(/^TSK-0*/i, '');
      const taskCheck = await pool.query(`
        SELECT id, status, created_by, assignee_id, title
        FROM tasks WHERE id = $1 OR unique_id = $2
      `, [numericId, task_id]);
      
      if (taskCheck.rows.length === 0) {
        return { success: false, error: `Task ${task_id} not found` };
      }
      
      const task = taskCheck.rows[0];
      const previousStatus = task.status;
      
      // Update the task status
      await pool.query(`
        UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2
      `, [new_status, task.id]);
      
      // Add system message to task
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      const displayName = userName || 'User';
      const systemMessage = `🔄 ${displayName} changed status to ${new_status} at ${timeStr}${comment ? `. Note: ${comment}` : ''}`;
      
      await pool.query(`
        INSERT INTO task_messages (task_id, sender_id, content, sender_type)
        VALUES ($1, $2, $3, 'SYSTEM')
      `, [task.id, userId, systemMessage]);
      
      // Audit log
      await logAIAction(userId, 'update_status', task.id, { 
        from: previousStatus, 
        to: new_status, 
        comment 
      });
      
      return {
        success: true,
        message: `Task moved to ${new_status}`,
        previous_status: previousStatus,
        new_status: new_status
      };
    } catch (error) {
      console.error('[BeyTools] update_task_status error:', error);
      return { success: false, error: 'Unable to update task status' };
    }
  },

  /**
   * Send reminder notification - WITH ACCESS CONTROL
   */
  async send_reminder(args, context) {
    const { target_user_id, target_user_name, task_id, message, urgency = 'normal' } = args;
    const { userId, userRole } = context;
    
    try {
      // Check if user has access to this task
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess) {
        return { 
          success: false, 
          error: 'You do not have permission to send reminders for this task' 
        };
      }
      
      // Get task info for context
      const numericId = String(task_id).replace(/^TSK-0*/i, '');
      const taskResult = await pool.query(`
        SELECT id, title FROM tasks WHERE id = $1 OR unique_id = $2
      `, [numericId, task_id]);
      
      const task = taskResult.rows[0];
      const taskTitle = task?.title || 'the task';
      
      // Create notification
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, priority, created_by)
        VALUES ($1, 'task_reminder', $2, $3, 'task', $4, $5, $6)
      `, [
        target_user_id,
        `Reminder: ${taskTitle}`,
        message,
        task?.id || numericId,
        urgency === 'urgent' ? 'high' : urgency === 'high' ? 'medium' : 'low',
        userId
      ]);
      
      // Add system message to task
      await pool.query(`
        INSERT INTO task_messages (task_id, sender_id, content, sender_type)
        VALUES ($1, $2, $3, 'SYSTEM')
      `, [task?.id || numericId, userId, `📬 Reminder sent to ${target_user_name || 'team member'}: "${message}"`]);
      
      // Audit log
      await logAIAction(userId, 'send_reminder', task?.id, {
        target: target_user_name,
        urgency,
        message_preview: message.substring(0, 50)
      });
      
      return {
        success: true,
        message: `Reminder sent about the task`,
        notification_sent: true
      };
    } catch (error) {
      console.error('[BeyTools] send_reminder error:', error);
      return { success: false, error: 'Unable to send reminder' };
    }
  },

  /**
   * Reassign task to different user - WITH ACCESS CONTROL
   */
  async reassign_task(args, context) {
    const { task_id, new_assignee_id, new_assignee_name, reason } = args;
    const { userId, userName, userRole } = context;
    const numericId = String(task_id).replace(/^TSK-0*/i, '');
    
    try {
      // Use checkTaskAccess for consistent permission checking
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess || (!access.isCreator && !access.isAdmin)) {
        return { 
          success: false, 
          error: 'You do not have permission to reassign this task' 
        };
      }
      
      // Get task details
      const taskResult = await pool.query(`
        SELECT id, title, assignee_id FROM tasks WHERE id = $1 OR unique_id = $2
      `, [numericId, task_id]);
      
      const task = taskResult.rows[0];
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      
      // Get old assignee name for message (don't expose ID)
      const oldAssigneeResult = await pool.query(`
        SELECT username FROM users WHERE id = $1
      `, [task.assignee_id]);
      const oldAssigneeName = oldAssigneeResult.rows[0]?.username || 'Previous assignee';
      
      // Update assignee
      await pool.query(`
        UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2
      `, [new_assignee_id, task.id]);
      
      // Add system message
      const displayName = userName || 'Manager';
      const reasonText = reason ? ` Reason: ${reason}` : '';
      await pool.query(`
        INSERT INTO task_messages (task_id, sender_id, content, sender_type)
        VALUES ($1, $2, $3, 'SYSTEM')
      `, [task.id, userId, `👤 ${displayName} reassigned task to ${new_assignee_name || 'new assignee'}.${reasonText}`]);
      
      // Notify new assignee
      await pool.query(`
        INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, created_by)
        VALUES ($1, 'task_assigned', $2, $3, 'task', $4, $5)
      `, [
        new_assignee_id,
        `Task Assigned`,
        `You have been assigned to a task`,
        task.id,
        userId
      ]);
      
      // Audit log
      await logAIAction(userId, 'reassign_task', task.id, {
        from: oldAssigneeName,
        to: new_assignee_name,
        reason
      });
      
      return {
        success: true,
        message: `Task reassigned to ${new_assignee_name || 'team member'}`,
        previous_assignee: oldAssigneeName,
        new_assignee: new_assignee_name
      };
    } catch (error) {
      console.error('[BeyTools] reassign_task error:', error);
      return { success: false, error: 'Unable to reassign task' };
    }
  },

  /**
   * Get user's tasks - ONLY THEIR OWN TASKS
   */
  async get_my_tasks(args, context) {
    const { filter = 'all', limit = 10 } = args;
    const { userId } = context;
    
    // Limit maximum to prevent data exposure
    const safeLimit = Math.min(limit, 20);
    
    try {
      let whereClause = '';
      
      switch (filter) {
        case 'assigned_to_me':
          whereClause = 'WHERE t.assignee_id = $1';
          break;
        case 'created_by_me':
          whereClause = 'WHERE t.created_by = $1';
          break;
        case 'overdue':
          whereClause = `WHERE (t.assignee_id = $1 OR t.created_by = $1) 
                         AND t.due_date < NOW() 
                         AND t.status NOT IN ('COMPLETED', 'DONE', 'CANCELLED')`;
          break;
        case 'due_today':
          whereClause = `WHERE (t.assignee_id = $1 OR t.created_by = $1) 
                         AND DATE(t.due_date) = CURRENT_DATE`;
          break;
        case 'in_progress':
          whereClause = `WHERE (t.assignee_id = $1 OR t.created_by = $1) 
                         AND t.status = 'IN_PROGRESS'`;
          break;
        default:
          // Always filter by user's tasks only
          whereClause = 'WHERE t.assignee_id = $1 OR t.created_by = $1';
      }
      
      const result = await pool.query(`
        SELECT 
          t.id, t.unique_id, t.title, t.status, t.priority, t.due_date,
          assignee.username as assignee_name,
          CASE WHEN t.due_date < NOW() AND t.status NOT IN ('COMPLETED', 'DONE', 'CANCELLED') 
               THEN true ELSE false END as is_overdue
        FROM tasks t
        LEFT JOIN users assignee ON t.assignee_id = assignee.id
        ${whereClause}
        ORDER BY 
          CASE WHEN t.status IN ('COMPLETED', 'DONE', 'CANCELLED') THEN 1 ELSE 0 END,
          t.due_date ASC NULLS LAST
        LIMIT $2
      `, [userId, safeLimit]);
      
      return {
        success: true,
        filter: filter,
        count: result.rows.length,
        tasks: result.rows.map(t => ({
          task_reference: t.unique_id || `TSK-${String(t.id).padStart(5, '0')}`,
          title: t.title,
          status: t.status,
          priority: t.priority,
          due_date: t.due_date,
          assignee: t.assignee_name,
          is_overdue: t.is_overdue
        }))
      };
    } catch (error) {
      console.error('[BeyTools] get_my_tasks error:', error);
      return { success: false, error: 'Unable to fetch your tasks' };
    }
  },

  /**
   * Get user info - WITH SANITIZATION (no sensitive data)
   */
  async get_user_info(args, context) {
    const { user_name, user_id } = args;
    const { userRole } = context;
    
    // Only admins can look up users by ID
    if (user_id && !PRIVILEGED_ROLES.includes(userRole)) {
      return { 
        success: false, 
        error: 'You can only search users by name' 
      };
    }
    
    try {
      let result;
      if (user_id && PRIVILEGED_ROLES.includes(userRole)) {
        result = await pool.query(`
          SELECT id, username, first_name, last_name, role
          FROM users WHERE id = $1
        `, [user_id]);
      } else if (user_name) {
        result = await pool.query(`
          SELECT id, username, first_name, last_name, role
          FROM users 
          WHERE LOWER(username) LIKE $1 
             OR LOWER(first_name) LIKE $1 
             OR LOWER(last_name) LIKE $1
          LIMIT 5
        `, [`%${user_name.toLowerCase()}%`]);
      } else {
        return { success: false, error: 'Please provide a user name to search' };
      }
      
      if (result.rows.length === 0) {
        return { success: false, error: 'No matching users found' };
      }
      
      // Return only non-sensitive fields
      return {
        success: true,
        users: result.rows.map(u => ({
          name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
          username: u.username,
          role: u.role
          // Note: NOT exposing id, email, phone, etc.
        }))
      };
    } catch (error) {
      console.error('[BeyTools] get_user_info error:', error);
      return { success: false, error: 'Unable to find user' };
    }
  },

  /**
   * Rewrite message (placeholder - actual rewriting done by LLM)
   */
  async rewrite_message(args, _context) {
    const { original_text, style = 'professional' } = args;
    // This is a special case - the LLM will handle the actual rewriting
    // We just return the params for the LLM to use
    return {
      success: true,
      action: 'rewrite',
      original_text,
      style,
      instruction: `Please rewrite the following text in a ${style} tone: "${original_text}"`
    };
  },

  /**
   * Summarize task activity - WITH ACCESS CONTROL
   */
  async summarize_task_activity(args, context) {
    const { task_id, days = 7 } = args;
    const { userId, userRole } = context;
    const numericId = String(task_id).replace(/^TSK-0*/i, '');
    
    // Limit days to prevent excessive data exposure
    const safeDays = Math.min(days, 30);
    
    try {
      // Check access
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess) {
        return { 
          success: false, 
          error: 'You do not have access to this task\'s activity' 
        };
      }
      
      const result = await pool.query(`
        SELECT 
          tm.content, tm.sender_type, tm.created_at,
          u.username as sender_name
        FROM task_messages tm
        LEFT JOIN users u ON tm.sender_id = u.id
        WHERE tm.task_id = $1 
          AND tm.created_at >= NOW() - INTERVAL '${safeDays} days'
        ORDER BY tm.created_at DESC
        LIMIT 20
      `, [numericId]);
      
      const taskResult = await pool.query(`
        SELECT title, status, updated_at FROM tasks WHERE id = $1
      `, [numericId]);
      
      const task = taskResult.rows[0];
      
      return {
        success: true,
        current_status: task?.status,
        last_updated: task?.updated_at,
        activity_count: result.rows.length,
        recent_activity: result.rows.map(a => ({
          summary: a.content,
          by: a.sender_name || a.sender_type,
          when: a.created_at
        }))
      };
    } catch (error) {
      console.error('[BeyTools] summarize_task_activity error:', error);
      return { success: false, error: 'Unable to summarize task activity' };
    }
  },

  /**
   * Add comment to task - WITH ACCESS CONTROL
   */
  async add_task_comment(args, context) {
    const { task_id, message, is_system = false } = args;
    const { userId, userRole } = context;
    const numericId = String(task_id).replace(/^TSK-0*/i, '');
    
    try {
      // Check access
      const access = await checkTaskAccess(userId, task_id, userRole);
      
      if (!access.hasAccess) {
        return { 
          success: false, 
          error: 'You do not have permission to comment on this task' 
        };
      }
      
      // Only admins can post system messages
      if (is_system && !PRIVILEGED_ROLES.includes(userRole)) {
        return { 
          success: false, 
          error: 'System messages are restricted' 
        };
      }
      
      await pool.query(`
        INSERT INTO task_messages (task_id, sender_id, content, sender_type)
        VALUES ($1, $2, $3, $4)
      `, [numericId, userId, message, is_system ? 'SYSTEM' : 'USER']);
      
      // Audit log
      await logAIAction(userId, 'add_comment', numericId, {
        message_preview: message.substring(0, 50)
      });
      
      return {
        success: true,
        message: 'Comment added successfully'
      };
    } catch (error) {
      console.error('[BeyTools] add_task_comment error:', error);
      return { success: false, error: 'Unable to add comment' };
    }
  }
};

/**
 * Execute a tool by name with args and context
 */
async function executeTool(toolName, args, context) {
  const executor = toolExecutors[toolName];
  if (!executor) {
    return { success: false, error: `Unknown tool: ${toolName}` };
  }
  
  try {
    console.log(`[BeyTools] Executing ${toolName}:`, { args, userId: context.userId });
    const result = await executor(args, context);
    console.log(`[BeyTools] ${toolName} result:`, result.success ? 'success' : 'failed');
    return result;
  } catch (error) {
    console.error(`[BeyTools] ${toolName} execution error:`, error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  toolDefinitions,
  toolExecutors,
  executeTool
};
