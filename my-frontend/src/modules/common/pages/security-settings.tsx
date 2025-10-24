'use client';

import React from 'react';
import { Shield, Key, Smartphone, History } from 'lucide-react';

/**
 * Common Module - Security Settings Page
 * Accessible to ALL authenticated users
 */
export default function SecuritySettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Security Settings
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage your account security and privacy
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/common/change-password"
              className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition-all"
            >
              <Key className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Change Password</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Update your account password</p>
            </a>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6">
              <Smartphone className="w-8 h-8 text-green-600 dark:text-green-400 mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Two-Factor Auth</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Add an extra layer of security</p>
              <button className="mt-3 text-sm text-blue-600 dark:text-blue-400 font-medium">
                Enable →
              </button>
            </div>
          </div>

          {/* Login History */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Recent Login Activity
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-400 text-center py-8">
              Login history will appear here
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
