/**
 * BISMAN ERP - Comprehensive Monitoring Service
 * 
 * Tracks and exposes metrics for:
 * - Database connection health and errors
 * - HTTP 5xx error rates
 * - Rate limit hits
 * - CPU/Memory usage
 * - Backup status
 * - Per-tenant usage and errors
 * 
 * Integrates with Prometheus, Sentry, and internal alerting
 */

const os = require('os');
const { EventEmitter } = require('events');

class MonitoringService extends EventEmitter {
  constructor() {
    super();
    
    // Metric storage with sliding windows
    this.metrics = {
      // Database metrics
      db: {
        connectionErrors: [],
        queryDurations: [],
        activeConnections: 0,
        poolSize: 0,
        lastHealthCheck: null,
        healthy: true,
      },
      
      // HTTP metrics
      http: {
        requests: new Map(), // path -> { count, errors, totalDuration }
        errorsByStatus: new Map(), // status -> count
        rateLimitHits: [],
        recentErrors: [], // Last 100 5xx errors
      },
      
      // System metrics
      system: {
        cpuUsage: [],
        memoryUsage: [],
        eventLoopLag: [],
      },
      
      // Backup metrics
      backup: {
        lastRun: null,
        lastSuccess: null,
        lastFailure: null,
        failures: [],
      },
      
      // Per-tenant metrics
      tenants: new Map(), // tenant_id -> { requests, errors, bandwidth, lastActivity }
      
      // Sentry integration
      sentry: {
        newIssues: [],
        unresolvedCount: 0,
      },
    };
    
    // Alert thresholds (configurable via env)
    this.thresholds = {
      dbConnectionErrorRate: parseFloat(process.env.ALERT_DB_ERROR_RATE) || 0.01, // 1%
      http5xxRate: parseFloat(process.env.ALERT_5XX_RATE) || 0.05, // 5%
      rateLimitHitsPerMinute: parseInt(process.env.ALERT_RATE_LIMIT_HITS) || 100,
      cpuUsagePercent: parseFloat(process.env.ALERT_CPU_PERCENT) || 80,
      memoryUsagePercent: parseFloat(process.env.ALERT_MEMORY_PERCENT) || 85,
      eventLoopLagMs: parseInt(process.env.ALERT_EVENT_LOOP_LAG) || 100,
      backupMaxAgeHours: parseInt(process.env.ALERT_BACKUP_MAX_AGE) || 24,
    };
    
    // Retention settings
    this.retentionMs = {
      shortTerm: 5 * 60 * 1000,    // 5 minutes for high-frequency metrics
      mediumTerm: 60 * 60 * 1000,  // 1 hour for aggregated metrics
      longTerm: 24 * 60 * 60 * 1000, // 24 hours for daily summaries
    };
    
    // Start background collection
    this._startSystemMetricsCollection();
    this._startCleanupJob();
    
    console.log('[MonitoringService] Initialized with thresholds:', this.thresholds);
  }
  
  // ============================================
  // DATABASE METRICS
  // ============================================
  
  /**
   * Record a database connection error
   */
  recordDbConnectionError(error, context = {}) {
    const entry = {
      timestamp: Date.now(),
      error: error.message || String(error),
      code: error.code,
      context,
    };
    
    this.metrics.db.connectionErrors.push(entry);
    this.metrics.db.healthy = false;
    
    // Emit alert if threshold exceeded
    this._checkDbErrorAlert();
    
    console.error('[MonitoringService] DB connection error:', entry);
  }
  
  /**
   * Record successful database connection
   */
  recordDbConnectionSuccess() {
    this.metrics.db.healthy = true;
    this.metrics.db.lastHealthCheck = Date.now();
  }
  
  /**
   * Record database query duration
   */
  recordDbQueryDuration(durationMs, query = '', context = {}) {
    this.metrics.db.queryDurations.push({
      timestamp: Date.now(),
      duration: durationMs,
      query: query.substring(0, 100), // Truncate for storage
      ...context,
    });
  }
  
  /**
   * Update database pool stats
   */
  updateDbPoolStats(activeConnections, poolSize) {
    this.metrics.db.activeConnections = activeConnections;
    this.metrics.db.poolSize = poolSize;
  }
  
