// Super Admin Routes - Protected routes for database control
const express = require('express')
const router = express.Router()
const superAdminController = require('../controllers/superAdminController')
const { authenticateToken, requirePermission } = require('../middleware/rbacAuth')

// Apply authentication to all super admin routes
router.use(authenticateToken)

// Create middleware for super admin permission
const requireSuperAdmin = requirePermission('super_admin')

// =============== ACTIVITY TRACKING ===============
router.get('/activity', requireSuperAdmin, superAdminController.getRecentActivity)

// =============== USER MANAGEMENT ===============
router.get('/users', requireSuperAdmin, superAdminController.getUsers)
router.post('/users', requireSuperAdmin, superAdminController.createUser)
router.put('/users/:userId', requireSuperAdmin, superAdminController.updateUser)
router.delete('/users/:userId', requireSuperAdmin, superAdminController.deleteUser)

// =============== ROLE MANAGEMENT ===============
router.post('/roles', requireSuperAdmin, superAdminController.createRole)
router.put('/roles/:roleId', requireSuperAdmin, superAdminController.updateRole)
router.delete('/roles/:roleId', requireSuperAdmin, superAdminController.deleteRole)

// =============== ROUTE MANAGEMENT ===============
router.post('/routes', requireSuperAdmin, superAdminController.createRoute)
router.put('/routes/:routeId', requireSuperAdmin, superAdminController.updateRoute)
router.delete('/routes/:routeId', requireSuperAdmin, superAdminController.deleteRoute)

// =============== PERMISSION MANAGEMENT ===============
router.post('/permissions/batch', requireSuperAdmin, superAdminController.updatePermissionsBatch)

// =============== DIRECT TABLE ACCESS ===============
router.get('/tables/:tableName', requireSuperAdmin, superAdminController.getTableData)

// =============== DASHBOARD & SYSTEM ===============
router.get('/dashboard/stats', requireSuperAdmin, superAdminController.getDashboardStats)
router.get('/system/info', requireSuperAdmin, superAdminController.getSystemInfo)

module.exports = router
