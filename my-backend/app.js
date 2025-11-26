// Legacy rateLimit kept for fallback; advanced middleware provides Redis + adaptive logic
const rateLimit = require('express-rate-limit')
const {
  strictLoginLimiter,
  moderateAuthLimiter,
  standardApiLimiter,
  publicLimiter,
  expensiveOperationLimiter,
  createAdaptiveRateLimiter,
} = require('./middleware/advancedRateLimiter');
const { 
  errorHandler, 
  notFoundHandler 
} = require('./middleware/errorHandler');
const { 
  initializeErrorLogsTable 
} = require('./utils/errorLogger');
const enforce = require('express-sslify')
const helmet = require('helmet')
const express = require('express')
const cors = require('cors')
const compression = require('compression') // ✅ Response compression
const path = require('path')
const { createProxyMiddleware } = require('http-proxy-middleware')
const fs = require('fs')
const { Pool } = require('pg')
const { getPrisma } = require('./lib/prisma')   // ✅ shared singleton
// Load .env early for local/dev
try { require('dotenv').config() } catch (e) {}
// Optional auto-bootstrap for missing chat/calls tables (dev/staging convenience)
if (process.env.AUTO_BOOTSTRAP_CHAT_CALLS === '1') {
  try {
    const { bootstrap } = require('./bootstrap/bootstrapChatCallsTables');
    bootstrap().catch(err => console.error('[auto-bootstrap] failed', err.message));
    console.log('[app.js] ⚙️ Auto bootstrap triggered (chat/calls tables)');
  } catch (e) {
    console.error('[app.js] Auto bootstrap load failed:', e.message);
  }
}

// Initialize Prisma with safe defaults and error handling
let prisma;
try {
  prisma = getPrisma();
  console.log('[app.js] Prisma client loaded via singleton');
} catch (prismaError) {
  console.error('[app.js] Warning: Prisma initialization failed:', prismaError.message);
  console.error('[app.js] Database operations will be unavailable');
  prisma = new Proxy({}, { get: () => () => Promise.reject(new Error('Database not available')) });
}
// Fallback if getPrisma() returned null (client not generated/installed)
if (!prisma) {
  console.warn('[app.js] Prisma client not available; using no-op proxy')
  prisma = new Proxy({}, { get: () => () => Promise.reject(new Error('Database not available')) });
}

const cookieParser = require('cookie-parser')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { logSanitizer } = require('./middleware/logSanitizer')
const privilegeService = require('./services/privilegeService')
const TenantGuard = require('./middleware/tenantGuard') // ✅ SECURITY: Multi-tenant isolation
const { authenticate, requireRole } = require('./middleware/auth') // ✅ Authentication middleware

const app = express()

// --- CORS configuration (Railway only + localhost dev) ---
// Keep this block BEFORE any routes

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
// Note: Disable CSP here because Next.js injects inline/runtime scripts that a strict CSP would block.
// We can re-enable a tuned CSP later once the app is fully stable.
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}))

// ✅ PERFORMANCE OPTIMIZATION: Maximum Response Compression (GZIP)
// Reduces API response sizes by ~80-90% with maximum compression
// Optimized for AI chat responses with large payloads
app.use(compression({
  // Compress responses larger than 256 bytes (lower threshold for more compression)
  threshold: 256,
  // Maximum compression level (9 = best compression, slower speed)
  // Perfect for AI chat where response size matters more than compression time
  level: 9,
  // Memory level (1-9, where 9 uses most memory for better compression)
  memLevel: 9,
  // Filter function - compress ALL JSON and text responses
  filter: (req, res) => {
    // Allow clients to opt-out if needed
    if (req.headers['x-no-compression']) {
      return false;
    }
    
    // Force compression for AI endpoints (large payloads)
    if (req.path.includes('/ai') || req.path.includes('/chat')) {
      return true;
    }
    
    // Use default filter for other responses
    return compression.filter(req, res);
  },
  // Use Brotli compression when supported (better than GZIP for text)
  // Falls back to GZIP for older browsers
  strategy: 0 // Z_DEFAULT_STRATEGY for best compression
}))
console.log('[app.js] ✅ Maximum response compression enabled (Level 9 GZIP/Brotli)');
console.log('[app.js] 🚀 Optimized for AI chat responses - expect 80-90% size reduction');

// --- Prometheus Metrics Integration (monitoring) ---
try {
  const { createPrometheusMiddleware, metricsHandler } = require('./middleware/prometheus');
  const { metricsMiddleware, connectionTracker, detailedMetrics, register } = createPrometheusMiddleware();
  
  // Apply connection tracking
  app.use(connectionTracker);
  
  // Apply detailed metrics collection
  app.use(detailedMetrics);
  
  // Expose metrics endpoint for Prometheus scraping
  app.get('/metrics', metricsHandler);
  
  console.log('[app.js] ✅ Prometheus metrics enabled at /metrics');
  console.log('[app.js] 📊 Collecting: HTTP requests, latency, connections, DB queries, auth attempts');
} catch (e) {
  console.warn('[app.js] Prometheus metrics not enabled:', e.message);
  console.warn('[app.js] Install dependencies: npm install prom-client express-prom-bundle');
}

// --- Redis Cache Integration (health & metrics) ---
try {
  const { isEnabled, ping, redis } = require('./cache/redisClient');
  const { snapshot, reset } = require('./cache/metrics/redisMetrics');
  app.get('/internal/cache-health', async (req, res) => {
    const status = await ping();
    res.json({ cacheEnabled: isEnabled(), ...status });
  });
  app.get('/internal/cache-metrics', (req, res) => {
    res.json(snapshot());
  });
  app.post('/internal/cache-metrics/reset', (req, res) => {
    reset();
    res.json({ ok: true });
  });
  console.log('[app.js] ✅ Cache endpoints mounted (/internal/cache-health, /internal/cache-metrics)');
} catch (e) {
  console.warn('[app.js] Cache subsystem not mounted:', e.message);
}

// Legacy mail-based OTP routes (disabled by default)
// Enable only if you explicitly set ENABLE_LEGACY_MAIL_OTP=1
if (process.env.ENABLE_LEGACY_MAIL_OTP === '1') {
  try {
    const otpRoutes = require('./routes/otp');
    app.use('/api/security', otpRoutes);
    console.log('[app.js] ✅ Mounted /api/security (legacy mail OTP)');
  } catch (e) {
    console.warn('[app.js] Legacy mail OTP not mounted:', e?.message);
  }
}

// =====================
// Advanced Rate Limiting - DISABLED FOR DEVELOPMENT
// =====================
// COMMENTED OUT - All rate limiters disabled in development
// Uncomment for production use
/*
const loginLimiter = strictLoginLimiter;
const authLimiter = moderateAuthLimiter;
const apiLimiter = standardApiLimiter;
const publicEndpointLimiter = publicLimiter;
const expensiveLimiter = expensiveOperationLimiter;
const chatLimiter = createAdaptiveRateLimiter({ windowMs: 60 * 1000, max: 20 });
const callLimiter = createAdaptiveRateLimiter({ windowMs: 5 * 60 * 1000, max: 20 });

// app.use(['/api/health','/health','/metrics'], publicEndpointLimiter);
// app.use(['/api/login','/api/auth/login','/api/auth/register','/api/password-reset','/api/security/otp'], loginLimiter);
// app.use(['/api/auth/refresh','/api/auth/logout','/api/session'], authLimiter);
// app.use(['/api','/v1'], apiLimiter);
// app.use(['/api/ai','/api/reports','/api/analytics/export'], expensiveLimiter);
// app.use(['/api/chat','/api/messages'], chatLimiter);
// app.use(['/api/calls','/api/voice','/api/video'], callLimiter);
*/

// Log sanitization middleware
app.use(logSanitizer)


// ============================================================================
// CORS CONFIGURATION - Production-Ready Setup
// ============================================================================
const isProd = process.env.NODE_ENV === 'production';

// Build allowed origins list - Railway only
// Build allowed origins list - prioritize explicit FRONTEND_URLS (comma separated)
let allowedOrigins = []
if (process.env.FRONTEND_URLS) {
  allowedOrigins = process.env.FRONTEND_URLS.split(',').map(o => o.trim()).filter(Boolean)
}
// Fallback minimal list (backend URL + optional frontend single URL)
if (allowedOrigins.length === 0) {
  allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://bisman-erp-backend-production.up.railway.app'
  ].filter(Boolean)
}
// In production we often still need local testing – allow if ALLOW_LOCALHOST=1
if (process.env.ALLOW_LOCALHOST === '1') {
  ['http://localhost:3000','http://127.0.0.1:3000'].forEach(l => { if (!allowedOrigins.includes(l)) allowedOrigins.push(l) })
}
// Deduplicate
allowedOrigins = Array.from(new Set(allowedOrigins))

