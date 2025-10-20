import React from 'react';
import SuperAdminShell from '@/components/layouts/SuperAdminShell';

export default function BlankSuperAdminPage() {
  return (
    <SuperAdminShell title="Untitled Module">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6 border border-gray-200 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Coming soon</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">This page is not implemented yet. Use this template to start building.</p>
        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          Tip: Duplicate this file and change the route to scaffold a new Super Admin page quickly.
        </div>
      </div>
    </SuperAdminShell>
  );
}
