// RBAC Service - Role-Based Access Control using standalone RBAC tables
const { getPrisma } = require('../lib/prisma')
const auditService = require('./auditService')
const rbacMetrics = require('../lib/rbacMetrics')

const prisma = getPrisma()

// Role level constants for global/platform roles
const GLOBAL_ROLE_LEVELS = {
  ENTERPRISE_ADMIN: 100,
  SUPER_ADMIN: 90
}

// Error codes for tenant validation
const TENANT_ERRORS = {
  CROSS_TENANT_VIOLATION: 'CROSS_TENANT_VIOLATION',
  TENANT_MISMATCH: 'TENANT_MISMATCH',
  GLOBAL_ROLE_MODIFICATION: 'GLOBAL_ROLE_MODIFICATION'
}

class RBACService {
  // =============== ROLES ===============
  async getAllRoles() {
    try {
      // Compute total possible permissions as routes x actions
      const totalRoutes = await prisma.$queryRaw`SELECT COUNT(*) as count FROM rbac_routes`
      const totalActions = await prisma.$queryRaw`SELECT COUNT(*) as count FROM rbac_actions`
      // COUNT(*) can be returned as bigint in some drivers; coerce safely
      const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
      const totalPossible = toNum(totalRoutes?.[0]?.count) * toNum(totalActions?.[0]?.count)

      // Prefer schemas that have a status TEXT column; if missing, we'll fallback below
      let result
      try {
        result = await prisma.$queryRaw`
        SELECT 
          r.id, r.name, r.description, r.level, r.created_at, r.updated_at,
          r.status,
          COALESCE((SELECT COUNT(*) FROM rbac_user_roles ur WHERE ur.role_id = r.id), 0) as user_count,
          COALESCE((SELECT COUNT(*) FROM rbac_permissions p WHERE p.role_id = r.id AND p.granted = true), 0) as permission_count
        FROM rbac_roles r
        ORDER BY r.level DESC, r.name
      `
      } catch (e) {
        // Fallback for older schema with boolean is_active and no status column
        result = await prisma.$queryRaw`
        SELECT 
          r.id, r.name, r.description, r.level, r.created_at, r.updated_at,
          CASE WHEN r.is_active IS DISTINCT FROM FALSE THEN 'active' ELSE 'inactive' END AS status,
          COALESCE((SELECT COUNT(*) FROM rbac_user_roles ur WHERE ur.role_id = r.id), 0) as user_count,
          COALESCE((SELECT COUNT(*) FROM rbac_permissions p WHERE p.role_id = r.id AND p.granted = true), 0) as permission_count
        FROM rbac_roles r
        ORDER BY r.level DESC, r.name
        `
      }
      // Normalize any bigint fields to numbers to avoid JSON serialization errors
      const normalize = (row) => {
        const out = { ...row }
        for (const k of Object.keys(out)) {
          if (typeof out[k] === 'bigint') out[k] = Number(out[k])
        }
        // Common numeric fields that might come back as strings in some environments
        if (out.level != null) out.level = toNum(out.level)
        if (out.user_count != null) out.user_count = toNum(out.user_count)
        if (out.permission_count != null) out.permission_count = toNum(out.permission_count)
        // Map status -> is_active boolean for frontend compatibility
        out.is_active = String(out.status || 'active').toLowerCase() !== 'inactive'
        return out
      }
      // Attach total possible to each row for convenience
      return result.map(r => ({ ...normalize(r), total_permissions: totalPossible }))
    } catch (error) {
      console.error('Error fetching roles:', error)
      throw error
    }
  }

