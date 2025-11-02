const express = require('express');
const router = express.Router();
const { getPrisma } = require('../lib/prisma');
const { authenticate } = require('../middleware/auth'); // ✅ SECURITY: Add authentication
const TenantGuard = require('../middleware/tenantGuard'); // ✅ SECURITY: Multi-tenant isolation

/**
 * GET /api/reports/roles-users
 * Generate a comprehensive report of all roles with their assigned users and email IDs
 */
router.get('/roles-users', authenticate, async (req, res) => {
  const prisma = getPrisma();
  
  try {
    console.log('[RolesUsersReport] Generating roles and users report...');
    
    // ✅ SECURITY FIX: Define tenant filter at the beginning
    const tenantFilter = TenantGuard.getTenantFilter(req);
    
    // Try to fetch from rbac_roles table first
    let roles = [];
    try {
      roles = await prisma.rbac_roles.findMany();
      console.log(`[RolesUsersReport] Found ${roles.length} roles in rbac_roles table`);
    } catch (err) {
      console.log('[RolesUsersReport] rbac_roles table not available or empty, falling back to roles table');
    }
    
    // If rbac_roles is empty, try the simple roles table
    if (roles.length === 0) {
      try {
        const simpleRoles = await prisma.role.findMany();
        console.log(`[RolesUsersReport] Found ${simpleRoles.length} roles in roles table`);
        // Convert to rbac_roles format
        roles = simpleRoles.map(r => ({
          id: r.id,
          name: r.name,
          display_name: r.name,
          description: null,
          level: 1,
          status: 'active',
          is_active: true
        }));
      } catch (err) {
        console.log('[RolesUsersReport] roles table not available');
      }
    }
    
    // If still no roles, extract unique roles from users table
    if (roles.length === 0) {
      console.log('[RolesUsersReport] No roles tables available, extracting unique roles from users');
      // ✅ SECURITY FIX: Add tenant filter
      const users = await prisma.User.findMany({
        where: tenantFilter, // ✅ SECURITY: Filter by tenant_id
        select: { role: true },
        distinct: ['role']
      });
      
      const uniqueRoles = users.map((u, index) => u.role).filter(r => r);
      roles = uniqueRoles.map((roleName, index) => ({
        id: index + 1,
        name: roleName,
        display_name: roleName.split('_').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' '),
        description: null,
        level: 1,
        status: 'active',
        is_active: true
      }));
      console.log(`[RolesUsersReport] Extracted ${roles.length} unique roles from users`);
    }
    
    // Filter out SUPER_ADMIN and ENTERPRISE_ADMIN
    roles = roles.filter(role => {
      const roleName = String(role.name).toUpperCase();
      return roleName !== 'SUPER_ADMIN' && roleName !== 'ENTERPRISE_ADMIN';
    });
    
    // Sort: active first, then by level (desc), then by name
    roles = roles.sort((a, b) => {
      // Active roles first
      if ((a.status === 'active' || a.is_active !== false) && (b.status !== 'active' && b.is_active === false)) return -1;
      if ((a.status !== 'active' && a.is_active === false) && (b.status === 'active' || b.is_active !== false)) return 1;
      // By level (desc, higher first)
      if ((b.level ?? 0) !== (a.level ?? 0)) return (b.level ?? 0) - (a.level ?? 0);
      // By name (asc)
      return String(a.name).localeCompare(String(b.name));
    });
    
    console.log(`[RolesUsersReport] Found ${roles.length} roles (excluding SUPER_ADMIN and ENTERPRISE_ADMIN)`);
    
    // Fetch all users with their role information
    const users = await prisma.User.findMany({
      where: tenantFilter, // ✅ SECURITY: Filter by tenant_id
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { role: 'asc' }
    });
    
    console.log(`[RolesUsersReport] Found ${users.length} users`);
    
    // Build report data structure
    const report = roles.map(role => {
      // Find users with this role
      const roleUsers = users.filter(user => {
        if (!user.role) return false;
        
        // Normalize role names for matching (handle case and underscore variations)
        const userRole = user.role.toLowerCase().replace(/[-_\s]+/g, '_');
        const roleName = role.name.toLowerCase().replace(/[-_\s]+/g, '_');
        
        return userRole === roleName;
      });
      
      return {
        roleId: role.id,
        roleName: role.name,
        roleDisplayName: role.display_name || role.name,
        roleDescription: role.description,
        roleLevel: role.level,
        roleStatus: role.status,
        userCount: roleUsers.length,
        users: roleUsers.map(user => ({
          userId: user.id,
          username: user.username,
          email: user.email,
          createdAt: user.createdAt
        }))
      };
    });
    
    // Calculate summary statistics
    const totalUsers = users.length;
    const rolesWithUsers = report.filter(r => r.userCount > 0).length;
    const rolesWithoutUsers = report.filter(r => r.userCount === 0).length;
    
    const summary = {
      totalRoles: roles.length,
      totalUsers: totalUsers,
      rolesWithUsers: rolesWithUsers,
      rolesWithoutUsers: rolesWithoutUsers,
      generatedAt: new Date().toISOString()
    };
    
    console.log(`[RolesUsersReport] Report generated successfully:`, summary);
    
    res.json({
      success: true,
      summary,
      data: report
    });
    
  } catch (error) {
    console.error('[RolesUsersReport] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate roles-users report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/roles-users/csv
 * Download roles and users report as CSV
 */
router.get('/roles-users/csv', authenticate, async (req, res) => {
  const prisma = getPrisma();
  
  try {
    // ✅ SECURITY FIX: Add tenant filter
    const tenantFilter = TenantGuard.getTenantFilter(req);
    console.log('[RolesUsersReport] Generating CSV export...');
    
    // Try to fetch from rbac_roles table first
    let roles = [];
    try {
      roles = await prisma.rbac_roles.findMany({ orderBy: { name: 'asc' } });
    } catch (err) {
      console.log('[RolesUsersReport CSV] rbac_roles table not available, trying roles table');
    }
    
    // If rbac_roles is empty, try the simple roles table
    if (roles.length === 0) {
      try {
        const simpleRoles = await prisma.role.findMany({ orderBy: { name: 'asc' } });
        // Convert to rbac_roles format
        roles = simpleRoles.map(r => ({
          id: r.id,
          name: r.name,
          display_name: r.name,
          description: null,
          status: 'active'
        }));
      } catch (err) {
        console.log('[RolesUsersReport CSV] roles table not available');
      }
    }
    
    // If still no roles, extract unique roles from users table
    if (roles.length === 0) {
      // ✅ SECURITY FIX: Add tenant filter
      const allUsers = await prisma.User.findMany({
        where: tenantFilter, // ✅ SECURITY: Filter by tenant_id
        select: { role: true },
        distinct: ['role']
      });
      
      const uniqueRoles = allUsers.map((u, index) => u.role).filter(r => r);
      roles = uniqueRoles.map((roleName, index) => ({
        id: index + 1,
        name: roleName,
        display_name: roleName.split('_').map(w => 
          w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
        ).join(' '),
        description: null,
        status: 'active'
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    
    // Filter out SUPER_ADMIN and ENTERPRISE_ADMIN
    roles = roles.filter(role => {
      const roleName = String(role.name).toUpperCase();
      return roleName !== 'SUPER_ADMIN' && roleName !== 'ENTERPRISE_ADMIN';
    });
    
    // ✅ SECURITY FIX: Add tenant filter
    // Fetch all users
    const users = await prisma.User.findMany({
      where: tenantFilter, // ✅ SECURITY: Filter by tenant_id
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { role: 'asc' }
    });
    
    // Build CSV content
    let csv = 'Role ID,Role Name,Role Display Name,Description,Status,User Count,User ID,Username,Email,User Created At\n';
    
    roles.forEach(role => {
      // Find users with this role
      const roleUsers = users.filter(user => {
        if (!user.role) return false;
        const userRole = user.role.toLowerCase().replace(/[-_\s]+/g, '_');
        const roleName = role.name.toLowerCase().replace(/[-_\s]+/g, '_');
        return userRole === roleName;
      });
      
      if (roleUsers.length === 0) {
        // Role with no users - single row
        csv += `${role.id},"${role.name}","${role.display_name || role.name}","${role.description || ''}","${role.status || 'active'}",0,,,\n`;
      } else {
        // Role with users - one row per user
        roleUsers.forEach((user, index) => {
          const isFirstUser = index === 0;
          csv += `${isFirstUser ? role.id : ''},`;
          csv += `${isFirstUser ? '"' + role.name + '"' : ''},`;
          csv += `${isFirstUser ? '"' + (role.display_name || role.name) + '"' : ''},`;
          csv += `${isFirstUser ? '"' + (role.description || '') + '"' : ''},`;
          csv += `${isFirstUser ? '"' + (role.status || 'active') + '"' : ''},`;
          csv += `${isFirstUser ? roleUsers.length : ''},`;
          csv += `${user.id},`;
          csv += `"${user.username}",`;
          csv += `"${user.email}",`;
          csv += `"${user.createdAt ? new Date(user.createdAt).toISOString() : ''}"\n`;
        });
      }
    });
    
    // Set headers for CSV download
    const filename = `roles-users-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    console.log(`[RolesUsersReport] CSV export generated: ${filename}`);
    res.send(csv);
    
  } catch (error) {
    console.error('[RolesUsersReport] Error generating CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSV report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/pages-roles
 * Generate a comprehensive report of all pages with their assigned roles and usage statistics
 */
router.get('/pages-roles', async (req, res) => {
  const prisma = getPrisma();
  
  try {
    console.log('[PagesRolesReport] Generating pages and roles report...');
    
    // Import page registry dynamically
    const path = require('path');
    const fs = require('fs');
    const registryPath = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
    
    // Parse page registry
    let pages = [];
    if (fs.existsSync(registryPath)) {
      const content = fs.readFileSync(registryPath, 'utf-8');
      
      // Extract PAGE_REGISTRY array
      const registryMatch = content.match(/export const PAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
      
      if (registryMatch) {
        const fullEntries = registryMatch[1].split(/\},\s*\{/);
        pages = fullEntries.map((entry) => {
          const page = {};
          
          // Extract fields
          const idMatch = entry.match(/id:\s*['"]([^'"]+)['"]/);
          const nameMatch = entry.match(/name:\s*['"]([^'"]+)['"]/);
          const pathMatch = entry.match(/path:\s*['"]([^'"]+)['"]/);
          const moduleMatch = entry.match(/module:\s*['"]([^'"]+)['"]/);
          const statusMatch = entry.match(/status:\s*['"]([^'"]+)['"]/);
          const descMatch = entry.match(/description:\s*['"]([^'"]+)['"]/);
          const orderMatch = entry.match(/order:\s*(\d+)/);
          
          // Extract arrays
          const permMatch = entry.match(/permissions:\s*\[([\s\S]*?)\]/);
          const rolesMatch = entry.match(/roles:\s*\[([\s\S]*?)\]/);
          
          if (idMatch) page.id = idMatch[1];
          if (nameMatch) page.name = nameMatch[1];
          if (pathMatch) page.path = pathMatch[1];
          if (moduleMatch) page.module = moduleMatch[1];
          if (statusMatch) page.status = statusMatch[1];
          if (descMatch) page.description = descMatch[1];
          if (orderMatch) page.order = parseInt(orderMatch[1]);
          
          if (permMatch) {
            page.permissions = permMatch[1]
              .match(/['"]([^'"]+)['"]/g)
              ?.map(s => s.replace(/['"]/g, '')) || [];
          } else {
            page.permissions = [];
          }
          
          if (rolesMatch) {
            page.roles = rolesMatch[1]
              .match(/['"]([^'"]+)['"]/g)
              ?.map(s => s.replace(/['"]/g, '')) || [];
          } else {
            page.roles = [];
          }
          
          return page;
        }).filter(p => p.id); // Only include entries with an id
      }
    }
    
    console.log(`[PagesRolesReport] Found ${pages.length} pages in registry`);
    
    // Fetch all roles from database
    const roles = await prisma.rbac_roles.findMany({
      where: {
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        display_name: true,
        description: true,
        level: true,
        status: true
      },
      orderBy: [
        { level: 'desc' },
        { name: 'asc' }
      ]
    });
    
    console.log(`[PagesRolesReport] Found ${roles.length} active roles`);
    
    // Build report data structure
    const report = pages.map(page => {
      // Normalize role names for matching
      const normalizeRole = (role) => {
        return String(role || '').toUpperCase().replace(/[_\s-]+/g, '_');
      };
      
      // Find roles that can access this page
      const pageRoleNames = (page.roles || []).map(r => normalizeRole(r));
      const matchingRoles = roles.filter(role => {
        const roleName = normalizeRole(role.name);
        const displayName = normalizeRole(role.display_name);
        return pageRoleNames.includes(roleName) || pageRoleNames.includes(displayName);
      });
      
      return {
        id: page.id,
        name: page.name,
        path: page.path,
        module: page.module || 'unknown',
        status: page.status || 'active',
        description: page.description || '',
        permissions: page.permissions || [],
        roleNames: page.roles || [],
        roles: matchingRoles.map(r => ({
          id: r.id,
          name: r.name,
          displayName: r.display_name || r.name,
          level: r.level
        })),
        roleCount: matchingRoles.length,
        isOrphan: matchingRoles.length === 0,
        order: page.order || 999
      };
    });
    
    // Sort: active first, then by module, then by order/name
    report.sort((a, b) => {
      // Active pages first
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (a.status !== 'active' && b.status === 'active') return 1;
      // By module
      if (a.module !== b.module) return a.module.localeCompare(b.module);
      // By order
      if (a.order !== b.order) return (a.order || 999) - (b.order || 999);
      // By name
      return a.name.localeCompare(b.name);
    });
    
    // Generate statistics
    const statistics = {
      totalPages: report.length,
      activePages: report.filter(p => p.status === 'active').length,
      disabledPages: report.filter(p => p.status === 'disabled').length,
      orphanPages: report.filter(p => p.isOrphan).length,
      pagesByModule: {},
      pagesByRoleCount: {
        noRoles: report.filter(p => p.roleCount === 0).length,
        oneRole: report.filter(p => p.roleCount === 1).length,
        multipleRoles: report.filter(p => p.roleCount > 1).length
      }
    };
    
    // Count pages by module
    report.forEach(page => {
      if (!statistics.pagesByModule[page.module]) {
        statistics.pagesByModule[page.module] = 0;
      }
      statistics.pagesByModule[page.module]++;
    });
    
    // Find most used and least used pages
    const sortedByRoleCount = [...report].sort((a, b) => b.roleCount - a.roleCount);
    const mostUsedPages = sortedByRoleCount.slice(0, 5).map(p => ({
      name: p.name,
      path: p.path,
      roleCount: p.roleCount
    }));
    
    const leastUsedPages = report
      .filter(p => p.roleCount > 0)
      .sort((a, b) => a.roleCount - b.roleCount)
      .slice(0, 5)
      .map(p => ({
        name: p.name,
        path: p.path,
        roleCount: p.roleCount
      }));
    
    console.log(`[PagesRolesReport] Generated report with ${report.length} pages`);
    console.log(`[PagesRolesReport] Orphan pages: ${statistics.orphanPages}`);
    
    res.json({
      success: true,
      data: report,
      statistics,
      mostUsedPages,
      leastUsedPages,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[PagesRolesReport] Error generating report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate pages-roles report',
      message: error.message
    });
  }
});

/**
 * GET /api/reports/pages-roles/csv
 * Export pages-roles report as CSV
 */
router.get('/pages-roles/csv', async (req, res) => {
  const prisma = getPrisma();
  
  try {
    console.log('[PagesRolesReport] Generating CSV export...');
    
    // Import page registry dynamically
    const path = require('path');
    const fs = require('fs');
    const registryPath = path.join(__dirname, '../../my-frontend/src/common/config/page-registry.ts');
    
    // Parse page registry (same logic as JSON endpoint)
    let pages = [];
    if (fs.existsSync(registryPath)) {
      const content = fs.readFileSync(registryPath, 'utf-8');
      const registryMatch = content.match(/export const PAGE_REGISTRY[^=]*=\s*\[([\s\S]*?)\]\s*;/);
      
      if (registryMatch) {
        const fullEntries = registryMatch[1].split(/\},\s*\{/);
        pages = fullEntries.map((entry) => {
          const page = {};
          const idMatch = entry.match(/id:\s*['"]([^'"]+)['"]/);
          const nameMatch = entry.match(/name:\s*['"]([^'"]+)['"]/);
          const pathMatch = entry.match(/path:\s*['"]([^'"]+)['"]/);
          const moduleMatch = entry.match(/module:\s*['"]([^'"]+)['"]/);
          const statusMatch = entry.match(/status:\s*['"]([^'"]+)['"]/);
          const rolesMatch = entry.match(/roles:\s*\[([\s\S]*?)\]/);
          
          if (idMatch) page.id = idMatch[1];
          if (nameMatch) page.name = nameMatch[1];
          if (pathMatch) page.path = pathMatch[1];
          if (moduleMatch) page.module = moduleMatch[1];
          if (statusMatch) page.status = statusMatch[1];
          
          if (rolesMatch) {
            page.roles = rolesMatch[1]
              .match(/['"]([^'"]+)['"]/g)
              ?.map(s => s.replace(/['"]/g, '')) || [];
          } else {
            page.roles = [];
          }
          
          return page;
        }).filter(p => p.id);
      }
    }
    
    // Build CSV
    let csv = 'Page ID,Page Name,Path,Module,Status,Role Count,Roles,Is Orphan\n';
    
    pages.forEach(page => {
      const roles = (page.roles || []).join('; ');
      const isOrphan = (page.roles || []).length === 0 ? 'Yes' : 'No';
      
      csv += `"${page.id}",`;
      csv += `"${page.name}",`;
      csv += `"${page.path}",`;
      csv += `"${page.module || 'unknown'}",`;
      csv += `"${page.status || 'active'}",`;
      csv += `${(page.roles || []).length},`;
      csv += `"${roles}",`;
      csv += `"${isOrphan}"\n`;
    });
    
    // Set headers for CSV download
    const filename = `pages-roles-report-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    console.log(`[PagesRolesReport] CSV export generated: ${filename}`);
    res.send(csv);
    
  } catch (error) {
    console.error('[PagesRolesReport] Error generating CSV:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate CSV report',
      message: error.message
    });
  }
});

module.exports = router;
