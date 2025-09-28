const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function authenticate(req, res, next) {
  const auth = req.headers.authorization || ''
  const parts = auth.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    // Fallback: check cookie
    const cookieToken = req.cookies && req.cookies.token
    if (!cookieToken) return res.status(401).json({ error: 'missing or malformed token' })
    token = cookieToken
  }
  // if header provided it was parsed above, otherwise cookie token used
  if (!token) token = parts[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    // Attach user record (optional) to request
  const user = await prisma.user.findUnique({ where: { id: payload.sub }, include: { role: true } })
    if (!user) return res.status(401).json({ error: 'invalid token user' })
    // remove sensitive fields
    delete user.password
  // normalize role onto req.user.roleName for simple checks
  req.user = user
  req.user.roleName = user.role && user.role.name ? user.role.name : null
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
  if (actual !== role) return res.status(403).json({ error: 'forbidden' })
    next()
  }
}

module.exports = { authenticate, requireRole }
