/**
 * ============================================================================
 * ENTERPRISE ADMIN AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * 
 * Purpose:
 * - Authenticate Enterprise Admin users
 * - Verify JWT tokens for enterprise-level access
 * - Protect enterprise management endpoints
 * 
 * Protected Routes:
 * - /api/enterprise/* (client management, super admin creation, etc.)
 * 
 * Token Claims:
 * - id: Enterprise Admin ID
 * - email: Admin email
 * - role: ADMIN, SUPER_ADMIN, READ_ONLY
 * - type: ENTERPRISE_ADMIN
 * 
 * Usage:
 * ```typescript
 * app.post('/api/enterprise/clients', authEnterprise, createClient);
 * app.get('/api/enterprise/super-admins', authEnterprise, listSuperAdmins);
 * ```
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEnterprisePrisma } from '../lib/tenantManager';
import logger from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

interface EnterpriseJWTPayload {
  id: string;
  email: string;
  role: string;
  type: 'ENTERPRISE_ADMIN';
  iat?: number;
  exp?: number;
}

declare global {
  namespace Express {
    interface Request {
      enterpriseAdmin?: {
        id: string;
        email: string;
        role: string;
        name: string;
      };
    }
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const JWT_SECRET = process.env.ENTERPRISE_JWT_SECRET || 'your-enterprise-secret-key-change-in-production';
const JWT_EXPIRY = process.env.ENTERPRISE_JWT_EXPIRY || '24h';

if (JWT_SECRET === 'your-enterprise-secret-key-change-in-production' && process.env.NODE_ENV === 'production') {
  logger.error('⚠️  WARNING: Using default JWT secret in production! Set ENTERPRISE_JWT_SECRET env variable.');
}

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Generate JWT token for Enterprise Admin
 */
export function generateEnterpriseToken(admin: {
  id: string;
  email: string;
  role: string;
}): string {
  const payload: EnterpriseJWTPayload = {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    type: 'ENTERPRISE_ADMIN',
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY,
    issuer: 'bisman-erp-enterprise',
    audience: 'enterprise-api',
  });
}

/**
 * Generate refresh token
 */
export function generateEnterpriseRefreshToken(adminId: string): string {
  return jwt.sign({ id: adminId, type: 'refresh' }, JWT_SECRET, {
    expiresIn: '7d',
  });
}

// ============================================================================
// TOKEN VERIFICATION
// ============================================================================

/**
 * Verify and decode JWT token
 */
function verifyToken(token: string): EnterpriseJWTPayload {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: 'bisman-erp-enterprise',
      audience: 'enterprise-api',
    }) as EnterpriseJWTPayload;

    if (decoded.type !== 'ENTERPRISE_ADMIN') {
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
  if (req.cookies && req.cookies.enterprise_token) {
    return req.cookies.enterprise_token;
  }

  return null;
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Main authentication middleware for Enterprise Admins
 */
export async function authEnterprise(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
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
    let decoded: EnterpriseJWTPayload;
    try {
      decoded = verifyToken(token);
    } catch (error) {
      res.status(401).json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Invalid token',
      });
      return;
    }

    // Fetch admin from database
    const enterprise = await getEnterprisePrisma();
    const admin = await enterprise.enterpriseAdmin.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });

    if (!admin) {
      logger.warn('Token valid but admin not found:', decoded.id);
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Admin account not found',
      });
      return;
    }

    if (!admin.isActive) {
      logger.warn('Inactive admin attempted access:', admin.email);
      res.status(403).json({
        error: 'Account suspended',
        message: 'Your admin account has been deactivated',
      });
      return;
    }

    // Verify email matches (additional security check)
    if (admin.email !== decoded.email) {
      logger.error('Email mismatch in token:', {
        tokenEmail: decoded.email,
        dbEmail: admin.email,
      });
      res.status(401).json({
        error: 'Authentication failed',
        message: 'Token data mismatch',
      });
      return;
    }

    // Attach admin info to request
    req.enterpriseAdmin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
    };

    // Update last login (async, don't wait)
    enterprise.enterpriseAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    }).catch(err => logger.error('Failed to update lastLogin:', err));

    logger.debug(`✅ Enterprise admin authenticated: ${admin.email}`);
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
// ROLE-BASED ACCESS CONTROL
// ============================================================================

/**
 * Require specific enterprise admin role
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.enterpriseAdmin) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.enterpriseAdmin.role)) {
      logger.warn('Insufficient permissions:', {
        admin: req.enterpriseAdmin.email,
        required: allowedRoles,
        actual: req.enterpriseAdmin.role,
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

/**
 * Require ADMIN or SUPER_ADMIN role
 */
export const requireAdminRole = requireRole('ADMIN', 'SUPER_ADMIN');

/**
 * Require full ADMIN role only
 */
export const requireFullAdmin = requireRole('ADMIN');

/**
 * Allow read-only access
 */
export const allowReadOnly = requireRole('ADMIN', 'SUPER_ADMIN', 'READ_ONLY');

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

/**
 * Create new admin session
 */
export async function createAdminSession(
  adminId: string,
  token: string,
  req: Request
): Promise<void> {
  try {
    const enterprise = await getEnterprisePrisma();
    const tokenHash = jwt.sign({ token }, JWT_SECRET);

    await enterprise.adminSession.create({
      data: {
        adminId,
        token: tokenHash,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });

    logger.info(`Session created for admin: ${adminId}`);
  } catch (error) {
    logger.error('Failed to create admin session:', error);
    // Don't throw - session creation is not critical
  }
}

/**
 * Revoke admin session (logout)
 */
export async function revokeAdminSession(token: string): Promise<void> {
  try {
    const enterprise = await getEnterprisePrisma();
    const tokenHash = jwt.sign({ token }, JWT_SECRET);

    await enterprise.adminSession.deleteMany({
      where: { token: tokenHash },
    });

    logger.info('Admin session revoked');
  } catch (error) {
    logger.error('Failed to revoke admin session:', error);
  }
}

/**
 * Clean up expired sessions
 */
export async function cleanupExpiredSessions(): Promise<void> {
  try {
    const enterprise = await getEnterprisePrisma();
    const result = await enterprise.adminSession.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired admin sessions`);
  } catch (error) {
    logger.error('Failed to cleanup expired sessions:', error);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  authEnterprise,
  generateEnterpriseToken,
  generateEnterpriseRefreshToken,
  requireRole,
  requireAdminRole,
  requireFullAdmin,
  allowReadOnly,
  createAdminSession,
  revokeAdminSession,
  cleanupExpiredSessions,
};
