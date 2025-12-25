/**
 * Unified Authority Level System
 * ===============================
 * Single source of truth for role/authority hierarchy (10-100 scale)
 * 
 * USAGE:
 *   const { getEffectiveAuthorityLevel, canApprove, AUTHORITY_LEVELS } = require('./authorityLevel');
 *   const level = await getEffectiveAuthorityLevel(userId);
 *   const canApproveTask = await canApprove(approverId, creatorId, 60);
 */

const { getPool } = require('./database');

// ============================================================================
// AUTHORITY LEVELS CONSTANT (10-100 scale)
// ============================================================================

const AUTHORITY_LEVELS = {
  VIEWER: 10,
  STAFF: 20,
  USER: 20,
  ACCOUNTANT: 30,
  HR_EXECUTIVE: 30,
  STORE_INCHARGE: 40,
  HUB_INCHARGE: 55,
  BRANCH_INCHARGE: 60,
  MANAGER: 70,
  FINANCE_MANAGER: 70,
  HR_MANAGER: 70,
  BRANCH_MANAGER: 75,
  OPERATIONS_MANAGER: 80,
  FINANCE_CONTROLLER: 85,
  CFO: 85,
  ADMIN: 90,
  SUPER_ADMIN: 100,
};

// Tier thresholds
const TIER_THRESHOLDS = {
  EXECUTIVE: 90,    // Super Admin, Admin
  MANAGER: 70,      // Manager, Branch Manager, Finance Manager, HR Manager
  SENIOR: 50,       // Accounts, Hub Incharge
  OFFICER: 30,      // Accountant, HR Executive
  STAFF: 20,        // Staff, User
  VIEWER: 10,       // Viewer
};

// ============================================================================
// ROLE DISPLAY MAPPING (UI-ONLY - Does NOT affect RBAC logic)
// ============================================================================

/**
 * Maps internal role keys to user-friendly display names.
 * This is a DISPLAY LAYER ONLY - all permission checks use numeric authority levels.
 */
const ROLE_DISPLAY_MAP = {
  VIEWER: { displayName: 'Viewer', scope: 'Read-only' },
  STAFF: { displayName: 'Staff', scope: 'Execution' },
  USER: { displayName: 'Staff', scope: 'Execution' },
  ACCOUNTANT: { displayName: 'Executive', scope: 'Functional' },
  HR_EXECUTIVE: { displayName: 'Executive', scope: 'Functional' },
  STORE_INCHARGE: { displayName: 'Store In-Charge', scope: 'Single store' },
  HUB_INCHARGE: { displayName: 'Hub In-Charge', scope: 'Multi-store hub' },
  BRANCH_INCHARGE: { displayName: 'Branch Manager', scope: 'Single branch' },
  MANAGER: { displayName: 'Manager', scope: 'Functional authority' },
  FINANCE_MANAGER: { displayName: 'Finance Manager', scope: 'Finance department' },
  HR_MANAGER: { displayName: 'HR Manager', scope: 'HR department' },
  BRANCH_MANAGER: { displayName: 'Regional Manager', scope: 'Multi-branch' },
  OPERATIONS_MANAGER: { displayName: 'General Manager', scope: 'Cross-region' },
  FINANCE_CONTROLLER: { displayName: 'Finance Controller', scope: 'Financial oversight' },
  CFO: { displayName: 'Finance Controller', scope: 'Financial oversight' },
  ADMIN: { displayName: 'Admin', scope: 'System admin' },
  SUPER_ADMIN: { displayName: 'Super Admin', scope: 'Platform owner' },
};

// ============================================================================
// HIERARCHY BADGE SYSTEM (L1–L10) - Informational Only
// ============================================================================

/**
 * Badge metadata for each hierarchy level.
 * Used for UI display - does NOT affect permission checks.
 */
