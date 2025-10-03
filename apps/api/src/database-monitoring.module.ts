import { Module, Global } from '@nestjs/common'
import { DatabaseMonitoringService } from '../../../libs/shared/monitoring/database-monitoring.service'
import { DatabaseMonitoringController } from './monitoring/database-monitoring.controller'
import { MonitoredPool } from '../../../libs/shared/database/monitored-pool'
import { MonitoredPrismaClient } from '../../../libs/shared/database/monitored-prisma.client'

@Global()
@Module({
  providers: [
    DatabaseMonitoringService,
    {
      provide: 'DATABASE_POOL',
      useFactory: (monitoring: DatabaseMonitoringService) => {
        const databaseUrl = process.env.DATABASE_URL
        if (!databaseUrl) {
          throw new Error('DATABASE_URL environment variable is required')
        }
        
        return new MonitoredPool({
          connectionString: databaseUrl,
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'bisman-erp-api'
        }, monitoring)
      },
      inject: [DatabaseMonitoringService]
    },
    {
      provide: 'PRISMA_CLIENT',
      useFactory: (monitoring: DatabaseMonitoringService) => {
        return new MonitoredPrismaClient({
          log: [
            { level: 'query', emit: 'event' },
            { level: 'info', emit: 'event' },
            { level: 'warn', emit: 'event' },
            { level: 'error', emit: 'event' }
          ]
        }, monitoring)
      },
      inject: [DatabaseMonitoringService]
    }
  ],
  controllers: [DatabaseMonitoringController],
  exports: [DatabaseMonitoringService, 'DATABASE_POOL', 'PRISMA_CLIENT']
})
export class DatabaseMonitoringModule {}
