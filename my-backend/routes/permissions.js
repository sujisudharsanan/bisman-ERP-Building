/**
 * Permissions API Routes
 * Handles permission checks for pages, modules, and routes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { hasCrossTenantScope } = require('../services/authorizationService');

const prisma = new PrismaClient();

/**
 * GET /api/permissions/check-page
 * Check if user has access to a specific page
 */
router.get('/check-page', authenticate, async (req, res) => {
  try {
    const { pageId } = req.query;
    const userId = req.user.id;
    const userRole = (req.user.role || '').toUpperCase();
    const systemScope = req.user.system_scope || 'BUSINESS';

    if (!pageId) {
      return res.status(400).json({
        hasAccess: false,
        error: 'pageId parameter is required'
      });
    }

    console.log(`🔍 [CHECK PAGE] User: ${req.user.email}, Role: ${userRole}, Scope: ${systemScope}, Page: ${pageId}`);

    // Enterprise Admin: Only enterprise pages
    if (userRole === 'ENTERPRISE_ADMIN') {
      const isEnterprisePage = pageId.startsWith('enterprise-') || 
                                pageId.includes('super-admins') ||
                                pageId.includes('clients-manage') ||
                                pageId.includes('modules-manage');
      
      if (isEnterprisePage) {
        console.log(`✅ [ACCESS GRANTED] Enterprise Admin can access: ${pageId}`);
        return res.json({ hasAccess: true, reason: 'Enterprise Admin access' });
      } else {
        console.log(`🚫 [ACCESS DENIED] Enterprise Admin cannot access business page: ${pageId}`);
        return res.json({ 
          hasAccess: false, 
          reason: 'Enterprise Admin can only access enterprise pages' 
        });
      }
    }

    // CROSS_TENANT scope (Super Admin): Check module assignments and page permissions
    if (hasCrossTenantScope(req.user)) {
      // Exclude enterprise pages
      const isEnterprisePage = pageId.startsWith('enterprise-') || 
                                pageId.includes('super-admins') ||
                                pageId.includes('clients-manage');
      
      if (isEnterprisePage) {
        console.log(`🚫 [ACCESS DENIED] Super Admin cannot access enterprise page: ${pageId}`);
        return res.json({ 
          hasAccess: false, 
          reason: 'Super Admin cannot access enterprise pages' 
        });
      }

      // Check if page is in approved module assignments
      const assignments = await prisma.module_assignments.findMany({
        where: {
          super_admin_id: userId
        },
        include: {
          modules: true
        }
      });

      // Check if pageId is in any page_permissions array
      let hasAccess = false;
      let grantingModule = null;

      for (const assignment of assignments) {
        const pagePermissions = assignment.page_permissions || [];
        if (pagePermissions.includes(pageId)) {
          hasAccess = true;
          grantingModule = assignment.module.display_name;
          break;
        }
      }

      // Also check for common pages (authenticated permission)
      const isCommonPage = pageId.startsWith('common-') || pageId === 'about-me';
      if (isCommonPage) {
        hasAccess = true;
        grantingModule = 'Common';
      }

      if (hasAccess) {
        console.log(`✅ [ACCESS GRANTED] Super Admin can access ${pageId} via ${grantingModule}`);
        return res.json({ 
          hasAccess: true, 
          reason: `Granted by ${grantingModule} module`,
          module: grantingModule
        });
      } else {
        console.log(`🚫 [ACCESS DENIED] Page ${pageId} not in Super Admin's assigned modules`);
        return res.json({ 
          hasAccess: false, 
          reason: 'Page not assigned to you by administrator' 
        });
      }
    }

    // Regular users: Check user_pages table
    const userPage = await prisma.userPage.findFirst({
      where: {
        user_id: userId,
        page_key: pageId
      }
    });

    // Also check for common pages
    const isCommonPage = pageId.startsWith('common-') || pageId === 'about-me';

    if (userPage || isCommonPage) {
      console.log(`✅ [ACCESS GRANTED] User has access to: ${pageId}`);
      return res.json({ 
        hasAccess: true,
        reason: isCommonPage ? 'Common page' : 'Page assigned by administrator'
      });
    } else {
      console.log(`🚫 [ACCESS DENIED] User does not have access to: ${pageId}`);
      return res.json({ 
        hasAccess: false, 
        reason: 'Page not assigned to you' 
      });
    }

  } catch (error) {
    console.error('❌ [CHECK PAGE ERROR]:', error);
    return res.status(500).json({
      hasAccess: false,
      error: 'Failed to check page access',
      message: error.message
    });
  }
});

