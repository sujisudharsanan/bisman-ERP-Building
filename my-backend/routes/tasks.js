/**
 * Task Management API Routes
 * Integrated with chat system
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const taskController = require('../controllers/taskController');
const upload = require('../middleware/upload');

// ============================================
// TASK CRUD OPERATIONS
// ============================================

/**
 * @route   POST /api/tasks
 * @desc    Create a new task (from chat form)
 * @access  Private
 */
router.post(
  '/',
  authenticate,
  upload.array('attachments', 10),
  taskController.createTask
);

/**
 * @route   GET /api/tasks
 * @desc    Get all tasks (with filters)
 * @access  Private
 */
router.get(
  '/',
  authenticate,
  taskController.getTasks
);

/**
 * @route   GET /api/tasks/dashboard
 * @desc    Get dashboard tasks grouped by status
 * @access  Private
 */
router.get(
  '/dashboard',
  authenticate,
  taskController.getDashboardTasks
);

/**
 * @route   GET /api/tasks/stats
 * @desc    Get task statistics for current user
 * @access  Private
 */
router.get(
  '/stats',
  authenticate,
  taskController.getTaskStats
);

/**
 * @route   GET /api/tasks/my-tasks
 * @desc    Get tasks assigned to current user
 * @access  Private
 */
router.get(
  '/my-tasks',
  authenticate,
  taskController.getMyTasks
);

/**
 * @route   GET /api/tasks/created-by-me
 * @desc    Get tasks created by current user
 * @access  Private
 */
router.get(
  '/created-by-me',
  authenticate,
  taskController.getCreatedByMe
);

/**
 * @route   GET /api/tasks/pending-approval
 * @desc    Get tasks pending approval for current user
 * @access  Private
 */
router.get(
  '/pending-approval',
  authenticate,
  taskController.getPendingApproval
);

/**
 * @route   GET /api/tasks/performance-metrics
 * @desc    Get user's performance metrics for dashboard
 * @access  Private
 * NOTE: Must be BEFORE /:id routes to avoid being caught as an ID
 */
