/**
 * Enhanced Security Headers Middleware
 * Configures comprehensive security headers for production
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Get security headers configuration based on environment
 */
export function getSecurityHeadersConfig() {
  const isProduction = process.env.NODE_ENV === 'production';

  return helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        fontSrc: ["'self'", 'https:', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        objectSrc: ["'none'"],
        scriptSrc: [
          "'self'",
          // Allow inline scripts only in development
          ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"]),
        ],
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"], // Tailwind needs unsafe-inline
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },

    // HTTP Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // Prevent clickjacking
    frameguard: {
      action: 'deny',
    },

    // Prevent MIME type sniffing
    noSniff: true,

    // XSS Protection (for older browsers)
    xssFilter: true,

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // DNS Prefetch Control
    dnsPrefetchControl: {
      allow: false,
    },

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Cross-Origin policies
    crossOriginEmbedderPolicy: false, // Disable if using external resources
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  });
}

/**
 * Additional custom security headers
 */
export function additionalSecurityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Permissions Policy (formerly Feature Policy)
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // Expect-CT header (Certificate Transparency)
  res.setHeader('Expect-CT', 'max-age=86400, enforce');

  // X-Content-Type-Options
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options (additional to frameguard)
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection (for legacy browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Custom security header for API versioning
  res.setHeader('X-API-Version', '1.0.0');

  next();
}

/**
 * CORS configuration for production
 */
export function getCorsConfig() {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const isProduction = process.env.NODE_ENV === 'production';

  // In production, use strict whitelist
  const allowedOrigins = isProduction
    ? [
        frontendUrl,
        'https://bisman.com',
        'https://www.bisman.com',
        'https://app.bisman.com',
      ]
    : [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        frontendUrl,
      ];

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`⚠️  CORS blocked request from origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-ID',
      'X-Client-Version',
    ],
    exposedHeaders: ['X-Request-ID', 'X-API-Version'],
    maxAge: 86400, // 24 hours
  };
}

/**
 * Security audit logging middleware
 */
export function securityAuditLogger(req: Request, res: Response, next: NextFunction): void {
  // Log sensitive operations
  const sensitivePaths = ['/api/auth/login', '/api/auth/register', '/api/users/password'];
  const isSensitive = sensitivePaths.some((path) => req.path.includes(path));

  if (isSensitive) {
    console.log(`🔒 Security: ${req.method} ${req.path} from ${req.ip}`);
  }

  // Detect potential security threats
  const suspiciousPatterns = [
    /(\.\.|\/\/|%2e%2e)/i, // Path traversal
    /<script|javascript:/i, // XSS attempts
    /union.*select|select.*from/i, // SQL injection
    /\bor\b.*=.*\bor\b/i, // SQL injection
  ];

  const url = req.originalUrl || req.url;
  const isSuspicious = suspiciousPatterns.some((pattern) => pattern.test(url));

  if (isSuspicious) {
    console.warn(`🚨 Suspicious request detected: ${req.method} ${url} from ${req.ip}`);
    // In production, you might want to block these requests
    // return res.status(400).json({ error: 'Bad request' });
  }

  next();
}

/**
 * Rate limit bypass for health checks
 */
export function bypassRateLimitForHealthChecks(req: Request, res: Response, next: NextFunction): void {
  // Skip rate limiting for health check endpoints
  if (req.path === '/health' || req.path === '/api/health') {
    (req as any).skipRateLimit = true;
  }
  next();
}
