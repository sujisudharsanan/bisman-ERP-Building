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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StickyController = void 0;
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const auth_service_1 = require("../auth/auth.service");
const pg_1 = require("pg");
const memoryStore = new Map();
let StickyController = class StickyController {
    authService;
    pool = null;
    constructor(authService) {
        this.authService = authService;
        const databaseUrl = process.env.DATABASE_URL || null;
        if (databaseUrl) {
            this.pool = new pg_1.Pool({ connectionString: databaseUrl });
        }
    }
    async getUserFromRequest(req) {
        const auth = req && req.get && req.get('authorization');
        let tokenSource = auth;
        if (!tokenSource) {
            const cookieToken = req.cookies && req.cookies['token'];
            if (cookieToken)
                tokenSource = `Bearer ${cookieToken}`;
        }
        const user = await this.authService.getUserFromToken(tokenSource);
        if (!user)
            throw new common_1.UnauthorizedException('Invalid or missing token');
        const id = user.id || user.user_id || null;
        if (!id)
            throw new common_1.UnauthorizedException('Invalid user');
        return String(id);
    }
    async ensureTable(client) {
        try {
            await client.query('CREATE TABLE IF NOT EXISTS sticky_notes (user_id TEXT PRIMARY KEY, content TEXT, updated_at TIMESTAMP DEFAULT NOW())');
        }
        catch (e) {
        }
    }
    async getSticky(req) {
        const userId = await this.getUserFromRequest(req);
        if (!this.pool) {
            return { content: memoryStore.get(userId) || '' };
        }
        const client = await this.pool.connect();
        try {
            await this.ensureTable(client);
            const res = await client.query('SELECT content FROM sticky_notes WHERE user_id = $1', [userId]);
            const content = (res.rows && res.rows[0] && res.rows[0].content) || '';
            return { content };
        }
        finally {
            client.release();
        }
    }
    async putSticky(req, body) {
        const userId = await this.getUserFromRequest(req);
        const content = String(body && body.content !== undefined ? body.content : '');
        if (!this.pool) {
            memoryStore.set(userId, content);
            return { ok: true };
        }
        const client = await this.pool.connect();
        try {
            await this.ensureTable(client);
            await client.query('INSERT INTO sticky_notes (user_id, content, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (user_id) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()', [userId, content]);
            return { ok: true };
        }
        finally {
            client.release();
        }
    }
};
exports.StickyController = StickyController;
__decorate([
    (0, common_1.Get)('sticky-note'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_a = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _a : Object]),
    __metadata("design:returntype", Promise)
], StickyController.prototype, "getSticky", null);
__decorate([
    (0, common_1.Put)('sticky-note'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof express_1.Request !== "undefined" && express_1.Request) === "function" ? _b : Object, Object]),
    __metadata("design:returntype", Promise)
], StickyController.prototype, "putSticky", null);
exports.StickyController = StickyController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], StickyController);
