/**
 * Executive Dashboard - CFO View
 * High-level financial overview and key metrics
 */

'use client';

import React, { useState } from 'react';
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  AlertCircle,
} from 'lucide-react';

export default function ExecutiveDashboardPage() {
  const { hasAccess } = useAuth();
  const [period, setPeriod] = useState('month');

  if (!hasAccess('executive-dashboard')) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access Executive Dashboard.
          </p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout
      title="Executive Dashboard"
      description="Financial performance and key business metrics"
    >
      <div className="space-y-6">
        {/* Period Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: 'Total Revenue',
              value: '₹12.5M',
              change: '+12.5%',
              trend: 'up',
              icon: DollarSign,
              color: 'green',
            },
            {
              label: 'Operating Expenses',
              value: '₹8.2M',
              change: '+3.2%',
              trend: 'up',
              icon: CreditCard,
              color: 'red',
            },
            {
              label: 'Net Profit',
              value: '₹4.3M',
              change: '+18.7%',
              trend: 'up',
              icon: TrendingUp,
              color: 'blue',
            },
            {
              label: 'Cash Flow',
              value: '₹6.8M',
              change: '-2.1%',
              trend: 'down',
              icon: BarChart3,
              color: 'yellow',
            },
          ].map((metric, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-l-blue-500"
            >
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={`w-8 h-8 text-${metric.color}-600 dark:text-${metric.color}-400`} />
                <span
                  className={`flex items-center text-sm font-semibold ${
                    metric.trend === 'up'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {metric.trend === 'up' ? (
                    <TrendingUp className="w-4 h-4 mr-1" />
                  ) : (
                    <TrendingDown className="w-4 h-4 mr-1" />
                  )}
                  {metric.change}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{metric.label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                  {metric.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue vs Expenses Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Revenue vs Expenses
              </h3>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Chart Placeholder</p>
            </div>
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Expense Breakdown
              </h3>
              <PieChart className="w-5 h-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Pie Chart Placeholder</p>
            </div>
          </div>
        </div>

        {/* Financial Summary Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Monthly Financial Summary
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Revenue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Expenses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Profit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Margin
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {['January', 'February', 'March', 'April', 'May', 'June'].map((month, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {month} 2024
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      ₹{(10 + Math.random() * 5).toFixed(2)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      ₹{(6 + Math.random() * 3).toFixed(2)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-semibold">
                      ₹{(3 + Math.random() * 2).toFixed(2)}M
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {(25 + Math.random() * 15).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              💡 Revenue Growth
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Revenue has increased by 12.5% compared to last month, driven by strong performance in the retail sector.
            </p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              ⚠️ Cost Alert
            </h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Operating expenses have risen by 3.2%. Review procurement costs and operational efficiency.
            </p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              ✅ Cash Position
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              Strong cash position with ₹6.8M in reserves. Liquidity ratio remains healthy at 2.1x.
            </p>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