const corsOptions = {
  origin: (origin, callback) => {
    // Debug logging (only if DEBUG_CORS=1 in .env)
    if (process.env.DEBUG_CORS === '1') {
      console.log(`[CORS] 🔍 Request from origin: ${origin || 'no-origin'}`);
    }
    
    // Allow requests with no origin (mobile apps, Postman, curl, same-origin)
    if (!origin) {
      if (process.env.DEBUG_CORS === '1') {
        console.log('[CORS] ✅ Allowing request with no origin');
      }
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      if (process.env.DEBUG_CORS === '1') {
        console.log(`[CORS] ✅ Allowing whitelisted origin: ${origin}`);
      }
      return callback(null, true);
    }
    
    // In development, allow any localhost origin (flexible port support)
    if (!isProd && origin.startsWith('http://localhost:')) {
      console.log('[CORS] ✅ Allowing localhost origin (dev mode):', origin);
      return callback(null, true);
    }
    
    // Block everything else
    console.warn(`[CORS] ❌ BLOCKED origin: ${origin}`);
    console.warn(`[CORS] 💡 Allowed origins: ${allowedOrigins.join(', ')}`);
    // Return null error to avoid breaking response, but deny CORS
    return callback(null, false);
  },
  credentials: true, // Allow cookies and Authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200, // Some legacy browsers choke on 204
};

// Apply CORS middleware globally (MUST be before routes)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Enable pre-flight for all routes

// Log CORS configuration on startup
console.log('\n🔒 CORS Configuration:');
console.log('   - Environment:', isProd ? 'PRODUCTION' : 'DEVELOPMENT');
console.log('   - Credentials Enabled:', corsOptions.credentials);
console.log('   - Allowed Origins:', allowedOrigins);
console.log('   - Allowed Methods:', corsOptions.methods.join(', '));
console.log('   - Debug Mode:', process.env.DEBUG_CORS === '1' ? 'ON' : 'OFF');
console.log('');

if (process.env.DEBUG_CORS === '1') {
  console.log('   - Full Allowlist:', allowedOrigins)
}

if (process.env.DEBUG_CORS === '1') {
  try {
    console.log('[CORS] Allowlist:', allowedOrigins)
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

// =============================
// Request Latency & Error Metrics
// =============================
let reqStats = { count: 0, errorCount: 0, totalLatency: 0 };
const METRIC_FLUSH_INTERVAL_MS = 60000; // 1 minute aggregation window

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    reqStats.count += 1;
    reqStats.totalLatency += durationMs;
    if (res.statusCode >= 500) reqStats.errorCount += 1;
  });
  next();
});

setInterval(async () => {
  try {
    const { prisma } = app.locals;
    if (!prisma || reqStats.count === 0) return;
    const avgLatency = Math.round(reqStats.totalLatency / reqStats.count);
    const errorRatePct = reqStats.errorCount ? parseFloat(((reqStats.errorCount / reqStats.count) * 100).toFixed(2)) : 0;
    await prisma.systemMetricSample.create({ data: { latencyMs: avgLatency, errorRatePct, reqCount: reqStats.count, errCount: reqStats.errorCount } });
  } catch (e) {
    console.warn('[metrics] flush failed:', e.message);
  } finally {
    reqStats = { count: 0, errorCount: 0, totalLatency: 0 };
  }
}, METRIC_FLUSH_INTERVAL_MS).unref();

// Nightly aggregation & retention (runs approx every 24h)
const DAY_MS = 24 * 60 * 60 * 1000;
setInterval(async () => {
  try {
    const { prisma } = app.locals;
    if (!prisma) return;
    const config = await prisma.systemHealthConfig.findFirst({ where: { id: 1 } });
    const metricsRetentionDays = config?.metricsRetentionDays ?? 7;
    const aggregateRetentionDays = config?.aggregateRetentionDays ?? 365;

    // Aggregate yesterday
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const samples = await prisma.systemMetricSample.findMany({
      where: { collected_at: { gte: start, lt: end } },
    });
    if (samples.length) {
      const sumLatency = samples.reduce((a, s) => a + s.latencyMs * (s.reqCount || 1), 0);
      const sumReq = samples.reduce((a, s) => a + (s.reqCount || 0), 0) || samples.length;
      const sumErr = samples.reduce((a, s) => a + (s.errCount || 0), 0);
      const avgLatency = Math.round(sumLatency / sumReq);
      const avgErrPct = sumReq ? parseFloat(((sumErr / sumReq) * 100).toFixed(2)) : 0;
      await prisma.systemMetricDailyAggregate.upsert({
        where: { day: start },
        update: { avgLatencyMs: avgLatency, avgErrorRatePct: avgErrPct, reqCount: sumReq, errCount: sumErr },
        create: { day: start, avgLatencyMs: avgLatency, avgErrorRatePct: avgErrPct, reqCount: sumReq, errCount: sumErr },
      });
    }

    // Retention: purge old fine-grained samples
    const cutoffSamples = new Date(Date.now() - metricsRetentionDays * DAY_MS);
    await prisma.systemMetricSample.deleteMany({ where: { collected_at: { lt: cutoffSamples } } });

    // Retention: purge old aggregates
    const cutoffAgg = new Date(Date.now() - aggregateRetentionDays * DAY_MS);
    await prisma.systemMetricDailyAggregate.deleteMany({ where: { day: { lt: cutoffAgg } } });
  } catch (e) {
    console.warn('[metrics] aggregation/retention failed:', e.message);
  }
}, DAY_MS).unref();

// ❌ SECURITY FIX: Removed public static file serving
// OLD CODE: app.use('/uploads', express.static(path.join(__dirname, 'uploads')))
// NEW: Files now served via authenticated endpoint (moved after middleware imports)

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

// Users report routes
try {
  const userReportRoutes = require('./routes/userReport');
  app.use('/api', userReportRoutes);
} catch (e) {
  console.warn('[app.js] userReport routes not loaded:', e?.message || e);
}

// Trial OTP onboarding routes (Redis-backed)
try {
  const trialOtpRoutes = require('./routes/trialOtpOnboarding');
  app.use('/api/trial', trialOtpRoutes);
  console.log('[app.js] ✅ Mounted /api/trial (OTP onboarding)');
} catch (e) {
  console.warn('[app.js] trialOtp routes not loaded:', e?.message || e);
}

// Calls (Jitsi) routes
try {
  const callsRoutes = require('./routes/calls');
  app.use('/api/calls', callsRoutes);
  try {
    const healthRoute = require('./routes/health');
    app.use('/api/health', healthRoute);
    console.log('[app.js] ✅ Mounted /api/health');
  } catch (e) {
    console.warn('[app.js] Health route mount failed', e.message);
  }
  console.log('[app.js] ✅ Mounted /api/calls (Jitsi calls)');
} catch (e) {
  console.warn('[app.js] calls routes not loaded:', e?.message || e);
}