const HIERARCHY_BADGES = {
  L1: { level: 'L1', range: '0-19', meaning: 'Observer', color: '#6B7280' },      // Gray
  L2: { level: 'L2', range: '20-29', meaning: 'Executor', color: '#10B981' },     // Green
  L3: { level: 'L3', range: '30-39', meaning: 'Functional Executive', color: '#3B82F6' }, // Blue
  L4: { level: 'L4', range: '40-49', meaning: 'Store Lead', color: '#8B5CF6' },   // Purple
  L5: { level: 'L5', range: '50-59', meaning: 'Hub Lead', color: '#F59E0B' },     // Amber
  L6: { level: 'L6', range: '60-69', meaning: 'Branch Head', color: '#EF4444' },  // Red
  L7: { level: 'L7', range: '70-79', meaning: 'Senior Manager', color: '#EC4899' }, // Pink
  L8: { level: 'L8', range: '80-84', meaning: 'Operations Head', color: '#14B8A6' }, // Teal
  L9: { level: 'L9', range: '85-89', meaning: 'Executive Leadership', color: '#F97316' }, // Orange
  L10: { level: 'L10', range: '90-100', meaning: 'System Authority', color: '#991B1B' }, // Dark Red
};

/**
 * Get the hierarchy badge (L1–L10) based on authority level.
 * This is purely informational for UI display.
 * 
 * @param {number} authorityLevel - The numeric authority level (10-100)
 * @returns {string} - The badge label (L1-L10)
 */
function getHierarchyBadge(authorityLevel) {
  if (authorityLevel < 20) return 'L1';
  if (authorityLevel < 30) return 'L2';
  if (authorityLevel < 40) return 'L3';
  if (authorityLevel < 50) return 'L4';
  if (authorityLevel < 60) return 'L5';
  if (authorityLevel < 70) return 'L6';
  if (authorityLevel < 80) return 'L7';
  if (authorityLevel < 85) return 'L8';
  if (authorityLevel < 90) return 'L9';
  return 'L10';
}

/**
 * Get full badge info including metadata.
 * 
 * @param {number} authorityLevel - The numeric authority level
 * @returns {object} - Badge metadata { level, range, meaning, color }
 */
function getHierarchyBadgeInfo(authorityLevel) {
  const badge = getHierarchyBadge(authorityLevel);
  return HIERARCHY_BADGES[badge];
}

/**
 * Get comprehensive role display information for UI rendering.
 * This function consolidates all display-related information.
 * 
 * @param {string} roleKey - The internal role key (e.g., 'BRANCH_INCHARGE')
 * @param {number} authorityLevel - The numeric authority level (10-100)
 * @returns {object} - Complete display info for UI
 */
function getRoleDisplayInfo(roleKey, authorityLevel) {
  const normalizedKey = roleKey ? roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_') : 'STAFF';
  const displayInfo = ROLE_DISPLAY_MAP[normalizedKey] || { displayName: roleKey || 'Staff', scope: 'Unknown' };
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel || 20);
  
  return {
    // Internal (do not use for RBAC)
    internalKey: normalizedKey,
    
    // Display properties
    displayName: displayInfo.displayName,
    scope: displayInfo.scope,
    
    // Hierarchy badge
    badge: badgeInfo.level,
    badgeMeaning: badgeInfo.meaning,
    badgeColor: badgeInfo.color,
    
    // Authority level (this IS used for RBAC)
    authorityLevel: authorityLevel || AUTHORITY_LEVELS[normalizedKey] || 20,
    
    // Formatted strings for UI
    formatted: `${displayInfo.displayName}`,
    formattedWithLevel: `${displayInfo.displayName} (Level ${authorityLevel || 20})`,
    formattedFull: `${displayInfo.displayName}\n${badgeInfo.level} | Level ${authorityLevel || 20} | ${displayInfo.scope}`,
    
    // Tooltip text
    tooltip: `${badgeInfo.level} – ${badgeInfo.meaning}\nCan approve tasks from L1–${badgeInfo.level.replace('L', '')}`,
  };
}

/**
 * Get display name for a role key.
 * Simple helper for cases where only the display name is needed.
 * 
 * @param {string} roleKey - The internal role key
 * @returns {string} - The user-friendly display name
 */
function getRoleDisplayName(roleKey) {
  const normalizedKey = roleKey ? roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_') : 'STAFF';
  return ROLE_DISPLAY_MAP[normalizedKey]?.displayName || roleKey || 'Staff';
}

/**
 * Get scope description for a role key.
 * 
 * @param {string} roleKey - The internal role key
 * @returns {string} - The scope description
 */
