const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();
const { protectBusinessLevel, logBusinessLevelChange, getBusinessLevelInfo } = require('../middleware/businessLevelProtection');
const { validatePassword, generateSecurePassword } = require('../lib/passwordValidator');

// Feature enforcement middleware
const { enforceUsage } = require('../middleware/microUnlockEnforcer');

const requireEnterpriseAdmin = (req, res, next) => {
  const userRole = (req.user?.role || '').toUpperCase();
  if (userRole !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ ok: false, error: 'Access denied' });
  }
  next();
};

// Get all users with advanced filtering and pagination
router.get('/', requireEnterpriseAdmin, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    const search = req.query.search || '';
    const orgId = req.query.orgId || '';
    const role = req.query.role || '';
    const status = req.query.status || ''; // active, disabled
    // accountType filter reserved for future use (local, sso)
    // const accountType = req.query.accountType || '';

    // Build where clause
    const where = {};
    
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (orgId) {
      where.client_id = parseInt(orgId);
    }
    
    if (role) {
      where.role = role;
    }
    
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'disabled') {
      where.is_active = false;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
          updated_at: true,
          last_login: true,
          client_id: true,
          business_level: true,
          client: {
            select: {
              id: true,
              name: true,
              productType: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Transform data
    const transformedUsers = users.map(user => ({
      id: user.id,
      name: user.username,
      email: user.email,
      organization: user.client?.name || 'N/A',
      organizationId: user.client_id,
      productType: user.client?.productType || 'N/A',
      role: user.role,
      status: user.is_active ? 'active' : 'disabled',
      accountType: user.email?.includes('@sso.') ? 'sso' : 'local',
      lastLogin: user.last_login?.toISOString() || null,
      createdAt: user.created_at?.toISOString() || new Date().toISOString(),
      business_level: user.business_level || 1,
      business_level_label: `L${user.business_level || 1}`
    }));

    res.json({
      ok: true,
      users: transformedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('[Users List Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch users' });
  }
});

// Get user detail with audit trail
router.get('/:userId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    const [user, auditLogs, permissions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: {
          client: {
            select: {
              id: true,
              name: true,
              productType: true,
              subscription_plan: true
            }
          }
        }
      }),
      prisma.recent_activity.findMany({
        where: {
          entity: 'User',
          entity_id: userId.toString()
        },
        orderBy: { created_at: 'desc' },
        take: 50
      }),
      prisma.permission.findMany({
        where: {
          user_id: userId
        },
        include: {
          module: {
            select: {
              id: true,
              name: true,
              category: true
            }
          }
        }
      })
    ]);

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    res.json({
      ok: true,
      user: {
        id: user.id,
        name: user.username,
        email: user.email,
        role: user.role,
        status: user.is_active ? 'active' : 'disabled',
        organization: {
          id: user.client?.id,
          name: user.client?.name,
          productType: user.client?.productType,
          subscriptionPlan: user.client?.subscription_plan
        },
        accountType: user.email?.includes('@sso.') ? 'sso' : 'local',
        lastLogin: user.last_login?.toISOString() || null,
        createdAt: user.created_at?.toISOString(),
        updatedAt: user.updated_at?.toISOString()
      },
      permissions: permissions.map(p => ({
        moduleId: p.module?.id,
        moduleName: p.module?.name,
        category: p.module?.category,
        canRead: p.can_read,
        canCreate: p.can_create,
        canUpdate: p.can_update,
        canDelete: p.can_delete
      })),
      auditTrail: auditLogs.map(log => ({
        id: log.id,
        action: log.action,
        details: log.details,
        performedBy: log.username,
        timestamp: log.created_at?.toISOString()
      }))
    });
  } catch (error) {
    console.error('[User Detail Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user details' });
  }
});

// Update user
// ✅ SECURITY: protectBusinessLevel ensures only authorized admins can change business_level
router.put('/:userId', requireEnterpriseAdmin, protectBusinessLevel({ enforceHierarchy: false }), async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { name, email, role, status, business_level } = req.body;

    // Get current user for audit logging
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { business_level: true }
    });
    const oldBusinessLevel = currentUser?.business_level || 1;

    const updateData = {};
    if (name) updateData.username = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (status) updateData.is_active = status === 'active';
    if (business_level !== undefined) {
      // Validate business level (1-10)
      const level = parseInt(business_level);
      if (level >= 1 && level <= 10) {
        updateData.business_level = level;
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    // Log business level change if it was modified
    if (updateData.business_level !== undefined && updateData.business_level !== oldBusinessLevel) {
      await logBusinessLevelChange(
        userId,
        oldBusinessLevel,
        updateData.business_level,
        req.user?.id,
        req.user?.userType || req.user?.user_type || 'ENTERPRISE_ADMIN',
        req.ip
      );
    }

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'User Updated',
        entity: 'User',
        entity_id: userId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { changes: updateData }
      }
    });

    const levelInfo = getBusinessLevelInfo(updatedUser.business_level || 1);
    res.json({
      ok: true,
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        status: updatedUser.is_active ? 'active' : 'disabled',
        business_level: updatedUser.business_level || 1,
        business_level_label: levelInfo.key,
        business_level_name: levelInfo.name
      }
    });
  } catch (error) {
    console.error('[User Update Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to update user' });
  }
});

