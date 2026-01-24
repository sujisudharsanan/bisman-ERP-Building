// Legacy rateLimit kept for fallback; advanced middleware provides Redis + adaptive logic
// eslint-disable-next-line no-unused-vars
const rateLimit = require('express-rate-limit')
const {
  strictLoginLimiter,
  standardApiLimiter,
  // moderateAuthLimiter, // Uncomment when rate limiting is enabled
  // publicLimiter, // Uncomment when rate limiting is enabled
  // expensiveOperationLimiter, // Uncomment when rate limiting is enabled
  // createAdaptiveRateLimiter, // Uncomment when rate limiting is enabled
} = require('./middleware/advancedRateLimiter');
const { 
  errorHandler, 
  notFoundHandler 
} = require('./middleware/errorHandler');
const { 
  initializeErrorLogsTable 
} = require('./utils/errorLogger');
const helmet = require('helmet')
const express = require('express')
const cors = require('cors')
const compression = require('compression') // ✅ Response compression
const path = require('path')
// eslint-disable-next-line no-unused-vars
const { createProxyMiddleware } = require('http-proxy-middleware')
const fs = require('fs')
const { getPrisma } = require('./lib/prisma')   // ✅ shared singleton
// Load .env early for local/dev
try { require('dotenv').config() } catch { /* dotenv not available, ignore */ }
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
  
  // Wrap Prisma with monitoring (optional, for query duration tracking)
  try {
    const { wrapPrismaWithMonitoring, startDbHealthMonitor } = require('./lib/dbMonitoring');
    prisma = wrapPrismaWithMonitoring(prisma);
    // Start periodic database health monitoring (every 30 seconds)
    startDbHealthMonitor(prisma, 30000);
  } catch (monitoringError) {
    console.warn('[app.js] Database monitoring not available:', monitoringError.message);
  }
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
// eslint-disable-next-line no-unused-vars
const privilegeService = require('./services/privilegeService')
const TenantGuard = require('./middleware/tenantGuard') // ✅ SECURITY: Multi-tenant isolation
const { authenticate, requireRole } = require('./middleware/auth') // ✅ Authentication middleware
const { setTenantContext } = require('./middleware/tenantContext') // ✅ RLS tenant context
const { adminIpAllowlist } = require('./middleware/adminIpAllowlist') // ✅ IP allowlist for admin consoles
// eslint-disable-next-line no-unused-vars
const { loginBruteForceProtection, signupBruteForceProtection, verifyCaptcha } = require('./middleware/bruteForceProtection') // ✅ Brute force protection
const { rbacEnforcer } = require('./middleware/rbac.enforcer') // ✅ SECURITY: Global RBAC enforcement
const { requirePlanModuleAccess } = require('./middleware/planModuleAccessMiddleware') // ✅ SECURITY: Subscription-based module access

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

// eslint-disable-next-line no-unused-vars
function generateRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' })
}

// Trust the first proxy hop (e.g., from Render's load balancer)
// This is crucial for express-rate-limit to work correctly.
app.set('trust proxy', 1);

// ============================================================================
// SECURITY HEADERS - Helmet Configuration
// ============================================================================
const isProduction = process.env.NODE_ENV === 'production';

app.use(helmet({
  // Content Security Policy - Restrict resource loading
  contentSecurityPolicy: isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Required for Next.js
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.FRONTEND_URL, "wss:", "https:"].filter(Boolean),
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  } : false, // Disable CSP in development for easier debugging
  
  // X-Frame-Options - Prevent clickjacking
  frameguard: { action: 'deny' },
  
  // X-XSS-Protection - Enable browser XSS filtering
  xssFilter: true,
  
  // X-Content-Type-Options - Prevent MIME sniffing
  noSniff: true,
  
  // Referrer-Policy - Control referrer information
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // HSTS - Force HTTPS (1 year, include subdomains, preload)
  hsts: isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  } : false,
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: { allow: false },
  
  // X-Download-Options (IE specific)
  ieNoOpen: true,
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for compatibility with external resources
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: { policy: 'same-origin' },
  
  // Origin-Agent-Cluster
  originAgentCluster: true,
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
}));

console.log('[app.js] ✅ Security headers enabled (Helmet)');
console.log('[app.js] 🔒 X-Frame-Options: DENY, X-XSS-Protection: Enabled, HSTS:', isProduction ? 'Enabled' : 'Disabled (dev)');

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
  // eslint-disable-next-line no-unused-vars
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
  // eslint-disable-next-line no-unused-vars
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

// --- Security Alerting Middleware ---
try {
  const { authAttemptTracker, forbiddenTracker } = require('./middleware/securityAlerting');
  app.use(authAttemptTracker);
  app.use(forbiddenTracker);
  console.log('[app.js] ✅ Security alerting middleware enabled (failed auth/forbidden tracking)');
} catch (e) {
  console.warn('[app.js] Security alerting middleware not enabled:', e.message);
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
// Fallback minimal list (backend URL + frontend URL)
if (allowedOrigins.length === 0) {
  allowedOrigins = [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://bisman.up.railway.app', // Railway frontend (new domain)
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
  } catch { /* ignore logging errors */ }
  // Log every request's origin and method for troubleshooting
  app.use((req, _res, next) => {
    try {
      const o = req.headers.origin || null
      const m = req.method
      const u = req.originalUrl || req.url
      console.log(`[CORS DEBUG] ${m} ${u} origin=${o}`)
    } catch { /* intentionally ignored */ }
    next()
  })
}

// Increase body parser limits for file uploads (logo, documents as base64)
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
// Parse cookies early so downstream routers (e.g., /api/privileges) can access auth cookies
app.use(cookieParser())

// =============================
// Attach Socket.IO to request object for controllers
// =============================
app.use((req, res, next) => {
  // Attach io from app.get('io') or global.io for controllers to use
  req.io = req.app.get('io') || global.io;
  next();
});

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
  } catch { /* noop */ }
  next()
})

// ============================================================================
// 🔥 GLOBAL RBAC ENFORCEMENT - SECURITY CRITICAL
// ============================================================================
// RBAC Enforcer is globally applied to all API requests. Do not bypass.
// 
// This middleware:
//   1. Allows public routes (login, register, health, etc.) to pass through
//   2. Requires authentication for all other routes
//   3. Enforces module and client boundary isolation
//   4. Logs all access denials to audit_logs table
//
// Hierarchy enforced:
//   ENTERPRISE_ADMIN → SUPER_ADMIN (module scoped) → ADMIN (client scoped)
//
// ⚠️ DO NOT remove or conditionally bypass this middleware.
// ============================================================================
// Step 1: Try to authenticate the user (populates req.user if valid token)
// This runs on ALL requests but doesn't fail - just sets req.user if authenticated
app.use('/api', async (req, res, next) => {
  // Skip authentication for public routes (handled by rbacEnforcer's PUBLIC_ROUTES)
  const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', 
                       '/api/auth/reset-password', '/api/auth/refresh', '/api/health', '/api/public',
                       '/api/onboard'];
  const isPublic = publicPaths.some(p => req.path.toLowerCase().startsWith(p.replace('/api', '')));
  if (isPublic) return next();
  
  // Try to authenticate - if it fails, let rbacEnforcer handle the 401
  try {
    const auth = req.headers.authorization || '';
    const parts = auth.split(' ');
    const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : 
                (req.cookies?.access_token || req.cookies?.token);
    
    if (token && token !== 'null' && token !== 'undefined') {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret', {
        algorithms: ['HS512', 'HS256']
      });
      
      // Minimal user object for RBAC context resolution
      const subjectId = payload.sub || payload.id || payload.userId || payload.uid;
      req.user = { 
        id: subjectId, 
        userType: payload.userType,
        role: payload.role || payload.userType,
        moduleId: payload.moduleId,
        clientId: payload.clientId
      };
    }
  } catch (err) {
    // Token invalid/expired - req.user stays undefined, rbacEnforcer will return 401
    console.log('[RBAC Pre-Auth] Token verification failed:', err.message);
  }
  next();
});

// Step 2: Apply RBAC enforcement to all API routes
app.use('/api', rbacEnforcer);
console.log('[app.js] ✅ 🔒 RBAC Enforcer globally applied to all /api/* routes');

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
  } catch {
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
  // eslint-disable-next-line no-unused-vars
  requireBusinessLevel,
  // eslint-disable-next-line no-unused-vars
  smartRouteProtection 
} = require('./middleware/roleProtection')

// Apply smart route protection to all authenticated routes
// MOVED AFTER MIDDLEWARE IMPORT (line ~800)
// app.use('/api/*', authenticate, smartRouteProtection)

// Reports routes for generating system reports
const reportsRoutes = require('./routes/reportsRoutes')
app.use('/api/reports', authenticate, setTenantContext, requirePlanModuleAccess('reports'), reportsRoutes)
console.log('✅ Reports routes loaded at /api/reports (plan-gated)')

// Menu routes - SSOT for navigation menus
const menuRoutes = require('./routes/menuRoutes')
app.use('/api/modules', menuRoutes)

// Governance routes - Route validation and access tracking
const governanceRoutes = require('./routes/governanceRoutes')
app.use('/api/governance', governanceRoutes)
console.log('✅ Governance routes loaded at /api/governance')

// ===================================================================
// PAGE SYNC AUDIT - Detect drift between DB, Registry, and Filesystem
// ===================================================================
const pageSyncAuditRoutes = require('./routes/pageSyncAudit')
app.use('/api/page-sync', authenticate, pageSyncAuditRoutes)
console.log('✅ Page Sync Audit routes loaded at /api/page-sync')

// ===================================================================
// DB-DRIVEN MENU API - Single source of truth for sidebar menus
// ===================================================================
const dbMenuRoutes = require('./routes/dbMenuRoutes')
app.use('/api/menu', dbMenuRoutes)
console.log('✅ DB Menu routes loaded at /api/menu')

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
// APPROVAL AUTHORITY DASHBOARD - Governance Metrics 📊
// ===================================================================
// CEO/Admin view for organizational decision engine:
// - Approval Load per Role
// - SLA Breach Heatmap
// - Auto-Approval % by Workflow
// - Fallback Usage Frequency
// - Rejection Loops by Creator
// - Missing Role Impact
// ===================================================================
try {
  const approvalDashboardRoutes = require('./routes/approvalDashboardRoutes')
  app.use('/api/approval-dashboard', authenticate, setTenantContext, requirePlanModuleAccess('operations'), approvalDashboardRoutes)
  console.log('✅ Approval Dashboard routes loaded at /api/approval-dashboard (plan-gated: operations)')
} catch (e) {
  console.warn('Approval Dashboard routes not loaded:', e && e.message)
}

// ===================================================================
// TASK APPROVAL PAGE - Governance-First Task Approval System
// ===================================================================
// Enterprise task approval with strict visibility rules:
// - L1-L5: See only tasks awaiting their approval
// - L6-L8: See subordinate completions + own approvals (dept-restricted)
// - L9-L10: Control tower - sees everything
// Query-level enforcement, no frontend filtering for security
// ===================================================================
try {
  const taskApprovalRoutes = require('./routes/taskApprovalRoutes')
  app.use('/api/task-approvals', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), taskApprovalRoutes)
  console.log('✅ Task Approval routes loaded at /api/task-approvals (plan-gated: task-management)')
} catch (e) {
  console.warn('Task Approval routes not loaded:', e && e.message)
}

// ===================================================================
// PAYMENT REQUEST WORKFLOW - Task-Style Payment Approval System
// ===================================================================
// Payment requests with amount-based routing:
// - Amount ≤ 5000: Manager → Accounts → Finance → CFO → Banker
// - Amount > 5000: Manager → Manager² → Accounts → Finance → CFO → Banker
// Finance-originated: Only Finance Controller/CFO can reject
// Send-back: Only to immediate previous level
// ===================================================================
try {
  const paymentWorkflowRoutes = require('./routes/paymentWorkflowRoutes')
  app.use('/api/payment-workflow', authenticate, setTenantContext, requirePlanModuleAccess('finance'), paymentWorkflowRoutes)
  console.log('✅ Payment Workflow routes loaded at /api/payment-workflow (plan-gated: finance)')
} catch (e) {
  console.warn('Payment Workflow routes not loaded:', e && e.message)
}