function getRoleScope(roleKey) {
  const normalizedKey = roleKey ? roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_') : 'STAFF';
  return ROLE_DISPLAY_MAP[normalizedKey]?.scope || 'Unknown';
}

// ============================================================================
// GET EFFECTIVE AUTHORITY LEVEL
// ============================================================================

/**
 * Get the effective authority level for a user.
 * Uses authority_override_level if active and not expired, else uses role level.
 * 
 * @param {number} userId - The user's ID
 * @returns {Promise<number>} - The effective authority level (10-100)
 */
async function getEffectiveAuthorityLevel(userId) {
  if (!userId) return AUTHORITY_LEVELS.VIEWER;

  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT 
        COALESCE(r.level, 20) AS role_level,
        u.authority_override_level,
        u.override_end_date
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = $1
    `, [userId]);

    if (result.rows.length === 0) {
      return AUTHORITY_LEVELS.VIEWER;
    }

    const { role_level, authority_override_level, override_end_date } = result.rows[0];

    // Check if override is active and not expired
    if (authority_override_level !== null) {
      if (!override_end_date || new Date(override_end_date) > new Date()) {
        return authority_override_level;
      }
    }

    return role_level || AUTHORITY_LEVELS.STAFF;
  } catch (error) {
    console.error('Error getting effective authority level:', error);
    return AUTHORITY_LEVELS.VIEWER;
  }
}

/**
 * Get effective authority level from user object (no DB query needed if data is present)
 * 
 * @param {object} user - User object with role_level and override fields
 * @returns {number} - The effective authority level
 */
function getEffectiveAuthorityLevelFromUser(user) {
  if (!user) return AUTHORITY_LEVELS.VIEWER;

  const roleLevel = user.role_level || user.roleLevel || AUTHORITY_LEVELS.STAFF;
  const overrideLevel = user.authority_override_level || user.authorityOverrideLevel;
  const overrideEnd = user.override_end_date || user.overrideEndDate;

  // Check if override is active and not expired
  if (overrideLevel !== null && overrideLevel !== undefined) {
    if (!overrideEnd || new Date(overrideEnd) > new Date()) {
      return overrideLevel;
    }
  }

  return roleLevel;
}

// ============================================================================
// APPROVAL AUTHORITY CHECKS
// ============================================================================

/**
 * Check if an approver can approve a request from a creator.
 * Approver must have higher level than creator AND meet minimum required level.
 * 
 * @param {number} approverId - The approver's user ID
 * @param {number} creatorId - The request creator's user ID
 * @param {number} minRequiredLevel - Minimum required authority level (default: 0)
 * @returns {Promise<boolean>}
 */
async function canApprove(approverId, creatorId, minRequiredLevel = 0) {
  const [approverLevel, creatorLevel] = await Promise.all([
    getEffectiveAuthorityLevel(approverId),
    getEffectiveAuthorityLevel(creatorId),
  ]);

  return approverLevel > creatorLevel && approverLevel >= minRequiredLevel;
}

/**
 * Check if a user has at least the minimum required authority level.
 * 
 * @param {number} userId - The user's ID
 * @param {number} minLevel - Minimum required level
 * @returns {Promise<boolean>}
 */
async function hasMinimumAuthority(userId, minLevel) {
  const effectiveLevel = await getEffectiveAuthorityLevel(userId);
  return effectiveLevel >= minLevel;
}

/**
 * Check if a user can approve payments (level >= 70)
 * @param {number} userId 
 * @returns {Promise<boolean>}
 */
async function canApprovePayments(userId) {
  return hasMinimumAuthority(userId, TIER_THRESHOLDS.MANAGER);
}

/**
 * Check if a user can approve tasks (level >= 60)
 * @param {number} userId 
 * @returns {Promise<boolean>}
 */
async function canApproveTasks(userId) {
  return hasMinimumAuthority(userId, AUTHORITY_LEVELS.BRANCH_INCHARGE);
}

/**
 * Check if user is admin level (level >= 90)
 * @param {number} userId 
 * @returns {Promise<boolean>}
 */
async function isAdmin(userId) {
  return hasMinimumAuthority(userId, TIER_THRESHOLDS.EXECUTIVE);
}

// ============================================================================
// ESCALATION
// ============================================================================

/**
 * Get the next escalation level (next higher level that exists)
 * 
 * @param {number} currentLevel - Current authority level
 * @returns {Promise<number>}
 */
async function getNextEscalationLevel(currentLevel) {
  const pool = getPool();
  
  try {
    const result = await pool.query(`
      SELECT MIN(level) as next_level
      FROM roles
      WHERE level > $1
      AND is_active = true
    `, [currentLevel]);

    return result.rows[0]?.next_level || AUTHORITY_LEVELS.ADMIN;
  } catch (error) {
    console.error('Error getting next escalation level:', error);
    return AUTHORITY_LEVELS.ADMIN;
  }
}

/**
 * Get users at or above a specific authority level (for escalation)
 * 
 * @param {number} minLevel - Minimum authority level required
 * @param {object} options - Additional filters
 * @returns {Promise<Array>}
 */
async function getUsersAtOrAboveLevel(minLevel, options = {}) {
  const pool = getPool();
  const { excludeUserId, limit = 10 } = options;
  
  try {
    let query = `
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        r.name as role_name,
        r.level as role_level,
        u.authority_override_level,
        u.override_end_date,
        CASE 
          WHEN u.authority_override_level IS NOT NULL 
               AND (u.override_end_date IS NULL OR u.override_end_date > NOW())
          THEN u.authority_override_level
          ELSE COALESCE(r.level, 20)
        END as effective_level
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.status = 'active'
        AND CASE 
          WHEN u.authority_override_level IS NOT NULL 
               AND (u.override_end_date IS NULL OR u.override_end_date > NOW())
          THEN u.authority_override_level
          ELSE COALESCE(r.level, 20)
        END >= $1
    `;

    const params = [minLevel];
    let paramIndex = 2;

    if (excludeUserId) {
      query += ` AND u.id != $${paramIndex}`;
      params.push(excludeUserId);
      paramIndex++;
    }

    query += ` ORDER BY effective_level DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Error getting users at or above level:', error);
    return [];
  }
}

