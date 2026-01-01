'use client';

import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

export interface ResourceData {
  name: string;
  allowed: number;
  used: number;
  remaining: number;
}

export interface UserContributionData {
  userId: string;
  userName: string;
  usagePercentage: number;
  tasksCreated?: number;
  approvalsUsed?: number;
}

export interface UsageAnalyticsProps {
  resourceData: ResourceData[];
  userContributions: UserContributionData[];
  loading?: boolean;
}

/**
 * UsageAnalytics Component
 * 
 * Contains two charts:
 * 1. Subscription vs Usage (Stacked Bar) - Shows capacity headroom
 * 2. User Contribution (Horizontal Bar) - Shows who is consuming the most
 */
export function UsageAnalytics({
  resourceData,
  userContributions,
  loading = false,
}: UsageAnalyticsProps) {
  const maxResourceValue = Math.max(...resourceData.map(r => r.allowed), 1);
  const maxContribution = Math.max(...userContributions.map(u => u.usagePercentage), 1);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 animate-pulse"
          >
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Subscription vs Usage (Stacked Bar Chart) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Subscription vs Usage
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Used</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-gray-700"></div>
            <span className="text-xs text-gray-600 dark:text-gray-400">Remaining</span>
          </div>
        </div>

        {/* Stacked Bars */}
        <div className="space-y-4">
          {resourceData.map((resource) => {
            const usedPercent = resource.allowed > 0 ? (resource.used / resource.allowed) * 100 : 0;
            const isOverLimit = resource.used > resource.allowed;
            
            return (
              <div key={resource.name}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {resource.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {resource.used} / {resource.allowed === -1 ? '∞' : resource.allowed}
                  </span>
                </div>
                <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                  {/* Used portion */}
                  <div
                    className={`absolute inset-y-0 left-0 rounded-l-lg transition-all duration-500 ${
                      isOverLimit ? 'bg-red-500' : usedPercent >= 90 ? 'bg-red-500' : usedPercent >= 70 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(usedPercent, 100)}%` }}
                  >
                    {usedPercent > 15 && (
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                        {resource.used}
                      </span>
                    )}
                  </div>
                  {/* Remaining portion label */}
                  {usedPercent < 85 && resource.remaining > 0 && (
                    <span 
                      className="absolute inset-y-0 flex items-center text-xs text-gray-500 dark:text-gray-400"
                      style={{ left: `${Math.min(usedPercent, 100) + 2}%` }}
                    >
                      {resource.remaining} left
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Capacity Summary */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 Shows capacity headroom across all resources. Red indicates near or over limit.
          </p>
        </div>
      </div>

      {/* User Contribution (Horizontal Bar Chart) */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            User Contribution to Usage
          </h3>
        </div>

        {userContributions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500 dark:text-gray-400">
            <TrendingUp className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm">No usage data available</p>
          </div>
        ) : (
          <>
            {/* Horizontal Bars */}
            <div className="space-y-3">
              {userContributions.slice(0, 8).map((user, index) => {
                const barWidth = maxContribution > 0 ? (user.usagePercentage / maxContribution) * 100 : 0;
                const isHighUsage = user.usagePercentage >= 20;
                
                return (
                  <div key={user.userId} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 dark:text-gray-500 w-4">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-[120px]">
                          {user.userName}
                        </span>
                      </div>
                      <span className={`text-xs font-medium ${
                        isHighUsage ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {user.usagePercentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isHighUsage 
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500' 
                            : 'bg-gradient-to-r from-purple-400 to-purple-500'
                        }`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                💡 Shows who is consuming the most resources. Amber indicates high-usage users.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UsageAnalytics;
