/**
 * ============================================================================
 * TENANT RESOLVER MIDDLEWARE
 * ============================================================================
 * 
 * Purpose:
 * - Extract tenant identifier from request (JWT, header, subdomain, etc.)
 * - Validate tenant exists and is active
 * - Attach tenant-specific Prisma client to request object
 * - Enable multi-tenant data isolation
 * 
 * Tenant Resolution Strategies (in priority order):
 * 1. JWT claim (tenant_id in token payload)
 * 2. HTTP Header (x-tenant-id)
 * 3. Subdomain (tenant.app.com → lookup by slug)
 * 4. Query parameter (?tenant=xyz) - DEV ONLY
 * 
 * Usage:
 * ```typescript
 * app.use('/api/client/*', tenantResolver, (req, res) => {
 *   const users = await req.tenant.prisma.user.findMany();
 *   res.json(users);
 * });
 * ```
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { getEnterprisePrisma, getTenantPrismaById } from '../lib/tenantManager';
import logger from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        slug: string;
        status: string;
        prisma: any; // PrismaClientClient
        metadata?: any;
      };
      user?: {
        id: string;
        email: string;
        role?: string;
        tenantId?: string;
      };
    }
  }
}

interface TenantResolverOptions {
  required?: boolean; // Throw error if tenant not found
  allowDev?: boolean; // Allow query parameter in development
  validateStatus?: boolean; // Check if tenant is ACTIVE
}

const DEFAULT_OPTIONS: TenantResolverOptions = {
  required: true,
  allowDev: process.env.NODE_ENV === 'development',
  validateStatus: true,
};

// ============================================================================
// TENANT RESOLUTION STRATEGIES
// ============================================================================

/**
 * Extract tenant ID from JWT token
 */
function getTenantFromJWT(req: Request): string | null {
  try {
    // Assuming JWT has been verified by auth middleware
    // and user data is attached to req.user
    if (req.user && req.user.tenantId) {
      logger.debug('Tenant resolved from JWT:', req.user.tenantId);
      return req.user.tenantId;
    }
    return null;
  } catch (error) {
    logger.error('Error extracting tenant from JWT:', error);
    return null;
  }
}

/**
 * Extract tenant ID from HTTP header
 */
function getTenantFromHeader(req: Request): string | null {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (tenantId) {
    logger.debug('Tenant resolved from header:', tenantId);
    return tenantId;
  }
  return null;
}

/**
 * Extract tenant ID from subdomain
 * Example: acme.app.com → lookup client by slug "acme"
 */
async function getTenantFromSubdomain(req: Request): Promise<string | null> {
  try {
    const host = req.headers.host || req.hostname;
    if (!host) return null;

    // Remove port if present
    const hostname = host.split(':')[0];
    
    // Split subdomain
    const parts = hostname.split('.');
    
    // Expect: tenant.app.com (3 parts) or tenant.localhost (2 parts for dev)
    if (parts.length < 2) return null;
    
    const subdomain = parts[0];
    
    // Ignore common subdomains
    if (['www', 'api', 'app', 'admin'].includes(subdomain.toLowerCase())) {
      return null;
    }
    
    // Lookup tenant by slug
    const enterprise = await getEnterprisePrisma();
    const client = await enterprise.client.findFirst({
      where: { slug: subdomain },
      select: { id: true },
    });
    
    if (client) {
      logger.debug('Tenant resolved from subdomain:', client.id);
      return client.id;
    }
    
    return null;
  } catch (error) {
    logger.error('Error extracting tenant from subdomain:', error);
    return null;
  }
}

/**
 * Extract tenant ID from query parameter (DEV ONLY)
 */
