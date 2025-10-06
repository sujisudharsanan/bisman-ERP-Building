// RBAC (Role-Based Access Control) Middleware
// Production-ready role checking middleware

const rbac = {
  // Require specific roles
  requireRole: (allowedRoles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          timestamp: new Date().toISOString()
        });
      }

      const userRole = req.user.role;
      
      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: {
            message: 'Insufficient permissions',
            code: 'INSUFFICIENT_PERMISSIONS',
            details: {
              required: allowedRoles,
              current: userRole
            }
          },
          timestamp: new Date().toISOString()
        });
      }

      next();
    };
  },

  // Require super admin access
  requireSuperAdmin: (req, res, next) => {
    return rbac.requireRole(['Super Admin', 'super_admin'])(req, res, next);
  },

  // Require admin access (admin or super admin)
  requireAdmin: (req, res, next) => {
    return rbac.requireRole(['Super Admin', 'Admin', 'super_admin', 'admin'])(req, res, next);
  },

  // Check if user owns resource or has admin access
  requireOwnershipOrAdmin: (resourceUserId) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            message: 'Authentication required',
            code: 'AUTH_REQUIRED'
          },
          timestamp: new Date().toISOString()
        });
      }

      const userRole = req.user.role;
      const userId = req.user.id;

      // Allow if user is admin or super admin
      if (['Super Admin', 'Admin', 'super_admin', 'admin'].includes(userRole)) {
        return next();
      }

      // Allow if user owns the resource
      if (userId === resourceUserId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: {
          message: 'Access denied - insufficient permissions',
          code: 'ACCESS_DENIED'
        },
        timestamp: new Date().toISOString()
      });
    };
  }
};

module.exports = rbac;
