// Permissions API Routes - Manage user page permissions
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const rbacMiddleware = require('../middleware/rbac');
const { getPrisma } = require('../lib/prisma');
const cacheService = require('../services/cacheService'); // ✅ Cache service

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

    const userIdInt = parseInt(userId);

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
    const permissions = await prisma.rbac_user_permissions.findMany({
      where: { user_id: userIdInt },
      select: { page_key: true }
    });

    const allowedPages = permissions.map(p => p.page_key);

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

      const { roleId, userId, allowedPages } = req.body;

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
