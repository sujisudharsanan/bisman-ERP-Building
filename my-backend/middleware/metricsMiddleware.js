/**
 * BISMAN ERP - Metrics Collection Middleware
 * 
 * Automatically records HTTP request metrics for monitoring.
 * Integrates with monitoringService for centralized metrics.
 */

const { getMonitoringService } = require('../services/monitoringService');

/**
 * Middleware to track HTTP request metrics
 */
function metricsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Capture original end function
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const duration = Date.now() - startTime;
    
    // Skip metrics endpoint to avoid recursion
    if (req.path === '/metrics' || req.path === '/api/monitoring/health') {
      return originalEnd.apply(this, args);
    }
    
    try {
      const monitoring = getMonitoringService();
      monitoring.recordHttpRequest(req, res, duration);
    } catch (error) {
      // Don't let metrics collection break the request
      console.error('[MetricsMiddleware] Error recording metrics:', error.message);
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
}

/**
 * Middleware to track rate limit hits
 */
function rateLimitMetricsMiddleware(req, res, next) {
  // This is called when a rate limit is hit
  // Integrate with rate limiter's onLimitReached callback
  try {
    const monitoring = getMonitoringService();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const tenantId = req.tenantId || req.user?.tenant_id;
    
    monitoring.recordRateLimitHit(ip, req.path, tenantId);
  } catch (error) {
    console.error('[MetricsMiddleware] Error recording rate limit hit:', error.message);
  }
  
  next();
}

/**
 * Create rate limiter with metrics integration
 */
function createRateLimiterWithMetrics(limiter) {
  const originalHandler = limiter.handler || ((req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  });
  
  limiter.handler = (req, res, next) => {
    try {
      const monitoring = getMonitoringService();
      const ip = req.ip || req.connection.remoteAddress || 'unknown';
      const tenantId = req.tenantId || req.user?.tenant_id;
      
      monitoring.recordRateLimitHit(ip, req.path, tenantId);
    } catch (error) {
      console.error('[MetricsMiddleware] Error recording rate limit hit:', error.message);
    }
    
    return originalHandler(req, res, next);
  };
  
  return limiter;
}

module.exports = {
  metricsMiddleware,
  rateLimitMetricsMiddleware,
  createRateLimiterWithMetrics,
};
