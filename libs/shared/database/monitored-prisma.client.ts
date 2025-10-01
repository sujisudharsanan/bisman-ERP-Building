import { Prisma, PrismaClient } from '@prisma/client'
import { DatabaseMonitoringService } from '../monitoring/database-monitoring.service'

export class MonitoredPrismaClient extends PrismaClient {
  constructor(
    options?: Prisma.PrismaClientOptions,
    private monitoring?: DatabaseMonitoringService
  ) {
    super(options)
    
    if (monitoring) {
      this.setupQueryLogging()
    }
  }

  private setupQueryLogging() {
    // Prisma Query Event Logging
    this.$on('query', async (e: Prisma.QueryEvent) => {
      if (!this.monitoring) return

      const operation = this.extractOperationFromQuery(e.query)
      const table = this.extractTableFromQuery(e.query)
      
      // Log the query with monitoring service
      const metrics = {
        query: e.query,
        params: e.params ? JSON.parse(e.params) : undefined,
        operation,
        table,
        source: 'prisma'
      }

      // Prisma provides duration, so we can log it directly
      this.monitoring.monitorQuery(
        async () => ({ duration: e.duration, target: e.target }),
        metrics
      )
    })

    // Log Prisma info events
    this.$on('info', (e: Prisma.LogEvent) => {
      console.log(`[PRISMA INFO] ${e.message}`)
    })

    // Log Prisma warnings
    this.$on('warn', (e: Prisma.LogEvent) => {
      console.warn(`[PRISMA WARN] ${e.message}`)
    })

    // Log Prisma errors
    this.$on('error', (e: Prisma.LogEvent) => {
      console.error(`[PRISMA ERROR] ${e.message}`)
    })
  }

  private extractOperationFromQuery(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.includes('select')) return 'select'
    if (normalizedQuery.includes('insert')) return 'insert'
    if (normalizedQuery.includes('update')) return 'update'
    if (normalizedQuery.includes('delete')) return 'delete'
    return 'other'
  }

  private extractTableFromQuery(query: string): string {
    // Prisma queries often have table names in quotes
    const tableMatch = query.match(/["'](\w+)["']/g)
    if (tableMatch && tableMatch.length > 0) {
      // Get the first table name (usually the main table)
      return tableMatch[0].replace(/['"]/g, '')
    }
    return 'unknown'
  }

  /**
   * Wrapper methods for common operations with enhanced monitoring
   */
  async findManyWithMonitoring<T>(
    model: string,
    args?: any,
    context?: { operation?: string; source?: string }
  ): Promise<T[]> {
    if (!this.monitoring) {
      throw new Error('Monitoring service not available')
    }

    return this.monitoring.monitorQuery(
      async () => {
        const modelDelegate = (this as any)[model]
        if (!modelDelegate || !modelDelegate.findMany) {
          throw new Error(`Model ${model} not found or doesn't support findMany`)
        }
        return modelDelegate.findMany(args)
      },
      {
        query: `${model}.findMany`,
        params: args ? Object.keys(args) : undefined,
        operation: context?.operation || 'select',
        table: model,
        source: context?.source || 'prisma-wrapper'
      }
    )
  }

  async createWithMonitoring<T>(
    model: string,
    args: any,
    context?: { operation?: string; source?: string }
  ): Promise<T> {
    if (!this.monitoring) {
      throw new Error('Monitoring service not available')
    }

    return this.monitoring.monitorQuery(
      async () => {
        const modelDelegate = (this as any)[model]
        if (!modelDelegate || !modelDelegate.create) {
          throw new Error(`Model ${model} not found or doesn't support create`)
        }
        return modelDelegate.create(args)
      },
      {
        query: `${model}.create`,
        params: args ? Object.keys(args.data || {}) : undefined,
        operation: context?.operation || 'insert',
        table: model,
        source: context?.source || 'prisma-wrapper'
      }
    )
  }

  async updateWithMonitoring<T>(
    model: string,
    args: any,
    context?: { operation?: string; source?: string }
  ): Promise<T> {
    if (!this.monitoring) {
      throw new Error('Monitoring service not available')
    }

    return this.monitoring.monitorQuery(
      async () => {
        const modelDelegate = (this as any)[model]
        if (!modelDelegate || !modelDelegate.update) {
          throw new Error(`Model ${model} not found or doesn't support update`)
        }
        return modelDelegate.update(args)
      },
      {
        query: `${model}.update`,
        params: args ? [...Object.keys(args.where || {}), ...Object.keys(args.data || {})] : undefined,
        operation: context?.operation || 'update',
        table: model,
        source: context?.source || 'prisma-wrapper'
      }
    )
  }

  async deleteWithMonitoring<T>(
    model: string,
    args: any,
    context?: { operation?: string; source?: string }
  ): Promise<T> {
    if (!this.monitoring) {
      throw new Error('Monitoring service not available')
    }

    return this.monitoring.monitorQuery(
      async () => {
        const modelDelegate = (this as any)[model]
        if (!modelDelegate || !modelDelegate.delete) {
          throw new Error(`Model ${model} not found or doesn't support delete`)
        }
        return modelDelegate.delete(args)
      },
      {
        query: `${model}.delete`,
        params: args ? Object.keys(args.where || {}) : undefined,
        operation: context?.operation || 'delete',
        table: model,
        source: context?.source || 'prisma-wrapper'
      }
    )
  }
}
