/**
 * Per-User Usage API Routes
 * 
 * Endpoints for tracking individual user resource consumption:
 * - Activity stats (actions, API calls, page views)
 * - Storage usage per user
 * - Security information
 * - Session management
 * - Module usage breakdown
 */

const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth');
const prisma = require('../../lib/prisma');

// Middleware for admin access
const requireAdminAccess = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  const allowedRoles = ['ADMIN', 'SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'HUB_INCHARGE'];
  
  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({ 
      ok: false, 
      error: 'Access denied. Admin privileges required.' 
    });
  }
  next();
};

/**
 * GET /api/admin/user-usage/:userId
 * 
 * Get comprehensive usage data for a specific user
 */
router.get('/:userId', authenticate, requireAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { period = '30d' } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Fetch user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            subscription_plan: true,
            productType: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Fetch activity data in parallel
    const [
      activityLogs,
      loginHistory,
      sessions,
      permissions
    ] = await Promise.all([
      // Recent activity logs for this user
      prisma.recent_activity.findMany({
        where: {
          username: user.username,
          created_at: {
            gte: startDate,
            lte: endDate
          }
        },
        orderBy: { created_at: 'desc' },
        take: 100
      }),

      // Login history
      prisma.recent_activity.findMany({
        where: {
          username: user.username,
          action: { contains: 'login', mode: 'insensitive' }
        },
        orderBy: { created_at: 'desc' },
        take: 50
      }),

      // Active sessions
      prisma.user_sessions?.findMany?.({
        where: {
          user_id: userId,
          is_active: true,
          expires_at: { gte: new Date() }
        },
        orderBy: { created_at: 'desc' }
      }).catch(() => []),

      // User permissions
      prisma.permission?.findMany?.({
        where: { user_id: userId },
        include: {
          module: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      }).catch(() => [])
    ]);

    // Calculate activity stats
    const activityStats = {
      totalActions: activityLogs.length,
      apiCalls: activityLogs.filter(a => a.action?.toLowerCase().includes('api')).length,
      pageViews: activityLogs.filter(a => a.action?.toLowerCase().includes('view')).length,
      logins: loginHistory.length,
      exports: activityLogs.filter(a => a.action?.toLowerCase().includes('export')).length
    };

    // Group activity by date for chart
    const dailyActivity = {};
    activityLogs.forEach(log => {
      const date = new Date(log.created_at).toISOString().split('T')[0];
      if (!dailyActivity[date]) {
        dailyActivity[date] = { actions: 0, apiCalls: 0, pageViews: 0 };
      }
      dailyActivity[date].actions++;
      if (log.action?.toLowerCase().includes('api')) dailyActivity[date].apiCalls++;
      if (log.action?.toLowerCase().includes('view')) dailyActivity[date].pageViews++;
    });

    // Group by module
    const moduleUsage = {};
    activityLogs.forEach(log => {
      const module = log.entity || 'Other';
      if (!moduleUsage[module]) {
        moduleUsage[module] = { visits: 0, actions: 0, lastAccessed: log.created_at };
      }
      moduleUsage[module].visits++;
      moduleUsage[module].actions++;
    });

    // Security information
    const lastLogin = loginHistory[0];
    const failedLogins = loginHistory.filter(l => 
      l.action?.toLowerCase().includes('fail') || 
      l.details?.success === false
    ).length;

    const security = {
      lastLogin: lastLogin?.created_at?.toISOString() || null,
      lastLoginIP: lastLogin?.details?.ip || null,
      lastLoginDevice: lastLogin?.details?.userAgent || null,
      lastLoginLocation: lastLogin?.details?.location || null,
      failedLoginAttempts: failedLogins,
      mfaEnabled: user.mfa_enabled || false,
      passwordLastChanged: user.password_changed_at?.toISOString() || null,
      activeSessions: Array.isArray(sessions) ? sessions.length : 0,
      accountLocked: user.is_locked || false
    };

    // Transform sessions
    const transformedSessions = (Array.isArray(sessions) ? sessions : []).map(s => ({
      id: s.id?.toString(),
      device: s.device || 'Unknown',
      browser: s.browser || 'Unknown',
      os: s.os || 'Unknown',
      ip: s.ip_address || '—',
      location: s.location || 'Unknown',
      startedAt: s.created_at?.toISOString(),
      lastActivity: s.last_activity?.toISOString() || s.created_at?.toISOString(),
      isCurrent: s.token === req.cookies?.token
    }));

    // Format recent actions
    const recentActions = activityLogs.slice(0, 20).map(log => ({
      id: log.id?.toString(),
      action: log.action,
      actionType: getActionType(log.action),
      resource: log.entity || 'Unknown',
      resourceId: log.entity_id || '—',
      timestamp: log.created_at?.toISOString(),
      ip: log.details?.ip || '—',
      status: log.details?.success !== false ? 'success' : 'failure'
    }));

    // Storage calculation (if applicable)
    let storage = null;
    try {
      // This would need to be customized based on your file storage implementation
      const files = await prisma.file?.findMany?.({
        where: { uploaded_by: userId }
      });

      if (files && files.length > 0) {
        const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
        const breakdown = {};
        
        files.forEach(f => {
          const type = getFileCategory(f.mime_type || f.name);
          if (!breakdown[type]) {
            breakdown[type] = { size: 0, count: 0 };
          }
          breakdown[type].size += f.size || 0;
          breakdown[type].count++;
        });

        storage = {
          total: user.client?.storage_quota || 5 * 1024 * 1024 * 1024, // 5GB default
          used: totalSize,
          breakdown: Object.entries(breakdown).map(([type, data]) => ({
            type,
            size: data.size,
            count: data.count
          })),
          recentFiles: files.slice(0, 5).map(f => ({
            name: f.name,
            type: f.mime_type,
            size: f.size,
            uploadedAt: f.created_at?.toISOString()
          }))
        };
      }
    } catch (err) {
      // Storage tracking not available
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.is_active ? 'active' : 'inactive',
        organization: {
          id: user.client?.id,
          name: user.client?.name,
          plan: user.client?.subscription_plan
        },
        createdAt: user.created_at?.toISOString(),
        accountType: user.auth_provider || 'local'
      },
      activityStats,
      dailyActivity: Object.entries(dailyActivity).map(([date, data]) => ({
        date,
        ...data
      })).sort((a, b) => a.date.localeCompare(b.date)),
      moduleUsage: Object.entries(moduleUsage).map(([name, data], i) => ({
        name,
        visits: data.visits,
        actions: data.actions,
        lastAccessed: data.lastAccessed?.toISOString(),
        color: getModuleColor(i)
      })),
      security,
      sessions: transformedSessions,
      recentActions,
      storage,
      permissions: (permissions || []).map(p => ({
        moduleId: p.module?.id,
        moduleName: p.module?.name,
        category: p.module?.category,
        canRead: p.can_read,
        canCreate: p.can_create,
        canUpdate: p.can_update,
        canDelete: p.can_delete
      }))
    });

  } catch (error) {
    console.error('[User Usage] Error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user usage data' });
  }
});

