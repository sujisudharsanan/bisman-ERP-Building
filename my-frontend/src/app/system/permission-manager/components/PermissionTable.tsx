'use client';

import React from 'react';

interface Props {
  pages: { key: string; name: string; module?: string }[];
  allowed: string[];
  roleDefaults?: string[];
  showOverridePages?: boolean;
  onToggle: (key: string) => void;
  onDeselectAll?: () => void;
  onSelectDefault?: () => void;
  onToggleOverrideView?: () => void;
}

export default function PermissionTable({ pages, allowed, roleDefaults = [], showOverridePages = false, onToggle, onDeselectAll, onSelectDefault, onToggleOverrideView }: Props) {
  // Helper to check if a permission is a user override (not in role defaults)
  const isUserOverride = (key: string) => {
    return allowed.includes(key) && !roleDefaults.includes(key);
  };
  
  // Helper to check if a permission is from role defaults
  const isRoleDefault = (key: string) => {
    return roleDefaults.includes(key);
  };
  
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {onSelectDefault && (
              <button
                onClick={onSelectDefault}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-white bg-yellow-600 hover:bg-yellow-700 dark:bg-yellow-600 dark:hover:bg-yellow-700 rounded border border-yellow-700 dark:border-yellow-800 font-medium transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select Default
              </button>
            )}
            
            {onToggleOverrideView && (
              <button
                onClick={onToggleOverrideView}
                className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs rounded border font-medium transition-colors ${
                  showOverridePages
                    ? 'text-white bg-purple-600 hover:bg-purple-700 border-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 dark:border-purple-800'
                    : 'text-purple-600 dark:text-purple-400 bg-purple-50 hover:bg-purple-100 border-purple-300 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 dark:border-purple-700'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showOverridePages ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
                {showOverridePages ? 'Hide Overrides' : 'Add Overrides'}
              </button>
            )}
            
            {onDeselectAll && (
              <button
                onClick={onDeselectAll}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear All
              </button>
            )}
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium text-gray-700 dark:text-gray-300">Permission Types:</div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Role Default (Auto-enabled)</span>
            </div>
            {showOverridePages && (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-gray-600 dark:text-gray-400">User Custom Override</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
                  <span className="text-gray-600 dark:text-gray-400">Not Granted</span>
                </div>
              </>
            )}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
            {showOverridePages ? (
              <>
                <span className="font-medium">Override Mode:</span> Showing all {roleDefaults.length} role default pages + additional pages for custom permissions
              </>
            ) : (
              <>
                ℹ️ Showing {roleDefaults.length} role default pages. Click "Add Overrides" to grant additional permissions
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="overflow-auto max-h-[60vh]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900">
            <tr className="text-left text-gray-600 dark:text-gray-300">
              <th className="px-4 py-2 font-medium">Page / Module</th>
              <th className="px-4 py-2 font-medium w-36">Access</th>
              <th className="px-4 py-2 font-medium w-32">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {pages.map(p => {
              const hasAccess = allowed.includes(p.key);
              const isOverride = isUserOverride(p.key);
              const isDefault = isRoleDefault(p.key);
              
              return (
                <tr key={p.key} className={`hover:bg-gray-50 dark:hover:bg-slate-700/50 ${isOverride ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}>
                  <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                    <div className="font-medium">{p.name}</div>
                    {p.module && (<div className="text-xs text-gray-500 dark:text-gray-400">{p.module}</div>)}
                  </td>
                  <td className="px-4 py-2">
                    <label className="inline-flex items-center">
                      <input
                        type="checkbox"
                        checked={hasAccess}
                        onChange={() => onToggle(p.key)}
                        className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </td>
                  <td className="px-4 py-2">
                    {hasAccess && (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                        isOverride 
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                          : isDefault
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          isOverride ? 'bg-blue-500' : isDefault ? 'bg-green-500' : 'bg-gray-500'
                        }`}></div>
                        {isOverride ? 'Custom' : isDefault ? 'Role' : 'Active'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
            {pages.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No pages available</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
