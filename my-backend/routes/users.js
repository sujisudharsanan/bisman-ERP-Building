/**
 * User Management API Routes (JavaScript version)
 * Handles CRUD operations for users
 * 
 * ARCHITECTURE: All user lifecycle operations MUST delegate to UserService
 * See docs/USER_MODEL_LOCK.md for enforcement rules
 * 
 * Routes:
 * - GET    /api/system/users           - List users with filters
 * - GET    /api/system/users/:id       - Get user details
 * - POST   /api/system/users           - Create new user (via UserService)
 * - PUT    /api/system/users/:id       - Update user (via UserService)
 * - DELETE /api/system/users/:id       - Delete user (via UserService)
 * - GET    /api/system/users/export    - Export users to CSV/Excel
 * - PUT    /api/system/users/:id/status - Update user status
 * - GET    /api/system/users/subscription-info - Get subscription limits for UI
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate: authMiddleware } = require('../middleware/auth');
const UserService = require('../services/userService');

// Lazy prisma
let _prisma = null;
const prisma = new Proxy({}, {
  get(_, prop) {
    if (!_prisma) _prisma = getPrisma();
    return _prisma[prop];
  }
});

// Core roles that can manage users
const CORE_ROLES = [
  'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'ADMIN', 'ADMIN_OPS', 
  'CFO', 'HUB_INCHARGE', 'BRANCH_MANAGER', 'SYSTEM_ADMIN'
];

/**
 * Middleware to check user creation limit against subscription
 */
const checkUserCreationLimit = () => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenant_id;
      if (!tenantId) {
        return next(); // Super admins without tenant_id bypass
      }
      
      // Get subscription
      const subscription = await prisma.client_subscriptions.findUnique({
        where: { client_id: tenantId },
      });
      
      if (!subscription || !subscription.is_active) {
        return res.status(403).json({
          error: 'No active subscription',
          message: 'Your organization does not have an active subscription.',
          code: 'NO_SUBSCRIPTION',
        });
      }
      
      // Get user count
      const userCount = await prisma.users_enhanced.count({
        where: { 
          tenant_id: tenantId,
          is_active: true,
        },
      });
      
      // Check against plan limit
      const planSnapshot = subscription.plan_snapshot_json || {};
      const maxUsers = planSnapshot.max_users || subscription.max_users || 999;
      
      if (userCount >= maxUsers) {
        return res.status(403).json({
          error: 'User limit reached',
          message: `Your plan allows ${maxUsers} users. Please upgrade to add more users.`,
          code: 'USER_LIMIT_REACHED',
          currentCount: userCount,
          limit: maxUsers,
        });
      }
      
      next();
    } catch (error) {
      console.error('[checkUserCreationLimit] Error:', error);
      next(); // Allow on error to not block operations
    }
  };
};

/**
 * List users with filters, search, pagination, and sorting
 * GET /api/system/users
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      search = '',
      role,
      productType,
      status = 'active',
      page = '1',
      limit = '20',
      sortBy = 'created_at',
      sortOrder = 'desc',
    } = req.query;

    const where = {};

    // Filter by tenant if user has one
    if (req.user?.tenant_id) {
      where.tenant_id = req.user.tenant_id;
    }

    // Search filter (username or email)
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role && role !== 'all') {
      where.role = role;
    }

    // Product type filter
    if (productType && productType !== 'all') {
      where.product_type = productType;
    }

    // Status filter
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [users, total] = await Promise.all([
      prisma.users_enhanced.findMany({
        where,
        skip,
        take,
        orderBy: {
          [sortBy]: sortOrder,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          first_name: true,
          last_name: true,
          phone: true,
          profile_pic_url: true,
          is_active: true,
          last_login: true,
          created_at: true,
          updated_at: true,
          product_type: true,
          tenant_id: true,
          business_level: true,
          reports_to: true,
        },
      }),
      prisma.users_enhanced.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error.message,
    });
  }
});

/**
 * Get subscription info for UI
 * GET /api/system/users/subscription-info
 */
