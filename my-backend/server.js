// server.js - Start Express API and optionally serve the exported Next.js app
try { require('dotenv').config(); } catch (_) {}

const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

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
  const app = express();
  const server = http.createServer(app);
  
  // Initialize Socket.IO with CORS
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        process.env.PRODUCTION_URL || 'https://bisman.erp',
        'https://bisman-erp-frontend.vercel.app',
        'https://bisman-erp-frontend-production.up.railway.app',
        'https://bisman-erp-backend-production.up.railway.app'
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO connection handler
  io.on('connection', (socket) => {
    console.log('[socket.io] Client connected:', socket.id);
    
    // Send welcome message
    socket.emit('connected', { 
      message: 'Connected to BISMAN ERP realtime server',
      socketId: socket.id 
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log('[socket.io] Client disconnected:', socket.id, '- Reason:', reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error('[socket.io] Socket error:', socket.id, error);
    });
  });

  // Inject Socket.IO into task routes
  try {
    const { setIO } = require('./routes/taskRoutes');
    setIO(io);
    console.log('[startup] ✅ Socket.IO integrated with task routes');
  } catch (err) {
    console.warn('[startup] Warning: Task routes not found, Socket.IO not injected');
  }
  
  app.set('trust proxy', 1);
  
  // ============================================================================
  // CRITICAL: Health Check Endpoint - Must be BEFORE app.js middleware
  // ============================================================================
  // This ensures /api/health is always available even if app.js has issues
  app.get('/api/health', (req, res) => {
    const origin = req.headers.origin;
    const isProd = process.env.NODE_ENV === 'production';
    
    // Build allowed origins from environment
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      process.env.PRODUCTION_URL || 'https://bisman.erp',
      'https://bisman-erp-frontend.vercel.app',
      'https://bisman-erp-frontend-production.up.railway.app',
      'https://bisman-erp-backend-production.up.railway.app'
    ].filter(Boolean);
    
    // Set CORS headers explicitly (this endpoint bypasses app.js CORS)
    if (origin) {
      if (allowedOrigins.includes(origin) || (!isProd && origin.startsWith('http://localhost:'))) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      }
    }
    
    // Return health status with environment info
    res.status(200).json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      environment: isProd ? 'production' : 'development',
      version: '1.0.0'
    });
  });
  
  // Handle OPTIONS preflight for /api/health
  app.options('/api/health', (req, res) => {
    const origin = req.headers.origin;
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:3001',
      process.env.PRODUCTION_URL || 'https://bisman.erp',
      'https://bisman-erp-frontend.vercel.app',
      'https://bisman-erp-frontend-production.up.railway.app',
      'https://bisman-erp-backend-production.up.railway.app'
    ].filter(Boolean);
    
    if (origin && (allowedOrigins.includes(origin) || (!isProd && origin.startsWith('http://localhost:')))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    res.status(200).end();
  });

  // Mount API routes (may have issues, but healthcheck is already registered)
  try {
    app.use(apiApp);
    console.log('[startup] API routes mounted');
  } catch (apiError) {
    console.error('[startup] Warning: API routes failed to mount:', apiError.message);
    // Continue anyway - healthcheck will still work
  }

  // Initialize AI Analytics Cron Jobs
  try {
    const aiCron = require('./cron/aiAnalyticsJob');
    console.log('[startup] ✅ AI Analytics cron jobs initialized');
  } catch (cronError) {
    console.warn('[startup] AI cron jobs not initialized:', cronError.message);
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
    app.all('*', (req, res) => handle(req, res));
  } else {
    // Fallback: minimal root route for API-only mode
    app.get('/', (_req, res) => res.status(200).send('BISMAN ERP API')); 
  }

  const port = process.env.PORT || 8080;
  const serverInstance = server.listen(port, '0.0.0.0', () => {
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      process.env.PRODUCTION_URL || 'https://bisman.erp'
    ];
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 BISMAN ERP Backend Server Started Successfully');
    console.log('='.repeat(70));
    console.log(`📡 Server URL:        http://0.0.0.0:${port}`);
    console.log(`🏥 Health Check:      http://0.0.0.0:${port}/api/health`);
    console.log(`🔌 Socket.IO:         ENABLED (Realtime updates)`);
    console.log(`🌍 Environment:       ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🔒 CORS Enabled:      YES`);
    console.log(`🌐 Allowed Origins:   ${allowedOrigins.join(', ')}`);
    console.log(`🍪 Credentials:       ENABLED (JWT/Cookies)`);
    console.log(`⚡ Next.js Frontend:  ${nextApp ? 'INTEGRATED' : 'API-ONLY MODE'}`);
    console.log('='.repeat(70) + '\n');
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
