/**
 * Role Display Utility
 * ====================
 * UI-only display layer for role names and hierarchy badges.
 * 
 * IMPORTANT: This is purely for display purposes.
 * All RBAC and permission checks MUST use numeric authority levels.
 * 
 * @example
 * import { getRoleDisplayInfo, getHierarchyBadge } from '@/utils/roleDisplay';
 * 
 * const info = getRoleDisplayInfo('BRANCH_INCHARGE', 60);
 * console.log(info.displayName); // "Branch Manager"
 * console.log(info.badge);       // "L6"
 */

// ============================================================================
// AUTHORITY LEVELS CONSTANT (Mirror of backend - for reference only)
// ============================================================================

export const AUTHORITY_LEVELS = {
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
} as const;

export type AuthorityLevelKey = keyof typeof AUTHORITY_LEVELS;

// ============================================================================
// ROLE DISPLAY MAPPING (UI-ONLY)
// ============================================================================

export interface RoleDisplayEntry {
  displayName: string;
  scope: string;
}

/**
 * Maps internal role keys to user-friendly display names.
 * This is a DISPLAY LAYER ONLY - all permission checks use numeric authority levels.
 */
export const ROLE_DISPLAY_MAP: Record<string, RoleDisplayEntry> = {
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
// HIERARCHY BADGE SYSTEM (L1–L10)
// ============================================================================

export interface HierarchyBadgeInfo {
  level: string;
  range: string;
  meaning: string;
  color: string;
}

/**
 * Badge metadata for each hierarchy level.
 * Color intensities increase with authority level.
 */
export const HIERARCHY_BADGES: Record<string, HierarchyBadgeInfo> = {
  L1: { level: 'L1', range: '0-19', meaning: 'Observer', color: '#6B7280' },        // Gray
  L2: { level: 'L2', range: '20-29', meaning: 'Executor', color: '#10B981' },       // Green
  L3: { level: 'L3', range: '30-39', meaning: 'Functional Executive', color: '#3B82F6' }, // Blue
  L4: { level: 'L4', range: '40-49', meaning: 'Store Lead', color: '#8B5CF6' },     // Purple
  L5: { level: 'L5', range: '50-59', meaning: 'Hub Lead', color: '#F59E0B' },       // Amber
  L6: { level: 'L6', range: '60-69', meaning: 'Branch Head', color: '#EF4444' },    // Red
  L7: { level: 'L7', range: '70-79', meaning: 'Senior Manager', color: '#EC4899' }, // Pink
  L8: { level: 'L8', range: '80-84', meaning: 'Operations Head', color: '#14B8A6' }, // Teal
  L9: { level: 'L9', range: '85-89', meaning: 'Executive Leadership', color: '#F97316' }, // Orange
  L10: { level: 'L10', range: '90-100', meaning: 'System Authority', color: '#991B1B' }, // Dark Red
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the hierarchy badge (L1–L10) based on authority level.
 * This is purely informational for UI display.
 * 
 * @param authorityLevel - The numeric authority level (10-100)
 * @returns The badge label (L1-L10)
 */
export function getHierarchyBadge(authorityLevel: number): string {
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
 * @param authorityLevel - The numeric authority level
 * @returns Badge metadata { level, range, meaning, color }
 */
export function getHierarchyBadgeInfo(authorityLevel: number): HierarchyBadgeInfo {
  const badge = getHierarchyBadge(authorityLevel);
  return HIERARCHY_BADGES[badge];
}

/**
 * Complete role display information for UI rendering.
 */
export interface RoleDisplayInfo {
  // Internal (do not use for RBAC)
  internalKey: string;
  
  // Display properties
  displayName: string;
  scope: string;
  
  // Hierarchy badge
  badge: string;
  badgeMeaning: string;
  badgeColor: string;
  
  // Authority level (this IS used for RBAC)
  authorityLevel: number;
  
  // Formatted strings for UI
  formatted: string;
  formattedWithLevel: string;
  formattedFull: string;
  
  // Tooltip text
  tooltip: string;
}

/**
 * Get comprehensive role display information for UI rendering.
 * This function consolidates all display-related information.
 * 
 * @param roleKey - The internal role key (e.g., 'BRANCH_INCHARGE')
 * @param authorityLevel - The numeric authority level (10-100)
 * @returns Complete display info for UI
 */
export function getRoleDisplayInfo(roleKey: string | null | undefined, authorityLevel: number): RoleDisplayInfo {
  const normalizedKey = roleKey 
    ? roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_') 
    : 'STAFF';
  
  const displayInfo = ROLE_DISPLAY_MAP[normalizedKey] || { 
    displayName: roleKey || 'Staff', 
    scope: 'Unknown' 
  };
  
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel || 20);
  const effectiveLevel = authorityLevel || AUTHORITY_LEVELS[normalizedKey as AuthorityLevelKey] || 20;
  
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
    authorityLevel: effectiveLevel,
    
    // Formatted strings for UI
    formatted: displayInfo.displayName,
    formattedWithLevel: `${displayInfo.displayName} (Level ${effectiveLevel})`,
    formattedFull: `${displayInfo.displayName}\n${badgeInfo.level} | Level ${effectiveLevel} | ${displayInfo.scope}`,
    
    // Tooltip text
    tooltip: `${badgeInfo.level} – ${badgeInfo.meaning}\nCan approve tasks from L1–L${parseInt(badgeInfo.level.replace('L', '')) - 1 || 1}`,
  };
}

/**
 * Get display name for a role key.
 * Simple helper for cases where only the display name is needed.
 * 
 * @param roleKey - The internal role key
 * @returns The user-friendly display name
 */
export function getRoleDisplayName(roleKey: string | null | undefined): string {
  if (!roleKey) return 'Staff';
  const normalizedKey = roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return ROLE_DISPLAY_MAP[normalizedKey]?.displayName || roleKey;
}

/**
 * Get scope description for a role key.
 * 
 * @param roleKey - The internal role key
 * @returns The scope description
 */
export function getRoleScope(roleKey: string | null | undefined): string {
  if (!roleKey) return 'Unknown';
  const normalizedKey = roleKey.toUpperCase().replace(/\s+/g, '_').replace(/-/g, '_');
  return ROLE_DISPLAY_MAP[normalizedKey]?.scope || 'Unknown';
}

/**
 * Get the display label for an authority level.
 * Uses the canonical display names.
 * 
 * @param level - The numeric authority level
 * @returns The display label
 */
export function getLevelLabel(level: number): string {
  const labels: Record<number, string> = {
    100: 'Super Admin',
    90: 'Admin',
    85: 'Finance Controller',
    80: 'General Manager',
    75: 'Regional Manager',
    70: 'Manager',
    60: 'Branch Manager',
    55: 'Hub In-Charge',
    40: 'Store In-Charge',
    30: 'Executive',
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
// REACT COMPONENT HELPERS
// ============================================================================

/**
 * Get badge styles for inline rendering.
 * 
 * @param authorityLevel - The numeric authority level
 * @returns CSS styles object for badge
 */
export function getBadgeStyles(authorityLevel: number): React.CSSProperties {
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel);
  return {
    backgroundColor: badgeInfo.color,
    color: '#FFFFFF',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
  };
}

/**
 * Format user info for compact display in chat/lists.
 * 
 * @param userName - The user's display name
 * @param authorityLevel - The numeric authority level
 * @returns Formatted string like "Ramesh (L6)"
 */
export function formatCompactUser(userName: string, authorityLevel: number): string {
  const badge = getHierarchyBadge(authorityLevel);
  return `${userName} (${badge})`;
}

/**
 * Check if user A can approve requests from user B (based on authority level only).
 * This is a helper for UI display hints - actual permission checks happen on backend.
 * 
 * @param approverLevel - Approver's authority level
 * @param requesterLevel - Requester's authority level
 * @returns True if approver can approve requester's requests
 */
export function canApproveHint(approverLevel: number, requesterLevel: number): boolean {
  return approverLevel > requesterLevel;
}