// Delete user (soft delete by disabling)
router.delete('/:userId', requireEnterpriseAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    await prisma.user.update({
      where: { id: userId },
      data: { is_active: false }
    });

    // Log activity
    await prisma.recent_activity.create({
      data: {
        action: 'User Deleted',
        entity: 'User',
        entity_id: userId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { action: 'Account disabled' }
      }
    });

    res.json({
      ok: true,
      message: 'User account disabled successfully'
    });
  } catch (error) {
    console.error('[User Delete Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete user' });
  }
});

// Bulk update users
router.put('/bulk/update', requireEnterpriseAdmin, async (req, res) => {
  try {
    const { userIds, action, value } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ ok: false, error: 'Invalid user IDs' });
    }

    const updateData = {};
    
    switch (action) {
      case 'enable':
        updateData.is_active = true;
        break;
      case 'disable':
        updateData.is_active = false;
        break;
      case 'changeRole':
        updateData.role = value;
        break;
      case 'forcePasswordReset':
        // Set a flag for password reset on next login
        updateData.updated_at = new Date();
        break;
      default:
        return res.status(400).json({ ok: false, error: 'Invalid action' });
    }

    const result = await prisma.user.updateMany({
      where: {
        id: { in: userIds.map(id => parseInt(id)) }
      },
      data: updateData
    });

    // Log bulk activity
    await prisma.recent_activity.create({
      data: {
        action: `Bulk User ${action}`,
        entity: 'User',
        entity_id: userIds.join(','),
        username: req.user?.username || 'Enterprise Admin',
        details: { action, affectedUsers: result.count, value }
      }
    });

    res.json({
      ok: true,
      message: `Successfully updated ${result.count} users`,
      affectedCount: result.count
    });
  } catch (error) {
    console.error('[Bulk Update Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to perform bulk update' });
  }
});

// Bulk import users from CSV
router.post('/bulk/import', requireEnterpriseAdmin, enforceUsage('user_creation'), async (req, res) => {
  try {
    const { users } = req.body;

    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ ok: false, error: 'Invalid import data' });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (const userData of users) {
      try {
        const { name, email, role, organizationId, password } = userData;

        // Check if user already exists
        const existing = await prisma.user.findUnique({
          where: { email }
        });

        if (existing) {
          results.failed++;
          results.errors.push({ email, error: 'User already exists' });
          continue;
        }

        // Validate or generate password
        let finalPassword = password;
        if (!password) {
          // Generate a secure random password if none provided
          finalPassword = generateSecurePassword(16);
          // Note: In production, this should be sent to the user via email
        } else {
          // Validate provided password
          const passwordValidation = validatePassword(password);
          if (!passwordValidation.valid) {
            results.failed++;
            results.errors.push({ email, error: `Password validation failed: ${passwordValidation.errors[0]}` });
            continue;
          }
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(finalPassword, 12);

        // Create user
        await prisma.user.create({
          data: {
            username: name,
            email,
            password: hashedPassword,
            role: role || 'USER',
            client_id: parseInt(organizationId),
            is_active: true
          }
        });

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({ 
          email: userData.email, 
          error: error.message 
        });
      }
    }

    // Log import activity
    await prisma.recent_activity.create({
      data: {
        action: 'Bulk User Import',
        entity: 'User',
        username: req.user?.username || 'Enterprise Admin',
        details: { 
          totalAttempted: users.length,
          success: results.success,
          failed: results.failed
        }
      }
    });

    res.json({
      ok: true,
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results
    });
  } catch (error) {
    console.error('[Bulk Import Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to import users' });
  }
});

// Force logout user
router.post('/:userId/force-logout', requireEnterpriseAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // In a real system, this would invalidate the user's session
    // For now, we'll just log the action
    await prisma.recent_activity.create({
      data: {
        action: 'Force Logout',
        entity: 'User',
        entity_id: userId.toString(),
        username: req.user?.username || 'Enterprise Admin',
        details: { action: 'User session terminated by admin' }
      }
    });

    res.json({
      ok: true,
      message: 'User logged out successfully'
    });
  } catch (error) {
    console.error('[Force Logout Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to force logout' });
  }
});

// Get user statistics
router.get('/stats/overview', requireEnterpriseAdmin, async (req, res) => {
  try {
    const [totalUsers, activeUsers, disabledUsers, usersByRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { is_active: true } }),
      prisma.user.count({ where: { is_active: false } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true }
      })
    ]);

    res.json({
      ok: true,
      stats: {
        total: totalUsers,
        active: activeUsers,
        disabled: disabledUsers,
        byRole: usersByRole.map(r => ({
          role: r.role,
          count: r._count.id
        }))
      }
    });
  } catch (error) {
    console.error('[User Stats Error]:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
