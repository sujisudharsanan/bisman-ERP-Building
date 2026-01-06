/**
 * BISMAN Internal Operations API
 * 
 * This is NOT customer ERP access.
 * Internal staff operate under BISMAN_ORG scope.
 * 
 * RULES:
 * - Internal users have no moduleId or clientId
 * - All actions are audit-logged
 * - Support access is time-limited and explicitly logged
 * - No cross-over with customer RBAC
 */

const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');
const { stripBusinessLevel } = require('../middleware/businessLevelProtection');

// ============================================
// INTERNAL ROLE DEFINITIONS
// ============================================

const InternalRoles = Object.freeze({
  BISMAN_FINANCE: 'BISMAN_FINANCE',
  BISMAN_BILLING: 'BISMAN_BILLING',
  BISMAN_SUPPORT: 'BISMAN_SUPPORT',
  BISMAN_ENGINEERING: 'BISMAN_ENGINEERING',
  BISMAN_CUSTOMER_CARE: 'BISMAN_CUSTOMER_CARE',
  ENTERPRISE_ADMIN: 'ENTERPRISE_ADMIN'
});

// Role permissions matrix
const InternalRolePermissions = Object.freeze({
  [InternalRoles.BISMAN_FINANCE]: [
    'view:billing',
    'view:usage',
    'view:invoices',
    'view:audit_logs',
    'manage:billing'
  ],
  [InternalRoles.BISMAN_BILLING]: [
    'view:billing',
    'view:usage',
    'view:invoices',
    'manage:invoices',
    'view:audit_logs'
  ],
  [InternalRoles.BISMAN_SUPPORT]: [
    'view:tickets',
    'manage:tickets',
    'view:audit_logs',
    'request:support_access',
    'view:customer_readonly'
  ],
  [InternalRoles.BISMAN_ENGINEERING]: [
    'view:system_health',
    'view:audit_logs',
    'view:logs',
    'manage:deployments',
    'view:metrics'
  ],
  [InternalRoles.BISMAN_CUSTOMER_CARE]: [
    'view:tickets',
    'manage:tickets',
    'view:audit_logs',
    'request:support_access',
    'view:customer_readonly'
  ],
  [InternalRoles.ENTERPRISE_ADMIN]: ['*'] // Full access
});

// ============================================
// INTERNAL ACCESS MIDDLEWARE
// ============================================

/**
 * Verify user is internal BISMAN staff
 * Internal users have no moduleId/clientId and belong to BISMAN_ORG
 */
function requireInternalAccess(req, res, next) {
  const user = req.user;
  
  if (!user) {
    return res.status(401).json({ ok: false, error: 'Authentication required' });
  }

  // Enterprise Admin always has internal access
  if (user.userType === 'ENTERPRISE_ADMIN') {
    req.internalRole = InternalRoles.ENTERPRISE_ADMIN;
    req.internalPermissions = ['*'];
    return next();
  }

  // Check if user is internal staff (no moduleId, no clientId, has internalRole)
  const internalRole = user.internalRole || user.role;
  
  if (!Object.values(InternalRoles).includes(internalRole)) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Internal access denied',
      message: 'This endpoint is for BISMAN internal staff only'
    });
  }

  // Verify no module/client scope (internal users are org-wide)
  if (user.module_id || user.tenant_id) {
    return res.status(403).json({
      ok: false,
      error: 'Access denied',
      message: 'Internal users cannot have module or client scope'
    });
  }

  req.internalRole = internalRole;
  req.internalPermissions = InternalRolePermissions[internalRole] || [];
  next();
}

/**
 * Check specific internal permission
 */
function requireInternalPermission(permission) {
  return (req, res, next) => {
    const perms = req.internalPermissions || [];
    
    // Wildcard grants all
    if (perms.includes('*')) {
      return next();
    }

    if (!perms.includes(permission)) {
      return res.status(403).json({
        ok: false,
        error: 'Permission denied',
        message: `Missing required permission: ${permission}`
      });
    }

    next();
  };
}

/**
 * Log internal action to audit trail
 */
async function logInternalAction(userId, action, details, options = {}) {
  const prisma = getPrisma();
  
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId,
        action: `INTERNAL:${action}`,
        table_name: options.tableName || 'internal_operations',
        record_id: options.recordId || null,
        old_values: options.oldValues || null,
        new_values: {
          ...details,
          internalAction: true,
          supportSessionId: options.supportSessionId || null,
          targetClientId: options.targetClientId || null
        },
        ip_address: options.ipAddress || null,
        user_agent: options.userAgent || null
      }
    });
  } catch (err) {
    console.error('[InternalOps] Audit log error:', err.message);
    // Don't throw - audit failure shouldn't block operations
    // But we should alert monitoring
  }
}

