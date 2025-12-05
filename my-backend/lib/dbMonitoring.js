/**
 * BISMAN ERP - Database Monitoring Wrapper
 * 
 * Wraps Prisma client to track:
 * - Connection health
 * - Query durations
 * - Connection pool stats
 * - Connection errors
 */

const { getMonitoringService } = require('../services/monitoringService');

/**
 * Wrap Prisma client with monitoring
 */
function wrapPrismaWithMonitoring(prisma) {
  if (!prisma || prisma._isMonitoringWrapped) {
    return prisma;
  }
  
  const monitoring = getMonitoringService();
  
  // Track connection events
  prisma.$on('beforeExit', async () => {
    console.log('[DbMonitoring] Prisma client disconnecting');
  });
  
  // Create middleware for query monitoring
  prisma.$use(async (params, next) => {
    const startTime = Date.now();
    
    try {
      const result = await next(params);
      const duration = Date.now() - startTime;
      
      // Record successful query
      monitoring.recordDbQueryDuration(duration, `${params.model}.${params.action}`, {
        model: params.model,
        action: params.action,
      });
      
      // Update health on successful queries
      monitoring.recordDbConnectionSuccess();
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Check if this is a connection error
      const isConnectionError = error.message?.includes('connect') ||
        error.code === 'P1001' || // Authentication failed
        error.code === 'P1002' || // Could not connect to database
        error.code === 'P1003' || // Database does not exist
        error.code === 'P1008' || // Operations timed out
        error.code === 'P1017';   // Server closed the connection
      
      if (isConnectionError) {
        monitoring.recordDbConnectionError(error, {
          model: params.model,
          action: params.action,
        });
      }
      
      // Record query duration even for errors
      monitoring.recordDbQueryDuration(duration, `${params.model}.${params.action} [ERROR]`, {
        model: params.model,
        action: params.action,
        error: true,
      });
      
      throw error;
    }
  });
  
  // Mark as wrapped to prevent double-wrapping
  prisma._isMonitoringWrapped = true;
  
  console.log('[DbMonitoring] Prisma client wrapped with monitoring');
  
  return prisma;
}

/**
 * Create a health check function for the database
 */
function createDbHealthCheck(prisma) {
  return async function checkDbHealth() {
    const monitoring = getMonitoringService();
    const startTime = Date.now();
    
    try {
      // Simple connectivity check
      await prisma.$queryRaw`SELECT 1`;
      const duration = Date.now() - startTime;
      
      monitoring.recordDbConnectionSuccess();
      monitoring.recordDbQueryDuration(duration, 'health_check');
      
      // Try to get pool stats if available
      // Note: This is PostgreSQL-specific
      try {
        const poolStats = await prisma.$queryRaw`
          SELECT 
            numbackends as active_connections,
            xact_commit as transactions_committed,
            xact_rollback as transactions_rolled_back,
            blks_read as blocks_read,
            blks_hit as cache_hits
          FROM pg_stat_database 
          WHERE datname = current_database()
        `;
        
        if (poolStats && poolStats[0]) {
          monitoring.updateDbPoolStats(
            parseInt(poolStats[0].active_connections) || 0,
            100 // Max connections (configurable)
          );
        }
      } catch (statsError) {
        // Stats query failed, but connection is healthy
        console.warn('[DbMonitoring] Could not get pool stats:', statsError.message);
      }
      
      return {
        healthy: true,
        latencyMs: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      monitoring.recordDbConnectionError(error, {
        source: 'health_check',
      });
      
      return {
        healthy: false,
        latencyMs: duration,
        error: error.message,
      };
    }
  };
}

/**
 * Start periodic database health checks
 */
function startDbHealthMonitor(prisma, intervalMs = 30000) {
  const healthCheck = createDbHealthCheck(prisma);
  
  const runCheck = async () => {
    try {
      const result = await healthCheck();
      if (!result.healthy) {
        console.error('[DbMonitoring] Database health check failed:', result.error);
      }
    } catch (error) {
      console.error('[DbMonitoring] Health check error:', error.message);
    }
  };
  
  // Run immediately
  runCheck();
  
  // Then periodically
  const intervalId = setInterval(runCheck, intervalMs);
  
  console.log(`[DbMonitoring] Health monitor started (interval: ${intervalMs}ms)`);
  
  return {
    stop: () => clearInterval(intervalId),
    runNow: runCheck,
  };
}

module.exports = {
  wrapPrismaWithMonitoring,
  createDbHealthCheck,
  startDbHealthMonitor,
};