// ============================================================================
// AUTHORITY OVERRIDE MANAGEMENT
// ============================================================================

/**
 * Grant an authority override to a user (ADMIN+ only)
 * 
 * @param {object} params
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function grantAuthorityOverride({ 
  userId, 
  newLevel, 
  startDate, 
  endDate, 
  reason, 
  grantedBy 
}) {
  const pool = getPool();
  
  try {
    // Check granter's level
    const granterLevel = await getEffectiveAuthorityLevel(grantedBy);
    
    if (granterLevel < AUTHORITY_LEVELS.ADMIN) {
      return { success: false, error: 'Only ADMIN+ can grant authority overrides' };
    }
    
    if (newLevel > granterLevel) {
      return { success: false, error: 'Cannot grant higher authority than your own level' };
    }

    // Get current state for audit
    const currentResult = await pool.query(
      'SELECT authority_override_level, role FROM users WHERE id = $1',
      [userId]
    );
    const previousLevel = currentResult.rows[0]?.authority_override_level;

    // Get granter info for audit
    const granterResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [grantedBy]
    );
    const granterRole = granterResult.rows[0]?.role;

    // Update user
    await pool.query(`
      UPDATE users SET
        authority_override_level = $1,
        override_start_date = $2,
        override_end_date = $3,
        override_reason = $4,
        override_granted_by = $5,
        updated_at = NOW()
      WHERE id = $6
    `, [newLevel, startDate, endDate, reason, grantedBy, userId]);

    // Log to audit
    await pool.query(`
      INSERT INTO authority_override_audit (
        user_id, action, previous_override_level, new_override_level,
        override_start_date, override_end_date, override_reason,
        granted_by, granted_by_role, granted_by_level
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      userId,
      previousLevel === null ? 'GRANTED' : 'MODIFIED',
      previousLevel,
      newLevel,
      startDate,
      endDate,
      reason,
      grantedBy,
      granterRole,
      granterLevel
    ]);

    return { success: true };
  } catch (error) {
    console.error('Error granting authority override:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Revoke an authority override from a user (ADMIN+ only)
 * 
 * @param {object} params
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function revokeAuthorityOverride({ userId, revokedBy, reason }) {
  const pool = getPool();
  
  try {
    const revokerLevel = await getEffectiveAuthorityLevel(revokedBy);
    
    if (revokerLevel < AUTHORITY_LEVELS.ADMIN) {
      return { success: false, error: 'Only ADMIN+ can revoke authority overrides' };
    }

    // Get current state for audit
    const currentResult = await pool.query(
      'SELECT authority_override_level, role FROM users WHERE id = $1',
      [userId]
    );
    const previousLevel = currentResult.rows[0]?.authority_override_level;

    // Get revoker info
    const revokerResult = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [revokedBy]
    );
    const revokerRole = revokerResult.rows[0]?.role;

    // Clear override
    await pool.query(`
      UPDATE users SET
        authority_override_level = NULL,
        override_start_date = NULL,
        override_end_date = NULL,
        override_reason = NULL,
        override_granted_by = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [userId]);

    // Log to audit
    await pool.query(`
      INSERT INTO authority_override_audit (
        user_id, action, previous_override_level, new_override_level,
        override_reason, granted_by, granted_by_role, granted_by_level
      ) VALUES ($1, 'REVOKED', $2, NULL, $3, $4, $5, $6)
    `, [userId, previousLevel, reason, revokedBy, revokerRole, revokerLevel]);

    return { success: true };
  } catch (error) {
    console.error('Error revoking authority override:', error);
    return { success: false, error: error.message };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get tier name for an authority level
 * @param {number} level 
 * @returns {string}
 */
