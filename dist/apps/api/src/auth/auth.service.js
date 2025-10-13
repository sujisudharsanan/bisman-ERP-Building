"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const pg_1 = require("pg");
const jwt = __importStar(require("jsonwebtoken"));
const bcrypt = __importStar(require("bcryptjs"));
let AuthService = AuthService_1 = class AuthService {
    logger = new common_1.Logger(AuthService_1.name);
    pool = null;
    jwtSecret = process.env.JWT_SECRET || 'dev-secret';
    constructor() {
        const databaseUrl = process.env.DATABASE_URL || null;
        if (databaseUrl) {
            this.pool = new pg_1.Pool({ connectionString: databaseUrl });
        }
    }
    async validateUser(email, password) {
        if (!email || !password)
            return null;
        if (!this.pool) {
            return { id: 'dev-user', email: email, role: 'admin' };
        }
        const client = await this.pool.connect();
        try {
            const res = await client.query('SELECT id, email, password, role_id FROM users WHERE email = $1', [email]);
            if (!res.rows || res.rows.length === 0)
                return null;
            const row = res.rows[0];
            const hash = row.password;
            const match = await bcrypt.compare(password, hash);
            if (!match)
                return null;
            let roleName = null;
            if (row.role_id) {
                const r = await client.query('SELECT name FROM roles WHERE id = $1', [row.role_id]);
                if (r.rows && r.rows[0])
                    roleName = r.rows[0].name;
            }
            return { id: row.id, email: row.email, role: roleName };
        }
        finally {
            client.release();
        }
    }
    signToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { expiresIn: '8h' });
    }
    async getUserFromToken(authHeader) {
        if (!authHeader)
            return null;
        const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
        if (!this.pool && token === 'devtoken') {
            return { id: 'dev-user', username: 'dev', email: 'dev@example.local', role: 'admin' };
        }
        try {
            const decoded = jwt.verify(token, this.jwtSecret);
            const sub = decoded && decoded.sub;
            if (!sub)
                return null;
            if (!this.pool)
                return null;
            const client = await this.pool.connect();
            try {
                const res = await client.query('SELECT id, email, role_id FROM users WHERE id = $1', [sub]);
                if (!res.rows || res.rows.length === 0)
                    return null;
                const row = res.rows[0];
                let roleName = null;
                if (row.role_id) {
                    const r = await client.query('SELECT name FROM roles WHERE id = $1', [row.role_id]);
                    if (r.rows && r.rows[0])
                        roleName = r.rows[0].name;
                }
                return { id: row.id, email: row.email, role: roleName };
            }
            finally {
                client.release();
            }
        }
        catch (e) {
            this.logger.debug('token verify failed', e && e.message);
            return null;
        }
    }
    async closePool() {
        if (this.pool) {
            try {
                await this.pool.end();
            }
            catch (e) { }
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], AuthService);
