const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')
const { isJtiRevoked } = require('../lib/tokenStore')

const prisma = new PrismaClient()

// Development users for testing (keep in sync with app.js devUsers)
const devUsers = [
  // Original dev credentials
  { id: 0, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN' },
  { id: 1, email: 'manager@business.com', password: 'password', role: 'MANAGER' },
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN' },
  { id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF' },

  // Additional dev users to support "changeme" credentials used by the frontend/docs
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN' },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN' },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER' },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF' },
]

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
    
    // reject if jti is revoked
    if (payload && payload.jti && await isJtiRevoked(payload.jti)) {
      console.log('[authenticate] Token JTI is revoked:', payload.jti)
      return res.status(401).json({ error: 'revoked token' })
    }
    let user = null

    // Try Prisma first if database is available
    try {
      user = await prisma.user.findUnique({ where: { id: payload.sub } })
      if (user) {
        delete user.password
        req.user = user
        req.user.roleName = user.role || null
      }
    } catch (dbError) {
      console.log('Database not available, using development user lookup')
      user = null
    }

    // Fallback to development users if database fails
    if (!user) {
      console.log('[authenticate] Using dev user lookup for sub:', payload.sub)
      const devUser = devUsers.find(u => u.id === payload.sub)
      if (!devUser) {
        console.log('[authenticate] Dev user not found for sub:', payload.sub)
        return res.status(401).json({ error: 'invalid token user' })
      }
      console.log('[authenticate] Dev user found:', devUser.email)
      req.user = { ...devUser }
      delete req.user.password
      req.user.roleName = devUser.role
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
    if (!req.user) return res.status(401).json({ error: 'not authenticated' })
    const actual = req.user.roleName || (req.user.role && req.user.role.name)
    
    // Support both single role and array of roles
    const allowedRoles = Array.isArray(role) ? role : [role]
    
    if (!allowedRoles.includes(actual)) {
      return res.status(403).json({ error: 'forbidden' })
    }
    
    next()
  }
}

module.exports = { authenticate, requireRole }
