const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Authenticate token middleware (similar to existing auth)
async function authenticateToken(req, res, next) {
  const auth = req.headers.authorization || ''
  const parts = auth.split(' ')
  let token

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Fallback: check cookie (prefer access_token, then legacy token)
    const cookieToken = (req.cookies && (req.cookies.access_token || req.cookies.token))
    if (!cookieToken) {
      return res.status(401).json({ success: false, error: 'Missing or malformed token' })
    }
    token = cookieToken
  } else {
    token = parts[1]
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    const user = await prisma.user.findUnique({ where: { id: payload.sub } })
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid token user' })
    }

    // Remove sensitive fields
    delete user.password
    req.user = user
    req.user.roleName = user.role || null
    next()
  } catch (err) {
    console.error('JWT auth error:', err.message)
    return res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

// Check if user has specific permission
function requirePermission(permission) {
  return async function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    try {
      // Check if user has the required permission through RBAC
      const userPermissions = await prisma.$queryRaw`
        SELECT DISTINCT a.name as action_name
        FROM rbac_user_roles ur
        JOIN rbac_permissions p ON ur.role_id = p.role_id
        JOIN rbac_actions a ON p.action_id = a.id
        WHERE ur.user_id = ${req.user.id} AND p.granted = true
      `

      const hasPermission = userPermissions.some(perm => perm.action_name === permission)

      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: `Forbidden: Missing required permission '${permission}'` 
        })
      }

      next()
    } catch (error) {
      console.error('Permission check error:', error)
      return res.status(500).json({ 
        success: false, 
        error: 'Internal server error during permission check' 
      })
    }
  }
}

// Check if user has specific role
function requireRole(role) {
  return function(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Not authenticated' })
    }

    const userRole = req.user.roleName || req.user.role
    const allowedRoles = Array.isArray(role) ? role : [role]

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Forbidden: Required role not met. Need: ${allowedRoles.join(' or ')}` 
      })
    }

    next()
  }
}

// Check if user has admin privileges (legacy support)
function requireAdmin(req, res, next) {
  return requireRole(['ADMIN', 'SUPER_ADMIN'])(req, res, next)
}

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  requireAdmin
}
