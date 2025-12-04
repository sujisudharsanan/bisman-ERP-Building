/**
 * Session Cache Service
 * 
 * Redis-backed session management with:
 * - Fast session lookups
 * - Automatic expiration
 * - Database fallback
 * - Session invalidation
 * 
 * @module cache/services/sessionCache
 */

const { redis, isEnabled } = require('../redisClient');
const { key, NS } = require('../namespaces');
const { getPrisma } = require('../../lib/prisma');
const crypto = require('crypto');

// Extend namespaces
const SESSION_NS = 'session';
const SESSION_USER_NS = 'session:user';

// TTL settings (in seconds)
const SESSION_TTL = 3600;        // 1 hour for active sessions
const SESSION_REFRESH_TTL = 86400 * 7;  // 7 days for refresh tokens

/**
 * Hash a session token for storage
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Create cache key for session
 */
function sessionKey(tokenHash) {
  return key(SESSION_NS, tokenHash);
}

/**
 * Create cache key for user sessions list
 */
function userSessionsKey(userId) {
  return key(SESSION_USER_NS, userId);
}

/**
 * Store a session in Redis
 */
async function setSession(tokenHash, sessionData, ttlSeconds = SESSION_TTL) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = sessionKey(tokenHash);
    const data = JSON.stringify({
      ...sessionData,
      cached_at: Date.now()
    });

    await redis.setex(cacheKey, ttlSeconds, data);

    // Add to user's session set
    if (sessionData.user_id) {
      const userKey = userSessionsKey(sessionData.user_id);
      await redis.sadd(userKey, tokenHash);
      await redis.expire(userKey, SESSION_REFRESH_TTL);
    }

    return true;
  } catch (error) {
    console.warn('[sessionCache] setSession error:', error.message);
    return false;
  }
}

/**
 * Get a session from Redis
 */
async function getSession(tokenHash) {
  if (!isEnabled()) {
    return null;
  }

  try {
    const cacheKey = sessionKey(tokenHash);
    const data = await redis.get(cacheKey);
    
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.warn('[sessionCache] getSession error:', error.message);
    return null;
  }
}

/**
 * Get session from cache, fallback to database
 */
async function getSessionWithFallback(token) {
  const tokenHash = hashToken(token);
  
  // Try Redis first
  let session = await getSession(tokenHash);
  
  if (session) {
    return { ...session, source: 'cache' };
  }

  // Fallback to database
  try {
    const prisma = getPrisma();
    const dbSession = await prisma.user_sessions.findFirst({
      where: {
        token_hash: tokenHash,
        is_active: true,
        expires_at: { gt: new Date() }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            tenant_id: true,
            super_admin_id: true
          }
        }
      }
    });

    if (dbSession) {
      // Cache for future lookups
      const sessionData = {
        id: dbSession.id,
        user_id: dbSession.user_id,
        user: dbSession.user,
        expires_at: dbSession.expires_at.toISOString(),
        is_active: dbSession.is_active
      };
      
      await setSession(tokenHash, sessionData);
      return { ...sessionData, source: 'database' };
    }
  } catch (error) {
    console.warn('[sessionCache] Database fallback error:', error.message);
  }

  return null;
}

/**
 * Invalidate a session
 */
async function invalidateSession(tokenHash) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = sessionKey(tokenHash);
    
    // Get session data to find user_id
    const session = await getSession(tokenHash);
    
    // Remove from cache
    await redis.del(cacheKey);
    
    // Remove from user's session set
    if (session?.user_id) {
      const userKey = userSessionsKey(session.user_id);
      await redis.srem(userKey, tokenHash);
    }

    return true;
  } catch (error) {
    console.warn('[sessionCache] invalidateSession error:', error.message);
    return false;
  }
}

/**
 * Invalidate all sessions for a user
 */
async function invalidateUserSessions(userId) {
  if (!isEnabled()) {
    return 0;
  }

  try {
    const userKey = userSessionsKey(userId);
    const tokenHashes = await redis.smembers(userKey);
    
    if (tokenHashes.length > 0) {
      // Delete all session keys
      const sessionKeys = tokenHashes.map(h => sessionKey(h));
      await redis.del(...sessionKeys);
    }
    
    // Delete the user sessions set
    await redis.del(userKey);
    
    return tokenHashes.length;
  } catch (error) {
    console.warn('[sessionCache] invalidateUserSessions error:', error.message);
    return 0;
  }
}

/**
 * Extend session TTL (on activity)
 */
async function touchSession(tokenHash, ttlSeconds = SESSION_TTL) {
  if (!isEnabled()) {
    return false;
  }

  try {
    const cacheKey = sessionKey(tokenHash);
    const result = await redis.expire(cacheKey, ttlSeconds);
    return result === 1;
  } catch (error) {
    console.warn('[sessionCache] touchSession error:', error.message);
    return false;
  }
}

/**
 * Get count of active sessions for a user
 */
async function getUserSessionCount(userId) {
  if (!isEnabled()) {
    return -1; // Unknown when cache disabled
  }

  try {
    const userKey = userSessionsKey(userId);
    return await redis.scard(userKey);
  } catch (error) {
    console.warn('[sessionCache] getUserSessionCount error:', error.message);
    return -1;
  }
}

module.exports = {
  hashToken,
  setSession,
  getSession,
  getSessionWithFallback,
  invalidateSession,
  invalidateUserSessions,
  touchSession,
  getUserSessionCount,
  SESSION_TTL,
  SESSION_REFRESH_TTL
};
