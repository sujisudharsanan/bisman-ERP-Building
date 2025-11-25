// Load .env when running locally
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
