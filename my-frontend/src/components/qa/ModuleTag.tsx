'use client';

import React from 'react';

interface ModuleTagProps {
  module: string | null | undefined;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const moduleColors: Record<string, { bg: string; text: string; icon: string }> = {
  sales: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', icon: '💰' },
  inventory: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', icon: '📦' },
  billing: { bg: 'bg-green-50 dark:bg-green-900/20', text: 'text-green-600 dark:text-green-400', icon: '🧾' },
  hr: { bg: 'bg-purple-50 dark:bg-purple-900/20', text: 'text-purple-600 dark:text-purple-400', icon: '👥' },
  finance: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', icon: '💵' },
  crm: { bg: 'bg-pink-50 dark:bg-pink-900/20', text: 'text-pink-600 dark:text-pink-400', icon: '🤝' },
  reports: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', text: 'text-indigo-600 dark:text-indigo-400', icon: '📊' },
  settings: { bg: 'bg-gray-50 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', icon: '⚙️' },
  dashboard: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', text: 'text-cyan-600 dark:text-cyan-400', icon: '📈' },
  auth: { bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-600 dark:text-red-400', icon: '🔐' },
  qa: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', icon: '🔍' },
  system: { bg: 'bg-slate-50 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: '🖥️' },
  common: { bg: 'bg-teal-50 dark:bg-teal-900/20', text: 'text-teal-600 dark:text-teal-400', icon: '📁' },
};

const defaultColor = { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400', icon: '📋' };

const sizeClasses = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
  lg: 'px-3 py-1.5 text-base',
};

export function ModuleTag({ module, size = 'md', className = '' }: ModuleTagProps) {
  const normalizedModule = module?.toLowerCase() || 'unknown';
  const config = moduleColors[normalizedModule] || defaultColor;
  const displayName = module || 'Unknown';

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-md font-medium capitalize
        ${config.bg} ${config.text} ${sizeClasses[size]} ${className}
      `}
    >
      <span className="text-xs">{config.icon}</span>
      {displayName}
    </span>
  );
}

export default ModuleTag;
