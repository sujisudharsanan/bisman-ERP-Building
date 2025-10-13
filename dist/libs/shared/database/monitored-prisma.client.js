"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoredPrismaClient = void 0;
const client_1 = require("@prisma/client");
class MonitoredPrismaClient extends client_1.PrismaClient {
    monitoring;
    constructor(options, monitoring) {
        super(options);
        this.monitoring = monitoring;
        if (monitoring) {
            this.setupQueryLogging();
        }
    }
    setupQueryLogging() {
        this.$on('query', async (e) => {
            if (!this.monitoring)
                return;
            const operation = this.extractOperationFromQuery(e.query);
            const table = this.extractTableFromQuery(e.query);
            const metrics = {
                query: e.query,
                params: e.params ? JSON.parse(e.params) : undefined,
                operation,
                table,
                source: 'prisma'
            };
            this.monitoring.monitorQuery(async () => ({ duration: e.duration, target: e.target }), metrics);
        });
        this.$on('info', (e) => {
            console.log(`[PRISMA INFO] ${e.message}`);
        });
        this.$on('warn', (e) => {
            console.warn(`[PRISMA WARN] ${e.message}`);
        });
        this.$on('error', (e) => {
            console.error(`[PRISMA ERROR] ${e.message}`);
        });
    }
    extractOperationFromQuery(query) {
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery.includes('select'))
            return 'select';
        if (normalizedQuery.includes('insert'))
            return 'insert';
        if (normalizedQuery.includes('update'))
            return 'update';
        if (normalizedQuery.includes('delete'))
            return 'delete';
        return 'other';
    }
    extractTableFromQuery(query) {
        const tableMatch = query.match(/["'](\w+)["']/g);
        if (tableMatch && tableMatch.length > 0) {
            return tableMatch[0].replace(/['"]/g, '');
        }
        return 'unknown';
    }
    async findManyWithMonitoring(model, args, context) {
        if (!this.monitoring) {
            throw new Error('Monitoring service not available');
        }
        return this.monitoring.monitorQuery(async () => {
            const modelDelegate = this[model];
            if (!modelDelegate || !modelDelegate.findMany) {
                throw new Error(`Model ${model} not found or doesn't support findMany`);
            }
            return modelDelegate.findMany(args);
        }, {
            query: `${model}.findMany`,
            params: args ? Object.keys(args) : undefined,
            operation: context?.operation || 'select',
            table: model,
            source: context?.source || 'prisma-wrapper'
        });
    }
    async createWithMonitoring(model, args, context) {
        if (!this.monitoring) {
            throw new Error('Monitoring service not available');
        }
        return this.monitoring.monitorQuery(async () => {
            const modelDelegate = this[model];
            if (!modelDelegate || !modelDelegate.create) {
                throw new Error(`Model ${model} not found or doesn't support create`);
            }
            return modelDelegate.create(args);
        }, {
            query: `${model}.create`,
            params: args ? Object.keys(args.data || {}) : undefined,
            operation: context?.operation || 'insert',
            table: model,
            source: context?.source || 'prisma-wrapper'
        });
    }
    async updateWithMonitoring(model, args, context) {
        if (!this.monitoring) {
            throw new Error('Monitoring service not available');
        }
        return this.monitoring.monitorQuery(async () => {
            const modelDelegate = this[model];
            if (!modelDelegate || !modelDelegate.update) {
                throw new Error(`Model ${model} not found or doesn't support update`);
            }
            return modelDelegate.update(args);
        }, {
            query: `${model}.update`,
            params: args ? [...Object.keys(args.where || {}), ...Object.keys(args.data || {})] : undefined,
            operation: context?.operation || 'update',
            table: model,
            source: context?.source || 'prisma-wrapper'
        });
    }
    async deleteWithMonitoring(model, args, context) {
        if (!this.monitoring) {
            throw new Error('Monitoring service not available');
        }
        return this.monitoring.monitorQuery(async () => {
            const modelDelegate = this[model];
            if (!modelDelegate || !modelDelegate.delete) {
                throw new Error(`Model ${model} not found or doesn't support delete`);
            }
            return modelDelegate.delete(args);
        }, {
            query: `${model}.delete`,
            params: args ? Object.keys(args.where || {}) : undefined,
            operation: context?.operation || 'delete',
            table: model,
            source: context?.source || 'prisma-wrapper'
        });
    }
}
exports.MonitoredPrismaClient = MonitoredPrismaClient;
