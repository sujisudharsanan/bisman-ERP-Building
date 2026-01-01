'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface UsageMeterProps {
  resourceName: string;
  used: number;
  allowed: number | 'unlimited';
  unit?: string;
  icon?: React.ReactNode;
  showRemaining?: boolean;
}

/**
 * UsageMeter Component
 * 
 * Displays resource usage with progress bar following color rules:
 * - <70% → Green
 * - 70–90% → Amber
 * - >90% → Red
 * - Exceeded → Hard red + warning icon
 */
export function UsageMeter({
  resourceName,
  used,
  allowed,
  unit = '',
  icon,
  showRemaining = true,
}: UsageMeterProps) {
  const isUnlimited = allowed === 'unlimited' || allowed === -1;
  const numericAllowed = isUnlimited ? Infinity : (allowed as number);
  const percentage = isUnlimited ? 0 : Math.min((used / numericAllowed) * 100, 100);
  const isExceeded = !isUnlimited && used > numericAllowed;
  const remaining = isUnlimited ? 'unlimited' : Math.max(0, numericAllowed - used);

  // Color rules
  const getColorClass = () => {
    if (isExceeded) return 'bg-red-600';
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getTextColorClass = () => {
    if (isExceeded) return 'text-red-600 dark:text-red-400';
    if (percentage >= 90) return 'text-red-600 dark:text-red-400';
    if (percentage >= 70) return 'text-amber-600 dark:text-amber-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBadgeClass = () => {
    if (isExceeded) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (percentage >= 90) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (percentage >= 70) return 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300';
    return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {resourceName}
          </span>
        </div>
        {isExceeded && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Exceeded</span>
          </div>
        )}
      </div>

      {/* Usage Numbers */}
      <div className="flex items-baseline gap-1 mb-2">
        <span className={`text-2xl font-bold ${getTextColorClass()}`}>
          {used.toLocaleString()}{unit && <span className="text-sm ml-0.5">{unit}</span>}
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-sm">
          / {isUnlimited ? '∞' : `${numericAllowed.toLocaleString()}${unit}`}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getColorClass()}`}
          style={{ width: `${isUnlimited ? 0 : Math.min(percentage, 100)}%` }}
        />
      </div>

      {/* Footer - Remaining & Status */}
      <div className="flex items-center justify-between">
        {showRemaining && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {isUnlimited
              ? 'Unlimited'
              : `${remaining.toLocaleString()} remaining`}
          </span>
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getBadgeClass()}`}>
          {isUnlimited ? 'Unlimited' : isExceeded ? 'Over Limit' : `${Math.round(percentage)}%`}
        </span>
      </div>
    </div>
  );
}

export default UsageMeter;
