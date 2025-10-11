// Super Admin Service - Database control operations
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

class SuperAdminService {
  // =============== PRIVILEGES ===============
  async getAllPrivileges({ limit = 100, offset = 0, module = undefined, search = '' } = {}) {
    try {
      const where = {
        AND: [
          module ? { module } : {},
          search ? { OR: [ { name: { contains: search, mode: 'insensitive' } }, { description: { contains: search, mode: 'insensitive' } } ] } : {}
        ]
      }
      const [items, total] = await Promise.all([
        prisma.feature.findMany({
          take: Number(limit),
          skip: Number(offset),
          where,
          orderBy: [{ module: 'asc' }, { name: 'asc' }],
          select: { id: true, name: true, module: true, description: true, is_active: true }
        }),
        prisma.feature.count({ where })
      ])
      return { items: items.map(i => ({ id: i.id, name: i.name, module: i.module, description: i.description, is_active: i.is_active })), total }
    } catch (error) {
      console.error('Error fetching privileges:', error)
      return { items: [], total: 0 }
    }
  }

  async getRolePrivileges(roleId, { limit = 200, offset = 0 } = {}) {
    try {
      const [items, total] = await Promise.all([
        prisma.rolePrivilege.findMany({
          take: Number(limit),
          skip: Number(offset),
          where: { role_id: Number(roleId) },
          orderBy: [{ updated_at: 'desc' }],
          select: {
            id: true,
            can_view: true, can_create: true, can_edit: true, can_delete: true, can_hide: true,
            feature: { select: { id: true, name: true, module: true } }
          }
        }),
        prisma.rolePrivilege.count({ where: { role_id: Number(roleId) } })
      ])
      return {
        items: items.map(rp => ({
          id: rp.id,
          feature_id: rp.feature.id,
          feature_name: rp.feature.name,
          module: rp.feature.module,
          can_view: rp.can_view, can_create: rp.can_create, can_edit: rp.can_edit, can_delete: rp.can_delete, can_hide: rp.can_hide
        })),
        total
      }
    } catch (error) {
      console.error('Error fetching role privileges:', error)
      return { items: [], total: 0 }
    }
  }

  async updateRolePrivileges(roleId, updates = [], adminUserId, adminUsername) {
    // updates: [{ feature_id, can_view, can_create, can_edit, can_delete, can_hide }]
    const toUpsert = updates.map(u => ({
      where: { uk_role_privileges_role_feature: { role_id: Number(roleId), feature_id: u.feature_id } },
      update: {
        can_view: !!u.can_view, can_create: !!u.can_create, can_edit: !!u.can_edit, can_delete: !!u.can_delete, can_hide: !!u.can_hide
      },
      create: {
        role_id: Number(roleId), feature_id: u.feature_id,
        can_view: !!u.can_view, can_create: !!u.can_create, can_edit: !!u.can_edit, can_delete: !!u.can_delete, can_hide: !!u.can_hide
      }
    }))

    const tx = []
    for (const up of toUpsert) {
      tx.push(prisma.rolePrivilege.upsert(up))
    }
    try {
      const results = await prisma.$transaction(tx)
      // best-effort audit
      this.logActivity(adminUserId, adminUsername, 'role_priv_update', 'role', roleId, { count: results.length }).catch(() => {})
      return { updated: results.length, upserted: results.length, deleted: 0 }
    } catch (error) {
      console.error('Error updating role privileges:', error)
      throw new Error('Failed to update role privileges')
    }
  }

  async getUsersByRole(roleId, { limit = 50, offset = 0 } = {}) {
    try {
      const [items, total] = await Promise.all([
        prisma.user.findMany({
          take: Number(limit),
          skip: Number(offset),
          where: { OR: [ { role_id: Number(roleId) }, { assignedRole: { id: Number(roleId) } } ] },
          select: { id: true, username: true, email: true, role: true, role_id: true, createdAt: true },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where: { OR: [ { role_id: Number(roleId) }, { assignedRole: { id: Number(roleId) } } ] } })
      ])
      return { items, total }
    } catch (error) {
      console.error('Error fetching users by role:', error)
      return { items: [], total: 0 }
    }
  }

