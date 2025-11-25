// Load .env when running locally
try {
  require('dotenv').config()
} catch (e) {
  // ignore if dotenv isn't installed in other environments
}

// Execute the server (don't just require it)
// server.js will call start() and begin listening
require('./server')
