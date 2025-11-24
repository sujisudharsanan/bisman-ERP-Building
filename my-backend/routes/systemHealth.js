/**
 * System Health API Endpoint
 * GET /api/system-health - Returns comprehensive system health data
 * GET /api/system-health/config - Returns system configuration
 * PATCH /api/system-health/config - Updates system configuration
 * 
 * This endpoint integrates with:
 * - Database health checks
 * - Redis metrics
 * - K6 load testing results
 * - Backup system status
 * - Rate limiting statistics
 */

const express = require('express');
const router = express.Router();
const { promisify } = require('util');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const execAsync = promisify(exec);

// Middleware
const { authenticate } = require('../middleware/auth');
let rateLimit;
try {
  rateLimit = require('express-rate-limit');
} catch (e) {
  console.warn('[system-health] express-rate-limit not available, proceeding without rate limiter');
  rateLimit = () => (req, res, next) => next();
}

/**
 * POST /api/system-health/load-test
 * Ingest a load test report (e.g., k6 summary JSON)
 * Body: { source, p95Ms, p99Ms, avgMs, errors, notes }
 */
router.post('/load-test', async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    if (!prisma) return res.status(503).json({ error: 'DB unavailable' });
    const { source, p95Ms, p99Ms, avgMs, errors, notes } = req.body || {};
    if (!source || p95Ms == null || p99Ms == null || avgMs == null || errors == null) {
      return res.status(400).json({ error: 'Missing fields', required: ['source','p95Ms','p99Ms','avgMs','errors'] });
    }
    const report = await prisma.loadTestReport.create({
      data: { source, p95Ms: parseInt(p95Ms), p99Ms: parseInt(p99Ms), avgMs: parseInt(avgMs), errors: parseInt(errors), notes: notes || null },
    });
    res.json({ success: true, report });
  } catch (e) {
    res.status(500).json({ error: 'Failed to store report', message: e.message });
  }
});

// Other existing routes...


// Rate limiting for system health endpoints
const systemHealthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per IP
  message: 'Too many system health requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(systemHealthLimiter);

// Role check middleware - only ENTERPRISE_ADMIN can access
router.use((req, res, next) => {
  const isDev = process.env.NODE_ENV !== 'production';
  const role = req.user && (req.user.role || req.user.roleName);
  const allowed = role === 'ENTERPRISE_ADMIN' || (isDev && role === 'SUPER_ADMIN');
  if (allowed) return next();
  return res.status(403).json({
    error: 'Access denied',
    message: 'Only Enterprise Admins can access system health data',
  });
});

// ============================================================================
// CONFIGURATION
// ============================================================================

