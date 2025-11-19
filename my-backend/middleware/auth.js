const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { isJtiRevoked } = require('../lib/tokenStore')

const { getPrisma } = require('../lib/prisma')
const prisma = getPrisma()

// ⚠️ SECURITY: Dev users only enabled in development mode
// In production, all users MUST come from database
const isDevelopment = process.env.NODE_ENV !== 'production'
const devUsers = isDevelopment ? [
  // Original dev credentials (DEVELOPMENT ONLY)
  { id: 0, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN' },
  { id: 1, email: 'manager@business.com', password: 'password', role: 'MANAGER' },
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN' },
  { id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF' },

  // Additional dev users to support "changeme" credentials used by the frontend/docs
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN' },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN' },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER' },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF' },

  // Demo credentials for testing
  { id: 300, email: 'demo_hub_incharge@bisman.demo', password: 'changeme', role: 'HUB_INCHARGE' },
  { id: 301, email: 'demo_admin@bisman.demo', password: 'changeme', role: 'ADMIN' },
  { id: 302, email: 'demo_manager@bisman.demo', password: 'changeme', role: 'MANAGER' },
  { id: 303, email: 'demo_super@bisman.demo', password: 'changeme', role: 'SUPER_ADMIN' },

  // Finance & Operations demo users
  { id: 201, email: 'it@bisman.local', password: 'changeme', role: 'IT_ADMIN' },
  { id: 202, email: 'cfo@bisman.local', password: 'changeme', role: 'CFO' },
  { id: 203, email: 'controller@bisman.local', password: 'changeme', role: 'FINANCE_CONTROLLER' },
  { id: 204, email: 'treasury@bisman.local', password: 'changeme', role: 'TREASURY' },
  { id: 205, email: 'accounts@bisman.local', password: 'changeme', role: 'ACCOUNTS' },
  { id: 206, email: 'ap@bisman.local', password: 'changeme', role: 'ACCOUNTS_PAYABLE' },
  { id: 207, email: 'banker@bisman.local', password: 'changeme', role: 'BANKER' },
  { id: 208, email: 'procurement@bisman.local', password: 'changeme', role: 'PROCUREMENT_OFFICER' },
  { id: 209, email: 'store@bisman.local', password: 'changeme', role: 'STORE_INCHARGE' },
  { id: 210, email: 'compliance@bisman.local', password: 'changeme', role: 'COMPLIANCE' },
  { id: 211, email: 'legal@bisman.local', password: 'changeme', role: 'LEGAL' },
] : [] // Empty array in production