router.get(
  '/performance-metrics',
  authenticate,
  async (req, res) => {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    try {
      const rawUserId = req.user.id;
      
      // Resolve UUID to legacy integer ID for database queries
      let userId = rawUserId;
      if (typeof rawUserId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawUserId)) {
        // Look up legacy_id from users_enhanced table
        const userLookup = await prisma.users_enhanced.findUnique({
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
          WHERE (t.assignee_id = ${userId}::integer OR t.creator_id = ${userId}::integer)
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
      const responseTimeScore = Math.max(0, Math.min(100, Math.round(100 - (avgResponseHours * 4))));
      const qualityScore = Math.min(100, Math.max(0, Math.round(onTimeRate * 0.9 + 10)));
      
      res.json({
        success: true,
        data: {
          onTimeRate,
          responseTime: responseTimeScore,
          completionRate,
          qualityScore,
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
  }
);

/**
 * @route   GET /api/tasks/:id/quick-view
 * @desc    Get task details with messages for quick view panel
 * @access  Private
 */
router.get(
  '/:id/quick-view',
  authenticate,
  taskController.getTaskQuickView
);

/**
 * @route   GET /api/tasks/:id
 * @desc    Get single task by ID (with messages and attachments)
 * @access  Private
 */
router.get(
  '/:id',
  authenticate,
  taskController.getTaskById
);

/**
 * @route   PATCH /api/tasks/:id
 * @desc    Update task details
 * @access  Private
 */
router.patch(
  '/:id',
  authenticate,
  taskController.updateTask
);

/**
 * @route   DELETE /api/tasks/:id
 * @desc    Delete/Archive task
 * @access  Private
 */
router.delete(
  '/:id',
  authenticate,
  taskController.deleteTask
);

/**
 * @route   POST /api/tasks/:id/duplicate-check
 * @desc    Check for duplicate tasks before creation
 * @access  Private
 */
router.post(
  '/:id/duplicate-check',
  authenticate,
  taskController.checkDuplicates
);

/**
 * @route   POST /api/tasks/check-duplicate
 * @desc    Check for duplicate tasks by title and assignee
 * @access  Private
 */
router.post(
  '/check-duplicate',
  authenticate,
  taskController.checkDuplicateBeforeCreate
);

// ============================================
// TASK MESSAGES (Chat Integration)
// ============================================

/**
 * @route   GET /api/tasks/:id/messages
 * @desc    Get all messages for a task
 * @access  Private
 */
router.get(
  '/:id/messages',
  authenticate,
  taskController.getTaskMessages
);

/**
 * @route   POST /api/tasks/:id/messages
 * @desc    Add a message to task chat
 * @access  Private
 */
router.post(
  '/:id/messages',
  authenticate,
  upload.array('attachments', 5),
  taskController.addTaskMessage
);

/**
 * @route   PATCH /api/tasks/:id/messages/:messageId
 * @desc    Edit a task message
 * @access  Private
 */
router.patch(
  '/:id/messages/:messageId',
  authenticate,
  taskController.editTaskMessage
);

/**
 * @route   DELETE /api/tasks/:id/messages/:messageId
 * @desc    Delete a task message
 * @access  Private
 */
router.delete(
  '/:id/messages/:messageId',
  authenticate,
  taskController.deleteTaskMessage
);

/**
 * @route   POST /api/tasks/:id/messages/:messageId/read
 * @desc    Mark message as read
 * @access  Private
 */
router.post(
  '/:id/messages/:messageId/read',
  authenticate,
  taskController.markMessageAsRead
);

// ============================================
// TASK ATTACHMENTS
// ============================================

/**
 * @route   GET /api/tasks/:id/attachments
 * @desc    Get all attachments for a task
 * @access  Private
 */
router.get(
  '/:id/attachments',
  authenticate,
  taskController.getTaskAttachments
);

/**
 * @route   POST /api/tasks/:id/attachments
 * @desc    Add attachments to a task
 * @access  Private
 */
router.post(
  '/:id/attachments',
  authenticate,
  upload.array('files', 10),
  taskController.addTaskAttachments
);

/**
 * @route   DELETE /api/tasks/:id/attachments/:attachmentId
 * @desc    Delete an attachment
 * @access  Private
 */
router.delete(
  '/:id/attachments/:attachmentId',
  authenticate,
  taskController.deleteAttachment
);

// ============================================
// TASK STATUS & WORKFLOW
// ============================================

/**
 * @route   POST /api/tasks/:id/start
 * @desc    Start working on a task (change status to IN_PROGRESS)
 * @access  Private
 */
router.post(
  '/:id/start',
  authenticate,
  taskController.startTask
);

/**
 * @route   POST /api/tasks/:id/complete
 * @desc    Mark task as completed
 * @access  Private
 */
router.post(
  '/:id/complete',
  authenticate,
  taskController.completeTask
);

/**
 * @route   POST /api/tasks/:id/reopen
 * @desc    Reopen a completed task
 * @access  Private
 */
router.post(
  '/:id/reopen',
  authenticate,
  taskController.reopenTask
);

/**
 * @route   POST /api/tasks/:id/submit-for-review
 * @desc    Submit task for review/approval
 * @access  Private
 */
router.post(
  '/:id/submit-for-review',
  authenticate,
  taskController.submitForReview
);

/**
 * @route   POST /api/tasks/:id/approve
 * @desc    Approve a task (by approver)
 * @access  Private
 */
router.post(
  '/:id/approve',
  authenticate,
  taskController.approveTask
);

/**
 * @route   POST /api/tasks/:id/reject
 * @desc    Reject a task (by approver)
 * @access  Private
 */
router.post(
  '/:id/reject',
  authenticate,
  taskController.rejectTask
);

/**
 * @route   POST /api/tasks/:id/block
 * @desc    Block a task
 * @access  Private
 */
router.post(
  '/:id/block',
  authenticate,
  taskController.blockTask
);

/**
 * @route   POST /api/tasks/:id/unblock
 * @desc    Unblock a task
 * @access  Private
 */
router.post(
  '/:id/unblock',
  authenticate,
  taskController.unblockTask
);

// ============================================
// TASK PARTICIPANTS
// ============================================

/**
 * @route   GET /api/tasks/:id/participants
 * @desc    Get all participants of a task
 * @access  Private
 */
router.get(
  '/:id/participants',
  authenticate,
  taskController.getTaskParticipants
);

/**
 * @route   POST /api/tasks/:id/participants
 * @desc    Add a participant to a task
 * @access  Private
 */
router.post(
  '/:id/participants',
  authenticate,
  taskController.addTaskParticipant
);

/**
 * @route   DELETE /api/tasks/:id/participants/:userId
 * @desc    Remove a participant from a task
 * @access  Private
 */
router.delete(
  '/:id/participants/:userId',
  authenticate,
  taskController.removeTaskParticipant
);

// ============================================
// TASK HISTORY & AUDIT
// ============================================

/**
 * @route   GET /api/tasks/:id/history
 * @desc    Get task change history
 * @access  Private
 */
router.get(
  '/:id/history',
  authenticate,
  taskController.getTaskHistory
);

// ============================================
// TASK DEPENDENCIES
// ============================================

/**
 * @route   GET /api/tasks/:id/dependencies
 * @desc    Get task dependencies
 * @access  Private
 */
router.get(
  '/:id/dependencies',
  authenticate,
  taskController.getTaskDependencies
);

/**
 * @route   POST /api/tasks/:id/dependencies
 * @desc    Add a task dependency
 * @access  Private
 */
router.post(
  '/:id/dependencies',
  authenticate,
  taskController.addTaskDependency
);

/**
 * @route   DELETE /api/tasks/:id/dependencies/:dependencyId
 * @desc    Remove a task dependency
 * @access  Private
 */
router.delete(
  '/:id/dependencies/:dependencyId',
  authenticate,
  taskController.removeTaskDependency
);

// ============================================
// TASK TEMPLATES
// ============================================

/**
 * @route   GET /api/tasks/templates
 * @desc    Get all task templates
 * @access  Private
 */
router.get(
  '/templates/list',
  authenticate,
  taskController.getTaskTemplates
);

/**
 * @route   POST /api/tasks/templates
 * @desc    Create a new task template
 * @access  Private
 */
router.post(
  '/templates',
  authenticate,
  taskController.createTaskTemplate
);

/**
 * @route   POST /api/tasks/templates/:templateId/use
 * @desc    Create a task from template
 * @access  Private
 */
router.post(
  '/templates/:templateId/use',
  authenticate,
  taskController.createTaskFromTemplate
);

// ============================================
// TASK ASSIGNEE MANAGEMENT
// ============================================

/**
 * @route   POST /api/tasks/:id/reassign
 * @desc    Reassign task to different user
 * @access  Private
 */
router.post(
  '/:id/reassign',
  authenticate,
  taskController.reassignTask
);

/**
 * @route   GET /api/tasks/assignable-users
 * @desc    Get list of users who can be assigned tasks
 * @access  Private
 */
router.get(
  '/assignable-users',
  authenticate,
  taskController.getAssignableUsers
);

// ============================================
// TASK SEARCH & FILTERS
// ============================================

/**
 * @route   GET /api/tasks/search
 * @desc    Search tasks by query
 * @access  Private
 */
router.get(
  '/search',
  authenticate,
  taskController.searchTasks
);

/**
 * @route   GET /api/tasks/serial/:serialNumber
 * @desc    Get task by serial number
 * @access  Private
 */
router.get(
  '/serial/:serialNumber',
  authenticate,
  taskController.searchTaskBySerialNumber
);

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * @route   POST /api/tasks/bulk-update
 * @desc    Update multiple tasks at once
 * @access  Private
 */
router.post(
  '/bulk-update',
  authenticate,
  taskController.bulkUpdateTasks
);

/**
 * @route   POST /api/tasks/bulk-delete
 * @desc    Delete/Archive multiple tasks
 * @access  Private
 */
router.post(
  '/bulk-delete',
  authenticate,
  taskController.bulkDeleteTasks
);

module.exports = router;