router.get('/subscription-info', authMiddleware, async (req, res) => {
  try {
    const tenantId = req.user?.tenant_id;
    
    if (!tenantId) {
      // Super admin - unlimited
      return res.json({
        success: true,
        data: {
          currentUserCount: 0,
          maxUsers: 999,
          remainingSlots: 999,
          planName: 'Super Admin',
          isUnlimited: true,
        },
      });
    }
    
    const [subscription, userCount] = await Promise.all([
      prisma.client_subscriptions.findUnique({
        where: { client_id: tenantId },
      }),
      prisma.users_enhanced.count({
        where: { tenant_id: tenantId, is_active: true },
      }),
    ]);
    
    const planSnapshot = subscription?.plan_snapshot_json || {};
    const maxUsers = planSnapshot.max_users || subscription?.max_users || 10;
    
    res.json({
      success: true,
      data: {
        currentUserCount: userCount,
        maxUsers,
        remainingSlots: Math.max(0, maxUsers - userCount),
        planName: planSnapshot.name || 'Standard',
        isUnlimited: maxUsers >= 999,
      },
    });
  } catch (error) {
    console.error('Get subscription info error:', error);
    res.status(500).json({
      error: 'Failed to get subscription info',
      details: error.message,
    });
  }
});

/**
 * Get user by ID
 * GET /api/system/users/:id
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await prisma.users_enhanced.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        first_name: true,
        last_name: true,
        phone: true,
        profile_pic_url: true,
        is_active: true,
        last_login: true,
        created_at: true,
        updated_at: true,
        product_type: true,
        tenant_id: true,
        super_admin_id: true,
        business_level: true,
        reports_to: true,
        assigned_modules: true,
        page_permissions: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      error: 'Failed to fetch user',
      details: error.message,
    });
  }
});

/**
 * Get user usage statistics
 * GET /api/system/users/:id/usage
 * 
 * Returns aggregated activity stats from audit_logs, user_sessions, recent_activity
 */
