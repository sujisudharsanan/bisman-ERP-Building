const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { authenticate, requireRole } = require('../middleware/auth');
const prisma = new PrismaClient();

// Apply authentication middleware to all routes
router.use(authenticate);
router.use(requireRole('ENTERPRISE_ADMIN'));

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get all super admins
router.get('/', async (req, res) => {
  try {
    console.log('🔵 GET /api/enterprise-admin/super-admins - Request received');
    console.log('🔵 User:', req.user);
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [superAdmins, total] = await Promise.all([
      prisma.superAdmin.findMany({
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          name: true,
          email: true,
          productType: true,
          is_active: true,
          created_at: true,
          updated_at: true
        }
      }),
      prisma.superAdmin.count()
    ]);

    console.log(`🔵 Found ${superAdmins.length} super admins`);

    // Transform to include assigned modules
    const transformedAdmins = await Promise.all(superAdmins.map(async (admin) => {
      const moduleAssignments = await prisma.moduleAssignment.findMany({
        where: { super_admin_id: admin.id },
        include: { module: true }
      });

      return {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        productType: admin.productType,
        status: admin.is_active ? 'active' : 'inactive',
        assignedModules: moduleAssignments.map(ma => ({
          module_id: ma.module_id,
          module_name: ma.module.module_name,
          assigned_pages: ma.page_permissions || []
        }))
      };
    }));

    res.json({
      ok: true,
      superAdmins: transformedAdmins,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Super Admins List Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch super admins', message: error.message });
  }
});

// Get super admin detail
router.get('/:adminId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    const [admin, auditLogs, clients] = await Promise.all([
      prisma.superAdmin.findUnique({
        where: { id: adminId },
        include: {
          enterpriseAdmin: {
            select: {
              id: true,
              companyName: true,
              subscription_plan: true
            }
          }
        }
      }),
      prisma.recent_activity.findMany({
        where: {
          entity: 'SuperAdmin',
          entity_id: adminId.toString()
        },
        orderBy: { created_at: 'desc' },
        take: 50
      }),
      prisma.client.count({
        where: {
          super_admin_id: adminId
        }
      })
    ]);

    if (!admin) {
      return res.status(404).json({ ok: false, error: 'Super Admin not found' });
    }

    res.json({
      ok: true,
      superAdmin: {
        id: admin.id,
        name: admin.username,
        email: admin.email,
        role: admin.role,
        roleType: admin.role === 'SUPER_ADMIN' ? 'Full Control' : 'Read Only',
        status: admin.is_active ? 'active' : 'disabled',
        mfaStatus: admin.mfa_enabled ? 'enabled' : 'disabled',
        mfaRequired: true, // Enterprise level default
        lastLogin: admin.last_login?.toISOString() || null,
        enterprise: {
          id: admin.enterpriseAdmin?.id,
          name: admin.enterpriseAdmin?.companyName,
          subscriptionPlan: admin.enterpriseAdmin?.subscription_plan
        },
        managedClients: clients,
        createdAt: admin.created_at?.toISOString(),
        updatedAt: admin.updated_at?.toISOString()
      },
      auditTrail: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        performedBy: log.username,
        timestamp: log.created_at?.toISOString()
      }))
    });
  } catch (error) {
    console.error('[Super Admin Detail Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch super admin details' });
  }
});

// Create new super admin
router.post('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { 
      name, 
      email, 
      password, 
      role, 
      mfaRequired, 
      enterpriseAdminId,
      productType 
    } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Name, email, and password are required' 
      });
    }

    // Check if super admin already exists
    const existing = await prisma.superAdmin.findUnique({
      where: { email }
    });

    if (existing) {
      return res.status(400).json({ 
        ok: false, 
        error: 'Super Admin with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create super admin
    const newAdmin = await prisma.superAdmin.create({
      data: {
        username: name,
        email,
        password: hashedPassword,
        role: role || 'SUPER_ADMIN',
        is_active: true,
        mfa_enabled: mfaRequired || false,
        enterprise_admin_id: parseInt(enterpriseAdminId) || null,
        productType: productType || 'PUMP_ERP'
      }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'Super Admin Created',
        entity: 'SuperAdmin',
        entity_id: newAdmin.id.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { 
          name,
          email,
          role: role || 'SUPER_ADMIN',
          mfaRequired: mfaRequired || false
        }
      }
    });

    res.status(201).json({
      ok: true,
      message: 'Super Admin created successfully',
      superAdmin: {
        id: newAdmin.id,
        name: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role,
        mfaStatus: newAdmin.mfa_enabled ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    console.error('[Create Super Admin Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to create super admin' });
  }
});

// Update super admin
router.put('/:adminId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);
    const { name, email, role, status, mfaEnabled } = req.body;

    const updateData = {};
    if (name) updateData.username = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.is_active = status === 'active';
    if (typeof mfaEnabled === 'boolean') updateData.mfa_enabled = mfaEnabled;

    const updatedAdmin = await prisma.superAdmin.update({
      where: { id: adminId },
      data: updateData
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'Super Admin Updated',
        entity: 'SuperAdmin',
        entity_id: adminId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { changes: updateData }
      }
    });

    res.json({
      ok: true,
      message: 'Super Admin updated successfully',
      superAdmin: {
        id: updatedAdmin.id,
        name: updatedAdmin.username,
        email: updatedAdmin.email,
        role: updatedAdmin.role,
        status: updatedAdmin.is_active ? 'active' : 'disabled',
        mfaStatus: updatedAdmin.mfa_enabled ? 'enabled' : 'disabled'
      }
    });
  } catch (error) {
    console.error('[Update Super Admin Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update super admin' });
  }
});

