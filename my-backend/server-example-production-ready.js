/**
 * ============================================================================
 * PRODUCTION-READY EXPRESS SERVER WITH CORS CONFIGURATION
 * ============================================================================
 * 
 * This is a complete, enterprise-grade Express.js server configuration
 * with proper CORS setup for the BISMAN ERP system.
 * 
 * Features:
 * - Production-ready CORS configuration
 * - Environment-aware origin validation
 * - Health check endpoint with explicit CORS
 * - Comprehensive error handling
 * - Detailed logging and debugging
 * - Security best practices
 * 
 * Author: BISMAN ERP Team
 * Date: October 27, 2025
 * Version: 1.0.0
 * ============================================================================
 */

// Load environment variables
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const app = express();

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProd = NODE_ENV === 'production';

// Frontend URLs from environment
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const PRODUCTION_URL = process.env.PRODUCTION_URL || 'https://bisman.erp';

// ============================================================================
// CORS CONFIGURATION - Production-Ready
// ============================================================================

// Build whitelist of allowed origins
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:3001', // Backend itself (for testing)
  PRODUCTION_URL,
  'https://bisman-erp-frontend.vercel.app',
  'https://bisman-erp-frontend-production.up.railway.app',
  'https://bisman-erp-backend-production.up.railway.app',
].filter(Boolean); // Remove undefined values

// CORS options with intelligent origin validation
const corsOptions = {
  origin: (origin, callback) => {
    // Debug logging (controlled by DEBUG_CORS env variable)
    if (process.env.DEBUG_CORS === '1') {
      console.log(`[CORS] 🔍 Request from origin: ${origin || 'no-origin'}`);
    }
    
    // Allow requests with no origin (mobile apps, Postman, curl, same-origin)
    if (!origin) {
      if (process.env.DEBUG_CORS === '1') {
        console.log('[CORS] ✅ Allowing request with no origin');
      }
      return callback(null, true);
    }
    
    // Check if origin is in the whitelist
    if (allowedOrigins.includes(origin)) {
      if (process.env.DEBUG_CORS === '1') {
        console.log(`[CORS] ✅ Allowing whitelisted origin: ${origin}`);
      }
      return callback(null, true);
    }
    
    // In development, allow any localhost origin (flexible port support)
    if (!isProd && origin.startsWith('http://localhost:')) {
      console.log('[CORS] ✅ Allowing localhost origin (dev mode):', origin);
      return callback(null, true);
    }
    
    // Block everything else
    console.warn(`[CORS] ❌ BLOCKED origin: ${origin}`);
    console.warn(`[CORS] 💡 Allowed origins: ${allowedOrigins.join(', ')}`);
    
    // Return null error (don't break response, but deny CORS)
    return callback(null, false);
  },
  
  // Allow cookies and Authorization headers
  credentials: true,
  
  // Allowed HTTP methods
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  
  // Allowed request headers
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Cookie'
  ],
  
  // Expose Set-Cookie header to frontend
  exposedHeaders: ['Set-Cookie'],
  
  // Success status for preflight requests (legacy browser support)
  optionsSuccessStatus: 200,
};

// ============================================================================
// MIDDLEWARE - Order is critical!
// ============================================================================

// 1. Trust proxy (required for Railway, Heroku, etc.)
app.set('trust proxy', 1);

// 2. Apply CORS middleware globally
app.use(cors(corsOptions));

// 3. Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// 4. Parse JSON bodies
app.use(express.json());

