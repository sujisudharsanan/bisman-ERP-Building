'use client';

import React from 'react';

interface Props {
  pages: { key: string; name: string; module?: string }[];
  allowed: string[];
  onToggle: (key: string) => void;
  onSelectAll: (checked: boolean) => void;
  onDeselectAll?: () => void;
  onSelectDefault?: () => void;
}

export default function PermissionTable({ pages, allowed, onToggle, onSelectAll, onDeselectAll, onSelectDefault }: Props) {
  const allSelected = pages.length > 0 && pages.every(p => allowed.includes(p.key));
  const someSelected = !allSelected && pages.some(p => allowed.includes(p.key));
  
  return (
    <div className="rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-800">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-slate-800 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 select-none text-sm text-gray-700 dark:text-gray-200">
          <input
            type="checkbox"
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = Boolean(someSelected); }}
            onChange={e => onSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
          />
          Select All
        </label>
        
        {onSelectDefault && (
          <button
            onClick={onSelectDefault}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-700 font-medium"
          >
            Select Default
          </button>
        )}
        
        {onDeselectAll && (
          <button
            onClick={onDeselectAll}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded border border-red-300 dark:border-red-700"
          >
            Deselect All
          </button>
        )}
      </div>
      <div className="overflow-auto max-h-[60vh]">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 dark:bg-slate-900">
            <tr className="text-left text-gray-600 dark:text-gray-300">
              <th className="px-4 py-2 font-medium">Page</th>
              <th className="px-4 py-2 font-medium w-36">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
            {pages.map(p => (
              <tr key={p.key} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <td className="px-4 py-2 text-gray-800 dark:text-gray-100">
                  <div className="font-medium">{p.name}</div>
                  {p.module && (<div className="text-xs text-gray-500 dark:text-gray-400">{p.module}</div>)}
                </td>
                <td className="px-4 py-2">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={allowed.includes(p.key)}
                      onChange={() => onToggle(p.key)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </td>
              </tr>
            ))}
            {pages.length === 0 && (
              <tr>
                <td colSpan={2} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">No pages</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
