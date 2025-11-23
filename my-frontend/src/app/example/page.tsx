/**
 * Example Dashboard Page
 * 
 * This page demonstrates how to use the BaseLayout component
 * with all its features including role-based visibility,
 * responsive design, and layout audit integration.
 */

'use client';

import React from 'react';
import BaseLayout from '@/components/layout/BaseLayout';
import { BarChart3, Users, DollarSign, TrendingUp } from '@/lib/ssr-safe-icons';

export default function ExamplePage() {
  // Sample dashboard data
  const stats = [
    { label: 'Total Sales', value: '₹2,45,678', icon: DollarSign, change: '+12%', color: 'text-green-600' },
    { label: 'Active Users', value: '1,234', icon: Users, change: '+5%', color: 'text-blue-600' },
    { label: 'Revenue', value: '₹5,67,890', icon: TrendingUp, change: '+18%', color: 'text-purple-600' },
    { label: 'Reports', value: '89', icon: BarChart3, change: '+3%', color: 'text-orange-600' },
  ];

  return (
    <BaseLayout
      pageId="example-dashboard"
      enableAudit={process.env.NODE_ENV === 'development'}
      showHeader={true}
      showSidebar={true}
      showFooter={true}
    >
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Example Dashboard
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          This is a demonstration page showing how to use the BaseLayout component.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg bg-opacity-10 ${stat.color}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <span className={`text-sm font-semibold ${stat.color}`}>
                {stat.change}
              </span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {stat.value}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-4">
          📖 BaseLayout Usage Instructions
        </h2>
        <div className="space-y-4 text-sm text-blue-800 dark:text-blue-200">
          <div>
            <h3 className="font-semibold mb-2">1. Import the Component:</h3>
            <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-300 dark:border-blue-700 overflow-x-auto">
              <code>{`import BaseLayout from '@/components/layout/BaseLayout';`}</code>
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">2. Wrap Your Page Content:</h3>
            <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-300 dark:border-blue-700 overflow-x-auto">
              <code>{`<BaseLayout
  pageId="your-page-id"
  enableAudit={process.env.NODE_ENV === 'development'}
  showHeader={true}
  showSidebar={true}
  showFooter={true}
>
  {/* Your page content here */}
</BaseLayout>`}</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Available Props:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>pageId</strong>: Unique identifier for audit tracking</li>
              <li><strong>enableAudit</strong>: Enable/disable layout audit (recommended for dev only)</li>
              <li><strong>showHeader</strong>: Show/hide header component (default: true)</li>
              <li><strong>showSidebar</strong>: Show/hide sidebar component (default: true)</li>
              <li><strong>showFooter</strong>: Show/hide footer component (default: true)</li>
              <li><strong>children</strong>: Your page content</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Features Included:</h3>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>✅ Role-based menu visibility</li>
              <li>✅ Responsive design (mobile, tablet, desktop)</li>
              <li>✅ Dark mode support</li>
              <li>✅ Collapsible sidebar</li>
              <li>✅ User profile with avatar</li>
              <li>✅ Layout audit system</li>
              <li>✅ Accessibility compliant</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Layout Audit Scripts */}
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-4">
          🔍 Layout Audit Scripts
        </h2>
        <div className="space-y-3 text-sm text-green-800 dark:text-green-200">
          <div>
            <h3 className="font-semibold mb-1">Audit All Pages:</h3>
            <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700">
              <code>npm run layout:audit</code>
            </pre>
          </div>
          
          <div>
            <h3 className="font-semibold mb-1">Audit Specific Page:</h3>
            <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700">
              <code>npm run layout:audit:page -- admin</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Generate Visual Summaries:</h3>
            <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700">
              <code>npm run layout:visual</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Generate for Specific Role:</h3>
            <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700">
              <code>npm run layout:visual:role -- ADMIN</code>
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-1">Update Layout Version:</h3>
            <pre className="bg-white dark:bg-gray-800 p-2 rounded border border-green-300 dark:border-green-700">
              <code>npm run layout:version</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Role Configuration */}
      <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-purple-900 dark:text-purple-100 mb-4">
          👥 Role-Based Configuration
        </h2>
        <div className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
          <p>
            The BaseLayout automatically adapts based on the user's role. Menu items, 
            page access, and layout visibility are all controlled through the 
            <code className="mx-1 px-2 py-1 bg-white dark:bg-gray-800 rounded border border-purple-300 dark:border-purple-700">
              roleLayoutConfig.ts
            </code>
            file.
          </p>
          <p className="mt-3 font-semibold">Supported Roles:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mt-2">
            {[
              'SUPER_ADMIN',
              'ADMIN',
              'MANAGER',
              'STAFF',
              'CFO',
              'IT_ADMIN',
              'FINANCE_CONTROLLER',
              'TREASURY',
              'ACCOUNTS',
              'PROCUREMENT_OFFICER',
              'STORE_INCHARGE',
              'COMPLIANCE',
              'LEGAL',
              'BANKER'
            ].map((role) => (
              <span
                key={role}
                className="px-3 py-1 bg-purple-100 dark:bg-purple-900 text-purple-900 dark:text-purple-100 rounded-full text-xs font-medium"
              >
                {role}
              </span>
            ))}
          </div>
        </div>
      </div>
    </BaseLayout>
  );
}
