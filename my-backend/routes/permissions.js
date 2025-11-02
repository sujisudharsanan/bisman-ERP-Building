/**
 * Permissions API Routes
 * Handles permission checks for pages, modules, and routes
 */

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');

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

    if (!pageId) {
      return res.status(400).json({
        hasAccess: false,
        error: 'pageId parameter is required'
      });
    }

    console.log(`🔍 [CHECK PAGE] User: ${req.user.email}, Role: ${userRole}, Page: ${pageId}`);

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

    // Super Admin: Check module assignments and page permissions
    if (userRole === 'SUPER_ADMIN') {
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
      const assignments = await prisma.moduleAssignment.findMany({
        where: {
          super_admin_id: userId
        },
        include: {
          module: true
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

    console.log(`📋 [GET PERMISSIONS] User: ${req.user.email}, Role: ${userRole}`);

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

    // Super Admin
    if (userRole === 'SUPER_ADMIN') {
      const assignments = await prisma.moduleAssignment.findMany({
        where: {
          super_admin_id: userId
        },
        include: {
          module: true
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

    // Regular users
    const userPages = await prisma.userPage.findMany({
      where: {
        user_id: userId
      },
      select: {
        page_key: true
      }
    });

    const allowedPages = userPages.map(up => up.page_key);
    // Add common pages
    allowedPages.push('about-me', 'common-profile');

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

module.exports = router;
