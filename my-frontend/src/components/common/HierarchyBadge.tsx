/**
 * Hierarchy Badge Component
 * =========================
 * Displays a user's hierarchy level badge (L1–L10) for instant authority recognition.
 * 
 * IMPORTANT: This is a UI-ONLY component.
 * All RBAC and permission checks MUST use numeric authority levels on the backend.
 * 
 * @example
 * // Basic usage
 * <HierarchyBadge authorityLevel={60} />
 * 
 * // With tooltip
 * <HierarchyBadge authorityLevel={75} showTooltip />
 * 
 * // Compact mode for chat
 * <HierarchyBadge authorityLevel={70} variant="compact" />
 * 
 * // Full display with role info
 * <HierarchyBadge 
 *   authorityLevel={60} 
 *   roleKey="BRANCH_INCHARGE" 
 *   variant="full" 
 * />
 */

import React from 'react';
import {
  getHierarchyBadge,
  getHierarchyBadgeInfo,
  getRoleDisplayInfo,
  type HierarchyBadgeInfo,
  type RoleDisplayInfo,
} from '@/utils/roleDisplay';

// ============================================================================
// TYPES
// ============================================================================

export interface HierarchyBadgeProps {
  /** The user's numeric authority level (10-100) */
  authorityLevel: number;
  /** Optional internal role key for additional display info */
  roleKey?: string;
  /** Display variant */
  variant?: 'badge' | 'compact' | 'full' | 'inline';
  /** Whether to show tooltip on hover */
  showTooltip?: boolean;
  /** Custom class name */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// STYLES
// ============================================================================

const sizeStyles = {
  sm: {
    badge: 'text-[10px] px-1.5 py-0.5',
    text: 'text-xs',
  },
  md: {
    badge: 'text-xs px-2 py-0.5',
    text: 'text-sm',
  },
  lg: {
    badge: 'text-sm px-2.5 py-1',
    text: 'text-base',
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function HierarchyBadge({
  authorityLevel,
  roleKey,
  variant = 'badge',
  showTooltip = true,
  className = '',
  size = 'md',
}: HierarchyBadgeProps) {
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel);
  const roleInfo = roleKey ? getRoleDisplayInfo(roleKey, authorityLevel) : null;
  const sizeStyle = sizeStyles[size];

  const tooltipText = roleInfo
    ? `${roleInfo.displayName}\n${badgeInfo.level} – ${badgeInfo.meaning}\nLevel ${authorityLevel} | ${roleInfo.scope}`
    : `${badgeInfo.level} – ${badgeInfo.meaning}\nAuthority Level: ${authorityLevel}`;

  // Base badge element
  const BadgeElement = (
    <span
      className={`inline-flex items-center justify-center font-semibold rounded ${sizeStyle.badge} ${className}`}
      style={{ backgroundColor: badgeInfo.color, color: '#FFFFFF' }}
      title={showTooltip ? tooltipText : undefined}
    >
      {badgeInfo.level}
    </span>
  );

  // Render based on variant
  switch (variant) {
    case 'compact':
      // Just the badge, no additional text
      return BadgeElement;

    case 'inline':
      // Badge + level number
      return (
        <span className={`inline-flex items-center gap-1 ${className}`} title={showTooltip ? tooltipText : undefined}>
          {BadgeElement}
          <span className={`text-gray-500 ${sizeStyle.text}`}>
            Lv.{authorityLevel}
          </span>
        </span>
      );

    case 'full':
      // Full display with role name and scope
      if (!roleInfo) return BadgeElement;
      return (
        <div className={`flex flex-col ${className}`} title={showTooltip ? tooltipText : undefined}>
          <div className="flex items-center gap-2">
            {BadgeElement}
            <span className={`font-medium text-gray-900 dark:text-gray-100 ${sizeStyle.text}`}>
              {roleInfo.displayName}
            </span>
          </div>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Level {authorityLevel} | {roleInfo.scope}
          </span>
        </div>
      );

    case 'badge':
    default:
      return BadgeElement;
  }
}

// ============================================================================
// COMPOUND COMPONENTS
// ============================================================================

/**
 * User avatar with hierarchy badge overlay.
 */
export interface UserAvatarWithBadgeProps {
  /** User's name for initials */
  userName: string;
  /** User's authority level */
  authorityLevel: number;
  /** Optional avatar image URL */
  avatarUrl?: string;
  /** Size of the avatar */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class name */
  className?: string;
}

const avatarSizes = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

const badgeSizes = {
  sm: 'text-[8px] px-1 py-0',
  md: 'text-[10px] px-1 py-0.5',
  lg: 'text-xs px-1.5 py-0.5',
};

export function UserAvatarWithBadge({
  userName,
  authorityLevel,
  avatarUrl,
  size = 'md',
  className = '',
}: UserAvatarWithBadgeProps) {
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel);
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`relative inline-flex ${className}`}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={userName}
          className={`rounded-full object-cover ${avatarSizes[size]}`}
        />
      ) : (
        <div
          className={`rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-medium text-gray-600 dark:text-gray-300 ${avatarSizes[size]}`}
        >
          {initials}
        </div>
      )}
      <span
        className={`absolute -bottom-1 -right-1 font-bold rounded ${badgeSizes[size]}`}
        style={{ backgroundColor: badgeInfo.color, color: '#FFFFFF' }}
        title={`${badgeInfo.level} – ${badgeInfo.meaning}`}
      >
        {badgeInfo.level}
      </span>
    </div>
  );
}

