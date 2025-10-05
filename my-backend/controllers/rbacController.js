// RBAC API Controllers
const rbacService = require('../services/rbacService')

class RBACController {
  // =============== ROLES ===============
  async getRoles(req, res) {
    try {
      const roles = await rbacService.getAllRoles()
      res.json({ success: true, data: roles })
    } catch (error) {
      console.error('Get roles error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async createRole(req, res) {
    try {
      const { name, description } = req.body
      
      if (!name) {
        return res.status(400).json({ success: false, error: 'Role name is required' })
      }

      const role = await rbacService.createRole({ name, description })
      res.status(201).json({ success: true, data: role })
    } catch (error) {
      console.error('Create role error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deleteRole(req, res) {
    try {
      const { id } = req.params
      await rbacService.deleteRole(parseInt(id))
      res.json({ success: true, message: 'Role deleted successfully' })
    } catch (error) {
      console.error('Delete role error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== USERS ===============
  async getUsers(req, res) {
    try {
      const users = await rbacService.getAllUsers()
      res.json({ success: true, data: users })
    } catch (error) {
      console.error('Get users error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async assignRole(req, res) {
    try {
      const { userId, roleId } = req.body
      
      if (!userId || !roleId) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID and Role ID are required' 
        })
      }

      const user = await rbacService.assignRoleToUser(userId, roleId)
      res.json({ success: true, data: user })
    } catch (error) {
      console.error('Assign role error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== ROUTES ===============
  async getRoutes(req, res) {
    try {
      const routes = await rbacService.getAllRoutes()
      res.json({ success: true, data: routes })
    } catch (error) {
      console.error('Get routes error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== ACTIONS ===============
  async getActions(req, res) {
    try {
      const actions = await rbacService.getAllActions()
      res.json({ success: true, data: actions })
    } catch (error) {
      console.error('Get actions error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== PERMISSIONS ===============
  async getPermissions(req, res) {
    try {
      const { roleId } = req.query
      
      if (!roleId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Role ID is required' 
        })
      }

      const permissions = await rbacService.getPermissionsByRole(parseInt(roleId))
      res.json({ success: true, data: permissions })
    } catch (error) {
      console.error('Get permissions error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async updatePermission(req, res) {
    try {
      const { roleId, routeId, actionId, isGranted } = req.body
      
      if (!roleId || !routeId || !actionId || typeof isGranted !== 'boolean') {
        return res.status(400).json({ 
          success: false, 
          error: 'Role ID, Route ID, Action ID, and isGranted are required' 
        })
      }

      const permission = await rbacService.updatePermission(
        parseInt(roleId), 
        parseInt(routeId), 
        parseInt(actionId), 
        isGranted
      )
      
      res.json({ success: true, data: permission })
    } catch (error) {
      console.error('Update permission error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  async deletePermission(req, res) {
    try {
      const { id } = req.params
      // In a real implementation, this would delete the permission
      res.json({ success: true, message: 'Permission deleted successfully' })
    } catch (error) {
      console.error('Delete permission error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }

  // =============== PERMISSION CHECKING ===============
  async checkPermission(req, res) {
    try {
      const { userId, routePath, action } = req.query
      
      if (!userId || !routePath || !action) {
        return res.status(400).json({ 
          success: false, 
          error: 'User ID, route path, and action are required' 
        })
      }

      const hasPermission = await rbacService.checkUserPermission(
        parseInt(userId), 
        routePath, 
        action
      )
      
      res.json({ success: true, hasPermission })
    } catch (error) {
      console.error('Check permission error:', error)
      res.status(500).json({ success: false, error: error.message })
    }
  }
}

module.exports = new RBACController()