  /**
   * Get database health summary
   */
  getDbHealth() {
    const now = Date.now();
    const recentErrors = this.metrics.db.connectionErrors.filter(
      e => e.timestamp > now - this.retentionMs.shortTerm
    );
    
    const recentQueries = this.metrics.db.queryDurations.filter(
      q => q.timestamp > now - this.retentionMs.shortTerm
    );
    
    const avgQueryDuration = recentQueries.length > 0
      ? recentQueries.reduce((sum, q) => sum + q.duration, 0) / recentQueries.length
      : 0;
    
    const slowQueries = recentQueries.filter(q => q.duration > 500);
    
    return {
      healthy: this.metrics.db.healthy,
      lastHealthCheck: this.metrics.db.lastHealthCheck,
      activeConnections: this.metrics.db.activeConnections,
      poolSize: this.metrics.db.poolSize,
      recentErrorCount: recentErrors.length,
      avgQueryDurationMs: Math.round(avgQueryDuration),
      slowQueryCount: slowQueries.length,
      errors: recentErrors.slice(-10), // Last 10 errors
    };
  }
  
  // ============================================
  // HTTP METRICS
  // ============================================
  
  /**
   * Record an HTTP request
   */
  recordHttpRequest(req, res, durationMs) {
    const path = this._normalizePath(req.path);
    const status = res.statusCode;
    const tenantId = req.tenantId || req.user?.tenant_id || 'unknown';
    
    // Per-path metrics
    if (!this.metrics.http.requests.has(path)) {
      this.metrics.http.requests.set(path, {
        count: 0,
        errors: 0,
        totalDuration: 0,
        statusCodes: new Map(),
      });
    }
    
    const pathMetrics = this.metrics.http.requests.get(path);
    pathMetrics.count++;
    pathMetrics.totalDuration += durationMs;
    
    // Track status codes
    const currentStatusCount = pathMetrics.statusCodes.get(status) || 0;
    pathMetrics.statusCodes.set(status, currentStatusCount + 1);
    
    // Track 5xx errors
    if (status >= 500) {
      pathMetrics.errors++;
      
      const errorCount = this.metrics.http.errorsByStatus.get(status) || 0;
      this.metrics.http.errorsByStatus.set(status, errorCount + 1);
      
      // Store recent errors for debugging
      this.metrics.http.recentErrors.push({
        timestamp: Date.now(),
        path,
        status,
        method: req.method,
        tenantId,
        duration: durationMs,
        userAgent: req.get('user-agent')?.substring(0, 100),
      });
      
      // Keep only last 100 errors
      if (this.metrics.http.recentErrors.length > 100) {
        this.metrics.http.recentErrors.shift();
      }
      
      this._check5xxAlert();
    }
    
    // Per-tenant metrics
    this._recordTenantActivity(tenantId, {
      requests: 1,
      errors: status >= 500 ? 1 : 0,
      duration: durationMs,
    });
  }
  
  /**
   * Record a rate limit hit
   */
  recordRateLimitHit(ip, path, tenantId = 'unknown') {
    this.metrics.http.rateLimitHits.push({
      timestamp: Date.now(),
      ip: this._hashIp(ip),
      path,
      tenantId,
    });
    
    this._checkRateLimitAlert();
  }
  
  /**
   * Get HTTP metrics summary
   */
  getHttpMetrics(timeWindowMs = 300000) { // Default 5 minutes
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    
    let totalRequests = 0;
    let totalErrors = 0;
    let totalDuration = 0;
    const pathStats = [];
    
    for (const [path, metrics] of this.metrics.http.requests) {
      totalRequests += metrics.count;
      totalErrors += metrics.errors;
      totalDuration += metrics.totalDuration;
      
      pathStats.push({
        path,
        count: metrics.count,
        errors: metrics.errors,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) : 0,
        avgDuration: metrics.count > 0 ? Math.round(metrics.totalDuration / metrics.count) : 0,
      });
    }
    
    const recentRateLimitHits = this.metrics.http.rateLimitHits.filter(
      h => h.timestamp > cutoff
    );
    
