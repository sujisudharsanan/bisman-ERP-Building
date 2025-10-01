import { Injectable, Logger } from '@nestjs/common'
import { Performance } from 'perf_hooks'
import * as promClient from 'prom-client'

interface QueryMetrics {
  query: string
  duration: number
  params?: any[]
  rows?: number
  error?: string
  timestamp: Date
  source: string
}

@Injectable()
export class DatabaseMonitoringService {
  private readonly logger = new Logger(DatabaseMonitoringService.name)
  private queryCounter = new promClient.Counter({
    name: 'db_queries_total',
    help: 'Total number of database queries',
    labelNames: ['operation', 'table', 'status']
  })

  private queryDuration = new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Database query duration in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10]
  })

  private slowQueryCounter = new promClient.Counter({
    name: 'db_slow_queries_total',
    help: 'Total number of slow database queries',
    labelNames: ['operation', 'table']
  })

  private connectionPool = new promClient.Gauge({
    name: 'db_connection_pool_size',
    help: 'Current database connection pool size',
    labelNames: ['status']
  })

  private readonly slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000')
  private readonly enableDetailedLogging = process.env.DB_DETAILED_LOGGING === 'true'
  private readonly queryHistory: QueryMetrics[] = []
  private readonly maxHistorySize = 1000

  /**
   * Monitor a database query execution
   */
  async monitorQuery<T>(
    queryFn: () => Promise<T>,
    context: {
      query: string
      params?: any[]
      operation?: string
      table?: string
      source?: string
    }
  ): Promise<T> {
    const startTime = performance.now()
    const timestamp = new Date()
    const { query, params, operation = 'unknown', table = 'unknown', source = 'unknown' } = context

    // Sanitize query for logging (remove sensitive data)
    const sanitizedQuery = this.sanitizeQuery(query)
    const sanitizedParams = this.sanitizeParams(params)

    let result: T
    let error: string | undefined
    let rowCount: number | undefined

    try {
      result = await queryFn()
      
      // Try to extract row count from result
      if (result && typeof result === 'object') {
        if ('rowCount' in result) {
          rowCount = (result as any).rowCount
        } else if ('length' in result) {
          rowCount = (result as any).length
        } else if (Array.isArray(result)) {
          rowCount = result.length
        }
      }

      this.queryCounter.inc({ operation, table, status: 'success' })
      
    } catch (err) {
      error = err instanceof Error ? err.message : String(err)
      this.queryCounter.inc({ operation, table, status: 'error' })
      throw err
    } finally {
      const endTime = performance.now()
      const duration = endTime - startTime
      const durationSeconds = duration / 1000

      // Record metrics
      this.queryDuration.observe({ operation, table }, durationSeconds)

      const metrics: QueryMetrics = {
        query: sanitizedQuery,
        duration,
        params: sanitizedParams,
        rows: rowCount,
        error,
        timestamp,
        source
      }

      // Check for slow queries
      if (duration > this.slowQueryThreshold) {
        this.slowQueryCounter.inc({ operation, table })
        this.logSlowQuery(metrics)
      }

      // Log query details if enabled
      if (this.enableDetailedLogging || error) {
        this.logQuery(metrics)
      }

      // Store in history
      this.addToHistory(metrics)
    }

    return result
  }

  /**
   * Monitor connection pool status
   */
  updateConnectionPoolMetrics(active: number, idle: number, total: number) {
    this.connectionPool.set({ status: 'active' }, active)
    this.connectionPool.set({ status: 'idle' }, idle)
    this.connectionPool.set({ status: 'total' }, total)
  }

  /**
   * Get query statistics
   */
  getQueryStats() {
    const now = Date.now()
    const last5Minutes = this.queryHistory.filter(
      q => now - q.timestamp.getTime() < 5 * 60 * 1000
    )
    const lastHour = this.queryHistory.filter(
      q => now - q.timestamp.getTime() < 60 * 60 * 1000
    )

    const slowQueries = this.queryHistory.filter(
      q => q.duration > this.slowQueryThreshold
    )

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
    }
  }

  /**
   * Get real-time metrics for dashboard
   */
  getRealTimeMetrics() {
    const registry = promClient.register
    return registry.getMetricsAsJSON()
  }

  private sanitizeQuery(query: string): string {
    // Remove sensitive patterns
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
  }

  private sanitizeParams(params?: any[]): any[] | undefined {
    if (!params) return undefined
    
    return params.map((param, index) => {
      if (typeof param === 'string' && (
        param.includes('password') ||
        param.includes('token') ||
        param.includes('secret') ||
        param.length > 50 // Likely a hash or encoded value
      )) {
        return '[REDACTED]'
      }
      return param
    })
  }

  private logQuery(metrics: QueryMetrics) {
    const logData = {
      query: metrics.query.substring(0, 200) + (metrics.query.length > 200 ? '...' : ''),
      duration: `${metrics.duration.toFixed(2)}ms`,
      rows: metrics.rows,
      source: metrics.source,
      params: metrics.params?.length || 0
    }

    if (metrics.error) {
      this.logger.error(`Query failed: ${metrics.error}`, logData)
    } else if (metrics.duration > this.slowQueryThreshold) {
      this.logger.warn(`Slow query detected`, logData)
    } else {
      this.logger.debug(`Query executed`, logData)
    }
  }

  private logSlowQuery(metrics: QueryMetrics) {
    this.logger.warn(`SLOW QUERY DETECTED`, {
      duration: `${metrics.duration.toFixed(2)}ms`,
      threshold: `${this.slowQueryThreshold}ms`,
      query: metrics.query.substring(0, 300),
      rows: metrics.rows,
      source: metrics.source,
      timestamp: metrics.timestamp.toISOString()
    })

    // In production, you might want to send this to an external monitoring service
    if (process.env.NODE_ENV === 'production') {
      this.sendSlowQueryAlert(metrics)
    }
  }

  private sendSlowQueryAlert(metrics: QueryMetrics) {
    // Implement integration with monitoring services like:
    // - Sentry
    // - DataDog
    // - New Relic
    // - Custom webhook
    
    console.log('🐌 SLOW QUERY ALERT:', {
      duration: metrics.duration,
      query: metrics.query.substring(0, 100),
      timestamp: metrics.timestamp
    })
  }

  private addToHistory(metrics: QueryMetrics) {
    this.queryHistory.push(metrics)
    
    // Keep history size manageable
    if (this.queryHistory.length > this.maxHistorySize) {
      this.queryHistory.shift()
    }
  }

  private calculateAverageDuration(queries: QueryMetrics[]): number {
    if (queries.length === 0) return 0
    const total = queries.reduce((sum, q) => sum + q.duration, 0)
    return Math.round(total / queries.length * 100) / 100
  }

  /**
   * Analyze query patterns
   */
  analyzeQueryPatterns() {
    const patterns = new Map<string, { count: number; totalDuration: number; avgDuration: number }>()
    
    this.queryHistory.forEach(query => {
      // Extract query pattern (normalize parameters)
      const pattern = this.normalizeQueryPattern(query.query)
      
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { count: 0, totalDuration: 0, avgDuration: 0 })
      }
      
      const stats = patterns.get(pattern)!
      stats.count++
      stats.totalDuration += query.duration
      stats.avgDuration = stats.totalDuration / stats.count
    })

    // Convert to array and sort by frequency
    return Array.from(patterns.entries())
      .map(([pattern, stats]) => ({ pattern, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20) // Top 20 patterns
  }

  private normalizeQueryPattern(query: string): string {
    return query
      .replace(/\$\d+/g, '$?') // Replace parameter placeholders
      .replace(/\d+/g, '?') // Replace numbers
      .replace(/'[^']*'/g, "'?'") // Replace string literals
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
      .toLowerCase()
  }
}