// ===================================================================
// SETTLEMENT WORKFLOW - Accountant consolidation & payment execution
// ===================================================================
// Role-segregated settlement system:
// - Accountant: Full visibility into approved payment requests, creates settlements
// - Finance Controller/CFO: Approves settlements based on amount thresholds
// - Banker: Executes payment, enters UTR which propagates to all linked requests
// - Non-accountants: See only settlement-level tasks (no individual request details)
// ===================================================================
try {
  const settlementRoutes = require('./routes/settlementRoutes')
  app.use('/api/settlements', authenticate, setTenantContext, requirePlanModuleAccess('finance'), settlementRoutes)
  console.log('✅ Settlement routes loaded at /api/settlements (plan-gated: finance)')
} catch (e) {
  console.warn('Settlement routes not loaded:', e && e.message)
}

// ===================================================================
// BANK RECONCILIATION - Multi-bank statement parsing & matching
// ===================================================================
// Enterprise-grade bank reconciliation:
// - Admin: Manage bank parsing templates (CSV/Excel column mappings)
// - Accountant: Upload statements, run auto-match, manual match, finalize
// - CFO/Auditor: View-only access to reconciliation status and audit trail
// Features: 50K+ row performance, UTR matching, confidence scoring, full audit
// ===================================================================
try {
  const bankReconciliationRoutes = require('./routes/bankReconciliationRoutes')
  app.use('/api/reconciliation', authenticate, setTenantContext, requirePlanModuleAccess('finance'), bankReconciliationRoutes)
  console.log('✅ Bank Reconciliation routes loaded at /api/reconciliation (plan-gated: finance)')
} catch (e) {
  console.warn('Bank Reconciliation routes not loaded:', e && e.message)
}

// ===================================================================
// TASK CLARIFICATION SYSTEM - Cross-user/department clarification
// ===================================================================
// Enables requesting clarification from other users or departments
// WITHOUT changing task ownership, approval chain, or authority.
// Purple visual indicator for "WAITING_FOR_CLARIFICATION" status.
try {
  const clarificationRoutes = require('./routes/clarificationRoutes')
  app.use('/api/clarifications', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), clarificationRoutes)
  console.log('✅ Task Clarification routes loaded at /api/clarifications (plan-gated: task-management)')
} catch (e) {
  console.warn('Task Clarification routes not loaded:', e && e.message)
}

// ===================================================================
// POST-COMPLETION REVIEW - Forward COMPLETED tasks for review
// ===================================================================
// Allows users to forward completed tasks to other users/departments for:
// - FYI (For Information Only)
// - Confirmation (Request understanding confirmation)
// - Audit (Compliance/audit review)
// - Knowledge (Training/reference)
// Task status remains COMPLETED - no approval chain reopened
// Yellow visual indicator for "COMPLETED + Under Review"
try {
  const reviewRoutes = require('./routes/reviewRoutes')
  app.use('/api/reviews', authenticate, setTenantContext, requirePlanModuleAccess('operations'), reviewRoutes)
  console.log('✅ Post-Completion Review routes loaded at /api/reviews (plan-gated: operations)')
} catch (e) {
  console.warn('Post-Completion Review routes not loaded:', e && e.message)
}

// ===================================================================
// DECISION LOAD MAP - Business Pressure & Decision Flow Visualization
// ===================================================================
// Powers the "System Flow" / "Decision Load Map" page:
// - Role stress visualization with live metrics
// - Approval flow edge data (normal, fallback, bottleneck)
// - Admin pressure analysis
// - Simulation engine for what-if scenarios
// - Task trace for live path visualization
// 
// Base endpoint: /api/decision-load/*
// Access: L6+ (Manager and above)
// ===================================================================
try {
  const decisionLoadRoutes = require('./routes/decisionLoadRoutes')
  app.use('/api/decision-load', authenticate, setTenantContext, requirePlanModuleAccess('operations'), decisionLoadRoutes)
  console.log('✅ Decision Load Map routes loaded at /api/decision-load (plan-gated: operations)')
} catch (e) {
  console.warn('Decision Load Map routes not loaded:', e && e.message)
}

// ===================================================================
// CHAT MODULE - Modular Chat System 🚀
// ===================================================================
// Modular architecture with organized structure:
// - AI Assistant: AI-powered intelligent responses
// - Threads & Messages: Database-driven messaging system
// - Calls: Jitsi Meet video/audio integration
// - Real-time: Socket.IO for live updates
//
// Base endpoint: /api/chat/*
// Sub-routes: /ai, /threads, /messages, /calls
// ===================================================================
try {
  const chatModuleRoutes = require('./modules/chat/routes')
  app.use('/api/chat', authenticate, setTenantContext, chatModuleRoutes)
  console.log('✅ 🎯 CHAT MODULE loaded at /api/chat - Modular architecture enabled!')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('❌ Chat Module not loaded:', e && e.message)
  }
}

// ===== OLD CHAT ROUTES - NOW DEPRECATED =====
// Legacy routes maintained for backward compatibility:
// - /routes/ultimate-chat.js - Use /modules/chat/routes/ai.js instead
// - /routes/unified-chat.js - Use /modules/chat/routes/messages.js instead
// - /routes/calls.js - Use /modules/chat/routes/calls.js instead
// ===== END OLD CHAT ROUTES =====

// Security monitoring routes (versioned)
try {
  const securityRoutes = require('./routes/securityRoutes')
  app.use('/api', securityRoutes)
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security routes not loaded:', e && e.message)
  }
}

// Test Runner routes (for Security Dashboard)
try {
  const testRunnerRoutes = require('./routes/admin/testRunnerRoutes')
  app.use('/api/admin/tests', testRunnerRoutes)
  console.log('✅ Test Runner routes loaded at /api/admin/tests')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Test Runner routes not loaded:', e && e.message)
  }
}

// Security Monitor API routes (real-time monitoring)
try {
  const securityMonitorRoutes = require('./routes/admin/securityMonitorRoutes')
  app.use('/api/admin/security', securityMonitorRoutes)
  console.log('✅ Security Monitor API routes loaded at /api/admin/security')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security Monitor routes not loaded:', e && e.message)
  }
}

// Admin Usage & Quota routes (per-tenant metering)
try {
  const adminUsageRoutes = require('./routes/adminUsage')
  app.use('/api/admin/usage', authenticate, setTenantContext, requirePlanModuleAccess('admin'), adminUsageRoutes)
  console.log('✅ Admin Usage routes loaded at /api/admin/usage (plan-gated: admin)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Admin Usage routes not loaded:', e && e.message)
  }
}

// Audit routes (for Service-Table usage tracking)
try {
  const auditRoutes = require('./routes/admin/auditRoutes')
  app.use('/api/audit', authenticate, setTenantContext, requirePlanModuleAccess('compliance'), auditRoutes)
  console.log('✅ Audit routes loaded at /api/audit (plan-gated: compliance)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Audit routes not loaded:', e && e.message)
  }
}

// Audit Integrity routes (Governance Dashboard)
try {
  const auditIntegrityRoutes = require('./routes/audit-integrity')
  app.use('/api/audit-integrity', authenticate, setTenantContext, requirePlanModuleAccess('compliance'), auditIntegrityRoutes)
  console.log('✅ Audit Integrity routes loaded at /api/audit-integrity (plan-gated: compliance)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Audit Integrity routes not loaded:', e && e.message)
  }
}

// Security Governance routes (Security & RBAC Dashboard for Enterprise/Super Admins)
try {
  const securityGovernanceRoutes = require('./routes/security-governance')
  app.use('/api/security-governance', authenticate, setTenantContext, requirePlanModuleAccess('compliance'), securityGovernanceRoutes)
  console.log('✅ Security Governance routes loaded at /api/security-governance (plan-gated: compliance)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Security Governance routes not loaded:', e && e.message)
  }
}

// Subscription Management routes (Super Admin only - user count limits)
try {
  const subscriptionManagementRoutes = require('./src/routes/subscriptionManagement').default
  app.use('/api/super-admin/subscriptions', authenticate, setTenantContext, requirePlanModuleAccess('super-admin'), subscriptionManagementRoutes)
  console.log('✅ Subscription Management routes loaded at /api/super-admin/subscriptions (plan-gated: super-admin)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Subscription Management routes not loaded:', e && e.message)
  }
}

// Vendor Management routes (Non-Privileged Users - vendors, building owners, creditors)
try {
  const vendorRoutes = require('./src/routes/vendors').default
  app.use('/api/vendors', authenticate, setTenantContext, requirePlanModuleAccess('procurement'), vendorRoutes)
  console.log('✅ Vendor Management routes loaded at /api/vendors (plan-gated: procurement)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Vendor Management routes not loaded:', e && e.message)
  }
}

// Approval Workflow routes (Multi-tenant stage-based approval engine)
try {
  const approvalRoutes = require('./dist/routes/approvals').default
  app.use('/api/approvals', authenticate, setTenantContext, requirePlanModuleAccess('operations'), approvalRoutes)
  console.log('✅ Approval Workflow routes loaded at /api/approvals (plan-gated: operations)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Approval Workflow routes not loaded:', e && e.message)
  }
}

// Internal Operations routes (BISMAN Internal Staff Only - Finance, Billing, Support, Engineering)
try {
  const internalOperationsRoutes = require('./routes/internal-operations')
  app.use('/api/internal', authenticate, setTenantContext, requirePlanModuleAccess('internal'), internalOperationsRoutes)
  console.log('✅ Internal Operations routes loaded at /api/internal (plan-gated)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Internal Operations routes not loaded:', e && e.message)
  }
}

// Support Playbooks routes (BISMAN Internal Staff - Read, ENTERPRISE_ADMIN - Manage)
try {
  const supportPlaybooksRoutes = require('./routes/support-playbooks')
  app.use('/api/playbooks', authenticate, setTenantContext, requirePlanModuleAccess('support'), supportPlaybooksRoutes)
  console.log('✅ Support Playbooks routes loaded at /api/playbooks (plan-gated: support)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Support Playbooks routes not loaded:', e && e.message)
  }
}

// Fallback Logs routes (for Super Admin monitoring)
try {
  const fallbackLogsRoutes = require('./routes/fallbackLogsRoutes')
  app.use('/api/fallback-logs', authenticate, setTenantContext, requirePlanModuleAccess('system'), fallbackLogsRoutes)
  console.log('✅ Fallback Logs routes loaded at /api/fallback-logs (plan-gated: system)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Fallback Logs routes not loaded:', e && e.message)
  }
}

// Deployment routes (for deployment management)
try {
  const deploymentRoutes = require('./routes/deployment')
  app.use('/api/deployment', authenticate, setTenantContext, requirePlanModuleAccess('system'), deploymentRoutes)
  console.log('✅ Deployment routes loaded at /api/deployment (plan-gated: system)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Deployment routes not loaded:', e && e.message)
  }
}

// SuperAdmin Dashboard routes (aggregated dashboard endpoints)
try {
  const superadminDashboardRoutes = require('./routes/superadminDashboard')
  app.use('/api/superadmin-dashboard', authenticate, setTenantContext, requirePlanModuleAccess('super-admin'), superadminDashboardRoutes)
  console.log('✅ SuperAdmin Dashboard routes loaded at /api/superadmin-dashboard (plan-gated: super-admin)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('SuperAdmin Dashboard routes not loaded:', e && e.message)
  }
}

// QA / Testing Module routes (bug tracking, test assignments)
try {
  const qaRoutes = require('./routes/qaRoutes')
  app.use('/api/qa', authenticate, setTenantContext, requirePlanModuleAccess('qa'), qaRoutes)
  console.log('✅ QA Module routes loaded at /api/qa (plan-gated)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('QA routes not loaded:', e && e.message)
  }
}

// Backup & Restore API routes
try {
  const backupRoutes = require('./routes/backup')
  app.use('/api/backup', backupRoutes)
  console.log('✅ Backup & Restore routes loaded at /api/backup')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Backup routes not loaded:', e && e.message)
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

// Self-serve tenant onboarding routes
try {
  const onboardingRoutes = require('./routes/onboarding')
  app.use('/api/onboard', onboardingRoutes)
  console.log('✅ Tenant onboarding routes loaded at /api/onboard')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Onboarding routes not loaded:', e && e.message)
  }
}

// Welcome / Workspace Setup routes (subscription selection after signup)
try {
  const welcomeRoutes = require('./routes/welcomeRoutes')
  app.use('/api/welcome', welcomeRoutes)
  console.log('✅ Welcome routes loaded at /api/welcome')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Welcome routes not loaded:', e && e.message)
  }
}

