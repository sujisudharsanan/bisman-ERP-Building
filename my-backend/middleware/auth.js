const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

// Development users for testing (keep in sync with app.js)
const devUsers = [
  // Core
  { id: 0, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN' },
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN' },
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN' },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN' },
  { id: 1, email: 'manager@business.com', password: 'password', role: 'MANAGER' },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER' },
  { id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF' },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF' },
  // Finance & Ops
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
  { id: 211, email: 'legal@bisman.local', password: 'changeme', role: 'LEGAL' }
]

async function authenticate(req, res, next) {
  const auth = req.headers.authorization || ''
  const parts = auth.split(' ')
  let token
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Fallback: check cookie
    const cookieToken = req.cookies && req.cookies.token
    if (!cookieToken) return res.status(401).json({ error: 'missing or malformed token' })
    token = cookieToken
  } else {
    // if header provided, use it
    token = parts[1]
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
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
      const devUser = devUsers.find(u => u.id === payload.sub)
      if (!devUser) return res.status(401).json({ error: 'invalid token user' })
      req.user = { ...devUser }
      delete req.user.password
      req.user.roleName = devUser.role
    }

    next()
  } catch (err) {
    console.error('JWT auth error', err.message)
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