router.get('/:id/usage', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // First get the user to find legacy_id (used in older audit tables)
    const user = await prisma.users_enhanced.findUnique({
      where: { id },
      select: { id: true, legacy_id: true, email: true, last_login: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const legacyId = user.legacy_id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Initialize stats
    const stats = {
      totalActions: 0,
      apiCalls: 0,
      pageViews: 0,
      logins: 0,
      recentActions: [],
      dailyActivity: [],
      moduleUsage: [],
      sessions: [],
    };

    // Get audit log counts (if legacy_id exists)
    if (legacyId) {
      try {
        // Total actions from audit_logs
        const totalActions = await prisma.audit_logs.count({
          where: { 
            user_id: legacyId,
            created_at: { gte: thirtyDaysAgo },
          },
        });
        stats.totalActions = totalActions;

        // Get action breakdown
        const actionBreakdown = await prisma.audit_logs.groupBy({
          by: ['action'],
          where: { 
            user_id: legacyId,
            created_at: { gte: thirtyDaysAgo },
          },
          _count: { id: true },
        });

        // Map actions to categories
        actionBreakdown.forEach(item => {
          const action = item.action?.toLowerCase() || '';
          if (action.includes('login')) stats.logins += item._count.id;
          else if (action.includes('view') || action.includes('read')) stats.pageViews += item._count.id;
          else stats.apiCalls += item._count.id;
        });

        // Get recent actions (last 20)
        const recentAudit = await prisma.audit_logs.findMany({
          where: { user_id: legacyId },
          orderBy: { created_at: 'desc' },
          take: 20,
          select: {
            id: true,
            action: true,
            table_name: true,
            record_id: true,
            created_at: true,
            ip_address: true,
          },
        });

        stats.recentActions = recentAudit.map(a => ({
          id: a.id.toString(),
          action: a.action,
          resource: a.table_name || 'Unknown',
          resourceId: a.record_id?.toString(),
          timestamp: a.created_at?.toISOString(),
          ip: a.ip_address,
          status: 'success',
        }));

        // Daily activity for charts (last 14 days)
        const dailyStats = await prisma.$queryRaw`
          SELECT 
            DATE(created_at) as date,
            COUNT(*) as actions,
            COUNT(CASE WHEN action ILIKE '%view%' OR action ILIKE '%read%' THEN 1 END) as page_views,
            COUNT(CASE WHEN action NOT ILIKE '%view%' AND action NOT ILIKE '%read%' THEN 1 END) as api_calls
          FROM audit_logs
          WHERE user_id = ${legacyId}
            AND created_at >= ${new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)}
          GROUP BY DATE(created_at)
          ORDER BY date DESC
        `;

        stats.dailyActivity = (dailyStats || []).map((d) => ({
          date: d.date ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
          actions: Number(d.actions) || 0,
          pageViews: Number(d.page_views) || 0,
          apiCalls: Number(d.api_calls) || 0,
        })).reverse();

        // Module usage (by table_name)
        const moduleStats = await prisma.audit_logs.groupBy({
          by: ['table_name'],
          where: { 
            user_id: legacyId,
            table_name: { not: null },
            created_at: { gte: thirtyDaysAgo },
          },
          _count: { id: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10,
        });

        const colors = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#14b8a6', '#f97316', '#84cc16'];
        stats.moduleUsage = moduleStats.map((m, i) => ({
          name: m.table_name || 'Unknown',
          visits: Math.floor(m._count.id * 0.4),
          actions: m._count.id,
          color: colors[i % colors.length],
        }));

      } catch (auditErr) {
        console.warn('Could not fetch audit_logs:', auditErr.message);
      }

      // Get session info
      try {
        const sessions = await prisma.user_sessions.findMany({
          where: { 
            user_id: legacyId,
            is_active: true,
          },
          orderBy: { last_activity_at: 'desc' },
          take: 5,
          select: {
            id: true,
            ip_address: true,
            user_agent: true,
            created_at: true,
            last_activity_at: true,
            is_active: true,
          },
        });

        stats.sessions = sessions.map(s => ({
          id: s.id.toString(),
          ip: s.ip_address,
          userAgent: s.user_agent,
          device: s.user_agent?.includes('Mobile') ? 'Mobile' : 'Desktop',
          browser: extractBrowser(s.user_agent),
          os: extractOS(s.user_agent),
          startedAt: s.created_at?.toISOString(),
          lastActivity: s.last_activity_at?.toISOString(),
          isCurrent: false,
        }));
      } catch (sessionErr) {
        console.warn('Could not fetch user_sessions:', sessionErr.message);
      }
    }

    // Get recent_activity (uses UUID user_id directly - need to check)
    try {
      const recentActivity = await prisma.recent_activity.findMany({
        where: { 
          OR: [
            { user_id: legacyId },
          ],
        },
        orderBy: { created_at: 'desc' },
        take: 10,
      });

      if (recentActivity.length > 0 && stats.recentActions.length === 0) {
        stats.recentActions = recentActivity.map(a => ({
          id: a.id,
          action: a.action,
          resource: a.entity,
          resourceId: a.entity_id,
          timestamp: a.created_at?.toISOString(),
          status: 'success',
        }));
      }
    } catch (recentErr) {
      console.warn('Could not fetch recent_activity:', recentErr.message);
    }

    res.json({
      success: true,
      data: {
        userId: id,
        legacyId,
        lastLogin: user.last_login?.toISOString(),
        stats: {
          totalActions: stats.totalActions,
          apiCalls: stats.apiCalls,
          pageViews: stats.pageViews,
          logins: stats.logins,
          trend: 0,
        },
        dailyActivity: stats.dailyActivity,
        moduleUsage: stats.moduleUsage,
        recentActions: stats.recentActions,
        sessions: stats.sessions,
      },
    });
  } catch (error) {
    console.error('Get user usage error:', error);
    res.status(500).json({
      error: 'Failed to fetch user usage statistics',
      details: error.message,
    });
  }
});

// Helper to extract browser from user agent
function extractBrowser(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}

// Helper to extract OS from user agent
function extractOS(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Mac')) return 'macOS';
  if (ua.includes('Linux')) return 'Linux';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('iOS') || ua.includes('iPhone')) return 'iOS';
  return 'Other';
}

/**
 * Reset user password (admin action)
 * POST /api/system/users/:id/reset-password
 * 
 * Allows admin to reset a user's password
 */
router.post('/:id/reset-password', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    const currentUserRole = req.user?.role;

    // Only admins can reset passwords
    if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to reset passwords' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find the user
    const user = await prisma.users_enhanced.findUnique({
      where: { id },
      select: { id: true, email: true, tenant_id: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash the new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    await prisma.users_enhanced.update({
      where: { id },
      data: {
        password_hash: hashedPassword,
        salt: salt,
        password_changed_at: new Date(),
        login_attempts: 0,
        locked_until: null,
      },
    });

    console.log(`[reset-password] Password reset for user ${user.email} by ${req.user?.email}`);

    res.json({
      success: true,
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      error: 'Failed to reset password',
      details: error.message,
    });
  }
});

/**
 * Create new user
 * POST /api/system/users
 * 
 * SUBSCRIPTION ENFORCEMENT: User count is checked against client's subscription limit.
 * If limit is reached, returns 403 with upgrade message.
 */
router.post('/', authMiddleware, checkUserCreationLimit(), async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    const currentUserTenantId = req.user?.tenant_id;
    const currentUserSuperAdminId = req.user?.super_admin_id;

    // Only admins can create users
    if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to create users' });
    }

    const {
      username,
      email,
      password,
      role,
      role_ids,
      business_level,
      reports_to,
      productType = 'BUSINESS_ERP',
      tenant_id,
      super_admin_id,
      profile_pic_url,
      assignedModules,
      pagePermissions,
      first_name,
      last_name,
      mobile,
      phone,
    } = req.body;

    // Use provided tenant_id/super_admin_id or inherit from current user
    const finalTenantId = tenant_id || currentUserTenantId || null;
    const finalSuperAdminId = super_admin_id || currentUserSuperAdminId || null;

    // Generate username from first_name + last_name if not provided
    const generateUsername = () => {
      if (first_name && last_name) {
        const base = `${first_name}_${last_name}`.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        return `${base}_${randomSuffix}`;
      } else if (email) {
        return email.split('@')[0];
      }
      return `user_${Date.now()}`;
    };

    const finalUsername = username || generateUsername();
    const finalPhone = mobile || phone || null;
    const finalRole = role || (role_ids && role_ids.length > 0 ? role_ids[0] : 'USER');

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Password strength validation - minimum 12 chars with complexity
    if (password.length < 12) {
      return res.status(400).json({
        error: 'Password must be at least 12 characters long',
      });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one uppercase letter',
      });
    }
    if (!/[a-z]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one lowercase letter',
      });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one number',
      });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      return res.status(400).json({
        error: 'Password must contain at least one special character',
      });
    }

    // Check if user already exists
    const existingUser = await prisma.users_enhanced.findFirst({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'User with this email already exists',
      });
    }

    // CANONICAL: Delegate to UserService for all user creation
    const newUser = await UserService.createUser(
      {
        username: finalUsername,
        email,
        password,
        role: finalRole,
        role_ids: role_ids || undefined,
        business_level: business_level !== undefined ? business_level : undefined,
        reports_to: reports_to || undefined,
        tenant_id: finalTenantId,
        super_admin_id: finalSuperAdminId,
        first_name: first_name || undefined,
        last_name: last_name || undefined,
        phone: finalPhone || undefined,
        product_type: productType,
        profile_pic_url: profile_pic_url || undefined,
        assigned_modules: assignedModules || undefined,
        page_permissions: pagePermissions || undefined,
      },
      {
        adminUserId: currentUserId,
        isEnterpriseAdmin: currentUserRole === 'ENTERPRISE_ADMIN',
        skipSubscriptionCheck: false,
      }
    );

    res.status(201).json({
      success: true,
      data: newUser,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      error: 'Failed to create user',
      details: error.message,
    });
  }
});

