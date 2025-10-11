"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var DatabaseMonitoringService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseMonitoringService = void 0;
const common_1 = require("@nestjs/common");
const promClient = __importStar(require("prom-client"));
let DatabaseMonitoringService = DatabaseMonitoringService_1 = class DatabaseMonitoringService {
    logger = new common_1.Logger(DatabaseMonitoringService_1.name);
    queryCounter = new promClient.Counter({
        name: 'db_queries_total',
        help: 'Total number of database queries',
        labelNames: ['operation', 'table', 'status']
    });
    queryDuration = new promClient.Histogram({
        name: 'db_query_duration_seconds',
        help: 'Database query duration in seconds',
        labelNames: ['operation', 'table'],
        buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
    });
    slowQueryCounter = new promClient.Counter({
        name: 'db_slow_queries_total',
        help: 'Total number of slow database queries',
        labelNames: ['operation', 'table']
    });
    connectionPool = new promClient.Gauge({
        name: 'db_connection_pool_size',
        help: 'Current database connection pool size',
        labelNames: ['status']
    });
    slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000');
    enableDetailedLogging = process.env.DB_DETAILED_LOGGING === 'true';
    queryHistory = [];
    maxHistorySize = 1000;
    async monitorQuery(queryFn, context) {
        const startTime = performance.now();
        const timestamp = new Date();
        const { query, params, operation = 'unknown', table = 'unknown', source = 'unknown' } = context;
        const sanitizedQuery = this.sanitizeQuery(query);
        const sanitizedParams = this.sanitizeParams(params);
        let result;
        let error;
        let rowCount;
        try {
            result = await queryFn();
            if (result && typeof result === 'object') {
                if ('rowCount' in result) {
                    rowCount = result.rowCount;
                }
                else if ('length' in result) {
                    rowCount = result.length;
                }
                else if (Array.isArray(result)) {
                    rowCount = result.length;
                }
            }
            this.queryCounter.inc({ operation, table, status: 'success' });
        }
        catch (err) {
            error = err instanceof Error ? err.message : String(err);
            this.queryCounter.inc({ operation, table, status: 'error' });
            throw err;
        }
        finally {
            const endTime = performance.now();
            const duration = endTime - startTime;
            const durationSeconds = duration / 1000;
            this.queryDuration.observe({ operation, table }, durationSeconds);
            const metrics = {
                query: sanitizedQuery,
                duration,
                params: sanitizedParams,
                rows: rowCount,
                error,
                timestamp,
                source
            };
            if (duration > this.slowQueryThreshold) {
                this.slowQueryCounter.inc({ operation, table });
                this.logSlowQuery(metrics);
            }
            if (this.enableDetailedLogging || error) {
                this.logQuery(metrics);
            }
            this.addToHistory(metrics);
        }
        return result;
    }
    updateConnectionPoolMetrics(active, idle, total) {
        this.connectionPool.set({ status: 'active' }, active);
        this.connectionPool.set({ status: 'idle' }, idle);
        this.connectionPool.set({ status: 'total' }, total);
    }
    getQueryStats() {
        const now = Date.now();
        const last5Minutes = this.queryHistory.filter(q => now - q.timestamp.getTime() < 5 * 60 * 1000);
        const lastHour = this.queryHistory.filter(q => now - q.timestamp.getTime() < 60 * 60 * 1000);
        const slowQueries = this.queryHistory.filter(q => q.duration > this.slowQueryThreshold);
        return {
            total: this.queryHistory.length,
            last5Minutes: last5Minutes.length,
            lastHour: lastHour.length,
            slowQueries: slowQueries.length,
            averageDuration: {
                last5Minutes: this.calculateAverageDuration(last5Minutes),
                lastHour: this.calculateAverageDuration(lastHour),
                overall: this.calculateAverageDuration(this.queryHistory)
            },
            topSlowQueries: slowQueries
                .sort((a, b) => b.duration - a.duration)
                .slice(0, 10)
                .map(q => ({
                query: q.query.substring(0, 100) + '...',
                duration: q.duration,
                timestamp: q.timestamp
            }))
        };
    }
    getRealTimeMetrics() {
        const registry = promClient.register;
        return registry.getMetricsAsJSON();
    }
    sanitizeQuery(query) {
        return query
            .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
            .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
            .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'");
    }
    sanitizeParams(params) {
        if (!params)
            return undefined;
        return params.map((param, index) => {
            if (typeof param === 'string' && (param.includes('password') ||
                param.includes('token') ||
                param.includes('secret') ||
                param.length > 50)) {
                return '[REDACTED]';
            }
            return param;
        });
    }
    logQuery(metrics) {
        const logData = {
            query: metrics.query.substring(0, 200) + (metrics.query.length > 200 ? '...' : ''),
            duration: `${metrics.duration.toFixed(2)}ms`,
            rows: metrics.rows,
            source: metrics.source,
            params: metrics.params?.length || 0
        };
        if (metrics.error) {
            this.logger.error(`Query failed: ${metrics.error}`, logData);
        }
        else if (metrics.duration > this.slowQueryThreshold) {
            this.logger.warn(`Slow query detected`, logData);
        }
        else {
            this.logger.debug(`Query executed`, logData);
        }
    }
    logSlowQuery(metrics) {
        this.logger.warn(`SLOW QUERY DETECTED`, {
            duration: `${metrics.duration.toFixed(2)}ms`,
            threshold: `${this.slowQueryThreshold}ms`,
            query: metrics.query.substring(0, 300),
            rows: metrics.rows,
            source: metrics.source,
            timestamp: metrics.timestamp.toISOString()
        });
        if (process.env.NODE_ENV === 'production') {
            this.sendSlowQueryAlert(metrics);
        }
    }
    sendSlowQueryAlert(metrics) {
        console.log('🐌 SLOW QUERY ALERT:', {
            duration: metrics.duration,
            query: metrics.query.substring(0, 100),
            timestamp: metrics.timestamp
        });
    }
    addToHistory(metrics) {
        this.queryHistory.push(metrics);
        if (this.queryHistory.length > this.maxHistorySize) {
            this.queryHistory.shift();
        }
    }
    calculateAverageDuration(queries) {
        if (queries.length === 0)
            return 0;
        const total = queries.reduce((sum, q) => sum + q.duration, 0);
        return Math.round(total / queries.length * 100) / 100;
    }
    analyzeQueryPatterns() {
        const patterns = new Map();
        this.queryHistory.forEach(query => {
            const pattern = this.normalizeQueryPattern(query.query);
            if (!patterns.has(pattern)) {
                patterns.set(pattern, { count: 0, totalDuration: 0, avgDuration: 0 });
            }
            const stats = patterns.get(pattern);
            stats.count++;
            stats.totalDuration += query.duration;
            stats.avgDuration = stats.totalDuration / stats.count;
        });
        return Array.from(patterns.entries())
            .map(([pattern, stats]) => ({ pattern, ...stats }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);
    }
    normalizeQueryPattern(query) {
        return query
            .replace(/\$\d+/g, '$?')
            .replace(/\d+/g, '?')
            .replace(/'[^']*'/g, "'?'")
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
    }
};
exports.DatabaseMonitoringService = DatabaseMonitoringService;
exports.DatabaseMonitoringService = DatabaseMonitoringService = DatabaseMonitoringService_1 = __decorate([
    (0, common_1.Injectable)()
], DatabaseMonitoringService);