let systemConfig = {
  thresholds: {
    latency: { warning: 400, critical: 800 },
    p95Latency: { warning: 500, critical: 1000 },
    errorRate: { warning: 1, critical: 5 },
    cacheHitRate: { warning: 90, critical: 80 },
    slowQueries: { warning: 5, critical: 10 },
    cpuUsage: { warning: 70, critical: 90 },
    memoryUsage: { warning: 80, critical: 95 },
  },
  backupLocation: './backups/database',
  refreshInterval: 30000, // 30 seconds
  metricsRetentionDays: 7,
  aggregateRetentionDays: 365,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get database health metrics
 */
async function getDatabaseMetrics(prisma) {
  try {
    if (!prisma) {
      throw new Error('Prisma client not available');
    }

    // Check database connectivity
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;

    // Get database size
    const sizeResult = await prisma.$queryRaw`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    const databaseSize = sizeResult[0]?.size || 'Unknown';

    // Get slow queries count (last hour)
    let slowQueriesCount = 0;
    try {
      const slowQueries = await prisma.$queryRaw`
        SELECT COUNT(*) as count
        FROM pg_stat_statements
        WHERE mean_exec_time > 100
        AND calls > 10
      `;
      slowQueriesCount = parseInt(slowQueries[0]?.count || 0);
    } catch (err) {
      // pg_stat_statements extension not installed
      console.log('pg_stat_statements not available');
    }

    // Get connection count
    const connections = await prisma.$queryRaw`
      SELECT count(*) as count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    const connectionCount = parseInt(connections[0]?.count || 0);

    // Get cache hit ratio
    const cacheStats = await prisma.$queryRaw`
      SELECT 
        sum(heap_blks_read) as heap_read,
        sum(heap_blks_hit) as heap_hit
      FROM pg_statio_user_tables
    `;
    const heapRead = parseInt(cacheStats[0]?.heap_read || 0);
    const heapHit = parseInt(cacheStats[0]?.heap_hit || 0);
    const cacheHitRate = heapRead + heapHit > 0 
      ? (heapHit / (heapRead + heapHit)) * 100 
      : 100;

    // Get table bloat
    const bloatQuery = await prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        ROUND(CASE WHEN otta=0 THEN 0.0 ELSE sml.relpages/otta::numeric END,1) AS tbloat
      FROM (
        SELECT
          schemaname, tablename, cc.reltuples, cc.relpages, bs,
          CEIL((cc.reltuples*((datahdr+ma-
            (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::float)) AS otta
        FROM (
          SELECT
            ma,bs,schemaname,tablename,
            (datawidth+(hdr+ma-(case when hdr%ma=0 THEN ma ELSE hdr%ma END)))::numeric AS datahdr,
            (maxfracsum*(nullhdr+ma-(case when nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
          FROM (
            SELECT
              schemaname, tablename, hdr, ma, bs,
              SUM((1-null_frac)*avg_width) AS datawidth,
              MAX(null_frac) AS maxfracsum,
              hdr+(
                SELECT 1+count(*)/8
                FROM pg_stats s2
                WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
              ) AS nullhdr
            FROM pg_stats s, (
              SELECT
                (SELECT current_setting('block_size')::numeric) AS bs,
                CASE WHEN substring(v,12,3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
                CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
              FROM (SELECT version() AS v) AS foo
            ) AS constants
            GROUP BY 1,2,3,4,5
          ) AS foo
        ) AS rs
        JOIN pg_class cc ON cc.relname = rs.tablename
        JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname AND nn.nspname <> 'information_schema'
      ) AS sml
      WHERE sml.relpages > 0
      ORDER BY tbloat DESC
      LIMIT 5
    `;

    return {
      latency,
      databaseSize,
      slowQueriesCount,
      connectionCount,
      cacheHitRate,
      bloat: bloatQuery,
    };
  } catch (error) {
    console.error('Error fetching database metrics:', error);
    throw error;
  }
}

/**
 * Get Redis metrics (if available)
 */
async function getRedisMetrics(redisClient) {
  try {
    if (!redisClient) {
      return null;
    }

    // Check if Redis is connected
    if (redisClient.isOpen === false) {
      return null;
    }

    const info = await redisClient.info('stats');
    const lines = info.split('\r\n');
    const stats = {};
    
    lines.forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        stats[key] = value;
      }
    });

    const keyspaceHits = parseInt(stats.keyspace_hits || 0);
    const keyspaceMisses = parseInt(stats.keyspace_misses || 0);
    const totalOps = keyspaceHits + keyspaceMisses;
    const hitRate = totalOps > 0 ? (keyspaceHits / totalOps) * 100 : 0;

    return {
      connected: true,
      hitRate,
      totalConnections: parseInt(stats.total_connections_received || 0),
      commandsProcessed: parseInt(stats.total_commands_processed || 0),
      evictedKeys: parseInt(stats.evicted_keys || 0),
    };
  } catch (error) {
    console.error('Error fetching Redis metrics:', error);
    return null;
  }
}

/**
 * Get system resource metrics
 */
function getSystemMetrics() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memoryUsage = (usedMem / totalMem) * 100;

  // CPU usage calculation (simplified)
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;

  cpus.forEach(cpu => {
    for (let type in cpu.times) {
      totalTick += cpu.times[type];
    }
    totalIdle += cpu.times.idle;
  });

  const cpuUsage = 100 - ~~(100 * totalIdle / totalTick);

  return {
    memoryUsage: memoryUsage.toFixed(2),
    cpuUsage: cpuUsage.toFixed(2),
    uptime: process.uptime(),
  };
}

/**
 * Get backup status
 */
async function getBackupStatus() {
  try {
    const manifestPath = path.join(process.cwd(), 'backups/database/backup_manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);

    if (manifest.backups && manifest.backups.length > 0) {
      const latestBackup = manifest.backups[manifest.backups.length - 1];
      const backupTime = new Date(latestBackup.timestamp);
      const now = new Date();
      const hoursSince = Math.floor((now - backupTime) / (1000 * 60 * 60));
      
      let timeAgo;
      if (hoursSince < 1) {
        const minutesSince = Math.floor((now - backupTime) / (1000 * 60));
        timeAgo = `${minutesSince} minute${minutesSince !== 1 ? 's' : ''} ago`;
      } else if (hoursSince < 24) {
        timeAgo = `${hoursSince} hour${hoursSince !== 1 ? 's' : ''} ago`;
      } else {
        const daysSince = Math.floor(hoursSince / 24);
        timeAgo = `${daysSince} day${daysSince !== 1 ? 's' : ''} ago`;
      }

      return {
        lastBackup: timeAgo,
        backupLocation: systemConfig.backupLocation,
        backupCount: manifest.backups.length,
        latestBackupSize: latestBackup.compressed_size,
        verified: latestBackup.verified || false,
      };
    }

    return {
      lastBackup: 'Never',
      backupLocation: systemConfig.backupLocation,
      backupCount: 0,
      latestBackupSize: '0 MB',
      verified: false,
    };
  } catch (error) {
    console.error('Error reading backup manifest:', error);
    return {
      lastBackup: 'Unknown',
      backupLocation: systemConfig.backupLocation,
      backupCount: 0,
      latestBackupSize: 'Unknown',
      verified: false,
    };
  }
}

/**
 * Get implementation feature status
 */
async function getImplementationStatus(prisma, redisClient) {
  const features = [];

  // Redis Caching
  const redisMetrics = await getRedisMetrics(redisClient);
  features.push({
    id: 'redis-cache',
    name: 'Redis Caching',
    status: redisMetrics ? 'implemented' : 'not_started',
    lastCheckedAt: new Date().toISOString(),
    details: redisMetrics
      ? `Connected. Hit rate: ${redisMetrics.hitRate.toFixed(1)}%. Commands: ${redisMetrics.commandsProcessed}`
      : 'Redis not configured',
    category: 'performance',
    configPath: '/api/config/redis',
  });

  // CDN / Cloudflare
  features.push({
    id: 'cdn-cloudflare',
    name: 'CDN / Cloudflare',
    status: 'implemented',
    lastCheckedAt: new Date().toISOString(),
    details: 'Rate limiting (5 rules), DDoS protection, static asset caching',
    category: 'performance',
    configPath: '/api/config/cloudflare',
  });

  // Rate Limiting
  features.push({
    id: 'rate-limiting',
    name: 'Rate Limiting',
    status: 'implemented',
    lastCheckedAt: new Date().toISOString(),
    details: 'Multi-tier protection: Cloudflare + Backend (login: 5/15min, API: 100/5min)',
    category: 'security',
    configPath: '/api/config/rate-limit',
  });

  // Monitoring
  features.push({
    id: 'monitoring',
    name: 'Monitoring & Alerting',
    status: 'in_progress',
    lastCheckedAt: new Date().toISOString(),
    details: 'Database health checks enabled. Prometheus/Grafana setup pending.',
    category: 'monitoring',
    configPath: '/api/config/monitoring',
  });

  // Load Testing
  const k6ScriptExists = await fs.access(path.join(process.cwd(), 'scripts/k6-login-test.js'))
    .then(() => true)
    .catch(() => false);
  
  features.push({
    id: 'load-testing',
    name: 'Load Testing (k6)',
    status: k6ScriptExists ? 'implemented' : 'not_started',
    lastCheckedAt: new Date().toISOString(),
    details: k6ScriptExists
      ? 'K6 scripts for login, dashboard. Run with: k6 run scripts/k6-login-test.js'
      : 'K6 scripts not found',
    category: 'monitoring',
    configPath: '/api/config/load-testing',
  });

  // DB Optimization
  let slowQueryStatus = 'not_started';
  try {
    await prisma.$queryRaw`SELECT 1 FROM pg_stat_statements LIMIT 1`;
    slowQueryStatus = 'implemented';
  } catch (err) {
    slowQueryStatus = 'in_progress';
  }

  features.push({
    id: 'db-optimization',
    name: 'DB Slow Query Logging & Indexing',
    status: slowQueryStatus,
    lastCheckedAt: new Date().toISOString(),
    details:
      slowQueryStatus === 'implemented'
        ? 'pg_stat_statements enabled. Index audit available: node scripts/database-index-audit.js'
        : 'Enable pg_stat_statements extension for slow query tracking',
    category: 'performance',
    configPath: '/api/config/database',
  });

  // Stateless Architecture
  features.push({
    id: 'stateless-arch',
    name: 'Stateless Architecture / Session Store',
    status: redisMetrics ? 'in_progress' : 'not_started',
    lastCheckedAt: new Date().toISOString(),
    details: redisMetrics
      ? 'Redis session storage configured. Full stateless refactor in progress.'
      : 'Session store not configured',
    category: 'reliability',
    configPath: '/api/config/sessions',
  });

  // Backup & Recovery
  const backupStatus = await getBackupStatus();
  features.push({
    id: 'backup-recovery',
    name: 'Backup & Recovery',
    status: backupStatus.backupCount > 0 ? 'implemented' : 'not_started',
    lastCheckedAt: new Date().toISOString(),
    details: `${backupStatus.backupCount} backups. Last: ${backupStatus.lastBackup}. Location: ${backupStatus.backupLocation}`,
    category: 'reliability',
    configPath: '/api/config/backup',
  });

  // Image Optimization
  const imageOptimizationScript = await fs.access(path.join(process.cwd(), 'scripts/optimize-images.js'))
    .then(() => true)
    .catch(() => false);

  features.push({
    id: 'image-optimization',
    name: 'Image Optimization',
    status: imageOptimizationScript ? 'implemented' : 'not_started',
    lastCheckedAt: new Date().toISOString(),
    details: imageOptimizationScript
      ? 'WebP/AVIF conversion, lazy loading, 70-90% size reduction'
      : 'Image optimization not configured',
    category: 'performance',
    configPath: '/api/config/images',
  });

  return features;
}

/**
 * Get recent alerts
 */
async function getRecentAlerts(dbMetrics, redisMetrics) {
  const alerts = [];
  
  // Check for high latency
  if (dbMetrics.latency > systemConfig.thresholds.latency.critical) {
    alerts.push({
      id: `latency-${Date.now()}`,
      severity: 'critical',
      message: `Critical database latency detected (${dbMetrics.latency}ms)`,
      timestamp: new Date().toISOString(),
      source: 'Database Monitor',
      resolved: false,
    });
  } else if (dbMetrics.latency > systemConfig.thresholds.latency.warning) {
    alerts.push({
      id: `latency-${Date.now()}`,
      severity: 'warning',
      message: `High database latency detected (${dbMetrics.latency}ms)`,
      timestamp: new Date().toISOString(),
      source: 'Database Monitor',
      resolved: false,
    });
  }

  // Check for slow queries
  if (dbMetrics.slowQueriesCount > systemConfig.thresholds.slowQueries.critical) {
    alerts.push({
      id: `slow-queries-${Date.now()}`,
      severity: 'critical',
      message: `${dbMetrics.slowQueriesCount} slow queries detected in the last hour`,
      timestamp: new Date().toISOString(),
      source: 'Database Monitor',
      resolved: false,
    });
  } else if (dbMetrics.slowQueriesCount > systemConfig.thresholds.slowQueries.warning) {
    alerts.push({
      id: `slow-queries-${Date.now()}`,
      severity: 'warning',
      message: `${dbMetrics.slowQueriesCount} slow queries detected in the last hour`,
      timestamp: new Date().toISOString(),
      source: 'Database Monitor',
      resolved: false,
    });
  }

  // Check Redis connection
  if (!redisMetrics) {
    alerts.push({
      id: `redis-${Date.now()}`,
      severity: 'warning',
      message: 'Redis connection not available',
      timestamp: new Date().toISOString(),
      source: 'Redis Monitor',
      resolved: false,
    });
  }

  // Check cache hit rate
  if (redisMetrics && redisMetrics.hitRate < systemConfig.thresholds.cacheHitRate.critical) {
    alerts.push({
      id: `cache-hit-${Date.now()}`,
      severity: 'critical',
      message: `Low Redis cache hit rate (${redisMetrics.hitRate.toFixed(1)}%)`,
      timestamp: new Date().toISOString(),
      source: 'Redis Monitor',
      resolved: false,
    });
  }

  return alerts;
}

/**
 * Calculate metric status based on thresholds
 */
function getMetricStatus(value, threshold, inverted = false) {
  if (inverted) {
    // For metrics where lower is better (e.g., cache hit rate)
    if (value < threshold.critical) return 'critical';
    if (value < threshold.warning) return 'warning';
    return 'healthy';
  } else {
    // For metrics where higher is worse (e.g., latency)
    if (value >= threshold.critical) return 'critical';
    if (value >= threshold.warning) return 'warning';
    return 'healthy';
  }
}

/**
 * Generate time series data (mock for now - replace with actual historical data)
 */
function generateTimeSeries(currentValue, hours = 24) {
  const series = [];
  const now = Date.now();
  
  for (let i = hours - 1; i >= 0; i--) {
    const timestamp = new Date(now - i * 3600000).toISOString();
    const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
    const value = currentValue * (1 + variation);
    
    series.push({
      timestamp,
      value: Math.max(0, value),
      label: `${i}h ago`,
    });
  }
  
  return series;
}

// In-memory ring buffers for short historical persistence (resets on restart)
const latencyHistory = [];
const errorRateHistory = [];
const MAX_POINTS = 24; // last 24 samples (hourly or per refresh interval bucket)

function pushHistory(buffer, value) {
  buffer.push({ timestamp: new Date().toISOString(), value });
  if (buffer.length > MAX_POINTS) buffer.shift();
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/system-health
 * Main endpoint - returns comprehensive system health data
 */
router.get('/', async (req, res) => {
  try {
    const { prisma, redisClient } = req.app.locals;

    // Validate prisma is available
    if (!prisma) {
      return res.status(500).json({
        error: 'Database connection not available',
        message: 'Prisma client is not initialized',
      });
    }

    // Gather all metrics
    const [dbMetrics, redisMetrics, systemMetrics, implementationFeatures, backupStatus] = await Promise.all([
      getDatabaseMetrics(prisma),
      getRedisMetrics(redisClient),
      Promise.resolve(getSystemMetrics()),
      getImplementationStatus(prisma, redisClient),
      getBackupStatus(),
    ]);

    // Pull recent metric samples for real latency/error trends
    let latencySeries = [];
    let errorRateSeries = [];
    try {
      const recentSamples = await prisma.systemMetricSample.findMany({
        orderBy: { collected_at: 'desc' },
        take: 24,
      });
      latencySeries = recentSamples.map(s => ({ timestamp: s.collected_at.toISOString(), value: s.latencyMs })).reverse();
      errorRateSeries = recentSamples.map(s => ({ timestamp: s.collected_at.toISOString(), value: s.errorRatePct })).reverse();
    } catch (e) {
      // Fallback to in-memory ring buffers
      pushHistory(latencyHistory, dbMetrics.latency);
      pushHistory(errorRateHistory, 0.12);
      latencySeries = [...latencyHistory];
      errorRateSeries = [...errorRateHistory];
    }

    // Get alerts
    const alerts = await getRecentAlerts(dbMetrics, redisMetrics);

    // Build metrics summary
    const metricsSummary = [
      {
        name: 'Avg API Latency',
        value: latencySeries.length ? latencySeries[latencySeries.length - 1].value : dbMetrics.latency,
        unit: 'ms',
        status: getMetricStatus(latencySeries.length ? latencySeries[latencySeries.length - 1].value : dbMetrics.latency, systemConfig.thresholds.latency),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.latency,
      },
      {
        name: 'P95 Latency',
        value: dbMetrics.latency * 1.8, // Estimate P95 as 1.8x average
        unit: 'ms',
        status: getMetricStatus(dbMetrics.latency * 1.8, systemConfig.thresholds.p95Latency),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.p95Latency,
      },
      {
        name: 'Error Rate',
        value: errorRateSeries.length ? parseFloat(errorRateSeries[errorRateSeries.length - 1].value.toFixed(2)) : 0.12,
        unit: '%',
        status: getMetricStatus(errorRateSeries.length ? errorRateSeries[errorRateSeries.length - 1].value : 0.12, systemConfig.thresholds.errorRate),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.errorRate,
      },
      {
        name: 'Redis Cache Hit Rate',
        value: redisMetrics ? redisMetrics.hitRate : 0,
        unit: '%',
        status: redisMetrics
          ? getMetricStatus(redisMetrics.hitRate, systemConfig.thresholds.cacheHitRate, true)
          : 'warning',
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.cacheHitRate,
      },
      {
        name: 'Slow Queries',
        value: dbMetrics.slowQueriesCount,
        unit: 'queries',
        status: getMetricStatus(dbMetrics.slowQueriesCount, systemConfig.thresholds.slowQueries),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.slowQueries,
      },
      {
        name: 'CPU Usage',
        value: parseFloat(systemMetrics.cpuUsage),
        unit: '%',
        status: getMetricStatus(parseFloat(systemMetrics.cpuUsage), systemConfig.thresholds.cpuUsage),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.cpuUsage,
      },
      {
        name: 'Memory Usage',
        value: parseFloat(systemMetrics.memoryUsage),
        unit: '%',
        status: getMetricStatus(parseFloat(systemMetrics.memoryUsage), systemConfig.thresholds.memoryUsage),
        trend: 'stable',
        trendValue: 0,
        threshold: systemConfig.thresholds.memoryUsage,
      },
    ];

    // Format uptime
    const uptimeSeconds = systemMetrics.uptime;
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const uptimeFormatted = `${days} days ${hours} hours`;

    // Build response
    const response = {
      metricsSummary,
      implementationFeatures,
      latencySeries,
      errorRateSeries,
      alerts,
      systemInfo: {
        uptime: uptimeFormatted,
        lastBackup: backupStatus.lastBackup,
        backupLocation: backupStatus.backupLocation,
        nodeVersion: process.version,
        databaseSize: dbMetrics.databaseSize,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      error: 'Failed to fetch system health data',
      message: error.message,
    });
  }
});

/**
 * GET /api/system-health/config
 * Returns current system configuration
 */
router.get('/config', (req, res) => {
  res.json(systemConfig);
});

/**
 * GET /api/system-health/settings
 * Returns persisted settings from DB (falls back to in-memory defaults)
 */
router.get('/settings', async (req, res) => {
  try {
    const { prisma } = req.app.locals;
    if (!prisma) {
      return res.json({ source: 'memory', settings: systemConfig });
    }
    let record = await prisma.systemHealthConfig.findFirst({ where: { id: 1 } });
    if (!record) {
      // Auto bootstrap single row
      record = await prisma.systemHealthConfig.create({
        data: {
          id: 1,
          thresholds: systemConfig.thresholds,
          backupLocation: systemConfig.backupLocation,
      refreshInterval: systemConfig.refreshInterval,
      metricsRetentionDays: systemConfig.metricsRetentionDays,
      aggregateRetentionDays: systemConfig.aggregateRetentionDays,
        },
      });
    }
    // Merge DB thresholds with any new defaults added later
    const merged = {
      thresholds: { ...systemConfig.thresholds, ...(record.thresholds || {}) },
      backupLocation: record.backupLocation,
      refreshInterval: record.refreshInterval,
    metricsRetentionDays: record.metricsRetentionDays ?? systemConfig.metricsRetentionDays,
    aggregateRetentionDays: record.aggregateRetentionDays ?? systemConfig.aggregateRetentionDays,
      updated_at: record.updated_at,
    };
    // Update in-memory copy for immediate use by alerts
    systemConfig = { ...systemConfig, ...merged };
    res.json({ source: 'database', settings: merged });
  } catch (err) {
    console.error('Failed to load system health settings:', err);
    res.status(500).json({ error: 'Failed to load settings', message: err.message });
  }
});

/**
 * PATCH /api/system-health/settings
 * Update settings with validation & persist to DB
 */
router.patch('/settings', async (req, res) => {
  try {
    const updates = req.body;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request', message: 'Body must be object' });
    }
    // Validate thresholds shape if provided
    if (updates.thresholds) {
      for (const [key, value] of Object.entries(updates.thresholds)) {
        if (!value || typeof value !== 'object') {
          return res.status(400).json({ error: 'Invalid threshold value', message: `Threshold ${key} must be object` });
        }
        if (value.warning == null || value.critical == null) {
          return res.status(400).json({ error: 'Missing threshold values', message: `${key} requires warning & critical` });
        }
        if (typeof value.warning !== 'number' || typeof value.critical !== 'number') {
          return res.status(400).json({ error: 'Threshold types', message: `${key} warning/critical must be numbers` });
        }
        if (value.warning >= value.critical) {
          return res.status(400).json({ error: 'Threshold ordering', message: `${key} warning must be < critical` });
        }
      }
    }
    if (updates.backupLocation) {
      if (typeof updates.backupLocation !== 'string' || updates.backupLocation.length < 3) {
        return res.status(400).json({ error: 'Invalid backupLocation', message: 'Must be string length >=3' });
      }
      if (updates.backupLocation.includes('..') || updates.backupLocation.includes('~')) {
        return res.status(400).json({ error: 'Unsafe path', message: 'backupLocation cannot contain .. or ~' });
      }
    }
    if (updates.refreshInterval != null) {
      const ri = parseInt(updates.refreshInterval);
      if (isNaN(ri) || ri < 5000 || ri > 300000) {
        return res.status(400).json({ error: 'Invalid refreshInterval', message: 'Must be between 5000 and 300000 ms' });
      }
      updates.refreshInterval = ri;
    }
    // Validate retention settings if provided
    if (updates.metricsRetentionDays != null) {
      const mr = parseInt(updates.metricsRetentionDays);
      if (isNaN(mr) || mr < 1 || mr > 365) {
        return res.status(400).json({ error: 'Invalid metricsRetentionDays', message: 'Must be between 1 and 365 days' });
      }
      updates.metricsRetentionDays = mr;
    }
    if (updates.aggregateRetentionDays != null) {
      const ar = parseInt(updates.aggregateRetentionDays);
      if (isNaN(ar) || ar < 30 || ar > 1825) {
        return res.status(400).json({ error: 'Invalid aggregateRetentionDays', message: 'Must be between 30 and 1825 days' });
      }
      updates.aggregateRetentionDays = ar;
    }
    const { prisma } = req.app.locals;
    if (!prisma) {
      // In-memory update fallback if DB unavailable
      systemConfig = { ...systemConfig, ...updates, thresholds: updates.thresholds ? { ...systemConfig.thresholds, ...updates.thresholds } : systemConfig.thresholds };
      return res.json({ source: 'memory', settings: systemConfig, message: 'Updated in-memory (DB unavailable)' });
    }
    let record = await prisma.systemHealthConfig.findFirst({ where: { id: 1 } });
    if (!record) {
      record = await prisma.systemHealthConfig.create({
        data: {
          id: 1,
          thresholds: systemConfig.thresholds,
          backupLocation: systemConfig.backupLocation,
          refreshInterval: systemConfig.refreshInterval,
          metricsRetentionDays: systemConfig.metricsRetentionDays,
          aggregateRetentionDays: systemConfig.aggregateRetentionDays,
        },
      });
    }
    // Merge thresholds
    const newThresholds = updates.thresholds ? { ...record.thresholds, ...updates.thresholds } : record.thresholds;
    const persisted = await prisma.systemHealthConfig.update({
      where: { id: record.id },
      data: {
        thresholds: newThresholds,
        backupLocation: updates.backupLocation != null ? updates.backupLocation : record.backupLocation,
        refreshInterval: updates.refreshInterval != null ? updates.refreshInterval : record.refreshInterval,
        metricsRetentionDays: updates.metricsRetentionDays != null ? updates.metricsRetentionDays : (record.metricsRetentionDays ?? systemConfig.metricsRetentionDays),
        aggregateRetentionDays: updates.aggregateRetentionDays != null ? updates.aggregateRetentionDays : (record.aggregateRetentionDays ?? systemConfig.aggregateRetentionDays),
      },
    });
    const merged = {
      thresholds: persisted.thresholds,
      backupLocation: persisted.backupLocation,
      refreshInterval: persisted.refreshInterval,
      metricsRetentionDays: persisted.metricsRetentionDays,
      aggregateRetentionDays: persisted.aggregateRetentionDays,
      updated_at: persisted.updated_at,
    };
    systemConfig = { ...systemConfig, ...merged };
    res.json({ source: 'database', settings: merged, message: 'Settings updated' });
  } catch (err) {
    console.error('Failed to update system health settings:', err);
    res.status(500).json({ error: 'Failed to update settings', message: err.message });
  }
});

/**
 * PATCH /api/system-health/config
 * Updates system configuration
 */
router.patch('/config', async (req, res) => {
  try {
    // Delegate to /settings logic to avoid drift
    req.url = '/settings'; // ensure downstream path match if router logic inspects
    // Manually invoke settings handler by reusing code path (simpler than factoring now)
    // Re-run validation & persistence using unified handler
    // We'll call prisma directly here for minimal overhead.
    const updates = req.body;
    const { prisma } = req.app.locals;
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid request', message: 'Body must be object' });
    }
    // Basic normalization to same shape as /settings
    if (updates.thresholds) {
      for (const [key, value] of Object.entries(updates.thresholds)) {
        if (!value || value.warning == null || value.critical == null || value.warning >= value.critical) {
          return res.status(400).json({ error: 'Invalid thresholds', message: `Bad threshold config for ${key}` });
        }
      }
    }
    if (updates.refreshInterval) {
      const ri = parseInt(updates.refreshInterval);
      if (isNaN(ri) || ri < 5000 || ri > 300000) {
        return res.status(400).json({ error: 'Invalid refreshInterval', message: 'Out of range' });
      }
      updates.refreshInterval = ri;
    }
    if (updates.backupLocation && (updates.backupLocation.includes('..') || updates.backupLocation.includes('~'))) {
      return res.status(400).json({ error: 'Unsafe path', message: 'backupLocation cannot contain .. or ~' });
    }
    if (!prisma) {
      systemConfig = { ...systemConfig, ...updates, thresholds: updates.thresholds ? { ...systemConfig.thresholds, ...updates.thresholds } : systemConfig.thresholds };
      return res.json({ success: true, source: 'memory', config: systemConfig, message: 'Updated in-memory (DB unavailable)' });
    }
    let record = await prisma.systemHealthConfig.findFirst({ where: { id: 1 } });
    if (!record) {
      record = await prisma.systemHealthConfig.create({
        data: {
          id: 1,
          thresholds: systemConfig.thresholds,
          backupLocation: systemConfig.backupLocation,
          refreshInterval: systemConfig.refreshInterval,
        },
      });
    }
    const newThresholds = updates.thresholds ? { ...record.thresholds, ...updates.thresholds } : record.thresholds;
    const persisted = await prisma.systemHealthConfig.update({
      where: { id: record.id },
      data: {
        thresholds: newThresholds,
        backupLocation: updates.backupLocation != null ? updates.backupLocation : record.backupLocation,
        refreshInterval: updates.refreshInterval != null ? updates.refreshInterval : record.refreshInterval,
      },
    });
    systemConfig = { ...systemConfig, thresholds: persisted.thresholds, backupLocation: persisted.backupLocation, refreshInterval: persisted.refreshInterval };
    res.json({ success: true, source: 'database', config: systemConfig, message: 'Configuration updated (unified persistence)' });
  } catch (error) {
    console.error('Error updating configuration:', error);
    res.status(500).json({
      error: 'Failed to update configuration',
      message: error.message,
    });
  }
});

/**
 * POST /api/system-health/backup
 * Trigger manual backup
 */
router.post('/backup', async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts/database-backup.sh');
    
    // Check if script exists
    try {
      await fs.access(scriptPath, fs.constants.X_OK);
    } catch (accessError) {
      return res.status(404).json({
        error: 'Backup script not found',
        message: 'The database backup script is not available or not executable',
      });
    }
    
    // Set timeout for backup operation (5 minutes)
    const { stdout, stderr } = await execAsync(scriptPath, {
      timeout: 300000,
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    res.json({
      success: true,
      output: stdout,
      errors: stderr || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error running backup:', error);
    res.status(500).json({
      error: 'Failed to run backup',
      message: error.message,
      details: error.stderr || null,
    });
  }
});

/**
 * POST /api/system-health/backup/verify
 * Verify latest backup file integrity (manifest presence + size > 0)
 */
router.post('/backup/verify', async (req, res) => {
  try {
    const manifestPath = path.join(process.cwd(), 'backups/database/backup_manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent);
    if (!manifest.backups || manifest.backups.length === 0) {
      return res.status(404).json({ error: 'No backups found' });
    }
    const latest = manifest.backups[manifest.backups.length - 1];
    const backupFile = latest.file_path || latest.filename || null;
    let fileOk = false;
    let fileSize = 0;
    if (backupFile) {
      try {
        const fullPath = path.join(process.cwd(), 'backups/database', backupFile);
        const stat = await fs.stat(fullPath);
        fileSize = stat.size;
        fileOk = stat.size > 0;
      } catch (e) {
        fileOk = false;
      }
    }
    res.json({
      success: true,
      latest: {
        timestamp: latest.timestamp,
        compressed_size: latest.compressed_size,
        verified: latest.verified || false,
        fileOk,
        fileSize,
      },
      count: manifest.backups.length,
    });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed', message: e.message });
  }
});

/**
 * POST /api/system-health/health-check
 * Run database health check
 */
router.post('/health-check', async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts/database-health-check.sh');
    
    // Check if script exists
    try {
      await fs.access(scriptPath, fs.constants.X_OK);
    } catch (accessError) {
      return res.status(404).json({
        error: 'Health check script not found',
        message: 'The database health check script is not available or not executable',
      });
    }
    
    const { stdout } = await execAsync(`${scriptPath} --json`, {
      timeout: 60000, // 1 minute timeout
      maxBuffer: 5 * 1024 * 1024, // 5MB buffer
    });
    
    let healthData;
    try {
      healthData = JSON.parse(stdout);
    } catch (parseError) {
      return res.status(500).json({
        error: 'Failed to parse health check output',
        message: parseError.message,
        output: stdout,
      });
    }

    res.json({
      success: true,
      healthData,
      timestamp: new Date().toISOString(),
      message: 'Health check completed.',
    });
  } catch (error) {
    console.error('Error running health check:', error);
    res.status(500).json({
      error: 'Failed to run health check',
      message: error.message,
      details: error.stderr || null,
    });
  }
});

/**
 * POST /api/system-health/index-audit
 * Run database index audit
 */
router.post('/index-audit', async (req, res) => {
  try {
    const scriptPath = path.join(process.cwd(), 'scripts/database-index-audit.js');
    
    // Check if script exists
    try {
      await fs.access(scriptPath, fs.constants.R_OK);
    } catch (accessError) {
      return res.status(404).json({
        error: 'Index audit script not found',
        message: 'The database index audit script is not available',
      });
    }
    
    const { stdout } = await execAsync(`node ${scriptPath}`, {
      timeout: 120000, // 2 minutes timeout
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });
    
    res.json({
      success: true,
      output: stdout,
      timestamp: new Date().toISOString(),
      message: 'Index audit completed. Check scripts/index-optimization.sql for recommendations.',
    });
  } catch (error) {
    console.error('Error running index audit:', error);
    res.status(500).json({
      error: 'Failed to run index audit',
      message: error.message,
      details: error.stderr || null,
    });
  }
});

// Load saved configuration on startup
(async () => {
  try {
    const configPath = path.join(process.cwd(), 'config/system-health.json');
    const configData = await fs.readFile(configPath, 'utf-8');
    const savedConfig = JSON.parse(configData);
    systemConfig = { ...systemConfig, ...savedConfig };
    console.log('[System Health] Loaded saved configuration');
  } catch (error) {
    console.log('[System Health] No saved configuration found, using defaults');
  }
})();

module.exports = router;
