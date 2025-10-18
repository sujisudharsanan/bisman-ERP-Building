// server.js - Start Express API and optionally serve the exported Next.js app
try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');

// Load Next.js from production node_modules (not standalone)
const frontendDir = path.resolve(__dirname, 'frontend');
let next;
let nextAvailable = false;

try {
  // Use the Next.js installed in frontend/node_modules
  next = require(path.join(frontendDir, 'node_modules', 'next'));
  nextAvailable = true;
  console.log('[startup] Next.js loaded from frontend/node_modules');
} catch (e1) {
  console.warn('[startup] Next.js not available:', e1.message);
  console.warn('[startup] Proceeding with API-only server.');
}

const apiApp = require('./app');

// Next.js setup
const dev = process.env.NODE_ENV !== 'production';
const nextApp = nextAvailable ? next({ dev, dir: frontendDir }) : null;
const handle = nextApp ? nextApp.getRequestHandler() : null;

async function start() {
  // Create Express server first, before Next preparation
  const server = express();
  server.set('trust proxy', 1);
  
  // CRITICAL: Add healthcheck endpoint BEFORE mounting apiApp or Next
  // This ensures /api/health is always available even if app.js has issues
  server.get('/api/health', (_req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API routes (may have issues, but healthcheck is already registered)
  try {
    server.use(apiApp);
    console.log('[startup] API routes mounted');
  } catch (apiError) {
    console.error('[startup] Warning: API routes failed to mount:', apiError.message);
    // Continue anyway - healthcheck will still work
  }

  // Prepare Next.js if available
  if (nextApp) {
    try {
      console.log('[startup] Preparing Next.js...');
      await nextApp.prepare();
      console.log('[startup] Next.js ready');
    } catch (nextError) {
      console.error('[startup] Warning: Next.js preparation failed:', nextError.message);
      // Continue in API-only mode
    }
  }

  if (handle) {
    // Let Next handle everything else
    server.all('*', (req, res) => handle(req, res));
  } else {
    // Fallback: minimal root route for API-only mode
    server.get('/', (_req, res) => res.status(200).send('BISMAN ERP API')); 
  }

  const port = process.env.PORT || 8080;
  const serverInstance = server.listen(port, '0.0.0.0', () => {
    console.log(`[startup] ✅ Server listening on http://0.0.0.0:${port}`);
    console.log(`[startup] ✅ Healthcheck available at http://0.0.0.0:${port}/api/health`);
  });

  // Handle server errors
  serverInstance.on('error', (err) => {
    console.error('[startup] ❌ Server error:', err);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[shutdown] SIGTERM received, closing server...');
    serverInstance.close(() => {
      console.log('[shutdown] Server closed');
      process.exit(0);
    });
  });
}

start().catch(err => {
  console.error('[startup] ❌ Fatal startup error:', err);
  console.error('[startup] Stack:', err.stack);
  process.exit(1);
});
