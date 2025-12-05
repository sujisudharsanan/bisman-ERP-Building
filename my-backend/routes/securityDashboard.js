/**
 * Security Dashboard API Routes
 * 
 * Aggregated endpoints for the Enterprise Security Operations Dashboard.
 * Provides cache health, rate limit stats, job status, and active locks.
 * 
 * @module routes/securityDashboard
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbacMiddleware');

// Import cache services
let redis = null;
let rateLimiter = null;
let distributedLock = null;
let cleanupJobs = null;

try {
  redis = require('../cache').redis;
} catch (e) {
  console.warn('[security-dashboard] Redis not available');
}

try {
  rateLimiter = require('../cache/services/rateLimiter');
} catch (e) {
  console.warn('[security-dashboard] Rate limiter not available');
}

try {
  distributedLock = require('../cache/services/distributedLock');
} catch (e) {
  console.warn('[security-dashboard] Distributed lock not available');
}

try {
  cleanupJobs = require('../jobs/cleanupJobs');
} catch (e) {
  console.warn('[security-dashboard] Cleanup jobs not available');
}

// All routes require Enterprise Admin
router.use(authenticate);
router.use(requireRole('ENTERPRISE_ADMIN'));

/**
 * GET /api/security-dashboard/cache-health
 * Get Redis cache health metrics
 */