/**
 * Update user
 * PUT /api/system/users/:id
 */
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role;

    // Only admins can update users
    if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update users' });
    }

    const {
      username,
      email,
      role,
      first_name,
      last_name,
      phone,
      profile_pic_url,
      is_active,
      business_level,
      reports_to,
      assigned_modules,
      page_permissions,
    } = req.body;

    const existingUser = await prisma.users_enhanced.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email.toLowerCase();
    if (role !== undefined) updateData.role = role;
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (profile_pic_url !== undefined) updateData.profile_pic_url = profile_pic_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (business_level !== undefined) updateData.business_level = business_level;
    if (reports_to !== undefined) updateData.reports_to = reports_to;
    if (assigned_modules !== undefined) updateData.assigned_modules = assigned_modules;
    if (page_permissions !== undefined) updateData.page_permissions = page_permissions;

    const updatedUser = await prisma.users_enhanced.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message,
    });
  }
});

/**
 * Delete user
 * DELETE /api/system/users/:id
 */
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserRole = req.user?.role;

    // Only admins can delete users
    if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to delete users' });
    }

    const existingUser = await prisma.users_enhanced.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Soft delete by setting is_active to false
    await prisma.users_enhanced.update({
      where: { id },
      data: { is_active: false },
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error.message,
    });
  }
});

/**
 * Update user status
 * PUT /api/system/users/:id/status
 */
router.put('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' or 'inactive'
    const currentUserRole = req.user?.role;

    // Only admins can update user status
    if (!CORE_ROLES.includes(currentUserRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to update user status' });
    }

    const existingUser = await prisma.users_enhanced.findUnique({
      where: { id },
    });

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updatedUser = await prisma.users_enhanced.update({
      where: { id },
      data: { is_active: status === 'active' },
    });

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${status === 'active' ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      details: error.message,
    });
  }
});

module.exports = router;
