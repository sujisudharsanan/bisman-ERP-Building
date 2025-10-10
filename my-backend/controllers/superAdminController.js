// Super Admin Controller - API endpoints for full database control
const superAdminService = require('../services/superAdminService')

class SuperAdminController {
  // =============== SCHEMA LIST ===============
  async getTables(req, res) {
    try {
      const tables = await superAdminService.listTables()
      res.json({ success: true, data: tables })
    } catch (error) {
      console.error('Error listing tables:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
  // =============== ACTIVITY TRACKING ===============
  async getRecentActivity(req, res) {
    try {
      const { limit = 20 } = req.query
      const activities = await superAdminService.getRecentActivity(parseInt(limit))
      res.json({ success: true, data: activities })
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== USER MANAGEMENT ===============
  async getUsers(req, res) {
    try {
      const { search = '', page = 1, limit = 50 } = req.query
      const offset = (parseInt(page) - 1) * parseInt(limit)
      
      const users = await superAdminService.getAllUsers(search, parseInt(limit), offset)
      res.json({ success: true, data: users, pagination: { page: parseInt(page), limit: parseInt(limit) } })
    } catch (error) {
      console.error('Error fetching users:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async createUser(req, res) {
    try {
      const userData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const newUser = await superAdminService.createUser(userData, adminUserId, adminUsername)
      res.status(201).json({ success: true, data: newUser })
    } catch (error) {
      console.error('Error creating user:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async updateUser(req, res) {
    try {
      const { userId } = req.params
      const userData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.updateUser(parseInt(userId), userData, adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error updating user:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteUser(req, res) {
    try {
      const { userId } = req.params
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.deleteUser(parseInt(userId), adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error deleting user:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== ROLE MANAGEMENT ===============
  async createRole(req, res) {
    try {
      const roleData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const newRole = await superAdminService.createRole(roleData, adminUserId, adminUsername)
      res.status(201).json({ success: true, data: newRole })
    } catch (error) {
      console.error('Error creating role:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async updateRole(req, res) {
    try {
      const { roleId } = req.params
      const roleData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.updateRole(parseInt(roleId), roleData, adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error updating role:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteRole(req, res) {
    try {
      const { roleId } = req.params
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.deleteRole(parseInt(roleId), adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error deleting role:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== ROUTE MANAGEMENT ===============
  async createRoute(req, res) {
    try {
      const routeData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const newRoute = await superAdminService.createRoute(routeData, adminUserId, adminUsername)
      res.status(201).json({ success: true, data: newRoute })
    } catch (error) {
      console.error('Error creating route:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async updateRoute(req, res) {
    try {
      const { routeId } = req.params
      const routeData = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.updateRoute(parseInt(routeId), routeData, adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error updating route:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteRoute(req, res) {
    try {
      const { routeId } = req.params
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.deleteRoute(parseInt(routeId), adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error deleting route:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== PERMISSION MANAGEMENT ===============
  async updatePermissionsBatch(req, res) {
    try {
      const { updates } = req.body
      const adminUserId = req.user.id
      const adminUsername = req.user.username
      
      const result = await superAdminService.updatePermissionBatch(updates, adminUserId, adminUsername)
      res.json({ success: true, data: result })
    } catch (error) {
      console.error('Error updating permissions batch:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== DIRECT TABLE ACCESS ===============
  async getTableData(req, res) {
    try {
      const { tableName } = req.params
      const { search = '', page = 1, limit = 50 } = req.query
      const offset = (parseInt(page) - 1) * parseInt(limit)
      
      const data = await superAdminService.getTableData(tableName, search, parseInt(limit), offset)
      res.json({ 
        success: true, 
        data, 
        pagination: { page: parseInt(page), limit: parseInt(limit) },
        table: tableName
      })
    } catch (error) {
      console.error('Error fetching table data:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== DASHBOARD STATS ===============
  async getDashboardStats(req, res) {
    try {
      const stats = await superAdminService.getDashboardStats()
      res.json({ success: true, data: stats })
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== SYSTEM INFO ===============
  async getSystemInfo(req, res) {
    try {
      const info = {
        version: '1.0.0',
        database: 'PostgreSQL',
        tables: [
          'users', 'rbac_roles', 'rbac_routes', 'rbac_actions',
          'rbac_permissions', 'rbac_user_roles', 'recent_activity'
        ],
        features: [
          'User Management', 'Role Management', 'Route Management',
          'Permission Matrix', 'Activity Tracking', 'Direct Table Access'
        ],
        security: {
          admin_only: true,
          audit_logging: true,
          permission_based: true
        }
      }
      res.json({ success: true, data: info })
    } catch (error) {
      console.error('Error fetching system info:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = new SuperAdminController()
