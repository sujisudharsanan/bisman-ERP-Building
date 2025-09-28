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
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const fs_1 = require("fs");
const path = __importStar(require("path"));
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const NEXT_PORT = process.env.NEXT_PORT || '3001';
    const NEXT_SERVER_ORIGIN = process.env.NEXT_SERVER_ORIGIN || `http://localhost:${NEXT_PORT}`;
    const NEXT_BUILD_PATH = path.join(__dirname, '../../my-frontend/.next');
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
    server.use((req, res, next) => {
        try {
            console.log('[INCOMING]', req.method, req.url);
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
    await app.init();
    const dynamicProxyHandler = (0, http_proxy_middleware_1.createProxyMiddleware)({ target: proxyTarget, changeOrigin: true });
    server.use(['/', '/_next', '/static'], (req, res, next) => {
        if (req.url.startsWith('/api') || req.url.startsWith('/health')) {
            return next();
        }
        return dynamicProxyHandler(req, res, next);
    });
    const port = Number(process.env.PORT || 3000);
    await new Promise((resolve, reject) => {
        server.listen(port, (err) => (err ? reject(err) : resolve()));
    });
    console.log(`api + frontend proxy running at http://localhost:${port} -> ${proxyTarget}`);
}
bootstrap().catch((err) => {
    console.error('bootstrap failed', err && (err.message || err));
    process.exit(1);
});
