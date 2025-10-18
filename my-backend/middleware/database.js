const { Pool } = require('pg')

// Simple query monitoring for Express backend
class QueryMonitor {
  constructor() {
    this.queries = []
    this.maxHistory = 1000
    this.slowQueryThreshold = parseInt(process.env.SLOW_QUERY_THRESHOLD_MS || '1000')
  }

  logQuery(query, params, duration, error = null, rowCount = null) {
    const queryLog = {
      query: this.sanitizeQuery(query),
      params: this.sanitizeParams(params),
      duration,
      error,
      rowCount,
      timestamp: new Date(),
      slow: duration > this.slowQueryThreshold
    }

    this.queries.push(queryLog)
    
    // Keep history manageable
    if (this.queries.length > this.maxHistory) {
      this.queries.shift()
    }

    // Log slow queries
    if (queryLog.slow) {
      console.warn(`🐌 SLOW QUERY (${duration}ms):`, {
        query: query.substring(0, 100) + '...',
        duration: `${duration}ms`,
        params: params?.length || 0
      })
    }

    // Log errors
    if (error) {
      console.error(`❌ QUERY ERROR:`, {
        query: query.substring(0, 100) + '...',
        error: error.message,
        duration: `${duration}ms`
      })
    }

    // Log debug info in development
    if (process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true') {
      console.log(`🔍 QUERY (${duration}ms):`, {
        query: query.substring(0, 150) + '...',
        params: params?.length || 0,
        rows: rowCount
      })
    }
  }

  sanitizeQuery(query) {
    return query
      .replace(/password\s*=\s*'[^']*'/gi, "password = '[REDACTED]'")
      .replace(/token\s*=\s*'[^']*'/gi, "token = '[REDACTED]'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret = '[REDACTED]'")
  }

  sanitizeParams(params) {
    if (!params) return undefined
    return params.map(param => {
      if (typeof param === 'string' && (
        param.includes('password') ||
        param.includes('token') ||
        param.length > 50
      )) {
        return '[REDACTED]'
      }
      return param
    })
  }

  getStats() {
    const now = Date.now()
    const last5Minutes = this.queries.filter(q => now - q.timestamp.getTime() < 5 * 60 * 1000)
    const slowQueries = this.queries.filter(q => q.slow)
    const errors = this.queries.filter(q => q.error)

    return {
      total: this.queries.length,
      last5Minutes: last5Minutes.length,
      slowQueries: slowQueries.length,
      errors: errors.length,
      averageDuration: this.calculateAverage(this.queries.map(q => q.duration)),
      slowQueryThreshold: this.slowQueryThreshold,
      recentSlowQueries: slowQueries
        .slice(-10)
        .map(q => ({
          query: q.query.substring(0, 100) + '...',
          duration: q.duration,
          timestamp: q.timestamp
        }))
    }
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0
    return Math.round(numbers.reduce((sum, num) => sum + num, 0) / numbers.length)
  }
}

// Global query monitor instance
const queryMonitor = new QueryMonitor()

// Secure database configuration
const createSecurePool = (databaseUrl) => {
  const useSsl = (process.env.NODE_ENV === 'production') || (process.env.PGSSLMODE === 'require')
  const pool = new Pool({
    connectionString: databaseUrl,
    // Keep connection usage modest to avoid exhausting Railway free-tier limits
    max: 5,                    // limit concurrent connections
    idleTimeoutMillis: 10000,  // close idle clients after 10s
    connectionTimeoutMillis: 5000, // fail fast if cannot connect
    statement_timeout: 30000,
    query_timeout: 30000,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    application_name: 'bisman-erp'
  })

  // Basic pool-level monitoring
  pool.on('error', (err) => {
    console.error('🧨 PG Pool error (unexpected idle client error):', err.message)
  })

  // Graceful shutdown: close pool on process termination
  if (!pool._shutdownRegistered) {
    pool._shutdownRegistered = true
    let closed = false
    const shutdown = async (signal) => {
      if (closed) return
      closed = true
      try {
        await pool.end()
        console.log(`[db] Connection pool closed (${signal})`)
      } catch (e) {
        console.error('[db] Error closing pool:', e && e.message)
      } finally {
        if (signal === 'SIGINT' || signal === 'SIGTERM') process.exit(0)
      }
    }
    process.on('SIGINT', () => shutdown('SIGINT'))
    process.on('SIGTERM', () => shutdown('SIGTERM'))
  }

  // Override pool.query to add monitoring
  const originalQuery = pool.query.bind(pool)
  pool.query = async function(text, params) {
    const start = Date.now()
    let result, error
    
    try {
      result = await originalQuery(text, params)
      const duration = Date.now() - start
      queryMonitor.logQuery(text, params, duration, null, result.rowCount)
      return result
    } catch (err) {
      const duration = Date.now() - start
      error = err
      queryMonitor.logQuery(text, params, duration, err)
      throw err
    }
  }

  return pool
}

// Secure query wrapper with parameter validation
const executeQuery = async (pool, query, params = []) => {
  const start = Date.now()
  
  try {
    // Basic SQL injection prevention
    if (params.some(param => typeof param === 'string' && param.includes('--'))) {
      throw new Error('Potentially malicious SQL detected')
    }
    
    const result = await pool.query(query, params)
    const duration = Date.now() - start
    
    queryMonitor.logQuery(query, params, duration, null, result.rowCount)
    return result
  } catch (error) {
    const duration = Date.now() - start
    queryMonitor.logQuery(query, params, duration, error)
    throw error
  }
}

module.exports = {
  createSecurePool,
  executeQuery,
  queryMonitor
}