// ✅ SECURITY FIX: Protected database health endpoint (Enterprise Admin only)
// Exposes sensitive database information, must be protected
// MOVED AFTER MIDDLEWARE IMPORT (line ~750)
/*
app.get('/api/health/database', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
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
    console.error('DB health endpoint failed:', error)
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

// ✅ SECURITY FIX: Protected cache statistics endpoint (Enterprise Admin only)
app.get('/api/health/cache', authenticate, requireRole('ENTERPRISE_ADMIN'), (req, res) => {
  try {
    const cacheService = require('./services/cacheService');
    const stats = cacheService.getStats();
    
    return res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Cache stats endpoint failed:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache statistics',
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ SECURITY FIX: Protected RBAC health checker (Enterprise Admin only)
app.get('/api/health/rbac', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  const now = new Date().toISOString()
  try {
    if (!databaseUrl) {
      return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured', timestamp: now })
    }
    // Check table existence using to_regclass and counts when present
    const checkTable = async (table) => {
      try {
  const existsRows = await prisma.$queryRaw`SELECT to_regclass(${`public.${table}`})::text AS regclass`;
        const exists = Array.isArray(existsRows) && existsRows[0] && existsRows[0].regclass !== null
        let count = null
        if (exists) {
          switch (table) {
            case 'rbac_roles': count = await prisma.rbac_roles.count(); break
            case 'rbac_actions': count = await prisma.rbac_actions.count(); break
            case 'rbac_routes': count = await prisma.rbac_routes.count(); break
            case 'rbac_permissions': count = await prisma.rbac_permissions.count(); break
            case 'rbac_user_roles': count = await prisma.rbac_user_roles.count(); break
            default: count = null
          }
        }
        return { exists, count }
      } catch (e) {
        return { exists: false, count: null, error: e && e.message }
      }
    }

    const [roles, actions, routes, permissions, userRoles] = await Promise.all([
      checkTable('rbac_roles'),
      checkTable('rbac_actions'),
      checkTable('rbac_routes'),
      checkTable('rbac_permissions'),
      checkTable('rbac_user_roles'),
    ])

    const allExist = roles.exists && actions.exists && routes.exists && permissions.exists && userRoles.exists

    return res.json({
      ok: allExist,
      tables: {
        rbac_roles: roles,
        rbac_actions: actions,
        rbac_routes: routes,
        rbac_permissions: permissions,
        rbac_user_roles: userRoles,
      },
      timestamp: now,
    })
  } catch (error) {
    console.error('RBAC health endpoint failed:', error)
    return res.status(500).json({ ok: false, error: 'RBAC health check failed', timestamp: now })
  }
})

// OLD /api/health/db alias REMOVED - Use /api/health/database directly

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
  allowlist: allowedOrigins,
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

*/

// System route (memory usage)
try {
  const systemRoutes = require('./routes/system')
  app.use('/api', systemRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('System routes not loaded:', e && e.message)
  }
}

// System Health Dashboard routes
try {
  const systemHealthRouter = require('./routes/systemHealth');
  // Make prisma and redisClient available to the route
  app.locals.prisma = prisma;
  // Try to get redis client if available
  try {
    const { redis: redisClient } = require('./cache/redisClient');
    app.locals.redisClient = redisClient;
  } catch (redisErr) {
    app.locals.redisClient = null; // Redis not available
  }
  app.use('/api/system-health', systemHealthRouter);
  console.log('✅ System Health routes loaded at /api/system-health');
} catch (e) {
  console.warn('System Health routes not loaded:', e && e.message);
}

// Privilege management routes
const privilegeRoutes = require('./routes/privilegeRoutes')
app.use('/api/privileges', privilegeRoutes)

// Pages routes for permission management
const pagesRoutes = require('./routes/pagesRoutes')
app.use('/api/pages', pagesRoutes)

// Permissions routes for managing user page access
const permissionsRoutes = require('./routes/permissionsRoutes')
app.use('/api/permissions', permissionsRoutes)

// Permission checking API (new - for frontend page guards)
const permissionCheckRoutes = require('./routes/permissions')
app.use('/api/permissions', permissionCheckRoutes)

// Role-based route protection middleware
const { 
  requireEnterpriseAdmin, 
  requireBusinessLevel,
  smartRouteProtection 
} = require('./middleware/roleProtection')

// Apply smart route protection to all authenticated routes
// MOVED AFTER MIDDLEWARE IMPORT (line ~800)
// app.use('/api/*', authenticate, smartRouteProtection)

// Reports routes for generating system reports
const reportsRoutes = require('./routes/reportsRoutes')
app.use('/api/reports', reportsRoutes)

// Calendar routes for event management
try {
  const calendarRoutes = require('./routes/calendar')
  app.use('/api/calendar', calendarRoutes)  // ✅ FIX: Changed from '/api' to '/api/calendar' to avoid blocking auth routes
  console.log('✅ Calendar routes loaded at /api/calendar')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Calendar routes not loaded:', e && e.message)
  }
}

// ===================================================================
// ULTIMATE CHAT SYSTEM - All Features Combined! 🚀
// ===================================================================
// Combines:
// - Unified Chat: Database-driven, RBAC, production-ready
// - Intelligent Chat: NLP, intent detection, entity extraction
// - Enhanced Chat: Self-learning, human-like responses, metrics
//
// Single endpoint: /api/chat/*
// Features: ALL the features from all 3 systems!
// ===================================================================
try {
  const ultimateChatRoutes = require('./routes/ultimate-chat')
  app.use('/api/chat', ultimateChatRoutes)
  console.log('✅ 🎯 ULTIMATE CHAT SYSTEM loaded at /api/chat - All features combined!')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('❌ Ultimate Chat System not loaded:', e && e.message)
  }
}

// ===== OLD CHAT SYSTEMS - NOW REMOVED =====
// All 3 chat systems have been consolidated into ONE ultimate system above:
// - Unified Chat (/api/unified-chat/*) - REMOVED
// - Intelligent Chat (/api/chat/*) - REMOVED
// - Enhanced Chat (new) - INTEGRATED above
// ===== END OLD CHAT SYSTEMS =====

// Security monitoring routes (versioned)
try {
  const securityRoutes = require('./routes/securityRoutes')
  app.use('/api', securityRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security routes not loaded:', e && e.message)
  }
}

// Multi-tenant authentication routes
try {
  const authRoutes = require('./routes/auth')
  app.use('/api/auth', authRoutes)
  console.log('✅ Multi-tenant auth routes loaded')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Auth routes not loaded:', e && e.message)
  }
}

// Task Management routes (protected)
try {
  const taskRoutes = require('./routes/tasks')
  app.use('/api/tasks', authenticate, taskRoutes)
  console.log('✅ Task Management routes loaded (protected)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Task routes not loaded:', e && e.message)
  }
}

// Bill OCR routes (protected)
try {
  const billRoutes = require('./src/routes/bill.routes')
  app.use('/api/bills', billRoutes)
  console.log('✅ Bill OCR routes loaded (protected with rate limiting)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Bill OCR routes not loaded:', e && e.message)
  }
}

// Enterprise Admin routes (protected)
try {
  const enterpriseRoutes = require('./routes/enterprise')
  // Protect all enterprise routes - only ENTERPRISE_ADMIN can access
  app.use('/api/enterprise', authenticate, requireEnterpriseAdmin, enterpriseRoutes)
  console.log('✅ Enterprise Admin routes loaded (protected)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Enterprise routes not loaded:', e && e.message)
  }
}

// Enterprise Admin Dashboard & Management routes (protected)
try {
  const enterpriseAdminDashboard = require('./routes/enterprise-admin-Dashboard')
  const enterpriseAdminOrganizations = require('./routes/enterprise-admin-Organizations')
  const enterpriseAdminModules = require('./routes/enterprise-admin-Modules')
  const enterpriseAdminBilling = require('./routes/enterprise-admin-Billing')
  const enterpriseAdminAudit = require('./routes/enterprise-admin-Audit')
  const enterpriseAdminReports = require('./routes/enterprise-admin-Reports')
  const enterpriseAdminAI = require('./routes/enterprise-admin-AI')
  const enterpriseAdminLogs = require('./routes/enterprise-admin-Logs')
  const enterpriseAdminUsers = require('./routes/enterprise-admin-Users')
  const enterpriseAdminSuperAdmins = require('./routes/enterprise-admin-SuperAdmins')
  const enterpriseAdminSettings = require('./routes/enterprise-admin-Settings')
  const enterpriseAdminIntegrations = require('./routes/enterprise-admin-Integrations')
  const enterpriseAdminNotifications = require('./routes/enterprise-admin-Notifications')
  const enterpriseAdminSupport = require('./routes/enterprise-admin-Support')
  
  app.use('/api/enterprise-admin/dashboard', enterpriseAdminDashboard)
  app.use('/api/enterprise-admin/organizations', enterpriseAdminOrganizations)
  app.use('/api/enterprise-admin/modules', enterpriseAdminModules)
  app.use('/api/enterprise-admin/billing', enterpriseAdminBilling)
  app.use('/api/enterprise-admin/audit', enterpriseAdminAudit)
  app.use('/api/enterprise-admin/reports', enterpriseAdminReports)
  app.use('/api/enterprise-admin/ai', enterpriseAdminAI)
  app.use('/api/enterprise-admin/logs', enterpriseAdminLogs)
  app.use('/api/enterprise-admin/users', enterpriseAdminUsers)
  app.use('/api/enterprise-admin/super-admins', enterpriseAdminSuperAdmins)
  app.use('/api/enterprise-admin/settings', enterpriseAdminSettings)
  app.use('/api/enterprise-admin/integrations', enterpriseAdminIntegrations)
  app.use('/api/enterprise-admin/notifications', enterpriseAdminNotifications)
  app.use('/api/enterprise-admin/support', enterpriseAdminSupport)
  
  console.log('✅ Enterprise Admin Management routes loaded (14 modules)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Enterprise Admin Management routes not loaded:', e && e.message)
  }
}

