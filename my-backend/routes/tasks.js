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
