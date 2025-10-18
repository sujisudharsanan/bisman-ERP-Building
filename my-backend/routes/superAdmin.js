// Super Admin Routes - Protected routes for database control
const express = require('express')
const router = express.Router()
const superAdminController = require('../controllers/superAdminController')
const { requirePermission, requireRole } = require('../middleware/rbacAuth')
const { authenticate } = require('../middleware/auth')

// Apply authentication to all super admin routes
router.use(authenticate)

// Prefer simple role-based guard to avoid RBAC table dependency during setup
const requireSuperAdmin = requireRole('SUPER_ADMIN')

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
// List roles (fallback to distinct roles from users if RBAC table absent)
router.get('/roles', requireSuperAdmin, async (req, res) => {
	try {
		const { getPrisma } = require('../lib/prisma')
		const prisma = getPrisma()
		try {
			const r = await prisma.$queryRaw`SELECT id, name, created_at, updated_at FROM roles ORDER BY name ASC LIMIT 200`
			return res.json({ success: true, data: r })
		} catch (e) {
			const roles = await prisma.user.findMany({
				select: { role: true },
				distinct: ['role']
			})
			const mapped = roles.map((x, i) => ({ id: i + 1, name: x.role }))
			return res.json({ success: true, data: mapped })
		}
	} catch (err) {
		console.error('roles list error', err)
		res.status(500).json({ success: false, error: 'Failed to fetch roles' })
	}
})

// =============== ROUTE MANAGEMENT ===============
router.post('/routes', requireSuperAdmin, superAdminController.createRoute)
router.put('/routes/:routeId', requireSuperAdmin, superAdminController.updateRoute)
router.delete('/routes/:routeId', requireSuperAdmin, superAdminController.deleteRoute)

// =============== PERMISSION MANAGEMENT ===============
router.post('/permissions/batch', requireSuperAdmin, superAdminController.updatePermissionsBatch)

// =============== DIRECT TABLE ACCESS ===============
router.get('/tables', requireSuperAdmin, superAdminController.getTables)
router.get('/tables/:tableName', requireSuperAdmin, superAdminController.getTableData)

// =============== DASHBOARD & SYSTEM ===============
router.get('/dashboard/stats', requireSuperAdmin, superAdminController.getDashboardStats)
router.get('/system/info', requireSuperAdmin, superAdminController.getSystemInfo)

module.exports = router
