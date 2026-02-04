/**
 * CACHE INVALIDATION SERVICE
 * ===========================
 * 
 * Manages cache invalidation signals for RBAC permission updates.
 * When EA/SA assigns pages to a role, this service:
 * 1. Updates a global version timestamp for the affected role
 * 2. Provides endpoints for clients to check if their cache is stale
 * 
 * This ensures that when RBAC assignments change, users with affected
 * roles will automatically get fresh permissions on next check.
 */

const { getPrisma } = require('../lib/prisma');

// In-memory cache of role versions (for fast lookup)
// Format: { 'ADMIN': timestamp, 'OPERATIONS_MANAGER': timestamp }
const roleVersionCache = new Map();

// Last global RBAC change timestamp
let globalRbacVersion = Date.now();

/**
 * Update the version timestamp for a role when its page assignments change
 * 
 * @param {string} roleName - The role whose assignments were updated
 * @param {string} assignerType - Who made the change (ENTERPRISE_ADMIN, SUPER_ADMIN, ADMIN)
 * @returns {Promise<number>} The new version timestamp
 */
async function updateRoleVersion(roleName, assignerType = 'UNKNOWN') {
  const normalizedRole = (roleName || '').toUpperCase();
  const newVersion = Date.now();
  
  // Update in-memory cache
  roleVersionCache.set(normalizedRole, newVersion);
  globalRbacVersion = newVersion;
  
  console.log(`[CacheInvalidation] Updated role version: ${normalizedRole} -> ${newVersion} (by ${assignerType})`);
  
  // Optionally persist to database for multi-instance deployment
  try {
    const prisma = getPrisma();
    
    // Upsert into a role_cache_versions table (create if doesn't exist)
    await prisma.$executeRaw`
      INSERT INTO role_cache_versions (role_name, version, updated_by, updated_at)
      VALUES (${normalizedRole}, ${newVersion}, ${assignerType}, NOW())
      ON CONFLICT (role_name) 
      DO UPDATE SET version = ${newVersion}, updated_by = ${assignerType}, updated_at = NOW()
    `.catch(() => {
      // Table might not exist yet, create it
      console.log('[CacheInvalidation] role_cache_versions table may not exist, continuing with in-memory only');
    });
  } catch (e) {
    // Non-fatal - in-memory cache is primary
    console.warn('[CacheInvalidation] DB persist failed (non-fatal):', e.message);
  }
  
  return newVersion;
}

/**
 * Get the current version for a role
 * 
 * @param {string} roleName - The role to check
 * @returns {Promise<number>} The version timestamp
 */
async function getRoleVersion(roleName) {
  const normalizedRole = (roleName || '').toUpperCase();
  
  // Check in-memory cache first
  if (roleVersionCache.has(normalizedRole)) {
    return roleVersionCache.get(normalizedRole);
  }
  
  // Try to get from database
  try {
    const prisma = getPrisma();
    const result = await prisma.$queryRaw`
      SELECT MAX(GREATEST(
        COALESCE(updated_at, created_at),
        COALESCE(granted_at, created_at),
        COALESCE(revoked_at, '1970-01-01'::timestamp)
      )) as last_changed
      FROM admin_page_assignments
      WHERE assignee_type = ${normalizedRole}
    `;
    
    if (result[0]?.last_changed) {
      const version = new Date(result[0].last_changed).getTime();
      roleVersionCache.set(normalizedRole, version);
      return version;
    }
  } catch (e) {
    console.warn('[CacheInvalidation] Failed to get role version from DB:', e.message);
  }
  
  // Default to 0 if no data
  return 0;
}

/**
 * Check if a cached timestamp is stale for a given role
 * 
 * @param {string} roleName - The role to check
 * @param {number} cachedAt - When the cache was created (timestamp)
 * @returns {Promise<{isStale: boolean, currentVersion: number}>}
 */
async function isCacheStale(roleName, cachedAt) {
  const currentVersion = await getRoleVersion(roleName);
  const isStale = cachedAt < currentVersion;
  
  return {
    isStale,
    currentVersion,
    cachedAt,
    reason: isStale ? 'ROLE_ASSIGNMENTS_UPDATED' : 'CACHE_VALID'
  };
}

/**
 * Invalidate cache for multiple roles at once
 * 
 * @param {string[]} roleNames - Array of role names to invalidate
 * @param {string} assignerType - Who triggered the invalidation
 * @returns {Promise<Object>} Map of role -> new version
 */
async function invalidateMultipleRoles(roleNames, assignerType = 'UNKNOWN') {
  const results = {};
  
  for (const role of roleNames) {
    results[role] = await updateRoleVersion(role, assignerType);
  }
  
  console.log(`[CacheInvalidation] Invalidated ${roleNames.length} roles by ${assignerType}`);
  return results;
}

/**
 * Get the global RBAC version (any role change)
 * 
 * @returns {number} The global version timestamp
 */
function getGlobalRbacVersion() {
  return globalRbacVersion;
}

/**
 * Clear all cached versions (for testing/admin use)
 */
function clearCache() {
  roleVersionCache.clear();
  globalRbacVersion = Date.now();
  console.log('[CacheInvalidation] Cache cleared');
}

module.exports = {
  updateRoleVersion,
  getRoleVersion,
  isCacheStale,
  invalidateMultipleRoles,
  getGlobalRbacVersion,
  clearCache
};
