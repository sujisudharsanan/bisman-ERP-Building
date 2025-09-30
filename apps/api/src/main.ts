import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import * as express from 'express';
import cookieParser from 'cookie-parser';
import { existsSync } from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Environment config ---
  const NEXT_PORT = process.env.NEXT_PORT || '3001';
  const NEXT_SERVER_ORIGIN = process.env.NEXT_SERVER_ORIGIN || `http://localhost:${NEXT_PORT}`;
  // Resolve .next relative to the repository root (process.cwd()) so the
  // compiled server finds the frontend build whether running from source
  // (ts-node) or from dist (node). Using __dirname leads to wrong paths
  // when the compiled files live under dist/.
  const NEXT_BUILD_PATH = path.resolve(process.cwd(), 'my-frontend', '.next');

  // --- Robust startup: check if .next exists ---
  let proxyTarget = NEXT_SERVER_ORIGIN;
  if (!existsSync(NEXT_BUILD_PATH)) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[DEV] .next missing, proxying to Next dev on 3001');
      proxyTarget = 'http://localhost:3001';
    } else {
      console.error('[ERROR] .next build missing. Run next build first.');
      process.exit(1);
    }
  }

  // Normalize to IPv4 loopback to avoid issues when 'localhost' resolves to IPv6
  // on some systems while the Next server is listening on IPv4 only.
  try {
    proxyTarget = proxyTarget.replace('localhost', '127.0.0.1');
  } catch (e) { /* ignore */ }

  // --- CORS (development only) ---
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

  // --- Express instance for proxy + static ---
  const server = app.getHttpAdapter().getInstance();

  // --- Proxy options ---
  const proxyOptions: Options = {
    target: proxyTarget,
    changeOrigin: true,
    logLevel: 'debug',
    headers: {
      // Ensure Next sees a Host it expects; helps with generated absolute URLs
      host: new URL(proxyTarget).host,
    },
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      try { console.log('[PROXY REQ]', req.method, req.url); } catch (e) { /* ignore */ }
    },
    onProxyRes: (proxyRes: any, req: any, res: any) => {
      try { console.log('[PROXY RES]', req.method, req.url, proxyRes && proxyRes.statusCode); } catch (e) { /* ignore */ }
      // If Next issues redirects with absolute Location to proxyTarget, rewrite
      // them back to the proxy origin so the client follows relative paths.
      try {
        const loc = proxyRes && proxyRes.headers && proxyRes.headers['location'];
        if (loc && typeof loc === 'string') {
          const proxyUrl = proxyTarget.replace(/:\d+$/, '');
          // Remove absolute origin so browser requests the same origin (port 3000)
          proxyRes.headers['location'] = loc.replace(new RegExp(proxyUrl, 'g'), '');
        }
      } catch (e) { /* ignore */ }
    },
    onError: (err: any, req: any, res: any) => {
      console.error('[PROXY ERROR]', err && (err.message || err));
      if (res && typeof res.status === 'function') {
        res.status(502).send('Bad Gateway');
      } else if (res && typeof res.writeHead === 'function') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        try { res.end('Bad Gateway'); } catch (e) { /* ignore */ }
      }
    },
  };

  const frontendProxy = createProxyMiddleware(proxyOptions);

  // Ensure express can parse JSON and cookies for fallback handlers
  server.use(express.json());
  server.use(cookieParser());

  // Lightweight incoming request logger
  server.use((req: any, res: any, next: any) => {
  try { console.log(`[INCOMING][pid=${process.pid}]`, req.method, req.url); } catch (e) { /* ignore */ }
    return next();
  });

  // CORS debug: log incoming Origin and whether it would be allowed (helpful when debugging CORS rejections)
  server.use((req: any, res: any, next: any) => {
    const origin = (req.headers && req.headers.origin) || null;
    if (origin) {
      let allowed = false;
      if (process.env.NODE_ENV !== 'production') {
        allowed = devOrigins.includes(origin);
      } else {
        // in production, allow only explicit NEXT_SERVER_ORIGIN if set
        allowed = origin === NEXT_SERVER_ORIGIN;
      }
      if (!allowed) {
        console.warn('[CORS DEBUG] incoming Origin=%s allowed=%s path=%s method=%s', origin, String(allowed), req.path || req.url, req.method);
      }
    }
    return next();
  });


  // Fallback express handlers for login/logout (helpful in dev if Nest routing is bypassed)
  const makeCookieOptions = (req: any) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const hostHeader = (req && (req.hostname || (req.headers && req.headers.host))) || '';
    const isLocalHost = String(hostHeader).includes('localhost') || String(hostHeader).includes('127.0.0.1');
    // Force secure=false for localhost/127.0.0.1 or in non-production.
    const secure = Boolean(isProduction && !isLocalHost);
    return {
      httpOnly: true,
      secure,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 8 * 60 * 60 * 1000,
    };
  };

  server.post('/api/login', (req: any, res: any) => {
    // Accept any credentials in dev and set a token cookie
    try {
      res.cookie('token', 'devtoken', makeCookieOptions(req));
      return res.json({ ok: true });
    } catch (e) {
      console.error('[LOGIN FALLBACK] set-cookie failed', e && (e.message || e));
      return res.status(500).json({ ok: false });
    }
  });

  server.post('/api/logout', (req: any, res: any) => {
    // Clear cookie with the same path/options used to set it
    try {
      const opts = makeCookieOptions(req);
      // clearCookie ignores maxAge/httpOnly but path and secure are used by some clients
      res.clearCookie('token', { path: opts.path });
      return res.json({ ok: true });
    } catch (e) {
      console.error('[LOGOUT FALLBACK] clear-cookie failed', e && (e.message || e));
      return res.status(500).json({ ok: false });
    }
  });

  // Lightweight express fallback for DB health so local checks work even if
  // the Nest controllers are not the process answering the socket (helps
  // during development when dist/pm2 processes may interfere).
  server.get('/api/health/db', async (req: any, res: any) => {
    if (!process.env.DATABASE_URL) {
      return res.status(503).json({ ok: false, error: 'DATABASE_URL not configured' });
    }
    try {
      // Lazy-require pg to avoid adding a hard dependency at module load time
      // when DATABASE_URL is not configured.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Pool } = require('pg');
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      try {
        await pool.query('SELECT 1');
        res.json({ ok: true });
      } finally {
        try { await pool.end(); } catch (_) { /* ignore */ }
      }
    } catch (err: any) {
      console.warn('[DB HEALTH][fallback] check failed', err && (err.message || err));
      return res.status(503).json({ ok: false, error: (err && err.message) || String(err) });
    }
  });
  // Mount the frontend proxy BEFORE Nest initialization so it can intercept
  // requests for frontend assets and pages. The proxy will explicitly
  // filter-out API routes (/api and /health) so Nest still handles them.
  const frontendPrefixes = ['/', '/_next', '/static', '/favicon.ico', '/apple-touch-icon.png'];
  const dynamicProxyHandler = createProxyMiddleware({
    target: proxyTarget,
    changeOrigin: true,
    logLevel: 'debug',
    // preserve headers set earlier
    headers: proxyOptions.headers,
    onProxyReq: proxyOptions.onProxyReq,
    onProxyRes: proxyOptions.onProxyRes,
    onError: proxyOptions.onError,
  });

  server.use((req: any, res: any, next: any) => {
    const rawUrl: string = (req.url || '').toString();
    const pathOnly = rawUrl.split('?')[0];

    const isApi = pathOnly.startsWith('/api') || pathOnly.startsWith('/health');
    const matchesPrefix = frontendPrefixes.some((p) => {
      if (p === '/') return pathOnly === '/' || !pathOnly.startsWith('/api');
      return pathOnly === p || pathOnly.startsWith(p + '/') || pathOnly.startsWith(p + '?') || pathOnly.startsWith(p);
    });
    const shouldProxy = !isApi && matchesPrefix;

    try {
      console.log('[PROXY DECISION]', { url: rawUrl, path: pathOnly, isApi, matchesPrefix, shouldProxy });
    } catch (e) { /* ignore */ }

    if (shouldProxy) return (dynamicProxyHandler as any)(req, res, next);
    return next();
  });

  // Let Nest initialize controllers now so API routes are registered after the
  // proxy middleware is in place. The proxy will skip API routes so Nest
  // controllers still receive /api requests.
  await app.init();

  // Run an initial DB health check only when DATABASE_URL is provided. In
  // local dev it's common to not have a DB configured and attempting to
  // resolve the provider can throw inside Nest; skip in that case.
  if (process.env.DATABASE_URL) {
    try {
      // Use require() in a try/catch so TypeScript doesn't fail module resolution
      // at build time for optional runtime-only modules.
      let mod: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        mod = require('./health/db-health.service');
      } catch (_) {
        mod = null;
      }
      const DbHealthService = (mod && mod.DbHealthService) || null;
      let dbHealth: any = null;
      if (DbHealthService) {
        try {
          dbHealth = app.get(DbHealthService, { strict: false });
        } catch (_) {
          // ignore
        }
      }
      if (!dbHealth) {
        try {
          dbHealth = app.get('DbHealthService');
        } catch (_) {
          dbHealth = null;
        }
      }
      if (dbHealth && typeof dbHealth.check === 'function') {
        const ok = await dbHealth.check();
        console.log('[DB HEALTH] ok=%s', String(Boolean(ok)));
      }
    } catch (e) {
      console.warn('[DB HEALTH] check failed', e && (e.message || e));
    }
  } else {
    console.log('[DB HEALTH] skipping (DATABASE_URL not set)');
  }

  // Start listening on shared port
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  await new Promise<void>((resolve, reject) => {
    server.listen(port, host, (err?: any) => (err ? reject(err) : resolve()));
  });
  console.log(`api + frontend proxy running at http://localhost:${port} -> ${proxyTarget}`);
}

bootstrap().catch((err) => {
  console.error('bootstrap failed', err && (err.message || err));
  process.exit(1);
});
      