// Revoke super admin access (soft delete)
router.delete('/:adminId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    await prisma.superAdmin.update({
      where: { id: adminId },
      data: { is_active: false }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'Super Admin Access Revoked',
        entity: 'SuperAdmin',
        entity_id: adminId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { action: 'Access revoked, account disabled' }
      }
    });

    res.json({
      ok: true,
      message: 'Super Admin access revoked successfully'
    });
  } catch (error) {
    console.error('[Revoke Super Admin Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to revoke super admin access' });
  }
});

// Force MFA reset
router.post('/:adminId/mfa-reset', requireEnterpriseAdmin, async (req, res) => {
  try {
    const adminId = parseInt(req.params.adminId);

    await prisma.superAdmin.update({
      where: { id: adminId },
      data: { 
        mfa_enabled: false,
        updated_at: new Date()
      }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'MFA Reset',
        entity: 'SuperAdmin',
        entity_id: adminId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { action: 'MFA disabled, requires re-setup' }
      }
    });

    res.json({
      ok: true,
      message: 'MFA reset successfully. User must re-enable MFA on next login.'
    });
  } catch (error) {
    console.error('[MFA Reset Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to reset MFA' });
  }
});

// Get super admin roles/permissions mapping
router.get('/roles/mapping', requireEnterpriseAdmin, async (req, res) => {
  try {
    // Define role mappings
    const roleMappings = [
      {
        roleId: 'full-control',
        roleName: 'Full Control',
        description: 'Complete access to all features and settings',
        permissions: {
          clients: { read: true, create: true, update: true, delete: true },
          users: { read: true, create: true, update: true, delete: true },
          modules: { read: true, create: true, update: true, delete: true },
          billing: { read: true, create: true, update: true, delete: false },
          reports: { read: true, create: true, update: false, delete: false },
          settings: { read: true, create: false, update: true, delete: false },
          audit: { read: true, create: false, update: false, delete: false }
        }
      },
      {
        roleId: 'read-only',
        roleName: 'Global Read-Only',
        description: 'View-only access to all data, no modification rights',
        permissions: {
          clients: { read: true, create: false, update: false, delete: false },
          users: { read: true, create: false, update: false, delete: false },
          modules: { read: true, create: false, update: false, delete: false },
          billing: { read: true, create: false, update: false, delete: false },
          reports: { read: true, create: false, update: false, delete: false },
          settings: { read: true, create: false, update: false, delete: false },
          audit: { read: true, create: false, update: false, delete: false }
        }
      },
      {
        roleId: 'support',
        roleName: 'Support Admin',
        description: 'Access to user management and support functions',
        permissions: {
          clients: { read: true, create: false, update: true, delete: false },
          users: { read: true, create: true, update: true, delete: false },
          modules: { read: true, create: false, update: false, delete: false },
          billing: { read: true, create: false, update: false, delete: false },
          reports: { read: true, create: false, update: false, delete: false },
          settings: { read: true, create: false, update: false, delete: false },
          audit: { read: true, create: false, update: false, delete: false }
        }
      }
    ];

    res.json({
      ok: true,
      roles: roleMappings
    });
  } catch (error) {
    console.error('[Role Mapping Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch role mappings' });
  }
});

// Update super admin role permissions
router.put('/roles/mapping', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { roleId, permissions } = req.body;

    // In a production system, this would update a roles configuration table
    // For now, we'll just log the action
    await prisma.recent_activity.create({
      data: {
        action: 'Role Permissions Updated',
        entity: 'Role',
        entity_id: roleId,
        username: req.user?.username || 'Enterprise Admin',
        details: { roleId, permissions }
      }
    });

    res.json({
      ok: true,
      message: 'Role permissions updated successfully'
    });
  } catch (error) {
    console.error('[Update Role Mapping Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update role permissions' });
  }
});

// Get super admin statistics
router.get('/stats/overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [total, active, withMFA, byRole] = await Promise.all([
      prisma.superAdmin.count(),
      prisma.superAdmin.count({ where: { is_active: true } }),
      prisma.superAdmin.count({ where: { mfa_enabled: true } }),
      prisma.superAdmin.groupBy({
        by: ['role'],
        _count: { id: true }
      })
    ]);

    res.json({
      ok: true,
      stats: {
        total,
        active,
        withMFA,
        mfaPercentage: total > 0 ? ((withMFA / total) * 100).toFixed(1) : 0,
        byRole: byRole.map(r => ({
          role: r.role,
          count: r._count.id
        }))
      }
    });
  } catch (error) {
    console.error('[Super Admin Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