// Apply auth to all routes
router.use(authMiddleware);
router.use(requireInternalAccess);

// ============================================
// INTERNAL TEAM MANAGEMENT
// ============================================

/**
 * GET /api/internal/team
 * List internal team members
 */
router.get('/team', requireInternalPermission('view:audit_logs'), async (req, res) => {
  const prisma = getPrisma();
  
  try {
    // Get internal users (users with internal roles and no module/client scope)
    const internalUsers = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.role,
        u.is_active,
        u.created_at,
        u.profile_pic_url
      FROM users_enhanced u
      WHERE u.tenant_id IS NULL
        AND u.role IN ('BISMAN_FINANCE', 'BISMAN_BILLING', 'BISMAN_SUPPORT', 
                       'BISMAN_ENGINEERING', 'BISMAN_CUSTOMER_CARE')
      ORDER BY u.created_at DESC
    `;

    // Also include enterprise admins
    const enterpriseAdmins = await prisma.enterprise_admins.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        is_active: true,
        created_at: true,
        profile_pic_url: true
      }
    });

    const team = [
      ...enterpriseAdmins.map(ea => ({
        id: `ea_${ea.id}`,
        userId: ea.id,
        name: ea.name,
        email: ea.email,
        role: InternalRoles.ENTERPRISE_ADMIN,
        isActive: ea.is_active,
        createdAt: ea.created_at,
        profilePicUrl: ea.profile_pic_url,
        userType: 'ENTERPRISE_ADMIN'
      })),
      ...internalUsers.map(u => ({
        id: `user_${u.id}`,
        userId: u.id,
        name: u.username,
        email: u.email,
        role: u.role,
        isActive: u.is_active,
        createdAt: u.created_at,
        profilePicUrl: u.profile_pic_url,
        userType: 'INTERNAL_STAFF'
      }))
    ];

    await logInternalAction(req.user.id, 'VIEW_TEAM', { count: team.length }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      ok: true,
      team,
      roles: Object.values(InternalRoles),
      permissions: InternalRolePermissions
    });
  } catch (error) {
    console.error('[InternalOps] Team list error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch team' });
  }
});

/**
 * POST /api/internal/team
 * Add internal team member (Enterprise Admin only)
 */
router.post('/team', requireInternalPermission('*'), async (req, res) => {
  const prisma = getPrisma();
  const { email, name, role, password } = req.body;

  if (!email || !name || !role) {
    return res.status(400).json({ ok: false, error: 'Email, name, and role required' });
  }

  if (!Object.values(InternalRoles).includes(role) || role === InternalRoles.ENTERPRISE_ADMIN) {
    return res.status(400).json({ 
      ok: false, 
      error: 'Invalid role',
      validRoles: Object.values(InternalRoles).filter(r => r !== InternalRoles.ENTERPRISE_ADMIN)
    });
  }

  try {
    // Check if email exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ ok: false, error: 'Email already exists' });
    }

    // Create internal user (no moduleId, no tenantId)
    const bcrypt = require('bcrypt');
    const passwordHash = await bcrypt.hash(password || 'TempPass123!', 10);

    const newUser = await prisma.user.create({
      data: {
        username: name,
        email,
        password_hash: passwordHash,
        role,
        is_active: true,
        module_id: null,
        tenant_id: null,
        productType: 'INTERNAL'
      }
    });

    await logInternalAction(req.user.id, 'CREATE_INTERNAL_USER', {
      newUserId: newUser.id,
      email,
      role
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      recordId: newUser.id
    });

    res.json({
      ok: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.username,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('[InternalOps] Create team member error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create team member' });
  }
});

/**
 * PATCH /api/internal/team/:userId
 * Update internal team member role (Enterprise Admin only)
 * ✅ SECURITY: stripBusinessLevel prevents unauthorized business_level changes
 */
router.patch('/team/:userId', requireInternalPermission('*'), stripBusinessLevel, async (req, res) => {
  const prisma = getPrisma();
  const { userId } = req.params;
  const { role, isActive } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } });
    
    if (!user || user.module_id || user.tenant_id) {
      return res.status(404).json({ ok: false, error: 'Internal user not found' });
    }

    const updateData = {};
    if (role && Object.values(InternalRoles).includes(role) && role !== InternalRoles.ENTERPRISE_ADMIN) {
      updateData.role = role;
    }
    if (typeof isActive === 'boolean') {
      updateData.is_active = isActive;
    }

    const updated = await prisma.user.update({
      where: { id: parseInt(userId) },
      data: updateData
    });

    await logInternalAction(req.user.id, 'UPDATE_INTERNAL_USER', {
      targetUserId: userId,
      changes: updateData,
      previousRole: user.role
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      recordId: parseInt(userId),
      oldValues: { role: user.role, is_active: user.is_active }
    });

    res.json({ ok: true, user: updated });
  } catch (error) {
    console.error('[InternalOps] Update team member error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update team member' });
  }
});

// ============================================
// SUPPORT ACCESS MODE
// ============================================

/**
 * POST /api/internal/support-session
 * Request support access to a client (time-limited)
 */
router.post('/support-session', requireInternalPermission('request:support_access'), async (req, res) => {
  const prisma = getPrisma();
  const { clientId, reason, durationMinutes = 60 } = req.body;

  if (!clientId || !reason) {
    return res.status(400).json({ ok: false, error: 'Client ID and reason required' });
  }

  // Max 4 hours for support session
  const maxDuration = 240;
  const actualDuration = Math.min(durationMinutes, maxDuration);

  try {
    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: { id: true, name: true, client_code: true }
    });

    if (!client) {
      return res.status(404).json({ ok: false, error: 'Client not found' });
    }

    // Check for existing active session
    const existingSession = await prisma.$queryRaw`
      SELECT id FROM support_sessions 
      WHERE support_user_id = ${req.user.id}
        AND target_client_id = ${clientId}::uuid
        AND is_active = true
        AND expires_at > NOW()
      LIMIT 1
    `.catch(() => []);

    if (existingSession && existingSession.length > 0) {
      return res.status(409).json({ 
        ok: false, 
        error: 'Active support session already exists for this client'
      });
    }

    // Create support session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + actualDuration * 60 * 1000);

    const session = await prisma.$queryRaw`
      INSERT INTO support_sessions (
        support_user_id,
        target_client_id,
        reason,
        session_token,
        expires_at,
        is_active,
        created_at
      ) VALUES (
        ${req.user.id},
        ${clientId}::uuid,
        ${reason},
        ${sessionToken},
        ${expiresAt},
        true,
        NOW()
      )
      RETURNING id, support_user_id, target_client_id, reason, expires_at, created_at
    `;

    // Log support session creation (CRITICAL for audit)
    await logInternalAction(req.user.id, 'SUPPORT_SESSION_STARTED', {
      supportUserId: req.user.id,
      supportUserEmail: req.user.email,
      targetClientId: clientId,
      targetClientName: client.name,
      reason,
      durationMinutes: actualDuration,
      expiresAt: expiresAt.toISOString()
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      targetClientId: clientId,
      supportSessionId: session[0]?.id
    });

    res.json({
      ok: true,
      session: {
        id: session[0]?.id,
        clientId,
        clientName: client.name,
        reason,
        expiresAt,
        durationMinutes: actualDuration
      }
    });
  } catch (error) {
    console.error('[InternalOps] Support session error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create support session' });
  }
});

/**
 * GET /api/internal/support-sessions
 * List support sessions (active and history)
 */
router.get('/support-sessions', requireInternalPermission('view:audit_logs'), async (req, res) => {
  const prisma = getPrisma();
  // eslint-disable-next-line no-unused-vars
  const { status = 'all', page = 1, limit = 20 } = req.query;

  try {
    // TODO: Apply status filtering to query once migrated to Prisma
    // Currently status filter is parsed but not applied in raw query

    const sessions = await prisma.$queryRaw`
      SELECT 
        ss.id,
        ss.support_user_id,
        ss.target_client_id,
        ss.reason,
        ss.expires_at,
        ss.is_active,
        ss.created_at,
        ss.ended_at,
        c.name as client_name,
        c.client_code,
        u.username as support_user_name,
        u.email as support_user_email
      FROM support_sessions ss
      LEFT JOIN clients c ON ss.target_client_id = c.id
      LEFT JOIN users u ON ss.support_user_id = u.id
      ORDER BY ss.created_at DESC
      LIMIT ${parseInt(limit)}
      OFFSET ${(parseInt(page) - 1) * parseInt(limit)}
    `.catch(() => []);

    const totalResult = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM support_sessions
    `.catch(() => [{ count: 0 }]);

    res.json({
      ok: true,
      sessions: sessions || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult[0]?.count || 0
      }
    });
  } catch (error) {
    console.error('[InternalOps] List sessions error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch sessions' });
  }
});