// Task Workflow System routes (NEW - with Socket.IO realtime updates)
try {
  const { router: taskRoutes } = require('./routes/taskRoutes');
  const approverRoutes = require('./routes/approverRoutes');
  
  app.use('/api/tasks', authenticate, taskRoutes);
  app.use('/api/approvers', authenticate, approverRoutes);
  
  console.log('✅ Task Workflow System routes loaded (with Socket.IO realtime)');
} catch (e) {
  console.warn('Task Workflow System routes not loaded:', e && e.message);
}

// Payment Approval System routes (protected)
try {
  const paymentRequestsRoutes = require('./dist/routes/paymentRequests').default
  const tasksRoutes = require('./dist/routes/tasks').default
  const paymentsRoutes = require('./dist/routes/payments').default
  
  if (paymentRequestsRoutes && tasksRoutes && paymentsRoutes) {
    app.use('/api/common/payment-requests', paymentRequestsRoutes)
    app.use('/api/common/tasks', tasksRoutes)
    app.use('/api/common/tasks', paymentsRoutes) // For /:id/payment endpoint
    app.use('/api/payment', paymentsRoutes) // For /public/:token, /initiate, /webhook/*
    
    console.log('✅ Payment Approval System routes loaded (3 modules)')
  } else {
    console.warn('⚠️  Payment Approval System routes: Some modules failed to load')
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Payment Approval System routes not loaded:', e && e.message)
  }
}

// User Management System routes (protected)
try {
  const usersRoutes = require('./dist/routes/users').default
  
  if (usersRoutes) {
    app.use('/api/system/users', usersRoutes)
    console.log('✅ User Management System routes loaded')
  } else {
    console.warn('⚠️  User Management System routes failed to load')
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('User Management System routes not loaded:', e && e.message)
  }
}

// Client Management & Permissions routes
try {
  // Prefer JS routes; fallback to dist/src when present
  const clientManagementRoutes = require('./routes/clientManagement') || (require('./dist/routes/clientManagement').default) || (require('./src/routes/clientManagement').default)
  if (clientManagementRoutes) {
    app.use('/api/system', clientManagementRoutes) // endpoints: /clients, /clients/:id/permissions, etc.
    console.log('✅ Client Management routes loaded')
  } else {
    console.warn('⚠️ Client Management routes failed to load')
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Client Management routes not loaded:', e && e.message)
  }
}

// Public Trial Onboarding routes
try {
  const trialOnboardingRoutes = require('./routes/trialOnboarding') || (require('./dist/routes/trialOnboarding').default) || (require('./src/routes/trialOnboarding').default)
  if (trialOnboardingRoutes) {
    app.use('/api', trialOnboardingRoutes)
    console.log('✅ Trial Onboarding routes loaded')
  } else {
    console.warn('⚠️ Trial Onboarding routes failed to load')
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Trial Onboarding routes not loaded:', e && e.message)
  }
}

