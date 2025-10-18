// Load .env when running locally
try {
  require('dotenv').config()
} catch (e) {
  // ignore if dotenv isn't installed in other environments
}

// Delegate to the Next-integrated server so non-API routes are handled by Next.js
module.exports = require('./server')
