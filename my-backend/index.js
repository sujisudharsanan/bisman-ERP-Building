// EARLY STARTUP LOG - Railway debugging
console.log('[startup] 🚀 index.js entry - PID:', process.pid, 'at:', new Date().toISOString());
console.log('[startup] NODE_ENV:', process.env.NODE_ENV);
console.log('[startup] PORT:', process.env.PORT);

// Load .env when running locally
// Cache bust: 2025-01-17-railway-debug
try {
  require('dotenv').config();
  console.log('[startup] dotenv loaded');
} catch (e) {
  console.log('[startup] dotenv not available:', e.message);
}

// Validate environment variables before starting server
try {
  console.log('[startup] Loading envValidator...');
  require('./utils/envValidator');
  console.log('[startup] envValidator loaded');
} catch (e) {
  console.error('[startup] ❌ envValidator FAILED:', e.message);
  console.error(e.stack);
}

// Execute the server (don't just require it)
// server.js will call start() and begin listening
try {
  console.log('[startup] Loading server.js...');
  require('./server');
  console.log('[startup] server.js loaded');
} catch (e) {
  console.error('[startup] ❌ server.js FAILED:', e.message);
  console.error(e.stack);
  process.exit(1);
}
