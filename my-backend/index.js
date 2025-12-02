// Load .env when running locally
// Cache bust: 2025-12-02-1130
try {
  require('dotenv').config()
} catch (e) {
  // ignore if dotenv isn't installed in other environments
}

// Validate environment variables before starting server
require('./utils/envValidator');

// Execute the server (don't just require it)
// server.js will call start() and begin listening
require('./server')
