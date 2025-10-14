const crypto = require('crypto')

function safeRandomId() {
  if (crypto && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID() } catch (e) { /* fallback below */ }
  }
  // Fallback: 32 hex chars (128 bits)
  try { return crypto.randomBytes(16).toString('hex') } catch (e) { return String(Date.now()) }
}

module.exports = { safeRandomId }
