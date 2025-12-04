/**
 * RBAC Bypass Detection Service
 * 
 * Detects potential security issues:
 * - Routes missing RBAC middleware
 * - Stale permission cache
 * - Suspicious DB activity
 * - Raw SQL bypassing service layer
 * - Unexpected DB connections
 * 
 * @module services/bypassDetection
 */

const { getPrisma } = require('../lib/prisma');
const { redis, isEnabled: isRedisEnabled } = require('../cache/redisClient');
const fs = require('fs');
const path = require('path');

const prisma = getPrisma();

/**
 * Scan routes for missing RBAC protection
 * Analyzes route files for endpoints without requirePermission/requireRole
 */
async function scanUnprotectedRoutes(routesDir = path.join(__dirname, '../routes')) {
  const results = {
    unprotected: [],
    protected: [],
    warnings: [],
    scanned: []
  };

  // Patterns that indicate protected routes
  const protectionPatterns = [
    /requirePermission\s*\(/,
    /requireRole\s*\(/,
    /requireAnyPermission\s*\(/,
    /requireAllPermissions\s*\(/,
    /authenticate\s*,/,
    /auth\s*,/,
    /checkPermission\s*\(/,
    /rbac\./
  ];

  // Patterns for route definitions
  const routePatterns = [
    /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
    /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
  ];

  // Read all JS files in routes directory
  try {
    const files = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

    for (const file of files) {
      const filePath = path.join(routesDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      results.scanned.push(file);

      // Find all route definitions
      for (const pattern of routePatterns) {
        let match;
        pattern.lastIndex = 0;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const routePath = match[2];
          
          // Get the line containing this route
          const lineStart = content.lastIndexOf('\n', match.index) + 1;
          const lineEnd = content.indexOf('\n', match.index);
          const line = content.substring(lineStart, lineEnd);

          // Check if this line has protection
          const isProtected = protectionPatterns.some(p => p.test(line));

          const routeInfo = {
            file,
            method,
            path: routePath,
            line: content.substring(0, match.index).split('\n').length
          };

          if (isProtected) {
            results.protected.push(routeInfo);
          } else {
            // Check if the whole file has a global middleware
            const hasGlobalAuth = /router\.use\s*\(\s*(authenticate|auth|requireRole)/i.test(content);
            if (hasGlobalAuth) {
              results.protected.push({ ...routeInfo, globalMiddleware: true });
            } else {
              results.unprotected.push(routeInfo);
            }
          }
        }
      }
    }
  } catch (error) {
    results.warnings.push(`Error scanning routes: ${error.message}`);
  }

  return results;
}

/**
 * Scan for raw SQL queries bypassing service layer
 * Looks for direct DB queries in controllers/routes
 */
async function scanRawSqlUsage(dirs = ['controllers', 'routes']) {
  const results = {
    rawQueries: [],
    warnings: []
  };

  const rawSqlPatterns = [
    /prisma\.\$queryRaw/g,
    /prisma\.\$executeRaw/g,
    /db\.query\s*\(/g,
    /pool\.query\s*\(/g,
    /\.raw\s*\(/g,
    /knex\.raw/g
  ];

  for (const dir of dirs) {
    const dirPath = path.join(__dirname, '..', dir);
    
    try {
      if (!fs.existsSync(dirPath)) continue;
      
      const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.js'));

      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf8');

        for (const pattern of rawSqlPatterns) {
          let match;
          pattern.lastIndex = 0;
          while ((match = pattern.exec(content)) !== null) {
            const lineNum = content.substring(0, match.index).split('\n').length;
            const lineStart = content.lastIndexOf('\n', match.index) + 1;
            const lineEnd = content.indexOf('\n', match.index + 50);
            const snippet = content.substring(lineStart, lineEnd).trim();

            results.rawQueries.push({
              file: `${dir}/${file}`,
              line: lineNum,
              pattern: match[0],
              snippet: snippet.substring(0, 100)
            });
          }
        }
      }
    } catch (error) {
      results.warnings.push(`Error scanning ${dir}: ${error.message}`);
    }
  }

  return results;
}

/**
 * Check for stale permission cache entries
 */
async function checkStaleCacheEntries() {
  if (!isRedisEnabled()) {
    return { enabled: false, message: 'Redis not enabled' };
  }

  try {
    const results = {
      userPermissions: [],
      rolePermissions: [],
      staleCount: 0,
      totalCount: 0
    };

    // Check user permission cache
    const userKeys = await redis.keys('perm:user:*');
    results.totalCount += userKeys.length;

    for (const key of userKeys.slice(0, 50)) { // Limit to 50 for performance
      const ttl = await redis.ttl(key);
      const data = await redis.get(key);
      
      if (data) {
        const parsed = JSON.parse(data);
        const age = Date.now() - (parsed.cachedAt || 0);
        
        results.userPermissions.push({
          key,
          ttl,
          ageSeconds: Math.floor(age / 1000),
          isStale: ttl < 10 || age > 300000 // Less than 10s TTL or older than 5 min
        });

        if (ttl < 10 || age > 300000) {
          results.staleCount++;
        }
      }
    }

    // Check role permission cache
    const roleKeys = await redis.keys('perm:role:*');
    results.totalCount += roleKeys.length;

    for (const key of roleKeys.slice(0, 20)) {
      const ttl = await redis.ttl(key);
      results.rolePermissions.push({ key, ttl });
    }

    return results;
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Query audit logs for suspicious activity patterns
 */
async function analyzeAuditLogs() {
  const results = {
    queriesByUser: [],
    queriesByTable: [],
    sensitiveTableAccess: [],
    recentSecurityEvents: []
  };

  try {
    // Queries by DB user (detect non-app users)
    try {
      results.queriesByUser = await prisma.$queryRaw`
        SELECT 
          db_user,
          COUNT(*) as query_count,
          COUNT(DISTINCT table_name) as tables_accessed
        FROM audit_logs_dml
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY db_user
        ORDER BY query_count DESC
        LIMIT 20
      `;
    } catch (e) {
      results.queriesByUser = { error: 'audit_logs_dml table may not exist' };
    }

    // Access to sensitive tables
    const sensitiveTables = [
      'super_admins', 'enterprise_admins', 'users_enhanced', 
      'payment_requests', 'rbac_permissions', 'rbac_user_roles',
      'user_sessions', 'api_keys'
    ];

    try {
      results.sensitiveTableAccess = await prisma.$queryRaw`
        SELECT 
          table_name,
          action,
          db_user,
          COUNT(*) as access_count,
          MAX(created_at) as last_access
        FROM audit_logs_dml
        WHERE table_name = ANY(${sensitiveTables})
          AND created_at > NOW() - INTERVAL '24 hours'
        GROUP BY table_name, action, db_user
        ORDER BY access_count DESC
        LIMIT 50
      `;
    } catch (e) {
      results.sensitiveTableAccess = { error: e.message };
    }

    // Recent security events
    try {
      results.recentSecurityEvents = await prisma.$queryRaw`
        SELECT 
          event_type,
          severity,
          user_id,
          ip_address,
          details,
          created_at
        FROM security_events
        WHERE created_at > NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 50
      `;
    } catch (e) {
      results.recentSecurityEvents = { error: 'security_events table may not exist' };
    }

    // Services touching tables
    try {
      results.serviceTableUsage = await prisma.$queryRaw`
        SELECT 
          service_name,
          table_name,
          action,
          COUNT(*) as cnt
        FROM audit_logs_dml
        WHERE created_at > NOW() - INTERVAL '24 hours'
        GROUP BY service_name, table_name, action
        ORDER BY cnt DESC
        LIMIT 50
      `;
    } catch (e) {
      results.serviceTableUsage = { error: e.message };
    }

  } catch (error) {
    results.error = error.message;
  }

  return results;
}

/**
 * Check active database connections for anomalies
 */
async function checkDatabaseConnections() {
  try {
    const connections = await prisma.$queryRaw`
      SELECT 
        pid,
        usename as username,
        application_name,
        client_addr,
        state,
        backend_start,
        query_start,
        LEFT(query, 100) as query_preview
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
      ORDER BY backend_start DESC
    `;

    // Flag suspicious connections
    const flagged = connections.filter(conn => {
      // Unknown application names
      if (!conn.application_name || conn.application_name === '') return true;
      // Non-standard usernames (not bisman_*)
      if (conn.username && !conn.username.startsWith('bisman_')) return true;
      // External IP addresses (not localhost/internal)
      if (conn.client_addr && !['127.0.0.1', '::1', null].includes(conn.client_addr)) return true;
      return false;
    });

    return {
      total: connections.length,
      connections: connections.map(c => ({
        ...c,
        backend_start: c.backend_start?.toISOString(),
        query_start: c.query_start?.toISOString()
      })),
      flagged,
      warnings: flagged.length > 0 ? `${flagged.length} suspicious connection(s) detected` : null
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Run all bypass detection checks
 */
async function runFullScan() {
  console.log('[bypassDetection] Starting full security scan...');
  
  const results = {
    timestamp: new Date().toISOString(),
    routeScan: await scanUnprotectedRoutes(),
    rawSqlScan: await scanRawSqlUsage(),
    cacheStatus: await checkStaleCacheEntries(),
    auditAnalysis: await analyzeAuditLogs(),
    dbConnections: await checkDatabaseConnections()
  };

  // Generate summary
  results.summary = {
    unprotectedRoutes: results.routeScan.unprotected?.length || 0,
    rawSqlQueries: results.rawSqlScan.rawQueries?.length || 0,
    staleCacheEntries: results.cacheStatus.staleCount || 0,
    suspiciousConnections: results.dbConnections.flagged?.length || 0,
    securityEvents24h: Array.isArray(results.auditAnalysis.recentSecurityEvents) 
      ? results.auditAnalysis.recentSecurityEvents.length 
      : 0
  };

  results.riskLevel = calculateRiskLevel(results.summary);

  console.log('[bypassDetection] Scan complete. Risk level:', results.riskLevel);
  return results;
}

/**
 * Calculate overall risk level
 */
function calculateRiskLevel(summary) {
  let score = 0;
  
  if (summary.unprotectedRoutes > 10) score += 3;
  else if (summary.unprotectedRoutes > 5) score += 2;
  else if (summary.unprotectedRoutes > 0) score += 1;

  if (summary.rawSqlQueries > 20) score += 2;
  else if (summary.rawSqlQueries > 10) score += 1;

  if (summary.suspiciousConnections > 0) score += 3;
  
  if (summary.securityEvents24h > 50) score += 2;
  else if (summary.securityEvents24h > 10) score += 1;

  if (score >= 5) return 'HIGH';
  if (score >= 3) return 'MEDIUM';
  if (score >= 1) return 'LOW';
  return 'NONE';
}

module.exports = {
  scanUnprotectedRoutes,
  scanRawSqlUsage,
  checkStaleCacheEntries,
  analyzeAuditLogs,
  checkDatabaseConnections,
  runFullScan,
  calculateRiskLevel
};
