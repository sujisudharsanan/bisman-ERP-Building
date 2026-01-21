/**
 * KPI Card Component
 * Reusable card component for displaying key performance indicators
 */

'use client';

import React from 'react';
import type { HealthStatus } from '@/types/superadmin-dashboard';

// ============================================================================
// Types
// ============================================================================

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'flat';
    period?: string;
  };
  status?: HealthStatus;
  loading?: boolean;
  error?: string;
  onClick?: () => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ============================================================================
// Helper Functions
// ============================================================================

const getStatusColor = (status: HealthStatus): string => {
  switch (status) {
    case 'healthy':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'degraded':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

const getTrendColor = (direction: 'up' | 'down' | 'flat', positive: boolean = true): string => {
  if (direction === 'flat') return 'text-gray-500';
  const isGood = positive ? direction === 'up' : direction === 'down';
  return isGood ? 'text-green-600' : 'text-red-600';
};

const getTrendIcon = (direction: 'up' | 'down' | 'flat'): string => {
  switch (direction) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    default:
      return '→';
  }
};

const formatValue = (value: string | number): string => {
  if (typeof value === 'number') {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }
  return value;
};

// ============================================================================
// Skeleton Loader
// ============================================================================

const KPICardSkeleton: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const heights = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-12',
  };

  return (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
      <div className={`${heights[size]} bg-gray-200 rounded w-3/4 mb-2`} />
      <div className="h-3 bg-gray-200 rounded w-1/3" />
    </div>
  );
};

// ============================================================================
// Error State
// ============================================================================

const KPICardError: React.FC<{ error: string }> = ({ error }) => (
  <div className="text-center py-2">
    <div className="text-red-500 text-sm mb-1">⚠️ Error</div>
    <div className="text-gray-500 text-xs truncate" title={error}>
      {error}
    </div>
  </div>
);

// ============================================================================
// Main Component
// ============================================================================

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  icon,
  trend,
  status,
  loading = false,
  error,
  onClick,
  className = '',
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  const valueSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  const baseClasses = `
    bg-white rounded-lg border shadow-sm
    transition-all duration-200
    ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 active:scale-[0.98]' : ''}
    ${status ? getStatusColor(status) : 'border-gray-200'}
    ${sizeClasses[size]}
    ${className}
  `;

  return (
    <div className={baseClasses} onClick={onClick} role={onClick ? 'button' : undefined}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-600 truncate">{title}</h3>
        {icon && <div className="text-gray-400 flex-shrink-0">{icon}</div>}
      </div>

      {/* Content */}
      {loading ? (
        <KPICardSkeleton size={size} />
      ) : error ? (
        <KPICardError error={error} />
      ) : (
        <>
          {/* Value */}
          <div className={`${valueSizes[size]} font-bold text-gray-900 mb-1`}>
            {formatValue(value)}
          </div>

          {/* Subtext & Trend */}
          <div className="flex items-center justify-between">
            {subtext && <span className="text-xs text-gray-500">{subtext}</span>}
            {trend && (
              <span className={`text-xs font-medium ${getTrendColor(trend.direction)}`}>
                {getTrendIcon(trend.direction)} {trend.value}%
                {trend.period && <span className="text-gray-400 ml-1">{trend.period}</span>}
              </span>
            )}
          </div>

          {/* Status Badge */}
          {status && (
            <div className="mt-2">
              <span
                className={`
                  inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                  ${status === 'healthy' ? 'bg-green-100 text-green-800' : ''}
                  ${status === 'degraded' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${status === 'critical' ? 'bg-red-100 text-red-800' : ''}
                  ${status === 'unknown' ? 'bg-gray-100 text-gray-800' : ''}
                `}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================================
// Mini KPI for Compact Display
// ============================================================================

interface MiniKPIProps {
  label: string;
  value: string | number;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
}

export const MiniKPI: React.FC<MiniKPIProps> = ({ label, value, status = 'neutral' }) => {
  const statusColors = {
    good: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
    neutral: 'text-gray-900',
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-sm font-semibold ${statusColors[status]}`}>
        {formatValue(value)}
      </span>
    </div>
  );
};

// ============================================================================
// KPI Grid Container
// ============================================================================

interface KPIGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const KPIGrid: React.FC<KPIGridProps> = ({ children, columns = 4, className = '' }) => {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5',
    6: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6',
  };

  return <div className={`grid ${gridCols[columns]} gap-3 w-full ${className}`}>{children}</div>;
};

export default KPICard;
