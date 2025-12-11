/**
 * Enhanced Task Routes v2
 * Complete task management API with real-time support
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Controllers
const taskController = require('../controllers/taskControllerV2');

// Middleware
const { authenticate: authenticateToken } = require('../middleware/auth');
const { taskCreationLimiter, uploadLimiter } = require('../middleware/advancedRateLimiter');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const taskId = req.params.id;
    const uploadDir = path.join(__dirname, '../uploads/tasks', taskId);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/csv'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// ============================================
// TASK ROUTES
// ============================================

/**
 * @route   GET /api/v2/tasks
 * @desc    List all tasks with filters
 * @access  Private
 */
router.get('/', authenticateToken, taskController.listTasks);

/**
 * @route   GET /api/v2/tasks/kanban
 * @desc    Get tasks grouped for Kanban board
 * @access  Private
 */
router.get('/kanban', authenticateToken, taskController.getKanbanTasks);

/**
 * @route   GET /api/v2/tasks/:id
 * @desc    Get single task by ID
 * @access  Private
 */
router.get('/:id', authenticateToken, taskController.getTaskById);

/**
 * @route   POST /api/v2/tasks
 * @desc    Create new task
 * @access  Private
 */
router.post('/', taskCreationLimiter, authenticateToken, taskController.createTask);

/**
 * @route   PUT /api/v2/tasks/:id
 * @desc    Update task
 * @access  Private
 */
router.put('/:id', authenticateToken, taskController.updateTask);

/**
 * @route   PATCH /api/v2/tasks/:id/status
 * @desc    Update task status
 * @access  Private
 */
router.patch('/:id/status', authenticateToken, taskController.updateTaskStatus);

/**
 * @route   PATCH /api/v2/tasks/:id/position
 * @desc    Update task position (drag-and-drop)
 * @access  Private
 */
router.patch('/:id/position', authenticateToken, taskController.updateTaskPosition);

/**
 * @route   DELETE /api/v2/tasks/:id
 * @desc    Delete (archive) task
 * @access  Private
 */
router.delete('/:id', authenticateToken, taskController.deleteTask);

// ============================================
// MESSAGE ROUTES
// ============================================

/**
 * @route   GET /api/v2/tasks/:id/messages
 * @desc    Get task messages/comments
 * @access  Private
 */
router.get('/:id/messages', authenticateToken, taskController.getTaskMessages);

/**
 * @route   POST /api/v2/tasks/:id/messages
 * @desc    Add message/comment to task
 * @access  Private
 */
router.post('/:id/messages', authenticateToken, taskController.createTaskMessage);

// ============================================
// ATTACHMENT ROUTES
// ============================================

/**
 * @route   GET /api/v2/tasks/:id/attachments
 * @desc    Get task attachments
 * @access  Private
 */
router.get('/:id/attachments', authenticateToken, taskController.getTaskAttachments);

/**
 * @route   POST /api/v2/tasks/:id/attachments
 * @desc    Upload attachment to task
 * @access  Private
 */
router.post(
  '/:id/attachments',
  uploadLimiter,
  authenticateToken,
  upload.single('file'),
  taskController.uploadTaskAttachment
);

module.exports = router;