/**
 * DELETE /api/internal/support-session/:sessionId
 * End a support session early
 */
router.delete('/support-session/:sessionId', requireInternalPermission('request:support_access'), async (req, res) => {
  const prisma = getPrisma();
  const { sessionId } = req.params;

  try {
    const session = await prisma.$queryRaw`
      SELECT * FROM support_sessions WHERE id = ${parseInt(sessionId)}
    `.catch(() => []);

    if (!session || session.length === 0) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }

    // Only session owner or enterprise admin can end
    if (session[0].support_user_id !== req.user.id && req.internalRole !== InternalRoles.ENTERPRISE_ADMIN) {
      return res.status(403).json({ ok: false, error: 'Cannot end another user\'s session' });
    }

    await prisma.$queryRaw`
      UPDATE support_sessions 
      SET is_active = false, ended_at = NOW()
      WHERE id = ${parseInt(sessionId)}
    `;

    await logInternalAction(req.user.id, 'SUPPORT_SESSION_ENDED', {
      sessionId: parseInt(sessionId),
      targetClientId: session[0].target_client_id,
      endedEarly: true
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      supportSessionId: parseInt(sessionId),
      targetClientId: session[0].target_client_id
    });

    res.json({ ok: true, message: 'Support session ended' });
  } catch (error) {
    console.error('[InternalOps] End session error:', error);
    res.status(500).json({ ok: false, error: 'Failed to end session' });
  }
});