async function authenticate(req, res, next) {
  console.log('[authenticate] Checking authentication...')
  console.log('[authenticate] Cookies:', req.cookies)
  console.log('[authenticate] Authorization header:', req.headers.authorization)
  
  const auth = req.headers.authorization || ''
  const parts = auth.split(' ')
  let token
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Fallback: check cookie - try access_token first, then token for backwards compatibility
    const cookieToken = (req.cookies && req.cookies.access_token) || (req.cookies && req.cookies.token)
    console.log('[authenticate] Cookie token found:', cookieToken ? 'YES' : 'NO')
    if (!cookieToken) return res.status(401).json({ error: 'missing or malformed token' })
    token = cookieToken
  } else {
    // if header provided, use it
    token = parts[1]
    console.log('[authenticate] Bearer token found')
  }
  
  // Reject null, undefined, or 'null' string tokens
  if (!token || token === 'null' || token === 'undefined') {
    console.log('[authenticate] ❌ Invalid token value:', token)
    return res.status(401).json({ error: 'missing or malformed token' })
  }
  try {
    // Enforce algorithm and issuer/audience where possible
    const verifyOptions = {}
    if (process.env.JWT_PRIVATE_KEY) {
      // If using RSA keys, expect RS256
      verifyOptions.algorithms = ['RS256']
    } else {
      verifyOptions.algorithms = ['HS512', 'HS256']
    }
    // audience/issuer checks can be added if configured
    console.log('[authenticate] Verifying JWT token...')
  const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', verifyOptions)
  console.log('[authenticate] JWT payload:', payload)
  // Normalize subject/id across token issuers
  const subjectId = payload.sub || payload.id || payload.userId || payload.uid
    
    // reject if jti is revoked
    if (payload && payload.jti && await isJtiRevoked(payload.jti)) {
      console.log('[authenticate] Token JTI is revoked:', payload.jti)
      return res.status(401).json({ error: 'revoked token' })
    }
  let user = null

    // Try Prisma first if database is available
    try {
      // Check userType from JWT to determine which table to query
      if (payload.userType === 'ENTERPRISE_ADMIN') {
        console.log('[authenticate] Looking up Enterprise Admin with id:', subjectId)
        user = await prisma.enterpriseAdmin.findUnique({ 
          where: { id: subjectId },
          select: {
            id: true,
            email: true,
            name: true,
            profile_pic_url: true,
            is_active: true
          }
        })
        if (user) {
          user.role = 'ENTERPRISE_ADMIN'
          user.roleName = 'ENTERPRISE_ADMIN'
          user.productType = 'ALL'
          user.userType = 'ENTERPRISE_ADMIN'
        }
      } else if (payload.userType === 'SUPER_ADMIN') {
        console.log('[authenticate] Looking up Super Admin with id:', subjectId)
        user = await prisma.superAdmin.findUnique({ 
          where: { id: subjectId },
          select: {
            id: true,
            email: true,
            name: true,
            productType: true,
            profile_pic_url: true,
            is_active: true
          }
        })
        if (user) {
          const moduleAssignments = await prisma.moduleAssignment.findMany({
            where: { super_admin_id: user.id },
            include: { module: true }
          })
          user.assignedModules = moduleAssignments.map(ma => ma.module.module_name)
          user.role = 'SUPER_ADMIN'
          user.roleName = 'SUPER_ADMIN'
          user.userType = 'SUPER_ADMIN'
        }
      } else {
        // Regular user
        console.log('[authenticate] Looking up User with id:', subjectId)
        if (subjectId != null) {
          user = await prisma.user.findUnique({ where: { id: subjectId } })
        }
        if (user) {
          delete user.password
          user.roleName = user.role || null
        }
      }
      
      if (user) {
        req.user = user
      }
    } catch (dbError) {
      console.log('Database not available, using development user lookup')
      user = null
    }

    // Fallback to development users if database fails (ONLY IN DEV MODE)
    if (!user && isDevelopment && devUsers.length > 0) {
      console.log('[authenticate] Using dev user lookup for subjectId:', subjectId)
      const devUser = devUsers.find(u => u.id === subjectId || (payload.email && u.email === payload.email))
      if (!devUser) {
        console.log('[authenticate] Dev user not found for id/email:', subjectId, payload.email)
        return res.status(401).json({ error: 'invalid token user' })
      }
      console.log('[authenticate] ⚠️  DEV MODE: Using development user:', devUser.email)
      req.user = { ...devUser }
      delete req.user.password
      req.user.roleName = devUser.role
    } else if (!user) {
      // Production: No fallback, user must exist in database
      console.log('[authenticate] ❌ User not found in database and dev users disabled')
      return res.status(401).json({ error: 'user not found' })
    }

    console.log('[authenticate] Authentication successful, user:', req.user.email || req.user.username)
    next()
  } catch (err) {
    console.error('[authenticate] JWT auth error:', err.message)
    return res.status(401).json({ error: 'invalid or expired token' })
  }
}

function requireRole(role) {
  return function (req, res, next) {
    console.log('[requireRole] Checking role authorization...')
    console.log('[requireRole] Required role(s):', role)
    console.log('[requireRole] User:', req.user)
    
    if (!req.user) {
      console.log('[requireRole] ❌ User not authenticated')
      return res.status(401).json({ error: 'not authenticated' })
    }
    
    // Support both object-style role and string role
    const actual = req.user.roleName || req.user.role || (req.user.role && req.user.role.name)
    console.log('[requireRole] User actual role:', actual)
    
    // Support both single role and array of roles
    const allowedRoles = Array.isArray(role) ? role : [role]
    console.log('[requireRole] Allowed roles:', allowedRoles)
    
    if (!allowedRoles.includes(actual)) {
      console.log('[requireRole] ❌ Access forbidden - User role', actual, 'not in allowed roles:', allowedRoles)
      return res.status(403).json({ error: 'forbidden', message: `Role ${actual} not authorized. Required: ${allowedRoles.join(', ')}` })
    }
    
    console.log('[requireRole] ✅ Role authorization passed')
    next()
  }
}

module.exports = { 
  authenticate, 
  requireRole,
  authMiddleware: authenticate // Alias for TypeScript routes
}