/**
 * GET /api/permissions
 * Get all permissions for a user (used by sidebar)
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const userId = parseInt(req.query.userId) || req.user.id;
    const userRole = (req.user.role || '').toUpperCase();
    const systemScope = req.user.system_scope || 'BUSINESS';

    console.log(`📋 [GET PERMISSIONS] User: ${req.user.email}, Role: ${userRole}, Scope: ${systemScope}`);

    // Enterprise Admin
    if (userRole === 'ENTERPRISE_ADMIN') {
      return res.json({
        success: true,
        data: {
          userId,
          allowedPages: ['enterprise-dashboard', 'super-admins', 'clients-manage', 'modules-manage', 'billing', 'analytics']
        }
      });
    }

    // CROSS_TENANT scope (Super Admin)
    if (hasCrossTenantScope(req.user)) {
      const assignments = await prisma.module_assignments.findMany({
        where: {
          super_admin_id: userId
        },
        include: {
          modules: true
        }
      });

      const allowedPages = [];
      assignments.forEach(assignment => {
        const pages = assignment.page_permissions || [];
        allowedPages.push(...pages);
      });

      // Add common pages
      allowedPages.push('about-me', 'common-profile');

      return res.json({
        success: true,
        data: {
          userId,
          allowedPages
        }
      });
    }

    // Regular users - Query rbac_user_permissions table
    const permissions = await prisma.rbac_user_permissions.findMany({
      where: { user_id: userId },
      select: { page_key: true }
    });

    const allowedPages = permissions.map(p => p.page_key);

    // Add common pages
    if (!allowedPages.includes('about-me')) allowedPages.push('about-me');
    if (!allowedPages.includes('common-profile')) allowedPages.push('common-profile');

    console.log(`✅ [PERMISSIONS] User ${userId} has ${allowedPages.length} pages:`, allowedPages);

    return res.json({
      success: true,
      data: {
        userId,
        allowedPages
      }
    });

  } catch (error) {
    console.error('❌ [GET PERMISSIONS ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch permissions',
      message: error.message
    });
  }
});

/**
 * POST /api/permissions
 * Save page permissions for a user or role
 */
router.post('/', authenticate, async (req, res) => {
  try {
    const { userId, roleId, roleName, moduleName, allowedPages } = req.body;

    console.log(`💾 [SAVE PERMISSIONS] Request:`, { userId, roleId, roleName, moduleName, allowedPages: allowedPages?.length });

    // Validate input
    if (!allowedPages || !Array.isArray(allowedPages)) {
      return res.status(400).json({
        success: false,
        error: 'allowedPages must be an array'
      });
    }

    if (!userId && !roleId && !roleName) {
      return res.status(400).json({
        success: false,
        error: 'userId, roleId, or roleName is required'
      });
    }

    // Determine target user ID
    let targetUserId = userId;
    
    if (!targetUserId && (roleId || roleName)) {
      // If roleId/roleName provided, find a user with that role
      const roleQuery = roleId 
        ? await prisma.users_enhanced.findFirst({ where: { role: roleId } })
        : await prisma.users_enhanced.findFirst({ where: { role: roleName } });
      
      if (roleQuery) {
        targetUserId = roleQuery.id;
      } else {
        return res.status(404).json({
          success: false,
          error: `No user found with role: ${roleId || roleName}`
        });
      }
    }

    // Delete existing permissions for this user
    await prisma.rbac_user_permissions.deleteMany({
      where: { user_id: targetUserId }
    });

    // Insert new permissions (one row per page_key)
    if (allowedPages.length > 0) {
      await prisma.rbac_user_permissions.createMany({
        data: allowedPages.map(pageKey => ({
          user_id: targetUserId,
          page_key: pageKey
        })),
        skipDuplicates: true
      });
    }

    console.log(`✅ [PERMISSIONS SAVED] User ${targetUserId}: ${allowedPages.length} pages`);

    return res.json({
      success: true,
      message: 'Permissions saved successfully',
      data: {
        userId: targetUserId,
        allowedPages
      }
    });

  } catch (error) {
    console.error('❌ [SAVE PERMISSIONS ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to save permissions',
      message: error.message
    });
  }
});

module.exports = router;
