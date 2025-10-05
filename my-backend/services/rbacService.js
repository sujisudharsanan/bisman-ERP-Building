// RBAC Service - Role-Based Access Control using standalone RBAC tables
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

class RBACService {
  // =============== ROLES ===============
  async getAllRoles() {
    try {
      const result = await prisma.$queryRaw`
        SELECT id, name, description, level, created_at, updated_at 
        FROM rbac_roles 
        ORDER BY level DESC, name
      `
      return result
    } catch (error) {
      console.error('Error fetching roles:', error)
      throw error
    }
  }

  async createRole(roleData) {
    try {
      const { name, description, level = 1 } = roleData
      const result = await prisma.$queryRaw`
        INSERT INTO rbac_roles (name, description, level, updated_at)
        VALUES (${name}, ${description}, ${level}, NOW())
        RETURNING id, name, description, level, created_at, updated_at
      `
      return result[0]
    } catch (error) {
      console.error('Error creating role:', error)
      throw error
    }
  }

  async updateRole(roleId, roleData) {
    try {
      const { name, description, level } = roleData
      await prisma.$executeRaw`
        UPDATE rbac_roles 
        SET name = ${name}, description = ${description}, level = ${level}, updated_at = NOW()
        WHERE id = ${roleId}
      `
      return { success: true }
    } catch (error) {
      console.error('Error updating role:', error)
      throw error
    }
  }

  async deleteRole(roleId) {
    try {
      await prisma.$executeRaw`
        DELETE FROM rbac_roles WHERE id = ${roleId}
      `
      return { success: true }
    } catch (error) {
      console.error('Error deleting role:', error)
      throw error
    }
  }

  // =============== USERS ===============
  async getAllUsers() {
    try {
      const result = await prisma.$queryRaw`
        SELECT DISTINCT 
          u.id, 
          u.username, 
          u.email, 
          u.created_at,
          COALESCE(r.name, 'USER') as role,
          COALESCE(r.name, 'USER') as "roleName"
        FROM users u
        LEFT JOIN rbac_user_roles ur ON u.id = ur.user_id
        LEFT JOIN rbac_roles r ON ur.role_id = r.id
        ORDER BY u.created_at DESC
      `
      return result
    } catch (error) {
      console.error('Error fetching users:', error)
      throw error
    }
  }

  async assignUserRole(userId, roleId) {
    try {
      await prisma.$executeRaw`
        DELETE FROM rbac_user_roles WHERE user_id = ${userId}
      `
      await prisma.$executeRaw`
        INSERT INTO rbac_user_roles (user_id, role_id, assigned_at)
        VALUES (${userId}, ${roleId}, NOW())
      `
      return { success: true }
    } catch (error) {
      console.error('Error assigning role:', error)
      throw error
    }
  }

  // =============== ROUTES ===============
  async getAllRoutes() {
    try {
      const result = await prisma.$queryRaw`
        SELECT id, path, name, description, method, module, is_protected, created_at
        FROM rbac_routes 
        ORDER BY module, path
      `
      return result
    } catch (error) {
      console.error('Error fetching routes:', error)
      throw error
    }
  }

  async createRoute(routeData) {
    try {
      const { path, name, description, method = 'GET', module, isProtected = true } = routeData
      const result = await prisma.$queryRaw`
        INSERT INTO rbac_routes (path, name, description, method, module, is_protected)
        VALUES (${path}, ${name}, ${description}, ${method}, ${module}, ${isProtected})
        RETURNING id, path, name, description, method, module, is_protected, created_at
      `
      return result[0]
    } catch (error) {
      console.error('Error creating route:', error)
      throw error
    }
  }

  async updateRoute(routeId, routeData) {
    try {
      const { path, name, description, method, module, isProtected } = routeData
      await prisma.$executeRaw`
        UPDATE rbac_routes 
        SET path = ${path}, name = ${name}, description = ${description}, 
            method = ${method}, module = ${module}, is_protected = ${isProtected}
        WHERE id = ${routeId}
      `
      return { success: true }
    } catch (error) {
      console.error('Error updating route:', error)
      throw error
    }
  }

