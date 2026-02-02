// Super Admin Routes - Protected routes for database control
const express = require('express')
const router = express.Router()
const superAdminController = require('../controllers/superAdminController')
const { requireRole } = require('../middleware/rbacAuth')
const { authenticate } = require('../middleware/auth')
const { validateBusinessLevelOnCreate, protectBusinessLevel } = require('../middleware/businessLevelProtection')

// Apply authentication to all super admin routes
router.use(authenticate)

// Prefer simple role-based guard to avoid RBAC table dependency during setup
const requireSuperAdmin = requireRole('SUPER_ADMIN')

// =============== ACTIVITY TRACKING ===============
router.get('/activity', requireSuperAdmin, superAdminController.getRecentActivity)

// =============== USER MANAGEMENT ===============
router.get('/users', requireSuperAdmin, superAdminController.getUsers)
// SECURITY FIX P1-4: Apply validateBusinessLevelOnCreate middleware
router.post('/users', requireSuperAdmin, validateBusinessLevelOnCreate(), superAdminController.createUser)
// SECURITY FIX P1-4: Apply protectBusinessLevel on updates
router.put('/users/:userId', requireSuperAdmin, protectBusinessLevel(), superAdminController.updateUser)
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
		} catch {
			const roles = await prisma.users_enhanced.findMany({
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

// =============== SA APPROVED PAGES ===============
// Get pages that Enterprise Admin has approved for this Super Admin
router.get('/my-approved-pages', requireSuperAdmin, async (req, res) => {
  try {
    const { getPrisma } = require('../lib/prisma');
    const prisma = getPrisma();
    const superAdminId = req.user?.id;
    
    console.log(`[SuperAdmin] Fetching approved pages for SA ${superAdminId}`);
    
    // Get pages approved by Enterprise Admin for this Super Admin
    // HARD RESTRICTIONS:
    // - Only pages from admin_page_assignments
    // - Exclude enterprise-admin routes (SA cannot access EA pages)
    // - Only active pages
    const approvedPages = await prisma.$queryRaw`
      SELECT 
        pm.id,
        pm.page_code as code,
        pm.display_name as name,
        pm.route as path,
        pm.icon,
        pm.sort_order,
        mm.module_code as module,
        mm.display_name as module_name,
        mm.icon as module_icon,
        mm.sort_order as module_sort_order
      FROM admin_page_assignments apa
      INNER JOIN pages_master pm ON apa.page_id = pm.id
      INNER JOIN modules_master mm ON pm.module_id = mm.id
      WHERE apa.assignee_type = 'SUPER_ADMIN'
        AND apa.assigner_type = 'ENTERPRISE_ADMIN'
        AND apa.is_active = true
        AND pm.is_active = true
        AND pm.route NOT LIKE '/enterprise-admin%'
      ORDER BY mm.sort_order, pm.sort_order, pm.display_name
    `;
    
    // Group by module
    const moduleMap = new Map();
    for (const page of approvedPages) {
      if (!moduleMap.has(page.module)) {
        moduleMap.set(page.module, {
          moduleId: page.module,
          moduleName: page.module_name,
          moduleIcon: page.module_icon,
          pages: []
        });
      }
      moduleMap.get(page.module).pages.push({
        id: page.code,
        name: page.name,
        path: page.path,
        icon: page.icon,
        status: 'active'
      });
    }
    
    const result = Array.from(moduleMap.values());
    
    console.log(`[SuperAdmin] SA ${superAdminId} has ${approvedPages.length} approved pages in ${result.length} modules`);
    
    res.json({
      success: true,
      totalPages: approvedPages.length,
      totalModules: result.length,
      data: result
    });
    
  } catch (err) {
    console.error('[SuperAdmin] Error fetching approved pages:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch approved pages' });
  }
});

module.exports = router
