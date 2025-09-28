import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import * as express from 'express';
import { existsSync } from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // --- Environment config ---
  const NEXT_PORT = process.env.NEXT_PORT || '3001';
  const NEXT_SERVER_ORIGIN = process.env.NEXT_SERVER_ORIGIN || `http://localhost:${NEXT_PORT}`;
  const NEXT_BUILD_PATH = path.join(__dirname, '../../my-frontend/.next');

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
    onProxyReq: (proxyReq: any, req: any, res: any) => {
      try { console.log('[PROXY REQ]', req.method, req.url); } catch (e) { /* ignore */ }
    },
    onProxyRes: (proxyRes: any, req: any, res: any) => {
      try { console.log('[PROXY RES]', req.method, req.url, proxyRes && proxyRes.statusCode); } catch (e) { /* ignore */ }
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

  // Lightweight incoming request logger
  server.use((req: any, res: any, next: any) => {
    try { console.log('[INCOMING]', req.method, req.url); } catch (e) { /* ignore */ }
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

  // Let Nest initialize controllers first so API routes are registered
  await app.init();

  // Mount proxy AFTER Nest controllers so API routes are handled first
  const dynamicProxyHandler = createProxyMiddleware({ target: proxyTarget, changeOrigin: true });
  server.use(
    ['/', '/_next', '/static'],
    (req: any, res: any, next: any) => {
      if (req.url.startsWith('/api') || req.url.startsWith('/health')) {
        return next(); // Nest handles API and health
      }
      return (dynamicProxyHandler as any)(req, res, next);
    },
  );

  // Start listening on shared port
  const port = Number(process.env.PORT || 3000);
  await new Promise<void>((resolve, reject) => {
    server.listen(port, (err?: any) => (err ? reject(err) : resolve()));
  });
  console.log(`api + frontend proxy running at http://localhost:${port} -> ${proxyTarget}`);
}

bootstrap().catch((err) => {
  console.error('bootstrap failed', err && (err.message || err));
  process.exit(1);
});
      
