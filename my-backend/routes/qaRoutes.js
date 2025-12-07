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

// ═══════════════════════════════════════════════════════════════════════════════
// ERP SYNC DATA - Dynamic Role & Access Explorer Data
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * @route   GET /api/qa/erp-sync-data
 * @desc    Get real-time ERP system data for Role & Access Explorer
 *          Includes: roles, permissions, routes, user-role mappings, actions, workflows
 * @access  Private (QA_TESTER, QA_LEAD, QA_ADMIN or authenticated users)
 */
router.get('/erp-sync-data', async (req, res) => {
  const { getPrisma } = require('../lib/prisma');
  const prisma = getPrisma();

  try {
    console.log('[QA ERP Sync] Fetching comprehensive ERP data...');
    const syncStartTime = Date.now();

    // Fetch all RBAC data in parallel for performance
    const [
      rbacRoles,
      rbacPermissions,
      rbacRoutes,
      rbacUserRoles,
      rbacActions,
      rbacRoleRoutes,
      rbacRolePermissions,
      totalUsers,
      modules,
    ] = await Promise.all([
      // 1. All roles with their metadata
      prisma.rbac_roles.findMany({
        orderBy: { display_order: 'asc' },
      }),
      // 2. All permissions
      prisma.rbac_permissions.findMany({
        orderBy: { created_at: 'desc' },
      }),
      // 3. All routes/pages
      prisma.rbac_routes.findMany({
        orderBy: { route_order: 'asc' },
      }),
      // 4. User-role assignments (count per role)
      prisma.rbac_user_roles.findMany({
        select: {
          role_id: true,
          user_id: true,
          is_active: true,
        },
      }),
      // 5. Available actions
      prisma.rbac_actions.findMany({
        orderBy: { action_name: 'asc' },
      }),
      // 6. Role-route mappings (which roles can access which routes)
      prisma.rbac_role_routes.findMany({
        select: {
          role_id: true,
          route_id: true,
          can_access: true,
        },
      }),
      // 7. Role-permission mappings (which roles have which permissions)
      prisma.rbac_role_permissions.findMany({
        select: {
          role_id: true,
          permission_id: true,
          can_create: true,
          can_read: true,
          can_update: true,
          can_delete: true,
        },
      }),
      // 8. Total user count
      prisma.users.count(),
      // 9. Module definitions
      prisma.modules.findMany({
        where: { is_active: true },
        select: {
          id: true,
          name: true,
          key: true,
          is_active: true,
        },
      }),
    ]);

    // Build role summary with computed stats
    const roleSummary = rbacRoles.map((role) => {
      const rolePermissions = rbacRolePermissions.filter(rp => rp.role_id === role.id);
      const roleRoutes = rbacRoleRoutes.filter(rr => rr.role_id === role.id && rr.can_access);
      const roleUsers = rbacUserRoles.filter(ur => ur.role_id === role.id && ur.is_active);

      // Calculate permission breakdown
      let fullAccess = 0;
      let partialAccess = 0;
      let noAccess = 0;

      rolePermissions.forEach((rp) => {
        const hasAll = rp.can_create && rp.can_read && rp.can_update && rp.can_delete;
        const hasNone = !rp.can_create && !rp.can_read && !rp.can_update && !rp.can_delete;
        if (hasAll) fullAccess++;
        else if (hasNone) noAccess++;
        else partialAccess++;
      });

      return {
        id: role.id,
        name: role.role_name,
        displayName: role.display_name || role.role_name,
        description: role.description || 'No description available',
        level: role.level || 0,
        displayOrder: role.display_order || 999,
        isActive: role.is_active,
        isSystemRole: role.is_system_role || false,
        parentRoleId: role.parent_role_id,
        stats: {
          totalPermissions: rolePermissions.length,
          totalRoutes: roleRoutes.length,
          totalUsers: roleUsers.length,
          fullAccess,
          partialAccess,
          noAccess,
          chartData: [fullAccess, partialAccess, noAccess],
        },
        permissions: rolePermissions.map((rp) => {
          const perm = rbacPermissions.find(p => p.id === rp.permission_id);
          return {
            id: rp.permission_id,
            name: perm?.permission_name || 'Unknown',
            resource: perm?.resource || 'Unknown',
            canCreate: rp.can_create,
            canRead: rp.can_read,
            canUpdate: rp.can_update,
            canDelete: rp.can_delete,
          };
        }),
        routes: roleRoutes.map((rr) => {
          const route = rbacRoutes.find(r => r.id === rr.route_id);
          return {
            id: rr.route_id,
            path: route?.route_path || 'Unknown',
            name: route?.route_name || 'Unknown',
            module: route?.module_key || 'Unknown',
          };
        }),
      };
    });

    // Build comprehensive matrix data
    const matrixData = rbacPermissions.slice(0, 50).map((perm) => {
      const roleAccess = {};
      rbacRoles.forEach((role) => {
        const rolePermission = rbacRolePermissions.find(
          rp => rp.role_id === role.id && rp.permission_id === perm.id
        );
        if (rolePermission) {
          const hasAll = rolePermission.can_create && rolePermission.can_read && 
                         rolePermission.can_update && rolePermission.can_delete;
          const hasNone = !rolePermission.can_create && !rolePermission.can_read && 
                          !rolePermission.can_update && !rolePermission.can_delete;
          roleAccess[role.role_name] = hasAll ? 'full' : hasNone ? 'none' : 'partial';
        } else {
          roleAccess[role.role_name] = 'none';
        }
      });
      return {
        permissionName: perm.permission_name,
        resource: perm.resource || 'General',
        access: roleAccess,
      };
    });

    // Route/page access matrix
    const routeMatrix = rbacRoutes.slice(0, 50).map((route) => {
      const roleAccess = {};
      rbacRoles.forEach((role) => {
        const roleRoute = rbacRoleRoutes.find(
          rr => rr.role_id === role.id && rr.route_id === route.id
        );
        roleAccess[role.role_name] = roleRoute?.can_access ? 'yes' : 'no';
      });
      return {
        routePath: route.route_path,
        routeName: route.route_name,
        module: route.module_key || 'Unknown',
        access: roleAccess,
      };
    });

    // Build hierarchy tree
    const buildHierarchy = (roles, parentId = null) => {
      return roles
        .filter(r => r.parent_role_id === parentId)
        .sort((a, b) => (a.display_order || 999) - (b.display_order || 999))
        .map((role) => ({
          id: role.id,
          name: role.display_name || role.role_name,
          level: role.level || 0,
          children: buildHierarchy(roles, role.id),
        }));
    };

    const roleHierarchy = buildHierarchy(rbacRoles);

    const syncEndTime = Date.now();

    // Response
    res.json({
      success: true,
      syncedAt: new Date().toISOString(),
      syncDuration: `${syncEndTime - syncStartTime}ms`,
      summary: {
        totalRoles: rbacRoles.length,
        totalPermissions: rbacPermissions.length,
        totalRoutes: rbacRoutes.length,
        totalActions: rbacActions.length,
        totalUsers,
        totalModules: modules.length,
        totalUserRoleAssignments: rbacUserRoles.length,
      },
      roles: roleSummary,
      roleHierarchy,
      permissionMatrix: matrixData,
      routeMatrix,
      actions: rbacActions.map((a) => ({
        id: a.id,
        name: a.action_name,
        description: a.description,
      })),
      modules: modules.map((m) => ({
        id: m.id,
        name: m.name,
        key: m.key,
        isActive: m.is_active,
      })),
    });
  } catch (error) {
    console.error('[QA ERP Sync] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync ERP data',
      details: error.message,
    });
  }
});

module.exports = router;
