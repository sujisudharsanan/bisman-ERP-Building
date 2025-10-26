'use client';

import React, { useState, useEffect } from 'react';
import {
  FiBriefcase,
  FiTrendingUp,
  FiUsers,
  FiActivity,
  FiDollarSign,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
} from 'react-icons/fi';
import Link from 'next/link';

interface Stats {
  total_businesses: number;
  active_businesses: number;
  trial_businesses: number;
  suspended_businesses: number;
  total_users: number;
  total_revenue: number;
  revenue_growth: number;
}

interface RecentActivity {
  id: string;
  type: 'created' | 'updated' | 'module_changed' | 'subscription_changed';
  business_name: string;
  description: string;
  timestamp: string;
  admin_name: string;
}

interface RevenueByBusiness {
  business_name: string;
  revenue: number;
  plan: string;
  users_count: number;
}

export default function EnterpriseAdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [revenueByBusiness, setRevenueByBusiness] = useState<RevenueByBusiness[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data
  const mockStats: Stats = {
    total_businesses: 2,
    active_businesses: 2,
    trial_businesses: 0,
    suspended_businesses: 0,
    total_users: 7,
    total_revenue: 89999,
    revenue_growth: 15.3,
  };

  const mockRecentActivity: RecentActivity[] = [
    {
      id: '1',
      type: 'created',
      business_name: 'Rajesh Petrol Pump - Highway 44',
      admin_name: 'Rajesh Kumar',
      description: 'New petrol pump business created',
      timestamp: '2025-01-15T10:30:00Z',
    },
    {
      id: '2',
      type: 'module_changed',
      business_name: 'Rajesh Petrol Pump - Highway 44',
      admin_name: 'Rajesh Kumar',
      description: 'Enabled 11 modules including Fuel Sales, Tank Inventory',
      timestamp: '2025-01-15T10:35:00Z',
    },
    {
      id: '3',
      type: 'created',
      business_name: 'ABC Logistics Pvt Ltd',
      admin_name: 'Amit Shah',
      description: 'New logistics business created',
      timestamp: '2025-01-15T11:00:00Z',
    },
    {
      id: '4',
      type: 'module_changed',
      business_name: 'ABC Logistics Pvt Ltd',
      admin_name: 'Amit Shah',
      description: 'Enabled 12 modules including Shipments, Fleet Management',
      timestamp: '2025-01-15T11:05:00Z',
    },
    {
      id: '5',
      type: 'updated',
      business_name: 'ABC Logistics Pvt Ltd',
      admin_name: 'Amit Shah',
      description: 'Updated business profile and contact information',
      timestamp: '2025-01-16T09:20:00Z',
    },
  ];

  const mockRevenueByBusiness: RevenueByBusiness[] = [
    {
      business_name: 'ABC Logistics Pvt Ltd',
      revenue: 49999,
      plan: 'Enterprise',
      users_count: 3,
    },
    {
      business_name: 'Rajesh Petrol Pump - Highway 44',
      revenue: 40000,
      plan: 'Professional',
      users_count: 3,
    },
  ];

  useEffect(() => {
    // TODO: Fetch from API
    setTimeout(() => {
      setStats(mockStats);
      setRecentActivity(mockRecentActivity);
      setRevenueByBusiness(mockRevenueByBusiness);
      setLoading(false);
    }, 500);
  }, []);

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'created':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'updated':
        return <FiActivity className="w-5 h-5 text-blue-500" />;
      case 'module_changed':
        return <FiActivity className="w-5 h-5 text-purple-500" />;
      case 'subscription_changed':
        return <FiDollarSign className="w-5 h-5 text-orange-500" />;
      default:
        return <FiActivity className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Enterprise Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Monitor and manage all your businesses
          </p>
        </div>
        <Link
          href="/enterprise-admin/super-admins/create"
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg
            transition-colors flex items-center space-x-2"
        >
          <FiBriefcase className="w-4 h-4" />
          <span>Add Business</span>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Businesses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Businesses</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_businesses}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stats.active_businesses} active
                </p>
              </div>
              <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
                <FiBriefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          {/* Total Users */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.total_users}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Across all businesses
                </p>
              </div>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
                <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly Revenue</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{(stats.total_revenue / 1000).toFixed(0)}K
                </p>
                <div className="flex items-center space-x-1 mt-1">
                  <FiTrendingUp className="w-3 h-3 text-green-500" />
                  <p className="text-xs text-green-500">+{stats.revenue_growth}%</p>
                </div>
              </div>
              <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
                <FiDollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          {/* Trial Businesses */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Trial Period</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  {stats.trial_businesses}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Active trials
                </p>
              </div>
              <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg">
                <FiClock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue by Business */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Revenue by Business
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {revenueByBusiness.map((business, index) => {
            const percentage = (business.revenue / (stats?.total_revenue || 1)) * 100;
            return (
              <div key={index} className="px-6 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {business.business_name}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                        {business.plan}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {business.users_count} users
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      ₹{business.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {percentage.toFixed(1)}% of total
                    </p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
          <Link
            href="/enterprise-admin/super-admins"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all businesses →
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Activity
          </h2>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {recentActivity.map((activity) => (
            <div key={activity.id} className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.business_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {activity.description}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      by {activity.admin_name}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
          <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            View all activity →
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/enterprise-admin/super-admins/create"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg">
              <FiBriefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Add Business</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Create new super admin
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/enterprise-admin/super-admins"
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Manage Businesses</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                View and edit all businesses
              </p>
            </div>
          </div>
        </Link>

        <button
          className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg">
              <FiActivity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">View Reports</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Analytics and insights
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
}
