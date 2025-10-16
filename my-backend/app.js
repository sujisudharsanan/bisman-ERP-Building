const rateLimit = require('express-rate-limit')
const enforce = require('express-sslify')
const helmet = require('helmet')
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const { Pool } = require('pg')
const { PrismaClient } = require('@prisma/client')   // ✅ only once
// Load .env early for local/dev
try { require('dotenv').config() } catch (e) {}
const prisma = new PrismaClient()
const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { logSanitizer } = require('./middleware/logSanitizer')
const privilegeService = require('./services/privilegeService')

const app = express()

app.get('/api/db-check', async (req, res) => {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as now`;
    res.json({
      success: true,
      database: 'connected',
      time: result?.[0]?.now || null
    });
  } catch (error) {
    console.error('DB check failed:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});
// Rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 5 for production, 50 for development
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


// Security middleware
// In dev, allow embedding in VS Code Simple Browser (webview/iframe) by disabling frameguard.
// Production remains behind a reverse proxy / proper CSP if needed.
app.use(helmet({ frameguard: false }))
// Only enforce HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use(enforce.HTTPS({ trustProtoHeader: true }))
}

// Log sanitization middleware
app.use(logSanitizer)



// CORS middleware for cross-origin requests (explicit allowlist + env)
const envFront = process.env.FRONTEND_URL || ''
const envFronts = process.env.FRONTEND_URLS || ''
const dynamic = [envFront, ...envFronts.split(',')]
  .map(s => s && s.trim())
  .filter(Boolean)
const providedOrigins = [
  'https://bisman-erp-building-nnul-mdzo2vwfm-sujis-projects-dfb64252.vercel.app',
  'https://bisman-erp-rr6f.onrender.com',
  'https://bisman-erp-xr6f.onrender.com',
  // Allow any vercel.app subdomain for this project (safe if only used during testing)
  'regex:^https://.*\\.vercel\\.app$'
]
const isProd = process.env.NODE_ENV === 'production'
const localDefaults = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
]
const allowlist = Array.from(new Set([
  ...(isProd ? [] : localDefaults),
  ...providedOrigins,
  ...dynamic,
]))

const corsOptions = {
  origin: function(origin, callback) {
    if (!origin) return callback(null, true)
    // wildcard/regex support via FRONTEND_URLS entries
    const wildcardToRegex = (pattern) => {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
      return new RegExp('^' + escaped + '$')
    }
    const toRegex = (p) => {
      if (!p) return null
      if (p.startsWith('regex:')) { try { return new RegExp(p.slice(6)) } catch { return null } }
      if (p.includes('*')) return wildcardToRegex(p)
      return null
    }
    const allowedRegexes = dynamic.map(toRegex).filter(Boolean)
    const ok = allowlist.includes(origin) || allowedRegexes.some(rx => rx.test(origin))
    callback(ok ? null : new Error('CORS: Origin not allowed'), ok)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Accept','Origin','Content-Type','Authorization','Cookie','X-Requested-With'],
  optionsSuccessStatus: 204,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))

app.use(express.json())
// Parse cookies early so downstream routers (e.g., /api/privileges) can access auth cookies
app.use(cookieParser())

// Serve static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

// Compat: rewrite legacy underscore paths to hyphenated versions
// e.g., /api/hub_incharge/* -> /api/hub-incharge/*
app.use((req, res, next) => {
  try {
    if (req.url && req.url.includes('hub_incharge')) {
      req.url = req.url.replace(/hub_incharge/g, 'hub-incharge')
    }
  } catch (e) { /* noop */ }
  next()
})

// Upload routes
const uploadRoutes = require('./routes/upload')
app.use('/api/upload', uploadRoutes)

// Test CORS route
try {
  const testCorsRoutes = require('./routes/testCors')
  app.use('/api', testCorsRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Test CORS route not loaded:', e && e.message)
  }
}

// System route (memory usage)
try {
  const systemRoutes = require('./routes/system')
  app.use('/api', systemRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('System routes not loaded:', e && e.message)
  }
}

// Privilege management routes
const privilegeRoutes = require('./routes/privilegeRoutes')
app.use('/api/privileges', privilegeRoutes)

// Security monitoring routes (versioned)
try {
  const securityRoutes = require('./routes/securityRoutes')
  app.use('/api', securityRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security routes not loaded:', e && e.message)
  }
}

// Super Admin routes (protected)
try {
  const superAdminRoutes = require('./routes/superAdmin')
  // Mount under versioned path expected by frontend
  app.use('/api/v1/super-admin', superAdminRoutes)
} catch (e) {
  // Route optional in some builds; log once in dev
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Super Admin routes not loaded:', e && e.message)
  }
}

// prisma initialized above

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// ...existing routes...

app.get('/', (req, res) => {
  res.send('My Backend (Express)')
})

// read DATABASE_URL from environment (was using undefined `databaseUrl`)
const databaseUrl = process.env.DATABASE_URL || null
const { createSecurePool, queryMonitor } = require('./middleware/database')

let pool
if (databaseUrl) {
  pool = createSecurePool(databaseUrl)

  // Simple route to verify DB connectivity
  app.get('/api/db-test', async (req, res) => {
    try {
      const result = await pool.query('SELECT NOW() as now')
      res.json({ ok: true, now: result.rows[0].now })
    } catch (err) {
      console.error('DB test error', err)
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  // Database monitoring endpoint
  app.get('/api/db-monitoring', (req, res) => {
    try {
      if (!queryMonitor) {
        return res.json({
          status: 'ok',
          monitoring: {
            total: 0,
            last5Minutes: 0,
            slowQueries: 0,
            errors: 0,
            averageDuration: 0,
            slowQueryThreshold: 1000,
            recentSlowQueries: []
          },
          health: {
            score: 100,
            status: 'healthy'
          }
        })
      }
      
      const stats = queryMonitor.getStats()
      res.json({
        status: 'ok',
        monitoring: stats,
        health: {
          score: stats.slowQueries === 0 && stats.errors === 0 ? 100 : 
                 stats.slowQueries < 5 && stats.errors < 3 ? 80 : 
                 stats.slowQueries < 10 && stats.errors < 5 ? 60 : 40,
          status: stats.slowQueries === 0 && stats.errors === 0 ? 'healthy' : 
                  stats.slowQueries < 5 && stats.errors < 3 ? 'warning' : 'critical'
        }
      })
    } catch (err) {
      console.error('DB monitoring error', err)
      res.status(500).json({ ok: false, error: err.message })
    }
  })

  // Public database health endpoint (no auth required)
  // Mirrors the shape used by privilege routes but is intentionally unprotected
  // so top-nav indicators and diagnostics can work before auth is established.
  app.get('/api/health/database', async (req, res) => {
    try {
      const startTime = Date.now()
      const health = await privilegeService.checkDatabaseHealth()
      const responseTime = Date.now() - startTime

      return res.json({
        success: true,
        data: {
          ...health,
          response_time: responseTime,
          last_checked: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Public DB health endpoint failed:', error)
      return res.status(500).json({
        success: false,
        error: {
          message: 'Database health check failed',
          code: 'DATABASE_UNAVAILABLE',
        },
        timestamp: new Date().toISOString(),
      })
    }
  })
} else {
  // No database URL provided in env;
  // HSTS (HTTP Strict Transport Security)
  app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });
  // keep pool null so DB routes are disabled
  pool = null
}

const { authenticate, requireRole } = require('./middleware/auth')


// Development users for testing (support both 'password' and 'changeme' where docs use it)
const devUsers = [
  // Super Admin
  { id: 0, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN' },
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN' },
  // Admin
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN' },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN' },
  // Manager
  { id: 1, email: 'manager@business.com', password: 'password', role: 'MANAGER' },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER' },
  // Staff / Hub Incharge
  { id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF' },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF' },

  // New Finance & Operations demo users
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

// Simple login endpoint with fallback for development
app.use('/api/login', authLimiter)
app.use('/api/auth', authLimiter)

app.post('/api/login', async (req, res) => {
  const timestamp = new Date().toISOString()
  console.log(`\n${'='.repeat(80)}`)
  console.log(`[${timestamp}] LOGIN REQUEST RECEIVED`)
  console.log(`${'='.repeat(80)}`)
  console.log('🌐 Request Details:')
  console.log('  - Method:', req.method)
  console.log('  - URL:', req.url)
  console.log('  - IP:', req.ip)
  console.log('  - Real IP:', req.headers['x-real-ip'] || 'N/A')
  console.log('  - Forwarded For:', req.headers['x-forwarded-for'] || 'N/A')
  console.log('\n📧 Headers:')
  console.log('  - Origin:', req.headers.origin || 'N/A')
  console.log('  - Host:', req.headers.host || 'N/A')
  console.log('  - Referer:', req.headers.referer || 'N/A')
  console.log('  - User-Agent:', req.headers['user-agent']?.substring(0, 80) || 'N/A')
  console.log('  - Content-Type:', req.headers['content-type'] || 'N/A')
  console.log('  - Cookie:', req.headers.cookie ? `${req.headers.cookie.substring(0, 50)}...` : 'N/A')
  console.log('\n📦 Body:', JSON.stringify(req.body, null, 2))
  console.log(`${'='.repeat(80)}\n`)
  
  const { email, password } = req.body || {}
  console.log('Extracted email:', email, 'password length:', password ? password.length : 'undefined')
  if (!email || !password) {
    console.log('❌ Missing email or password')
    return res.status(400).json({ error: 'email and password required' })
  }

  try {
    let user = null
    let roleName = null

    // Try Prisma first if DATABASE_URL is configured; otherwise skip DB lookup in dev
    if (databaseUrl) {
      try {
        user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          const match = await bcrypt.compare(password, user.password)
          if (!match) {
            // In non-production, allow falling back to dev users when password mismatches
            // In production, you can temporarily allow dev users with ALLOW_DEV_USERS=true
            if (process.env.NODE_ENV !== 'production' || String(process.env.ALLOW_DEV_USERS).toLowerCase() === 'true') {
              user = null
            } else {
              return res.status(401).json({ error: 'invalid credentials' })
            }
          } else {
            roleName = user.role || null
          }
        }
      } catch (dbError) {
        console.log('Database lookup failed, falling back to development users')
        user = null
      }
    } else {
      // No DATABASE_URL - skip DB calls for local development
      user = null
    }

    // Fallback to development users if database fails
    if (!user) {
      console.log('Checking dev users for email:', email)
      console.log('Available dev users:', devUsers.map(u => ({ email: u.email, role: u.role })))
      const devUser = devUsers.find(u => u.email === email && u.password === password)
      console.log('Found dev user:', devUser ? { email: devUser.email, role: devUser.role } : 'None')
      if (!devUser) {
        console.log('Invalid credentials for:', email)
        return res.status(401).json({ error: 'invalid credentials' })
      }
      user = devUser
      roleName = devUser.role
    }
  // Create access token (short-lived) and refresh token (rotating)
  const { safeRandomId } = require('./lib/id')
  const jti = safeRandomId()
  const accessToken = jwt.sign({ sub: user.id, role: roleName, jti }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' })
  const refreshToken = safeRandomId()

  // Save refresh token record (store hash) with expiry (7 days)
  const { saveRefreshToken } = require('./lib/tokenStore')
  const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
  // Store role to avoid DB dependency during refresh in dev/local
  try {
    await saveRefreshToken(refreshToken, { userId: user.id, role: roleName, jti, expiresAt: refreshExpiresAt })
  } catch (e) {
    console.warn('Warning: failed to persist refresh token; proceeding with stateless login in dev:', e && e.message)
  }

  // Set HttpOnly cookies for access and refresh tokens
  const isProduction = process.env.NODE_ENV === 'production'
  const hostHeader = (req && (req.hostname || (req.headers && req.headers.host))) || ''
  const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1')
  const cookieSecure = Boolean(isProduction && !isLocalHost)

  // In production, frontend and backend are cross-site (Vercel -> Render).
  // Cross-site cookies require SameSite=None and Secure=true.
  const sameSiteOpt = isProduction ? 'none' : 'lax'
  const accessCookie = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }
  const refreshCookie = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
  // Compatibility cookie name expected by some clients
  const compatCookie = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }
  
  // For localhost development, prefer host-only cookies (do not set domain)
  if (!isProduction && isLocalHost) {
    // Host-only cookies avoid domain matching quirks in some browsers on localhost
    delete accessCookie.domain;
    delete refreshCookie.domain;
  }

  res.cookie('access_token', accessToken, accessCookie)
  res.cookie('refresh_token', refreshToken, refreshCookie)
  // also set 'token' cookie for compatibility with clients expecting this name
  res.cookie('token', accessToken, compatCookie)
  res.json({ ok: true, email: user.email, role: roleName })
  } catch (err) {
    // Log full error with stack and request context
    try {
      console.error('Login error:', err && err.message ? err.message : err)
      if (err && err.stack) console.error(err.stack)
    } catch (e) {
      // no-op
    }
    // Always return JSON with explicit content-type
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.status(500).send(JSON.stringify({ error: 'internal error', code: 'LOGIN_500' }))
  }
})

// Refresh endpoint to rotate refresh tokens and issue a new access token
app.post('/api/token/refresh', async (req, res) => {
  try {
    const cookieToken = req.cookies && req.cookies['refresh_token']
    if (!cookieToken) return res.status(401).json({ error: 'missing refresh token' })
    const { verifyAndConsumeRefreshToken, saveRefreshToken, revokeJti } = require('./lib/tokenStore')
  // verifyAndConsumeRefreshToken is async
  let rec = null
  try {
    rec = await verifyAndConsumeRefreshToken(cookieToken)
  } catch (e) {
    console.error('verifyAndConsumeRefreshToken failed:', e && e.message)
    rec = null
  }
    if (!rec) return res.status(401).json({ error: 'invalid or expired refresh token' })

    // Issue new tokens
  const { safeRandomId } = require('./lib/id')
  const newJti = safeRandomId()
  const accessToken = jwt.sign({ sub: rec.userId, role: rec.role, jti: newJti }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '1h' })
  const newRefresh = safeRandomId()
    const refreshExpiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000
    try {
      await saveRefreshToken(newRefresh, { userId: rec.userId, role: rec.role, jti: newJti, expiresAt: refreshExpiresAt })
    } catch (e) {
      console.warn('Warning: failed to persist new refresh token:', e && e.message)
    }

    // Revoke previous jti (optional) to prevent reuse
  try { await revokeJti(rec.jti, Date.now() + 60 * 60 * 1000) } catch (e) { /* non-fatal */ }

    // Set cookies
    const isProduction = process.env.NODE_ENV === 'production'
    const hostHeader = (req && (req.hostname || (req.headers && req.headers.host))) || ''
    const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1')
    const cookieSecure = Boolean(isProduction && !isLocalHost)
    
  const sameSiteOpt = isProduction ? 'none' : 'lax'
  const accessCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }
  const refreshCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }
  const compatCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }
    
    // For localhost development, prefer host-only cookies (do not set domain)
    if (!isProduction && isLocalHost) {
      // Ensure we don't set a domain attribute for localhost to keep cookies host-only
      delete accessCookieOpts.domain;
      delete refreshCookieOpts.domain;
    }
    
    res.cookie('access_token', accessToken, accessCookieOpts)
    res.cookie('refresh_token', newRefresh, refreshCookieOpts)
  res.cookie('token', accessToken, compatCookieOpts)
    res.json({ ok: true })
  } catch (err) {
    console.error('Refresh error', err)
    res.status(500).json({ error: 'internal error' })
  }
})

// Protected route example
app.get('/api/me', authenticate, async (req, res) => {
  res.json({ user: req.user })
})
// Simple test endpoint to verify authentication
app.get('/api/auth-test', authenticate, async (req, res) => {
  res.json({ 
    authenticated: true, 
    user: req.user,
    message: 'You are authenticated!' 
  })
})

// Logout: clear cookie
app.post('/api/logout', (req, res) => {
  // Revoke refresh token and jti if present
  try {
    const { revokeRefreshTokenByRaw, revokeJti, revokeAllRefreshTokensForUser } = require('./lib/tokenStore')
    const refresh = req.cookies && req.cookies['refresh_token']
    if (refresh) revokeRefreshTokenByRaw(refresh)
    // If access token cookie present, try to decode to revoke jti
    const access = req.cookies && req.cookies['access_token']
    if (access) {
      try {
        const payload = jwt.decode(access)
        if (payload && payload.jti) revokeJti(payload.jti)
        if (payload && payload.sub) revokeAllRefreshTokensForUser(payload.sub)
      } catch (e) { /* ignore */ }
    }
  } catch (e) { console.error('Logout revoke error', e) }

  // Clear cookies - CRITICAL: Must use EXACT same options as when setting (including domain if set)
  // The sameSite and httpOnly need to match what was used in login
  try {
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieOpts = { 
      path: '/', 
      httpOnly: true, 
      sameSite: isProduction ? 'none' : 'lax',
    }
  res.clearCookie('access_token', cookieOpts)
  res.clearCookie('refresh_token', cookieOpts)
  res.clearCookie('token', cookieOpts)
    
    // Also try without httpOnly in case client needs to clear it
  res.clearCookie('access_token', { path: '/', sameSite: isProduction ? 'none' : 'lax' })
  res.clearCookie('refresh_token', { path: '/', sameSite: isProduction ? 'none' : 'lax' })
  res.clearCookie('token', { path: '/', sameSite: isProduction ? 'none' : 'lax' })
  } catch (e) {
    // best-effort fallback
    try { res.clearCookie('access_token', { path: '/' }) } catch (e) {}
    try { res.clearCookie('refresh_token', { path: '/' }) } catch (e) {}
  }

  return res.status(200).json({ ok: true, message: 'Logged out successfully' })
})

// Development only: Reset rate limiter
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-limiter', (req, res) => {
    try {
      authLimiter.resetAll && authLimiter.resetAll()
      res.json({ ok: true, message: 'Rate limiter reset for development' })
    } catch (err) {
      res.json({ ok: true, message: 'Rate limiter reset attempted' })
    }
  })
}

// Admin-only route
app.get('/api/admin', authenticate, requireRole('ADMIN'), async (req, res) => {
  res.json({ ok: true, msg: 'admin area', user: req.user })
})

// Hub Incharge API endpoints
// Hub Incharge Profile
app.get('/api/hub-incharge/profile', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    let user = null
    if (databaseUrl) {
      try {
        user = await prisma.user.findUnique({
          where: { id: req.user.id },
          select: { username: true, email: true, role: true }
        })
      } catch (e) {
        // DB not available – fall back to mock
        user = null
      }
    }

    // Fallback: use req.user details when DB is unavailable or user is missing
    const name = (user && (user.username || user.email?.split('@')[0])) || req.user.username || (req.user.email ? req.user.email.split('@')[0] : 'Hub Incharge')
    const email = (user && user.email) || req.user.email || 'hub@bisman.local'

    return res.json({
      name,
      role: 'Hub Incharge',
      client: 'BISMAN ERP',
      location: 'Mumbai Hub',
      contact: email,
      recognition: ['Employee of the Month', 'Safety Champion']
    })
  } catch (err) {
    console.error('Profile fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

// Hub Incharge Approvals
app.get('/api/hub-incharge/approvals', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    // Mock approvals data
    res.json([
      { id: 1, type: 'Purchase Request', amount: 5000, status: 'pending', date: '2024-10-01' },
      { id: 2, type: 'Expense Claim', amount: 1200, status: 'approved', date: '2024-10-02' },
      { id: 3, type: 'Leave Request', amount: 0, status: 'pending', date: '2024-10-01' }
    ])
  } catch (error) {
    console.error('Hub incharge approvals error:', error)
    res.status(500).json({ message: 'Failed to fetch approvals' })
  }
})

app.patch('/api/hub-incharge/approvals/:id', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    const { status, remarks } = req.body
    
    // TODO: Update in database
    console.log(`Updating approval ${id} to ${status}:`, remarks)
    
    res.json({ success: true, message: `Approval ${status} successfully` })
  } catch (err) {
    console.error('Approval update error:', err)
    res.status(500).json({ error: 'Failed to update approval' })
  }
})

// Hub Incharge Purchases
app.get('/api/hub-incharge/purchases', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const purchases = [
      { id: 1, vendor: "Office Supplies Co", amount: 12000, status: "pending", date: "2025-10-01" },
      { id: 2, vendor: "Tech Solutions", amount: 45000, status: "approved", date: "2025-09-28" }
    ]
    res.json(purchases)
  } catch (err) {
    console.error('Purchases fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch purchases' })
  }
})

// Hub Incharge Expenses
app.get('/api/hub-incharge/expenses', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const expenses = [
      { id: 1, amount: 3500, category: "Travel", status: "approved", date: "2025-09-25" },
      { id: 2, amount: 1200, category: "Meals", status: "pending", date: "2025-10-01" }
    ]
    res.json(expenses)
  } catch (err) {
    console.error('Expenses fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch expenses' })
  }
})

// Submit new expense
app.post('/api/hub-incharge/expenses', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { amount, category, remarks } = req.body
    
    // TODO: Save to database
    console.log('New expense submission:', { amount, category, remarks, userId: req.user.id })
    
    res.json({ success: true, message: 'Expense submitted successfully' })
  } catch (err) {
    console.error('Expense submission error:', err)
    res.status(500).json({ error: 'Failed to submit expense' })
  }
})

// Hub Incharge Performance
app.get('/api/hub-incharge/performance', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const performance = {
      claims: { approved: 65, pending: 25, rejected: 10 },
      trends: [
        { month: "Aug", value: 45 },
        { month: "Sep", value: 52 },
        { month: "Oct", value: 38 }
      ],
      sla: { avgResponseTime: "2.3 hours", onTimePercentage: 94 }
    }
    res.json(performance)
  } catch (err) {
    console.error('Performance fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch performance data' })
  }
})

// Hub Incharge Messages
app.get('/api/hub-incharge/messages', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const messages = [
      { id: 1, text: "New policy update available", read: false, date: "2025-10-02" },
      { id: 2, text: "Monthly report submission deadline", read: true, date: "2025-10-01" }
    ]
    res.json(messages)
  } catch (err) {
    console.error('Messages fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

// Acknowledge message
app.patch('/api/hub-incharge/messages/:id/ack', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    
    // TODO: Update in database
    console.log(`Acknowledging message ${id}`)
    
    res.json({ success: true, message: 'Message acknowledged' })
  } catch (err) {
    console.error('Message ack error:', err)
    res.status(500).json({ error: 'Failed to acknowledge message' })
  }
})

// Hub Incharge Tasks
app.get('/api/hub-incharge/tasks', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const tasks = [
      { id: 1, title: "Review expense reports", assignee: "Self", deadline: "2025-10-05", status: "pending" },
      { id: 2, title: "Approve purchase orders", assignee: "Alice Smith", deadline: "2025-10-03", status: "completed" }
    ]
    res.json(tasks)
  } catch (err) {
    console.error('Tasks fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

// Create new task
app.post('/api/hub-incharge/tasks', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { title, details, deadline, assignedTo } = req.body
    
    // TODO: Save to database
    console.log('New task creation:', { title, details, deadline, assignedTo, createdBy: req.user.id })
    
    res.json({ success: true, message: 'Task created successfully' })
  } catch (err) {
    console.error('Task creation error:', err)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

// Update task status
app.patch('/api/hub-incharge/tasks/:id', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    
    // TODO: Update in database
    console.log(`Updating task ${id} to ${status}`)
    
    res.json({ success: true, message: 'Task updated successfully' })
  } catch (err) {
    console.error('Task update error:', err)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

// Hub Incharge Settings
app.get('/api/hub-incharge/settings', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const settings = {
      language: 'English',
      theme: 'Light',
      emailNotifications: true,
      smsNotifications: true
    }
    res.json(settings)
  } catch (err) {
    console.error('Settings fetch error:', err)
    res.status(500).json({ error: 'Failed to fetch settings' })
  }
})

// Update settings
app.patch('/api/hub-incharge/settings', authenticate, requireRole(['STAFF', 'ADMIN', 'MANAGER', 'SUPER_ADMIN']), async (req, res) => {
  try {
    const { language, theme, emailNotifications, smsNotifications } = req.body
    
    // TODO: Save to database
    console.log('Settings update:', { language, theme, emailNotifications, smsNotifications, userId: req.user.id })
    
    res.json({ success: true, message: 'Settings updated successfully' })
  } catch (err) {
    console.error('Settings update error:', err)
    res.status(500).json({ error: 'Failed to update settings' })
  }
})

// Get user permissions
app.get('/api/auth/permissions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Get user permissions from database
    const userPermissions = await prisma.$queryRaw`
      SELECT DISTINCT 
        CONCAT(rt.path, '.', act.name) as permission_key
      FROM rbac_user_roles ur
      JOIN rbac_permissions p ON ur.role_id = p.role_id
      JOIN rbac_routes rt ON p.route_id = rt.id
      JOIN rbac_actions act ON p.action_id = act.id
      WHERE ur.user_id = ${userId}
        AND COALESCE(ur.is_active, true) = true
        AND COALESCE(p.is_active, true) = true
        AND COALESCE(rt.is_active, true) = true
        AND COALESCE(act.is_active, true) = true
    `
    
    const permissions = userPermissions.map(row => row.permission_key)
    
    // Add super admin all-access permission
    if (req.user.roleName === 'SUPER_ADMIN') {
      permissions.push('*.*') // All permissions wildcard
    }
    
    res.json({ 
      permissions,
      role: req.user.roleName,
      userId: req.user.id
    })
  } catch (err) {
    console.error('Permissions fetch error:', err)
    res.status(500).json({ 
      error: 'Failed to fetch permissions',
      permissions: [],
      role: req.user.roleName || null,
      userId: req.user.id || null
    })
  }
})

// Users management endpoint
app.get('/api/users', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    let users = []
    
    // Try to fetch from database first
    try {
      const dbUsers = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          createdAt: true,
          // Add more fields as needed
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      users = dbUsers.map(user => ({
        id: user.id,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        roleName: user.role || 'USER',
        isActive: true, // Default to active
        createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
        lastLogin: null // TODO: Add last login tracking
      }))
    } catch (dbError) {
      console.log('Database not available, using mock data')
      // Fallback to mock data
      users = [
        {
          id: 1,
          username: 'superadmin',
          email: 'suji@gmail.com',
          roleName: 'SUPER_ADMIN',
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastLogin: '2025-10-05T10:30:00Z'
        },
        {
          id: 2,
          username: 'admin',
          email: 'admin@business.com',
          roleName: 'ADMIN',
          isActive: true,
          createdAt: '2024-01-15T00:00:00Z',
          lastLogin: '2025-10-04T15:20:00Z'
        },
        {
          id: 3,
          username: 'manager',
          email: 'manager@business.com',
          roleName: 'MANAGER',
          isActive: true,
          createdAt: '2024-02-01T00:00:00Z',
          lastLogin: '2025-10-03T09:15:00Z'
        },
        {
          id: 4,
          username: 'staff',
          email: 'staff@business.com',
          roleName: 'STAFF',
          isActive: true,
          createdAt: '2024-03-01T00:00:00Z',
          lastLogin: '2025-10-05T08:45:00Z'
        }
      ]
    }
    
    res.json({ 
      success: true, 
      users,
      total: users.length 
    })
  } catch (err) {
    console.error('Users fetch error:', err)
    res.status(500).json({ 
      error: 'Failed to fetch users',
      users: [],
      total: 0
    })
  }
})

// If DEBUG_ROUTES env var is set, dump registered routes at startup for analyzer use
if (process.env.DEBUG_ROUTES) {
  try {
    const routes = [];
    app._router && app._router.stack && app._router.stack.forEach(mw => {
      if (!mw.route && mw.name === 'router') {
        // router with nested stack
        mw.handle && mw.handle.stack && mw.handle.stack.forEach(r => {
          if (r.route && r.route.path) {
            const methods = Object.keys(r.route.methods || {}).join(',');
            routes.push({ path: r.route.path, methods, file: r.route.stack && r.route.stack[0] && r.route.stack[0].name || null });
          }
        })
      } else if (mw.route && mw.route.path) {
        const methods = Object.keys(mw.route.methods || {}).join(',');
        routes.push({ path: mw.route.path, methods, file: mw.route.stack && mw.route.stack[0] && mw.route.stack[0].name || null });
      }
    });
    const out = path.join(__dirname, 'debug-routes.json');
    fs.writeFileSync(out, JSON.stringify(routes, null, 2));
    console.log('Wrote debug routes to', out);
  } catch (e) {
    console.error('Failed to dump routes', e);
  }
}

module.exports = app
