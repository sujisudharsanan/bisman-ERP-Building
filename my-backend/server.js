// server.js - Start Express API and optionally serve the exported Next.js app
// Build: 2025-11-26T15:07:00Z - NUCLEAR REBUILD v4
// Commit: 891a089f (Latest fix with root route handler)
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
  
  // Silence favicon & apple-touch icon 404 spam (return 204 No Content)
  app.get(['/favicon.ico','/apple-touch-icon.png','/apple-touch-icon-precomposed.png'], (req,res) => {
    res.status(204).end()
  })
  // Provide GET /auth/login info to silence browser probes
  app.get('/auth/login', (req,res) => {
    res.status(200).json({
      use: 'POST /api/auth/login',
      body: { email: 'string', password: 'string' }
    })
  })
  
  // Initialize Socket.IO with CORS - Railway only
  const io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000', // Local dev
        'https://bisman-erp-backend-production.up.railway.app' // Railway backend
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  // Initialize Task Socket handlers
  const { initializeTaskSocket } = require('./socket/taskSocket');
  initializeTaskSocket(io);
  console.log('[startup] ✅ Task Socket.IO handlers initialized');

  // Initialize Chat Socket handlers (new modular chat)
  try {
    const { initializeChatSocket } = require('./modules/chat/socket/chatSocket');
    initializeChatSocket(io);
    console.log('[startup] ✅ Chat Socket.IO handlers initialized (namespace: /chat)');
  } catch (e) {
    console.warn('[startup] ⚠️ Chat Socket.IO not initialized:', e.message);
  }

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

  // Make io available globally for task controller
  global.io = io;
  apiApp.set('io', io);
  
  console.log('[startup] ✅ Socket.IO instance made available to controllers');
  
  app.set('trust proxy', 1);
  
  // ============================================================================
  // CRITICAL: Health Check Endpoint - Must be BEFORE app.js middleware
  // ============================================================================
  // This ensures /api/health is always available even if app.js has issues
  app.get('/api/health', (req, res) => {
    const origin = req.headers.origin;
    const isProd = process.env.NODE_ENV === 'production';
    
    // Build allowed origins from environment - Railway only
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000', // Local dev
      'https://bisman-erp-backend-production.up.railway.app' // Railway backend
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
      process.env.FRONTEND_URL || 'http://localhost:3000', // Local dev
      'https://bisman-erp-backend-production.up.railway.app' // Railway backend
    ].filter(Boolean);
    
    if (origin && (allowedOrigins.includes(origin) || (!isProd && origin.startsWith('http://localhost:')))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }
    res.status(200).end();
  });

  // CRITICAL: Register root route FIRST, before mounting apiApp
  // apiApp includes notFoundHandler which will catch ALL unmatched routes including /
  // So we must register / handler BEFORE mounting apiApp
  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'BISMAN ERP Backend API',
      version: '1.0.2',  // Incremented to verify deployment
      status: 'online',
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        health: '/api/health',
        auth: '/api/auth/*',
        tasks: '/api/tasks/*',
        chat: '/api/chat/*',
        ai: '/api/langchain/*',
        calls: '/api/calls/*',
        metrics: '/metrics'
      },
      frontend: process.env.FRONTEND_URL || 'Deploy frontend separately',
      documentation: 'https://github.com/sujisudharsanan/bisman-ERP-Building',
      nextjs: handle ? 'INTEGRATED' : 'API-ONLY',
      deployment: 'railway',
      buildTime: '2025-11-26T10:25:00Z'
    });
  });
  console.log('[startup] ✅ Root route registered at /');

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

  // Root route already registered above, before apiApp was mounted
  
  if (handle) {
    // Let Next.js handle all other routes (except / which is handled above)
    app.all('*', (req, res) => {
      // Skip root path (already handled above)
      if (req.path === '/') {
        // This should never execute because app.get('/') is registered first
        return res.status(500).json({
          error: 'ROUTE_ORDER_ERROR',
          message: 'Root route handler was bypassed - Express route order issue'
        });
      }
      
      // Skip API routes (already handled by apiApp)
      if (req.path.startsWith('/api/') || req.path === '/metrics') {
        return res.status(404).json({ 
          error: 'RESOURCE_NOT_FOUND', 
          message: `Route ${req.method} ${req.path} not found` 
        });
      }
      
      // Pass everything else to Next.js
      return handle(req, res);
    });
  } else {
    // API-only mode - no Next.js catch-all needed
    // Root route already registered above
    // API routes already mounted via apiApp in app.js
    console.log('[startup] Running in API-only mode (Next.js not available)');
  }
  
  // Remove old fallback block (dead code)
  if (false) {
    // Fallback root route if Next.js is not available
    app.get('/', (_req, res) => {
      res.status(200).json({
        name: 'BISMAN ERP Backend API',
        version: '1.0.0',
        status: 'online (API-only mode)',
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
          health: '/api/health',
          auth: '/api/auth/*',
          tasks: '/api/tasks/*',
          chat: '/api/chat/*',
          ai: '/api/langchain/*',
          calls: '/api/calls/*',
          metrics: '/metrics'
        },
        note: 'Frontend not available in this deployment',
        documentation: 'https://github.com/sujisudharsanan/bisman-ERP-Building'
      });
    });
  }

  const port = process.env.PORT || 8080;
  const serverInstance = server.listen(port, '0.0.0.0', () => {
    const isProd = process.env.NODE_ENV === 'production';
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:3000', // Local dev
      'https://bisman-erp-backend-production.up.railway.app' // Railway backend
    ];
    
    console.log('\n' + '='.repeat(70));
    console.log('🚀 BISMAN ERP Backend Server Started Successfully');
    console.log('='.repeat(70));
    console.log(`� Build Version:     2025-11-26T15:07:00Z (NUCLEAR v4)`);
    console.log(`📝 Git Commit:        891a089f (Root route fix)`);
    console.log(`�📡 Server URL:        http://0.0.0.0:${port}`);
    console.log(`🏥 Health Check:      http://0.0.0.0:${port}/api/health`);
    console.log(`🔌 Socket.IO:         ENABLED (Realtime updates)`);
    console.log(`🌍 Environment:       ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
    console.log(`🔒 CORS Enabled:      YES`);
    console.log(`🌐 Allowed Origins:   ${allowedOrigins.join(', ')}`);
    console.log(`🍪 Credentials:       ENABLED (JWT/Cookies)`);
    console.log(`⚡ Next.js Frontend:  ${nextApp ? 'INTEGRATED' : 'API-ONLY MODE'}`);
    console.log(`✅ Root Route:        ${handle ? 'REGISTERED (/)' : 'API-ONLY MODE'}`);
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
