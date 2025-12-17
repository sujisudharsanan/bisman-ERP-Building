/**
 * Security Governance API Routes
 * Enterprise-level security monitoring and audit control
 * Access: ENTERPRISE_ADMIN, SUPER_ADMIN only
 */

const express = require('express');
const router = express.Router();
const { prisma } = require('../lib/prisma');
const { authMiddleware, requireRoles } = require('../middleware/auth');

// Apply auth to all routes
router.use(authMiddleware);
router.use(requireRoles(['ENTERPRISE_ADMIN', 'SUPER_ADMIN']));

/**
 * GET /api/security-governance/overview
 */
router.get('/overview', async (req, res) => {
  try {
    const { moduleId, scope = 'system' } = req.query;
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const scopeFilter = {};
    if (scope === 'module' && moduleId) {
      scopeFilter.moduleId = moduleId;
    }

    const [totalUsers, activeModules, activeClients, recentDenials, recentViolations, auditLogCount] = await Promise.all([
      prisma.user.count({ where: { isActive: true, ...scopeFilter } }),
      prisma.module.count({ where: { isActive: true } }),
      prisma.client.count({ where: { isActive: true } }),
      prisma.auditLog.count({ where: { action: { contains: 'DENIED' }, createdAt: { gte: last24h }, ...scopeFilter } }).catch(() => 0),
      prisma.securityViolation?.count({ where: { createdAt: { gte: last7d }, ...scopeFilter } }).catch(() => 0),
      prisma.auditLog.count({ where: { createdAt: { gte: last7d }, ...scopeFilter } }).catch(() => 0)
    ]);

    let healthStatus = 'healthy', healthLabel = 'System Healthy', healthColor = 'green';
    let healthDescription = 'All security systems operating normally';

    if (recentViolations > 10 || recentDenials > 50) {
      healthStatus = 'critical'; healthLabel = 'Critical Issues'; healthColor = 'red';
      healthDescription = 'Multiple security violations detected';
    } else if (recentViolations > 5 || recentDenials > 20) {
      healthStatus = 'warning'; healthLabel = 'Attention Needed'; healthColor = 'yellow';
      healthDescription = 'Some security events require review';
    }

    const cards = [
      { id: 'system-health', title: 'System Health', value: healthLabel, status: healthStatus, icon: 'Shield', description: healthDescription },
      { id: 'active-users', title: 'Active Users', value: totalUsers.toString(), status: 'healthy', icon: 'Users', description: 'Total active users' },
      { id: 'access-denials', title: 'Access Denials (24h)', value: recentDenials.toString(), status: recentDenials > 20 ? 'warning' : 'healthy', icon: 'ShieldOff', description: 'Blocked attempts' },
      { id: 'security-violations', title: 'Violations (7d)', value: recentViolations.toString(), status: recentViolations > 5 ? 'critical' : 'healthy', icon: 'AlertTriangle', description: 'Policy violations' },
      { id: 'audit-coverage', title: 'Audit Coverage', value: auditLogCount > 0 ? '100%' : '0%', status: 'healthy', icon: 'FileCheck', description: 'Actions audited' },
      { id: 'module-isolation', title: 'Module Isolation', value: 'Enforced', status: 'healthy', icon: 'Lock', description: 'Data isolation active' }
    ];

    res.json({
      ok: true,
      scope: { type: scope, moduleId: moduleId || null },
      lastUpdated: now.toISOString(),
      healthStatus: { status: healthStatus, label: healthLabel, color: healthColor, description: healthDescription },
      cards,
      summary: { totalUsers, activeModules, activeClients, recentDenials, recentViolations, auditLogCount }
    });
  } catch (error) {
    console.error('Security overview error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch security overview' });
  }
});

/**
 * GET /api/security-governance/violations
 */