  // =============== DASHBOARD SUMMARY ===============
  async getSummary() {
    const os = require('os')
    const safeNumber = (v, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
    try {
      // Counts
      const [userCount, featureCount, rolePrivCount, auditCount] = await Promise.all([
        prisma.user.count().catch(() => 0),
        prisma.feature.count().catch(() => 0),
        prisma.rolePrivilege.count().catch(() => 0),
        prisma.auditLog.count().catch(() => 0),
      ])

      // Orders count (optional)
      let orderCount = 0
      try { orderCount = await prisma.order.count() } catch { orderCount = 0 }

      // Failed logins (from audit logs tagged as failed_login)
      let failedLogins = 0
      try {
        const r = await prisma.auditLog.count({ where: { action: { in: ['failed_login', 'login_failed'] } } })
        failedLogins = r
      } catch {}

      // Active users (last 24h)
      let activeUsers = 0
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
        const r = await prisma.auditLog.findMany({
          where: { action: { in: ['login', 'login_success'] }, created_at: { gte: since } },
          distinct: ['user_id'],
          select: { user_id: true },
        })
        activeUsers = r.filter(x => x.user_id != null).length
      } catch {}

      // DB size
      let dbSizeBytes = 0
      try {
        const rows = await prisma.$queryRaw`SELECT pg_database_size(current_database()) AS size` 
        const v = Array.isArray(rows) && rows[0]?.size
        dbSizeBytes = safeNumber(v, 0)
      } catch {}

      const memTotal = os.totalmem()
      const memFree = os.freemem()
      const cpuLoad = os.loadavg()[0] || 0

      return {
        entities: {
          users: userCount,
          features: featureCount,
          role_privileges: rolePrivCount,
          orders: orderCount,
          activity_logs: auditCount,
        },
        security: {
          failed_logins: failedLogins,
          active_users_24h: activeUsers,
        },
        system: {
          db_size_bytes: dbSizeBytes,
          memory: {
            total_bytes: memTotal,
            free_bytes: memFree,
            used_bytes: memTotal - memFree,
          },
          cpu: {
            load1: cpuLoad,
            cores: os.cpus()?.length || 1,
          },
          uptime_sec: Math.floor(os.uptime()),
        },
        generated_at: new Date().toISOString(),
      }
    } catch (error) {
      console.error('Error building summary:', error)
      return {
        entities: { users: 0, features: 0, role_privileges: 0, orders: 0, activity_logs: 0 },
        security: { failed_logins: 0, active_users_24h: 0 },
        system: { db_size_bytes: 0, memory: { total_bytes: 0, free_bytes: 0, used_bytes: 0 }, cpu: { load1: 0, cores: 1 }, uptime_sec: 0 },
        generated_at: new Date().toISOString(),
      }
    }
  }

  // =============== ORDERS CRUD (optional table) ===============
  async listOrders({ status, page = 1, limit = 20, search = '' } = {}) {
    const skip = (Number(page) - 1) * Number(limit)
    const where = {}
    if (status) Object.assign(where, { status })
    if (search) Object.assign(where, { OR: [{ id: { equals: Number(search) || undefined } }, { customer_name: { contains: search, mode: 'insensitive' } }] })
    try {
      const [items, total] = await Promise.all([
        prisma.order.findMany({ take: Number(limit), skip, where, orderBy: { created_at: 'desc' } }),
        prisma.order.count({ where })
      ])
      return { items, total }
    } catch (e) {
      // Fallback: empty list when table not present
      return { items: [], total: 0 }
    }
  }
  async getOrderById(id) {
    try { return await prisma.order.findUnique({ where: { id: Number(id) } }) } catch { return null }
  }
  async createOrder(data, adminUserId, adminUsername) {
    try {
      const created = await prisma.order.create({ data })
      this.logActivity(adminUserId, adminUsername, 'order_create', 'order', created.id, { new: created }).catch(() => {})
      return created
    } catch (e) { throw new Error('Order create failed') }
  }
  async updateOrder(id, data, adminUserId, adminUsername) {
    try {
      const updated = await prisma.order.update({ where: { id: Number(id) }, data })
      this.logActivity(adminUserId, adminUsername, 'order_update', 'order', id, { new: updated }).catch(() => {})
      return updated
    } catch (e) { throw new Error('Order update failed') }
  }
  async deleteOrder(id, adminUserId, adminUsername) {
    try {
      await prisma.order.delete({ where: { id: Number(id) } })
      this.logActivity(adminUserId, adminUsername, 'order_delete', 'order', id, {}).catch(() => {})
      return { success: true }
    } catch (e) { throw new Error('Order delete failed') }
  }

