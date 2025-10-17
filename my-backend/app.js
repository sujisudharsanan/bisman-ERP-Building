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
const crypto = require('crypto')
const { logSanitizer } = require('./middleware/logSanitizer')
const privilegeService = require('./services/privilegeService')

const app = express()

// --- CORS configuration (single, unified) ---
// Keep this block BEFORE any routes
// Allows exact Vercel deployment domain(s), Render domain(s), and localhost

// --- JWT helpers (tokens) ---
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'dev_access_secret'
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret'

function generateAccessToken(payload) {
  // keep payload minimal; caller provides id/username/role
  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
}

function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

// Trust the first proxy hop (e.g., from Render's load balancer)
// This is crucial for express-rate-limit to work correctly.
app.set('trust proxy', 1);

// Basic security middleware
app.use(helmet())

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

// Log sanitization middleware
app.use(logSanitizer)


// CORS middleware for cross-origin requests (explicit allowlist + env)
const envFront = process.env.FRONTEND_URL || ''
const envFronts = process.env.FRONTEND_URLS || ''
const dynamic = [envFront, ...envFronts.split(',')]
  .map(s => s && s.trim())
  .filter(Boolean)
const providedOrigins = [
  // Exact Vercel deployment URL(s)
  'https://bisman-erp-building-git-diployment-sujis-projects-dfb64252.vercel.app',
  'https://bisman-erp-building-nnul-mdzo2vwfm-sujis-projects-dfb64252.vercel.app',
  // Render hosted backend URL(s)
  'https://bisman-erp-rr6f.onrender.com',
  'https://bisman-erp-xr6f.onrender.com',
  // Allow any vercel.app subdomain for this project (useful during testing)
  'regex:^https://.*\\.vercel\\.app$'
]
const isProd = process.env.NODE_ENV === 'production'
const localDefaults = [
  // Common local dev origins (with and without explicit ports)
  'http://localhost',
  'http://127.0.0.1',
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
    // Build regexes from ALL allowlist entries (provided + dynamic), not just dynamic
    const allowedRegexes = Array.from(new Set([...allowlist]))
      .map(toRegex)
      .filter(Boolean)
    const ok = allowlist.includes(origin) || allowedRegexes.some(rx => rx.test(origin))
    callback(ok ? null : new Error('CORS: Origin not allowed'), ok)
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
  allowedHeaders: ['Accept','Origin','Content-Type','Authorization','Cookie','X-Requested-With'],
  // Use 200 for Safari compatibility on preflight
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
// Explicit preflight support for common alias paths
app.options('/login', cors(corsOptions))
app.options('/me', cors(corsOptions))

// Always log CORS configuration on startup
console.log('🔒 CORS Configuration:')
console.log('   - Credentials:', corsOptions.credentials)
console.log('   - Allowed Origins:', allowlist.length, 'entries')
console.log('   - Production Mode:', isProd)
if (process.env.DEBUG_CORS === '1') {
  console.log('   - Full Allowlist:', allowlist)
}

if (process.env.DEBUG_CORS === '1') {
  try {
    console.log('[CORS] Allowlist:', allowlist)
  } catch (_) {}
  // Log every request's origin and method for troubleshooting
  app.use((req, _res, next) => {
    try {
      const o = req.headers.origin || null
      const m = req.method
      const u = req.originalUrl || req.url
      console.log(`[CORS DEBUG] ${m} ${u} origin=${o}`)
    } catch (_) {}
    next()
  })
}

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

// Optional JSON endpoint to inspect current CORS config at runtime
if (process.env.DEBUG_CORS === '1') {
  app.get('/api/_debug/cors', (req, res) => {
    res.json({
      ok: true,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      allowlist,
      cors: {
        methods: corsOptions.methods,
        credentials: !!corsOptions.credentials,
        allowedHeaders: corsOptions.allowedHeaders,
        optionsSuccessStatus: corsOptions.optionsSuccessStatus,
      },
      time: new Date().toISOString(),
    })
  })
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

// Optional detailed DB health
app.get('/health', async (req, res) => {
  try {
    const count = await prisma.user.count()
    res.json({ status: 'ok', users: count })
  } catch (e) {
    res.status(500).json({ error: e && e.message ? e.message : 'db error' })
  }
})

// Return the current authenticated user by verifying the access token cookie
app.get('/api/me', (req, res) => {
  try {
    const token = req.cookies?.access_token || req.cookies?.token || ''
    if (!token) {
      console.log('⚠️ /api/me: No token found in cookies');
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || process.env.SECRET
    if (!secret) return res.status(500).json({ error: 'Server misconfigured: missing token secret' })

    const payload = jwt.verify(token, secret)
    console.log('🔍 /api/me JWT payload:', { id: payload.id, email: payload.email, role: payload.role });
    
    // Shape a minimal user object; adapt as needed
    const roleValue = payload.role || payload.roleName || 'MANAGER'
    
    if (!payload.role && !payload.roleName) {
      console.warn('⚠️ Role missing in JWT payload — assigning fallback role: MANAGER');
    }
    
    const user = {
      id: payload.id || payload.userId || payload.sub || null,
      email: payload.email || payload.username || null,
      role: roleValue,
      roleName: roleValue, // Frontend expects roleName
      username: payload.username || payload.email?.split('@')[0] || null,
    }
    
    console.log('✅ /api/me returning user:', { email: user.email, role: user.role, roleName: user.roleName });
    return res.json({ ok: true, user })
  } catch (e) {
    console.error('❌ /api/me error:', e.message);
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
})

// Lightweight aliases for legacy/non-prefixed callers
app.get('/me', (req, res) => {
  // Delegate to /api/me handler by reusing logic via internal redirect
  req.url = '/api' + req.url
  app._router.handle(req, res, () => res.status(404).end())
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


// In-memory session store for dev users (when DB is unavailable)
const devUserSessions = Object.create(null)

// Development users for testing (support both 'password' and 'changeme' where docs use it)
const devUsers = [
  // Super Admin
  { id: 0, email: 'super@bisman.local', password: 'password', role: 'SUPER_ADMIN', isDev: true },
  { id: 100, email: 'super@bisman.local', password: 'changeme', role: 'SUPER_ADMIN', isDev: true },
  // Admin
  { id: 2, email: 'admin@business.com', password: 'admin123', role: 'ADMIN', isDev: true },
  { id: 101, email: 'admin@bisman.local', password: 'changeme', role: 'ADMIN', isDev: true },
  // Manager
  { id: 1, email: 'manager@business.com', password: 'password', role: 'MANAGER', isDev: true },
  { id: 102, email: 'manager@bisman.local', password: 'changeme', role: 'MANAGER', isDev: true },
  // Staff / Hub Incharge
  { id: 3, email: 'staff@business.com', password: 'staff123', role: 'STAFF', isDev: true },
  { id: 103, email: 'hub@bisman.local', password: 'changeme', role: 'STAFF', isDev: true },

  // New Finance & Operations demo users
  { id: 201, email: 'it@bisman.local', password: 'changeme', role: 'IT_ADMIN', isDev: true },
  { id: 202, email: 'cfo@bisman.local', password: 'changeme', role: 'CFO', isDev: true },
  { id: 203, email: 'controller@bisman.local', password: 'changeme', role: 'FINANCE_CONTROLLER', isDev: true },
  { id: 204, email: 'treasury@bisman.local', password: 'changeme', role: 'TREASURY', isDev: true },
  { id: 205, email: 'accounts@bisman.local', password: 'changeme', role: 'ACCOUNTS', isDev: true },
  { id: 206, email: 'ap@bisman.local', password: 'changeme', role: 'ACCOUNTS_PAYABLE', isDev: true },
  { id: 207, email: 'banker@bisman.local', password: 'changeme', role: 'BANKER', isDev: true },
  { id: 208, email: 'procurement@bisman.local', password: 'changeme', role: 'PROCUREMENT_OFFICER', isDev: true },
  { id: 209, email: 'store@bisman.local', password: 'changeme', role: 'STORE_INCHARGE', isDev: true },
  { id: 210, email: 'compliance@bisman.local', password: 'changeme', role: 'COMPLIANCE', isDev: true },
  { id: 211, email: 'legal@bisman.local', password: 'changeme', role: 'LEGAL', isDev: true }
]

// Simple login endpoint with fallback for development
app.use('/api/login', authLimiter)
app.use('/api/auth', authLimiter)

app.post('/api/login', async (req, res) => {
  const { email, password, username } = req.body;
  const loginCredential = email || username;

  if (!loginCredential || !password) {
    return res.status(400).json({ message: 'Email/Username and password are required' });
  }

  try {
    let user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      // Fallback to dev users
      console.log('Login: DB user not found or password mismatch, falling back to dev users.');
      const devUser = devUsers.find(u => (u.email === email || u.username === username) && u.password === password);
      if (!devUser) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
      console.log('✅ Login: Successfully authenticated via dev user fallback.');
      console.log('✅ User authenticated with role:', devUser.role);
      user = devUser; // Assign devUser to user object
    }

    // Normalize role field (could be role or roleName from DB)
    const userRole = user.role || user.roleName || 'MANAGER';
    const userEmail = user.email || user.username || loginCredential;
    const userId = user.id || user.userId || 0;

    // Generate and send tokens WITH role
    const accessToken = generateAccessToken({ 
      id: userId, 
      email: userEmail, 
      role: userRole,
      username: user.username || userEmail.split('@')[0]
    });
    const refreshToken = generateRefreshToken({ 
      id: userId, 
      email: userEmail,
      role: userRole
    });

    // If this is a dev user (not present in DB), skip DB persistence and use in-memory session
    if (user.isDev) {
      devUserSessions[refreshToken] = { userId: user.id, email: user.email }
    } else {
      try {
        // Persist refresh token to DB
        const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
        const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await prisma.user_sessions.create({
          data: {
            session_token: hashedToken,
            user_id: user.id,
            expires_at: expiryDate,
            created_at: new Date(),
            is_active: true,
          },
        });
        console.log('Successfully persisted refresh token to DB.');
      } catch (dbError) {
        console.error('Refresh token persist failed due to DB error:', dbError);
        // If it's a real user, this is a critical error.
        return res.status(500).json({ message: 'Could not persist session. Please try again.' });
      }
    }

  // Use secure cookies only in production to support http://localhost during dev
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieSecure = isProduction
  const sameSiteOpt = isProduction ? 'none' : 'lax'
  res.cookie('access_token', accessToken, { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 })
  res.cookie('refresh_token', refreshToken, { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 })

    console.log('✅ Login successful - Tokens generated with role:', userRole);
    res.json({ 
      message: 'Login successful', 
      user: { 
        id: userId, 
        email: userEmail,
        role: userRole,
        roleName: userRole,
        username: user.username || userEmail.split('@')[0]
      } 
    })
  } catch (error) {
    console.error('Login Error:', error); // Enhanced logging
    // Fallback for DB connection error
    console.log('Login: DB operation failed, falling back to dev users.');
    const devUser = devUsers.find(u => (u.email === email || u.username === username) && u.password === password);
    if (!devUser) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    console.log('Login: Successfully authenticated via dev user fallback after DB error.');
    // Normalize user shape
    const uid = devUser.id || devUser.userId || 0
    const uname = devUser.username || devUser.email || devUser.email?.split('@')[0] || username
    const role = devUser.role || devUser.roleName || 'USER'

    // Generate tokens
    const accessToken = generateAccessToken({ id: uid, username: uname, role })
    const refreshToken = generateRefreshToken({ id: uid, username: uname, role })

    // Try to persist refresh token; if it fails, continue for demo use
    try {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
      await prisma.user_sessions.create({
        data: {
          session_token: hashedToken,
          user_id: uid,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          created_at: new Date(),
          is_active: true,
        },
      })
    } catch (persistErr) {
      console.warn('Refresh token persist skipped due to DB error:', persistErr && persistErr.code)
    }

    // Set HttpOnly cookies for access and refresh tokens
    const isProduction = process.env.NODE_ENV === 'production'
    const cookieSecure = isProduction
    const sameSiteOpt = isProduction ? 'none' : 'lax'

    const accessCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }
    const refreshCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 7 * 24 * 60 * 60 * 1000 }

    res.cookie('access_token', accessToken, accessCookieOpts)
    res.cookie('refresh_token', refreshToken, refreshCookieOpts)

    res.json({ message: 'Login successful', user: { id: uid, username: uname, role } })
  }
})

// Alias for clients that POST to /login instead of /api/login
app.post('/login', (req, res) => {
  req.url = '/api/login'
  app._router.handle(req, res, () => res.status(404).end())
})

app.post('/api/token/refresh', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const existingSession = await prisma.user_sessions.findFirst({
      where: {
        session_token: hashedToken,
        is_active: true,
        expires_at: { gt: new Date() },
      },
    });

    if (!existingSession) {
      console.log('Refresh token not found in DB or expired, falling back to in-memory session.');
      // Fallback to "in-memory" session check for dev user
      const devSession = devUserSessions[refreshToken];
      if (!devSession) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }
      // ... existing dev user logic
    } else {
        console.log('Refresh token validated against database.');
        // Validate token signature and get user id from token
        let decoded;
        try {
          decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch (e) {
          return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Load user to build claims
        const userRecord = await prisma.user.findUnique({ where: { id: existingSession.user_id } })
        if (!userRecord) {
          return res.status(401).json({ message: 'User not found' });
        }
        // Issue new access token
        const newAccessToken = generateAccessToken({ id: userRecord.id, email: userRecord.email })

        const isProduction = process.env.NODE_ENV === 'production'
        const cookieSecure = isProduction
        const sameSiteOpt = isProduction ? 'none' : 'lax'
        const accessCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSiteOpt, path: '/', maxAge: 60 * 60 * 1000 }

        res.cookie('access_token', newAccessToken, accessCookieOpts)
        res.json({ message: 'Token refreshed successfully' })
    }
  } catch (error) {
    console.error('Refresh Token DB Error:', error); // Enhanced logging
    console.log('Refresh Token: DB operation failed, falling back to in-memory session.');
    // Fallback for DB connection error
    const devSession = devUserSessions[refreshToken];
    if (!devSession) {
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
    // ... existing dev user logic
  }
});

// This should be at the end of all other middleware and routes
app.use((err, req, res, next) => {
  console.error('Global error handler:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.post('/api/logout', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;

  if (refreshToken) {
    // Remove the refresh token from the database
    try {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
      await prisma.user_sessions.deleteMany({ where: { session_token: hashedToken } });
    } catch {}
  }

  // Clear cookies on the client side
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOpts = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    };
    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('refresh_token', cookieOpts);

    // Also try without httpOnly in case client needs to clear it
    res.clearCookie('access_token', { path: '/', secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
    res.clearCookie('refresh_token', { path: '/', secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
    res.clearCookie('token', { path: '/', secure: isProduction, sameSite: isProduction ? 'none' : 'lax' });
  } catch (e) {
    // best-effort fallback
    try { res.clearCookie('access_token', { path: '/' }); } catch (e) {}
    try { res.clearCookie('refresh_token', { path: '/' }); } catch (e) {}
    try { res.clearCookie('token', { path: '/' }); } catch (e) {}
  }

  res.status(200).json({ message: 'Logout successful' })
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
          lastLogin: '2025-10-05T09:15:00Z'
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