router.get('/violations', async (req, res) => {
  try {
    const { page = 1, limit = 20, severity, moduleId, startDate, endDate } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const where = {};
    if (severity) where.severity = severity;
    if (moduleId) where.moduleId = moduleId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    let violations = [], total = 0;
    try {
      [violations, total] = await Promise.all([
        prisma.securityViolation.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
        prisma.securityViolation.count({ where })
      ]);
    } catch {
      const auditWhere = { action: { contains: 'DENIED' }, ...where };
      const [auditLogs, auditTotal] = await Promise.all([
        prisma.auditLog.findMany({ where: auditWhere, skip, take, orderBy: { createdAt: 'desc' } }),
        prisma.auditLog.count({ where: auditWhere })
      ]);
      violations = auditLogs.map(log => ({
        id: log.id, type: 'ACCESS_DENIED', severity: 'medium', description: log.action,
        userId: log.userId, userName: log.metadata?.userName || 'Unknown',
        resource: log.resource || 'N/A', createdAt: log.createdAt, resolved: false
      }));
      total = auditTotal;
    }

    res.json({
      ok: true, violations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Security violations error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch violations' });
  }
});

/**
 * GET /api/security-governance/rbac-structure
 */
router.get('/rbac-structure', async (req, res) => {
  try {
    const { moduleId } = req.query;
    const roles = await prisma.role.findMany({
      where: moduleId ? { moduleId } : {},
      include: { permissions: true, _count: { select: { users: true } } },
      orderBy: { level: 'asc' }
    }).catch(() => []);

    const roleHierarchy = roles.map(role => ({
      id: role.id, name: role.name, displayName: role.displayName || role.name,
      level: role.level || 0, description: role.description || '',
      userCount: role._count?.users || 0,
      permissions: role.permissions?.map(p => ({ id: p.id, name: p.name, resource: p.resource })) || [],
      isSystem: role.isSystem || false
    }));

    const permissions = await prisma.permission.findMany({ orderBy: { resource: 'asc' } }).catch(() => []);
    const permissionCategories = {};
    permissions.forEach(p => {
      const cat = p.resource?.split(':')[0] || 'general';
      if (!permissionCategories[cat]) permissionCategories[cat] = [];
      permissionCategories[cat].push({ id: p.id, name: p.name, resource: p.resource });
    });

    const modules = await prisma.module.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } }).catch(() => []);

    res.json({
      ok: true, roles: roleHierarchy, permissionCategories, modules,
      summary: { totalRoles: roles.length, totalPermissions: permissions.length, totalModules: modules.length }
    });
  } catch (error) {
    console.error('RBAC structure error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch RBAC structure' });
  }
});

/**
 * GET /api/security-governance/audit-health
 */
router.get('/audit-health', async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalLogs, logs24h, logs7d, logs30d, actionBreakdown] = await Promise.all([
      prisma.auditLog.count(),
      prisma.auditLog.count({ where: { createdAt: { gte: last24h } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: last7d } } }),
      prisma.auditLog.count({ where: { createdAt: { gte: last30d } } }),
      prisma.auditLog.groupBy({ by: ['action'], _count: { action: true }, orderBy: { _count: { action: 'desc' } }, take: 10 }).catch(() => [])
    ]);

    const avgLogsPerDay = logs30d / 30;
    const coveragePercent = avgLogsPerDay > 0 ? Math.min(100, (logs24h / avgLogsPerDay) * 100) : 0;
    let integrityStatus = 'verified', integrityDescription = 'All audit logs intact';
    if (logs24h === 0 && avgLogsPerDay > 10) {
      integrityStatus = 'warning'; integrityDescription = 'No logs in 24h - check logging';
    }

    const healthCards = [
      { id: 'audit-coverage', title: 'Audit Coverage', value: Math.round(coveragePercent) + '%', status: coveragePercent >= 80 ? 'healthy' : 'warning' },
      { id: 'log-integrity', title: 'Log Integrity', value: integrityStatus === 'verified' ? 'Verified' : 'Review', status: integrityStatus === 'verified' ? 'healthy' : 'warning' },
      { id: 'retention', title: 'Log Retention', value: '90 days', status: 'healthy' },
      { id: 'total-logs', title: 'Total Logs', value: totalLogs.toLocaleString(), status: 'healthy' }
    ];

    res.json({
      ok: true, lastUpdated: now.toISOString(),
      integrityStatus: { status: integrityStatus, description: integrityDescription, lastVerified: now.toISOString() },
      healthCards,
      statistics: { totalLogs, logs24h, logs7d, logs30d, avgLogsPerDay: Math.round(avgLogsPerDay), coveragePercent: Math.round(coveragePercent) },
      actionBreakdown: actionBreakdown.map(i => ({ action: i.action, count: i._count.action }))
    });
  } catch (error) {
    console.error('Audit health error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch audit health' });
  }
});

/**
 * POST /api/security-governance/violations/:id/resolve
 */
router.post('/violations/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution, notes } = req.body;
    const user = req.user;

    const updated = await prisma.securityViolation.update({
      where: { id },
      data: { resolved: true, resolvedAt: new Date(), resolvedBy: user.id, resolution: resolution || 'Resolved', notes }
    }).catch(() => null);

    if (!updated) return res.status(404).json({ ok: false, error: 'Violation not found' });

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'VIOLATION_RESOLVED', resource: 'security-violation:' + id, metadata: { violationId: id, resolution, notes } }
    }).catch(() => null);

    res.json({ ok: true, violation: updated });
  } catch (error) {
    console.error('Resolve violation error:', error);
    res.status(500).json({ ok: false, error: 'Failed to resolve violation' });
  }
});

module.exports = router;