function getTenantFromQuery(req: Request, allowDev: boolean): string | null {
  if (!allowDev) return null;
  
  const tenantId = req.query.tenant as string;
  if (tenantId) {
    logger.warn('⚠️  Tenant resolved from query parameter (DEV ONLY):', tenantId);
    return tenantId;
  }
  return null;
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

/**
 * Tenant Resolver Middleware
 * Resolves tenant context and attaches tenant-specific Prisma client
 */
export async function tenantResolver(
  req: Request,
  res: Response,
  next: NextFunction,
  options: TenantResolverOptions = DEFAULT_OPTIONS
): Promise<void> {
  try {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    // Try all resolution strategies in order
    let tenantId: string | null = null;
    
    tenantId = getTenantFromJWT(req);
    if (!tenantId) tenantId = getTenantFromHeader(req);
    if (!tenantId) tenantId = await getTenantFromSubdomain(req);
    if (!tenantId) tenantId = getTenantFromQuery(req, opts.allowDev);
    
    // No tenant found
    if (!tenantId) {
      if (opts.required) {
        res.status(400).json({
          error: 'Tenant identifier required',
          message: 'Please provide x-tenant-id header or tenant query parameter',
        });
        return;
      }
      return next();
    }
    
    // Fetch tenant metadata from enterprise DB
    const enterprise = await getEnterprisePrisma();
    const client = await enterprise.client.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        dbConnectionUri: true,
        metadata: true,
        tier: true,
        maxUsers: true,
      },
    });
    
    if (!client) {
      res.status(404).json({
        error: 'Tenant not found',
        message: `No tenant found with ID: ${tenantId}`,
      });
      return;
    }
    
    // Validate tenant status
    if (opts.validateStatus && client.status !== 'ACTIVE') {
      res.status(403).json({
        error: 'Tenant inactive',
        message: `Tenant ${client.name} is ${client.status}`,
      });
      return;
    }
    
    // Validate JWT tenant claim matches header (security check)
    if (req.user && req.user.tenantId && req.user.tenantId !== tenantId) {
      logger.warn('⚠️  Tenant mismatch: JWT vs header', {
        jwtTenant: req.user.tenantId,
        headerTenant: tenantId,
        userId: req.user.id,
      });
      res.status(403).json({
        error: 'Tenant mismatch',
        message: 'Token tenant ID does not match request tenant ID',
      });
      return;
    }
    
    // Get tenant-specific Prisma client
    const tenantPrisma = await getTenantPrismaById(tenantId);
    
    // Attach to request object
    req.tenant = {
      id: client.id,
      name: client.name,
      slug: client.slug,
      status: client.status,
      prisma: tenantPrisma,
      metadata: client.metadata,
    };
    
    logger.info(`✅ Tenant resolved: ${client.name} (${client.id})`);
    
    next();
  } catch (error) {
    logger.error('❌ Tenant resolution failed:', error);
    res.status(500).json({
      error: 'Tenant resolution failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Middleware factory with custom options
 */
export function createTenantResolver(options?: TenantResolverOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    return tenantResolver(req, res, next, options);
  };
}

/**
 * Optional tenant resolver (doesn't fail if tenant not found)
 */
export const optionalTenantResolver = createTenantResolver({
  required: false,
  validateStatus: false,
});

// ============================================================================
// TENANT VALIDATION HELPERS
// ============================================================================

/**
 * Validate user has access to tenant
 * Call after both auth and tenant middleware
 */
export async function validateTenantAccess(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.tenant) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Check if user's tenantId matches resolved tenant
    if (req.user.tenantId && req.user.tenantId !== req.tenant.id) {
      logger.warn('⚠️  User attempted to access different tenant', {
        userId: req.user.id,
        userTenant: req.user.tenantId,
        requestTenant: req.tenant.id,
      });
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this tenant',
      });
      return;
    }
    
    // Additional check: verify user exists in tenant database
    const userExists = await req.tenant.prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, isActive: true },
    });
    
    if (!userExists) {
      logger.error('User not found in tenant database', {
        userId: req.user.id,
        tenantId: req.tenant.id,
      });
      res.status(403).json({
        error: 'User not found in tenant',
        message: 'Your account does not exist in this tenant',
      });
      return;
    }
    
    if (!userExists.isActive) {
      res.status(403).json({
        error: 'Account suspended',
        message: 'Your account has been deactivated',
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Tenant access validation failed:', error);
    res.status(500).json({
      error: 'Access validation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Check if tenant has exceeded usage limits
 */
export async function checkTenantLimits(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.tenant) {
      return next();
    }
    
    const enterprise = await getEnterprisePrisma();
    const client = await enterprise.client.findUnique({
      where: { id: req.tenant.id },
      select: { maxUsers: true, tier: true },
    });
    
    if (!client) {
      return next();
    }
    
    // Check user limit (example)
    const userCount = await req.tenant.prisma.user.count();
    
    if (userCount >= client.maxUsers) {
      res.status(429).json({
        error: 'User limit exceeded',
        message: `Your ${client.tier} plan allows maximum ${client.maxUsers} users`,
        upgrade: true,
      });
      return;
    }
    
    next();
  } catch (error) {
    logger.error('Tenant limits check failed:', error);
    next(); // Don't block on limit check failure
  }
}

export default {
  tenantResolver,
  createTenantResolver,
  optionalTenantResolver,
  validateTenantAccess,
  checkTenantLimits,
};