/**
 * Full role display card for profile views.
 */
export interface RoleDisplayCardProps {
  /** Internal role key */
  roleKey: string;
  /** Authority level */
  authorityLevel: number;
  /** Whether the user has an authority override */
  hasOverride?: boolean;
  /** Override end date if applicable */
  overrideEndDate?: string | null;
  /** Additional class name */
  className?: string;
}

export function RoleDisplayCard({
  roleKey,
  authorityLevel,
  hasOverride = false,
  overrideEndDate,
  className = '',
}: RoleDisplayCardProps) {
  const roleInfo = getRoleDisplayInfo(roleKey, authorityLevel);
  const badgeInfo = getHierarchyBadgeInfo(authorityLevel);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        {/* Badge */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: badgeInfo.color }}
        >
          {badgeInfo.level}
        </div>

        {/* Info */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {roleInfo.displayName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Level {authorityLevel} | {roleInfo.scope}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
            {badgeInfo.meaning}
          </p>
          
          {hasOverride && (
            <div className="mt-2 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-700 dark:text-amber-300">
              🔒 Authority Override Active
              {overrideEndDate && (
                <span className="ml-1">
                  (Expires: {new Date(overrideEndDate).toLocaleDateString()})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Hierarchy legend component for help/documentation pages.
 */
export function HierarchyLegend({ className = '' }: { className?: string }) {
  const levels = [
    { key: 'L1', range: '10-19', roles: 'Viewer' },
    { key: 'L2', range: '20-29', roles: 'Staff' },
    { key: 'L3', range: '30-39', roles: 'Executive' },
    { key: 'L4', range: '40-49', roles: 'Store In-Charge' },
    { key: 'L5', range: '50-59', roles: 'Hub In-Charge' },
    { key: 'L6', range: '60-69', roles: 'Branch Manager' },
    { key: 'L7', range: '70-79', roles: 'Department Manager, Regional Manager' },
    { key: 'L8', range: '80-84', roles: 'Operations Manager' },
    { key: 'L9', range: '85-89', roles: 'Finance Controller' },
    { key: 'L10', range: '90-100', roles: 'Admin, Super Admin' },
  ];

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">
        Hierarchy Levels
      </h3>
      <div className="space-y-2">
        {levels.map(({ key, range, roles }) => {
          // Get badge info for this level
          const midLevel = parseInt(range.split('-')[0]) + 5;
          const badgeInfo = getHierarchyBadgeInfo(midLevel);
          
          return (
            <div key={key} className="flex items-center gap-3">
              <span
                className="w-10 text-center font-bold text-white text-xs py-1 rounded"
                style={{ backgroundColor: badgeInfo.color }}
              >
                {key}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400 w-16">
                {range}
              </span>
              <span className="text-sm text-gray-900 dark:text-gray-100">
                {roles}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default HierarchyBadge;
