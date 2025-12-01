/**
 * Fallback Service - Production-Ready Centralized Fallback Handler
 * 
 * Provides robust fallback logic with:
 * - Database logging of all fallback events
 * - In-memory rate limiting and alerting
 * - Safe default responses for UI continuity
 * - Max 1 retry policy to prevent infinite loops
 */

const { getPrisma } = require('../lib/prisma');

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MODULE_NAME: 'FallbackService',
  MAX_RETRIES: 1,
  ALERT_THRESHOLD: 10, // Trigger alert if X fallbacks in ALERT_WINDOW_MS
  ALERT_WINDOW_MS: 60 * 60 * 1000, // 1 hour
  LOG_RETENTION_DAYS: 30,
  FALLBACK_CACHE_TTL_MS: 5 * 60 * 1000, // 5 minutes cache for fallback data
};

// ============================================================================
// IN-MEMORY TRACKING
// ============================================================================

// Track fallback frequency for alerting
const fallbackCounters = new Map(); // key: module_operation -> { count, firstTimestamp }

// Cache for fallback responses to reduce DB load during outages
const fallbackCache = new Map(); // key: cacheKey -> { data, timestamp }

// Alert state to prevent duplicate alerts
const alertState = new Map(); // key: module_operation -> lastAlertTimestamp

// ============================================================================
// SAFE DEFAULT RESPONSES
// ============================================================================

const SAFE_DEFAULTS = {
  // Privilege Service defaults
  'privilege:getAllRoles': {
    data: [],
    message: 'Roles temporarily unavailable',
    fallbackMode: true
  },
  'privilege:getUsersByRole': {
    data: [],
    message: 'Users temporarily unavailable',
    fallbackMode: true
  },
  'privilege:getAllFeatures': {
    data: [],
    message: 'Features temporarily unavailable',
    fallbackMode: true
  },
  'privilege:getPrivileges': {
    data: { features: [], privileges: [] },
    message: 'Privileges temporarily unavailable',
    fallbackMode: true
  },
  
  // Generic defaults by type
  'generic:list': {
    data: [],
    message: 'Data temporarily unavailable',
    fallbackMode: true
  },
  'generic:object': {
    data: null,
    message: 'Data temporarily unavailable',
    fallbackMode: true
  },
  'generic:boolean': {
    data: false,
    message: 'Operation status unavailable',
    fallbackMode: true
  },
  'generic:count': {
    data: 0,
    message: 'Count unavailable',
    fallbackMode: true
  }
};

// ============================================================================
// FALLBACK LOGGER CLASS
// ============================================================================

class FallbackLogger {
  constructor() {
    this.prisma = null;
    this.initialized = false;
    this.pendingLogs = []; // Buffer for logs when DB unavailable
  }

  async initialize() {
    if (this.initialized) return;
    try {
      this.prisma = getPrisma();
      this.initialized = true;
    } catch (e) {
      console.error('[FallbackLogger] Failed to initialize Prisma:', e.message);
    }
  }

  /**
   * Log a fallback event to database
   */
  async logFallbackEvent({
    moduleName,
    operationName,
    errorMessage,
    errorCode = null,
    userId = null,
    requestPayload = null,
    responseType = 'safe_default',
    severity = 'warning'
  }) {
    const logEntry = {
      module_name: moduleName,
      operation_name: operationName,
      error_message: errorMessage?.substring(0, 1000) || 'Unknown error',
      error_code: errorCode,
      user_id: userId ? String(userId) : null,
      request_payload: requestPayload ? JSON.stringify(requestPayload).substring(0, 2000) : null,
      response_type: responseType,
      severity,
      fallback_triggered_at: new Date(),
      resolved: false
    };

    try {
      await this.initialize();
      
      if (this.prisma) {
        // Try to insert into database
        await this.prisma.$executeRaw`
          INSERT INTO fallback_logs (
            module_name, operation_name, error_message, error_code,
            user_id, request_payload, response_type, severity,
            fallback_triggered_at, resolved, created_at
          ) VALUES (
            ${logEntry.module_name}, ${logEntry.operation_name}, 
            ${logEntry.error_message}, ${logEntry.error_code},
            ${logEntry.user_id}, ${logEntry.request_payload},
            ${logEntry.response_type}, ${logEntry.severity},
            ${logEntry.fallback_triggered_at}, ${logEntry.resolved},
            NOW()
          )
        `;
        
        // Flush any pending logs
        await this.flushPendingLogs();
      } else {
        // Buffer the log for later
        this.pendingLogs.push(logEntry);
        if (this.pendingLogs.length > 100) {
          this.pendingLogs.shift(); // Keep buffer bounded
        }
      }
    } catch (e) {
      // Don't let logging failures break the fallback flow
      console.error('[FallbackLogger] Failed to log event:', e.message);
      this.pendingLogs.push(logEntry);
    }

    // Always log to console for immediate visibility
    console.warn(`[FALLBACK] ${moduleName}:${operationName} - ${errorMessage} (severity: ${severity})`);
    
    return logEntry;
  }

