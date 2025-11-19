const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware
const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// GET All Modules
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const productType = req.query.productType || '';
    const where = {
      ...(productType && { productType })
    };

    const modules = await prisma.module.findMany({
      where,
      orderBy: [{ sort_order: 'asc' }, { display_name: 'asc' }],
      include: {
        _count: {
          select: {
            moduleAssignments: true,
            permissions: true
          }
        }
      }
    });

    res.json({
      ok: true,
      modules: modules.map(m => ({
        id: m.id,
        moduleName: m.module_name,
        displayName: m.display_name,
        description: m.description,
        route: m.route,
        icon: m.icon,
        productType: m.productType,
        isActive: m.is_active,
        sortOrder: m.sort_order,
        assignmentsCount: m._count.moduleAssignments,
        permissionsCount: m._count.permissions,
        createdAt: m.created_at.toISOString()
      }))
    });
  } catch (error) {
    console.error('[Get Modules Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch modules' });
  }
});

// Toggle Module Status
router.post('/:id/toggle', requireEnterpriseAdmin, async (req, res) => {
  try {
    const module = await prisma.module.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!module) {
      return res.status(404).json({ ok: false, error: 'Module not found' });
    }

    const updated = await prisma.module.update({
      where: { id: parseInt(req.params.id) },
      data: {
        is_active: !module.is_active,
        updated_at: new Date()
      }
    });

    await prisma.recent_activity.create({
      data: {
        user_id: req.user?.id,
        username: req.user?.username || 'Enterprise Admin',
        action: updated.is_active ? 'ENABLE' : 'DISABLE',
        entity: 'module',
        entity_id: updated.id.toString(),
        details: { moduleName: updated.display_name }
      }
    });

    res.json({
      ok: true,
      module: {
        id: updated.id,
        displayName: updated.display_name,
        isActive: updated.is_active
      }
    });
  } catch (error) {
    console.error('[Toggle Module Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to toggle module' });
  }
});

// Get Module Usage Stats
router.get('/usage-stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const stats = await prisma.$queryRaw`
      SELECT 
        m.display_name as module_name,
        m.product_type,
        COUNT(DISTINCT ma.super_admin_id) as super_admins_count,
        m.is_active
      FROM modules m
      LEFT JOIN module_assignments ma ON m.id = ma.module_id
      WHERE m.is_active = true
      GROUP BY m.id, m.display_name, m.product_type, m.is_active
      ORDER BY super_admins_count DESC
      LIMIT 10
    `;

    res.json({
      ok: true,
      stats: stats.map(s => ({
        moduleName: s.module_name,
        productType: s.product_type,
        superAdminsCount: parseInt(s.super_admins_count)
      }))
    });
  } catch (error) {
    console.error('[Module Usage Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch usage stats' });
  }
});

module.exports = router;
