// Role & User Privilege Management API Routes
// Production-ready Express.js routes with security and validation

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const privilegeService = require('../services/privilegeService');
const rbacService = require('../services/rbacService');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

// Note: Authentication middleware is applied per route instead of globally
// to avoid blocking login and health endpoints

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array()
      },
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// GET /api/roles - Fetch all roles with user counts
router.get('/roles', authMiddleware.authenticate, rbacMiddleware.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    let roles = [];
    let used = 'rbac';
    try {
      // Prefer RBAC roles to align with dashboard stats (rbac_roles table)
      roles = await rbacService.getAllRoles();
    } catch (rbacErr) {
      console.warn('RBAC roles fetch failed; falling back:', rbacErr?.message || rbacErr);
      used = 'privilege';
      roles = await privilegeService.getAllRoles();
    }
    // If RBAC is present but has no rows yet, fall back to default roles to avoid empty UI
    if (used === 'rbac' && Array.isArray(roles) && roles.length === 0) {
      console.warn('RBAC roles list is empty; falling back to default roles');
      roles = await privilegeService.getAllRoles();
      used = 'privilege';
    }

    res.json({
      success: true,
      data: roles,
      total: roles.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch roles',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// PATCH /api/privileges/roles/:roleId/status - Enable/disable a role
router.patch('/roles/:roleId/status', authMiddleware.authenticate, rbacMiddleware.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { is_active } = req.body || {};
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, error: { message: 'is_active boolean is required', code: 'VALIDATION_ERROR' }, timestamp: new Date().toISOString() });
    }

    let used = 'rbac';
    try {
      await rbacService.setRoleStatus(Number(roleId), is_active);
    } catch (e) {
      used = 'privilege';
      // Fallback to privilegeService in-memory override or roles table if available
      try { await privilegeService.setRoleStatus(roleId, is_active); } catch {}
    }

    // Optionally log audit trail
    try {
      await privilegeService.logPrivilegeChange({
        user_id: req.user.id,
        action: 'UPDATE',
        entity_type: 'ROLE',
        entity_id: roleId,
        old_values: {},
        new_values: { is_active },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      })
    } catch {}

    // Return fresh roles list to simplify client sync
    let roles = []
    try { roles = await rbacService.getAllRoles(); } catch { roles = await privilegeService.getAllRoles(); }

    return res.json({ success: true, data: { updated: true, source: used, roles }, timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('Error updating role status:', error)
    res.status(500).json({ success: false, error: { message: 'Failed to update role status', code: 'DATABASE_ERROR' }, timestamp: new Date().toISOString() })
  }
})

// GET /api/health/database - Database health check

// GET /api/users?role={roleId} - Fetch users by role
router.get('/users', [
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  query('role').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1 }),
  handleValidationErrors
], async (req, res) => {
  try {
    const { role } = req.query;
    const users = await privilegeService.getUsersByRole(role);
    
    res.json({
      success: true,
      data: users,
      total: users.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch users',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/privileges?role={roleId}&user={userId} - Fetch privileges
router.get('/privileges', [
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  query('role').optional().isString(),
  query('user').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { role, user } = req.query;
    const privilegeData = await privilegeService.getPrivileges(role, user);
    
    res.json({
      success: true,
      data: privilegeData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching privileges:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch privileges',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});
// PUT /api/privileges/update - Update role or user privileges
router.put('/privileges/update', [
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  body('type').isIn(['ROLE', 'USER']).withMessage('type must be ROLE or USER'),
  body('target_id').isString().notEmpty().withMessage('target_id is required'),
  body('privileges').isArray({ min: 1 }).withMessage('privileges must be a non-empty array'),
  body('privileges.*.feature_id').isString().notEmpty(),
  body('privileges.*.can_view').isBoolean(),
  body('privileges.*.can_create').isBoolean(),
  body('privileges.*.can_edit').isBoolean(),
  body('privileges.*.can_delete').isBoolean(),
  body('privileges.*.can_hide').isBoolean(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { type, target_id, privileges } = req.body;
    const userId = req.user.id; // From auth middleware
    
    const result = await privilegeService.updatePrivileges(
      type, 
      target_id, 
      privileges, 
      userId
    );
    
    // Log the privilege change for audit
    await privilegeService.logPrivilegeChange({
      user_id: userId,
      action: 'UPDATE',
      entity_type: type === 'ROLE' ? 'ROLE_PRIVILEGE' : 'USER_PRIVILEGE',
      entity_id: target_id,
      old_values: result.oldValues,
      new_values: privileges,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: result,
      message: `${type.toLowerCase()} privileges updated successfully`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating privileges:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to update privileges',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});
// POST /api/privileges/sync-schema - Sync features with database schema
router.post('/privileges/sync-schema', authMiddleware.authenticate, rbacMiddleware.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await privilegeService.syncSchemaFeatures();
    
    // Log the schema sync for audit
    await privilegeService.logPrivilegeChange({
      user_id: userId,
      action: 'CREATE',
      entity_type: 'FEATURE',
      entity_id: 'schema_sync',
      new_values: result,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      data: result,
      message: `Schema synced successfully. ${result.new_features.length} new features added.`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error syncing schema:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to sync schema',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health/database - Database health check
router.get('/health/database', authMiddleware.authenticate, rbacMiddleware.requireRole(['Super Admin', 'Admin']), async (req, res) => {
  try {
    const startTime = Date.now();
    const health = await privilegeService.checkDatabaseHealth();
    const responseTime = Date.now() - startTime;
    
  res.json({
      success: true,
      data: {
        ...health,
        response_time: responseTime,
        last_checked: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    console.error('Database health check failed:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Database health check failed',
        code: 'DATABASE_UNAVAILABLE'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/audit-logs - Fetch audit logs
router.get('/audit-logs', [
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('entity_type').optional().isString(),
  handleValidationErrors
], async (req, res) => {
  try {
    const { limit = 50, offset = 0, entity_type } = req.query;
    const auditLogs = await privilegeService.getAuditLogs({
      limit: parseInt(limit),
      offset: parseInt(offset),
      entity_type
    });
    
    res.json({
      success: true,
      data: auditLogs,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch audit logs',
        code: 'DATABASE_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/privileges/export - Export privilege matrix
router.post('/privileges/export', [
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  body('format').isIn(['JSON', 'CSV', 'PDF']),
  body('include_user_overrides').optional().isBoolean(),
  body('include_inactive_features').optional().isBoolean(),
  body('selected_roles').optional().isArray(),
  body('selected_users').optional().isArray(),
  handleValidationErrors
], async (req, res) => {
  try {
    const exportOptions = req.body;
    const result = await privilegeService.exportPrivilegeMatrix(exportOptions);
    
    // Set appropriate headers based on format
    if (exportOptions.format === 'CSV') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="privilege_matrix.csv"');
    } else if (exportOptions.format === 'PDF') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="privilege_matrix.pdf"');
    }
    
    res.send(result.data);
  } catch (error) {
    console.error('Error exporting privileges:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to export privileges',
        code: 'EXPORT_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
