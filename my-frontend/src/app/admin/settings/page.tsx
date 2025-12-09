'use client';

import React from 'react';
import { DockSettings } from '@/components/dock';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function AdminSettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/admin/client-dashboard"
          className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-gray-400 text-sm">Customize your dashboard experience</p>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Dock Settings */}
        <DockSettings />

        {/* Other Settings Sections - Placeholders */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Notifications</h3>
          <p className="text-sm text-gray-400">Configure how you receive alerts and updates</p>
          <div className="mt-4 text-gray-500 text-sm">Coming soon...</div>
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Account</h3>
          <p className="text-sm text-gray-400">Manage your account settings and preferences</p>
          <div className="mt-4 text-gray-500 text-sm">Coming soon...</div>
        </div>
      </div>
    </div>
  );
}