function getTierForLevel(level) {
  if (level >= TIER_THRESHOLDS.EXECUTIVE) return 'EXECUTIVE';
  if (level >= TIER_THRESHOLDS.MANAGER) return 'MANAGER';
  if (level >= TIER_THRESHOLDS.SENIOR) return 'SENIOR';
  if (level >= TIER_THRESHOLDS.OFFICER) return 'OFFICER';
  if (level >= TIER_THRESHOLDS.STAFF) return 'STAFF';
  return 'VIEWER';
}

/**
 * Normalize role name to authority level
 * @param {string} roleName 
 * @returns {number}
 */
function roleNameToLevel(roleName) {
  if (!roleName) return AUTHORITY_LEVELS.STAFF;
  
  const normalized = roleName.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return AUTHORITY_LEVELS[normalized] || AUTHORITY_LEVELS.STAFF;
}

/**
 * Get the display label for a level
 * Uses the new canonical display names for consistency.
 * @param {number} level 
 * @returns {string}
 */
function getLevelLabel(level) {
  // Updated to use canonical display names
  const labels = {
    100: 'Super Admin',
    90: 'Admin',
    85: 'Finance Controller',        // CFO / Finance Controller
    80: 'General Manager',           // Was: Operations Manager
    75: 'Regional Manager',          // Multi-branch authority
    70: 'Manager',                   // Was: Department Manager
    60: 'Branch Manager',            // Was: Branch Incharge
    55: 'Hub In-Charge',
    40: 'Store In-Charge',
    30: 'Executive',                 // Was: Officer
    20: 'Staff',
    10: 'Viewer',
  };
  
  // Find closest label
  const sortedKeys = Object.keys(labels).map(Number).sort((a, b) => b - a);
  for (const key of sortedKeys) {
    if (level >= key) return labels[key];
  }
  return 'Viewer';
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Constants
  AUTHORITY_LEVELS,
  TIER_THRESHOLDS,
  ROLE_DISPLAY_MAP,
  HIERARCHY_BADGES,
  
  // Core functions
  getEffectiveAuthorityLevel,
  getEffectiveAuthorityLevelFromUser,
  
  // Approval checks
  canApprove,
  hasMinimumAuthority,
  canApprovePayments,
  canApproveTasks,
  isAdmin,
  
  // Escalation
  getNextEscalationLevel,
  getUsersAtOrAboveLevel,
  
  // Override management
  grantAuthorityOverride,
  revokeAuthorityOverride,
  
  // Utilities
  getTierForLevel,
  roleNameToLevel,
  getLevelLabel,
  
  // Display helpers (UI-ONLY - do not use for RBAC)
  getHierarchyBadge,
  getHierarchyBadgeInfo,
  getRoleDisplayInfo,
  getRoleDisplayName,
  getRoleScope,
};