    const recentErrors = this.metrics.http.recentErrors.filter(
      e => e.timestamp > cutoff
    );
    
    return {
      totalRequests,
      totalErrors,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) : 0,
      avgResponseTime: totalRequests > 0 ? Math.round(totalDuration / totalRequests) : 0,
      rateLimitHits: recentRateLimitHits.length,
      recentErrors: recentErrors.slice(-20),
      topPaths: pathStats.sort((a, b) => b.count - a.count).slice(0, 10),
      errorsByStatus: Object.fromEntries(this.metrics.http.errorsByStatus),
    };
  }
  
  // ============================================
  // SYSTEM METRICS
  // ============================================
  
  /**
   * Collect system metrics (CPU, Memory, Event Loop)
   */
  _collectSystemMetrics() {
    const now = Date.now();
    
    // CPU usage
    const cpus = os.cpus();
    const cpuUsage = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total);
    }, 0) / cpus.length * 100;
    
    this.metrics.system.cpuUsage.push({
      timestamp: now,
      value: cpuUsage,
    });
    
    // Memory usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    this.metrics.system.memoryUsage.push({
      timestamp: now,
      value: memUsage,
      total: totalMem,
      free: freeMem,
      used: totalMem - freeMem,
    });
    
    // Event loop lag (simple approximation)
    const start = process.hrtime.bigint();
    setImmediate(() => {
      const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to ms
      this.metrics.system.eventLoopLag.push({
        timestamp: now,
        value: lag,
      });
    });
    
    // Check alerts
    this._checkSystemAlerts(cpuUsage, memUsage);
  }
  
  /**
   * Get system metrics summary
   */
  getSystemMetrics(timeWindowMs = 300000) {
    const now = Date.now();
    const cutoff = now - timeWindowMs;
    
    const recentCpu = this.metrics.system.cpuUsage.filter(m => m.timestamp > cutoff);
    const recentMem = this.metrics.system.memoryUsage.filter(m => m.timestamp > cutoff);
    const recentLag = this.metrics.system.eventLoopLag.filter(m => m.timestamp > cutoff);
    
    const avgCpu = recentCpu.length > 0
      ? recentCpu.reduce((sum, m) => sum + m.value, 0) / recentCpu.length
      : 0;
    
    const avgMem = recentMem.length > 0
      ? recentMem.reduce((sum, m) => sum + m.value, 0) / recentMem.length
      : 0;
    
    const avgLag = recentLag.length > 0
      ? recentLag.reduce((sum, m) => sum + m.value, 0) / recentLag.length
      : 0;
    
    const latestMem = recentMem[recentMem.length - 1] || {};
    
    return {
      cpu: {
        current: recentCpu[recentCpu.length - 1]?.value || 0,
        average: Math.round(avgCpu * 100) / 100,
        max: Math.max(...recentCpu.map(m => m.value), 0),
      },
      memory: {
        current: recentMem[recentMem.length - 1]?.value || 0,
        average: Math.round(avgMem * 100) / 100,
        totalBytes: latestMem.total || os.totalmem(),
        usedBytes: latestMem.used || (os.totalmem() - os.freemem()),
        freeBytes: latestMem.free || os.freemem(),
      },
      eventLoop: {
        current: recentLag[recentLag.length - 1]?.value || 0,
        average: Math.round(avgLag * 100) / 100,
        max: Math.max(...recentLag.map(m => m.value), 0),
      },
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      hostname: os.hostname(),
    };
  }
  
  // ============================================
  // BACKUP METRICS
  // ============================================
  
  /**
   * Record backup completion
   */
  recordBackupComplete(success, details = {}) {
    const entry = {
      timestamp: Date.now(),
      success,
      ...details,
    };
    
    this.metrics.backup.lastRun = entry.timestamp;
    
    if (success) {
      this.metrics.backup.lastSuccess = entry.timestamp;
    } else {
      this.metrics.backup.lastFailure = entry.timestamp;
      this.metrics.backup.failures.push(entry);
      this._checkBackupAlert();
    }
  }
  
  /**
   * Get backup status
   */
  getBackupStatus() {
    const now = Date.now();
    const maxAgeMs = this.thresholds.backupMaxAgeHours * 60 * 60 * 1000;
    
    const isStale = this.metrics.backup.lastSuccess
      ? (now - this.metrics.backup.lastSuccess) > maxAgeMs
      : true;
    
    return {
      lastRun: this.metrics.backup.lastRun,
      lastSuccess: this.metrics.backup.lastSuccess,
      lastFailure: this.metrics.backup.lastFailure,
      isStale,
      staleThresholdHours: this.thresholds.backupMaxAgeHours,
      recentFailures: this.metrics.backup.failures.slice(-5),
    };
  }
  
  // ============================================
  // SENTRY INTEGRATION
  // ============================================
  
  /**
   * Record a new Sentry issue
   */
  recordSentryIssue(issue) {
    this.metrics.sentry.newIssues.push({
      timestamp: Date.now(),
      issueId: issue.id,
      title: issue.title,
      level: issue.level,
      count: issue.count,
    });
    
    // Keep last 50 issues
    if (this.metrics.sentry.newIssues.length > 50) {
      this.metrics.sentry.newIssues.shift();
    }
    
    this.emit('sentry:new-issue', issue);
  }
  
  /**
   * Update Sentry unresolved count
   */
  updateSentryUnresolvedCount(count) {
    this.metrics.sentry.unresolvedCount = count;
  }
  
  /**
   * Get Sentry metrics
   */
  getSentryMetrics(timeWindowMs = 3600000) { // Default 1 hour
    const cutoff = Date.now() - timeWindowMs;
    
    const recentIssues = this.metrics.sentry.newIssues.filter(
      i => i.timestamp > cutoff
    );
    
    return {
      newIssuesCount: recentIssues.length,
      unresolvedCount: this.metrics.sentry.unresolvedCount,
      recentIssues: recentIssues.slice(-10),
    };
  }
  
  // ============================================
  // PER-TENANT METRICS
  // ============================================
  
  /**
   * Record tenant activity
   */
  _recordTenantActivity(tenantId, activity) {
    if (!tenantId || tenantId === 'unknown') return;
    
    if (!this.metrics.tenants.has(tenantId)) {
      this.metrics.tenants.set(tenantId, {
        requests: 0,
        errors: 0,
        totalDuration: 0,
        bandwidth: 0,
        lastActivity: null,
        hourlyStats: [],
      });
    }
    
    const tenant = this.metrics.tenants.get(tenantId);
    tenant.requests += activity.requests || 0;
    tenant.errors += activity.errors || 0;
    tenant.totalDuration += activity.duration || 0;
    tenant.bandwidth += activity.bandwidth || 0;
    tenant.lastActivity = Date.now();
  }
  
  /**
   * Get per-tenant metrics
   */
  getTenantMetrics(tenantId = null) {
    if (tenantId) {
      const tenant = this.metrics.tenants.get(tenantId);
      if (!tenant) return null;
      
      return {
        tenantId,
        requests: tenant.requests,
        errors: tenant.errors,
        errorRate: tenant.requests > 0 ? (tenant.errors / tenant.requests) : 0,
        avgResponseTime: tenant.requests > 0 ? Math.round(tenant.totalDuration / tenant.requests) : 0,
        bandwidth: tenant.bandwidth,
        lastActivity: tenant.lastActivity,
      };
    }
    
    // Return all tenants
    const tenantStats = [];
    for (const [id, tenant] of this.metrics.tenants) {
      tenantStats.push({
        tenantId: id,
        requests: tenant.requests,
        errors: tenant.errors,
        errorRate: tenant.requests > 0 ? (tenant.errors / tenant.requests) : 0,
        avgResponseTime: tenant.requests > 0 ? Math.round(tenant.totalDuration / tenant.requests) : 0,
        lastActivity: tenant.lastActivity,
      });
    }
    
    return tenantStats.sort((a, b) => b.requests - a.requests);
  }
  
  /**
   * Get tenant error rates for dashboard
   */
  getTenantErrorRates() {
    const errorRates = [];
    
    for (const [tenantId, tenant] of this.metrics.tenants) {
      if (tenant.requests > 10) { // Only include tenants with meaningful traffic
        errorRates.push({
          tenantId,
          requests: tenant.requests,
          errors: tenant.errors,
          errorRate: (tenant.errors / tenant.requests) * 100,
          lastActivity: tenant.lastActivity,
        });
      }
    }
    
    return errorRates.sort((a, b) => b.errorRate - a.errorRate);
  }
  
  // ============================================
  // PROMETHEUS METRICS EXPORT
  // ============================================
  
  /**
   * Export metrics in Prometheus format
   */
  getPrometheusMetrics() {
    const lines = [];
    const now = Date.now();
    
    // Database metrics
    lines.push('# HELP erp_db_healthy Database connection health');
    lines.push('# TYPE erp_db_healthy gauge');
    lines.push(`erp_db_healthy ${this.metrics.db.healthy ? 1 : 0}`);
    
    lines.push('# HELP erp_db_active_connections Active database connections');
    lines.push('# TYPE erp_db_active_connections gauge');
    lines.push(`erp_db_active_connections ${this.metrics.db.activeConnections}`);
    
    const recentDbErrors = this.metrics.db.connectionErrors.filter(
      e => e.timestamp > now - this.retentionMs.shortTerm
    ).length;
    lines.push('# HELP erp_db_connection_errors_total Database connection errors in last 5 min');
    lines.push('# TYPE erp_db_connection_errors_total counter');
    lines.push(`erp_db_connection_errors_total ${recentDbErrors}`);
    
    // HTTP metrics
    const httpMetrics = this.getHttpMetrics();
    lines.push('# HELP erp_http_requests_total Total HTTP requests');
    lines.push('# TYPE erp_http_requests_total counter');
    lines.push(`erp_http_requests_total ${httpMetrics.totalRequests}`);
    
    lines.push('# HELP erp_http_errors_total Total HTTP 5xx errors');
    lines.push('# TYPE erp_http_errors_total counter');
    lines.push(`erp_http_errors_total ${httpMetrics.totalErrors}`);
    
    lines.push('# HELP erp_http_error_rate HTTP error rate (0-1)');
    lines.push('# TYPE erp_http_error_rate gauge');
    lines.push(`erp_http_error_rate ${httpMetrics.errorRate.toFixed(4)}`);
    
    lines.push('# HELP erp_http_avg_response_time_ms Average response time in ms');
    lines.push('# TYPE erp_http_avg_response_time_ms gauge');
    lines.push(`erp_http_avg_response_time_ms ${httpMetrics.avgResponseTime}`);
    
    lines.push('# HELP erp_rate_limit_hits_total Rate limit hits in last 5 min');
    lines.push('# TYPE erp_rate_limit_hits_total counter');
    lines.push(`erp_rate_limit_hits_total ${httpMetrics.rateLimitHits}`);
    
    // System metrics
    const sysMetrics = this.getSystemMetrics();
    lines.push('# HELP erp_cpu_usage_percent CPU usage percentage');
    lines.push('# TYPE erp_cpu_usage_percent gauge');
    lines.push(`erp_cpu_usage_percent ${sysMetrics.cpu.current.toFixed(2)}`);
    
    lines.push('# HELP erp_memory_usage_percent Memory usage percentage');
    lines.push('# TYPE erp_memory_usage_percent gauge');
    lines.push(`erp_memory_usage_percent ${sysMetrics.memory.current.toFixed(2)}`);
    
    lines.push('# HELP erp_memory_used_bytes Memory used in bytes');
    lines.push('# TYPE erp_memory_used_bytes gauge');
    lines.push(`erp_memory_used_bytes ${sysMetrics.memory.usedBytes}`);
    
    lines.push('# HELP erp_event_loop_lag_ms Event loop lag in ms');
    lines.push('# TYPE erp_event_loop_lag_ms gauge');
    lines.push(`erp_event_loop_lag_ms ${sysMetrics.eventLoop.current.toFixed(2)}`);
    
    lines.push('# HELP erp_uptime_seconds Process uptime in seconds');
    lines.push('# TYPE erp_uptime_seconds gauge');
    lines.push(`erp_uptime_seconds ${Math.floor(sysMetrics.uptime)}`);
    
    // Backup metrics
    const backupStatus = this.getBackupStatus();
    lines.push('# HELP erp_backup_last_success_timestamp Last successful backup timestamp');
    lines.push('# TYPE erp_backup_last_success_timestamp gauge');
    lines.push(`erp_backup_last_success_timestamp ${backupStatus.lastSuccess || 0}`);
    
    lines.push('# HELP erp_backup_stale Backup is stale (1=stale, 0=ok)');
    lines.push('# TYPE erp_backup_stale gauge');
    lines.push(`erp_backup_stale ${backupStatus.isStale ? 1 : 0}`);
    
    // Sentry metrics
    const sentryMetrics = this.getSentryMetrics();
    lines.push('# HELP erp_sentry_unresolved_issues Unresolved Sentry issues');
    lines.push('# TYPE erp_sentry_unresolved_issues gauge');
    lines.push(`erp_sentry_unresolved_issues ${sentryMetrics.unresolvedCount}`);
    
    lines.push('# HELP erp_sentry_new_issues_1h New Sentry issues in last hour');
    lines.push('# TYPE erp_sentry_new_issues_1h gauge');
    lines.push(`erp_sentry_new_issues_1h ${sentryMetrics.newIssuesCount}`);
    
    // Per-tenant metrics
    for (const [tenantId, tenant] of this.metrics.tenants) {
      const sanitizedTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, '_');
      
      lines.push(`erp_tenant_requests_total{tenant="${sanitizedTenantId}"} ${tenant.requests}`);
      lines.push(`erp_tenant_errors_total{tenant="${sanitizedTenantId}"} ${tenant.errors}`);
      
      const errorRate = tenant.requests > 0 ? (tenant.errors / tenant.requests) : 0;
      lines.push(`erp_tenant_error_rate{tenant="${sanitizedTenantId}"} ${errorRate.toFixed(4)}`);
    }
    
    return lines.join('\n');
  }
  
  // ============================================
  // ALERTING
  // ============================================
  
  _checkDbErrorAlert() {
    const now = Date.now();
    const recentErrors = this.metrics.db.connectionErrors.filter(
      e => e.timestamp > now - 60000 // Last minute
    );
    
    if (recentErrors.length >= 3) { // 3+ errors in a minute
      this.emit('alert', {
        type: 'db_connection_errors',
        severity: 'critical',
        message: `${recentErrors.length} database connection errors in the last minute`,
        timestamp: now,
        details: recentErrors.slice(-3),
      });
    }
  }
  
  _check5xxAlert() {
    const httpMetrics = this.getHttpMetrics(60000); // Last minute
    
    if (httpMetrics.errorRate > this.thresholds.http5xxRate) {
      this.emit('alert', {
        type: 'high_5xx_rate',
        severity: 'critical',
        message: `HTTP 5xx error rate is ${(httpMetrics.errorRate * 100).toFixed(1)}% (threshold: ${this.thresholds.http5xxRate * 100}%)`,
        timestamp: Date.now(),
        details: {
          errorRate: httpMetrics.errorRate,
          recentErrors: httpMetrics.recentErrors.slice(-5),
        },
      });
    }
  }
  
  _checkRateLimitAlert() {
    const now = Date.now();
    const recentHits = this.metrics.http.rateLimitHits.filter(
      h => h.timestamp > now - 60000
    );
    
    if (recentHits.length >= this.thresholds.rateLimitHitsPerMinute) {
      this.emit('alert', {
        type: 'rate_limit_spike',
        severity: 'warning',
        message: `${recentHits.length} rate limit hits in the last minute`,
        timestamp: now,
        details: {
          count: recentHits.length,
          threshold: this.thresholds.rateLimitHitsPerMinute,
        },
      });
    }
  }
  
  _checkSystemAlerts(cpuUsage, memUsage) {
    const now = Date.now();
    
    if (cpuUsage > this.thresholds.cpuUsagePercent) {
      this.emit('alert', {
        type: 'high_cpu',
        severity: 'warning',
        message: `CPU usage is ${cpuUsage.toFixed(1)}% (threshold: ${this.thresholds.cpuUsagePercent}%)`,
        timestamp: now,
        details: { cpuUsage },
      });
    }
    
    if (memUsage > this.thresholds.memoryUsagePercent) {
      this.emit('alert', {
        type: 'high_memory',
        severity: 'warning',
        message: `Memory usage is ${memUsage.toFixed(1)}% (threshold: ${this.thresholds.memoryUsagePercent}%)`,
        timestamp: now,
        details: { memUsage },
      });
    }
  }
  
  _checkBackupAlert() {
    const now = Date.now();
    const maxAgeMs = this.thresholds.backupMaxAgeHours * 60 * 60 * 1000;
    
    if (!this.metrics.backup.lastSuccess || 
        (now - this.metrics.backup.lastSuccess) > maxAgeMs) {
      this.emit('alert', {
        type: 'backup_failure',
        severity: 'critical',
        message: `Backup has not succeeded in ${this.thresholds.backupMaxAgeHours} hours`,
        timestamp: now,
        details: this.getBackupStatus(),
      });
    }
  }
  
  // ============================================
  // LIFECYCLE
  // ============================================
  
  _startSystemMetricsCollection() {
    // Collect system metrics every 10 seconds
    this._systemMetricsInterval = setInterval(() => {
      this._collectSystemMetrics();
    }, 10000);
  }
  
  _startCleanupJob() {
    // Clean up old metrics every 5 minutes
    this._cleanupInterval = setInterval(() => {
      this._cleanupOldMetrics();
    }, 5 * 60 * 1000);
  }
  
  _cleanupOldMetrics() {
    const now = Date.now();
    const shortTermCutoff = now - this.retentionMs.shortTerm;
    const mediumTermCutoff = now - this.retentionMs.mediumTerm;
    
    // Clean DB metrics
    this.metrics.db.connectionErrors = this.metrics.db.connectionErrors.filter(
      e => e.timestamp > mediumTermCutoff
    );
    this.metrics.db.queryDurations = this.metrics.db.queryDurations.filter(
      q => q.timestamp > shortTermCutoff
    );
    
    // Clean HTTP metrics
    this.metrics.http.rateLimitHits = this.metrics.http.rateLimitHits.filter(
      h => h.timestamp > mediumTermCutoff
    );
    
    // Clean system metrics
    this.metrics.system.cpuUsage = this.metrics.system.cpuUsage.filter(
      m => m.timestamp > shortTermCutoff
    );
    this.metrics.system.memoryUsage = this.metrics.system.memoryUsage.filter(
      m => m.timestamp > shortTermCutoff
    );
    this.metrics.system.eventLoopLag = this.metrics.system.eventLoopLag.filter(
      m => m.timestamp > shortTermCutoff
    );
    
    // Clean backup failures
    this.metrics.backup.failures = this.metrics.backup.failures.filter(
      f => f.timestamp > now - this.retentionMs.longTerm
    );
  }
  
  /**
   * Normalize path for grouping (remove IDs)
   */
  _normalizePath(path) {
    return path
      .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
      .replace(/\/\d+/g, '/:id');
  }
  
  /**
   * Hash IP for privacy
   */
  _hashIp(ip) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(ip).digest('hex').substring(0, 12);
  }
  
  /**
   * Get full monitoring summary
   */
  getFullSummary() {
    return {
      timestamp: Date.now(),
      database: this.getDbHealth(),
      http: this.getHttpMetrics(),
      system: this.getSystemMetrics(),
      backup: this.getBackupStatus(),
      sentry: this.getSentryMetrics(),
      tenants: this.getTenantMetrics(),
      thresholds: this.thresholds,
    };
  }
  
  /**
   * Shutdown cleanup
   */
  shutdown() {
    if (this._systemMetricsInterval) {
      clearInterval(this._systemMetricsInterval);
    }
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
  }
}

// Singleton instance
let instance = null;

function getMonitoringService() {
  if (!instance) {
    instance = new MonitoringService();
  }
  return instance;
}

module.exports = {
  MonitoringService,
  getMonitoringService,
};
