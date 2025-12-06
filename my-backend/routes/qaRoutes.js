/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * QA MODULE - Backend Routes
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Routes for QA/Testing module:
 * - Test Tasks: CRUD operations for test assignments
 * - Issues: Bug/issue tracker CRUD
 * - Issue History: Timeline/audit trail for issues
 * - Dashboard: Aggregated stats for testers
 * - Tester Login: Independent login that works even if ERP is down
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');
const { setTenantContext } = require('../middleware/tenantContext');
const qaController = require('../controllers/qaController');

// ═══════════════════════════════════════════════════════════════════════════════
// HARDCODED TESTER CREDENTIALS (Independent of DB)
// ═══════════════════════════════════════════════════════════════════════════════
const QA_TESTERS = [
  {
    id: 99901,
    email: 'qa_tester@bisman.local',
    password: 'QaTester@2025',
    name: 'QA Tester',
    role: 'QA_TESTER',
    roleName: 'QA Tester',
    tenant_id: null, // Can access all tenants for testing
  },
  {
    id: 99902,
    email: 'qa_lead@bisman.local',
    password: 'QaLead@2025',
    name: 'QA Lead',
    role: 'QA_LEAD',
    roleName: 'QA Lead',
    tenant_id: null,
  },
  {
    id: 99903,
    email: 'qa_admin@bisman.local',
    password: 'QaAdmin@2025',
    name: 'QA Admin',
    role: 'QA_ADMIN',
    roleName: 'QA Admin',
    tenant_id: null,
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// TESTER LOGIN ROUTE (No DB dependency)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * @route   POST /api/qa/tester-login
 * @desc    Independent login for QA testers (works even if ERP DB is down)
 * @access  Public
 */
router.post('/tester-login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find tester by email (case-insensitive)
    const tester = QA_TESTERS.find(
      (t) => t.email.toLowerCase() === email.toLowerCase()
    );

    if (!tester) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password (plain comparison since hardcoded)
    if (tester.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET || 'qa-tester-fallback-secret-key-2025';
    const token = jwt.sign(
      {
        id: tester.id,
        email: tester.email,
        name: tester.name,
        role: tester.role,
        roleName: tester.roleName,
        isQATester: true,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Return user info
    return res.json({
      success: true,
      user: {
        id: tester.id,
        email: tester.email,
        name: tester.name,
        role: tester.role,
        roleName: tester.roleName,
        isQATester: true,
      },
      token,
    });
  } catch (error) {
    console.error('[QA Tester Login Error]', error);
    return res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * @route   GET /api/qa/tester-credentials
 * @desc    Get available tester credentials (for login page display)
 * @access  Public
 */
router.get('/tester-credentials', (req, res) => {
  // Return credentials for display on login page
  const credentials = QA_TESTERS.map((t) => ({
    email: t.email,
    password: t.password,
    role: t.roleName,
  }));
  res.json({ credentials });
});

// All other QA routes require authentication and tenant context
router.use(authenticate);
router.use(setTenantContext);

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/qa/dashboard
 * @desc    Get dashboard stats for current user
 * @access  Private
 */
router.get('/dashboard', qaController.getDashboardStats);

/**
 * @route   GET /api/qa/dashboard/summary
 * @desc    Get overall QA summary (for admins)
 * @access  Private
 */
router.get('/dashboard/summary', qaController.getSummary);

// ═══════════════════════════════════════════════════════════════════════════════
// TEST TASKS ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/qa/tasks
 * @desc    Get all test tasks (with filters)
 * @access  Private
 */
router.get('/tasks', qaController.getTestTasks);

/**
 * @route   GET /api/qa/tasks/my-tasks
 * @desc    Get tasks assigned to current user
 * @access  Private
 */
router.get('/tasks/my-tasks', qaController.getMyTestTasks);

/**
 * @route   GET /api/qa/tasks/:id
 * @desc    Get single test task by ID
 * @access  Private
 */
router.get('/tasks/:id', qaController.getTestTaskById);

/**
 * @route   POST /api/qa/tasks
 * @desc    Create a new test task
 * @access  Private
 */
router.post('/tasks', qaController.createTestTask);

/**
 * @route   PUT /api/qa/tasks/:id
 * @desc    Update a test task
 * @access  Private
 */
router.put('/tasks/:id', qaController.updateTestTask);

/**
 * @route   DELETE /api/qa/tasks/:id
 * @desc    Delete a test task
 * @access  Private
 */
router.delete('/tasks/:id', qaController.deleteTestTask);

// ═══════════════════════════════════════════════════════════════════════════════
// ISSUES ROUTES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/qa/issues
 * @desc    Get all issues (with filters)
 * @access  Private
 */
router.get('/issues', qaController.getIssues);

/**
 * @route   GET /api/qa/issues/my-issues
 * @desc    Get issues opened by current user
 * @access  Private
 */
router.get('/issues/my-issues', qaController.getMyIssues);

/**
 * @route   GET /api/qa/issues/assigned-to-me
 * @desc    Get issues assigned to current user
 * @access  Private
 */
router.get('/issues/assigned-to-me', qaController.getIssuesAssignedToMe);

/**
 * @route   GET /api/qa/issues/retest-pending
 * @desc    Get issues pending retest for current user
 * @access  Private
 */
router.get('/issues/retest-pending', qaController.getRetestPending);

/**
 * @route   GET /api/qa/issues/:id
 * @desc    Get single issue by ID with history
 * @access  Private
 */
router.get('/issues/:id', qaController.getIssueById);

/**
 * @route   GET /api/qa/issues/:id/history
 * @desc    Get issue history/timeline
 * @access  Private
 */
router.get('/issues/:id/history', qaController.getIssueHistory);

/**
 * @route   POST /api/qa/issues
 * @desc    Create a new issue
 * @access  Private
 */
router.post('/issues', qaController.createIssue);

/**
 * @route   PUT /api/qa/issues/:id
 * @desc    Update an issue (auto-logs history)
 * @access  Private
 */
router.put('/issues/:id', qaController.updateIssue);

/**
 * @route   POST /api/qa/issues/:id/comment
 * @desc    Add a comment to issue history
 * @access  Private
 */
router.post('/issues/:id/comment', qaController.addIssueComment);

/**
 * @route   DELETE /api/qa/issues/:id
 * @desc    Delete an issue
 * @access  Private
 */
router.delete('/issues/:id', qaController.deleteIssue);

// ═══════════════════════════════════════════════════════════════════════════════
// LOOKUPS / METADATA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/qa/modules
 * @desc    Get list of available modules for dropdown
 * @access  Private
 */
router.get('/modules', qaController.getModuleList);

/**
 * @route   GET /api/qa/users
 * @desc    Get list of users for assignment dropdown
 * @access  Private
 */
router.get('/users', qaController.getAssignableUsers);

module.exports = router;
