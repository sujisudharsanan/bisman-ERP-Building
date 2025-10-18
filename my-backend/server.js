// server.js - Start Express API and optionally serve the exported Next.js app
try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
// Prefer Next from standalone runtime (smaller), fallback to full node_modules
let next;
try {
  next = require(path.resolve(__dirname, 'frontend', '.next', 'standalone', 'node_modules', 'next'));
  console.log('[startup] Using Next from standalone runtime');
} catch (e) {
  next = require(path.resolve(__dirname, 'frontend', 'node_modules', 'next'));
  console.log('[startup] Using Next from full node_modules');
}

const apiApp = require('./app');

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
// In the container, frontend lives at /app/frontend
const nextApp = next({ dev, dir: path.resolve(__dirname, 'frontend') });
const handle = nextApp.getRequestHandler();

async function start() {
  await nextApp.prepare();

  // Mount API under the same Express server
  const server = express();
  server.use(apiApp);

  // Let Next handle everything else
  server.all('*', (req, res) => handle(req, res));

  const port = process.env.PORT || 8080;
  server.listen(port, '0.0.0.0', () => {
    console.log(`[startup] API + Next listening on http://0.0.0.0:${port}`);
  });
}

start().catch(err => {
  console.error('[startup] Failed to start server:', err);
  process.exit(1);
});