  async deleteRoute(routeId) {
    try {
      await prisma.$executeRaw`
        DELETE FROM rbac_routes WHERE id = ${routeId}
      `
      return { success: true }
    } catch (error) {
      console.error('Error deleting route:', error)
      throw error
    }
  }

  // =============== ACTIONS ===============
  async getAllActions() {
    try {
      const result = await prisma.$queryRaw`
        SELECT id, name, description, created_at
        FROM rbac_actions 
        ORDER BY name
      `
      return result
    } catch (error) {
      console.error('Error fetching actions:', error)
      throw error
    }
  }

  // =============== PERMISSIONS ===============
  async getAllPermissions() {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          p.id,
          p.role_id as "roleId",
          p.action_id as "actionId", 
          p.route_id as "routeId",
          p.granted,
          r.name as "roleName",
          a.name as "actionName",
          rt.name as "routeName",
          rt.path as "routePath"
        FROM rbac_permissions p
        JOIN rbac_roles r ON p.role_id = r.id
        JOIN rbac_actions a ON p.action_id = a.id  
        JOIN rbac_routes rt ON p.route_id = rt.id
        ORDER BY r.level DESC, rt.module, rt.path, a.name
      `
      return result
    } catch (error) {
      console.error('Error fetching permissions:', error)
      throw error
    }
  }

  async updatePermission(roleId, actionId, routeId, granted) {
    try {
      await prisma.$executeRaw`
        INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
        VALUES (${roleId}, ${actionId}, ${routeId}, ${granted}, NOW())
        ON CONFLICT (role_id, action_id, route_id) 
        DO UPDATE SET granted = ${granted}, updated_at = NOW()
      `
      return { success: true }
    } catch (error) {
      console.error('Error updating permission:', error)
      throw error
    }
  }

  // =============== PERMISSION CHECKING ===============
  async checkUserPermission(userId, action, routePath, method = 'GET') {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM rbac_permissions p
        JOIN rbac_roles r ON p.role_id = r.id
        JOIN rbac_user_roles ur ON ur.role_id = r.id
        JOIN rbac_actions a ON p.action_id = a.id
        JOIN rbac_routes rt ON p.route_id = rt.id
        WHERE ur.user_id = ${userId}
          AND a.name = ${action}
          AND rt.path = ${routePath}
          AND rt.method = ${method}
          AND p.granted = true
      `
      return Number(result[0]?.count) > 0
    } catch (error) {
      console.error('Error checking permission:', error)
      return false
    }
  }

  async getUserPermissions(userId) {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          rt.path as route_path,
          rt.method as route_method,
          a.name as action_name,
          p.granted
        FROM rbac_permissions p
        JOIN rbac_roles r ON p.role_id = r.id
        JOIN rbac_user_roles ur ON ur.role_id = r.id
        JOIN rbac_actions a ON p.action_id = a.id
        JOIN rbac_routes rt ON p.route_id = rt.id
        WHERE ur.user_id = ${userId} AND p.granted = true
      `
      return result
    } catch (error) {
      console.error('Error getting user permissions:', error)
      throw error
    }
  }

  async getPermissionsByRole(roleId) {
    try {
      const result = await prisma.$queryRaw`
        SELECT 
          p.id,
          p.granted,
          a.name as action_name,
          rt.path as route_path,
          rt.name as route_name,
          rt.method as route_method
        FROM rbac_permissions p
        JOIN rbac_actions a ON p.action_id = a.id
        JOIN rbac_routes rt ON p.route_id = rt.id
        WHERE p.role_id = ${roleId}
        ORDER BY rt.path, a.name
      `
      return result
    } catch (error) {
      console.error('Error getting role permissions:', error)
      throw error
    }
  }

  async isAdmin(userId) {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${userId} AND r.name = 'ADMIN'
      `
      return Number(result[0]?.count) > 0
    } catch (error) {
      console.error('Error checking admin status:', error)
      return false
    }
  }
}

module.exports = new RBACService()