router.get('/cache-health', async (req, res) => {
  try {
    if (!redis) {
      return res.json({
        success: true,
        data: {
          totalKeys: 0,
          memoryUsage: 'N/A',
          hitRate: 0,
          missRate: 0,
          evictions: 0,
          pubsubChannels: [],
          connectedClients: 0,
          status: 'unavailable'
        }
      });
    }

    // Get Redis info
    const info = await redis.info();
    const keyspace = await redis.dbsize();
    
    // Parse info sections
    const parseInfo = (infoStr) => {
      const result = {};
      infoStr.split('\r\n').forEach(line => {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      });
      return result;
    };

    const parsedInfo = parseInfo(info);
    
    // Calculate hit rate
    const hits = parseInt(parsedInfo.keyspace_hits || '0', 10);
    const misses = parseInt(parsedInfo.keyspace_misses || '0', 10);
    const total = hits + misses;
    const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : 0;
    const missRate = total > 0 ? ((misses / total) * 100).toFixed(1) : 0;

    // Get PUB/SUB channels
    let pubsubChannels = [];
    try {
      const pubsubInfo = await redis.pubsub('CHANNELS');
      pubsubChannels = pubsubInfo || [];
    } catch (e) {
      // PUBSUB command might not be available
    }

    res.json({
      success: true,
      data: {
        totalKeys: keyspace,
        memoryUsage: parsedInfo.used_memory_human || 'N/A',
        hitRate: parseFloat(hitRate),
        missRate: parseFloat(missRate),
        evictions: parseInt(parsedInfo.evicted_keys || '0', 10),
        pubsubChannels,
        connectedClients: parseInt(parsedInfo.connected_clients || '0', 10),
        status: 'healthy'
      }
    });
  } catch (error) {
    console.error('[security-dashboard] Cache health error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/rate-limit-stats
 * Get rate limiting statistics
 */
router.get('/rate-limit-stats', async (req, res) => {
  try {
    if (!redis || !rateLimiter) {
      return res.json({
        success: true,
        data: {
          stats: []
        }
      });
    }

    // Get rate limit keys from Redis
    const keys = [];
    let cursor = '0';
    do {
      const [newCursor, foundKeys] = await redis.scan(cursor, 'MATCH', 'rl:*', 'COUNT', 100);
      cursor = newCursor;
      keys.push(...foundKeys);
    } while (cursor !== '0');

    // Aggregate by endpoint
    const endpointStats = {};
    for (const key of keys) {
      // Key format: rl:endpoint:identifier
      const parts = key.split(':');
      if (parts.length >= 2) {
        const endpoint = parts[1];
        if (!endpointStats[endpoint]) {
          endpointStats[endpoint] = {
            endpoint: '/' + endpoint.replace(/_/g, '/'),
            currentCount: 0,
            limit: 100, // Default
            windowMs: 300000,
            blocked: 0,
            keys: 0
          };
        }
        
        const count = parseInt(await redis.get(key) || '0', 10);
        endpointStats[endpoint].currentCount += count;
        endpointStats[endpoint].keys++;
      }
    }

    // Calculate percentages
    const stats = Object.values(endpointStats).map(s => ({
      ...s,
      percentUsed: Math.min(100, Math.round((s.currentCount / s.limit) * 100))
    }));

    res.json({
      success: true,
      data: {
        stats
      }
    });
  } catch (error) {
    console.error('[security-dashboard] Rate limit stats error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/active-locks
 * Get active distributed locks
 */
router.get('/active-locks', async (req, res) => {
  try {
    if (!redis) {
      return res.json({
        success: true,
        data: {
          locks: []
        }
      });
    }

    // Scan for lock keys
    const locks = [];
    let cursor = '0';
    do {
      const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'lock:*', 'COUNT', 100);
      cursor = newCursor;
      
      for (const key of keys) {
        const owner = await redis.get(key);
        const ttl = await redis.ttl(key);
        if (owner && ttl > 0) {
          locks.push({
            key: key.replace('lock:', ''),
            owner,
            ttl,
            acquiredAt: new Date(Date.now() - ((30 - ttl) * 1000)).toISOString() // Estimate
          });
        }
      }
    } while (cursor !== '0');

    res.json({
      success: true,
      data: {
        locks
      }
    });
  } catch (error) {
    console.error('[security-dashboard] Active locks error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/job-status
 * Get cleanup job status
 */
router.get('/job-status', async (req, res) => {
  try {
    // If cleanupJobs has a getStatus method, use it
    if (cleanupJobs && typeof cleanupJobs.getJobStatus === 'function') {
      const status = cleanupJobs.getJobStatus();
      return res.json({
        success: true,
        data: {
          jobs: status
        }
      });
    }

    // Default job status based on cron schedules
    const jobs = [
      {
        jobName: 'cleanExpiredSessions',
        lastRun: null,
        nextRun: new Date(Date.now() + 3600000).toISOString(), // Every hour
        status: 'scheduled',
        recordsProcessed: 0,
        duration: null
      },
      {
        jobName: 'cleanExpiredOtps',
        lastRun: null,
        nextRun: new Date(Date.now() + 1800000).toISOString(), // Every 30 min
        status: 'scheduled',
        recordsProcessed: 0,
        duration: null
      },
      {
        jobName: 'archiveAuditLogs',
        lastRun: null,
        nextRun: new Date(Date.now() + 86400000).toISOString(), // Daily
        status: 'scheduled',
        recordsProcessed: 0,
        duration: null
      },
      {
        jobName: 'vacuumAnalyzeTables',
        lastRun: null,
        nextRun: new Date(Date.now() + 604800000).toISOString(), // Weekly
        status: 'scheduled',
        recordsProcessed: 0,
        duration: null
      }
    ];

    res.json({
      success: true,
      data: {
        jobs
      }
    });
  } catch (error) {
    console.error('[security-dashboard] Job status error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/all
 * Get all dashboard data in one call
 */
router.get('/all', async (req, res) => {
  try {
    const bypassDetection = require('../services/bypassDetection');
    
    // Run all fetches in parallel
    const [
      securityScan,
      cacheHealth,
      rateLimitStats,
      activeLocks,
      jobStatus
    ] = await Promise.allSettled([
      bypassDetection.runFullScan().catch(() => null),
      (async () => {
        if (!redis) return null;
        const info = await redis.info();
        const keyspace = await redis.dbsize();
        const parseInfo = (infoStr) => {
          const result = {};
          infoStr.split('\r\n').forEach(line => {
            const [key, value] = line.split(':');
            if (key && value) result[key] = value;
          });
          return result;
        };
        const parsed = parseInfo(info);
        const hits = parseInt(parsed.keyspace_hits || '0', 10);
        const misses = parseInt(parsed.keyspace_misses || '0', 10);
        const total = hits + misses;
        return {
          totalKeys: keyspace,
          memoryUsage: parsed.used_memory_human || 'N/A',
          hitRate: total > 0 ? parseFloat(((hits / total) * 100).toFixed(1)) : 0,
          missRate: total > 0 ? parseFloat(((misses / total) * 100).toFixed(1)) : 0,
          evictions: parseInt(parsed.evicted_keys || '0', 10),
          pubsubChannels: ['permissions:invalidate', 'sessions:invalidate', 'cache:invalidate'],
          connectedClients: parseInt(parsed.connected_clients || '0', 10),
          status: 'healthy'
        };
      })().catch(() => null),
      (async () => {
        if (!redis) return [];
        const keys = [];
        let cursor = '0';
        do {
          const [c, k] = await redis.scan(cursor, 'MATCH', 'rl:*', 'COUNT', 100);
          cursor = c;
          keys.push(...k);
        } while (cursor !== '0');
        return keys.length > 0 ? [{ endpoint: '/api/*', currentCount: keys.length, limit: 100, windowMs: 300000, blocked: 0, percentUsed: keys.length }] : [];
      })().catch(() => []),
      (async () => {
        if (!redis) return [];
        const locks = [];
        let cursor = '0';
        do {
          const [c, k] = await redis.scan(cursor, 'MATCH', 'lock:*', 'COUNT', 100);
          cursor = c;
          for (const key of k) {
            const owner = await redis.get(key);
            const ttl = await redis.ttl(key);
            if (owner && ttl > 0) {
              locks.push({ key: key.replace('lock:', ''), owner, ttl, acquiredAt: new Date().toISOString() });
            }
          }
        } while (cursor !== '0');
        return locks;
      })().catch(() => []),
      Promise.resolve([
        { jobName: 'cleanExpiredSessions', lastRun: null, nextRun: new Date(Date.now() + 3600000).toISOString(), status: 'scheduled', recordsProcessed: 0, duration: null },
        { jobName: 'cleanExpiredOtps', lastRun: null, nextRun: new Date(Date.now() + 1800000).toISOString(), status: 'scheduled', recordsProcessed: 0, duration: null },
        { jobName: 'archiveAuditLogs', lastRun: null, nextRun: new Date(Date.now() + 86400000).toISOString(), status: 'scheduled', recordsProcessed: 0, duration: null },
        { jobName: 'vacuumAnalyzeTables', lastRun: null, nextRun: new Date(Date.now() + 604800000).toISOString(), status: 'scheduled', recordsProcessed: 0, duration: null }
      ])
    ]);

    res.json({
      success: true,
      data: {
        securityScan: securityScan.status === 'fulfilled' ? securityScan.value : null,
        cacheHealth: cacheHealth.status === 'fulfilled' ? cacheHealth.value : null,
        rateLimitStats: rateLimitStats.status === 'fulfilled' ? rateLimitStats.value : [],
        activeLocks: activeLocks.status === 'fulfilled' ? activeLocks.value : [],
        jobStatus: jobStatus.status === 'fulfilled' ? jobStatus.value : [],
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[security-dashboard] Dashboard all error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/security-dashboard/rbac-metrics
 * Get RBAC security metrics including violations, role changes, and cross-tenant attempts
 */
router.get('/rbac-metrics', async (req, res) => {
  try {
    const prisma = require('../services/prisma');
    
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Execute all queries in parallel
    const [
      roleLevelViolations24h,
      crossTenantViolations24h,
      permissionChanges24h,
      roleLevelViolationsWeek,
      crossTenantViolationsWeek,
      permissionChangesWeek,
      recentAuditLogs,
      roleChangesTimeline,
      violationsByUser,
      systemAlerts,
      roleDistribution,
      tenantActivity
    ] = await Promise.allSettled([
      // Role level violations in last 24h
      prisma.audit_logs.count({
        where: {
          action: { contains: 'PRIVILEGE_ESCALATION' },
          created_at: { gte: oneDayAgo }
        }
      }),
      // Cross-tenant violations in last 24h
      prisma.audit_logs.count({
        where: {
          action: { contains: 'CROSS_TENANT' },
          created_at: { gte: oneDayAgo }
        }
      }),
      // Permission changes in last 24h
      prisma.audit_logs.count({
        where: {
          action: { in: ['ROLE_PERMISSION_ASSIGNED', 'ROLE_PERMISSION_REVOKED', 'ROLE_PERMISSION_BULK_UPDATE'] },
          created_at: { gte: oneDayAgo }
        }
      }),
      // Role level violations in last week
      prisma.audit_logs.count({
        where: {
          action: { contains: 'PRIVILEGE_ESCALATION' },
          created_at: { gte: oneWeekAgo }
        }
      }),
      // Cross-tenant violations in last week
      prisma.audit_logs.count({
        where: {
          action: { contains: 'CROSS_TENANT' },
          created_at: { gte: oneWeekAgo }
        }
      }),
      // Permission changes in last week
      prisma.audit_logs.count({
        where: {
          action: { in: ['ROLE_PERMISSION_ASSIGNED', 'ROLE_PERMISSION_REVOKED', 'ROLE_PERMISSION_BULK_UPDATE'] },
          created_at: { gte: oneWeekAgo }
        }
      }),
      // Recent RBAC audit logs
      prisma.audit_logs.findMany({
        where: {
          action: {
            in: [
              'PRIVILEGE_ESCALATION_BLOCKED',
              'CROSS_TENANT_VIOLATION',
              'ROLE_PERMISSION_ASSIGNED',
              'ROLE_PERMISSION_REVOKED',
              'ROLE_PERMISSION_BULK_UPDATE',
              'ROLE_CREATED',
              'ROLE_DELETED'
            ]
          },
          created_at: { gte: oneDayAgo }
        },
        orderBy: { created_at: 'desc' },
        take: 50,
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          user_id: true,
          created_at: true
        }
      }),
      // Role changes timeline (last 30 days, grouped by day)
      prisma.$queryRaw`
        SELECT 
          DATE(created_at) as date,
          action,
          COUNT(*)::int as count
        FROM audit_logs
        WHERE action IN ('ROLE_PERMISSION_ASSIGNED', 'ROLE_PERMISSION_REVOKED', 'ROLE_PERMISSION_BULK_UPDATE')
          AND created_at >= ${oneMonthAgo}
        GROUP BY DATE(created_at), action
        ORDER BY date DESC
      `,
      // Top violating users
      prisma.$queryRaw`
        SELECT 
          user_id,
          COUNT(*)::int as violation_count
        FROM audit_logs
        WHERE action IN ('PRIVILEGE_ESCALATION_BLOCKED', 'CROSS_TENANT_VIOLATION')
          AND created_at >= ${oneWeekAgo}
        GROUP BY user_id
        ORDER BY violation_count DESC
        LIMIT 10
      `,
      // Active system alerts (from recent violations)
      prisma.audit_logs.findMany({
        where: {
          action: { in: ['PRIVILEGE_ESCALATION_BLOCKED', 'CROSS_TENANT_VIOLATION'] },
          created_at: { gte: oneDayAgo }
        },
        orderBy: { created_at: 'desc' },
        take: 20,
        select: {
          id: true,
          action: true,
          resource: true,
          details: true,
          user_id: true,
          created_at: true
        }
      }),
      // Role distribution by level with active user counts
      prisma.$queryRaw`
        SELECT 
          r.level,
          r.name,
          COUNT(DISTINCT r.id)::int as role_count,
          COUNT(DISTINCT ur.user_id)::int as active_users
        FROM roles r
        LEFT JOIN user_roles ur ON r.id = ur.role_id
        WHERE r.deleted_at IS NULL
        GROUP BY r.level, r.name
        ORDER BY r.level DESC
      `,
      // Tenant activity - permission changes and violations per tenant
      prisma.$queryRaw`
        SELECT 
          COALESCE(t.id::text, 'global') as tenant_id,
          COALESCE(t.name, 'Global/System') as tenant_name,
          COUNT(CASE WHEN al.action IN ('ROLE_PERMISSION_ASSIGNED', 'ROLE_PERMISSION_REVOKED', 'ROLE_PERMISSION_BULK_UPDATE') THEN 1 END)::int as permission_changes,
          COUNT(CASE WHEN al.action IN ('PRIVILEGE_ESCALATION_BLOCKED', 'CROSS_TENANT_VIOLATION') THEN 1 END)::int as violations,
          MAX(al.created_at) as last_activity
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        LEFT JOIN tenants t ON u.tenant_id = t.id
        WHERE al.created_at >= ${oneWeekAgo}
          AND al.action IN (
            'ROLE_PERMISSION_ASSIGNED', 'ROLE_PERMISSION_REVOKED', 'ROLE_PERMISSION_BULK_UPDATE',
            'PRIVILEGE_ESCALATION_BLOCKED', 'CROSS_TENANT_VIOLATION'
          )
        GROUP BY t.id, t.name
        ORDER BY permission_changes DESC, violations DESC
        LIMIT 20
      `
    ]);

    // Get Prometheus metrics if available
    let prometheusMetrics = null;
    try {
      const rbacMetrics = require('../lib/rbacMetrics');
      prometheusMetrics = {
        permissionChangesTotal: await rbacMetrics.permissionChangesCounter.get(),
        roleLevelViolationsTotal: await rbacMetrics.roleLevelViolationsCounter.get(),
        crossTenantViolationsTotal: await rbacMetrics.crossTenantViolationsCounter.get()
      };
    } catch (e) {
      console.warn('[security-dashboard] RBAC metrics not available:', e.message);
    }

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous * 100).toFixed(1);
    };

    // Process role changes timeline data
    const timelineData = roleChangesTimeline.status === 'fulfilled' 
      ? (roleChangesTimeline.value || []).reduce((acc, row) => {
          const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
          if (!acc[dateStr]) {
            acc[dateStr] = { date: dateStr, assigned: 0, revoked: 0, bulkUpdate: 0 };
          }
          if (row.action === 'ROLE_PERMISSION_ASSIGNED') acc[dateStr].assigned = row.count;
          if (row.action === 'ROLE_PERMISSION_REVOKED') acc[dateStr].revoked = row.count;
          if (row.action === 'ROLE_PERMISSION_BULK_UPDATE') acc[dateStr].bulkUpdate = row.count;
          return acc;
        }, {})
      : {};

    res.json({
      success: true,
      data: {
        summary: {
          roleLevelViolations24h: roleLevelViolations24h.status === 'fulfilled' ? roleLevelViolations24h.value : 0,
          crossTenantViolations24h: crossTenantViolations24h.status === 'fulfilled' ? crossTenantViolations24h.value : 0,
          permissionChanges24h: permissionChanges24h.status === 'fulfilled' ? permissionChanges24h.value : 0,
          roleLevelViolationsWeek: roleLevelViolationsWeek.status === 'fulfilled' ? roleLevelViolationsWeek.value : 0,
          crossTenantViolationsWeek: crossTenantViolationsWeek.status === 'fulfilled' ? crossTenantViolationsWeek.value : 0,
          permissionChangesWeek: permissionChangesWeek.status === 'fulfilled' ? permissionChangesWeek.value : 0
        },
        recentActivity: recentAuditLogs.status === 'fulfilled' ? recentAuditLogs.value : [],
        roleChangesTimeline: Object.values(timelineData).sort((a, b) => b.date.localeCompare(a.date)),
        topViolatingUsers: violationsByUser.status === 'fulfilled' ? violationsByUser.value : [],
        activeAlerts: systemAlerts.status === 'fulfilled' ? systemAlerts.value.map(alert => ({
          id: alert.id,
          type: alert.action === 'PRIVILEGE_ESCALATION_BLOCKED' ? 'escalation' : 'cross-tenant',
          severity: 'high',
          message: `${alert.action.replace(/_/g, ' ')} - ${alert.resource || 'Unknown resource'}`,
          timestamp: alert.created_at,
          userId: alert.user_id,
          details: alert.details
        })) : [],
        roleDistribution: roleDistribution.status === 'fulfilled' ? (roleDistribution.value || []).map(r => ({
          level: r.level,
          name: r.name,
          count: r.role_count,
          activeUsers: r.active_users
        })) : [],
        tenantActivity: tenantActivity.status === 'fulfilled' ? (tenantActivity.value || []).map(t => ({
          tenantId: t.tenant_id,
          tenantName: t.tenant_name,
          permissionChanges: t.permission_changes,
          violations: t.violations,
          lastActivity: t.last_activity
        })) : [],
        prometheusMetrics,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[security-dashboard] RBAC metrics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
