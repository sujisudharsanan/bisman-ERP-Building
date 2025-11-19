/**
 * Simple in-memory rate limiter for API endpoints
 * Production: Use Redis or similar distributed store
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the window
   */
  limit: number;
  
  /**
   * Time window in milliseconds
   */
  windowMs: number;
  
  /**
   * Identifier for this rate limit (usually IP or user ID)
   */
  identifier: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

/**
 * Check if a request is within rate limits
 */
export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs, identifier } = options;
  const now = Date.now();
  const key = identifier;
  
  let entry = store.get(key);
  
  // No entry or window expired - create new
  if (!entry || entry.resetAt < now) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    
    return {
      allowed: true,
      remaining: limit - 1,
      resetAt: entry.resetAt,
      limit,
    };
  }
  
  // Within window - increment count
  entry.count++;
  
  const allowed = entry.count <= limit;
  const remaining = Math.max(0, limit - entry.count);
  
  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    limit,
  };
}

/**
 * Get rate limit headers for HTTP response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };
}

/**
 * Helper function to apply rate limiting to an API route
 */
export function withRateLimit(
  identifier: string,
  options: Omit<RateLimitOptions, 'identifier'> = { limit: 10, windowMs: 60000 }
): RateLimitResult {
  return checkRateLimit({ ...options, identifier });
}
