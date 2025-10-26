/**
 * ============================================================================
 * CLIENT USER AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * 
 * Purpose:
 * - Authenticate tenant-scoped users
 * - Verify JWT tokens for client API access
 * - Protect client-level endpoints
 * 
 * Protected Routes:
 * - /api/client/* (users, roles, permissions, transactions, etc.)
 * 
 * Token Claims:
 * - id: User ID (in tenant database)
 * - email: User email
 * - tenantId: Client/Tenant ID
 * - type: CLIENT_USER
 * - roles: Array of role IDs
 * 
 * Usage:
 * ```typescript
 * app.use('/api/client/*', tenantResolver, authClient, (req, res) => {
 *   // req.user and req.tenant available
 * });
 * ```
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface ClientJWTPayload {
  id: string;
  email: string;
  tenantId: string;
  type: 'CLIENT_USER';
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        tenantId: string;
        roles?: string[];
        permissions?: string[];
      };
    }
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'your-client-secret-key-change-in-production';
const JWT_EXPIRY = process.env.CLIENT_JWT_EXPIRY || '8h';

if (JWT_SECRET === 'your-client-secret-key-change-in-production' && process.env.NODE_ENV === 'production') {
  logger.error('⚠️  WARNING: Using default JWT secret in production! Set CLIENT_JWT_SECRET env variable.');
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token for client user
 */
export function generateClientToken(user: {
  id: string;
  email: string;
  tenantId: string;
  roles?: string[];
  permissions?: string[];
}): string {
  const payload: ClientJWTPayload = {
    id: user.id,
    email: user.email,
    tenantId: user.tenantId,
    type: 'CLIENT_USER',
    roles: user.roles,
    permissions: user.permissions,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'bisman-erp-client',
    audience: 'client-api',
  });
}

/**
 * Generate refresh token
 */
export function generateClientRefreshToken(userId: string, tenantId: string): string {
  return jwt.sign({ id: userId, tenantId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '30d',
  });
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): ClientJWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'bisman-erp-client',
      audience: 'client-api',
    }) as ClientJWTPayload;

    if (decoded.type !== 'CLIENT_USER') {
      throw new Error('Invalid token type');
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extract token from request headers
 */
function extractToken(req: Request): string | null {
  // Try Authorization header (Bearer token)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  // Try cookie (for web apps)
  if (req.cookies && req.cookies.client_token) {
    return req.cookies.client_token;
  }

  return null;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware for Client Users
 * NOTE: Must be used AFTER tenantResolver middleware
 */
export async function authClient(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Ensure tenant has been resolved
    if (!req.tenant) {
      logger.error('authClient called without tenant context');
      res.status(500).json({
        error: 'Configuration error',
        message: 'Tenant resolver middleware must be applied before auth',
      });
      return;
    }

    // Extract token
    const token = extractToken(req);
    
    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No authentication token provided',
      });
      return;
    }

    // Verify token
    let decoded: ClientJWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Invalid token',
      });
      return;
    }

    // Verify tenant matches
    if (decoded.tenantId !== req.tenant.id) {
      logger.warn('Token tenant mismatch:', {
        tokenTenant: decoded.tenantId,
        requestTenant: req.tenant.id,
        userId: decoded.id,
      });
      res.status(403).json({
        error: 'Access denied',
        message: 'Token does not belong to this tenant',
      });
      return;
    }

    // Fetch user from tenant database
    const user = await req.tenant.prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        status: true,
        userRoles: {
          include: {
            role: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      logger.warn('Token valid but user not found in tenant:', decoded.id);
      res.status(401).json({
        error: 'Authentication failed',
        message: 'User account not found',
      });
      return;
    }

    if (!user.isActive || user.status !== 'ACTIVE') {
      logger.warn('Inactive user attempted access:', user.email);
      res.status(403).json({
        error: 'Account suspended',
        message: 'Your user account has been deactivated',
      });
      return;
    }

    // Verify email matches
    if (user.email !== decoded.email) {
      logger.error('Email mismatch in token:', {
        tokenEmail: decoded.email,
        dbEmail: user.email,
      });
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Token data mismatch',
      });
      return;
    }

    // Get user roles
    const roles = user.userRoles.map(ur => ur.role.slug);

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || user.email,
      tenantId: req.tenant.id,
      roles,
      permissions: decoded.permissions,
    };

    // Update last login (async, don't wait)
    req.tenant.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    }).catch((err: any) => logger.error('Failed to update lastLogin:', err));

    logger.debug(`✅ Client user authenticated: ${user.email} (tenant: ${req.tenant.name})`);
    next();
    
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// PERMISSION CHECKING
// ============================================================================

