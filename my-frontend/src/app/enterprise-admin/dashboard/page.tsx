'use client';

import React, { useState, useEffect } from 'react';
import {
  FiPackage,
  FiUsers,
  FiTrendingUp,
  FiDollarSign,
  FiActivity,
} from 'react-icons/fi';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import EnterpriseAdminNavbar from '@/components/EnterpriseAdminNavbar';
import EnterpriseAdminSidebar from '@/components/EnterpriseAdminSidebar';

interface DashboardStats {
  totalBusinesses: number;
  totalUsers: number;
  totalRevenue: string;
  activeConnections: number;
}

export default function EnterpriseAdminDashboard() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalBusinesses: 0,
    totalUsers: 0,
    totalRevenue: '₹0',
    activeConnections: 0,
  });

  useEffect(() => {
    // Wait for auth to finish loading before checking user
    if (loading) return;
    
    // If not loading and no user, redirect to login
    if (!user) {
      router.push('/auth/login');
      return;
    }

    // Load dashboard stats (mock data for now)
    setStats({
      totalBusinesses: 12,
      totalUsers: 145,
      totalRevenue: '₹12,45,000',
      activeConnections: 8,
    });
  }, [user, loading, router]);

  // Show loading screen while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show loading if no user yet (will redirect via useEffect)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Top Navigation */}
      <EnterpriseAdminNavbar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm top-14"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-64 z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <EnterpriseAdminSidebar className="h-full" />
      </aside>

      {/* Main Content */}
      <main className="pt-14 lg:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user.username || user.email?.split('@')[0] || 'User'}!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Here's what's happening with your enterprise today.
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Businesses</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.totalBusinesses}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FiPackage className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-4">
                +2 this month
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.totalUsers}
                  </p>
                </div>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <FiUsers className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-4">
                +18 this month
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.totalRevenue}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <FiDollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-green-600 dark:text-green-400 mt-4">
                +12% this month
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active Connections</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stats.activeConnections}
                  </p>
                </div>
                <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FiActivity className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-4">
                Real-time
              </p>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <FiPackage className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New business registered
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      ABC Logistics joined the platform
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                    <FiUsers className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      New users added
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      5 new users registered today
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">4 hours ago</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <FiTrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Revenue milestone reached
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Crossed ₹10 lakhs this month
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
