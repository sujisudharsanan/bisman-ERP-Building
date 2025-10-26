const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET || 'dev_access_secret';

/**
 * Multi-Tenant Authentication Middleware
 * Verifies JWT token and adds user info with tenant context to request
 */
const authenticateMultiTenant = async (req, res, next) => {
  try {
    // Get token from Authorization header or cookie
    const authHeader = req.headers['authorization'];
    const tokenFromHeader = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const tokenFromCookie = req.cookies?.accessToken;
    
    const token = tokenFromHeader || tokenFromCookie;

    if (!token) {
      return res.status(401).json({ 
        error: 'Access token required',
        message: 'Please login to continue'
      });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    
    // Check if this is an Enterprise Admin (from enterprise_admins table)
    if (decoded.userType === 'ENTERPRISE_ADMIN') {
      const enterpriseAdmin = await prisma.enterpriseAdmin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          is_active: true,
          profile_pic_url: true
        }
      });

      if (!enterpriseAdmin || !enterpriseAdmin.is_active) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          message: 'Invalid token'
        });
      }

      req.user = {
        id: enterpriseAdmin.id,
        email: enterpriseAdmin.email,
        name: enterpriseAdmin.name,
        role: 'ENTERPRISE_ADMIN',
        userType: 'ENTERPRISE_ADMIN',
        productType: 'ALL',
        tenant_id: null,
        super_admin_id: null,
        assignedModules: [],
        pagePermissions: {},
        profile_pic_url: enterpriseAdmin.profile_pic_url
      };

      return next();
    }

    // Check if this is a Super Admin (from super_admins table)
    if (decoded.userType === 'SUPER_ADMIN') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
          productType: true,
          is_active: true,
          profile_pic_url: true
        }
      });

      if (!superAdmin || !superAdmin.is_active) {
        return res.status(401).json({ 
          error: 'User not found or inactive',
          message: 'Invalid token'
        });
      }

      // Get assigned modules for this super admin
      const moduleAssignments = await prisma.moduleAssignment.findMany({
        where: { super_admin_id: superAdmin.id },
        include: { module: true }
      });

      const assignedModules = moduleAssignments.map(ma => ma.module.module_name);

      req.user = {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: 'SUPER_ADMIN',
        userType: 'SUPER_ADMIN',
        productType: superAdmin.productType,
        tenant_id: null, // Super admins manage multiple tenants
        super_admin_id: superAdmin.id,
        assignedModules: assignedModules,
        pagePermissions: {},
        profile_pic_url: superAdmin.profile_pic_url
      };

      return next();
    }

    // Regular user (from users table)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        productType: true,
        tenant_id: true,
        super_admin_id: true,
        assignedModules: true,
        pagePermissions: true,
        profile_pic_url: true
      }
    });

    if (!user) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'Invalid token - user does not exist'
      });
    }

    // Attach user to request object
    req.user = {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.username,
      role: user.role,
      userType: 'USER',
      productType: user.productType,
      tenant_id: user.tenant_id,
      super_admin_id: user.super_admin_id,
      assignedModules: user.assignedModules || [],
      pagePermissions: user.pagePermissions || {},
      profile_pic_url: user.profile_pic_url
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please login again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        message: 'Authentication failed. Please login again.'
      });
    }

    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed',
      message: 'An error occurred during authentication'
    });
  }
};

/**
 * Check if user has Enterprise Admin role
 */
const requireEnterpriseAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Enterprise Admin access required'
    });
  }

  next();
};

/**
 * Check if user has Super Admin role
 */
const requireSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'ENTERPRISE_ADMIN') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Super Admin access required'
    });
  }

  next();
};

/**
 * Check if user has specific role(s)
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Check if user has access to specific productType
 */
const requireProductType = (productType) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Enterprise Admin has access to everything
    if (req.user.role === 'ENTERPRISE_ADMIN' || req.user.productType === 'ALL') {
      return next();
    }

    // Check if user's productType matches required productType
    if (req.user.productType !== productType) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `This feature is only available for ${productType} users`
      });
    }

    next();
  };
};

/**
 * Check if user has access to specific module
 */
const requireModule = (moduleName) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Enterprise Admin has access to all modules
    if (req.user.role === 'ENTERPRISE_ADMIN') {
      return next();
    }

    // Check if user has module assigned
    const assignedModules = req.user.assignedModules || [];
    if (!assignedModules.includes(moduleName)) {
      return res.status(403).json({ 
        error: 'Access denied',
        message: `Module '${moduleName}' is not assigned to you`
      });
    }

    next();
  };
};

/**
 * Tenant Isolation Middleware
 * Automatically injects tenant_id into request for data filtering
 */
const tenantIsolation = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Enterprise Admin can access all tenants
  if (req.user.role === 'ENTERPRISE_ADMIN') {
    req.tenant_id = req.query.tenant_id || req.body.tenant_id || null;
    req.bypassTenantIsolation = true;
    return next();
  }

  // Super Admin can access their managed clients
  if (req.user.role === 'SUPER_ADMIN') {
    const requestedTenantId = req.query.tenant_id || req.body.tenant_id || req.params.clientId;
    
    if (requestedTenantId) {
      // Verify super admin owns this client
      const client = await prisma.client.findFirst({
        where: {
          id: requestedTenantId,
          super_admin_id: req.user.super_admin_id
        }
      });

      if (!client) {
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'You do not have access to this client'
        });
      }

      req.tenant_id = requestedTenantId;
    } else {
      // Super admin must specify which client they're accessing
      req.tenant_id = null;
    }
    
    return next();
  }

  // Regular users are locked to their tenant
  if (!req.user.tenant_id) {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'No tenant assigned to user'
    });
  }

  req.tenant_id = req.user.tenant_id;
  next();
};

module.exports = {
  authenticateMultiTenant,
  requireEnterpriseAdmin,
  requireSuperAdmin,
  requireRole,
  requireProductType,
  requireModule,
  tenantIsolation
};