  async setRoleStatus(roleId, isActive) {
    try {
      const status = isActive ? 'active' : 'inactive'
      try {
        await prisma.$executeRaw`
          UPDATE rbac_roles SET status = ${status}, updated_at = NOW() WHERE id = ${roleId}
        `
      } catch (e) {
        // Fallback for schema without status: use boolean is_active if present
        await prisma.$executeRaw`
          UPDATE rbac_roles SET is_active = ${Boolean(isActive)}, updated_at = NOW() WHERE id = ${roleId}
        `
      }
      return { success: true }
    } catch (error) {
      console.error('Error updating role status:', error)
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

  // =============== ROLE LEVEL VALIDATION ===============
  /**
   * Validates that the assigner has sufficient role level to perform an action.
   * @param {number|string} assignerId - The user ID of the assigner
   * @param {number|number[]} requiredLevel - The required level (or array of permission IDs to check levels for)
   * @returns {Promise<boolean>} - Returns true if validation passes
   * @throws {{ status: number, code: string, message: string }} - Throws on level violation
   */
  async validateRoleLevel(assignerId, requiredLevel) {
    try {
      // Fetch the maximum role level for the assigner
      const assignerResult = await prisma.$queryRaw`
        SELECT MAX(r.level) as max_level
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${assignerId}
      `

      const assignerMaxLevel = assignerResult?.[0]?.max_level
      
      // Handle bigint conversion
      const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
      const normalizedAssignerLevel = toNum(assignerMaxLevel)

      // If no role found for assigner, they have no authority
      if (assignerMaxLevel == null || normalizedAssignerLevel === 0) {
        // Record metric for this violation
        rbacMetrics.recordRoleLevelViolation({
          userId: assignerId,
          attemptedLevel: Array.isArray(requiredLevel) ? 'multiple' : requiredLevel,
          userLevel: 0
        })
        
        const error = {
          status: 403,
          code: 'ROLE_LEVEL_VIOLATION',
          message: 'Assigner has no role assigned and cannot assign roles'
        }
        throw error
      }

      let targetLevel

      // If requiredLevel is an array (permission IDs), get the max level required
      if (Array.isArray(requiredLevel)) {
        if (requiredLevel.length === 0) {
          return true // No permissions to check
        }
        
        // Get the maximum level required by any of the permissions
        // Check both the role level AND the min_role_level column
        const permissionResult = await prisma.$queryRaw`
          SELECT 
            GREATEST(
              COALESCE(MAX(r.level), 0),
              COALESCE(MAX(p.min_role_level), 0)
            ) as max_level
          FROM rbac_permissions p
          LEFT JOIN rbac_roles r ON p.role_id = r.id
          WHERE p.id = ANY(${requiredLevel}::int[])
        `
        targetLevel = toNum(permissionResult?.[0]?.max_level)
      } else {
        // requiredLevel is a direct level number
        targetLevel = toNum(requiredLevel)
      }

      // Validate: assigner's level must be >= required level
      if (normalizedAssignerLevel < targetLevel) {
        // Record metric for privilege escalation attempt
        rbacMetrics.recordRoleLevelViolation({
          userId: assignerId,
          attemptedLevel: targetLevel,
          userLevel: normalizedAssignerLevel
        })
        
        const error = {
          status: 403,
          code: 'ROLE_LEVEL_VIOLATION',
          message: 'Assigner cannot create or assign role above their level'
        }
        throw error
      }

      return true
    } catch (error) {
      // Re-throw custom errors as-is
      if (error.code === 'ROLE_LEVEL_VIOLATION') {
        throw error
      }
      console.error('Error validating role level:', error)
      throw {
        status: 500,
        code: 'ROLE_LEVEL_CHECK_FAILED',
        message: 'Failed to validate role level'
      }
    }
  }

  /**
   * Gets the maximum role level for a user
   * @param {number|string} userId - The user ID
   * @returns {Promise<number>} - The maximum role level (0 if no roles assigned)
   */
  async getUserMaxLevel(userId) {
    try {
      const result = await prisma.$queryRaw`
        SELECT MAX(r.level) as max_level
        FROM rbac_user_roles ur
        JOIN rbac_roles r ON ur.role_id = r.id
        WHERE ur.user_id = ${userId}
      `
      const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
      return toNum(result?.[0]?.max_level)
    } catch (error) {
      console.error('Error getting user max level:', error)
      return 0
    }
  }

  // =============== TENANT SCOPING ===============
  
  /**
   * Gets the tenant ID for a user, with support for Enterprise/Super Admins who are global
   * @param {number|string} userId - The user ID
   * @param {string} [userType] - Optional user type hint ('ENTERPRISE_ADMIN', 'SUPER_ADMIN', or regular)
   * @returns {Promise<{ tenantId: string|null, isGlobal: boolean, userType: string }>}
   */
  async getUserTenantInfo(userId, userType = null) {
    try {
      // Check if user is an Enterprise Admin (global - no tenant)
      if (userType === 'ENTERPRISE_ADMIN') {
        return { tenantId: null, isGlobal: true, userType: 'ENTERPRISE_ADMIN' }
      }
      
      // Check if user is a Super Admin (can manage multiple tenants but has a product scope)
      if (userType === 'SUPER_ADMIN') {
        const superAdmin = await prisma.$queryRaw`
          SELECT id, "productType" FROM super_admins WHERE id = ${userId}
        `
        if (superAdmin && superAdmin.length > 0) {
          return { tenantId: null, isGlobal: true, userType: 'SUPER_ADMIN', productType: superAdmin[0].productType }
        }
      }
      
      // Regular user - get their tenant_id
      const user = await prisma.$queryRaw`
        SELECT id, tenant_id, role FROM users WHERE id = ${userId}
      `
      
      if (!user || user.length === 0) {
        return { tenantId: null, isGlobal: false, userType: 'UNKNOWN' }
      }
      
      return {
        tenantId: user[0].tenant_id,
        isGlobal: false,
        userType: 'USER',
        role: user[0].role
      }
    } catch (error) {
      console.error('Error getting user tenant info:', error)
      return { tenantId: null, isGlobal: false, userType: 'UNKNOWN' }
    }
  }

  /**
   * Gets the tenant ID for a role (if tenant_id column exists)
   * Returns null for global/shared roles
   * @param {number|string} roleId - The role ID
   * @returns {Promise<{ tenantId: string|null, isGlobalRole: boolean, roleName: string, level: number }>}
   */
  async getRoleTenantInfo(roleId) {
    try {
      // First check if the role has a tenant_id column (may not exist in older schemas)
      let result
      try {
        result = await prisma.$queryRaw`
          SELECT id, name, level, tenant_id FROM rbac_roles WHERE id = ${parseInt(roleId)}
        `
      } catch (e) {
        // Fallback: tenant_id column might not exist
        result = await prisma.$queryRaw`
          SELECT id, name, level FROM rbac_roles WHERE id = ${parseInt(roleId)}
        `
      }
      
      if (!result || result.length === 0) {
        return null
      }
      
      const role = result[0]
      const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
      const level = toNum(role.level)
      
      // Roles with level >= 90 are considered global (Super Admin level and above)
      const isGlobalRole = level >= GLOBAL_ROLE_LEVELS.SUPER_ADMIN
      
      return {
        tenantId: role.tenant_id || null,
        isGlobalRole,
        roleName: role.name,
        level
      }
    } catch (error) {
      console.error('Error getting role tenant info:', error)
      return null
    }
  }

  /**
   * Validates tenant scoping for role permission operations.
   * Ensures users can only modify roles within their tenant (unless they're global admins).
   * 
   * Rules:
   * - Enterprise Admins (level 100): Can modify any role
   * - Super Admins (level 90): Can modify roles within their product scope
   * - Tenant Admins/Users: Can only modify roles in their own tenant
   * - No one can modify global roles except Enterprise/Super Admins
   * 
   * @param {number|string} assignerId - The user making the modification
   * @param {number|string} roleId - The role being modified
   * @param {Object} [assignerContext] - Optional context with userType, tenantId from JWT
   * @returns {Promise<{ valid: boolean, reason?: string }>}
   * @throws {{ status: number, code: string, message: string }} - On tenant violation
   */
  async validateTenantScope(assignerId, roleId, assignerContext = {}) {
    try {
      // Get assigner info
      const assignerInfo = await this.getUserTenantInfo(
        assignerId,
        assignerContext.userType || null
      )
      
      // Override with context if provided (from JWT)
      if (assignerContext.tenantId) {
        assignerInfo.tenantId = assignerContext.tenantId
      }
      
      // Get role info
      const roleInfo = await this.getRoleTenantInfo(roleId)
      
      if (!roleInfo) {
        throw {
          status: 404,
          code: 'ROLE_NOT_FOUND',
          message: `Role with ID ${roleId} not found`
        }
      }
      
      // Enterprise Admins can do anything
      if (assignerInfo.userType === 'ENTERPRISE_ADMIN' || assignerInfo.isGlobal && assignerContext.level >= GLOBAL_ROLE_LEVELS.ENTERPRISE_ADMIN) {
        console.log(`[rbacService] Enterprise Admin ${assignerId} modifying role ${roleId} - allowed`)
        return { valid: true }
      }
      
      // Super Admins can modify roles at their level or below
      if (assignerInfo.userType === 'SUPER_ADMIN' || assignerInfo.isGlobal) {
        // Super Admin cannot modify Enterprise Admin level roles
        if (roleInfo.level >= GLOBAL_ROLE_LEVELS.ENTERPRISE_ADMIN) {
          throw {
            status: 403,
            code: TENANT_ERRORS.GLOBAL_ROLE_MODIFICATION,
            message: 'Cannot modify Enterprise Admin level roles'
          }
        }
        console.log(`[rbacService] Super Admin ${assignerId} modifying role ${roleId} - allowed`)
        return { valid: true }
      }
      
      // For regular users, strict tenant scoping applies
      
      // Cannot modify global roles
      if (roleInfo.isGlobalRole) {
        throw {
          status: 403,
          code: TENANT_ERRORS.GLOBAL_ROLE_MODIFICATION,
          message: 'Cannot modify global/platform-level roles'
        }
      }
      
      // If role has tenant_id, it must match assigner's tenant
      if (roleInfo.tenantId && assignerInfo.tenantId) {
        if (roleInfo.tenantId !== assignerInfo.tenantId) {
          // Record cross-tenant violation metric
          rbacMetrics.recordCrossTenantViolation({
            userId: assignerId,
            userTenant: assignerInfo.tenantId,
            targetTenant: roleInfo.tenantId,
            roleId
          })
          
          throw {
            status: 403,
            code: TENANT_ERRORS.CROSS_TENANT_VIOLATION,
            message: 'Cannot modify roles belonging to a different tenant'
          }
        }
      }
      
      // If assigner has no tenant but role does, block
      if (roleInfo.tenantId && !assignerInfo.tenantId && !assignerInfo.isGlobal) {
        // Record as cross-tenant violation (user has no tenant)
        rbacMetrics.recordCrossTenantViolation({
          userId: assignerId,
          userTenant: 'none',
          targetTenant: roleInfo.tenantId,
          roleId
        })
        
        throw {
          status: 403,
          code: TENANT_ERRORS.TENANT_MISMATCH,
          message: 'User without tenant cannot modify tenant-scoped roles'
        }
      }
      
      // If role has no tenant_id (shared role in single-tenant setup), 
      // check that assigner has admin-level permissions
      const assignerLevel = await this.getUserMaxLevel(assignerId)
      if (assignerLevel < 80) {
        throw {
          status: 403,
          code: 'ROLE_LEVEL_VIOLATION',
          message: 'Insufficient role level to modify roles'
        }
      }
      
      console.log(`[rbacService] User ${assignerId} (tenant: ${assignerInfo.tenantId}) modifying role ${roleId} (tenant: ${roleInfo.tenantId}) - allowed`)
      return { valid: true }
      
    } catch (error) {
      // Re-throw custom errors as-is
      if (error.status && error.code) {
        throw error
      }
      console.error('Error validating tenant scope:', error)
      throw {
        status: 500,
        code: 'TENANT_SCOPE_CHECK_FAILED',
        message: 'Failed to validate tenant scope'
      }
    }
  }

  // =============== BULK PERMISSION ASSIGNMENT ===============
  /**
   * Assigns permissions to a role with privilege escalation protection.
   * Validates role level AND tenant scope before assignment and uses transaction for atomicity.
   * 
   * @param {number|string} roleId - The role ID to assign permissions to
   * @param {number|string} assignerId - The user ID of the person making the assignment
   * @param {number[]} permissionIds - Array of permission IDs to assign
   * @param {Object} [assignerContext] - Optional context from JWT (userType, tenantId, level)
   * @returns {Promise<{ success: boolean, assigned: number, roleId: number }>}
   * @throws {{ status: number, code: string, message: string }} - On validation or DB errors
   */
  async assignPermissionsToRole(roleId, assignerId, permissionIds, assignerContext = {}) {
    const toNum = (v) => (typeof v === 'bigint' ? Number(v) : Number(v || 0))
    
    try {
      // 1. Validate input
      if (!roleId || !assignerId) {
        throw {
          status: 400,
          code: 'INVALID_INPUT',
          message: 'roleId and assignerId are required'
        }
      }

      if (!Array.isArray(permissionIds)) {
        throw {
          status: 400,
          code: 'INVALID_INPUT',
          message: 'permissionIds must be an array'
        }
      }

      // 2. TENANT SCOPING - Validate assigner can modify this role (critical for multi-tenant)
      await this.validateTenantScope(assignerId, roleId, assignerContext)

      // Empty array is valid - clears all permissions
      if (permissionIds.length === 0) {
        // Just clear existing permissions in a transaction
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            DELETE FROM rbac_permissions WHERE role_id = ${parseInt(roleId)}
          `
        })

        // Publish invalidation event
        await this._publishPermissionInvalidation(roleId)

        // Log audit event even for clearing
        await this._logPermissionChangeAudit(assignerId, roleId, [], 'UNKNOWN', assignerContext)

        return { success: true, assigned: 0, roleId: parseInt(roleId) }
      }

      // 3. Verify all permission IDs exist and get their details
      const existingPermissions = await prisma.$queryRaw`
        SELECT 
          p.id,
          p.role_id,
          p.action_id,
          p.route_id,
          r.level as role_level
        FROM rbac_permissions p
        JOIN rbac_roles r ON p.role_id = r.id
        WHERE p.id = ANY(${permissionIds.map(id => parseInt(id))}::int[])
      `

      const foundIds = existingPermissions.map(p => toNum(p.id))
      const missingIds = permissionIds.filter(id => !foundIds.includes(parseInt(id)))

      if (missingIds.length > 0) {
        throw {
          status: 400,
          code: 'PERMISSIONS_NOT_FOUND',
          message: `Permission IDs not found: ${missingIds.join(', ')}`
        }
      }

      // 4. Get the maximum level required by the permissions being assigned
      const maxRequiredLevel = Math.max(...existingPermissions.map(p => toNum(p.role_level)))

      // 5. Validate role level (assigner must have >= level of permissions being assigned)
      await this.validateRoleLevel(assignerId, maxRequiredLevel)

      // 6. Get the target role info
      const targetRole = await prisma.$queryRaw`
        SELECT id, name, level FROM rbac_roles WHERE id = ${parseInt(roleId)}
      `

      if (!targetRole || targetRole.length === 0) {
        throw {
          status: 404,
          code: 'ROLE_NOT_FOUND',
          message: `Role with ID ${roleId} not found`
        }
      }

      // 7. Validate assigner can assign to this role level
      await this.validateRoleLevel(assignerId, toNum(targetRole[0].level))

      // 8. Build permission mappings from the source permissions
      const mappings = existingPermissions.map(p => ({
        role_id: parseInt(roleId),
        action_id: toNum(p.action_id),
        route_id: toNum(p.route_id),
        granted: true
      }))

      // 9. Execute in transaction: delete existing, insert new
      await prisma.$transaction(async (tx) => {
        // Delete existing permissions for this role
        await tx.$executeRaw`
          DELETE FROM rbac_permissions WHERE role_id = ${parseInt(roleId)}
        `

        // Insert new permissions
        for (const mapping of mappings) {
          await tx.$executeRaw`
            INSERT INTO rbac_permissions (role_id, action_id, route_id, granted, updated_at)
            VALUES (${mapping.role_id}, ${mapping.action_id}, ${mapping.route_id}, ${mapping.granted}, NOW())
            ON CONFLICT (role_id, action_id, route_id) 
            DO UPDATE SET granted = ${mapping.granted}, updated_at = NOW()
          `
        }
      })

      // 10. Publish invalidation event
      await this._publishPermissionInvalidation(roleId)

      // 11. Log audit event for security tracking with tenant context
      await this._logPermissionChangeAudit(assignerId, roleId, permissionIds, targetRole[0].name, assignerContext)

      return {
        success: true,
        assigned: mappings.length,
        roleId: parseInt(roleId)
      }

    } catch (error) {
      // Re-throw custom errors as-is
      if (error.status && error.code) {
        throw error
      }
      console.error('Error assigning permissions to role:', error)
      throw {
        status: 500,
        code: 'PERMISSION_ASSIGNMENT_FAILED',
        message: 'Failed to assign permissions to role'
      }
    }
  }

  /**
   * Publishes a permission invalidation event for cache clearing
   * @private
   * @param {number|string} roleId - The role ID that was updated
   */
  async _publishPermissionInvalidation(roleId) {
    try {
      // Try to use Redis pubsub if available
      const { invalidateRole } = require('../cache/services/permissionInvalidator')
      await invalidateRole(roleId)
      
      // Record cache invalidation metric
      rbacMetrics.recordCacheInvalidation()
      
      console.log(`[rbacService] Published permissions:invalidate for role ${roleId}`)
    } catch (error) {
      // Redis might not be available - log and continue
      console.warn('[rbacService] Could not publish permission invalidation:', error.message)
    }
  }

  /**
   * Logs an audit event for permission changes with tenant context
   * @private
   * @param {number|string} assignerId - The user who made the change
   * @param {number|string} roleId - The role that was updated
   * @param {number[]} permissionIds - The permission IDs that were assigned
   * @param {string} roleName - The name of the role
   * @param {Object} [assignerContext] - Optional context from JWT (userType, tenantId, level)
   */
  async _logPermissionChangeAudit(assignerId, roleId, permissionIds, roleName, assignerContext = {}) {
    try {
      // Record metric for permission change
      const roleLevel = assignerContext.level || 0
      rbacMetrics.recordPermissionChange({
        userId: assignerId,
        roleId,
        roleName,
        roleLevel,
        action: 'update',
        tenantId: assignerContext.tenantId || 'global'
      })
      
      await auditService.logSecurityEvent('ROLE_PERMISSIONS_UPDATED', {
        severity: 'INFO',
        userId: parseInt(assignerId),
        details: {
          roleId: parseInt(roleId),
          roleName,
          permissionIds,
          permissionCount: permissionIds.length,
          action: 'BULK_PERMISSION_ASSIGNMENT',
          timestamp: new Date().toISOString(),
          // Include tenant context for forensics
          tenantId: assignerContext.tenantId || null,
          userType: assignerContext.userType || 'USER',
          assignerLevel: assignerContext.level || null
        }
      })
      console.log(`[rbacService] Audit log created for role ${roleId} permission update by user ${assignerId} (tenant: ${assignerContext.tenantId || 'global'})`)
    } catch (error) {
      // Record audit failure metric
      rbacMetrics.recordAuditLogError('write_failed')
      // Don't fail the operation due to audit logging failure
      console.warn('[rbacService] Could not log audit event:', error.message)
    }
  }
}

module.exports = new RBACService()
