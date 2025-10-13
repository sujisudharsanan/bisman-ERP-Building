"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseMonitoringModule = void 0;
const common_1 = require("@nestjs/common");
const database_monitoring_service_1 = require("../../../libs/shared/monitoring/database-monitoring.service");
const database_monitoring_controller_1 = require("./monitoring/database-monitoring.controller");
const monitored_pool_1 = require("../../../libs/shared/database/monitored-pool");
const monitored_prisma_client_1 = require("../../../libs/shared/database/monitored-prisma.client");
let DatabaseMonitoringModule = class DatabaseMonitoringModule {
};
exports.DatabaseMonitoringModule = DatabaseMonitoringModule;
exports.DatabaseMonitoringModule = DatabaseMonitoringModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [
            database_monitoring_service_1.DatabaseMonitoringService,
            {
                provide: 'DATABASE_POOL',
                useFactory: (monitoring) => {
                    const databaseUrl = process.env.DATABASE_URL;
                    if (!databaseUrl) {
                        throw new Error('DATABASE_URL environment variable is required');
                    }
                    return new monitored_pool_1.MonitoredPool({
                        connectionString: databaseUrl,
                        max: 20,
                        idleTimeoutMillis: 30000,
                        connectionTimeoutMillis: 2000,
                        statement_timeout: 30000,
                        query_timeout: 30000,
                        application_name: 'bisman-erp-api'
                    }, monitoring);
                },
                inject: [database_monitoring_service_1.DatabaseMonitoringService]
            },
            {
                provide: 'PRISMA_CLIENT',
                useFactory: (monitoring) => {
                    return new monitored_prisma_client_1.MonitoredPrismaClient({
                        log: [
                            { level: 'query', emit: 'event' },
                            { level: 'info', emit: 'event' },
                            { level: 'warn', emit: 'event' },
                            { level: 'error', emit: 'event' }
                        ]
                    }, monitoring);
                },
                inject: [database_monitoring_service_1.DatabaseMonitoringService]
            }
        ],
        controllers: [database_monitoring_controller_1.DatabaseMonitoringController],
        exports: [database_monitoring_service_1.DatabaseMonitoringService, 'DATABASE_POOL', 'PRISMA_CLIENT']
    })
], DatabaseMonitoringModule);