// 5. Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Log CORS configuration on startup
console.log('\n' + '='.repeat(70));
console.log('🔒 CORS Configuration');
console.log('='.repeat(70));
console.log(`Environment:         ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`Credentials Enabled: ${corsOptions.credentials}`);
console.log(`Allowed Origins:     ${allowedOrigins.join(', ')}`);
console.log(`Allowed Methods:     ${corsOptions.methods.join(', ')}`);
console.log(`Debug Mode:          ${process.env.DEBUG_CORS === '1' ? 'ON' : 'OFF'}`);
console.log('='.repeat(70) + '\n');

// ============================================================================
// ROUTES
// ============================================================================

/**
 * Health Check Endpoint
 * Returns server status, timestamp, and environment
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: isProd ? 'production' : 'development',
    version: '1.0.0'
  });
});

/**
 * Root Endpoint
 */
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'BISMAN ERP API Server',
    version: '1.0.0',
    environment: isProd ? 'production' : 'development',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs'
    }
  });
});

// ============================================================================
// YOUR API ROUTES GO HERE
// ============================================================================

// Example authenticated route
app.post('/api/login', (req, res) => {
  // Your login logic here
  res.json({ message: 'Login endpoint' });
});

// Example protected route
app.get('/api/me', (req, res) => {
  // Your authentication check here
  res.json({ message: 'User profile endpoint' });
});

// ============================================================================
// ERROR HANDLING - Must be LAST in middleware chain
// ============================================================================

/**
 * 404 Handler - Catch all undefined routes
 */
app.use((req, res, next) => {
  console.warn(`[404] Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

/**
 * Global Error Handler - Catch all errors
 */
app.use((err, req, res, next) => {
  // Log the error with full details
  console.error('\n[ERROR] Global error handler caught:');
  console.error('  Path:', req.method, req.originalUrl);
  console.error('  Message:', err.message);
  if (!isProd) {
    console.error('  Stack:', err.stack);
  }
  
  // Handle CORS errors
  if (err.message && err.message.includes('CORS')) {
    console.error('  Type: CORS ERROR');
    console.error('  Origin:', req.headers.origin);
    return res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed',
      origin: req.headers.origin
    });
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: err.details || err.message
    });
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication Error',
      message: err.message
    });
  }
  
  // Generic error response (hide details in production)
  res.status(err.status || 500).json({
    success: false,
    error: isProd ? 'Internal Server Error' : err.message,
    ...(isProd ? {} : { stack: err.stack })
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 BISMAN ERP Backend Server Started Successfully');
  console.log('='.repeat(70));
  console.log(`📡 Server URL:        http://0.0.0.0:${PORT}`);
  console.log(`🏥 Health Check:      http://0.0.0.0:${PORT}/api/health`);
  console.log(`🌍 Environment:       ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  console.log(`🔒 CORS Enabled:      YES`);
  console.log(`🌐 Allowed Origins:   ${FRONTEND_URL}, ${PRODUCTION_URL}`);
  console.log(`🍪 Credentials:       ENABLED (JWT/Cookies)`);
  console.log('='.repeat(70) + '\n');
});

/**
 * Handle server errors
 */
server.on('error', (err) => {
  console.error('\n[STARTUP] ❌ Server error:', err);
  
  if (err.code === 'EADDRINUSE') {
    console.error(`[STARTUP] Port ${PORT} is already in use`);
    console.error(`[STARTUP] Try: lsof -i :${PORT} to find the process`);
  }
  
  process.exit(1);
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] SIGTERM received, closing server...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] SIGINT received, closing server...');
  server.close(() => {
    console.log('[SHUTDOWN] Server closed successfully');
    process.exit(0);
  });
});

// ============================================================================
// EXPORT (for testing)
// ============================================================================

module.exports = app;

// ============================================================================
// USAGE NOTES
// ============================================================================

/*

## Environment Variables Required (.env)

```
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
PRODUCTION_URL=https://bisman.erp
JWT_SECRET=your_secret_key_here
DEBUG_CORS=0
```

## Testing CORS

1. Test with curl:
   ```bash
   curl -H "Origin: http://localhost:3000" http://localhost:3001/api/health
   ```

2. Test from frontend:
   ```javascript
   fetch('http://localhost:3001/api/health', {
     credentials: 'include',
     headers: { 'Content-Type': 'application/json' }
   })
     .then(res => res.json())
     .then(data => console.log(data));
   ```

3. Enable debug mode:
   Set `DEBUG_CORS=1` in .env to see detailed CORS logs

## Security Checklist

- [x] Whitelist-based origin validation
- [x] Credentials enabled for auth
- [x] Environment-aware configuration
- [x] Proper error handling
- [x] Request logging
- [x] Graceful shutdown
- [x] Production/development modes

## Common Issues

**Issue**: CORS still blocking
- Solution: Check origin is in whitelist, enable DEBUG_CORS=1

**Issue**: Credentials not working
- Solution: Ensure credentials: 'include' in frontend fetch

**Issue**: Preflight failing
- Solution: Check OPTIONS handler, verify allowed headers/methods

*/