  /**
   * Flush pending logs when DB becomes available
   */
  async flushPendingLogs() {
    if (!this.prisma || this.pendingLogs.length === 0) return;
    
    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];
    
    for (const log of logsToFlush) {
      try {
        await this.prisma.$executeRaw`
          INSERT INTO fallback_logs (
            module_name, operation_name, error_message, error_code,
            user_id, request_payload, response_type, severity,
            fallback_triggered_at, resolved, created_at
          ) VALUES (
            ${log.module_name}, ${log.operation_name}, 
            ${log.error_message}, ${log.error_code},
            ${log.user_id}, ${log.request_payload},
            ${log.response_type}, ${log.severity},
            ${log.fallback_triggered_at}, ${log.resolved},
            NOW()
          )
        `;
      } catch (e) {
        // Re-add to pending if still failing
        this.pendingLogs.push(log);
      }
    }
  }

  /**
   * Log an alert when threshold exceeded
   */
  async logAlert({
    moduleName,
    operationName,
    fallbackCount,
    windowMinutes
  }) {
    const alertKey = `${moduleName}:${operationName}`;
    const now = Date.now();
    
    // Check if we already alerted recently (within 15 minutes)
    if (alertState.has(alertKey) && (now - alertState.get(alertKey)) < 15 * 60 * 1000) {
      return; // Skip duplicate alert
    }
    
    alertState.set(alertKey, now);
    
    const alertMessage = `ALERT: ${moduleName}:${operationName} triggered ${fallbackCount} fallbacks in ${windowMinutes} minutes`;
    
    try {
      await this.initialize();
      if (this.prisma) {
        await this.prisma.$executeRaw`
          INSERT INTO fallback_logs (
            module_name, operation_name, error_message, error_code,
            response_type, severity, fallback_triggered_at, resolved, created_at
          ) VALUES (
            ${moduleName}, ${operationName}, ${alertMessage}, 'THRESHOLD_EXCEEDED',
            'alert', 'critical', NOW(), false, NOW()
          )
        `;
      }
    } catch (e) {
      console.error('[FallbackLogger] Failed to log alert:', e.message);
    }
    
    // Always output critical alerts
    console.error(`[FALLBACK ALERT] ${alertMessage}`);
  }
}

// Singleton logger instance
const logger = new FallbackLogger();

// ============================================================================
// FALLBACK SERVICE CLASS
// ============================================================================

