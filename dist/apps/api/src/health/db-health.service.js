"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DbHealthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DbHealthService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
let DbHealthService = DbHealthService_1 = class DbHealthService {
    logger = new common_1.Logger(DbHealthService_1.name);
    pool = null;
    constructor() {
        const databaseUrl = process.env.DATABASE_URL || null;
        if (!databaseUrl) {
            return;
        }
        this.pool = new pg_1.Pool({ connectionString: databaseUrl });
    }
    async check() {
        if (!this.pool)
            return false;
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT 1 as ok');
            return res.rows && res.rows[0] && res.rows[0].ok === 1;
        }
        finally {
            client.release();
        }
    }
    async close() {
        if (this.pool) {
            try {
                await this.pool.end();
            }
            catch (e) { }
        }
    }
};
exports.DbHealthService = DbHealthService;
exports.DbHealthService = DbHealthService = DbHealthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], DbHealthService);
