// server.js - Start Express API and optionally serve the exported Next.js app
try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
// Try to load Next from standalone runtime (preferred). If unavailable, attempt full node_modules.
let next;
let nextAvailable = false;
try {
  next = require(path.resolve(__dirname, 'frontend', '.next', 'standalone', 'node_modules', 'next'));
  nextAvailable = true;
  console.log('[startup] Using Next from standalone runtime');
} catch (e1) {
  try {
    next = require(path.resolve(__dirname, 'frontend', 'node_modules', 'next'));
    nextAvailable = true;
    console.log('[startup] Using Next from full node_modules');
  } catch (e2) {
    console.warn('[startup] Next not available; proceeding with API-only server.');
  }
}

const apiApp = require('./app');

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
// In the container, frontend lives at /app/frontend
const frontendDir = path.resolve(__dirname, 'frontend');
const nextApp = nextAvailable ? next({ dev, dir: frontendDir }) : null;
const handle = nextApp ? nextApp.getRequestHandler() : null;

async function start() {
  if (nextApp) {
    await nextApp.prepare();
  }

  // Mount API under the same Express server
  const server = express();
  server.set('trust proxy', 1);
  server.use(apiApp);

  // Simple built-in healthcheck (independent of Next) to satisfy platform checks
  server.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  if (handle) {
    // Let Next handle everything else
    server.all('*', (req, res) => handle(req, res));
  } else {
    // Fallback: minimal root route for API-only mode
    server.get('/', (_req, res) => res.status(200).send('BISMAN ERP API')); 
  }

  const port = process.env.PORT || 8080;
  server.listen(port, '0.0.0.0', () => {
    console.log(`[startup] API + Next listening on http://0.0.0.0:${port}`);
  });
}

start().catch(err => {
  console.error('[startup] Failed to start server:', err);
  process.exit(1);
});