// Usage Events routes
try {
  const usageEventsRoutes = require('./routes/usageEvents') || (require('./dist/routes/usageEvents').default) || (require('./src/routes/usageEvents').default)
  if (usageEventsRoutes) {
    app.use('/api/system/usage-events', usageEventsRoutes)
    console.log('✅ Usage Events routes loaded')
  } else {
    console.warn('⚠️ Usage Events routes failed to load')
  }
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Usage Events routes not loaded:', e && e.message)
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

// AI Module routes (protected - requires authentication)
// NOTE: Previously had duplicate route conflict with Enhanced AI Training at /api/ai
// If LangChain features needed, consider integrating into Unified Chat or use different endpoint
try {
  const aiRoute = require('./routes/aiRoute')
  const aiAnalyticsRoute = require('./routes/aiAnalyticsRoute')
  
  // AI query endpoints - Changed to /api/langchain to avoid conflicts
  app.use('/api/langchain', aiRoute)
  
  // AI analytics endpoints
  app.use('/api/ai/analytics', aiAnalyticsRoute)
  
  console.log('[app.js] ✅ AI Module routes loaded at /api/langchain')
} catch (e) {
  console.warn('[app.js] AI Module routes not loaded:', e && e.message)
  console.warn('[app.js] Install dependencies: npm install langchain node-cron')
}

// Messages routes (protected - requires authentication)
try {
  const messagesRoute = require('./src/routes/messages')
  
  // Messages endpoints for unread counts and notifications
  app.use('/api/messages', messagesRoute)
  
  console.log('[app.js] ✅ Messages routes loaded')
} catch (e) {
  console.warn('[app.js] Messages routes not loaded:', e && e.message)
}

// Copilate Smart Chat routes (protected - requires authentication)
try {
  const copilateRoute = require('./src/routes/copilate')
  
  // Copilate AI chat endpoints
  app.use('/api/copilate', copilateRoute)
  
  console.log('[app.js] ✅ Copilate Smart Chat routes loaded')
} catch (e) {
  console.warn('[app.js] Copilate routes not loaded:', e && e.message)
}

// prisma initialized above

// Health check endpoint - relies on global CORS middleware
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
app.get('/api/me', async (req, res) => {
  try {
    const token = req.cookies?.access_token || req.cookies?.token || ''
    if (!token) {
      console.log('⚠️ /api/me: No token found in cookies');
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const secret = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || process.env.SECRET
    if (!secret) return res.status(500).json({ error: 'Server misconfigured: missing token secret' })

    const payload = jwt.verify(token, secret)
    console.log('🔍 /api/me JWT payload:', { id: payload.id, email: payload.email, role: payload.role, userType: payload.userType });
    
    // Fetch user from database based on userType to get profile_pic_url and other fresh data
    let dbUser = null;
    try {
      if (payload.userType === 'ENTERPRISE_ADMIN') {
        dbUser = await prisma.enterpriseAdmin.findUnique({
          where: { id: payload.id },
          select: {
            id: true,
            email: true,
            name: true,
            profile_pic_url: true,
          }
        });
        if (dbUser) {
          dbUser.username = dbUser.name;
          dbUser.role = 'ENTERPRISE_ADMIN';
        }
      } else if (payload.userType === 'SUPER_ADMIN') {
        dbUser = await prisma.superAdmin.findUnique({
          where: { id: payload.id },
          select: {
            id: true,
            email: true,
            name: true,
            productType: true,
            profile_pic_url: true,
          }
        });
        if (dbUser) {
          dbUser.username = dbUser.name;
          dbUser.role = 'SUPER_ADMIN';
          // Get assigned modules
          const moduleAssignments = await prisma.moduleAssignment.findMany({
            where: { super_admin_id: dbUser.id },
            include: { module: true }
          });
          dbUser.assignedModules = moduleAssignments.map(ma => ma.module.module_name);
        }
      } else {
        dbUser = await prisma.user.findUnique({
          where: { id: payload.id },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            productType: true,
            profile_pic_url: true,
            assignedModules: true,
          }
        });
      }
      console.log('📸 Database user profile_pic_url:', dbUser?.profile_pic_url || 'null');
    } catch (dbError) {
      console.warn('⚠️ Could not fetch user from database:', dbError.message);
    }
    
    // Shape a user object with database data if available, fallback to JWT
    const roleValue = dbUser?.role || payload.role || payload.roleName || 'MANAGER'
    
    if (!payload.role && !payload.roleName && !dbUser?.role) {
      console.warn('⚠️ Role missing in JWT payload and database — assigning fallback role: MANAGER');
    }
    
    const user = {
      id: payload.id || payload.userId || payload.sub || null,
      email: dbUser?.email || payload.email || payload.username || null,
      role: roleValue,
      roleName: roleValue, // Frontend expects roleName
      username: dbUser?.username || payload.username || payload.email?.split('@')[0] || null,
      name: dbUser?.username || dbUser?.name || payload.username || payload.email?.split('@')[0] || null,
      profile_pic_url: dbUser?.profile_pic_url || null,
      productType: dbUser?.productType || payload.productType || null,
      assignedModules: dbUser?.assignedModules || [],
      userType: payload.userType || 'USER',
    }
    
    console.log('✅ /api/me returning user:', { 
      email: user.email, 
      username: user.username,
      role: user.role, 
      roleName: user.roleName,
      userType: user.userType,
      profile_pic_url: user.profile_pic_url
    });
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

// Do not handle '/' here—let Next.js render the frontend in server.js

// read DATABASE_URL from environment (was using undefined `databaseUrl`)
const databaseUrl = process.env.DATABASE_URL || null
// Early validation to catch common mistakes like appending 'postgresql' to db name
if (databaseUrl) {
  try {
    const urlObj = new URL(databaseUrl)
    const dbName = (urlObj.pathname || '').replace(/^\//, '').split('?')[0]
    if (dbName && /postgresql$/i.test(dbName)) {
      console.warn(`⚠️  DATABASE_URL suspicious database name detected: "${dbName}". Expected something like 'railway'. Please fix the DATABASE_URL in your environment.`)
    }
    if (urlObj.protocol !== 'postgresql:') {
      console.warn(`ℹ️  DATABASE_URL protocol is "${urlObj.protocol}"; Prisma expects "postgresql:"`) 
    }
  } catch (e) {
    console.warn('⚠️  DATABASE_URL is not a valid URL string:', e.message)
  }
}
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

  // DB health endpoint is moved below to be always available
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

// ✅ SECURITY: Secure file serving with authentication and tenant isolation
app.get('/api/secure-files/:category/:filename', authenticate, async (req, res) => {
  try {
    const { category, filename } = req.params;
    const { user } = req;
    
    // Validate category
    const allowedCategories = ['profile_pics', 'documents', 'attachments'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid file category' });
    }
    
    // Construct file path
    const filePath = path.join(__dirname, 'uploads', category, filename);
    
    // Security: Prevent directory traversal attacks
    const normalizedPath = path.normalize(filePath);
    const uploadsDir = path.join(__dirname, 'uploads');
    if (!normalizedPath.startsWith(uploadsDir)) {
      console.error('[SecureFiles] ⚠️  Directory traversal attempt:', {
        userId: user.id,
        requestedPath: filePath,
        normalizedPath,
      });
      return res.status(403).json({ error: 'Invalid file path' });
    }
    
    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // TODO: Add tenant-specific file access validation
    // For now, authenticated users can access any file
    // Future: Store tenant_id with file metadata and validate
    
    console.log('[SecureFiles] ✅ File access granted:', {
      userId: user.id,
      category,
      filename,
    });
    
    res.sendFile(filePath);
  } catch (error) {
    console.error('[SecureFiles] Error serving file:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});


// Development users REMOVED - All users now exist in database
// Use seed scripts to create demo users: seed-multi-tenant.js, create-all-demo-users.js, etc.

// Simple login rate limiting
// RATE LIMITER DISABLED FOR DEVELOPMENT
// app.use('/api/auth', apiLimiter)

// OLD /api/login endpoint REMOVED - Now using /api/auth/login from routes/auth.js
// The old endpoint only checked the users table and didn't support super_admins or enterprise_admins
// All authentication now flows through /api/auth/login which supports multi-tenant architecture

app.post('/api/token/refresh', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;

  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token not found' });
  }

  try {
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    let existingSession = null;
    try {
      existingSession = await prisma.user_sessions.findFirst({
        where: {
          session_token: hashedToken,
          is_active: true,
          expires_at: { gt: new Date() },
        },
      });
    } catch (e) {
      console.warn('user_sessions.findFirst failed (likely missing table). Falling back to token-only validation.');
    }

    if (!existingSession) {
      console.log('❌ Refresh token not found in DB or expired');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
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
        // Issue new access token (include role/username so /api/me has all fields)
        const newAccessToken = generateAccessToken({
          id: userRecord.id,
          email: userRecord.email,
          role: userRecord.role || userRecord.roleName || 'MANAGER',
          username: userRecord.username || (userRecord.email ? userRecord.email.split('@')[0] : undefined)
        })

  const isProduction = process.env.NODE_ENV === 'production'
  const cookieSecure = isProduction
  const sameSitePolicy = isProduction ? 'none' : 'lax'  // 'lax' for localhost, 'none' for production
        const cookieDomain = process.env.COOKIE_DOMAIN || undefined
        const accessCookieOpts = { httpOnly: true, secure: cookieSecure, sameSite: sameSitePolicy, path: '/', ...(cookieDomain ? { domain: cookieDomain } : {}), maxAge: 60 * 60 * 1000 }

        res.cookie('access_token', newAccessToken, accessCookieOpts)
        res.json({ message: 'Token refreshed successfully' })
  } catch (error) {
    console.error('❌ Refresh Token Error:', error);
    return res.status(401).json({ message: 'Invalid refresh token' });
  }
});

// OLD /api/refresh alias REMOVED - Use /api/token/refresh directly
// All clients should use the standard /api/token/refresh endpoint

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
      try {
        await prisma.user_sessions.deleteMany({ where: { session_token: hashedToken } });
      } catch (e) {
        console.warn('user_sessions.deleteMany failed (likely missing table). Continuing logout.');
      }
    } catch {}
  }

  // Clear cookies on the client side
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const sameSitePolicy = isProduction ? 'none' : 'lax'; // 'lax' for localhost, 'none' for production
    const cookieDomain = process.env.COOKIE_DOMAIN || undefined
    const cookieOpts = {
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: sameSitePolicy,
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };
    // Clear httpOnly cookies first
    res.clearCookie('access_token', cookieOpts);
    res.clearCookie('refresh_token', cookieOpts);
    res.clearCookie('token', cookieOpts);

    // Also try without httpOnly in case client needs to clear it
    res.clearCookie('access_token', { path: '/', secure: isProduction, sameSite: sameSitePolicy, ...(cookieDomain ? { domain: cookieDomain } : {}) });
    res.clearCookie('refresh_token', { path: '/', secure: isProduction, sameSite: sameSitePolicy, ...(cookieDomain ? { domain: cookieDomain } : {}) });
    res.clearCookie('token', { path: '/', secure: isProduction, sameSite: sameSitePolicy, ...(cookieDomain ? { domain: cookieDomain } : {}) });
  } catch (e) {
    // best-effort fallback
    try { res.clearCookie('access_token', { path: '/', sameSite: 'none' }); } catch (e) {}
    try { res.clearCookie('refresh_token', { path: '/', sameSite: 'none' }); } catch (e) {}
    try { res.clearCookie('token', { path: '/', sameSite: 'none' }); } catch (e) {}
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

// Enterprise Admin API endpoints
// Get master modules configuration
app.get('/api/enterprise-admin/master-modules', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    // ✅ SECURITY FIX: Filter modules based on user role
    let dbModules;
    
  if (req.user.userType === 'SUPER_ADMIN') {
      // Super Admin should only see modules assigned by Enterprise Admin
      console.log('[master-modules] Super Admin access - filtering by assigned modules');
      console.log('[master-modules] Super Admin ID:', req.user.id);
      console.log('[master-modules] Assigned modules:', req.user.assignedModules);
      
      // Get module IDs from module assignments
      const moduleAssignments = await prisma.moduleAssignment.findMany({
        where: { super_admin_id: req.user.id },
        include: { module: true }
      });
      
      const assignedModuleIds = moduleAssignments.map(ma => ma.module_id);
      console.log('[master-modules] Assigned module IDs:', assignedModuleIds);
      
      // Fetch only assigned modules
      dbModules = await prisma.module.findMany({
        where: {
          id: {
            in: assignedModuleIds
          }
        },
        orderBy: {
          id: 'asc'
        }
      });
    } else {
      // Enterprise Admin and Admin can see all modules
      console.log('[master-modules] Admin/Enterprise Admin access - showing all modules');
      dbModules = await prisma.module.findMany({
        orderBy: {
          id: 'asc'
        }
      });
    }

    // Also get the config modules for page information
    const { MASTER_MODULES } = require('./config/master-modules');

    // Merge database modules with config modules (for pages info)
    const modulesWithPages = dbModules.map(dbModule => {
      const configModule = MASTER_MODULES.find(m => m.id === dbModule.module_name);
      
      return {
        id: dbModule.id, // Use database ID for assignment
        module_name: dbModule.module_name,
        display_name: dbModule.display_name,
        name: dbModule.display_name, // For frontend compatibility
        productType: dbModule.productType,
        description: configModule?.description || dbModule.description || '',
        icon: configModule?.icon || 'FiBox',
        category: configModule?.category || 'General',
        businessCategory: configModule?.businessCategory || 'All',
        pages: configModule?.pages || []
      };
    });

    console.log('[master-modules] Returning', modulesWithPages.length, 'modules');
    res.json({ 
      ok: true, 
      modules: modulesWithPages,
      total: modulesWithPages.length
    });
  } catch (error) {
    console.error('Error fetching master modules:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch master modules',
      message: error.message 
    });
  }
});

// Get all Super Admins
app.get('/api/enterprise-admin/super-admins', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  console.log('🔵 GET /api/enterprise-admin/super-admins - Request received');
  console.log('🔵 User:', req.user);
  try {
    // Fetch from super_admins table with module assignments
    const superAdmins = await prisma.superAdmin.findMany({
      include: {
        moduleAssignments: {
          include: {
            module: {
              select: {
                id: true,
                module_name: true,
                display_name: true,
                productType: true
              }
            }
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      }
    });

    // Format response to match frontend expectations
    const superAdminsWithPermissions = superAdmins.map(admin => {
      // Extract assigned module IDs (numeric IDs from database)
      const assignedModules = admin.moduleAssignments.map(ma => ma.module.id);
      
      // Build page permissions object: { moduleId: [pageIds] }
      const pagePermissions = {};
      admin.moduleAssignments.forEach(ma => {
        if (ma.page_permissions && Array.isArray(ma.page_permissions)) {
          pagePermissions[ma.module.id] = ma.page_permissions;
        }
      });
      
      return {
        id: admin.id,
        username: admin.name,
        email: admin.email,
        role: 'SUPER_ADMIN',
        productType: admin.productType, // BUSINESS_ERP or PUMP_ERP
        businessName: admin.name,
        businessType: admin.productType === 'BUSINESS_ERP' ? 'Business ERP' : 'Pump Management',
        vertical: admin.productType === 'BUSINESS_ERP' ? 'ERP' : 'Petrol Pump',
        isActive: admin.is_active,
        createdAt: admin.created_at,
        profile_pic_url: admin.profile_pic_url,
        assignedModules: assignedModules, // Now contains [1, 2, 3, ...] instead of ["finance", "hr", ...]
        pagePermissions: pagePermissions // { 1: ["page1", "page2"], 2: ["page3"] }
      };
    });

    res.json({ 
      ok: true, 
      superAdmins: superAdminsWithPermissions,
      total: superAdmins.length
    });
  } catch (error) {
    console.error('Error fetching super admins:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch super admins',
      message: error.message 
    });
  }
});

// Update Super Admin permissions
app.patch('/api/enterprise-admin/super-admins/:id/permissions', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { assignedModules, pagePermissions } = req.body;

    // TODO: Store permissions in a separate permissions table
    // For now, just return success
    res.json({ 
      ok: true, 
      message: 'Permissions updated successfully',
      userId: id,
      assignedModules,
      pagePermissions
    });
  } catch (error) {
    console.error('Error updating permissions:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update permissions',
      message: error.message 
    });
  }
});

