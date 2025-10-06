
/**
 * Log sanitization middleware
 * Removes sensitive data from logs
 */
function sanitizeLogData(data) {
  if (typeof data === 'string') {
    return data
      .replace(/password=[^&\s]+/gi, 'password=[REDACTED]')
      .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
      .replace(/email=([^&\s]+)/gi, 'email=[REDACTED]');
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized = { ...data };
    if (sanitized.password) sanitized.password = '[REDACTED]';
    if (sanitized.token) sanitized.token = '[REDACTED]';
    return sanitized;
  }
  
  return data;
}

// Override console.log for development
const originalLog = console.log;
console.log = (...args) => {
  const sanitizedArgs = args.map(sanitizeLogData);
  originalLog.apply(console, sanitizedArgs);
};

// Express middleware for log sanitization
function logSanitizer(req, res, next) {
  // Sanitize request URL and body
  if (req.url) {
    req.url = sanitizeLogData(req.url);
  }
  
  if (req.body) {
    req.sanitizedBody = sanitizeLogData(req.body);
  }
  
  next();
}

module.exports = { sanitizeLogData, logSanitizer };