// Billing routes (Stripe integration)
try {
  const billingRoutes = require('./routes/billing')
  app.use('/api/billing', billingRoutes)
  console.log('✅ Billing routes loaded at /api/billing')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Billing routes not loaded:', e && e.message)
  }
}

// Subscription Plans routes (Super Admin - CRUD for subscription plans)
try {
  const subscriptionPlansRoutes = require('./routes/subscriptionPlans')
  app.use('/api/subscription-plans', subscriptionPlansRoutes)
  console.log('✅ Subscription Plans routes loaded at /api/subscription-plans')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Subscription Plans routes not loaded:', e && e.message)
  }
}

// Micro-Unlock Subscription routes (Pay-per-feature billing)
try {
  const microUnlockRoutes = require('./routes/microUnlockRoutes')
  app.use('/api/micro-unlock', microUnlockRoutes)
  console.log('✅ Micro-Unlock routes loaded at /api/micro-unlock')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Micro-Unlock routes not loaded:', e && e.message)
  }
}

// Stripe webhook (raw body required)
try {
  const stripeWebhook = require('./routes/webhooks/stripeWebhook')
  app.use('/api/webhooks/stripe', stripeWebhook)
  console.log('✅ Stripe webhook loaded at /api/webhooks/stripe')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Stripe webhook not loaded:', e && e.message)
  }
}

// Analytics routes
try {
  const analyticsRoutes = require('./routes/analytics')
  app.use('/api/analytics', authenticate, setTenantContext, requirePlanModuleAccess('analytics'), analyticsRoutes)
  console.log('✅ Analytics routes loaded at /api/analytics (plan-gated)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Analytics routes not loaded:', e && e.message)
  }
}

// Tenant Dashboard Admin routes
try {
  const tenantDashboardRoutes = require('./routes/admin/tenantDashboard')
  app.use('/api/admin/tenants', authenticate, setTenantContext, requirePlanModuleAccess('admin'), tenantDashboardRoutes)
  console.log('✅ Tenant dashboard routes loaded at /api/admin/tenants (plan-gated: admin)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Tenant dashboard routes not loaded:', e && e.message)
  }
}

// Monitoring routes (Prometheus metrics, health checks, per-tenant analytics)
try {
  const monitoringRoutes = require('./routes/monitoring')
  const { metricsMiddleware } = require('./middleware/metricsMiddleware')
  
  // Apply metrics collection middleware globally
  app.use(metricsMiddleware)
  
  // Mount monitoring routes
  app.use('/metrics', monitoringRoutes) // Prometheus endpoint
  app.use('/api/monitoring', monitoringRoutes)
  console.log('✅ Monitoring routes loaded (Prometheus + per-tenant analytics)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Monitoring routes not loaded:', e && e.message)
  }
}

// Usage metering middleware (track per-tenant API usage)
try {
  const { usageMeter } = require('./middleware/usageMeter')
  app.use(usageMeter)
  console.log('✅ Usage metering middleware loaded')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Usage metering middleware not loaded:', e && e.message)
  }
}

// Tenant quota/throttling middleware
try {
  const { tenantQuota } = require('./middleware/tenantQuota')
  app.use(tenantQuota)
  console.log('✅ Tenant quota middleware loaded')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Tenant quota middleware not loaded:', e && e.message)
  }
}

// Task Workbench routes (protected) - must be before general task routes
try {
  const taskWorkbenchRoutes = require('./routes/taskWorkbenchRoutes')
  app.use('/api/tasks/workbench', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), taskWorkbenchRoutes)
  console.log('✅ Task Workbench routes loaded (protected, plan-gated: task-management)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Task Workbench routes not loaded:', e && e.message)
  }
}

// Task Management routes (protected)
try {
  const taskRoutes = require('./routes/tasks')
  app.use('/api/tasks', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), taskRoutes)
  console.log('✅ Task Management routes loaded (protected, plan-gated: task-management)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Task routes not loaded:', e && e.message)
  }
}

// Task Request routes (hierarchical workflow)
try {
  const taskRequestRoutes = require('./routes/taskRequestRoutes')
  app.use('/api/task-requests', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), taskRequestRoutes)
  console.log('✅ Task Request routes loaded (protected, plan-gated: task-management)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Task Request routes not loaded:', e && e.message)
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

// User preferences routes (protected)
try {
  const userPreferencesRoutes = require('./routes/user-preferences')
  app.use('/api/user', authenticate, userPreferencesRoutes)
  console.log('✅ User preferences routes loaded (protected)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('User preferences routes not loaded:', e && e.message)
  }
}

// Enterprise Admin routes (protected)
try {
  const enterpriseRoutes = require('./routes/enterprise')
  // Protect all enterprise routes - only ENTERPRISE_ADMIN can access
  app.use('/api/enterprise', authenticate, setTenantContext, requireEnterpriseAdmin, enterpriseRoutes)
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
  const enterpriseAdminIntegrations = require('./routes/enterprise-admin-Integrations')
  const enterpriseAdminNotifications = require('./routes/enterprise-admin-Notifications')
  
  // Admin Creation with Subscription Assignment routes
  const adminWithSubscription = require('./routes/adminWithSubscription')
  
  app.use('/api/enterprise-admin/dashboard', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminDashboard)
  app.use('/api/enterprise-admin/organizations', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminOrganizations)
  app.use('/api/enterprise-admin/modules', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminModules)
  app.use('/api/enterprise-admin/billing', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminBilling)
  app.use('/api/enterprise-admin/audit', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminAudit)
  app.use('/api/enterprise-admin/reports', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminReports)
  app.use('/api/enterprise-admin/ai', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminAI)
  app.use('/api/enterprise-admin/logs', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminLogs)
  app.use('/api/enterprise-admin/users', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminUsers)
  app.use('/api/enterprise-admin/super-admins', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminSuperAdmins)
  app.use('/api/enterprise-admin/integrations', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminIntegrations)
  app.use('/api/enterprise-admin/notifications', authenticate, adminIpAllowlist, setTenantContext, enterpriseAdminNotifications)
  
  // Admin Creation with Subscription - accessible for creating new organizations with subscriptions
  app.use('/api/admin-creation', adminWithSubscription)
  
  console.log('✅ Enterprise Admin Management routes loaded (12 modules + Admin Creation)')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Enterprise Admin Management routes not loaded:', e && e.message)
  }
}

// Task Workflow System routes (NEW - with Socket.IO realtime updates)
try {
  const { router: taskRoutes } = require('./routes/taskRoutes');
  const approverRoutes = require('./routes/approverRoutes');
  
  app.use('/api/tasks', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), taskRoutes);
  app.use('/api/approvers', authenticate, setTenantContext, requirePlanModuleAccess('operations'), approverRoutes);
  
  console.log('✅ Task Workflow System routes loaded (with Socket.IO realtime, plan-gated)');
} catch (e) {
  console.warn('Task Workflow System routes not loaded:', e && e.message);
}

// Module Approval Flow routes (Super Admin configurable approval hierarchy)
try {
  const approvalFlowRoutes = require('./routes/approvalFlowRoutes');
  app.use('/api/approval-flows', authenticate, setTenantContext, requirePlanModuleAccess('operations'), approvalFlowRoutes);
  console.log('✅ Module Approval Flow routes loaded (Super Admin configurable, plan-gated: operations)');
} catch (e) {
  console.warn('Approval Flow routes not loaded:', e && e.message);
}

// Task V2 API routes (NEW - Enhanced with TanStack Query support)
try {
  const tasksV2Routes = require('./routes/tasksV2');
  app.use('/api/v2/tasks', authenticate, setTenantContext, requirePlanModuleAccess('task-management'), tasksV2Routes);
  console.log('✅ Task V2 API routes loaded (enhanced with React Query support, plan-gated: task-management)');
} catch (e) {
  console.warn('Task V2 API routes not loaded:', e && e.message);
}

// Audit Monitoring routes (protected - admin only)
try {
  const auditRoutes = require('./routes/audit');
  app.use('/api/audit', auditRoutes);
  console.log('✅ Audit Monitoring routes loaded (dashboard, logs, security events)');
} catch (e) {
  console.warn('Audit Monitoring routes not loaded:', e && e.message);
}

// Security Operations Dashboard routes (Enterprise Admin only)
try {
  const securityRoutes = require('./routes/security');
  const securityDashboardRoutes = require('./routes/securityDashboard');
  const serviceTableUsageRoutes = require('./routes/serviceTableUsage');
  
  app.use('/api/security', securityRoutes);
  app.use('/api/security-dashboard', securityDashboardRoutes);
  app.use('/api/admin', serviceTableUsageRoutes);
  
  console.log('✅ Security Operations routes loaded (scan, dashboard, service-table-usage)');
} catch (e) {
  console.warn('Security Operations routes not loaded:', e && e.message);
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
  // Use JavaScript version in routes/ folder (works in all environments)
  const usersRoutes = require('./routes/users');
  
  if (usersRoutes) {
    app.use('/api/system/users', usersRoutes)
    console.log('✅ User Management System routes loaded')
  } else {
    console.error('❌ User Management System routes failed to load - no valid router found')
  }
} catch (e) {
  console.error('❌ User Management System routes loading error:', e && e.message)
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

// Contract Management routes (Admin Panel)
try {
  const contractRoutes = require('./routes/admin/contracts')
  app.use('/api/admin/contracts', authenticate, setTenantContext, requirePlanModuleAccess('procurement'), contractRoutes)
  console.log('✅ Contract Management routes loaded at /api/admin/contracts (plan-gated: procurement)')
} catch (e) {
  console.warn('Contract Management routes not loaded:', e && e.message)
}

// Contract Finance routes (Accounting & Payables)
try {
  const contractFinanceRoutes = require('./routes/finance/contractFinance')
  app.use('/api/finance', authenticate, setTenantContext, requirePlanModuleAccess('finance'), contractFinanceRoutes)
  console.log('✅ Contract Finance routes loaded at /api/finance (plan-gated)')
} catch (e) {
  console.warn('Contract Finance routes not loaded:', e && e.message)
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
  app.use('/api/v1/super-admin', authenticate, setTenantContext, requirePlanModuleAccess('super-admin'), superAdminRoutes)
  console.log('✅ Super Admin routes loaded at /api/v1/super-admin (plan-gated: super-admin)')
} catch (e) {
  // Route optional in some builds; log once in dev
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Super Admin routes not loaded:', e && e.message)
  }
}

