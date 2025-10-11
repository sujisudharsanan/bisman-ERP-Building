
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
  
  // Avoid cloning/logging large or circular objects; leave them as-is
  if (typeof data === 'object' && data !== null) {
    return data;
  }
  
  return data;
}

// Override console.log for development
const originalLog = console.log;
console.log = (...args) => {
  try {
    const sanitizedArgs = args.map(arg => typeof arg === 'string' ? sanitizeLogData(arg) : arg);
    originalLog.apply(console, sanitizedArgs);
  } catch (e) {
    originalLog.apply(console, args);
  }
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
