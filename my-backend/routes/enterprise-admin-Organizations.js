const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware to verify enterprise admin role
const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      ok: false, 
      error: 'Access denied. Enterprise Admin role required.' 
    });
  }
  next();
};

// ====================
// GET ALL ORGANIZATIONS (CLIENTS)
// ====================
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const productType = req.query.productType || '';
    const status = req.query.status || '';
    const skip = (page - 1) * limit;

    // Build where clause
    const where = {
      ...(search && {
        name: { contains: search, mode: 'insensitive' }
      }),
      ...(productType && { productType }),
      ...(status && { 
        is_active: status === 'active' 
      })
    };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          superAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              users: true
            }
          }
        }
      }),
      prisma.client.count({ where })
    ]);

    const formatted = clients.map(client => ({
      id: client.id,
      name: client.name,
      productType: client.productType,
      subscriptionPlan: client.subscriptionPlan,
      subscriptionStatus: client.subscriptionStatus,
      isActive: client.is_active,
      logo: client.logo,
      superAdmin: client.superAdmin,
      usersCount: client._count.users,
      createdAt: client.created_at.toISOString(),
      updatedAt: client.updated_at.toISOString()
    }));

    res.json({
      ok: true,
      organizations: formatted,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Get Organizations Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch organizations' 
    });
  }
});

// ====================
// GET ORGANIZATION BY ID
// ====================
router.get('/:id', requireEnterpriseAdmin, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id },
      include: {
        superAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
            productType: true
          }
        },
        users: {
          select: {
            id: true,
            username: true,
            email: true,
            role: true,
            createdAt: true
          },
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Organization not found' 
      });
    }

    res.json({
      ok: true,
      organization: {
        id: client.id,
        name: client.name,
        productType: client.productType,
        subscriptionPlan: client.subscriptionPlan,
        subscriptionStatus: client.subscriptionStatus,
        isActive: client.is_active,
        logo: client.logo,
        settings: client.settings,
        superAdmin: client.superAdmin,
        users: client.users.map(u => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt?.toISOString()
        })),
        createdAt: client.created_at.toISOString(),
        updatedAt: client.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('[Get Organization Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch organization details' 
    });
  }
});

// ====================
// UPDATE ORGANIZATION
// ====================
router.patch('/:id', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { name, subscriptionPlan, subscriptionStatus, isActive, settings } = req.body;

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(subscriptionPlan && { subscriptionPlan }),
        ...(subscriptionStatus && { subscriptionStatus }),
        ...(typeof isActive === 'boolean' && { is_active: isActive }),
        ...(settings && { settings }),
        updated_at: new Date()
      }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        user_id: req.user?.id,
        username: req.user?.username || 'Enterprise Admin',
        action: 'UPDATE',
        entity: 'organization',
        entity_id: updated.id,
        details: { organizationName: updated.name }
      }
    });

    res.json({
      ok: true,
      organization: {
        id: updated.id,
        name: updated.name,
        subscriptionPlan: updated.subscriptionPlan,
        subscriptionStatus: updated.subscriptionStatus,
        isActive: updated.is_active,
        updatedAt: updated.updated_at.toISOString()
      }
    });
  } catch (error) {
    console.error('[Update Organization Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update organization' 
    });
  }
});

// ====================
// TOGGLE ORGANIZATION STATUS
// ====================
router.post('/:id/toggle-status', requireEnterpriseAdmin, async (req, res) => {
  try {
    const client = await prisma.client.findUnique({
      where: { id: req.params.id }
    });

    if (!client) {
      return res.status(404).json({ 
        ok: false, 
        error: 'Organization not found' 
      });
    }

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        is_active: !client.is_active,
        updated_at: new Date()
      }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        user_id: req.user?.id,
        username: req.user?.username || 'Enterprise Admin',
        action: updated.is_active ? 'ACTIVATE' : 'SUSPEND',
        entity: 'organization',
        entity_id: updated.id,
        details: { organizationName: updated.name }
      }
    });

    res.json({
      ok: true,
      organization: {
        id: updated.id,
        name: updated.name,
        isActive: updated.is_active
      }
    });
  } catch (error) {
    console.error('[Toggle Organization Status Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to toggle organization status' 
    });
  }
});

// ====================
// GET ORGANIZATION STATS
// ====================
router.get('/:id/stats', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [usersCount, recentActivity] = await Promise.all([
      prisma.user.count({
        where: { tenant_id: req.params.id }
      }),
      prisma.recent_activity.findMany({
        where: { 
          entity_id: req.params.id,
          entity: 'organization'
        },
        take: 5,
        orderBy: { created_at: 'desc' }
      })
    ]);

    res.json({
      ok: true,
      stats: {
        usersCount,
        recentActivity: recentActivity.map(a => ({
          action: a.action,
          username: a.username,
          createdAt: a.created_at?.toISOString()
        }))
      }
    });
  } catch (error) {
    console.error('[Get Organization Stats Error]:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch organization stats' 
    });
  }
});

module.exports = router;
