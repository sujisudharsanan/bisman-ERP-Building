// Permission middleware for RBAC
const rbacService = require('../services/rbacService')

// Middleware to check specific permissions
function checkPermission(routePath, action) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      const hasPermission = await rbacService.checkUserPermission(
        req.user.id,
        routePath,
        action
      )

      if (!hasPermission) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: { route: routePath, action: action }
        })
      }

      next()
    } catch (error) {
      console.error('Permission check error:', error)
      res.status(500).json({ error: 'Permission check failed' })
    }
  }
}

// Middleware to check if user has admin role
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  if (req.user.roleName !== 'ADMIN' && req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  next()
}

// Middleware to attach user permissions to request
async function attachPermissions(req, res, next) {
  try {
    if (req.user) {
      // Get all user permissions
      const routes = await rbacService.getAllRoutes()
      const actions = await rbacService.getAllActions()
      const permissions = {}

      for (const route of routes) {
        permissions[route.path] = {}
        for (const action of actions) {
          const hasPermission = await rbacService.checkUserPermission(
            req.user.id,
            route.path,
            action.name
          )
          permissions[route.path][action.name] = hasPermission
        }
      }

      req.userPermissions = permissions
    }
    next()
  } catch (error) {
    console.error('Attach permissions error:', error)
    next() // Continue without permissions if there's an error
  }
}

module.exports = {
  checkPermission,
  requireAdmin,
  attachPermissions
}