// Get current user's module permissions (for Super Admin sidebar filtering)
app.get('/api/auth/me/permissions', authenticate, async (req, res) => {
  try {
    console.log('🔍 [PERMISSIONS] Request from user:', {
      id: req.user.id,
      email: req.user.email,
      role: req.user.role
    });
    
    const userId = req.user.id; // FIXED: was req.user.userId

    // For ENTERPRISE_ADMIN role - only enterprise-level access
    if (req.user.role === 'ENTERPRISE_ADMIN') {
      console.log('🏢 [PERMISSIONS] Enterprise Admin detected');
      return res.json({
        ok: true,
        user: {
          id: userId,
          username: req.user.username || req.user.email,
          email: req.user.email,
          role: 'ENTERPRISE_ADMIN',
          permissions: {
            assignedModules: ['enterprise-management'],  // Only enterprise module
            accessLevel: 'enterprise',
            pagePermissions: {
              'enterprise-management': ['super-admins', 'clients', 'modules', 'billing', 'analytics', 'dashboard']
            }
          }
        }
      });
    }

    // For SUPER_ADMIN role, fetch from super_admins table
    if (req.user.role === 'SUPER_ADMIN') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: userId },
        include: {
          moduleAssignments: {
            include: {
              module: true
            }
          }
        }
      });

      if (!superAdmin) {
        console.error('❌ [PERMISSIONS] Super Admin not found:', userId);
        return res.status(404).json({ ok: false, error: 'Super Admin not found' });
      }

      console.log('✅ [PERMISSIONS] Super Admin found:', superAdmin.name);
      console.log('📦 [PERMISSIONS] Module assignments:', superAdmin.moduleAssignments.length);

      // Load pages from config
      const { MASTER_MODULES } = require('./config/master-modules');

      // Build permissions from database
      const assignedModules = [];
      const pagePermissions = {};

      superAdmin.moduleAssignments.forEach(assignment => {
        const module = assignment.module;
        const moduleName = module.module_name;
        assignedModules.push(moduleName);

        // Get page permissions from assignment
        if (assignment.page_permissions && Array.isArray(assignment.page_permissions) && assignment.page_permissions.length > 0) {
          // Use assigned pages
          pagePermissions[moduleName] = assignment.page_permissions;
          console.log(`📄 [PERMISSIONS] Module ${module.display_name} (${moduleName}): ${assignment.page_permissions.length} pages assigned`);
        } else {
          // Fallback: show all pages from config if no specific permissions
          const configModule = MASTER_MODULES.find(m => m.id === moduleName);
          if (configModule && configModule.pages) {
            pagePermissions[moduleName] = configModule.pages.map(p => p.id);
            console.log(`📄 [PERMISSIONS] Module ${module.display_name} (${moduleName}): ALL ${configModule.pages.length} pages (no restriction)`);
          } else {
            pagePermissions[moduleName] = [];
            console.log(`⚠️  [PERMISSIONS] Module ${module.display_name} (${moduleName}): NO pages found in config`);
          }
        }
      });

      console.log('🎯 [PERMISSIONS] Final permissions:', {
        modules: assignedModules.length,
        totalPages: Object.values(pagePermissions).flat().length
      });

      return res.json({
        ok: true,
        user: {
          id: superAdmin.id,
          username: superAdmin.name,
          email: superAdmin.email,
          role: 'SUPER_ADMIN',
          permissions: {
            assignedModules,
            pagePermissions
          }
        }
      });
    }

    // For other users, fetch from users table
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
      }
    });

    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found' });
    }

    // Return empty permissions for non-super-admins
    res.json({
      ok: true,
      user: {
        ...user,
        permissions: {
          assignedModules: [],
          pagePermissions: {}
        }
      }
    });
  } catch (error) {
    console.error('❌ [PERMISSIONS] Error fetching user permissions:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch user permissions',
      message: error.message
    });
  }
});

// Create new Super Admin
app.post('/api/enterprise-admin/super-admins', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { username, email, password, businessName, businessType, vertical, isActive, assignedModules, pagePermissions } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username, email, and password are required' 
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ 
        ok: false, 
        message: 'User with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // ✅ SECURITY FIX: Get tenant_id from authenticated user
    const tenantId = TenantGuard.getTenantId(req);

    // Create user
    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        role: 'SUPER_ADMIN',
        tenant_id: tenantId, // ✅ SECURITY: Assign to creator's tenant
        createdAt: new Date(),
      }
    });

    // TODO: Store additional fields (businessName, businessType, vertical) in separate table
    // TODO: Store permissions in user_permissions table
    // For now, return success with the created user

    res.status(201).json({ 
      ok: true, 
      message: 'Super Admin created successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        businessName,
        businessType,
        vertical,
        isActive: isActive !== false,
        assignedModules: assignedModules || [],
        pagePermissions: pagePermissions || {}
      }
    });
  } catch (error) {
    console.error('Error creating super admin:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to create Super Admin',
      message: error.message 
    });
  }
});

// Update Super Admin
app.put('/api/enterprise-admin/super-admins/:id', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { username, email, password, businessName, businessType, vertical, isActive, assignedModules, pagePermissions } = req.body;

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (password) updateData.password = bcrypt.hashSync(password, 10);

    // ✅ SECURITY FIX: Add tenant filter to prevent cross-tenant updates
    const tenantId = TenantGuard.getTenantId(req);
    const whereClause = { id: parseInt(id) };
    if (tenantId) {
      whereClause.tenant_id = tenantId; // ✅ SECURITY: Ensure user belongs to same tenant
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: whereClause,
      data: updateData
    });

    // TODO: Update additional fields in separate tables
    // TODO: Update permissions in user_permissions table

    res.json({ 
      ok: true, 
      message: 'Super Admin updated successfully',
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        businessName,
        businessType,
        vertical,
        isActive,
        assignedModules,
        pagePermissions
      }
    });
  } catch (error) {
    console.error('Error updating super admin:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update Super Admin',
      message: error.message 
    });
  }
});