/**
 * DELETE /api/admin/user-usage/:userId/sessions/:sessionId
 * 
 * Revoke a specific user session
 */
router.delete('/:userId/sessions/:sessionId', authenticate, requireAdminAccess, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const sessionId = req.params.sessionId;

    // Verify the session belongs to the user
    const session = await prisma.user_sessions?.findFirst?.({
      where: {
        id: parseInt(sessionId),
        user_id: userId
      }
    });

    if (!session) {
      return res.status(404).json({ ok: false, error: 'Session not found' });
    }

    // Deactivate the session
    await prisma.user_sessions?.update?.({
      where: { id: parseInt(sessionId) },
      data: { is_active: false }
    });

    // Log the action
    await prisma.recent_activity?.create?.({
      data: {
        action: 'Session Revoked',
        entity: 'Session',
        entity_id: sessionId,
        username: req.user?.username || 'System',
        details: { 
          revokedBy: req.user?.id,
          targetUser: userId
        }
      }
    });

    res.json({ ok: true, message: 'Session revoked successfully' });

  } catch (error) {
    console.error('[Session Revoke] Error:', error);
    res.status(500).json({ ok: false, error: 'Failed to revoke session' });
  }
});

// Helper functions
function getActionType(action) {
  const actionLower = (action || '').toLowerCase();
  if (actionLower.includes('create') || actionLower.includes('add')) return 'create';
  if (actionLower.includes('update') || actionLower.includes('edit')) return 'update';
  if (actionLower.includes('delete') || actionLower.includes('remove')) return 'delete';
  if (actionLower.includes('view') || actionLower.includes('read')) return 'view';
  if (actionLower.includes('login')) return 'login';
  if (actionLower.includes('logout')) return 'logout';
  if (actionLower.includes('export')) return 'export';
  return 'system';
}

function getFileCategory(mimeOrName) {
  const str = (mimeOrName || '').toLowerCase();
  if (str.includes('image') || str.includes('.png') || str.includes('.jpg') || str.includes('.jpeg') || str.includes('.gif')) {
    return 'images';
  }
  if (str.includes('pdf') || str.includes('.doc') || str.includes('document')) {
    return 'documents';
  }
  if (str.includes('sheet') || str.includes('.xls') || str.includes('.csv')) {
    return 'spreadsheets';
  }
  return 'other';
}

function getModuleColor(index) {
  const colors = ['#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899', '#3b82f6', '#f97316'];
  return colors[index % colors.length];
}

module.exports = router;
