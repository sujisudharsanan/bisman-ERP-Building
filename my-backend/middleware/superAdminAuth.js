/**
 * Super Admin Authentication Middleware
 * 
 * Provides middleware for Super Admin only routes
 */

const { authenticate } = require('./auth');

/**
 * Middleware that checks if the user is a Super Admin
 * Must be used after authenticateToken
 */
const superAdminOnly = (req, res, next) => {
  // User should already be authenticated via authenticateToken
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  const allowedRoles = ['SUPER_ADMIN', 'SYSTEM_ADMIN', 'ENTERPRISE_ADMIN'];
  const userRole = req.user.role || req.user.userType;

  if (!allowedRoles.includes(userRole)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'Super Admin access required'
    });
  }

  next();
};

/**
 * Combined middleware array for convenience
 */
const superAdminAuth = [authenticate, superAdminOnly];

module.exports = {
  superAdminOnly,
  superAdminAuth
};