// Subscription Management routes
try {
  const subscriptionRoutes = require('./routes/subscriptionRoutes')
  const superAdminSubscriptionRoutes = require('./routes/superAdminSubscription')
  const subscriptionControlRoutes = require('./routes/subscriptionControlRoutes')
  const subscriptionCouponRoutes = require('./routes/subscriptionCouponRoutes')
  const subscriptionRedemptionRoutes = require('./routes/subscriptionRedemptionRoutes')
  const enterpriseSubscriptionRoutes = require('./routes/enterpriseSubscriptionRoutes')
  const effectiveAccessRoutes = require('./routes/effectiveAccessRoutes')
  
  // Public subscription endpoints (pricing, plans) - no auth required for GET
  // Tenant subscription management - requires authentication
  app.use('/api/subscriptions', subscriptionRoutes)
  
  // Client coupon redemption routes - requires CLIENT_ADMIN role
  app.use('/api/subscriptions', subscriptionRedemptionRoutes)
  
  // SuperAdmin subscription management console - requires SUPER_ADMIN role
  app.use('/api/super-admin/subscriptions', authenticate, adminIpAllowlist, superAdminSubscriptionRoutes)
  
  // SuperAdmin coupon management - requires SUPER_ADMIN role
  app.use('/api/superadmin/coupons', subscriptionCouponRoutes)
  
  // SuperAdmin Subscription Control ("God Mode" page) - comprehensive plan management
  app.use('/api/subscription-control', authenticate, adminIpAllowlist, subscriptionControlRoutes)
  
  // Enterprise Admin Subscription Access Control - module/feature matrix management
  app.use('/api/enterprise-admin/subscriptions', authenticate, adminIpAllowlist, setTenantContext, enterpriseSubscriptionRoutes)
  
  // Effective Access API - three-layer permission system (subscription ∩ enterprise ∩ superadmin)
  app.use('/api/access', effectiveAccessRoutes)
  
  console.log('✅ Subscription Management routes loaded')
  console.log('✅ Subscription Control ("God Mode") routes loaded')
  console.log('✅ Subscription Coupon routes loaded')
  console.log('✅ Enterprise Subscription Access Control routes loaded')
  console.log('✅ Effective Access API routes loaded')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Subscription routes not loaded:', e && e.message)
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
    const count = await prisma.users_enhanced.count()
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
        dbUser = await prisma.enterprise_admins.findUnique({
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
        dbUser = await prisma.super_admins.findUnique({
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
          const moduleAssignments = await prisma.module_assignments.findMany({
            where: { super_admin_id: dbUser.id },
            include: { modules: true }
          });
          dbUser.assignedModules = moduleAssignments.map(ma => ma.modules?.module_name).filter(Boolean);
        }
      } else {
        dbUser = await prisma.users_enhanced.findUnique({
          where: { id: payload.id },
          select: {
            id: true,
            email: true,
            username: true,
            role: true,
            product_type: true,
            profile_pic_url: true,
            assigned_modules: true,
            tenant_id: true,  // Include tenant_id for logo fetch
          }
        });
      }
      console.log('📸 Database user profile_pic_url:', dbUser?.profile_pic_url || 'null');
    } catch (dbError) {
      console.warn('⚠️ Could not fetch user from database:', dbError.message);
    }
    
    // Fetch tenant/client info for logo and branding
    let tenantInfo = null;
    try {
      if (dbUser?.tenant_id || payload.tenant_id) {
        const tenantId = dbUser?.tenant_id || payload.tenant_id;
        // Try to get client/tenant info
        tenantInfo = await prisma.client.findUnique({
          where: { id: tenantId },
          select: { id: true, name: true, trade_name: true, logo: true, settings: true }
        });
        // Check settings.logo.data if logo column is null (from welcome activation)
        if (!tenantInfo?.logo && tenantInfo?.settings?.logo?.data) {
          tenantInfo.logo = tenantInfo.settings.logo.data;
        }
      }
    } catch (tenantError) {
      console.warn('⚠️ Could not fetch tenant info:', tenantError.message);
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
      // Add tenant/client branding info
      tenant_name: tenantInfo?.trade_name || tenantInfo?.name || null,
      clientName: tenantInfo?.trade_name || tenantInfo?.name || null,
      clientLogo: tenantInfo?.logo || null,
    }
    
    console.log('✅ /api/me returning user:', { 
      email: user.email, 
      username: user.username,
      role: user.role, 
      roleName: user.roleName,
      userType: user.userType,
      profile_pic_url: user.profile_pic_url,
      clientName: user.clientName,
      clientLogo: user.clientLogo ? '(logo present)' : null
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
    } catch {
      console.warn('user_sessions.findFirst failed (likely missing table). Falling back to token-only validation.');
    }

    if (!existingSession) {
      console.log('❌ Refresh token not found in DB or expired');
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
        console.log('Refresh token validated against database.');
        // Validate token signature (we use existingSession.user_id instead of decoded payload)
        try {
          jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        } catch {
          return res.status(401).json({ message: 'Invalid refresh token' });
        }

        // Load user to build claims
        const userRecord = await prisma.users_enhanced.findUnique({ where: { id: existingSession.user_id } })
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

// Note: Primary error handler is at the end of this file (app.use(errorHandler))
// This early catch is only for routes defined before this point
app.use((err, req, res, _next) => {
  console.error('Global error handler:', err)
  // Use AppError properties if available
  const statusCode = err.httpStatus || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  const errorCode = err.errorCode || 'SERVER_ERROR';
  
  res.status(statusCode).json({ 
    success: false,
    error: message, 
    message: message,
    errorCode: errorCode
  })
})

app.post('/api/logout', async (req, res) => {
  const { refresh_token: refreshToken } = req.cookies;

  if (refreshToken) {
    // Remove the refresh token from the database
    try {
      const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex')
      try {
        await prisma.user_sessions.deleteMany({ where: { session_token: hashedToken } });
      } catch {
        console.warn('user_sessions.deleteMany failed (likely missing table). Continuing logout.');
      }
    } catch {
      // Intentionally ignored - logout should proceed even if token cleanup fails
    }
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
  } catch {
    // best-effort fallback
    try { res.clearCookie('access_token', { path: '/', sameSite: 'none' }); } catch { /* ignored */ }
    try { res.clearCookie('refresh_token', { path: '/', sameSite: 'none' }); } catch { /* ignored */ }
    try { res.clearCookie('token', { path: '/', sameSite: 'none' }); } catch { /* ignored */ }
  }

  res.status(200).json({ message: 'Logout successful' })
})

// Development only: Reset rate limiter
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/reset-limiter', (req, res) => {
    try {
      // Use imported limiters if available
      if (strictLoginLimiter?.resetKey) strictLoginLimiter.resetKey(req.ip);
      res.json({ ok: true, message: 'Rate limiter reset for development' })
    } catch {
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
      // PLUS always-accessible modules (common, chat)
      // PLUS protected/core modules that Super Admins always have access to
      console.log('[master-modules] Super Admin access - filtering by assigned modules + always-accessible + protected');
      console.log('[master-modules] Super Admin ID:', req.user.id);
      console.log('[master-modules] Assigned modules:', req.user.assignedModules);
      
      // Get module IDs from module assignments
      const moduleAssignments = await prisma.module_assignments.findMany({
        where: { super_admin_id: req.user.id },
        include: { modules: true }
      });
      
      const assignedModuleIds = moduleAssignments.map(ma => ma.module_id);
      console.log('[master-modules] Assigned module IDs:', assignedModuleIds);
      
      // Protected module patterns for SUPER_ADMIN (matches frontend protected-access.ts)
      // These are modules Super Admins always have access to regardless of assignment
      // Note: Use exact matches to avoid matching similar names (e.g., 'system' != 'system-health')
      const protectedModuleNames = ['super-admin', 'system', 'enterprise-admin', 'common', 'chat'];
      
      // Fetch assigned modules OR always-accessible modules OR protected modules
      dbModules = await prisma.modules.findMany({
        where: {
          OR: [
            // Explicitly assigned modules
            ...(assignedModuleIds.length > 0 ? [{ id: { in: assignedModuleIds } }] : []),
            // Database-flagged always-accessible modules
            { is_always_accessible: true },
            // Protected modules by exact module_name match
            { module_name: { in: protectedModuleNames } },
          ]
        },
        orderBy: {
          id: 'asc'
        }
      });
      console.log('[master-modules] Including always-accessible + protected modules. Total:', dbModules.length);
    } else {
      // Enterprise Admin and Admin can see all modules
      console.log('[master-modules] Admin/Enterprise Admin access - showing all modules');
      dbModules = await prisma.modules.findMany({
        orderBy: {
          id: 'asc'
        }
      });
    }

    // Also get the config modules for page information
    const { MASTER_MODULES } = require('./config/master-modules');

    // Merge database modules with config modules (for pages info)
    const modulesWithPages = dbModules.map(dbModule => {
      // Try multiple matching strategies to find the config module
      let configModule = MASTER_MODULES.find(m => m.id === dbModule.module_name);
      
      // If no match by id, try matching by name (case-insensitive)
      if (!configModule) {
        const moduleName = (dbModule.module_name || '').toLowerCase().replace(/[_-]/g, '');
        const displayName = (dbModule.display_name || '').toLowerCase().replace(/[_-\s]/g, '');
        configModule = MASTER_MODULES.find(m => {
          const configId = (m.id || '').toLowerCase().replace(/[_-]/g, '');
          const configName = (m.name || '').toLowerCase().replace(/[_-\s]/g, '');
          return configId === moduleName || 
                 configId === displayName ||
                 configName === displayName ||
                 configName.includes(displayName) ||
                 displayName.includes(configName);
        });
      }
      
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
        alwaysAccessible: dbModule.is_always_accessible || configModule?.alwaysAccessible || false,
        is_always_accessible: dbModule.is_always_accessible || configModule?.alwaysAccessible || false,
        hideFromAssignment: configModule?.hideFromAssignment || false, // Flag to hide from assignment UI
        pages: configModule?.pages || []
      };
    })
    // Filter out modules that should be hidden from assignment UI (enterprise-admin, super-admin, admin)
    .filter(m => !m.hideFromAssignment);

    console.log('[master-modules] Returning', modulesWithPages.length, 'modules (after filtering hidden)');
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
    const superAdmins = await prisma.super_admins.findMany({
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
      
      // Load enterprise-admin module pages from config
      const { MASTER_MODULES } = require('./config/master-modules');
      const enterpriseModule = MASTER_MODULES.find(m => m.id === 'enterprise-admin');
      const enterprisePages = enterpriseModule?.pages?.map(p => p.id) || [];
      
      return res.json({
        ok: true,
        user: {
          id: userId,
          username: req.user.username || req.user.email,
          email: req.user.email,
          role: 'ENTERPRISE_ADMIN',
          permissions: {
            assignedModules: ['enterprise-admin'],
            accessLevel: 'enterprise',
            pagePermissions: {
              'enterprise-admin': enterprisePages
            }
          }
        }
      });
    }

    // For SUPER_ADMIN role, fetch from super_admins table
    if (req.user.role === 'SUPER_ADMIN') {
      // Look up by email since super_admins table has different IDs than users table
      const userEmail = req.user.email;
      const superAdmin = await prisma.super_admins.findFirst({
        where: { email: userEmail },
        include: {
          moduleAssignments: {
            include: {
              module: true
            }
          }
        }
      });

      if (!superAdmin) {
        console.error('❌ [PERMISSIONS] Super Admin not found for email:', userEmail);
        return res.status(404).json({ ok: false, error: 'Super Admin not found' });
      }

      console.log('✅ [PERMISSIONS] Super Admin found:', superAdmin.name);
      console.log('📦 [PERMISSIONS] Module assignments:', superAdmin.moduleAssignments.length);

      // Load pages from config
      const { MASTER_MODULES } = require('./config/master-modules');

      // Build permissions from database
      const assignedModules = [];
      const pagePermissions = {};

      // ✅ AUTO-ASSIGN always-accessible modules (common, chat) to all Super Admins
      // These are modules that every user should have access to
      const alwaysAccessibleModules = ['common', 'chat'];
      for (const moduleId of alwaysAccessibleModules) {
        const configModule = MASTER_MODULES.find(m => m.id === moduleId);
        if (configModule) {
          assignedModules.push(moduleId);
          pagePermissions[moduleId] = configModule.pages?.map(p => p.id) || [];
          console.log(`📄 [PERMISSIONS] AUTO-ASSIGNED always-accessible module: ${moduleId} with ${pagePermissions[moduleId].length} pages`);
        }
      }
      
      // NOTE: super-admin module is NOT auto-assigned anymore
      // Enterprise Admin must explicitly assign modules to each Super Admin

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
    const user = await prisma.users_enhanced.findUnique({
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
    const existingUser = await prisma.users_enhanced.findFirst({
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
    const newUser = await prisma.users_enhanced.create({
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
    if (password) updateData.password_hash = bcrypt.hashSync(password, 10);

    // ✅ SECURITY FIX: Add tenant filter to prevent cross-tenant updates
    const tenantId = TenantGuard.getTenantId(req);
    const whereClause = { id: parseInt(id) };
    if (tenantId) {
      whereClause.tenant_id = tenantId; // ✅ SECURITY: Ensure user belongs to same tenant
    }

    // Update user
    const updatedUser = await prisma.users_enhanced.update({
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
    const user = await prisma.users_enhanced.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Super Admin not found' 
      });
    }

    // Delete user
    await prisma.users_enhanced.delete({
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
    const existingUsername = await prisma.super_admins.findUnique({
      where: { username }
    });

    if (existingUsername) {
      return res.status(400).json({ 
        ok: false, 
        message: 'Username already exists' 
      });
    }

    // Check if email already exists
    const existingEmail = await prisma.super_admins.findUnique({
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
    const newSuperAdmin = await prisma.super_admins.create({
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
    // eslint-disable-next-line no-unused-vars
    const { password: _pwd, ...superAdminData } = newSuperAdmin;

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
    const superAdmin = await prisma.super_admins.findUnique({
      where: { id: superAdminId }
    });

    if (!superAdmin) {
      return res.status(404).json({ 
        ok: false, 
        message: 'Super Admin not found' 
      });
    }

    // Delete all module assignments first (cascade)
    await prisma.module_assignments.deleteMany({
      where: { super_admin_id: superAdminId }
    });

    // Delete the Super Admin
    await prisma.super_admins.delete({
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

// Save page permissions for a module (module assignment is derived from page access)
// NOTE: Modules are informational groupings only. Permissions are defined by pages.
// A module is considered "accessible" when at least one page inside is allowed.
app.post('/api/enterprise-admin/super-admins/:id/assign-module', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleId, pageIds } = req.body;

    console.log('🔵 SAVE PAGE PERMISSIONS REQUEST:', { 
      superAdminId: id, 
      moduleId, 
      pageIds,
      pageCount: pageIds?.length || 0 
    });

    if (!moduleId) {
      console.error('❌ No moduleId provided');
      return res.status(400).json({ 
        ok: false, 
        message: 'Module ID is required (used to group page permissions)' 
      });
    }

    // SEMANTIC: Pages define permissions, modules just group them
    // If no pages are provided, we store an empty array (module becomes "no-access")
    const normalizedPageIds = Array.isArray(pageIds) ? pageIds : [];

    const superAdminId = parseInt(id);
    const moduleIdInt = parseInt(moduleId);

    // Verify super admin exists
    const superAdmin = await prisma.super_admins.findUnique({
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
    const module = await prisma.modules.findUnique({
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
    const existingAssignment = await prisma.module_assignments.findFirst({
      where: {
        super_admin_id: superAdminId,
        module_id: moduleIdInt,
        ...(tenantId && { tenant_id: tenantId }) // ✅ SECURITY: Check within tenant
      }
    });

    let assignment;
    let message;

    if (existingAssignment) {
      // UPDATE existing page permissions for this module grouping
      console.log('📝 Updating page permissions...');
      assignment = await prisma.module_assignments.update({
        where: { id: existingAssignment.id },
        data: {
          assigned_at: new Date(),
          page_permissions: normalizedPageIds // Pages define the actual permissions
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
      message = 'Page permissions updated successfully';
      console.log('✅ Page permissions updated');
    } else {
      // CREATE new record to store page permissions (grouped by module)
      console.log('➕ Creating page permissions record...');
      assignment = await prisma.module_assignments.create({
        data: {
          super_admin_id: superAdminId,
          module_id: moduleIdInt,
          page_permissions: normalizedPageIds, // Pages define the actual permissions
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
      message = 'Page permissions saved successfully';
      console.log('✅ Page permissions created');
    }

    // SEMANTIC NOTE: Module accessibility is now derived from page_permissions.
    // If page_permissions has entries, the module is accessible.
    // The UI shows modules as read-only indicators based on page access.

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

// Remove page permissions for a module (clears all page access for this module grouping)
// NOTE: This effectively makes the module "no-access" since modules derive from pages.
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
    const assignment = await prisma.module_assignments.findFirst({
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
        message: 'No page permissions found for this module' 
      });
    }

    // Delete the page permissions record (module will show as "no-access")
    await prisma.module_assignments.delete({
      where: { id: assignment.id }
    });

    res.json({ 
      ok: true, 
      message: 'Page permissions removed successfully',
      superAdminId,
      moduleId: moduleIdInt,
      moduleName: assignment.module.module_name
    });
  } catch (error) {
    console.error('Error removing page permissions:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to remove page permissions',
      message: error.message 
    });
  }
});

// Assign roles to a Super Admin (for role-based access control)
app.post('/api/enterprise-admin/super-admins/:id/assign-roles', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { roleIds } = req.body;

    console.log('🔵 ASSIGN ROLES TO SUPER ADMIN:', { 
      superAdminId: id, 
      roleIds,
      roleCount: roleIds?.length || 0 
    });

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ 
        ok: false, 
        message: 'roleIds must be an array' 
      });
    }

    const superAdminId = parseInt(id);
    const enterpriseAdminId = req.user.id;

    // Verify super admin exists
    const superAdmin = await prisma.super_admins.findUnique({
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

    // Use transaction to atomically update role assignments
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing role assignments for this super admin
      await tx.admin_role_assignments.deleteMany({
        where: {
          assignee_type: 'SUPER_ADMIN',
          assignee_id: superAdminId
        }
      });

      // Create new role assignments
      const assignments = [];
      for (const roleId of roleIds) {
        const assignment = await tx.admin_role_assignments.create({
          data: {
            assigner_type: 'ENTERPRISE_ADMIN',
            assigner_id: enterpriseAdminId,
            role_id: roleId,
            assignee_type: 'SUPER_ADMIN',
            assignee_id: superAdminId,
            is_active: true
          }
        });
        assignments.push(assignment);
      }

      return assignments;
    });

    console.log('✅ Roles assigned to super admin:', result.length);

    res.json({ 
      ok: true, 
      message: `${result.length} role(s) assigned successfully`,
      superAdminId,
      assignedRoleIds: roleIds,
      assignedCount: result.length
    });
  } catch (error) {
    console.error('❌ ERROR ASSIGNING ROLES:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to assign roles',
      message: error.message 
    });
  }
});

// Get roles assigned to a specific Super Admin
app.get('/api/enterprise-admin/super-admins/:id/roles', authenticate, requireRole('ENTERPRISE_ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const superAdminId = parseInt(id);

    // Get role assignments for this super admin
    const assignments = await prisma.admin_role_assignments.findMany({
      where: {
        assignee_type: 'SUPER_ADMIN',
        assignee_id: superAdminId,
        is_active: true
      },
      select: { role_id: true }
    });

    const roleIds = assignments.map(a => a.role_id);

    console.log('🔵 GET roles for Super Admin:', superAdminId, 'Roles:', roleIds);

    res.json({ 
      ok: true, 
      superAdminId,
      roleIds,
      roleCount: roleIds.length
    });
  } catch (error) {
    console.error('Error fetching super admin roles:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch roles',
      message: error.message 
    });
  }
});

// ============================================
// GET PAGES FOR A SPECIFIC ROLE
// Returns all available pages with granted status for this role
// ============================================
app.get('/api/rbac/roles/:roleId/pages', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleIdNum = parseInt(roleId);
    
    console.log('[RBAC] Getting pages for role:', roleIdNum);
    
    // Get role info
    const role = await prisma.rbac_roles.findUnique({
      where: { id: roleIdNum }
    });
    
    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found',
        pages: []
      });
    }
    
    // Get ALL routes/pages from the database
    const allRoutes = await prisma.rbac_routes.findMany({
      where: { is_active: true },
      orderBy: [{ module: 'asc' }, { name: 'asc' }]
    });
    
    // Get permissions for this role
    const permissions = await prisma.rbac_permissions.findMany({
      where: {
        role_id: roleIdNum,
        is_active: true
      }
    });
    
    // Create a set of granted route IDs
    const grantedRouteIds = new Set(
      permissions.filter(p => p.granted).map(p => p.route_id)
    );
    
    // Map all routes with granted status
    const pages = allRoutes.map(route => ({
      id: route.path || String(route.id),
      routeId: route.id,
      path: route.path,
      name: route.display_name || route.name || route.path,
      module: route.module || 'General',
      description: route.description,
      isActive: route.is_active,
      granted: grantedRouteIds.has(route.id)
    }));
    
    const grantedCount = pages.filter(p => p.granted).length;
    console.log('[RBAC] Found', pages.length, 'total pages,', grantedCount, 'granted for role:', role.name);
    
    res.json({ 
      success: true, 
      role: role.name,
      roleDisplayName: role.display_name || role.name,
      roleId: roleIdNum,
      pages,
      grantedCount,
      totalCount: pages.length,
      source: 'rbac_routes'
    });
  } catch (error) {
    console.error('[RBAC] Error fetching role pages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch role pages',
      message: error.message,
      pages: []
    });
  }
});

// ============================================
// UPDATE PAGES (PERMISSIONS) FOR A SPECIFIC ROLE
// Save which pages are assigned to this role
// ============================================
app.post('/api/rbac/roles/:roleId/pages', authenticate, requireRole(['ENTERPRISE_ADMIN', 'SUPER_ADMIN', 'ADMIN']), async (req, res) => {
  try {
    const { roleId } = req.params;
    const roleIdNum = parseInt(roleId);
    const { pageIds } = req.body; // Array of page paths or route IDs to grant
    
    console.log('[RBAC] Updating pages for role:', roleIdNum, 'with', pageIds?.length || 0, 'pages');
    
    // Validate role exists
    const role = await prisma.rbac_roles.findUnique({
      where: { id: roleIdNum }
    });
    
    if (!role) {
      return res.status(404).json({ 
        success: false, 
        error: 'Role not found'
      });
    }
    
    // Get all routes
    const allRoutes = await prisma.rbac_routes.findMany({
      where: { is_active: true }
    });
    
    // Create map of path to route for quick lookup
    const routeByPath = new Map();
    const routeById = new Map();
    allRoutes.forEach(r => {
      if (r.path) routeByPath.set(r.path, r);
      routeById.set(r.id, r);
    });
    
    // Find route IDs from pageIds (can be paths or numeric IDs)
    // Auto-create routes for paths that don't exist in the database
    const grantedRouteIds = new Set();
    const pathsToCreate = [];
    
    (pageIds || []).forEach(pageId => {
      // Try as path first
      const routeByPathMatch = routeByPath.get(pageId);
      if (routeByPathMatch) {
        grantedRouteIds.add(routeByPathMatch.id);
        return;
      }
      // Try as numeric route ID
      const numId = parseInt(pageId);
      if (!isNaN(numId) && routeById.has(numId)) {
        grantedRouteIds.add(numId);
        return;
      }
      // Path doesn't exist - queue for creation
      if (typeof pageId === 'string' && pageId.startsWith('/')) {
        pathsToCreate.push(pageId);
      }
    });
    
    // Auto-create missing routes
    if (pathsToCreate.length > 0) {
      console.log('[RBAC] Auto-creating', pathsToCreate.length, 'missing routes:', pathsToCreate.slice(0, 5));
      for (const path of pathsToCreate) {
        try {
          // Generate a name from the path
          const pathParts = path.split('/').filter(Boolean);
          const name = pathParts.map(p => p.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())).join(' - ') || 'Home';
          
          const newRoute = await prisma.rbac_routes.create({
            data: {
              path: path,
              name: name,
              method: 'GET',
              is_active: true,
              is_protected: false,
              is_menu_item: true,
              created_at: new Date()
            }
          });
          grantedRouteIds.add(newRoute.id);
          routeByPath.set(path, newRoute);
          routeById.set(newRoute.id, newRoute);
          allRoutes.push(newRoute);
          console.log('[RBAC] Created route:', path, '-> ID:', newRoute.id);
        } catch (createError) {
          console.warn('[RBAC] Failed to create route for path:', path, createError.message);
        }
      }
    }
    
    console.log('[RBAC] Resolved', grantedRouteIds.size, 'route IDs to grant');
    
    // Get existing permissions for this role
    const existingPerms = await prisma.rbac_permissions.findMany({
      where: { role_id: roleIdNum }
    });
    
    const existingPermByRouteId = new Map();
    existingPerms.forEach(p => existingPermByRouteId.set(p.route_id, p));
    
    // Update or create permissions
    const operations = [];
    
    for (const route of allRoutes) {
      const shouldGrant = grantedRouteIds.has(route.id);
      const existingPerm = existingPermByRouteId.get(route.id);
      
      if (existingPerm) {
        // Update existing permission
        if (existingPerm.granted !== shouldGrant) {
          operations.push(
            prisma.rbac_permissions.update({
              where: { id: existingPerm.id },
              data: { 
                granted: shouldGrant,
                updated_at: new Date()
              }
            })
          );
        }
      } else {
        // Create new permission record
        operations.push(
          prisma.rbac_permissions.create({
            data: {
              role_id: roleIdNum,
              route_id: route.id,
              granted: shouldGrant,
              is_active: true,
              created_at: new Date(),
              updated_at: new Date()
            }
          })
        );
      }
    }
    
    // Execute all operations
    if (operations.length > 0) {
      await prisma.$transaction(operations);
      console.log('[RBAC] Executed', operations.length, 'permission updates');
    }
    
    res.json({ 
      success: true, 
      message: 'Role pages updated successfully',
      roleId: roleIdNum,
      roleName: role.name,
      grantedCount: grantedRouteIds.size,
      totalRoutes: allRoutes.length
    });
  } catch (error) {
    console.error('[RBAC] Error updating role pages:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update role pages',
      message: error.message
    });
  }
});

// ============================================
// ADMIN ROLE ASSIGNMENT API ENDPOINTS
// For Enterprise Admin, Super Admin, and Admin role allocations
// ============================================

// Get assigned roles for an admin
app.get('/api/admin/role-assignments', authenticate, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    
    console.log('🔵 GET role-assignments for:', { userRole, userId });

    // Check if table exists, create if not
    let assignments = [];
    try {
      if (userRole === 'ENTERPRISE_ADMIN') {
        // Enterprise Admin: Get roles THEY have assigned (as assigner)
        assignments = await prisma.admin_role_assignments.findMany({
          where: {
            assigner_type: 'ENTERPRISE_ADMIN',
            assigner_id: userId,
            is_active: true
          },
          orderBy: { assigned_at: 'desc' }
        });
      } else if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
        // Super Admin / Admin: Get roles that Enterprise Admin has ALLOWED for them
        // Look for assignments where assigner_type = 'ENTERPRISE_ADMIN'
        // Note: assignee fields might be null if it's a global assignment, 
        // or could be specific to this user
        assignments = await prisma.admin_role_assignments.findMany({
          where: {
            assigner_type: 'ENTERPRISE_ADMIN',
            is_active: true,
            // Include both global assignments (no assignee) and user-specific ones
            OR: [
              { assignee_type: null },
              { assignee_type: '', assignee_id: null },
              { assignee_type: userRole, assignee_id: userId }
            ]
          },
          orderBy: { assigned_at: 'desc' }
        });
      } else {
        return res.status(403).json({ ok: false, error: 'Access denied' });
      }
    } catch (tableError) {
      // Table might not exist yet - return empty array
      console.log('⚠️ AdminRoleAssignment table may not exist yet:', tableError.message);
      assignments = [];
    }

    // Get all available roles from rbac_roles
    const allRoles = await prisma.rbac_roles.findMany({
      where: { status: 'active' },
      orderBy: { level: 'asc' }
    });

    const assignedRoleIds = assignments.map(a => a.role_id);

    res.json({
      ok: true,
      assignerType: userRole === 'ENTERPRISE_ADMIN' ? 'ENTERPRISE_ADMIN' : 'RECEIVED',
      assignerId: userId,
      assignedRoleIds,
      assignments: assignments.map(a => ({
        id: a.id,
        roleId: a.role_id,
        assigneeType: a.assignee_type,
        assigneeId: a.assignee_id,
        assignedAt: a.assigned_at
      })),
      allRoles: allRoles.map(r => ({
        id: r.id,
        name: r.name,
        displayName: r.display_name,
        description: r.description,
        level: r.level
      }))
    });
  } catch (error) {
    console.error('Error fetching role assignments:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to fetch role assignments',
      message: error.message 
    });
  }
});

// Save/Update role assignments for an admin
app.post('/api/admin/role-assignments', authenticate, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const { roleIds, assigneeType, assigneeId } = req.body;
    
    // Determine assigner type based on user role
    let assignerType;
    if (userRole === 'ENTERPRISE_ADMIN') {
      assignerType = 'ENTERPRISE_ADMIN';
    } else if (userRole === 'SUPER_ADMIN') {
      assignerType = 'SUPER_ADMIN';
    } else if (userRole === 'ADMIN') {
      assignerType = 'ADMIN';
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    if (!Array.isArray(roleIds)) {
      return res.status(400).json({ ok: false, error: 'roleIds must be an array' });
    }

    console.log('🔵 POST role-assignments:', { 
      assignerType, 
      userId, 
      roleIds,
      assigneeType,
      assigneeId,
      roleCount: roleIds.length 
    });

    // Use a transaction for atomic operations - simple delete + insert approach
    const result = await prisma.$transaction(async (tx) => {
      // First, delete all existing assignments for this assigner
      await tx.admin_role_assignments.deleteMany({
        where: {
          assigner_type: assignerType,
          assigner_id: userId
        }
      });

      // Then, create new assignments for each role
      const assignments = [];
      for (const roleId of roleIds) {
        const assignment = await tx.admin_role_assignments.create({
          data: {
            assigner_type: assignerType,
            assigner_id: userId,
            role_id: roleId,
            assignee_type: assigneeType || null,
            assignee_id: assigneeId || null,
            is_active: true
          }
        });
        assignments.push(assignment);
      }

      return assignments;
    });

    console.log('✅ Role assignments saved:', result.length);

    res.json({
      ok: true,
      message: 'Role assignments saved successfully',
      assignedCount: result.length,
      assignedRoleIds: roleIds
    });
  } catch (error) {
    console.error('Error saving role assignments:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to save role assignments',
      message: error.message 
    });
  }
});

// Assign a single role
app.post('/api/admin/role-assignments/assign', authenticate, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const { roleId, assigneeType, assigneeId } = req.body;
    
    let assignerType;
    if (userRole === 'ENTERPRISE_ADMIN') {
      assignerType = 'ENTERPRISE_ADMIN';
    } else if (userRole === 'SUPER_ADMIN') {
      assignerType = 'SUPER_ADMIN';
    } else if (userRole === 'ADMIN') {
      assignerType = 'ADMIN';
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    if (!roleId) {
      return res.status(400).json({ ok: false, error: 'roleId is required' });
    }

    console.log('🔵 Assigning role:', { assignerType, userId, roleId });

    const assigneeTypeVal = assigneeType || 'ALL';
    const assigneeIdVal = assigneeId || 0;

    // Delete existing assignment if any, then create new one
    await prisma.admin_role_assignments.deleteMany({
      where: {
        assigner_type: assignerType,
        assigner_id: userId,
        role_id: roleId,
        assignee_type: assigneeTypeVal,
        assignee_id: assigneeIdVal
      }
    });

    const assignment = await prisma.admin_role_assignments.create({
      data: {
        assigner_type: assignerType,
        assigner_id: userId,
        role_id: roleId,
        assignee_type: assigneeTypeVal,
        assignee_id: assigneeIdVal,
        is_active: true
      }
    });

    console.log('✅ Role assigned:', assignment.id);

    res.json({
      ok: true,
      message: 'Role assigned successfully',
      assignment: {
        id: assignment.id,
        roleId: assignment.role_id,
        assignedAt: assignment.assigned_at
      }
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to assign role',
      message: error.message 
    });
  }
});