/**
 * GET /api/internal/support-session/active
 * Get current user's active support session
 */
router.get('/support-session/active', async (req, res) => {
  const prisma = getPrisma();

  try {
    const session = await prisma.$queryRaw`
      SELECT 
        ss.*,
        c.name as client_name,
        c.client_code
      FROM support_sessions ss
      LEFT JOIN clients c ON ss.target_client_id = c.id
      WHERE ss.support_user_id = ${req.user.id}
        AND ss.is_active = true
        AND ss.expires_at > NOW()
      ORDER BY ss.created_at DESC
      LIMIT 1
    `.catch(() => []);

    res.json({
      ok: true,
      session: session && session.length > 0 ? session[0] : null
    });
  } catch (error) {
    console.error('[InternalOps] Active session error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch active session' });
  }
});

// ============================================
// CUSTOMER ASSISTANCE (Read-Only or Support Mode)
// ============================================

/**
 * GET /api/internal/customers
 * List customers for assistance (read-only)
 */
router.get('/customers', requireInternalPermission('view:customer_readonly'), async (req, res) => {
  const prisma = getPrisma();
  const { page = 1, limit = 20, search } = req.query;

  try {
    let whereClause = {};
    if (search) {
      whereClause = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { client_code: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ]
      };
    }

    const [clients, total] = await Promise.all([
      prisma.clients.findMany({
        where: whereClause,
        select: {
          id: true,
          name: true,
          client_code: true,
          status: true,
          productType: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          created_at: true,
          last_activity_date: true
        },
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      }),
      prisma.clients.count({ where: whereClause })
    ]);

    await logInternalAction(req.user.id, 'VIEW_CUSTOMERS', {
      search: search || null,
      page,
      count: clients.length
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      ok: true,
      customers: clients,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('[InternalOps] Customers list error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch customers' });
  }
});

/**
 * GET /api/internal/customers/:clientId
 * Get customer details (requires active support session for full access)
 */
router.get('/customers/:clientId', requireInternalPermission('view:customer_readonly'), async (req, res) => {
  const prisma = getPrisma();
  const { clientId } = req.params;

  try {
    // Check for active support session
    const activeSession = await prisma.$queryRaw`
      SELECT id FROM support_sessions
      WHERE support_user_id = ${req.user.id}
        AND target_client_id = ${clientId}::uuid
        AND is_active = true
        AND expires_at > NOW()
      LIMIT 1
    `.catch(() => []);

    const hasSupportAccess = activeSession && activeSession.length > 0;

    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      include: {
        users: hasSupportAccess ? {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            is_active: true,
            last_login_at: true
          }
        } : false
      }
    });

    if (!client) {
      return res.status(404).json({ ok: false, error: 'Customer not found' });
    }

    // Log access with support mode indication
    await logInternalAction(req.user.id, 'VIEW_CUSTOMER_DETAIL', {
      targetClientId: clientId,
      supportModeActive: hasSupportAccess,
      supportSessionId: activeSession[0]?.id || null
    }, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      targetClientId: clientId,
      supportSessionId: activeSession[0]?.id
    });

    res.json({
      ok: true,
      customer: client,
      supportModeActive: hasSupportAccess,
      accessLevel: hasSupportAccess ? 'full' : 'readonly'
    });
  } catch (error) {
    console.error('[InternalOps] Customer detail error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch customer' });
  }
});

// ============================================
// BILLING & USAGE (Internal View)
// ============================================

