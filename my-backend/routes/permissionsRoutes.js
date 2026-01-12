// Permissions API Routes - Manage user page permissions
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const { getPrisma } = require('../lib/prisma');
const cacheService = require('../services/cacheService'); // ✅ Cache service
const { hasCrossTenantScope, hasTenantAdminScope } = require('../services/authorizationService');

// Role-based default pages mapping (moved to top-level for reuse)
const roleBasedPages = {
  'SYSTEM_ADMIN': ['user-creation', 'user-management', 'permission-manager', 'roles-users-report', 'system-settings', 'backup-restore', 'system-health-dashboard', 'integration-settings', 'deployment-tools', 'fallback-recovery'],
  'ADMIN': ['user-creation', 'system-flow', 'subscription', 'usage', 'settings', 'sla', 'rag-sources', 'task-approvals'],
  'HR': ['user-creation', 'hr-policy'],
  'HR_MANAGER': ['user-creation', 'hr-policy'],
  'SUPER_ADMIN': ['*'], // Platform super admin gets all
  'ENTERPRISE_ADMIN': ['*'] // Enterprise admin gets all
};

// GET /api/permissions/me - Get current authenticated user's permissions
// Security fix PM-01: Frontend must fetch from this endpoint, not use hardcoded maps
router.get('/me', authMiddleware.authenticate, async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        error: { message: 'Not authenticated', code: 'UNAUTHORIZED' },
        timestamp: new Date().toISOString()
      });
    }

    // Use system_scope instead of role string checks
    // CROSS_TENANT users get full access
    if (hasCrossTenantScope(user)) {
      console.log('[permissions/me] CROSS_TENANT scope detected - returning full access');
      return res.json({
        success: true,
        data: {
          userId: user.id,
          role: user.role || 'SUPER_ADMIN',
          business_level: 99,
          tenant_id: null,
          allowedPages: ['*'],
          permissions: { '*': { '*': ['*'] } },
          cached: false
        },
        role: user.role || 'SUPER_ADMIN',
        permissions: ['*'],
        modules: ['*'],
        allowedPages: ['*'],
        timestamp: new Date().toISOString()
      });
    }
    
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database not available', code: 'DB_ERROR' },
        timestamp: new Date().toISOString()
      });
    }

    const userId = user.id;
    const normalizedRole = (user.role || '').toUpperCase();
    const businessLevel = user.business_level || 1;

    // ✅ Check cache first
    const cacheKey = `me::${userId}`;
    const cached = cacheService.permissions?.getByUser?.(cacheKey);
    if (cached) {
      console.log(`[permissions/me] Cache HIT for user ${userId}`);
      return res.json({
        success: true,
        data: {
          userId,
          role: normalizedRole,
          business_level: businessLevel,
          tenant_id: user.tenant_id || null,
          allowedPages: cached.allowedPages,
          permissions: cached.permissions,
          cached: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // Get RBAC permissions from database
    let allowedPages = [];
    const permissions = {};

    // 1. Get explicit page permissions from rbac_user_permissions
    const userIdInt = user.legacy_id || (typeof userId === 'number' ? userId : null);
    if (userIdInt) {
      const pagePerms = await prisma.rbac_user_permissions.findMany({
        where: { user_id: userIdInt },
        select: { page_key: true }
      });
      allowedPages = pagePerms.map(p => p.page_key);
    }

    // 2. Get role-based RBAC permissions
    const roleRecord = await prisma.rbac_roles.findFirst({
      where: { name: { equals: normalizedRole, mode: 'insensitive' } },
      select: { id: true }
    });

    if (roleRecord) {
      const rolePerms = await prisma.rbac_permissions.findMany({
        where: { role_id: roleRecord.id, granted: true },
        include: {
          rbac_routes: { select: { route_key: true, module_name: true } },
          rbac_actions: { select: { action_key: true } }
        }
      });

      // Build permissions object: { module: { action: [routes] } }
      for (const perm of rolePerms) {
        const module = perm.rbac_routes?.module_name || 'general';
        const action = perm.rbac_actions?.action_key || 'view';
        const route = perm.rbac_routes?.route_key || '';
        
        if (!permissions[module]) permissions[module] = {};
        if (!permissions[module][action]) permissions[module][action] = [];
        if (route) permissions[module][action].push(route);
      }
    }

    // 3. Add role-based default pages
    if (roleBasedPages[normalizedRole]) {
      const rolePagesSet = new Set([...allowedPages, ...roleBasedPages[normalizedRole]]);
      allowedPages = Array.from(rolePagesSet);
    }

    // ✅ Cache the result (5 min TTL)
    if (cacheService.permissions?.setByUser) {
      cacheService.permissions.setByUser(cacheKey, { allowedPages, permissions });
    }

    res.json({
      success: true,
      data: {
        userId,
        role: normalizedRole,
        business_level: businessLevel,
        tenant_id: user.tenant_id || null,
        allowedPages,
        permissions,
        cached: false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[permissions/me] Error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to fetch permissions', code: 'PERMISSIONS_ERROR' },
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/permissions - Get user's allowed pages (with caching)
router.get('/', authMiddleware.authenticate, async (req, res) => {
  try {
    const prisma = getPrisma();
    if (!prisma) {
      return res.status(500).json({
        success: false,
        error: { message: 'Database not available', code: 'DB_ERROR' },
        timestamp: new Date().toISOString()
      });
    }

    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: { message: 'User ID is required', code: 'MISSING_USER_ID' },
        timestamp: new Date().toISOString()
      });
    }

    // Role-based default pages mapping
    const roleBasedPages = {
      'SYSTEM_ADMIN': ['user-creation', 'user-management', 'permission-manager', 'roles-users-report', 'system-settings', 'backup-restore', 'system-health-dashboard', 'integration-settings', 'deployment-tools', 'fallback-recovery'],
      'ADMIN': ['user-creation', 'system-flow', 'subscription', 'usage', 'settings', 'sla', 'rag-sources', 'task-approvals'],
      'HR': ['user-creation', 'hr-policy'],
      'HR_MANAGER': ['user-creation', 'hr-policy']
    };

    // Handle both UUID and integer user IDs
    let userIdInt = parseInt(userId);
    
    // If userId is a UUID (not a valid integer), try to find the legacy_id
    if (isNaN(userIdInt)) {
      console.log(`[permissions] UUID detected: ${userId}, looking up legacy_id`);
      try {
        const user = await prisma.users_enhanced.findFirst({
          where: { id: userId },
          select: { legacy_id: true, role: true }
        });
        if (user?.legacy_id) {
          userIdInt = user.legacy_id;
          console.log(`[permissions] Found legacy_id: ${userIdInt}`);
        } else {
          // No legacy_id - check role-based permissions
          const userRole = user?.role?.toUpperCase() || '';
          console.log(`[permissions] No legacy_id found for UUID user, checking role: ${userRole}`);
          
          const allowedPages = roleBasedPages[userRole] || [];
          console.log(`[permissions] Role-based pages for ${userRole}:`, allowedPages);
          
          return res.json({
            success: true,
            data: {
              userId: userId,
              allowedPages: allowedPages,
              cached: false,
              source: 'role-based'
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (lookupErr) {
        console.error('[permissions] Error looking up user:', lookupErr.message);
        return res.json({
          success: true,
          data: {
            userId: userId,
            allowedPages: [],
            cached: false
          },
          timestamp: new Date().toISOString()
        });
      }
    }

    // ✅ PERFORMANCE: Check cache first
    const cached = cacheService.permissions.getByUser(userIdInt);
    if (cached) {
      console.log(`[permissions] Cache HIT for user ${userIdInt}`);
      return res.json({
        success: true,
        data: {
          userId: userIdInt,
          allowedPages: cached,
          cached: true
        },
        timestamp: new Date().toISOString()
      });
    }

    // Cache miss - query database
    console.log(`[permissions] Cache MISS for user ${userIdInt} - querying DB`);
    
    // Get user role first
    const user = await prisma.users_enhanced.findFirst({
      where: { 
        OR: [
          { legacy_id: userIdInt },
          { id: userId }
        ]
      },
      select: { role: true }
    });
    
    const userRole = user?.role?.toUpperCase() || '';
    console.log(`[permissions] User role: ${userRole}`);
    
    // Get explicit page permissions from rbac_user_permissions
    const permissions = await prisma.rbac_user_permissions.findMany({
      where: { user_id: userIdInt },
      select: { page_key: true }
    });

    let allowedPages = permissions.map(p => p.page_key);
    
    // For ADMIN, SYSTEM_ADMIN, HR, HR_MANAGER roles, add role-based default pages
    // These roles have inherent permissions based on their role level
    if (roleBasedPages[userRole]) {
      const rolePagesSet = new Set([...allowedPages, ...roleBasedPages[userRole]]);
      allowedPages = Array.from(rolePagesSet);
      console.log(`[permissions] Added role-based pages for ${userRole}:`, roleBasedPages[userRole]);
    }

    // ✅ PERFORMANCE: Store in cache (5 min TTL)
    cacheService.permissions.setByUser(userIdInt, allowedPages);

    res.json({
      success: true,
      data: {
        userId: userIdInt,
        allowedPages,
        cached: false
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({
      success: false,
      error: {
        message: 'Failed to fetch permissions',
        code: 'PERMISSIONS_ERROR'
      },
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/permissions/update - Update user's page permissions
router.post('/update',
  authMiddleware.authenticate,
  rbacMiddleware.requireRole(['Super Admin', 'Admin']),
  async (req, res) => {
    try {
      const prisma = getPrisma();
      if (!prisma) {
        return res.status(500).json({
          success: false,
          error: { message: 'Database not available', code: 'DB_ERROR' },
          timestamp: new Date().toISOString()
        });
      }

      const { userId, allowedPages } = req.body;

      if (!userId || !Array.isArray(allowedPages)) {
        return res.status(400).json({
          success: false,
          error: { message: 'Invalid request data', code: 'INVALID_DATA' },
          timestamp: new Date().toISOString()
        });
      }

      const userIdInt = parseInt(userId);

      // Delete existing permissions for this user
      await prisma.rbac_user_permissions.deleteMany({
        where: { user_id: userIdInt }
      });

      // Insert new permissions
      if (allowedPages.length > 0) {
        await prisma.rbac_user_permissions.createMany({
          data: allowedPages.map(pageKey => ({
            user_id: userIdInt,
            page_key: pageKey
          }))
        });
      }

      // ✅ PERFORMANCE: Invalidate cache for this user
      cacheService.permissions.invalidateUser(userIdInt);
      console.log(`[permissions] Cache invalidated for user ${userIdInt}`);

      res.json({
        success: true,
        message: 'Permissions updated successfully',
        data: {
          userId: userIdInt,
          allowedPages
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating permissions:', error);
      res.status(500).json({
        success: false,
        error: {
          message: 'Failed to update permissions',
          code: 'UPDATE_ERROR'
        },
        timestamp: new Date().toISOString()
      });
    }
  }
);

module.exports = router;
