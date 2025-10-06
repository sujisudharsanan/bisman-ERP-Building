// Role & User Privilege Management API Routes
// Production-ready Express.js routes with security and validation

const express = require('express');
const { body, query, validationResult } = require('express-validator');
const router = express.Router();
const privilegeService = require('../services/privilegeService');
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');

// Middleware for privilege management routes
router.use(authMiddleware.authenticate);
router.use(rbacMiddleware.requireRole(['Super Admin', 'Admin']));

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
router.get('/roles', async (req, res) => {
  try {
    const roles = await privilegeService.getAllRoles();
    
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

// GET /api/users?role={roleId} - Fetch users by role
router.get('/users', [
  query('role').notEmpty().withMessage('Role ID is required')
], handleValidationErrors, async (req, res) => {
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
  query('role').notEmpty().withMessage('Role ID is required')
], handleValidationErrors, async (req, res) => {
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
  body('type').isIn(['ROLE', 'USER']).withMessage('Type must be ROLE or USER'),
  body('target_id').notEmpty().withMessage('Target ID is required'),
  body('privileges').isArray().withMessage('Privileges must be an array'),
  body('privileges.*.feature_id').notEmpty().withMessage('Feature ID is required'),
  body('privileges.*.can_view').isBoolean().withMessage('can_view must be boolean'),
  body('privileges.*.can_create').isBoolean().withMessage('can_create must be boolean'),
  body('privileges.*.can_edit').isBoolean().withMessage('can_edit must be boolean'),
  body('privileges.*.can_delete').isBoolean().withMessage('can_delete must be boolean'),
  body('privileges.*.can_hide').isBoolean().withMessage('can_hide must be boolean')
], handleValidationErrors, async (req, res) => {
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
router.post('/privileges/sync-schema', async (req, res) => {
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
router.get('/health/database', async (req, res) => {
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
    res.status(503).json({
      success: false,
      error: {
        message: 'Database health check failed',
        code: 'DATABASE_UNAVAILABLE'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/audit/privileges - Get privilege change audit logs
router.get('/audit/privileges', [
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('offset').optional().isInt({ min: 0 }).withMessage('Offset must be non-negative'),
  query('entity_type').optional().isIn(['ROLE_PRIVILEGE', 'USER_PRIVILEGE', 'ROLE', 'USER', 'FEATURE'])
], handleValidationErrors, async (req, res) => {
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
  body('format').isIn(['CSV', 'PDF']).withMessage('Format must be CSV or PDF'),
  body('include_user_overrides').optional().isBoolean(),
  body('include_inactive_features').optional().isBoolean(),
  body('selected_roles').optional().isArray(),
  body('selected_users').optional().isArray()
], handleValidationErrors, async (req, res) => {
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