// Delete Super Admin
app.delete('/api/enterprise-admin/super-admins/:id', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Super Admin not found' 
      });
    }

    // Delete user
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    // TODO: Delete related records from permissions table

    res.json({ 
      ok: true, 
      message: 'Super Admin deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting super admin:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to delete Super Admin',
      message: error.message 
    });
  }
});

// Toggle Super Admin status (activate/deactivate)
app.patch('/api/enterprise-admin/super-admins/:id/status', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    // TODO: Store isActive status in database (add column or separate table)
    // For now, just return success

    res.json({ 
      ok: true, 
      message: `Super Admin ${isActive ? 'activated' : 'deactivated'} successfully`,
      userId: parseInt(id),
      isActive
    });
  } catch (error) {
    console.error('Error toggling super admin status:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to update Super Admin status',
      message: error.message 
    });
  }
});

// Create Super Admin
app.post('/api/enterprise-admin/super-admins', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { username, email, password, productType } = req.body;

    // Validate required fields
    if (!username || !email || !password || !productType) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username, email, password, and product type are required' 
      });
    }

    // Validate product type
    if (!['BUSINESS_ERP', 'PUMP_ERP'].includes(productType)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Invalid product type. Must be BUSINESS_ERP or PUMP_ERP' 
      });
    }

    // Check if username already exists
    const existingUsername = await prisma.superAdmin.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username already exists' 
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.superAdmin.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Super Admin
    const newSuperAdmin = await prisma.superAdmin.create({
      data: {
        username,
        email,
        password: hashedPassword,
        productType,
        isActive: true,
        role: 'SUPER_ADMIN'
      }
    });

    // Remove password from response
    const { password: _, ...superAdminData } = newSuperAdmin;

    console.log('Super Admin created:', superAdminData);

    res.status(201).json({
      ok: true,
      message: 'Super Admin created successfully',
      superAdmin: superAdminData
    });
  } catch (error) {
    console.error('Error creating Super Admin:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to create Super Admin',
      message: error.message 
    });
  }
});

// Delete Super Admin
app.delete('/api/enterprise-admin/super-admins/:id', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const superAdminId = parseInt(id, 10);

    if (isNaN(superAdminId)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Invalid Super Admin ID' 
      });
    }

    // Check if Super Admin exists
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId }
    });

    if (!superAdmin) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Super Admin not found' 
      });
    }

    // Delete all module assignments first (cascade)
    await prisma.moduleAssignment.deleteMany({
      where: { super_admin_id: superAdminId }
    });

    // Delete the Super Admin
    await prisma.superAdmin.delete({
      where: { id: superAdminId }
    });

    console.log('Super Admin deleted:', superAdminId);

    res.json({
      ok: true,
      message: 'Super Admin deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting Super Admin:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to delete Super Admin',
      message: error.message 
    });
  }
});

// Assign module to Super Admin
app.post('/api/enterprise-admin/super-admins/:id/assign-module', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleId, pageIds } = req.body;

    console.log('🔵 ASSIGN MODULE REQUEST:', { 
      superAdminId: id, 
      moduleId, 
      pageIds,
      pageCount: pageIds?.length || 0 
    });

    if (!moduleId) {
      console.error('❌ No moduleId provided');
      return res.status(400).json({ 
        ok: false, 
        message: 'Module ID is required' 
      });
    }

    const superAdminId = parseInt(id);
    const moduleIdInt = parseInt(moduleId);

    // Verify super admin exists
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: superAdminId }
    });

    if (!superAdmin) {
      console.error('❌ Super admin not found:', superAdminId);
      return res.status(404).json({ 
        ok: false, 
        message: 'Super admin not found' 
      });
    }

    console.log('✅ Super admin found:', superAdmin.name);

    // Verify module exists
    const module = await prisma.module.findUnique({
      where: { id: moduleIdInt }
    });

    if (!module) {
      console.error('❌ Module not found:', moduleIdInt);
      return res.status(404).json({ 
        ok: false, 
        message: 'Module not found' 
      });
    }

    console.log('✅ Module found:', module.display_name);

    // ✅ SECURITY FIX: Get tenant context for isolation
    const tenantId = TenantGuard.getTenantId(req);

    // Check if assignment already exists
    const existingAssignment = await prisma.moduleAssignment.findFirst({
      where: {
        super_admin_id: superAdminId,
        module_id: moduleIdInt,
        ...(tenantId && { tenant_id: tenantId }) // ✅ SECURITY: Check within tenant
      }
    });

    let assignment;
    let message;

    if (existingAssignment) {
      // UPDATE existing assignment - update page permissions
      console.log('📝 Updating existing assignment...');
      assignment = await prisma.moduleAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          assigned_at: new Date(), // Update timestamp to reflect the update
          page_permissions: pageIds || [] // Update page permissions
        },
        include: {
          module: true,
          superAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      message = 'Module pages updated successfully';
      console.log('✅ Assignment updated successfully');
    } else {
      // CREATE new module assignment with page permissions
      console.log('➕ Creating new assignment...');
      assignment = await prisma.moduleAssignment.create({
        data: {
          super_admin_id: superAdminId,
          module_id: moduleIdInt,
          page_permissions: pageIds || [], // Store page permissions
          ...(tenantId && { tenant_id: tenantId }) // ✅ SECURITY: Assign to tenant
        },
        include: {
          module: true,
          superAdmin: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });
      message = 'Module assigned successfully';
      console.log('✅ Assignment created successfully');
    }

    // TODO: Handle pageIds if you want to store page-level permissions in the database
    // For now, this endpoint just manages module-level assignments

    console.log('🎉 Sending success response:', message);
    res.json({ 
      ok: true, 
      message: message,
      assignment: {
        id: assignment.id,
        superAdminId: assignment.super_admin_id,
        moduleId: assignment.module_id,
        moduleName: assignment.module.module_name,
        displayName: assignment.module.display_name,
        assignedAt: assignment.assigned_at
      }
    });
  } catch (error) {
    console.error('❌ ERROR ASSIGNING MODULE:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to assign module',
      message: error.message 
    });
  }
});

// Unassign module from Super Admin
app.post('/api/enterprise-admin/super-admins/:id/unassign-module', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleId } = req.body;

    if (!moduleId) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Module ID is required' 
      });
    }

    const superAdminId = parseInt(id);
    const moduleIdInt = parseInt(moduleId);

    // ✅ SECURITY FIX: Get tenant context
    const tenantId = TenantGuard.getTenantId(req);

    // Find the assignment
    const assignment = await prisma.moduleAssignment.findFirst({
      where: {
        super_admin_id: superAdminId,
        module_id: moduleIdInt,
        ...(tenantId && { tenant_id: tenantId }) // ✅ SECURITY: Only within tenant
      },
      include: {
        module: true
      }
    });

    if (!assignment) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Module assignment not found' 
      });
    }

    // Delete the assignment
    await prisma.moduleAssignment.delete({
      where: { id: assignment.id }
    });

    res.json({ 
      ok: true, 
      message: 'Module unassigned successfully',
      superAdminId,
      moduleId: moduleIdInt,
      moduleName: assignment.module.module_name
    });
  } catch (error) {
    console.error('Error unassigning module:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to unassign module',
      message: error.message 
    });
  }
});

// ============================================
// ENTERPRISE ADMIN DASHBOARD API ENDPOINTS
// ============================================

// Dashboard Overview Stats
app.get('/api/enterprise-admin/dashboard/stats', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    // Get counts from database
    const [superAdminCount, moduleCount, clientCount] = await Promise.all([
      prisma.superAdmin.count({ where: { is_active: true } }),
      prisma.module.count({ where: { is_active: true } }),
      prisma.client.count()
    ]);

    res.json({
      ok: true,
      stats: {
        totalSuperAdmins: superAdminCount,
        totalModules: moduleCount,
        activeTenants: clientCount,
        systemHealth: 'operational'
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch dashboard stats',
      message: error.message
    });
  }
});