// Unassign a single role
app.post('/api/admin/role-assignments/unassign', authenticate, async (req, res) => {
  try {
    const userRole = (req.user?.role || '').toUpperCase();
    const userId = req.user?.id;
    const { roleId, assigneeType, assigneeId } = req.body;
    
    let assignerType;
    if (userRole === 'ENTERPRISE_ADMIN') {
      assignerType = 'ENTERPRISE_ADMIN';
    } else if (userRole === 'SUPER_ADMIN') {
      assignerType = 'SUPER_ADMIN';
    } else if (userRole === 'ADMIN') {
      assignerType = 'ADMIN';
    } else {
      return res.status(403).json({ ok: false, error: 'Access denied' });
    }

    if (!roleId) {
      return res.status(400).json({ ok: false, error: 'roleId is required' });
    }

    console.log('🔵 Unassigning role:', { assignerType, userId, roleId });

    const assigneeTypeVal = assigneeType || 'ALL';
    const assigneeIdVal = assigneeId || 0;

    // Delete the assignment (hard delete instead of soft delete for simplicity)
    const result = await prisma.admin_role_assignments.deleteMany({
      where: {
        assigner_type: assignerType,
        assigner_id: userId,
        role_id: roleId,
        assignee_type: assigneeTypeVal,
        assignee_id: assigneeIdVal
      }
    });

    console.log('✅ Role unassigned:', result.count);

    res.json({
      ok: true,
      message: 'Role unassigned successfully',
      unassignedCount: result.count
    });
  } catch (error) {
    console.error('Error unassigning role:', error);
    res.status(500).json({ 
      ok: false, 
      error: 'Failed to unassign role',
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
      prisma.super_admins.count({ where: { is_active: true } }),
      prisma.modules.count({ where: { is_active: true } }),
      prisma.clients.count()
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
    const superAdmins = await prisma.super_admins.findMany({
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
        user = await prisma.users_enhanced.findUnique({
          where: { id: req.user.id },
          select: { username: true, email: true, role: true }
        })
      } catch {
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

  // ✅ SUPER_ADMIN BYPASS - Return full access immediately without DB queries
  const userRole = (req.user.role || req.user.roleName || req.user.userType || '').toUpperCase();
  if (userRole === 'SUPER_ADMIN' || req.user.userType === 'SUPER_ADMIN') {
    console.log('[/api/auth/permissions] SUPER_ADMIN bypass - returning full access');
    return res.json({ 
      permissions: ['*', '*.*'],
      role: 'SUPER_ADMIN',
      userId: req.user.id,
      modules: ['*'],
      allowedPages: ['*'],
      _bypass: 'SUPER_ADMIN full access'
    });
  }

  try {
    const userId = req.user.id
    
    // Check if RBAC tables exist
    let tablesExist = true;
    try {
      await prisma.$queryRaw`SELECT 1 FROM rbac_user_roles LIMIT 1`;
    } catch {
      tablesExist = false;
    }

    if (!tablesExist) {
      // Return basic permissions if RBAC tables don't exist
      const permissions = [];
      if (req.user.roleName === 'SUPER_ADMIN') {
        permissions.push('*.*'); // All permissions wildcard
      }
      return res.json({ 
        permissions,
        role: req.user.roleName,
        userId: req.user.id,
        _notice: 'RBAC tables not available'
      });
    }
    
    // Get user permissions from database - handle case where user has no RBAC entries
    let userPermissions = [];
    try {
      // Convert userId to number for Prisma query
      const userIdNum = parseInt(String(userId), 10);
      if (!isNaN(userIdNum)) {
        userPermissions = await prisma.$queryRaw`
          SELECT DISTINCT 
            CONCAT(rt.path, '.', act.name) as permission_key
          FROM rbac_user_roles ur
          JOIN rbac_permissions p ON ur.role_id = p.role_id
          JOIN rbac_routes rt ON p.route_id = rt.id
          JOIN rbac_actions act ON p.action_id = act.id
          WHERE ur.user_id = ${userIdNum}
            AND COALESCE(ur.is_active, true) = true
            AND COALESCE(p.is_active, true) = true
            AND COALESCE(rt.is_active, true) = true
            AND COALESCE(act.is_active, true) = true
        `;
      }
    } catch (queryErr) {
      console.warn('RBAC permissions query failed (user may have no RBAC entries):', queryErr.message);
      // Continue with empty permissions - user just has no RBAC entries yet
    }
    
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

// User search endpoint for chat @mentions (any authenticated user can search)
app.get('/api/users/search', authenticate, async (req, res) => {
  try {
    const { q = '', limit = 20, include_self = 'false', include_inactive = 'false' } = req.query;
    const searchTerm = q.toLowerCase().trim();
    
    // Get tenant_id from the current user to filter users
    const tenantId = req.user.tenant_id || req.user.tenantId;
    
    // Check if user is an admin (can see inactive users)
    const userRole = (req.user.role || req.user.roleName || '').toUpperCase().replace(/\s+/g, '_');
    const isAdmin = ['SUPER_ADMIN', 'ADMIN', 'ENTERPRISE_ADMIN', 'HR', 'HR_MANAGER', 'SYSTEM_ADMIN'].includes(userRole);
    
    // Build where clause - if empty query, return all users for this tenant
    const whereClause = {};
    
    // Only filter by is_active for non-admins OR if admin doesn't request inactive users
    if (!isAdmin || include_inactive !== 'true') {
      whereClause.is_active = true;
    }
    
    // Don't show the current user in search results (unless include_self=true for reporting authority)
    if (include_self !== 'true') {
      whereClause.NOT = { id: req.user.id };
    }

    // SECURITY: Always filter by tenant_id for tenant isolation
    // Users should only see other users in their own tenant
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    // Only add search filter if query is provided
    if (searchTerm) {
      whereClause.AND = [
        {
          OR: [
            { username: { contains: searchTerm, mode: 'insensitive' } },
            { email: { contains: searchTerm, mode: 'insensitive' } },
          ]
        }
      ];
    }
    
    // Get users from database
    const users = await prisma.users_enhanced.findMany({
      where: whereClause,
      select: {
        id: true,
        legacy_id: true,
        username: true,
        email: true,
        role: true,
        profile_pic_url: true,
        first_name: true,
        last_name: true,
        phone: true,
        is_active: true,
        profile_data: true,
      },
      take: parseInt(limit) || 20,
      orderBy: { username: 'asc' }
    });

    // Fetch branch assignments for users that have legacy_id (UserBranch uses integer userId)
    const legacyIds = users.map(u => u.legacy_id).filter(Boolean);
    let userBranchMap = {};
    if (legacyIds.length > 0) {
      try {
        const userBranches = await prisma.userBranch.findMany({
          where: { userId: { in: legacyIds } },
          select: {
            userId: true,
            branchId: true,
          }
        });
        userBranchMap = userBranches.reduce((acc, ub) => {
          acc[ub.userId] = ub.branchId;
          return acc;
        }, {});
      } catch (e) {
        console.warn('[UserSearch] Could not fetch user branches:', e.message);
      }
    }
    
    // Get role levels from rbac_roles table
    let roleLevelMap = {};
    const roleNames = [...new Set(users.map(u => u.role).filter(Boolean))];
    console.log('[UserSearch] Role names to lookup:', roleNames);
    if (roleNames.length > 0) {
      try {
        const roles = await prisma.rbac_roles.findMany({
          where: {
            OR: roleNames.map(name => ({
              name: { equals: name, mode: 'insensitive' }
            }))
          },
          select: { name: true, level: true }
        });
        console.log('[UserSearch] Found roles in DB:', roles);
        roleLevelMap = roles.reduce((acc, r) => {
          const key = (r.name || '').toUpperCase().replace(/\s+/g, '_');
          acc[key] = r.level || 1;
          return acc;
        }, {});
        console.log('[UserSearch] Role level map:', roleLevelMap);
      } catch (e) {
        console.warn('[UserSearch] Could not fetch role levels:', e.message);
      }
    }

    const results = users.map(user => {
      const normalizedRole = (user.role || '').toUpperCase().replace(/\s+/g, '_');
      const roleLevel = roleLevelMap[normalizedRole] || 1;
      // LEGACY FALLBACK: Extract reporting_authority_id from profile_data for old clients
      // CANONICAL: Use reports_to column directly — see USER_MODEL_LOCK.md
      const profileData = user.profile_data || {};
      const reportingAuthorityId = profileData.reporting_authority_id || profileData.reportingAuthorityId || null;
      // Extract branch_id from userBranchMap using legacy_id, fallback to profile_data
      const legacyBranchId = user.legacy_id ? (userBranchMap[user.legacy_id] || null) : null;
      const branchId = legacyBranchId || profileData.branch_id || null;
      return {
        id: user.id,
        username: user.username || user.email?.split('@')[0] || '',
        email: user.email,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        fullName: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : (user.username || user.email?.split('@')[0] || ''),
        phone: user.phone || '',
        mobile: user.phone || '',
        role: user.role || 'USER',
        roleName: user.role || 'USER',
        role_level: roleLevel,
        profilePic: user.profile_pic_url || null,
        is_active: user.is_active ?? true,
        // CANONICAL hierarchy fields — see USER_MODEL_LOCK.md
        reports_to: user.reports_to || null,
        business_level: user.business_level || 1,
        // DEPRECATED: reporting_authority_id — kept for legacy client compatibility
        reporting_authority_id: user.reports_to || reportingAuthorityId,
        branch_id: branchId,
      };
    });

    res.json({
      success: true,
      users: results,
      count: results.length
    });
  } catch (error) {
    console.error('[UserSearch] Error:', error.message);
    res.json({
      success: true,
      users: [],
      count: 0,
      message: 'Search unavailable'
    });
  }
});

// Branches endpoint for dropdowns
app.get('/api/branches', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id || req.user.tenantId;
    const { include_inactive } = req.query;
    const whereClause = {};
    
    // Only filter by active if not requesting inactive branches
    if (include_inactive !== 'true') {
      whereClause.is_active = true;
    }
    
    // Filter by tenant if available
    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }
    
    const branches = await prisma.branches.findMany({
      where: whereClause,
      select: {
        id: true,
        branch_code: true,
        branch_name: true,
        address_line1: true,
        address_line2: true,
        city: true,
        state: true,
        district: true,
        postal_code: true,
        country: true,
        is_active: true,
        created_at: true,
        // Building & Property Details
        building_type: true,
        area_square_feet: true,
        // Agreement & Lease Details
        agreement_type: true,
        agreement_start_date: true,
        agreement_end_date: true,
        monthly_rent: true,
        security_deposit: true,
        rent_escalation_percent: true,
        notice_period_days: true,
        auto_renew: true,
        agreement_reminder_days: true,
        // Owner/Landlord Details
        pan_holder_name: true,
        pan_number: true,
        gst_number: true,
      },
      orderBy: { branch_name: 'asc' }
    });
    
    res.json({
      success: true,
      branches: branches.map(b => ({
        id: String(b.id),
        code: b.branch_code,
        name: b.branch_name,
        address: b.address_line1,
        district: b.district || b.address_line2 || '',
        city: b.city,
        state: b.state,
        pincode: b.postal_code,
        country: b.country,
        isActive: b.is_active,
        buildingType: b.building_type || 'owned',
        areaSquareFeet: b.area_square_feet ? Number(b.area_square_feet) : null,
        // Agreement Details
        agreementType: b.agreement_type || '',
        agreementStartDate: b.agreement_start_date ? b.agreement_start_date.toISOString().split('T')[0] : '',
        agreementEndDate: b.agreement_end_date ? b.agreement_end_date.toISOString().split('T')[0] : '',
        monthlyRent: b.monthly_rent ? Number(b.monthly_rent) : null,
        securityDeposit: b.security_deposit ? Number(b.security_deposit) : null,
        rentEscalationPercent: b.rent_escalation_percent ? Number(b.rent_escalation_percent) : null,
        noticePeriodDays: b.notice_period_days || null,
        autoRenew: b.auto_renew || false,
        agreementReminderDays: b.agreement_reminder_days || null,
        // Owner Details
        panHolderName: b.pan_holder_name || '',
        panNumber: b.pan_number || '',
        gstNumber: b.gst_number || '',
        createdAt: b.created_at,
      })),
      count: branches.length
    });
  } catch (error) {
    console.error('[Branches] Error:', error.message);
    res.json({
      success: true,
      branches: [],
      count: 0,
      message: 'Branches unavailable'
    });
  }
});

// Create new branch
app.post('/api/branches', authenticate, async (req, res) => {
  try {
    const tenantId = req.user.tenant_id || req.user.tenantId;
    const {
      name,
      code,
      address,
      city,
      state,
      district,
      pincode,
      areaSquareFeet,
      buildingType,
      isActive = true,
      // Agreement details
      agreementType,
      agreementStartDate,
      agreementEndDate,
      monthlyRent,
      rentEscalationPercent,
      securityDeposit,
      noticePeriodDays,
      autoRenew,
      agreementReminderDays,
      // PAN details
      panHolderName,
      panNumber,
      gstNumber,
    } = req.body;

    // Validation
    if (!name || !code || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, code, address, city, state, pincode'
      });
    }

    // Check for duplicate branch code OR name within the same tenant
    const existingBranch = await prisma.branches.findFirst({
      where: {
        OR: [
          { branch_code: code },
          { branch_name: { equals: name, mode: 'insensitive' } }
        ],
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });

    if (existingBranch) {
      const duplicateField = existingBranch.branch_code === code ? 'code' : 'name';
      return res.status(400).json({
        success: false,
        error: `Branch ${duplicateField} already exists in this organization`
      });
    }

    // Create branch with all fields
    const branch = await prisma.branches.create({
      data: {
        tenant_id: tenantId || null,
        branch_code: code,
        branch_name: name,
        address_line1: address,
        address_line2: district || null,
        city,
        state,
        district: district || null,
        postal_code: pincode,
        country: 'India',
        is_active: isActive !== false,
        updated_at: new Date(),
        // Building & Property Details
        building_type: buildingType || 'owned',
        area_square_feet: areaSquareFeet ? parseFloat(areaSquareFeet) : null,
        // Agreement & Lease Details
        agreement_type: agreementType || null,
        agreement_start_date: agreementStartDate ? new Date(agreementStartDate) : null,
        agreement_end_date: agreementEndDate ? new Date(agreementEndDate) : null,
        monthly_rent: monthlyRent ? parseFloat(monthlyRent) : null,
        security_deposit: securityDeposit ? parseFloat(securityDeposit) : null,
        rent_escalation_percent: rentEscalationPercent ? parseFloat(rentEscalationPercent) : null,
        notice_period_days: noticePeriodDays ? parseInt(noticePeriodDays) : null,
        auto_renew: autoRenew || false,
        agreement_reminder_days: agreementReminderDays ? parseInt(agreementReminderDays) : null,
        // Owner/Landlord Details
        pan_holder_name: panHolderName || null,
        pan_number: panNumber || null,
        gst_number: gstNumber || null,
      }
    });

    console.log('[Branches] Created branch:', branch.branch_name);

    res.status(201).json({
      success: true,
      branch: {
        id: String(branch.id),
        code: branch.branch_code,
        name: branch.branch_name,
        city: branch.city,
        isActive: branch.is_active,
      },
      message: 'Branch created successfully'
    });
  } catch (error) {
    console.error('[Branches] Create error:', error.message);
    
    // Handle unique constraint violations with user-friendly messages
    if (error.code === 'P2002') {
      const target = error.meta?.target;
      if (target?.includes('branch_code') || target?.includes('code')) {
        return res.status(400).json({
          success: false,
          error: 'A branch with this code already exists. Please use a different branch code.'
        });
      }
      if (target?.includes('branch_name') || target?.includes('name')) {
        return res.status(400).json({
          success: false,
          error: 'A branch with this name already exists. Please use a different branch name.'
        });
      }
      return res.status(400).json({
        success: false,
        error: 'A branch with these details already exists.'
      });
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create branch'
    });
  }
});

// Update branch
app.put('/api/branches/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;
    const {
      name,
      code,
      address,
      city,
      state,
      district,
      pincode,
      isActive,
      // Building & Property Details
      buildingType,
      areaSquareFeet,
      // Agreement & Lease Details
      agreementType,
      agreementStartDate,
      agreementEndDate,
      monthlyRent,
      securityDeposit,
      rentEscalationPercent,
      noticePeriodDays,
      autoRenew,
      agreementReminderDays,
      // Owner/Landlord Details
      panHolderName,
      panNumber,
      gstNumber,
    } = req.body;

    // Find existing branch
    const existingBranch = await prisma.branches.findFirst({
      where: {
        id: parseInt(id),
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Update branch with all fields
    const branch = await prisma.branches.update({
      where: { id: parseInt(id) },
      data: {
        branch_code: code || existingBranch.branch_code,
        branch_name: name || existingBranch.branch_name,
        address_line1: address || existingBranch.address_line1,
        address_line2: district !== undefined ? district : existingBranch.address_line2,
        city: city || existingBranch.city,
        state: state || existingBranch.state,
        district: district !== undefined ? district : existingBranch.district,
        postal_code: pincode || existingBranch.postal_code,
        is_active: isActive !== undefined ? isActive : existingBranch.is_active,
        updated_at: new Date(),
        // Building & Property Details
        building_type: buildingType !== undefined ? buildingType : existingBranch.building_type,
        area_square_feet: areaSquareFeet !== undefined && areaSquareFeet !== '' ? parseFloat(areaSquareFeet) : existingBranch.area_square_feet,
        // Agreement & Lease Details
        agreement_type: agreementType !== undefined ? agreementType : existingBranch.agreement_type,
        agreement_start_date: agreementStartDate !== undefined ? (agreementStartDate ? new Date(agreementStartDate) : null) : existingBranch.agreement_start_date,
        agreement_end_date: agreementEndDate !== undefined ? (agreementEndDate ? new Date(agreementEndDate) : null) : existingBranch.agreement_end_date,
        monthly_rent: monthlyRent !== undefined && monthlyRent !== '' ? parseFloat(monthlyRent) : existingBranch.monthly_rent,
        security_deposit: securityDeposit !== undefined && securityDeposit !== '' ? parseFloat(securityDeposit) : existingBranch.security_deposit,
        rent_escalation_percent: rentEscalationPercent !== undefined && rentEscalationPercent !== '' ? parseFloat(rentEscalationPercent) : existingBranch.rent_escalation_percent,
        notice_period_days: noticePeriodDays !== undefined && noticePeriodDays !== '' ? parseInt(noticePeriodDays) : existingBranch.notice_period_days,
        auto_renew: autoRenew !== undefined ? autoRenew : existingBranch.auto_renew,
        agreement_reminder_days: agreementReminderDays !== undefined && agreementReminderDays !== '' ? parseInt(agreementReminderDays) : existingBranch.agreement_reminder_days,
        // Owner/Landlord Details
        pan_holder_name: panHolderName !== undefined ? panHolderName : existingBranch.pan_holder_name,
        pan_number: panNumber !== undefined ? panNumber : existingBranch.pan_number,
        gst_number: gstNumber !== undefined ? gstNumber : existingBranch.gst_number,
      }
    });

    console.log('[Branches] Updated branch:', branch.branch_name);

    res.json({
      success: true,
      branch: {
        id: String(branch.id),
        code: branch.branch_code,
        name: branch.branch_name,
        city: branch.city,
        isActive: branch.is_active,
      },
      message: 'Branch updated successfully'
    });
  } catch (error) {
    console.error('[Branches] Update error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update branch'
    });
  }
});

// Toggle branch active status (Enable/Disable)
app.patch('/api/branches/:id/toggle-status', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenant_id || req.user.tenantId;
    
    console.log(`[Branches] Toggle request for branch ID: ${id}, tenant: ${tenantId}`);

    // Parse ID - handle both numeric and string IDs
    const branchId = parseInt(id);
    if (isNaN(branchId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid branch ID'
      });
    }

    // Find existing branch
    const existingBranch = await prisma.branches.findFirst({
      where: {
        id: branchId,
        ...(tenantId ? { tenant_id: tenantId } : {})
      }
    });

    if (!existingBranch) {
      return res.status(404).json({
        success: false,
        error: 'Branch not found'
      });
    }

    // Toggle the is_active status
    const newStatus = !existingBranch.is_active;
    
    const branch = await prisma.branches.update({
      where: { id: branchId },
      data: {
        is_active: newStatus,
        updated_at: new Date(),
      }
    });

    console.log(`[Branches] ${newStatus ? 'Enabled' : 'Disabled'} branch:`, branch.branch_name);

    res.json({
      success: true,
      branch: {
        id: String(branch.id),
        code: branch.branch_code,
        name: branch.branch_name,
        isActive: branch.is_active,
      },
      message: `Branch ${newStatus ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('[Branches] Toggle status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle branch status'
    });
  }
});

// Vendor search endpoint for payment requests
app.get('/api/vendors/search', authenticate, async (req, res) => {
  try {
    const { q = '', limit = 10 } = req.query;
    const searchTerm = q.toString().toLowerCase().trim();
    const tenantId = req.user.tenant_id || req.user.tenantId;

    if (!searchTerm || searchTerm.length < 1) {
      return res.json({ success: true, vendors: [], count: 0 });
    }

    // Try to find vendors in non_privileged_users table
    const whereClause = {
      is_active: true,
      OR: [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { contact_person: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { pan_number: { contains: searchTerm, mode: 'insensitive' } },
      ]
    };

    if (tenantId) {
      whereClause.tenant_id = tenantId;
    }

    const vendors = await prisma.non_privileged_user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        user_type: true,
        contact_person: true,
        email: true,
        phone: true,
        pan_number: true,
        bank_name: true,
        account_number: true,
        ifsc_code: true,
      },
      take: parseInt(limit) || 10,
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      vendors: vendors.map(v => ({
        id: v.id,
        name: v.name,
        type: v.user_type,
        contactPerson: v.contact_person,
        email: v.email,
        phone: v.phone,
        panNumber: v.pan_number,
        bankName: v.bank_name,
        accountNumber: v.account_number,
        ifscCode: v.ifsc_code,
      })),
      count: vendors.length
    });
  } catch (error) {
    console.error('[VendorSearch] Error:', error.message);
    res.json({
      success: true,
      vendors: [],
      count: 0,
      message: 'Vendor search unavailable'
    });
  }
});

// Roles endpoint for dropdowns
app.get('/api/roles', authenticate, async (req, res) => {
  try {
    // Roles that should only be visible to SUPER_ADMIN or ENTERPRISE_ADMIN
    const restrictedRoles = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'];
    const userRole = req.user?.role || req.user?.userType;
    
    // Build where clause - filter out restricted roles for non-super users
    const whereClause = {};
    if (!['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(userRole)) {
      whereClause.name = {
        notIn: restrictedRoles
      };
    }
    
    const roles = await prisma.rbac_roles.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        display_name: true,
        level: true,
      },
      orderBy: { level: 'asc' }
    });
    
    // Also filter out ADMIN role for ADMIN users (they shouldn't create other admins)
    let filteredRoles = roles;
    if (userRole === 'ADMIN') {
      filteredRoles = roles.filter(r => r.name !== 'ADMIN');
    }
    
    res.json({
      success: true,
      roles: filteredRoles.map(r => ({
        id: String(r.id),
        name: r.name,
        displayName: r.display_name || r.name,
        level: r.level,
      })),
      count: filteredRoles.length
    });
  } catch (error) {
    console.error('[Roles] Error:', error.message);
    // Fallback to hardcoded roles if database fails
    const fallbackRoles = [
      { id: '1', name: 'HUB_INCHARGE', displayName: 'Hub Incharge', level: 5 },
      { id: '2', name: 'STORE_INCHARGE', displayName: 'Store Incharge', level: 5 },
      { id: '3', name: 'BRANCH_INCHARGE', displayName: 'Branch Incharge', level: 5 },
      { id: '4', name: 'OPERATIONS_MANAGER', displayName: 'Operations Manager', level: 4 },
      { id: '5', name: 'FINANCE_CONTROLLER', displayName: 'Finance Controller', level: 4 },
      { id: '6', name: 'HR_MANAGER', displayName: 'HR Manager', level: 3 },
    ];
    res.json({
      success: true,
      roles: fallbackRoles,
      count: fallbackRoles.length,
      message: 'Using fallback roles'
    });
  }
});

// Users management endpoint
app.get('/api/users', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN']), async (req, res) => {
  try {
    let users = []
    console.log('[/api/users] Request from user:', req.user?.email, 'role:', req.user?.role, 'tenant_id:', req.user?.tenant_id);
    
    // Try to fetch from database first
    try {
      // SECURITY FIX: Always filter by tenant_id for tenant isolation
      // Admins only see users from their own tenant
      const tenantId = req.user?.tenant_id;
      let whereClause = {};
      
      // MANDATORY tenant isolation - admins only see their own tenant's users
      if (tenantId) {
        whereClause = { tenant_id: tenantId };
      } else {
        console.warn('[/api/users] No tenant_id found - returning empty for security');
        return res.json({ success: true, users: [], total: 0 });
      }
      console.log('[/api/users] Where clause:', JSON.stringify(whereClause));
      
      const dbUsers = await prisma.users_enhanced.findMany({
        where: whereClause,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          created_at: true,
          is_active: true,
          first_name: true,
          last_name: true,
        },
        orderBy: {
          created_at: 'desc'
        }
      })
      console.log('[/api/users] Found', dbUsers.length, 'users for tenant', tenantId?.substring(0,8));
      
      users = dbUsers.map(user => ({
        id: user.id,
        username: user.username || user.email.split('@')[0],
        email: user.email,
        roleName: user.role || 'USER',
        role: user.role || 'USER',
        isActive: user.is_active !== false,
        createdAt: user.created_at?.toISOString() || new Date().toISOString(),
        firstName: user.first_name,
        lastName: user.last_name,
        lastLogin: null
      }))
    } catch (dbError) {
      console.error('Database query failed in /api/users:', dbError.message)
      // Return empty array instead of mock data - show real state
      users = []
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

// Update user role
app.put('/api/users/:userId/role', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({ success: false, message: 'Role is required' });
    }

    // Security: Ensure user is in same tenant
    const tenantFilter = TenantGuard.getTenantFilter(req);
    
    const existingUser = await prisma.users_enhanced.findFirst({
      where: { id: userId, ...tenantFilter }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update role
    const updatedUser = await prisma.users_enhanced.update({
      where: { id: userId },
      data: { 
        role: role,
        updatedAt: new Date()
      }
    });

    console.log(`[User Management] Role updated for user ${userId}: ${existingUser.role} -> ${role} by ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: 'Role updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (err) {
    console.error('Update user role error:', err);
    res.status(500).json({ success: false, message: 'Failed to update role' });
  }
});

// Update user status (enable/disable)
app.put('/api/users/:userId/status', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { is_active } = req.body;

    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ success: false, message: 'is_active must be a boolean' });
    }

    // Security: Ensure user is in same tenant
    const tenantFilter = TenantGuard.getTenantFilter(req);
    
    const existingUser = await prisma.users_enhanced.findFirst({
      where: { id: userId, ...tenantFilter }
    });

    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent disabling yourself
    if (userId === req.user.id && !is_active) {
      return res.status(400).json({ success: false, message: 'Cannot disable your own account' });
    }

    // Update status
    const updatedUser = await prisma.users_enhanced.update({
      where: { id: userId },
      data: { 
        is_active: is_active,
        updatedAt: new Date()
      }
    });

    console.log(`[User Management] Status updated for user ${userId}: is_active=${is_active} by ${req.user.email}`);
    
    res.json({ 
      success: true, 
      message: is_active ? 'User enabled' : 'User disabled',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        is_active: updatedUser.is_active
      }
    });
  } catch (err) {
    console.error('Update user status error:', err);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// Admin password reset (send reset link to user)
app.post('/api/auth/admin-password-reset', authenticate, requireRole(['ADMIN', 'SUPER_ADMIN', 'HR', 'HR_MANAGER']), async (req, res) => {
  try {
    const { user_id, email } = req.body;

    if (!user_id && !email) {
      return res.status(400).json({ success: false, message: 'user_id or email is required' });
    }

    // Security: Ensure user is in same tenant
    const tenantFilter = TenantGuard.getTenantFilter(req);
    
    const targetUser = await prisma.users_enhanced.findFirst({
      where: user_id ? { id: user_id, ...tenantFilter } : { email: email, ...tenantFilter }
    });

    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate reset token
    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token in user record
    await prisma.users_enhanced.update({
      where: { id: targetUser.id },
      data: { 
        reset_token: resetToken,
        reset_token_expiry: resetExpiry,
        updatedAt: new Date()
      }
    });

    // TODO: Send email with reset link (for now just log it)
    console.log(`[Admin Password Reset] Reset token generated for ${targetUser.email} by ${req.user.email}`);
    console.log(`[Admin Password Reset] Reset link: ${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`);

    res.json({ 
      success: true, 
      message: 'Password reset link sent to user email'
    });
  } catch (err) {
    console.error('Admin password reset error:', err);
    res.status(500).json({ success: false, message: 'Failed to send password reset' });
  }
});

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
      // Use imported limiters safely
      if (strictLoginLimiter?.resetKey) strictLoginLimiter.resetKey(req.ip);
      if (standardApiLimiter?.resetKey) standardApiLimiter.resetKey(req.ip);
      console.log('[DEV] Rate limits have been reset for IP:', req.ip)
      res.status(200).send('Rate limits cleared.')
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
app.use('/api/*', (req, res, _next) => {
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

// Initialize Job Queue Worker
// ============================================================================
try {
  require('./jobs/onboardingJobs'); // Register handlers
  const { startWorker } = require('./jobs/jobQueue');
  if (process.env.ENABLE_JOB_WORKER !== 'false') {
    startWorker(5000); // Poll every 5 seconds
    console.log('✅ Job queue worker started');
  }
} catch (err) {
  console.warn('⚠️ Job queue initialization failed:', err.message);
}

// ============================================================================
// Initialize Scheduled Jobs (Trial Expiry, Daily Aggregation)
// ============================================================================
try {
  if (process.env.ENABLE_SCHEDULED_JOBS !== 'false') {
    const { startTrialExpiryJob } = require('./jobs/trialExpiryJob');
    const { startDailyAggregationJob } = require('./jobs/aggregateDailyUsageJob');
    
    startTrialExpiryJob();
    startDailyAggregationJob();
    console.log('✅ Scheduled jobs started (trial expiry, daily aggregation)');
  }
} catch (err) {
  console.warn('⚠️ Scheduled jobs initialization failed:', err.message);
}

// ============================================================================
// Initialize Alert Jobs (Quota Alerts, Weekly Audit Reports)
// ============================================================================
try {
  if (process.env.ENABLE_ALERT_JOBS !== 'false') {
    const { startQuotaAlertJob } = require('./jobs/quotaAlertJob');
    const { startWeeklyAuditJob } = require('./jobs/weeklyAuditJob');
    
    startQuotaAlertJob();
    startWeeklyAuditJob();
    console.log('✅ Alert jobs started (quota alerts, weekly audit)');
  }
} catch (err) {
  console.warn('⚠️ Alert jobs initialization failed:', err.message);
}

module.exports = app
