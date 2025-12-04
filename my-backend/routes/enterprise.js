const express = require('express');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { 
  authenticateMultiTenant, 
  requireEnterpriseAdmin 
} = require('../middleware/multiTenantAuth');

const router = express.Router();
const prisma = new PrismaClient();

// Apply enterprise admin authentication to all routes
router.use(authenticateMultiTenant);
router.use(requireEnterpriseAdmin);

/**
 * GET /api/enterprise/dashboard
 * Get dashboard statistics for enterprise admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    // Count super admins by product type
    const businessSuperAdmins = await prisma.superAdmin.count({
      where: { productType: 'BUSINESS_ERP', is_active: true }
    });

    const pumpSuperAdmins = await prisma.superAdmin.count({
      where: { productType: 'PUMP_ERP', is_active: true }
    });

    // Count clients by product type
    const businessClients = await prisma.client.count({
      where: { productType: 'BUSINESS_ERP', is_active: true }
    });

    const pumpClients = await prisma.client.count({
      where: { productType: 'PUMP_ERP', is_active: true }
    });

    // Count total users
    const totalUsers = await prisma.user.count();

    // Count modules
    const businessModules = await prisma.module.count({
      where: { productType: 'BUSINESS_ERP', is_active: true }
    });

    const pumpModules = await prisma.module.count({
      where: { productType: 'PUMP_ERP', is_active: true }
    });

    // Get recent super admins
    const recentSuperAdmins = await prisma.superAdmin.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        productType: true,
        created_at: true,
        is_active: true
      }
    });

    // Get recent clients
    const recentClients = await prisma.client.findMany({
      take: 5,
      orderBy: { created_at: 'desc' },
      include: {
        superAdmin: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      stats: {
        superAdmins: {
          total: businessSuperAdmins + pumpSuperAdmins,
          business: businessSuperAdmins,
          pump: pumpSuperAdmins
        },
        clients: {
          total: businessClients + pumpClients,
          business: businessClients,
          pump: pumpClients
        },
        users: {
          total: totalUsers
        },
        modules: {
          business: businessModules,
          pump: pumpModules
        }
      },
      recentSuperAdmins,
      recentClients
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ 
      error: 'Failed to load dashboard',
      message: error.message 
    });
  }
});

/**
 * GET /api/enterprise/super-admins
 * Get all super admins with optional filtering
 */
router.get('/super-admins', async (req, res) => {
  try {
    const { productType, isActive } = req.query;

    const where = {};
    if (productType) where.productType = productType;
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const superAdmins = await prisma.superAdmin.findMany({
      where,
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            subscriptionPlan: true,
            is_active: true
          }
        },
        moduleAssignments: {
          include: {
            module: {
              select: {
                id: true,
                module_name: true,
                display_name: true
              }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    // Format response
    const formattedSuperAdmins = superAdmins.map(sa => {
      // Build assignedModules array (list of module IDs)
      const assignedModules = sa.moduleAssignments.map(ma => ma.module_id);
      
      // Build pagePermissions object { moduleId: [pageIds] }
      const pagePermissions = {};
      sa.moduleAssignments.forEach(ma => {
        if (ma.page_permissions && Array.isArray(ma.page_permissions)) {
          pagePermissions[ma.module_id] = ma.page_permissions;
        }
      });
      
      return {
        id: sa.id,
        username: sa.name,
        name: sa.name,
        email: sa.email,
        productType: sa.productType,
        isActive: sa.is_active,
        createdAt: sa.created_at,
        profilePicUrl: sa.profile_pic_url,
        clientsCount: sa.clients.length,
        clients: sa.clients,
        assignedModules: assignedModules,
        pagePermissions: pagePermissions
      };
    });

    res.json({
      superAdmins: formattedSuperAdmins,
      total: formattedSuperAdmins.length
    });
  } catch (error) {
    console.error('Get super admins error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch super admins',
      message: error.message 
    });
  }
});

/**
 * GET /api/enterprise/super-admins/:id
 * Get specific super admin details
 */
router.get('/super-admins/:id', async (req, res) => {
  try {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        clients: {
          select: {
            id: true,
            name: true,
            productType: true,
            subscriptionPlan: true,
            subscriptionStatus: true,
            is_active: true,
            created_at: true
          }
        },
        moduleAssignments: {
          include: {
            module: true
          }
        }
      }
    });

    if (!superAdmin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }

    res.json({
      ...superAdmin,
      assignedModules: superAdmin.moduleAssignments.map(ma => ma.module)
    });
  } catch (error) {
    console.error('Get super admin error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch super admin',
      message: error.message 
    });
  }
});

/**
 * POST /api/enterprise/super-admins
 * Create a new super admin
 */
router.post('/super-admins', async (req, res) => {
  try {
    const { name, email, password, productType } = req.body;

    // Validation
    if (!name || !email || !password || !productType) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        message: 'Name, email, password, and productType are required' 
      });
    }

    if (!['BUSINESS_ERP', 'PUMP_ERP'].includes(productType)) {
      return res.status(400).json({ 
        error: 'Invalid productType',
        message: 'productType must be BUSINESS_ERP or PUMP_ERP' 
      });
    }

    // Check if email already exists
    const existingSuperAdmin = await prisma.superAdmin.findUnique({
      where: { email }
    });

    if (existingSuperAdmin) {
      return res.status(400).json({ 
        error: 'Email already exists',
        message: 'A super admin with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create super admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        name,
        email,
        password: hashedPassword,
        productType,
        created_by: req.user.id,
        is_active: true
      }
    });

    // Auto-assign modules based on productType
    const modules = await prisma.module.findMany({
      where: { 
        productType: productType,
        is_active: true 
      }
    });

    // Create module assignments
    for (const module of modules) {
      await prisma.moduleAssignment.create({
        data: {
          super_admin_id: superAdmin.id,
          module_id: module.id
        }
      });
    }

    // Fetch created super admin with modules
    const createdSuperAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdmin.id },
      include: {
        moduleAssignments: {
          include: {
            module: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Super admin created successfully',
      superAdmin: {
        ...createdSuperAdmin,
        password: undefined, // Don't send password back
        assignedModules: createdSuperAdmin.moduleAssignments.map(ma => ma.module)
      }
    });
  } catch (error) {
    console.error('Create super admin error:', error);
    res.status(500).json({ 
      error: 'Failed to create super admin',
      message: error.message 
    });
  }
});

