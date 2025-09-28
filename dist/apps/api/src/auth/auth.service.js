"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
class AuthService {
    async getUserFromToken(authHeader) {
        if (!authHeader)
            return null;
        const token = String(authHeader).replace(/^Bearer\s+/i, '').trim();
        if (token === 'devtoken') {
            return { id: 'dev-user', username: 'dev', email: 'dev@example.local', role: 'admin' };
        }
        return null;
    }
}
exports.AuthService = AuthService;
