/**
 * ============================================================================
 * TASK SLA ESCALATION JOB
 * ============================================================================
 * 
 * SECURITY FIX AP-01: Implements SLA-based escalation for workflow tasks
 * 
 * Features:
 * - Monitors due_date and SLA deadlines for all active tasks
 * - Escalates overdue tasks to higher authority
 * - Sends notifications to escalation targets
 * - Logs escalation events for audit trail
 * 
 * Escalation Rules:
 * - Tasks breaching SLA are escalated up the business hierarchy
 * - Admin/Super Admin is final escalation target
 * - Does NOT automatically complete tasks, only reassigns
 * 
 * @module jobs/taskEscalationJob
 */

/* eslint-disable no-unused-vars */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ============================================================================
// ESCALATION CONFIGURATION
// ============================================================================

// Hours before task is considered breaching SLA (if no explicit SLA set)
const DEFAULT_SLA_HOURS = 48;

// Escalation targets by business level
// Lower levels escalate to higher levels
const BUSINESS_LEVEL_ESCALATION = {
  1: 3,   // L1 Staff → L3 Manager
  2: 3,   // L2 Officer → L3 Manager
  3: 5,   // L3 Manager → L5 Director
  4: 5,   // L4 Senior Manager → L5 Director
  5: 7,   // L5 Director → L7 VP
  6: 7,   // L6 Senior Director → L7 VP
  7: 9,   // L7 VP → L9 Admin
  8: 9,   // L8 SVP → L9 Admin
  9: 10,  // L9 Admin → L10 Super Admin
  10: 10, // L10 Super Admin → stays at top
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user at specified business level (or higher) in tenant
 */
async function getUserAtLevel(tenantId, minLevel) {
  const users = await prisma.$queryRaw`
    SELECT u.id, u.full_name, u.email, u.business_level
    FROM users_enhanced u
    WHERE u.tenant_id = ${tenantId}::uuid
      AND u.is_active = true
      AND u.business_level >= ${minLevel}
    ORDER BY u.business_level ASC, u.created_at ASC
    LIMIT 1
  `;
  
  return users.length > 0 ? users[0] : null;
}

/**
 * Get escalation target for a task
 */
async function getEscalationTarget(task) {
  // Determine target business level
  const currentLevel = task.assignee_level || 1;
  const targetLevel = BUSINESS_LEVEL_ESCALATION[currentLevel] || 9;
  
  // Find user at target level
  const target = await getUserAtLevel(task.tenant_id, targetLevel);
  
  if (!target) {
    // Final fallback: Get any admin in tenant
    const admin = await prisma.$queryRaw`
      SELECT u.id, u.full_name, u.email, u.business_level
      FROM users_enhanced u
      WHERE u.tenant_id = ${task.tenant_id}::uuid
        AND u.is_active = true
        AND (u.business_level >= 9 OR u.role IN ('ADMIN', 'SUPER_ADMIN'))
      ORDER BY u.business_level DESC
      LIMIT 1
    `;
    
    return admin.length > 0 ? admin[0] : null;
  }
  
  return target;
}

/**
 * Send escalation notification
 */
async function sendEscalationNotification(task, escalatedTo, reason) {
  console.log(`[TASK ESCALATION] Task ${task.serial_number || task.id} escalated to ${escalatedTo.full_name || escalatedTo.email}`);
  console.log(`[TASK ESCALATION] Reason: ${reason}`);
  
  // Log to notifications table
  try {
    await prisma.$executeRaw`
      INSERT INTO notifications (
        tenant_id, user_id, type, title, message, 
        related_type, related_id, is_read, created_at
      ) VALUES (
        ${task.tenant_id}::uuid,
        ${escalatedTo.id}::uuid,
        'TASK_ESCALATION',
        ${'Task Escalated to You'},
        ${`Task "${task.title}" (${task.serial_number || task.id}) has been escalated to you due to SLA breach. Original due date: ${task.due_date?.toISOString() || 'Not set'}`},
        'workflow_task',
        ${task.id}::text,
        false,
        NOW()
      )
    `;
  } catch (e) {
    // Notifications table may not exist
    console.log('[TASK ESCALATION] Could not log notification:', e.message);
  }
  
  // Also notify via audit log
  try {
    await prisma.$executeRaw`
      INSERT INTO audit_logs (
        tenant_id, action, entity_type, entity_id,
        old_values, new_values, user_id, created_at
      ) VALUES (
        ${task.tenant_id}::uuid,
        'SLA_ESCALATION',
        'workflow_task',
        ${task.id}::text,
        ${JSON.stringify({ assignee_id: task.assignee_id })}::jsonb,
        ${JSON.stringify({ 
          assignee_id: escalatedTo.id, 
          escalation_reason: reason,
          escalated_from_level: task.assignee_level,
          escalated_to_level: escalatedTo.business_level
        })}::jsonb,
        NULL,
        NOW()
      )
    `;
  } catch (e) {
    console.log('[TASK ESCALATION] Could not log audit entry:', e.message);
  }
}

/**
 * Log escalation metrics for monitoring
 */
async function logEscalationMetrics(stats) {
  console.log(`[TASK ESCALATION] === Escalation Run Complete ===`);
  console.log(`[TASK ESCALATION] Checked: ${stats.checked}`);
  console.log(`[TASK ESCALATION] Escalated: ${stats.escalated}`);
  console.log(`[TASK ESCALATION] Skipped (no target): ${stats.skippedNoTarget}`);
  console.log(`[TASK ESCALATION] Skipped (same assignee): ${stats.skippedSameAssignee}`);
  console.log(`[TASK ESCALATION] Errors: ${stats.errors}`);
}

// ============================================================================
// MAIN ESCALATION FUNCTION
// ============================================================================

/**
 * Check and escalate tasks with breached SLAs
 */
async function runTaskEscalation() {
  console.log('[TASK ESCALATION] Starting escalation check...');
  
  const stats = {
    checked: 0,
    escalated: 0,
    skippedNoTarget: 0,
    skippedSameAssignee: 0,
    errors: 0
  };
  
  try {
    // Find all tasks that are overdue and haven't been escalated recently
    // Consider both due_date and explicit SLA deadline
    const overdueTasks = await prisma.$queryRaw`
      SELECT 
        t.id,
        t.title,
        t.serial_number,
        t.tenant_id,
        t.status,
        t.priority,
        t.due_date,
        t.assignee_id,
        t.creator_id,
        t.last_status_change_at,
        t.created_at,
        COALESCE(assignee.business_level, 1) as assignee_level,
        assignee.full_name as assignee_name,
        assignee.email as assignee_email
      FROM workflow_tasks t
      LEFT JOIN users_enhanced assignee ON t.assignee_id = assignee.id::integer
      WHERE t.status NOT IN ('COMPLETED', 'ARCHIVED', 'CANCELLED')
        AND t.is_archived = false
        AND (
          -- Task has explicit due_date that has passed
          (t.due_date IS NOT NULL AND t.due_date < NOW())
          OR
          -- Task has no due_date but has been pending for > DEFAULT_SLA hours
          (t.due_date IS NULL AND t.created_at < NOW() - INTERVAL '${DEFAULT_SLA_HOURS} hours')
        )
        AND (
          -- Not recently escalated (give 24 hours between escalations)
          t.last_status_change_at IS NULL 
          OR t.last_status_change_at < NOW() - INTERVAL '24 hours'
        )
      ORDER BY COALESCE(t.due_date, t.created_at) ASC
      LIMIT 200
    `;
    
    console.log(`[TASK ESCALATION] Found ${overdueTasks.length} overdue tasks`);
    stats.checked = overdueTasks.length;
    
    for (const task of overdueTasks) {
      try {
        // Get escalation target
        const escalationTarget = await getEscalationTarget(task);
        
        if (!escalationTarget) {
          console.log(`[TASK ESCALATION] No escalation target found for task ${task.serial_number || task.id}`);
          stats.skippedNoTarget++;
          continue;
        }
        
        // Don't escalate to the same person
        if (escalationTarget.id === task.assignee_id?.toString()) {
          console.log(`[TASK ESCALATION] Escalation target same as current assignee for task ${task.serial_number || task.id}, skipping`);
          stats.skippedSameAssignee++;
          continue;
        }
        
        // Calculate SLA breach duration for reason
        const breachDuration = task.due_date 
          ? Math.floor((Date.now() - new Date(task.due_date).getTime()) / (1000 * 60 * 60))
          : Math.floor((Date.now() - new Date(task.created_at).getTime()) / (1000 * 60 * 60)) - DEFAULT_SLA_HOURS;
        
        const reason = task.due_date
          ? `Task overdue by ${breachDuration} hours (due: ${task.due_date.toISOString()})`
          : `Task pending for ${breachDuration + DEFAULT_SLA_HOURS} hours without completion`;
        
        // Update task with escalation
        await prisma.$executeRaw`
          UPDATE workflow_tasks SET
            assignee_id = ${parseInt(escalationTarget.id)},
            previous_status = status,
            status = 'ESCALATED',
            last_status_change_at = NOW(),
            updated_at = NOW()
          WHERE id = ${task.id}
        `;
        
        // Send notification
        await sendEscalationNotification(task, escalationTarget, reason);
        
        stats.escalated++;
        console.log(`[TASK ESCALATION] Successfully escalated task ${task.serial_number || task.id} from L${task.assignee_level} to L${escalationTarget.business_level}`);
        
      } catch (taskError) {
        console.error(`[TASK ESCALATION] Error processing task ${task.id}:`, taskError.message);
        stats.errors++;
      }
    }
    
    logEscalationMetrics(stats);
    
  } catch (error) {
    console.error('[TASK ESCALATION] Fatal error in escalation job:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// ============================================================================
// CRON SCHEDULE HELPER
// ============================================================================

/**
 * Start the escalation job on a schedule
 * @param {string} cronSchedule - Cron expression (default: every 15 minutes)
 */
function startScheduledEscalation(cronSchedule = '*/15 * * * *') {
  let cron;
  try {
    cron = require('node-cron');
  } catch (e) {
    console.log('[TASK ESCALATION] node-cron not available, using setInterval fallback');
    // Fallback to setInterval (every 15 minutes)
    setInterval(runTaskEscalation, 15 * 60 * 1000);
    console.log('[TASK ESCALATION] Escalation job scheduled with setInterval (15 min)');
    return;
  }
  
  cron.schedule(cronSchedule, runTaskEscalation, {
    scheduled: true,
    timezone: 'UTC'
  });
  
  console.log(`[TASK ESCALATION] Escalation job scheduled: ${cronSchedule}`);
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  runTaskEscalation,
  startScheduledEscalation,
  getEscalationTarget,
  BUSINESS_LEVEL_ESCALATION,
  DEFAULT_SLA_HOURS
};

// Run directly if called as script
if (require.main === module) {
  runTaskEscalation()
    .then(() => {
      console.log('[TASK ESCALATION] Manual run complete');
      process.exit(0);
    })
    .catch(error => {
      console.error('[TASK ESCALATION] Manual run failed:', error);
      process.exit(1);
    });
}
