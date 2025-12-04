// Super Admin Service - Database control operations
const { getPrisma } = require('../lib/prisma')
const bcrypt = require('bcryptjs')

const prisma = getPrisma()

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
  async getRecentActivity(limit = 20) {
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
  async getAllUsers(search = '', limit = 50, offset = 0) {
    try {
  const users = await prisma.user.findMany({
        take: limit,
        skip: offset,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      })

  const total = await prisma.user.count().catch(() => users.length)
  return { users, total, count: users.length }
    } catch (error) {
      console.error('Error getting users:', error)
      // Security: Return DB error instead of fallback dev users
      throw new Error('DATABASE_ERROR: Failed to fetch users - ' + error.message)
    }
  }

  async createUser(userData, adminUserId, adminUsername) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      const newUser = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password_hash: hashedPassword,
          role: userData.role || 'USER',
        },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
        }
      })

      return newUser
    } catch (error) {
      console.error('Error creating user:', error)
      throw new Error('Failed to create user')
    }
  }

  async updateUser(userId, userData, adminUserId, adminUsername) {
    try {
      const updateData = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        updatedAt: new Date(),
      }

      if (userData.password) {
        updateData.password_hash = await bcrypt.hash(userData.password, 10)
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          updatedAt: true,
        }
      })

      return updatedUser
    } catch (error) {
      console.error('Error updating user:', error)
      throw new Error('Failed to update user')
    }
  }

  async deleteUser(userId, adminUserId, adminUsername) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true, email: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      await prisma.user.delete({
        where: { id: userId }
      })

      return { success: true, message: 'User deleted successfully' }
    } catch (error) {
      console.error('Error deleting user:', error)
      throw new Error('Failed to delete user')
    }
  }

  // =============== DASHBOARD STATS ===============
  async getDashboardStats() {
    try {
      const safeCount = async (cb, fallback = 0) => {
        try { return await cb() } catch { return fallback }
      }
      const stats = {
        users: await safeCount(() => prisma.user.count(), 0),
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

  async getTableData(tableName, search = '', limit = 50, offset = 0) {
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
  async createRole(roleData, adminUserId, adminUsername) {
    return { id: Date.now(), ...roleData, created_at: new Date().toISOString() }
  }

  async updateRole(roleId, roleData, adminUserId, adminUsername) {
    return { id: roleId, ...roleData, updated_at: new Date().toISOString() }
  }

  async deleteRole(roleId, adminUserId, adminUsername) {
    return { success: true, message: 'Role deleted successfully' }
  }

  async createRoute(routeData, adminUserId, adminUsername) {
    return { id: Date.now(), ...routeData, created_at: new Date().toISOString() }
  }

  async updateRoute(routeId, routeData, adminUserId, adminUsername) {
    return { id: routeId, ...routeData, updated_at: new Date().toISOString() }
  }

  async deleteRoute(routeId, adminUserId, adminUsername) {
    return { success: true, message: 'Route deleted successfully' }
  }

  async updatePermissionBatch(updates, adminUserId, adminUsername) {
    return { success: true, message: `Updated ${updates.length} permissions`, processed: updates.length }
  }
}

module.exports = new SuperAdminService()
