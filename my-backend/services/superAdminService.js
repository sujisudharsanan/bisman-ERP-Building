// Super Admin Service - Database control operations
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

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

      const total = await prisma.user.count()
      return { users, total, count: users.length }
    } catch (error) {
      console.error('Error getting users:', error)
      throw new Error('Failed to fetch users')
    }
  }

  async createUser(userData, adminUserId, adminUsername) {
    try {
      const hashedPassword = await bcrypt.hash(userData.password, 10)
      
      const newUser = await prisma.user.create({
        data: {
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
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
        updateData.password = await bcrypt.hash(userData.password, 10)
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
      const stats = {
        users: await prisma.user.count(),
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
        
        if (rbacRoles.length > 0) stats.roles = Number(rbacRoles[0].count)
        if (rbacRoutes.length > 0) stats.routes = Number(rbacRoutes[0].count)
        if (rbacPermissions.length > 0) stats.permissions = Number(rbacPermissions[0].count)
      } catch (rbacError) {
        console.warn('RBAC tables may not be fully set up:', rbacError.message)
      }

      return stats
    } catch (error) {
      console.error('Error getting dashboard stats:', error)
      return {
        users: 1,
        roles: 4,
        routes: 0,
        permissions: 0,
        activities: 0,
        tables: 7
      }
    }
  }

  // =============== DIRECT TABLE ACCESS ===============
  async getTableData(tableName, search = '', limit = 50, offset = 0) {
    try {
      if (tableName === 'users') {
        const result = await this.getAllUsers(search, limit, offset)
        return {
          columns: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
          rows: result.users,
          count: result.total
        }
      }

      return {
        columns: ['id', 'name', 'description', 'created_at'],
        rows: [
          { id: 1, name: 'Sample', description: 'Sample data', created_at: new Date().toISOString() }
        ],
        count: 1
      }
    } catch (error) {
      console.error('Error getting table data:', error)
      throw new Error(`Failed to fetch ${tableName} data`)
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
