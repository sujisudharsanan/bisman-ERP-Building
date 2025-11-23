/**
 * Prometheus metrics middleware for Backend API
 * Install: npm install prom-client express-prom-bundle
 */

const promBundle = require('express-prom-bundle');
const client = require('prom-client');

// Create a Registry for custom metrics
const register = new client.Registry();

// Enable default metrics (CPU, memory, event loop, etc.)
client.collectDefaultMetrics({ register, prefix: 'bisman_erp_' });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'bisman_erp_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // Buckets for response time in seconds
  registers: [register],
});

const httpRequestTotal = new client.Counter({
  name: 'bisman_erp_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

const activeConnections = new client.Gauge({
  name: 'bisman_erp_active_connections',
  help: 'Number of active connections',
  registers: [register],
});

const databaseQueryDuration = new client.Histogram({
  name: 'bisman_erp_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 3, 5],
  registers: [register],
});

const authAttempts = new client.Counter({
  name: 'bisman_erp_auth_attempts_total',
  help: 'Total authentication attempts',
  labelNames: ['status'],
  registers: [register],
});

// Middleware factory
function createPrometheusMiddleware() {
  // Use express-prom-bundle for automatic route metrics
  const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { app: 'bisman-erp-backend' },
    promClient: {
      collectDefaultMetrics: {},
    },
  });

  // Custom middleware to track active connections
  const connectionTracker = (req, res, next) => {
    activeConnections.inc();
    res.on('finish', () => {
      activeConnections.dec();
    });
    next();
  };

  // Custom middleware for detailed route metrics
  const detailedMetrics = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route ? req.route.path : req.path;
      
      httpRequestDuration
        .labels(req.method, route, res.statusCode)
        .observe(duration);
      
      httpRequestTotal
        .labels(req.method, route, res.statusCode)
        .inc();
    });
    
    next();
  };

  return {
    metricsMiddleware,
    connectionTracker,
    detailedMetrics,
    register,
  };
}

// Database query tracker (to be used with Prisma middleware)
function trackDatabaseQuery(operation, table, duration) {
  databaseQueryDuration
    .labels(operation, table)
    .observe(duration);
}

// Auth attempt tracker
function trackAuthAttempt(success) {
  authAttempts
    .labels(success ? 'success' : 'failure')
    .inc();
}

// Export metrics endpoint handler
function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  register.metrics().then(data => {
    res.end(data);
  });
}

module.exports = {
  createPrometheusMiddleware,
  trackDatabaseQuery,
  trackAuthAttempt,
  metricsHandler,
  register,
  metrics: {
    httpRequestDuration,
    httpRequestTotal,
    activeConnections,
    databaseQueryDuration,
    authAttempts,
  },
};
