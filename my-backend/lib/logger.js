/**
 * Pino Logger Configuration
 * 
 * Structured JSON logging for production, pretty-print for development
 * Replaces console.log/error with structured, parseable logs
 */

const pino = require('pino');

// Determine if we're in production
const isProd = process.env.NODE_ENV === 'production';

// Redaction paths for sensitive data
const redactPaths = [
  'req.headers.authorization',
  'req.headers.cookie',
  'password',
  '*.password',
  'token',
  '*.token',
  'accessToken',
  '*.accessToken',
  'refreshToken',
  '*.refreshToken',
  'secret',
  '*.secret'
];

// Base logger configuration
const baseConfig = {
  level: process.env.LOG_LEVEL || (isProd ? 'info' : 'debug'),
  
  // Custom serializers for common objects
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      userId: req.user?.id,
      tenantId: req.user?.tenantId || req.user?.tenant_id,
      role: req.user?.role || req.user?.roleName,
      ip: req.ip || req.headers?.['x-forwarded-for']
    }),
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: pino.stdSerializers.err
  },
  
  // Redact sensitive fields
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]'
  },
  
  // Base context for all logs
  base: {
    service: 'bisman-erp',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development'
  }
};

// Create the logger
let logger;

if (isProd) {
  // Production: JSON output to stdout (Railway/Docker captures this)
  logger = pino({
    ...baseConfig,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label })
    }
  });
} else {
  // Development: Pretty print for readability
  logger = pino({
    ...baseConfig,
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname,service,version',
        singleLine: false
      }
    }
  });
}

// HTTP request logging middleware
const httpLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log at response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' 
                   : res.statusCode >= 400 ? 'warn' 
                   : 'info';
    
    logger[logLevel]({
      type: 'http',
      req: {
        method: req.method,
        url: req.originalUrl || req.url,
        userId: req.user?.id,
        tenantId: req.user?.tenantId || req.user?.tenant_id
      },
      res: {
        statusCode: res.statusCode
      },
      duration,
      msg: `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    });
  });
  
  next();
};

// Create child loggers for different modules
const createModuleLogger = (moduleName) => logger.child({ module: moduleName });

// Standard log methods for backward compatibility
const log = {
  info: (msg, data = {}) => logger.info(data, msg),
  warn: (msg, data = {}) => logger.warn(data, msg),
  error: (msg, data = {}) => logger.error(data, msg),
  debug: (msg, data = {}) => logger.debug(data, msg),
  fatal: (msg, data = {}) => logger.fatal(data, msg)
};

// Audit logging for security events
const audit = {
  login: (userId, success, ip, reason = null) => {
    logger.info({
      type: 'audit',
      event: 'login',
      userId,
      success,
      ip,
      reason,
      msg: `Login ${success ? 'success' : 'failure'}: user=${userId}`
    });
  },
  
  accessDenied: (userId, resource, reason) => {
    logger.warn({
      type: 'audit',
      event: 'access_denied',
      userId,
      resource,
      reason,
      msg: `Access denied: user=${userId} resource=${resource}`
    });
  },
  
  dataChange: (userId, table, action, recordId) => {
    logger.info({
      type: 'audit',
      event: 'data_change',
      userId,
      table,
      action,
      recordId,
      msg: `Data ${action}: user=${userId} table=${table} id=${recordId}`
    });
  },
  
  roleEscalation: (adminId, targetUserId, fromRole, toRole) => {
    logger.warn({
      type: 'audit',
      event: 'role_escalation',
      adminId,
      targetUserId,
      fromRole,
      toRole,
      msg: `Role change: admin=${adminId} user=${targetUserId} ${fromRole} → ${toRole}`
    });
  }
};

// Performance logging
const perf = {
  dbQuery: (query, duration, rows = null) => {
    const level = duration > 1000 ? 'warn' : 'debug';
    logger[level]({
      type: 'perf',
      event: 'db_query',
      query: query.substring(0, 200), // Truncate long queries
      duration,
      rows,
      msg: `DB query: ${duration}ms${rows !== null ? ` (${rows} rows)` : ''}`
    });
  },
  
  apiCall: (endpoint, duration) => {
    const level = duration > 5000 ? 'warn' : 'info';
    logger[level]({
      type: 'perf',
      event: 'api_call',
      endpoint,
      duration,
      msg: `API call: ${endpoint} ${duration}ms`
    });
  }
};

module.exports = {
  logger,
  httpLogger,
  createModuleLogger,
  log,
  audit,
  perf
};