class FallbackService {
  /**
   * Execute an operation with robust fallback handling
   * 
   * @param {Object} options
   * @param {Function} options.primaryFn - The main async function to execute
   * @param {string} options.moduleName - Module name for logging (e.g., 'privilege')
   * @param {string} options.operationName - Operation name (e.g., 'getAllRoles')
   * @param {string} options.fallbackKey - Key to lookup safe default (e.g., 'privilege:getAllRoles')
   * @param {*} options.customDefault - Custom default value if not in SAFE_DEFAULTS
   * @param {string|number} options.userId - User ID for logging
   * @param {Object} options.requestPayload - Request data for debugging
   * @param {number} options.timeoutMs - Operation timeout (default 30s)
   * @param {boolean} options.enableRetry - Whether to retry once (default true)
   * @param {string} options.cacheKey - Optional cache key for fallback responses
   * 
   * @returns {Object} { data, fallbackMode, message }
   */
  static async execute({
    primaryFn,
    moduleName,
    operationName,
    fallbackKey = null,
    customDefault = null,
    userId = null,
    requestPayload = null,
    timeoutMs = 30000,
    enableRetry = true,
    cacheKey = null
  }) {
    const operationKey = `${moduleName}:${operationName}`;
    let lastError = null;
    let attempts = 0;
    const maxAttempts = enableRetry ? CONFIG.MAX_RETRIES + 1 : 1;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        // Create timeout wrapper
        const result = await Promise.race([
          primaryFn(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('TIMEOUT: Operation exceeded time limit')), timeoutMs)
          )
        ]);
        
        // Success! Cache the result for future fallbacks
        if (cacheKey) {
          fallbackCache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          });
        }
        
        return {
          data: result,
          fallbackMode: false,
          message: null
        };
        
      } catch (error) {
        lastError = error;
        
        // Log retry attempt
        if (attempts < maxAttempts) {
          console.warn(`[Fallback] ${operationKey} attempt ${attempts} failed, retrying...`, error.message);
        }
      }
    }

    // All attempts failed - trigger fallback
    return await this.triggerFallback({
      moduleName,
      operationName,
      fallbackKey: fallbackKey || operationKey,
      customDefault,
      error: lastError,
      userId,
      requestPayload,
      cacheKey
    });
  }

  /**
   * Trigger fallback mode and return safe default
   */
  static async triggerFallback({
    moduleName,
    operationName,
    fallbackKey,
    customDefault,
    error,
    userId,
    requestPayload,
    cacheKey
  }) {
    const operationKey = `${moduleName}:${operationName}`;
    
    // Update frequency counter
    this.updateFallbackCounter(operationKey);
    
    // Log the fallback event
    await logger.logFallbackEvent({
      moduleName,
      operationName,
      errorMessage: error?.message || 'Unknown error',
      errorCode: error?.code || this.categorizeError(error),
      userId,
      requestPayload,
      responseType: 'safe_default',
      severity: this.determineSeverity(error)
    });
    
    // Check for threshold alerts
    await this.checkAlertThreshold(moduleName, operationName);
    
    // Try to return cached data first
    if (cacheKey && fallbackCache.has(cacheKey)) {
      const cached = fallbackCache.get(cacheKey);
      if (Date.now() - cached.timestamp < CONFIG.FALLBACK_CACHE_TTL_MS) {
        return {
          data: cached.data,
          fallbackMode: true,
          message: 'Operation completed with cached data (fallback mode)',
          cachedAt: new Date(cached.timestamp).toISOString()
        };
      }
    }
    
    // Return safe default
    const safeDefault = customDefault || SAFE_DEFAULTS[fallbackKey] || SAFE_DEFAULTS['generic:list'];
    
    return {
      data: safeDefault.data,
      fallbackMode: true,
      message: safeDefault.message || 'Operation completed with fallback mode'
    };
  }

  /**
   * Update fallback frequency counter
   */
  static updateFallbackCounter(operationKey) {
    const now = Date.now();
    
    if (!fallbackCounters.has(operationKey)) {
      fallbackCounters.set(operationKey, { count: 1, firstTimestamp: now });
    } else {
      const counter = fallbackCounters.get(operationKey);
      
      // Reset if window expired
      if (now - counter.firstTimestamp > CONFIG.ALERT_WINDOW_MS) {
        fallbackCounters.set(operationKey, { count: 1, firstTimestamp: now });
      } else {
        counter.count++;
      }
    }
  }

  /**
   * Check if alert threshold exceeded
   */
  static async checkAlertThreshold(moduleName, operationName) {
    const operationKey = `${moduleName}:${operationName}`;
    const counter = fallbackCounters.get(operationKey);
    
    if (counter && counter.count >= CONFIG.ALERT_THRESHOLD) {
      const windowMinutes = Math.round((Date.now() - counter.firstTimestamp) / 60000);
      await logger.logAlert({
        moduleName,
        operationName,
        fallbackCount: counter.count,
        windowMinutes
      });
    }
  }

  /**
   * Categorize error type
   */
  static categorizeError(error) {
    if (!error) return 'UNKNOWN';
    
    const msg = error.message?.toLowerCase() || '';
    
    if (msg.includes('timeout')) return 'TIMEOUT';
    if (msg.includes('econnrefused') || msg.includes('connection')) return 'CONNECTION_ERROR';
    if (msg.includes('database') || msg.includes('prisma')) return 'DATABASE_ERROR';
    if (msg.includes('not found') || msg.includes('undefined')) return 'NOT_FOUND';
    if (msg.includes('permission') || msg.includes('unauthorized')) return 'AUTH_ERROR';
    if (msg.includes('validation')) return 'VALIDATION_ERROR';
    
    return 'INTERNAL_ERROR';
  }

  /**
   * Determine severity based on error type
   */
  static determineSeverity(error) {
    const code = this.categorizeError(error);
    
    const criticalErrors = ['DATABASE_ERROR', 'CONNECTION_ERROR'];
    const warningErrors = ['TIMEOUT', 'NOT_FOUND', 'VALIDATION_ERROR'];
    
    if (criticalErrors.includes(code)) return 'critical';
    if (warningErrors.includes(code)) return 'warning';
    return 'info';
  }

  /**
   * Get fallback statistics
   */
  static getStats() {
    const stats = {};
    
    for (const [key, counter] of fallbackCounters) {
      stats[key] = {
        count: counter.count,
        windowStarted: new Date(counter.firstTimestamp).toISOString(),
        windowMinutesElapsed: Math.round((Date.now() - counter.firstTimestamp) / 60000)
      };
    }
    
    return {
      counters: stats,
      pendingLogs: logger.pendingLogs.length,
      cacheSize: fallbackCache.size,
      alertThreshold: CONFIG.ALERT_THRESHOLD,
      alertWindowMinutes: CONFIG.ALERT_WINDOW_MS / 60000
    };
  }

  /**
   * Clear old cache entries
   */
  static clearExpiredCache() {
    const now = Date.now();
    for (const [key, value] of fallbackCache) {
      if (now - value.timestamp > CONFIG.FALLBACK_CACHE_TTL_MS) {
        fallbackCache.delete(key);
      }
    }
  }

  /**
   * Reset counters (useful for testing)
   */
  static resetCounters() {
    fallbackCounters.clear();
    alertState.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  FallbackService,
  FallbackLogger: logger,
  SAFE_DEFAULTS,
  CONFIG
};
