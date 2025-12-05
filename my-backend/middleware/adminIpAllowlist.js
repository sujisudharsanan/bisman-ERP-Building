/**
 * ============================================================================
 * ADMIN IP ALLOWLIST MIDDLEWARE
 * ============================================================================
 * 
 * Restricts access to admin/management consoles by IP address.
 * 
 * Configuration via environment variables:
 * - ADMIN_IP_ALLOWLIST: Comma-separated list of allowed IPs/CIDR ranges
 * - ADMIN_IP_ALLOWLIST_ENABLED: Set to 'true' to enable (default: disabled in dev)
 * - ADMIN_IP_BYPASS_TOKEN: Secret token to bypass IP check (for emergency access)
 * 
 * Example:
 *   ADMIN_IP_ALLOWLIST=192.168.1.0/24,10.0.0.1,203.0.113.0/24
 *   ADMIN_IP_ALLOWLIST_ENABLED=true
 *   ADMIN_IP_BYPASS_TOKEN=super-secret-emergency-token
 * 
 * @module middleware/adminIpAllowlist
 */

const { auditService } = require('../services/auditService');

// Parse CIDR notation and check if IP is in range
function ipInCidr(ip, cidr) {
  if (!cidr.includes('/')) {
    // Not CIDR, exact match
    return ip === cidr;
  }
  
  const [range, bits] = cidr.split('/');
  const mask = ~((1 << (32 - parseInt(bits))) - 1);
  
  const ipInt = ipToInt(ip);
  const rangeInt = ipToInt(range);
  
  if (ipInt === null || rangeInt === null) return false;
  
  return (ipInt & mask) === (rangeInt & mask);
}

// Convert IP string to integer
function ipToInt(ip) {
  // Handle IPv4-mapped IPv6 addresses
  if (ip.startsWith('::ffff:')) {
    ip = ip.substring(7);
  }
  
  // Handle localhost variations
  if (ip === '::1' || ip === '127.0.0.1' || ip === 'localhost') {
    return 2130706433; // 127.0.0.1 as int
  }
  
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  
  return parts.reduce((acc, part) => {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    return (acc << 8) + num;
  }, 0);
}

// Parse allowlist from environment
function parseAllowlist() {
  const allowlistStr = process.env.ADMIN_IP_ALLOWLIST || '';
  if (!allowlistStr.trim()) return [];
  
  return allowlistStr
    .split(',')
    .map(ip => ip.trim())
    .filter(ip => ip.length > 0);
}

// Check if IP is in allowlist
function isIpAllowed(clientIp, allowlist) {
  if (!allowlist || allowlist.length === 0) {
    // No allowlist configured, deny by default when enabled
    return false;
  }
  
  // Always allow localhost in development
  const isLocalhost = ['127.0.0.1', '::1', '::ffff:127.0.0.1', 'localhost'].includes(clientIp);
  if (process.env.NODE_ENV !== 'production' && isLocalhost) {
    return true;
  }
  
  // Check each entry in allowlist
  for (const entry of allowlist) {
    if (ipInCidr(clientIp, entry)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Admin IP Allowlist Middleware
 * 
 * Blocks requests from non-allowed IPs to protected admin routes.
 * Can be bypassed with emergency token for disaster recovery.
 */
function adminIpAllowlist(req, res, next) {
  // Check if IP allowlist is enabled
  const isEnabled = process.env.ADMIN_IP_ALLOWLIST_ENABLED === 'true';
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Only enforce in production or when explicitly enabled
  if (!isEnabled && !isProduction) {
    return next();
  }
  
  // Get client IP (considering proxy headers)
  const clientIp = req.headers['cf-connecting-ip'] ||
                   req.headers['x-real-ip'] ||
                   (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                   req.ip ||
                   req.connection?.remoteAddress ||
                   'unknown';
  
  // Check for emergency bypass token
  const bypassToken = process.env.ADMIN_IP_BYPASS_TOKEN;
  const providedToken = req.headers['x-admin-bypass-token'] || req.query._bypass_token;
  
  if (bypassToken && providedToken === bypassToken) {
    console.warn(`[AdminIpAllowlist] ⚠️ Bypass token used from IP: ${clientIp} for ${req.path}`);
    
    // Log bypass usage for security audit
    try {
      auditService.logSecurityEvent('ADMIN_IP_BYPASS_USED', {
        severity: 'WARNING',
        ipAddress: clientIp,
        details: {
          path: req.path,
          method: req.method,
          userAgent: req.headers['user-agent'],
          timestamp: new Date().toISOString()
        }
      }).catch(() => {});
    } catch (e) {}
    
    return next();
  }
  
  // Parse and check allowlist
  const allowlist = parseAllowlist();
  
  // If no allowlist configured in production, log warning but allow (fail-open for initial setup)
  if (allowlist.length === 0) {
    if (isProduction) {
      console.warn('[AdminIpAllowlist] ⚠️ No ADMIN_IP_ALLOWLIST configured - admin routes are open!');
    }
    return next();
  }
  
  // Check if IP is allowed
  if (isIpAllowed(clientIp, allowlist)) {
    return next();
  }
  
  // IP not in allowlist - block and log
  console.warn(`[AdminIpAllowlist] ❌ Access denied from IP: ${clientIp} to ${req.path}`);
  
  // Log security event
  try {
    auditService.logSecurityEvent('ADMIN_IP_BLOCKED', {
      severity: 'WARNING',
      ipAddress: clientIp,
      details: {
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        allowlist: allowlist.join(', '),
        timestamp: new Date().toISOString()
      }
    }).catch(() => {});
  } catch (e) {}
  
  return res.status(403).json({
    success: false,
    error: 'Access denied',
    message: 'Your IP address is not authorized to access this resource',
    errorCode: 'ADMIN_IP_NOT_ALLOWED'
  });
}

/**
 * Create a configured instance for specific route protection
 * 
 * @param {Object} options - Configuration options
 * @param {string[]} options.additionalIps - Additional IPs to allow
 * @param {boolean} options.requireAuth - Also require authentication (default: true)
 * @returns {Function} Express middleware
 */
function createAdminIpAllowlist(options = {}) {
  const { additionalIps = [], requireAuth = true } = options;
  
  return (req, res, next) => {
    // First check IP
    const isEnabled = process.env.ADMIN_IP_ALLOWLIST_ENABLED === 'true';
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (!isEnabled && !isProduction) {
      return next();
    }
    
    const clientIp = req.headers['cf-connecting-ip'] ||
                     req.headers['x-real-ip'] ||
                     (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                     req.ip ||
                     'unknown';
    
    // Combine environment allowlist with additional IPs
    const baseAllowlist = parseAllowlist();
    const fullAllowlist = [...baseAllowlist, ...additionalIps];
    
    // Check bypass token
    const bypassToken = process.env.ADMIN_IP_BYPASS_TOKEN;
    const providedToken = req.headers['x-admin-bypass-token'] || req.query._bypass_token;
    
    if (bypassToken && providedToken === bypassToken) {
      return next();
    }
    
    if (fullAllowlist.length === 0) {
      return next();
    }
    
    if (!isIpAllowed(clientIp, fullAllowlist)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Your IP address is not authorized',
        errorCode: 'ADMIN_IP_NOT_ALLOWED'
      });
    }
    
    next();
  };
}

module.exports = {
  adminIpAllowlist,
  createAdminIpAllowlist,
  isIpAllowed,
  parseAllowlist
};
