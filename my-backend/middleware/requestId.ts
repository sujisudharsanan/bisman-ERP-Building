/**
 * Request ID Middleware
 * Assigns a unique ID to each request for tracking and debugging
 * Adds X-Request-ID header to responses
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extend Express Request type to include id
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Middleware to add unique request ID to each request
 * - Checks for existing X-Request-ID header (from load balancer or client)
 * - Generates new UUID if not present
 * - Adds ID to request object and response header
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Use existing request ID from header or generate new one
  req.id = (req.headers['x-request-id'] as string) || uuidv4();
  
  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);
  
  next();
}

/**
 * Helper function to get formatted log prefix with request ID
 */
export function getLogPrefix(req: Request): string {
  return `[${req.id}]`;
}

/**
 * Enhanced logger that includes request ID
 */
export class RequestLogger {
  constructor(private req: Request) {}

  info(message: string, ...args: any[]): void {
    console.log(`${getLogPrefix(this.req)} ${message}`, ...args);
  }

  warn(message: string, ...args: any[]): void {
    console.warn(`${getLogPrefix(this.req)} ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`${getLogPrefix(this.req)} ${message}`, ...args);
  }

  debug(message: string, ...args: any[]): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`${getLogPrefix(this.req)} ${message}`, ...args);
    }
  }
}

/**
 * Attach logger to request object
 */
export function attachLogger(req: Request, res: Response, next: NextFunction): void {
  (req as any).logger = new RequestLogger(req);
  next();
}
