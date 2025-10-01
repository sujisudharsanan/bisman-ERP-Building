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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const express = __importStar(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const NEXT_PORT = process.env.NEXT_PORT || '3001';
    const NEXT_SERVER_ORIGIN = process.env.NEXT_SERVER_ORIGIN || `http://localhost:${NEXT_PORT}`;
    const NEXT_BUILD_PATH = path.resolve(process.cwd(), 'my-frontend', '.next');
    let proxyTarget = NEXT_SERVER_ORIGIN;
    if (!(0, fs_1.existsSync)(NEXT_BUILD_PATH)) {
        if (process.env.NODE_ENV === 'development') {
            console.warn('[DEV] .next missing, proxying to Next dev on 3001');
            proxyTarget = 'http://localhost:3001';
        }
        else {
            console.error('[ERROR] .next build missing. Run next build first.');
            process.exit(1);
        }
    }
    try {
        proxyTarget = proxyTarget.replace('localhost', '127.0.0.1');
    }
    catch (e) { }
    const devOrigins = [
        `http://localhost:${NEXT_PORT}`,
        `http://127.0.0.1:${NEXT_PORT}`,
    ];
    if (process.env.NODE_ENV === 'development') {
        app.enableCors({
            origin: devOrigins,
            credentials: true,
        });
    }
    const server = app.getHttpAdapter().getInstance();
    const proxyOptions = {
        target: proxyTarget,
        changeOrigin: true,
        logLevel: 'debug',
        headers: {
            host: new URL(proxyTarget).host,
        },
        onProxyReq: (proxyReq, req, res) => {
            try {
                console.log('[PROXY REQ]', req.method, req.url);
            }
            catch (e) { }
        },
        onProxyRes: (proxyRes, req, res) => {
            try {
                console.log('[PROXY RES]', req.method, req.url, proxyRes && proxyRes.statusCode);
            }
            catch (e) { }
            try {
                const loc = proxyRes && proxyRes.headers && proxyRes.headers['location'];
                if (loc && typeof loc === 'string') {
                    const proxyUrl = proxyTarget.replace(/:\d+$/, '');
                    proxyRes.headers['location'] = loc.replace(new RegExp(proxyUrl, 'g'), '');
                }
            }
            catch (e) { }
        },
        onError: (err, req, res) => {
            console.error('[PROXY ERROR]', err && (err.message || err));
            if (res && typeof res.status === 'function') {
                res.status(502).send('Bad Gateway');
            }
            else if (res && typeof res.writeHead === 'function') {
                res.writeHead(502, { 'Content-Type': 'text/plain' });
                try {
                    res.end('Bad Gateway');
                }
                catch (e) { }
            }
        },
    };
    const frontendProxy = (0, http_proxy_middleware_1.createProxyMiddleware)(proxyOptions);
    server.use(express.json());
    server.use((0, cookie_parser_1.default)());
    server.use((req, res, next) => {
        try {
            console.log(`[INCOMING][pid=${process.pid}]`, req.method, req.url);
        }
        catch (e) { }
        return next();
    });
    server.use((req, res, next) => {
        const origin = (req.headers && req.headers.origin) || null;
        if (origin) {
            let allowed = false;
            if (process.env.NODE_ENV !== 'production') {
                allowed = devOrigins.includes(origin);
            }
            else {
                allowed = origin === NEXT_SERVER_ORIGIN;
            }
            if (!allowed) {
                console.warn('[CORS DEBUG] incoming Origin=%s allowed=%s path=%s method=%s', origin, String(allowed), req.path || req.url, req.method);
            }
        }
        return next();
    });
    const makeCookieOptions = (req) => {
        const isProduction = process.env.NODE_ENV === 'production';
        const hostHeader = (req && (req.hostname || (req.headers && req.headers.host))) || '';
        const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1');
        const secure = Boolean(isProduction && !isLocalHost);
        return {
            httpOnly: true,
            secure,
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60 * 1000,
        };
    };
    server.post('/api/login', (req, res) => {
        try {
            res.cookie('token', 'devtoken', makeCookieOptions(req));
            return res.json({ ok: true });
        }
        catch (e) {
            console.error('[LOGIN FALLBACK] set-cookie failed', e && (e.message || e));
            return res.status(500).json({ ok: false });
        }
    });
    server.post('/api/logout', (req, res) => {
        try {
            const opts = makeCookieOptions(req);
            res.clearCookie('token', { path: opts.path });
            return res.json({ ok: true });
        }
        catch (e) {
            console.error('[LOGOUT FALLBACK] clear-cookie failed', e && (e.message || e));
            return res.status(500).json({ ok: false });
        }
    });
    server.get('/api/health/db', async (req, res) => {
        if (!process.env.DATABASE_URL) {
            return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured' });
        }
        try {
            const { Pool } = require('pg');
            const pool = new Pool({ connectionString: process.env.DATABASE_URL });
            try {
                await pool.query('SELECT 1');
                res.json({ ok: true });
            }
            finally {
                try {
                    await pool.end();
                }
                catch (_) { }
            }
        }
        catch (err) {
            console.warn('[DB HEALTH][fallback] check failed', err && (err.message || err));
            return res.status(503).json({ ok: false, error: (err && err.message) || String(err) });
        }
    });
    const frontendPrefixes = ['/', '/_next', '/static', '/favicon.ico', '/apple-touch-icon.png'];
    const dynamicProxyHandler = (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: proxyTarget,
        changeOrigin: true,
        logLevel: 'debug',
        headers: proxyOptions.headers,
        onProxyReq: proxyOptions.onProxyReq,
        onProxyRes: proxyOptions.onProxyRes,
        onError: proxyOptions.onError,
    });
    server.use((req, res, next) => {
        const rawUrl = (req.url || '').toString();
        const pathOnly = rawUrl.split('?')[0];
        const isApi = pathOnly.startsWith('/api') || pathOnly.startsWith('/health');
        const matchesPrefix = frontendPrefixes.some((p) => {
            if (p === '/')
                return pathOnly === '/' || !pathOnly.startsWith('/api');
            return pathOnly === p || pathOnly.startsWith(p + '/') || pathOnly.startsWith(p + '?') || pathOnly.startsWith(p);
        });
        const shouldProxy = !isApi && matchesPrefix;
        try {
            console.log('[PROXY DECISION]', { url: rawUrl, path: pathOnly, isApi, matchesPrefix, shouldProxy });
        }
        catch (e) { }
        if (shouldProxy)
            return dynamicProxyHandler(req, res, next);
        return next();
    });
    await app.init();
    if (process.env.DATABASE_URL) {
        try {
            let mod = null;
            try {
                mod = require('./health/db-health.service');
            }
            catch (_) {
                mod = null;
            }
            const DbHealthService = (mod && mod.DbHealthService) || null;
            let dbHealth = null;
            if (DbHealthService) {
                try {
                    dbHealth = app.get(DbHealthService, { strict: false });
                }
                catch (_) {
                }
            }
            if (!dbHealth) {
                try {
                    dbHealth = app.get('DbHealthService');
                }
                catch (_) {
                    dbHealth = null;
                }
            }
            if (dbHealth && typeof dbHealth.check === 'function') {
                const ok = await dbHealth.check();
                console.log('[DB HEALTH] ok=%s', String(Boolean(ok)));
            }
        }
        catch (e) {
            console.warn('[DB HEALTH] check failed', e && (e.message || e));
        }
    }
    else {
        console.log('[DB HEALTH] skipping (DATABASE_URL not set)');
    }
    const port = Number(process.env.PORT || 3000);
    const host = process.env.HOST || '0.0.0.0';
    await new Promise((resolve, reject) => {
        server.listen(port, host, (err) => (err ? reject(err) : resolve()));
    });
    console.log(`api + frontend proxy running at http://localhost:${port} -> ${proxyTarget}`);
}
bootstrap().catch((err) => {
    console.error('bootstrap failed', err && (err.message || err));
    process.exit(1);
});