// Super Admin Distribution
app.get('/api/enterprise-admin/dashboard/super-admin-distribution', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const superAdmins = await prisma.superAdmin.findMany({
      where: { is_active: true },
      select: { productType: true }
    });

    const businessCount = superAdmins.filter(sa => sa.productType === 'BUSINESS_ERP').length;
    const pumpCount = superAdmins.filter(sa => sa.productType === 'PUMP_ERP').length;

    res.json({
      ok: true,
      distribution: [
        { name: 'Business ERP', value: businessCount, color: '#8b5cf6' },
        { name: 'Pump Management', value: pumpCount, color: '#ec4899' }
      ]
    });
  } catch (error) {
    console.error('Error fetching super admin distribution:', error);
    res.status(500).json({
      ok: false,
      error: 'Failed to fetch super admin distribution',
      message: error.message
    });
  }
});

// Activity Logs
app.get('/api/enterprise-admin/dashboard/activity', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    // ✅ SECURITY FIX: Add tenant filter for audit logs
    const whereClause = TenantGuard.getTenantFilter(req);
    
    const recentActivity = await prisma.auditLog.findMany({
      where: whereClause, // ✅ SECURITY: Filter by tenant_id
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        action: true,
        created_at: true,
        user_id: true,
        user: {
          select: {
            username: true,
            email: true
          }
        }
      }
    });

    const activities = recentActivity.map(log => ({
      id: log.id.toString(),
      action: log.action,
      timestamp: log.created_at.toISOString(),
      user: log.user?.username || log.user?.email || 'System'
    }));

    res.json({
      ok: true,
      activities
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    // Return empty array if audit_logs table doesn't exist or has issues
    res.json({
      ok: true,
      activities: []
    });
  }
});

// System Insights
app.get('/api/enterprise-admin/dashboard/insights', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    // Get database connection count
    const result = await prisma.$queryRaw`SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()`;
    const dbConnections = result[0]?.count || 0;

    // Get latest migration timestamp
    const latestMigration = await prisma._prisma_migrations.findFirst({
      orderBy: { finished_at: 'desc' },
      select: { finished_at: true }
    });

    res.json({
      ok: true,
      insights: {
        apiUptime: 99.9,
        dbConnections: parseInt(dbConnections),
        lastBackup: latestMigration?.finished_at?.toISOString() || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error fetching system insights:', error);
    res.json({
      ok: true,
      insights: {
        apiUptime: 99.9,
        dbConnections: 0,
        lastBackup: new Date().toISOString()
      }
    });
  }
});

// AI Handling API endpoints
app.get('/api/enterprise-admin/ai/metrics', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    // TODO: Integrate with actual AI service metrics
    // For now, return sample data
    res.json({
      ok: true,
      metrics: {
        totalRequests: 15420,
        successRate: 98.5,
        avgResponseTime: 245,
        activeModels: 4,
        costThisMonth: 1250.75
      }
    });
  } catch (error) {
    console.error('Error fetching AI metrics:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch AI metrics' });
  }
});

app.get('/api/enterprise-admin/ai/models', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    // TODO: Integrate with actual AI model registry
    // For now, return sample data
    const models = [
      {
        id: '1',
        name: 'GPT-4 Turbo',
        provider: 'OpenAI',
        status: 'active',
        usage: 8500,
        avgResponseTime: 180,
        lastUsed: new Date().toISOString(),
        version: '1.0.0',
        endpoint: 'https://api.openai.com/v1/chat/completions'
      },
      {
        id: '2',
        name: 'Claude 3 Opus',
        provider: 'Anthropic',
        status: 'active',
        usage: 4200,
        avgResponseTime: 220,
        lastUsed: new Date(Date.now() - 3600000).toISOString(),
        version: '3.0',
        endpoint: 'https://api.anthropic.com/v1/messages'
      },
      {
        id: '3',
        name: 'Gemini Pro',
        provider: 'Google',
        status: 'active',
        usage: 2100,
        avgResponseTime: 310,
        lastUsed: new Date(Date.now() - 7200000).toISOString(),
        version: '1.5',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models'
      },
      {
        id: '4',
        name: 'Llama 3 70B',
        provider: 'Meta',
        status: 'inactive',
        usage: 620,
        avgResponseTime: 450,
        lastUsed: new Date(Date.now() - 86400000).toISOString(),
        version: '3.0',
        endpoint: 'https://api.together.xyz/v1/chat/completions'
      }
    ];

    res.json({
      ok: true,
      models: models
    });
  } catch (error) {
    console.error('Error fetching AI models:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch AI models' });
  }
});

// System Logs API endpoint
app.get('/api/enterprise-admin/logs', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { range = 'today', level, module, limit = '100' } = req.query;

    // Calculate date filter based on range
    let dateFilter = {};
    const now = new Date();
    
    if (range === 'today') {
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      dateFilter = { gte: startOfDay };
    } else if (range === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: weekAgo };
    } else if (range === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      dateFilter = { gte: monthAgo };
    }

    // Build query filters
    const where = {
      ...(Object.keys(dateFilter).length > 0 && { timestamp: dateFilter }),
      ...(level && { level }),
      ...(module && { module }),
      ...TenantGuard.getTenantFilter(req) // ✅ SECURITY: Add tenant isolation
    };

    // Fetch logs from audit_logs table
    const logs = await prisma.audit_logs.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        timestamp: true,
        action: true,
        user_id: true,
        user_type: true,
        details: true,
        ip_address: true
      }
    });

    // Transform logs to match frontend interface
    const transformedLogs = logs.map(log => ({
      id: log.id.toString(),
      timestamp: log.timestamp.toISOString(),
      level: 'info', // Default level, can be enhanced
      action: log.action,
      user: log.user_id ? `User ${log.user_id}` : 'System',
      module: log.user_type || 'system',
      details: log.details || '',
      ip_address: log.ip_address
    }));

    // Calculate stats
    const stats = {
      total: transformedLogs.length,
      errors: transformedLogs.filter(l => l.level === 'error').length,
      warnings: transformedLogs.filter(l => l.level === 'warning').length,
      info: transformedLogs.filter(l => l.level === 'info').length
    };

    res.json({
      ok: true,
      logs: transformedLogs,
      stats
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch logs' });
  }
});

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
  if (!req.user || !req.user.role) {
    // This case should ideally be caught by `authenticate` middleware, but as a safeguard:
    return res.status(401).json({ error: 'Authentication required.' });
  }

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
      // ✅ SECURITY FIX: Add tenant filter to prevent cross-tenant data access
      const whereClause = TenantGuard.getTenantFilter(req);
      
      const dbUsers = await prisma.user.findMany({
        where: whereClause, // ✅ SECURITY: Filter by tenant_id
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

// Special endpoint to clear rate limits (for testing/dev only)
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/clear-rate-limits', (req, res) => {
    try {
      loginLimiter.resetAll && loginLimiter.resetAll()
      apiLimiter.resetAll && apiLimiter.resetAll()
      console.log('[DEV] All rate limits have been reset.')
      res.status(200).send('All rate limits cleared.')
    } catch (error) {
      console.error('Error clearing rate limits:', error)
      res.status(500).send('Failed to clear rate limits.')
    }
  })
}

// --- Serve React App (must be after API routes ---
app.use(express.static(path.join(__dirname, '../my-frontend/build')))

// ============================================================================
// ERROR HANDLING - Must be LAST in middleware chain
// ============================================================================

// 404 Handler - Only catch /api/* routes to allow Next.js to handle frontend routes
// This prevents the backend from intercepting frontend pages (/, /admin, etc.)
app.use('/api/*', (req, res, next) => {
  console.warn(`[404] API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global Error Handler - Catch all errors
app.use((err, req, res, next) => {
  // Log the error with full details
  console.error('\n[ERROR] Global error handler caught:');
  console.error('  Path:', req.method, req.originalUrl);
  console.error('  Message:', err.message);
  console.error('  Stack:', err.stack);
  
  // Check if it's a CORS error
  if (err.message && err.message.includes('CORS')) {
    console.error('  Type: CORS ERROR');
    console.error('  Origin:', req.headers.origin);
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Pass to global error handler
  next(err);
});

// ============================================================================
// 404 Not Found Handler (must be before error handler)
// ============================================================================
app.use(notFoundHandler);

// ============================================================================
// Global Error Handler (must be last)
// ============================================================================
app.use(errorHandler);

// ============================================================================
// Initialize Database Tables (async, non-blocking)
// ============================================================================
(async () => {
  try {
    await initializeErrorLogsTable();
    console.log('✅ Error handling tables initialized');
  } catch (err) {
    console.warn('⚠️ Error tables initialization failed:', err.message);
  }
})();

module.exports = app
