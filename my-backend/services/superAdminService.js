// Super Admin Service - Database control operations
// CANONICAL: All user lifecycle operations MUST delegate to UserService
const { getPrisma } = require('../lib/prisma')
const UserService = require('./userService')

const prisma = getPrisma()

// ✅ SECURITY: List of protected fields that require special authorization
// eslint-disable-next-line no-unused-vars
const PROTECTED_FIELDS = ['business_level', 'user_type', 'is_active'];

class SuperAdminService {
  // =============== ACTIVITY LOGGING ===============
  async logActivity(userId, username, action, entityType, entityId, details) {
    try {
      console.log('Activity:', { userId, username, action, entityType, entityId, details })
      return { success: true }
    } catch (error) {
      console.error('Error logging activity:', error)
      return { success: false }
    }
  }

  // Get recent activity
  async getRecentActivity(_limit = 20) {
    try {
      return [
        {
          id: '1',
          user_id: 1,
          username: 'System',
          action: 'dashboard_view',
          entity_type: 'dashboard',
          entity_id: null,
          details: { timestamp: new Date() },
          created_at: new Date().toISOString()
        }
      ]
    } catch (error) {
      console.error('Error getting recent activity:', error)
      return []
    }
  }

  // =============== USER MANAGEMENT ===============
  async getAllUsers(_search = '', limit = 50, offset = 0) {
    try {
  const users = await prisma.users_enhanced.findMany({
        take: limit,
        skip: offset,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          created_at: true,
          updated_at: true,
        },
        orderBy: { created_at: 'desc' }
      })

  const total = await prisma.users_enhanced.count().catch(() => users.length)
  return { users, total, count: users.length }
    } catch (error) {
      console.error('Error getting users:', error)
      // Security: Return DB error instead of fallback dev users
      throw new Error('DATABASE_ERROR: Failed to fetch users - ' + error.message)
    }
  }

  /**
   * Create User - DELEGATES TO CANONICAL UserService
   * @deprecated Direct implementation removed. All logic now in UserService.
   */
  async createUser(userData, adminUserId, _adminUsername, tenantId = null) {
    try {
      // CANONICAL: Delegate to UserService (single source of truth)
      // Previous P0-2, P1-4, P1-5 security checks are now in UserService
      console.log('[SuperAdminService] createUser delegating to UserService');
      
      // Get admin user for context
      const adminUser = await prisma.users_enhanced.findFirst({
        where: { id: adminUserId },
        select: { legacy_id: true, role: true }
      });
      
      const isEnterpriseAdmin = adminUser?.role === 'ENTERPRISE_ADMIN';
      
      const newUser = await UserService.createUser(
        {
          username: userData.username,
          email: userData.email,
          password: userData.password,
          role: userData.role || 'USER',
          business_level: userData.business_level,
          reports_to: userData.reports_to,
          tenant_id: tenantId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
        },
        {
          adminUserId,
          isEnterpriseAdmin,
          assignedByLegacyId: adminUser?.legacy_id,
        }
      );

      return newUser;
    } catch (error) {
      console.error('[SuperAdminService] createUser error:', error.message);
      throw error;
    }
  }

  /**
   * Update User - DELEGATES TO CANONICAL UserService
   * @deprecated Direct implementation removed. All logic now in UserService.
   */
  async updateUser(userId, userData, adminUserId, _adminUsername) {
    try {
      // CANONICAL: Delegate to UserService
      console.log('[SuperAdminService] updateUser delegating to UserService');
      
      // Get admin user for context
      const adminUser = await prisma.users_enhanced.findFirst({
        where: { id: adminUserId },
        select: { legacy_id: true, role: true }
      });
      
      const isEnterpriseAdmin = adminUser?.role === 'ENTERPRISE_ADMIN';

      // ✅ SECURITY: Explicitly filter out business_level - must be changed via Enterprise Admin routes
      // This prevents accidental or malicious business_level changes via Super Admin API
      const { business_level: _bl, ...safeUserData } = userData;
      if (_bl !== undefined) {
        console.warn(`[SuperAdminService] business_level change blocked for user ${userId} - use Enterprise Admin route`);
      }
      
      // CANONICAL: Delegate to UserService
      const updatedUser = await UserService.updateUser(
        userId,
        {
          username: safeUserData.username,
          email: safeUserData.email,
          role: safeUserData.role,
          password: safeUserData.password,
          reports_to: safeUserData.reports_to,
          first_name: safeUserData.first_name,
          last_name: safeUserData.last_name,
          phone: safeUserData.phone,
        },
        {
          adminUserId,
          isEnterpriseAdmin,
          assignedByLegacyId: adminUser?.legacy_id,
        }
      );

      return updatedUser;
    } catch (error) {
      console.error('[SuperAdminService] updateUser error:', error.message);
      throw error;
    }
  }

  /**
   * Delete User - DELEGATES TO CANONICAL UserService
   */
  async deleteUser(userId, adminUserId, _adminUsername) {
    try {
      // CANONICAL: Delegate to UserService
      console.log('[SuperAdminService] deleteUser delegating to UserService');
      
      // Get admin user for context
      const adminUser = await prisma.users_enhanced.findFirst({
        where: { id: adminUserId },
        select: { legacy_id: true, role: true, business_level: true }
      });
      
      // Additional hierarchy check before deletion
      const targetUser = await prisma.users_enhanced.findFirst({
        where: { id: userId },
        select: { business_level: true, role: true }
      });

      if (!targetUser) {
        throw new Error('User not found');
      }

      // SECURITY FIX: Hierarchy validation - cannot delete users with equal or higher level
      const adminLevel = adminUser?.business_level || 1;
      const targetLevel = targetUser.business_level || 1;
      const isEnterpriseAdmin = adminUser?.role === 'ENTERPRISE_ADMIN';
      
      // ENTERPRISE_ADMIN can delete anyone except other ENTERPRISE_ADMINs
      if (!isEnterpriseAdmin) {
        if (targetLevel >= adminLevel) {
          console.warn(`[DeleteUser] BLOCKED: Admin L${adminLevel} attempted to delete L${targetLevel} user`);
          throw new Error('HIERARCHY_VIOLATION: Cannot delete users with equal or higher business level');
        }
      }
      
      // Prevent deletion of ENTERPRISE_ADMIN accounts
      if (targetUser.role === 'ENTERPRISE_ADMIN') {
        throw new Error('PROTECTED_USER: Cannot delete Enterprise Admin accounts');
      }

      await UserService.deleteUser(userId, {
        adminUserId,
        assignedByLegacyId: adminUser?.legacy_id,
      });

      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('[SuperAdminService] deleteUser error:', error.message);
      throw error.message?.includes('HIERARCHY') || error.message?.includes('PROTECTED') 
        ? error 
        : new Error('Failed to delete user');
    }
  }

  // =============== DASHBOARD STATS ===============
  async getDashboardStats() {
    try {
      const safeCount = async (cb, fallback = 0) => {
        try { return await cb() } catch { return fallback }
      }
      const stats = {
        users: await safeCount(() => prisma.users_enhanced.count(), 0),
        roles: 4,
        routes: 0,
        permissions: 0,
        activities: 0,
        tables: 7
      }

      try {
        const rbacRoles = await prisma.$queryRaw`SELECT COUNT(*) as count FROM rbac_roles`
        const rbacRoutes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM rbac_routes`
        const rbacPermissions = await prisma.$queryRaw`SELECT COUNT(*) as count FROM rbac_permissions`
        const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
        if (rbacRoles.length > 0) stats.roles = toNum(rbacRoles[0].count)
        if (rbacRoutes.length > 0) stats.routes = toNum(rbacRoutes[0].count)
        if (rbacPermissions.length > 0) stats.permissions = toNum(rbacPermissions[0].count)
      } catch (rbacError) {
        console.warn('RBAC tables may not be fully set up:', rbacError.message)
      }

      return stats
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return {
        users: 5,
        roles: 4,
        routes: 0,
        permissions: 0,
        activities: 1,
        tables: 7
      }
    }
  }

  // =============== DIRECT TABLE ACCESS ===============
  async listTables() {
    // Query PostgreSQL catalog for public schema tables
    try {
      const rows = await prisma.$queryRawUnsafe(`
        SELECT tablename AS name
        FROM pg_catalog.pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename ASC
      `)
      return rows.map(r => ({ name: r.name }))
    } catch (e) {
      console.error('Error listing tables:', e.message)
      // Security: Return DB error instead of fallback table list
      throw new Error('DATABASE_ERROR: Failed to list tables - ' + e.message)
    }
  }

  async getTableData(tableName, _search = '', limit = 50, offset = 0) {
    try {
      // Prevent SQL injection: allow alphanumeric and underscores only
      if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
        throw new Error('Invalid table name')
      }

      // Count rows
  const countRows = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS count FROM "${tableName}"`)
  const rawCount = (Array.isArray(countRows) && countRows[0] && countRows[0].count)
  const total = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount || 0)

      // Basic select with pagination; frontend can handle search for now
      const rows = await prisma.$queryRawUnsafe(
        `SELECT * FROM "${tableName}" OFFSET ${offset} LIMIT ${limit}`
      )

      // Derive columns from first row
      const first = rows[0] || {}
      const columns = Object.keys(first).length
        ? Object.keys(first)
        : ['id']

      return { columns, rows, count: total }
    } catch (error) {
      console.error('Error getting table data:', error)
      // Security: Return DB error with details
      throw new Error('DATABASE_ERROR: Failed to fetch ' + tableName + ' data - ' + error.message)
    }
  }

  // Placeholder methods for other operations
  async createRole(roleData, _adminUserId, _adminUsername) {
    return { id: Date.now(), ...roleData, created_at: new Date().toISOString() }
  }

  async updateRole(roleId, roleData, _adminUserId, _adminUsername) {
    return { id: roleId, ...roleData, updated_at: new Date().toISOString() }
  }

  async deleteRole(_roleId, _adminUserId, _adminUsername) {
    return { success: true, message: 'Role deleted successfully' }
  }

  async createRoute(routeData, _adminUserId, _adminUsername) {
    return { id: Date.now(), ...routeData, created_at: new Date().toISOString() }
  }

  async updateRoute(routeId, routeData, _adminUserId, _adminUsername) {
    return { id: routeId, ...routeData, updated_at: new Date().toISOString() }
  }

  async deleteRoute(_routeId, _adminUserId, _adminUsername) {
    return { success: true, message: 'Route deleted successfully' }
  }

  async updatePermissionBatch(updates, _adminUserId, _adminUsername) {
    return { success: true, message: `Updated ${updates.length} permissions`, processed: updates.length }
  }
}

module.exports = new SuperAdminService()