/**
 * PATCH /api/enterprise/super-admins/:id
 * Update super admin details
 */
router.patch('/super-admins/:id', async (req, res) => {
  try {
    const { name, email, is_active, password } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (password) updateData.password_hash = bcrypt.hashSync(password, 10);

    const superAdmin = await prisma.superAdmin.update({
      where: { id: parseInt(req.params.id) },
      data: updateData,
      include: {
        clients: true,
        moduleAssignments: {
          include: {
            module: true
          }
        }
      }
    });

    res.json({
      message: 'Super admin updated successfully',
      superAdmin: {
        ...superAdmin,
        password_hash: undefined
      }
    });
  } catch (error) {
    console.error('Update super admin error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Super admin not found' });
    }

    res.status(500).json({ 
      error: 'Failed to update super admin',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/enterprise/super-admins/:id
 * Delete super admin (soft delete by setting is_active to false)
 */
router.delete('/super-admins/:id', async (req, res) => {
  try {
    // Soft delete
    const superAdmin = await prisma.superAdmin.update({
      where: { id: parseInt(req.params.id) },
      data: { is_active: false }
    });

    res.json({
      message: 'Super admin deactivated successfully',
      superAdmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        is_active: superAdmin.is_active
      }
    });
  } catch (error) {
    console.error('Delete super admin error:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Super admin not found' });
    }

    res.status(500).json({ 
      error: 'Failed to delete super admin',
      message: error.message 
    });
  }
});

/**
 * POST /api/enterprise/super-admins/:id/assign-modules
 * Assign modules to a super admin
 */
router.post('/super-admins/:id/assign-modules', async (req, res) => {
  try {
    const superAdminId = parseInt(req.params.id);
    const { moduleIds } = req.body;

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ 
        error: 'Invalid request',
        message: 'moduleIds must be an array' 
      });
    }

    // Get super admin to check productType
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId }
    });

    if (!superAdmin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }

    // Verify all modules match super admin's productType
    const modules = await prisma.module.findMany({
      where: { id: { in: moduleIds } }
    });

    const invalidModules = modules.filter(m => 
      m.productType !== superAdmin.productType && m.productType !== 'ALL'
    );

    if (invalidModules.length > 0) {
      return res.status(400).json({
        error: 'Invalid modules',
        message: `Some modules don't match super admin's productType: ${invalidModules.map(m => m.display_name).join(', ')}`
      });
    }

    // Delete existing assignments
    await prisma.moduleAssignment.deleteMany({
      where: { super_admin_id: superAdminId }
    });

    // Create new assignments
    for (const moduleId of moduleIds) {
      await prisma.moduleAssignment.create({
        data: {
          super_admin_id: superAdminId,
          module_id: moduleId
        }
      });
    }

    // Fetch updated super admin with modules
    const updatedSuperAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId },
      include: {
        moduleAssignments: {
          include: {
            module: true
          }
        }
      }
    });

    res.json({
      message: 'Modules assigned successfully',
      assignedModules: updatedSuperAdmin.moduleAssignments.map(ma => ma.module)
    });
  } catch (error) {
    console.error('Assign modules error:', error);
    res.status(500).json({ 
      error: 'Failed to assign modules',
      message: error.message 
    });
  }
});

/**
 * GET /api/enterprise/modules
 * Get all modules with optional filtering
 */
router.get('/modules', async (req, res) => {
  try {
    const { productType, isActive } = req.query;

    const where = {};
    if (productType) where.productType = productType;
    if (isActive !== undefined) where.is_active = isActive === 'true';

    const modules = await prisma.module.findMany({
      where,
      orderBy: [
        { productType: 'asc' },
        { sort_order: 'asc' }
      ]
    });

    // Group by productType
    const grouped = {
      BUSINESS_ERP: modules.filter(m => m.productType === 'BUSINESS_ERP'),
      PUMP_ERP: modules.filter(m => m.productType === 'PUMP_ERP'),
      ALL: modules.filter(m => m.productType === 'ALL')
    };

    res.json({
      modules,
      grouped,
      total: modules.length
    });
  } catch (error) {
    console.error('Get modules error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch modules',
      message: error.message 
    });
  }
});

/**
 * GET /api/enterprise/clients
 * Get all clients across all super admins
 */
router.get('/clients', async (req, res) => {
  try {
    const { productType, superAdminId } = req.query;

    const where = {};
    if (productType) where.productType = productType;
    if (superAdminId) where.super_admin_id = parseInt(superAdminId);

    const clients = await prisma.client.findMany({
      where,
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
            email: true,
            role: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    });

    const formattedClients = clients.map(client => ({
      ...client,
      usersCount: client.users.length
    }));

    res.json({
      clients: formattedClients,
      total: formattedClients.length
    });
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch clients',
      message: error.message 
    });
  }
});

module.exports = router;