/**
 * Check if user has specific permission
 */
export async function checkPermission(
  req: Request,
  resource: string,
  action: string
): Promise<boolean> {
  if (!req.user || !req.tenant) {
    return false;
  }

  try {
    // Get user's roles
    const userRoles = await req.tenant.prisma.userRole.findMany({
      where: { userId: req.user.id },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    // Check if any role has the required permission
    for (const userRole of userRoles) {
      for (const rolePermission of userRole.role.rolePermissions) {
        const perm = rolePermission.permission;
        if (perm.resource === resource && perm.action === action && perm.isActive) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    logger.error('Permission check failed:', error);
    return false;
  }
}

/**
 * Require specific permission (middleware)
 */
export function requirePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasPermission = await checkPermission(req, resource, action);

    if (!hasPermission) {
      logger.warn('Permission denied:', {
        user: req.user.email,
        resource,
        action,
      });
      res.status(403).json({
        error: 'Permission denied',
        message: `You do not have permission to ${action} ${resource}`,
      });
      return;
    }

    next();
  };
}

/**
 * Require specific role (middleware)
 */
export function requireClientRole(...allowedRoles: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.tenant) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    // Fetch user roles
    const userRoles = await req.tenant.prisma.userRole.findMany({
      where: { userId: req.user.id },
      include: {
        role: {
          select: { slug: true },
        },
      },
    });

    const userRoleSlugs = userRoles.map(ur => ur.role.slug);
    const hasRole = allowedRoles.some(role => userRoleSlugs.includes(role));

    if (!hasRole) {
      logger.warn('Insufficient role:', {
        user: req.user.email,
        required: allowedRoles,
        actual: userRoleSlugs,
      });
      res.status(403).json({
        error: 'Insufficient permissions',
        message: `Required role: ${allowedRoles.join(' or ')}`,
      });
      return;
    }

    next();
  };
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create new client user session
 */
export async function createUserSession(
  userId: string,
  tenantId: string,
  token: string,
  req: Request
): Promise<void> {
  try {
    if (!req.tenant || req.tenant.id !== tenantId) {
      throw new Error('Tenant mismatch');
    }

    const tokenHash = jwt.sign({ token }, JWT_SECRET);

    await req.tenant.prisma.userSession.create({
      data: {
        userId,
        token: tokenHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        deviceType: getDeviceType(req.headers['user-agent']),
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
      },
    });

    logger.info(`Session created for user: ${userId}`);
  } catch (error) {
    logger.error('Failed to create user session:', error);
  }
}

/**
 * Revoke user session (logout)
 */
export async function revokeUserSession(token: string, req: Request): Promise<void> {
  try {
    if (!req.tenant) {
      throw new Error('No tenant context');
    }

    const tokenHash = jwt.sign({ token }, JWT_SECRET);

    await req.tenant.prisma.userSession.deleteMany({
      where: { token: tokenHash },
    });

    logger.info('User session revoked');
  } catch (error) {
    logger.error('Failed to revoke user session:', error);
  }
}

/**
 * Get device type from user agent
 */
function getDeviceType(userAgent?: string): string {
  if (!userAgent) return 'unknown';
  
  const ua = userAgent.toLowerCase();
  if (ua.includes('mobile')) return 'mobile';
  if (ua.includes('tablet')) return 'tablet';
  return 'desktop';
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  authClient,
  generateClientToken,
  generateClientRefreshToken,
  checkPermission,
  requirePermission,
  requireClientRole,
  createUserSession,
  revokeUserSession,
};
