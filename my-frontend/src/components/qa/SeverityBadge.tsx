'use client';

import React from 'react';

export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type Priority = 'low' | 'medium' | 'high' | 'critical';

interface SeverityBadgeProps {
  level: Severity | Priority | string;
  type?: 'severity' | 'priority';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const severityConfig: Record<string, { bg: string; text: string; icon: string }> = {
  low: { 
    bg: 'bg-green-100 dark:bg-green-900/30', 
    text: 'text-green-700 dark:text-green-300',
    icon: '○'
  },
  medium: { 
    bg: 'bg-yellow-100 dark:bg-yellow-900/30', 
    text: 'text-yellow-700 dark:text-yellow-300',
    icon: '◐'
  },
  high: { 
    bg: 'bg-orange-100 dark:bg-orange-900/30', 
    text: 'text-orange-700 dark:text-orange-300',
    icon: '◕'
  },
  critical: { 
    bg: 'bg-red-100 dark:bg-red-900/30', 
    text: 'text-red-700 dark:text-red-300',
    icon: '●'
  },
};

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function SeverityBadge({ level, type = 'severity', size = 'md', className = '' }: SeverityBadgeProps) {
  const normalizedLevel = level?.toLowerCase() || 'medium';
  const config = severityConfig[normalizedLevel] || severityConfig.medium;
  const label = type === 'priority' ? `P: ${level}` : level;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium capitalize
        ${config.bg} ${config.text} ${sizeClasses[size]} ${className}
      `}
    >
      <span className="text-xs">{config.icon}</span>
      {label}
    </span>
  );
}

export default SeverityBadge;