  // =============== ACTIVITY LOG with filters ===============
  async getActivityLogs({ limit = 50, userId, from, to } = {}) {
    try {
      const where = {}
      if (userId) Object.assign(where, { user_id: Number(userId) })
      if (from || to) Object.assign(where, { created_at: { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined } })
      const logs = await prisma.auditLog.findMany({
        take: Number(limit),
        where,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { username: true } } }
      })
      return logs.map(l => ({
        id: String(l.id), user_id: l.user_id ?? null, username: l.user?.username ?? null, action: l.action,
        entity_type: l.entity_type ?? null, entity_id: l.entity_id ?? null, details: l.new_values ?? l.old_values ?? null,
        ip_address: l.ip_address ?? null, user_agent: l.user_agent ?? null,
        created_at: (l.created_at instanceof Date ? l.created_at.toISOString() : String(l.created_at))
      }))
    } catch (e) {
      return []
    }
  }

  // =============== DATABASE BROWSER (read-only metadata) ===============
  async listTables() {
    try {
      const rows = await prisma.$queryRaw`
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema NOT IN ('pg_catalog','information_schema')
        ORDER BY table_schema, table_name
      `
      return rows.map(r => ({ schema: r.table_schema, name: r.table_name }))
    } catch (e) { return [] }
  }
  async listColumns(tableSchema, tableName) {
    try {
      const rows = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = ${tableSchema} AND table_name = ${tableName}
        ORDER BY ordinal_position
      `
      return rows
    } catch (e) { return [] }
  }
  async getTableRows(tableSchema, tableName, { page = 1, limit = 50 } = {}) {
    const offset = (Number(page) - 1) * Number(limit)
    try {
      const rows = await prisma.$queryRawUnsafe(`SELECT * FROM "${tableSchema}"."${tableName}" OFFSET ${offset} LIMIT ${Number(limit)}`)
      return { rows, page: Number(page), limit: Number(limit) }
    } catch (e) { return { rows: [], page: Number(page), limit: Number(limit) } }
  }

  // =============== SECURITY MONITOR ===============
  async logSecurityEvent({ type, message, ip, userAgent, userId = null }) {
    // log into audit_logs as fallback
    try {
      await prisma.auditLog.create({
        data: {
          user_id: userId, action: type || 'security', entity_type: 'security_event', entity_id: message || '',
          new_values: { message, ip, userAgent },
        }
      })
      return { success: true }
    } catch (e) { return { success: false } }
  }
  async getSecurityEvents({ limit = 100 } = {}) {
    try {
      const rows = await prisma.auditLog.findMany({
        take: Number(limit),
        where: { entity_type: 'security_event' },
        orderBy: { created_at: 'desc' }
      })
      return rows
    } catch (e) { return [] }
  }

  // =============== SYSTEM SETTINGS ===============
  async listSettings() {
    try {
      const settings = await prisma.systemSetting.findMany()
      return settings.map(s => ({ key: s.key, value: s.value, is_secret: s.is_secret }))
    } catch (e) {
      // Fallback: env snapshot
      const mask = (k, v) => (k.includes('SECRET') || k.includes('KEY') || k.includes('TOKEN') ? '***' : v)
      return Object.entries(process.env).slice(0, 50).map(([k, v]) => ({ key: k, value: mask(k, v), is_env: true }))
    }
  }
  async getSetting(key) {
    try { return await prisma.systemSetting.findUnique({ where: { key } }) } catch { return { key, value: process.env[key] || null, is_env: true } }
  }
  async upsertSetting({ key, value, is_secret = false }, adminUserId, adminUsername) {
    try {
      const saved = await prisma.systemSetting.upsert({
        where: { key },
        create: { key, value, is_secret },
        update: { value, is_secret },
      })
      this.logActivity(adminUserId, adminUsername, 'setting_upsert', 'system_setting', key, { new: { is_secret } }).catch(() => {})
      return saved
    } catch (e) { throw new Error('Failed to save setting') }
  }

  // =============== ROLES ===============
  async getAllRoles() {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          is_active: true,
          _count: { select: { users: true } }
        },
        orderBy: { name: 'asc' }
      })

      return roles.map(r => ({
        id: String(r.id),
        name: r.name,
        description: r.description || null,
        is_active: r.is_active,
        user_count: r._count?.users ?? 0
      }))
    } catch (error) {
      console.error('Error getting roles:', error)
      // Fallback: derive roles from users table distinct values
      try {
        const rows = await prisma.$queryRaw`SELECT role as name, COUNT(*)::int as user_count FROM users GROUP BY role ORDER BY role ASC`
        return rows.map((row, idx) => ({ id: String(idx + 1), name: row.name, description: null, is_active: true, user_count: Number(row.user_count) }))
      } catch (e2) {
        return []
      }
    }
  }
  // =============== ACTIVITY LOGGING ===============
  async logActivity(userId, username, action, entityType, entityId, details) {
    try {
      // Try Prisma AuditLog first
      try {
        await prisma.auditLog.create({
          data: {
            user_id: userId ?? null,
            action: action || 'unknown',
            entity_type: entityType || 'system',
            entity_id: entityId ? String(entityId) : '',
            old_values: details && details.old ? details.old : null,
            new_values: details && details.new ? details.new : (details && !details.old ? details : null),
            ip_address: details && details.ip ? details.ip : null,
            user_agent: details && details.agent ? details.agent : null,
          }
        })
        return { success: true }
      } catch (e1) {
        // Fallback to recent_activity raw insert if available
        await prisma.$executeRaw`
          INSERT INTO recent_activity (user_id, action, entity, entity_id, details, ip_address, user_agent)
          VALUES (${userId || null}, ${action || 'unknown'}, ${entityType || 'system'}, ${entityId ? String(entityId) : ''}, ${details || {}}, ${details && details.ip ? details.ip : null}, ${details && details.agent ? details.agent : null})
        `
        return { success: true }
      }
    } catch (error) {
      console.error('Error logging activity:', error)
      return { success: false }
    }
  }

  // Get recent activity
  async getRecentActivity(limit = 20) {
    // Prefer Prisma AuditLog model; fallback to recent_activity if present; otherwise empty
    try {
      // Try using Prisma model (audit_logs)
      const logs = await prisma.auditLog.findMany({
        take: Number(limit) || 20,
        orderBy: { created_at: 'desc' },
        include: { user: { select: { username: true } } }
      })

      return logs.map(l => ({
        id: String(l.id),
        user_id: l.user_id ?? null,
        username: l.user?.username ?? null,
        action: l.action,
        entity_type: l.entity_type ?? null,
        entity_id: l.entity_id ?? null,
        details: l.new_values ?? l.old_values ?? null,
        ip_address: l.ip_address ?? null,
        user_agent: l.user_agent ?? null,
        created_at: (l.created_at instanceof Date ? l.created_at.toISOString() : String(l.created_at))
      }))
    } catch (e1) {
      console.warn('AuditLog fetch failed, trying recent_activity table:', e1 && e1.message ? e1.message : e1)
      try {
        // Fallback to raw query from recent_activity if migration exists
        const rows = await prisma.$queryRaw`
          SELECT id, user_id, action, entity as entity_type, entity_id, details, ip_address, user_agent, created_at
          FROM recent_activity
          ORDER BY created_at DESC
          LIMIT ${Number(limit) || 20}
        `

        return rows.map(row => ({
          id: String(row.id),
          user_id: row.user_id ?? null,
          username: row.username ?? null,
          action: row.action,
          entity_type: row.entity_type ?? null,
          entity_id: row.entity_id ?? null,
          details: row.details ?? null,
          ip_address: row.ip_address ?? null,
          user_agent: row.user_agent ?? null,
          created_at: (row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at))
        }))
      } catch (e2) {
        console.error('recent_activity fetch failed:', e2 && e2.message ? e2.message : e2)
        return []
      }
    }
  }

  // =============== USER MANAGEMENT ===============
  async getAllUsers(search = '', limit = 50, offset = 0, roleFilter = null) {
    try {
      const where = {}
      if (roleFilter) {
        const maybeId = Number(roleFilter)
        if (!Number.isNaN(maybeId)) {
          Object.assign(where, { OR: [ { role_id: maybeId }, { role: { equals: roleFilter } } ] })
        } else {
          Object.assign(where, { role: { equals: roleFilter } })
        }
      }

      const users = await prisma.user.findMany({
        take: limit,
        skip: offset,
        where,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          role_id: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' }
      })

      const total = await prisma.user.count({ where })
      return { users, total, count: users.length }
    } catch (error) {
      console.warn('Users DB fetch failed, returning fallback:', error && error.message ? error.message : error)
      // Fallback for development when DB is not reachable
      const fallback = [
        { id: 1, username: 'superadmin', email: 'super@bisman.local', role: 'SUPER_ADMIN', role_id: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, username: 'admin', email: 'admin@business.com', role: 'ADMIN', role_id: null, createdAt: new Date(), updatedAt: new Date() },
        { id: 3, username: 'manager', email: 'manager@business.com', role: 'MANAGER', role_id: null, createdAt: new Date(), updatedAt: new Date() },
      ]
      return { users: fallback, total: fallback.length, count: fallback.length }
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

      // Log activity (best-effort)
      this.logActivity(adminUserId, adminUsername, 'user_create', 'user', newUser.id, {
        new: { id: newUser.id, email: newUser.email, role: newUser.role }
      }).catch(() => {})

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

      // Log activity (best-effort)
      this.logActivity(adminUserId, adminUsername, 'user_update', 'user', userId, {
        new: { email: updatedUser.email, role: updatedUser.role }
      }).catch(() => {})

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

      // Log activity (best-effort)
      this.logActivity(adminUserId, adminUsername, 'user_delete', 'user', userId, {
        old: { email: user.email, username: user.username }
      }).catch(() => {})

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
