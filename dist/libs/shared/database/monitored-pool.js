"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonitoredPoolClient = exports.MonitoredPool = void 0;
const pg_1 = require("pg");
class MonitoredPool extends pg_1.Pool {
    monitoring;
    constructor(config, monitoring) {
        super(config);
        this.monitoring = monitoring;
        this.on('connect', () => {
            this.updatePoolMetrics();
        });
        this.on('remove', () => {
            this.updatePoolMetrics();
        });
        this.on('error', (err) => {
            console.error('Database pool error:', err);
        });
    }
    async query(text, params) {
        const operation = this.extractOperation(text);
        const table = this.extractTable(text);
        return this.monitoring.monitorQuery(() => super.query(text, params), {
            query: text,
            params,
            operation,
            table,
            source: 'pool'
        });
    }
    async connect() {
        const client = await super.connect();
        return new MonitoredPoolClient(client, this.monitoring);
    }
    updatePoolMetrics() {
        this.monitoring.updateConnectionPoolMetrics(this.totalCount - this.idleCount, this.idleCount, this.totalCount);
    }
    extractOperation(query) {
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery.startsWith('select'))
            return 'select';
        if (normalizedQuery.startsWith('insert'))
            return 'insert';
        if (normalizedQuery.startsWith('update'))
            return 'update';
        if (normalizedQuery.startsWith('delete'))
            return 'delete';
        if (normalizedQuery.startsWith('create'))
            return 'create';
        if (normalizedQuery.startsWith('drop'))
            return 'drop';
        if (normalizedQuery.startsWith('alter'))
            return 'alter';
        return 'other';
    }
    extractTable(query) {
        const normalizedQuery = query.trim().toLowerCase();
        const patterns = [
            /from\s+([`"]?)(\w+)\1/i,
            /into\s+([`"]?)(\w+)\1/i,
            /update\s+([`"]?)(\w+)\1/i,
            /table\s+([`"]?)(\w+)\1/i
        ];
        for (const pattern of patterns) {
            const match = normalizedQuery.match(pattern);
            if (match && match[2]) {
                return match[2];
            }
        }
        return 'unknown';
    }
}
exports.MonitoredPool = MonitoredPool;
class MonitoredPoolClient {
    client;
    monitoring;
    constructor(client, monitoring) {
        this.client = client;
        this.monitoring = monitoring;
    }
    async query(text, params) {
        const operation = this.extractOperation(text);
        const table = this.extractTable(text);
        return this.monitoring.monitorQuery(() => this.client.query(text, params), {
            query: text,
            params,
            operation,
            table,
            source: 'client'
        });
    }
    release(err) {
        this.client.release(err);
    }
    extractOperation(query) {
        const normalizedQuery = query.trim().toLowerCase();
        if (normalizedQuery.startsWith('select'))
            return 'select';
        if (normalizedQuery.startsWith('insert'))
            return 'insert';
        if (normalizedQuery.startsWith('update'))
            return 'update';
        if (normalizedQuery.startsWith('delete'))
            return 'delete';
        return 'other';
    }
    extractTable(query) {
        const normalizedQuery = query.trim().toLowerCase();
        const patterns = [
            /from\s+([`"]?)(\w+)\1/i,
            /into\s+([`"]?)(\w+)\1/i,
            /update\s+([`"]?)(\w+)\1/i
        ];
        for (const pattern of patterns) {
            const match = normalizedQuery.match(pattern);
            if (match && match[2]) {
                return match[2];
            }
        }
        return 'unknown';
    }
}
exports.MonitoredPoolClient = MonitoredPoolClient;
