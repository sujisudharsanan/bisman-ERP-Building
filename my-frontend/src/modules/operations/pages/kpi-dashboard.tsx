/**
 * KPI Dashboard - Operations Manager View
 * Monitor key performance indicators and operational metrics
 */

'use client';

import React, { useState } from 'react';
import { getIcon } from "@/components/layout/BaseSidebar";
import SuperAdminLayout from '@/common/layouts/superadmin-layout';
import { useAuth } from '@/common/hooks/useAuth';
import {
  Activity,
  TrendingUp,
  Package,
  Truck,
  Users,
  DollarSign,
  Clock,
  AlertCircle,
  Target,
  BarChart3,
} from 'lucide-react';

export default function KPIDashboardPage() {
  const { hasAccess } = useAuth();
  const [timeRange, setTimeRange] = useState('week');

  if (!hasAccess('kpi-dashboard')) {
    return (
      <SuperAdminLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You do not have permission to access KPI Dashboard.
          </p>
        </div>
      </SuperAdminLayout>
    );
  }

  const kpis = [
    {
      label: 'Order Fulfillment Rate',
      value: '94.5%',
      target: '95%',
      trend: '+2.3%',
      status: 'good',
  icon: 'Package',
    },
    {
      label: 'On-Time Delivery',
      value: '91.2%',
      target: '90%',
      trend: '+1.8%',
      status: 'excellent',
  icon: 'Truck',
    },
    {
      label: 'Customer Satisfaction',
      value: '4.6/5',
      target: '4.5',
      trend: '+0.2',
      status: 'excellent',
  icon: 'Users',
    },
    {
      label: 'Revenue per Order',
      value: '₹8,425',
      target: '₹8,000',
      trend: '+5.3%',
      status: 'excellent',
  icon: 'DollarSign',
    },
    {
      label: 'Avg. Processing Time',
      value: '2.4 hrs',
      target: '3 hrs',
      trend: '-0.3 hrs',
      status: 'excellent',
  icon: 'Clock',
    },
    {
      label: 'Operational Efficiency',
      value: '88.7%',
      target: '85%',
      trend: '+3.2%',
      status: 'excellent',
  icon: 'Activity',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-50 dark:bg-green-900/30 border-green-500';
      case 'good':
        return 'bg-blue-50 dark:bg-blue-900/30 border-blue-500';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-500';
      case 'critical':
        return 'bg-red-50 dark:bg-red-900/30 border-red-500';
      default:
        return 'bg-gray-50 dark:bg-gray-700 border-gray-500';
    }
  };

  return (
    <SuperAdminLayout
      title="KPI Dashboard"
      description="Monitor key performance indicators and operational metrics"
    >
      <div className="space-y-6">
        {/* Time Range Selector */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Generate Report</span>
          </button>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className={`rounded-lg shadow-lg p-6 border-l-4 ${getStatusColor(kpi.status)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg">
                    {(() => {
                      const Icon = getIcon(kpi.icon);
                      return <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {kpi.label}
                    </h3>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                      {kpi.value}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Target:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{kpi.target}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Trend:</span>
                  <span className={`font-semibold ${
                    kpi.trend.startsWith('+') || kpi.trend.startsWith('-')
                      ? kpi.trend.startsWith('+')
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {kpi.trend}
                  </span>
                </div>
                {/* Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        kpi.status === 'excellent' ? 'bg-green-500' :
                        kpi.status === 'good' ? 'bg-blue-500' :
                        kpi.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, parseFloat(kpi.value) || 85)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Performance Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">
            Performance Trends
          </h3>
          <div className="h-80 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">Line Chart Placeholder</p>
          </div>
        </div>

        {/* Department Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Department Performance
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Department
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Orders
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Efficiency
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Quality Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {[
                  { dept: 'Sales', orders: 245, efficiency: '92%', quality: '4.8', status: 'excellent' },
                  { dept: 'Logistics', orders: 189, efficiency: '88%', quality: '4.5', status: 'good' },
                  { dept: 'Warehouse', orders: 312, efficiency: '85%', quality: '4.3', status: 'good' },
                  { dept: 'Customer Service', orders: 456, efficiency: '91%', quality: '4.7', status: 'excellent' },
                ].map((row, index) => (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {row.dept}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {row.orders}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {row.efficiency}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                      {row.quality}/5.0
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        row.status === 'excellent'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Items */}
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <Target className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Recommended Actions
              </h4>
              <ul className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                <li>• Increase staffing in Customer Service to maintain 4.7+ quality score</li>
                <li>• Review warehouse processes to improve efficiency from 85% to 90%</li>
                <li>• Continue monitoring logistics on-time delivery performance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