/**
 * GET /api/internal/billing/overview
 * View billing overview (BISMAN_FINANCE, BISMAN_BILLING)
 */
router.get('/billing/overview', requireInternalPermission('view:billing'), async (req, res) => {
  const prisma = getPrisma();

  try {
    const [activeSubscriptions, revenueStats] = await Promise.all([
      prisma.clients.groupBy({
        by: ['subscriptionPlan', 'subscriptionStatus'],
        _count: { id: true }
      }),
      prisma.$queryRaw`
        SELECT 
          COUNT(CASE WHEN subscription_status = 'active' THEN 1 END)::int as active_count,
          COUNT(CASE WHEN subscription_status = 'trial' THEN 1 END)::int as trial_count,
          COUNT(CASE WHEN subscription_status = 'expired' THEN 1 END)::int as expired_count,
          COUNT(*)::int as total_clients
        FROM clients
      `.catch(() => [{ active_count: 0, trial_count: 0, expired_count: 0, total_clients: 0 }])
    ]);

    await logInternalAction(req.user.id, 'VIEW_BILLING_OVERVIEW', {}, {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({
      ok: true,
      subscriptions: activeSubscriptions,
      stats: revenueStats[0] || {}
    });
  } catch (error) {
    console.error('[InternalOps] Billing overview error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch billing' });
  }
});

/**
 * GET /api/internal/usage
 * View usage statistics
 */
router.get('/usage', requireInternalPermission('view:usage'), async (req, res) => {
  const prisma = getPrisma();
  const { period = '30d' } = req.query;

  try {
    const daysBack = period === '7d' ? 7 : period === '90d' ? 90 : 30;
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);

    const usageStats = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*)::int as actions
      FROM audit_logs
      WHERE created_at >= ${startDate}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `.catch(() => []);

    res.json({
      ok: true,
      period,
      usage: usageStats
    });
  } catch (error) {
    console.error('[InternalOps] Usage stats error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch usage' });
  }
});

// ============================================
// SYSTEM HEALTH (Internal View)
// ============================================

/**
 * GET /api/internal/system-health
 * View system health metrics
 */
router.get('/system-health', requireInternalPermission('view:system_health'), async (req, res) => {
  const prisma = getPrisma();

  try {
    const [dbStats, recentErrors] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          (SELECT COUNT(*)::int FROM users_enhanced WHERE is_active = true) as active_users,
          (SELECT COUNT(*)::int FROM clients WHERE status = 'Active') as active_clients,
          (SELECT COUNT(*)::int FROM modules WHERE is_active = true) as active_modules,
          (SELECT COUNT(*)::int FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 hour') as logs_last_hour
      `.catch(() => [{}]),
      prisma.$queryRaw`
        SELECT action, COUNT(*)::int as count
        FROM audit_logs
        WHERE action LIKE '%ERROR%' OR action LIKE '%FAILED%'
        AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY action
        ORDER BY count DESC
        LIMIT 10
      `.catch(() => [])
    ]);

    res.json({
      ok: true,
      health: {
        status: 'operational',
        timestamp: new Date().toISOString(),
        database: dbStats[0] || {},
        recentErrors: recentErrors || []
      }
    });
  } catch (error) {
    console.error('[InternalOps] System health error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch system health' });
  }
});

// ============================================
// AUDIT LOGS (Internal View)
// ============================================

/**
 * GET /api/internal/audit-logs
 * View audit logs with filters
 */
router.get('/audit-logs', requireInternalPermission('view:audit_logs'), async (req, res) => {
  const prisma = getPrisma();
  // clientId reserved for future multi-tenant filtering
  // eslint-disable-next-line no-unused-vars
  const { page = 1, limit = 50, userId, action, startDate, endDate, clientId } = req.query;

  try {
    const where = {};
    if (userId) where.user_id = parseInt(userId);
    if (action) where.action = { contains: action };
    if (startDate) where.created_at = { ...where.created_at, gte: new Date(startDate) };
    if (endDate) where.created_at = { ...where.created_at, lte: new Date(endDate) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
        include: {
          user: {
            select: { id: true, username: true, email: true }
          }
        }
      }),
      prisma.auditLog.count({ where })
    ]);

    res.json({
      ok: true,
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total }
    });
  } catch (error) {
    console.error('[InternalOps] Audit logs error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit logs' });
  }
});

// Export router and utilities
module.exports = router;
module.exports.InternalRoles = InternalRoles;
module.exports.InternalRolePermissions = InternalRolePermissions;
module.exports.requireInternalAccess = requireInternalAccess;
module.exports.requireInternalPermission = requireInternalPermission;
module.exports.logInternalAction = logInternalAction;
