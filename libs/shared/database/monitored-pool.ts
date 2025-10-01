import { Pool, PoolClient, QueryResult } from 'pg'
import { DatabaseMonitoringService } from '../monitoring/database-monitoring.service'

export class MonitoredPool extends Pool {
  constructor(
    config: any,
    private monitoring: DatabaseMonitoringService
  ) {
    super(config)
    
    // Monitor connection events
    this.on('connect', () => {
      this.updatePoolMetrics()
    })
    
    this.on('remove', () => {
      this.updatePoolMetrics()
    })
    
    this.on('error', (err) => {
      console.error('Database pool error:', err)
    })
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const operation = this.extractOperation(text)
    const table = this.extractTable(text)
    
    return this.monitoring.monitorQuery(
      () => super.query(text, params),
      {
        query: text,
        params,
        operation,
        table,
        source: 'pool'
      }
    )
  }

  async connect(): Promise<MonitoredPoolClient> {
    const client = await super.connect()
    return new MonitoredPoolClient(client, this.monitoring)
  }

  private updatePoolMetrics() {
    this.monitoring.updateConnectionPoolMetrics(
      this.totalCount - this.idleCount,
      this.idleCount,
      this.totalCount
    )
  }

  private extractOperation(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.startsWith('select')) return 'select'
    if (normalizedQuery.startsWith('insert')) return 'insert'
    if (normalizedQuery.startsWith('update')) return 'update'
    if (normalizedQuery.startsWith('delete')) return 'delete'
    if (normalizedQuery.startsWith('create')) return 'create'
    if (normalizedQuery.startsWith('drop')) return 'drop'
    if (normalizedQuery.startsWith('alter')) return 'alter'
    return 'other'
  }

  private extractTable(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    
    // Simple table extraction patterns
    const patterns = [
      /from\s+([`"]?)(\w+)\1/i,
      /into\s+([`"]?)(\w+)\1/i,
      /update\s+([`"]?)(\w+)\1/i,
      /table\s+([`"]?)(\w+)\1/i
    ]
    
    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern)
      if (match && match[2]) {
        return match[2]
      }
    }
    
    return 'unknown'
  }
}

export class MonitoredPoolClient {
  constructor(
    private client: PoolClient,
    private monitoring: DatabaseMonitoringService
  ) {}

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const operation = this.extractOperation(text)
    const table = this.extractTable(text)
    
    return this.monitoring.monitorQuery(
      () => this.client.query(text, params),
      {
        query: text,
        params,
        operation,
        table,
        source: 'client'
      }
    )
  }

  release(err?: Error | boolean): void {
    this.client.release(err)
  }

  private extractOperation(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    if (normalizedQuery.startsWith('select')) return 'select'
    if (normalizedQuery.startsWith('insert')) return 'insert'
    if (normalizedQuery.startsWith('update')) return 'update'
    if (normalizedQuery.startsWith('delete')) return 'delete'
    return 'other'
  }

  private extractTable(query: string): string {
    const normalizedQuery = query.trim().toLowerCase()
    
    const patterns = [
      /from\s+([`"]?)(\w+)\1/i,
      /into\s+([`"]?)(\w+)\1/i,
      /update\s+([`"]?)(\w+)\1/i
    ]
    
    for (const pattern of patterns) {
      const match = normalizedQuery.match(pattern)
      if (match && match[2]) {
        return match[2]
      }
    }
    
    return 'unknown'
  }
}
