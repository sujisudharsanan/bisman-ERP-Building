'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Search,
  Filter,
  Download,
  Calendar,
  Clock,
  User,
  Globe,
  Laptop,
  BarChart2,
  TrendingUp,
  FileText,
  MousePointer,
  LogIn,
  LogOut,
  Eye,
  ChevronRight
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface UsageActivity {
  id: string;
  action: string;
  module: string;
  page: string;
  timestamp: string;
  duration: number;
  ipAddress: string;
  device: string;
  browser: string;
}

interface UserUsage {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  avatar?: string;
  lastActive: string;
  totalSessions: number;
  avgSessionDuration: number;
  pagesVisited: number;
  actionsPerformed: number;
  mostUsedModule: string;
  activities: UsageActivity[];
}

// ============================================================================
// Mock Data
// ============================================================================

const mockUserUsage: UserUsage = {
  id: 'USR001',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@acme.com',
  role: 'Finance Manager',
  department: 'Finance',
  lastActive: '2024-01-20 14:32:15',
  totalSessions: 156,
  avgSessionDuration: 45,
  pagesVisited: 2340,
  actionsPerformed: 8920,
  mostUsedModule: 'Finance',
  activities: [
    { id: 'ACT001', action: 'Viewed Report', module: 'Finance', page: '/finance/cash-flow-statement', timestamp: '2024-01-20 14:30:00', duration: 180, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT002', action: 'Created Entry', module: 'Finance', page: '/finance/journal-entries', timestamp: '2024-01-20 14:15:00', duration: 420, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT003', action: 'Approved Payment', module: 'Finance', page: '/finance/payment-approval-queue', timestamp: '2024-01-20 13:45:00', duration: 60, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT004', action: 'Downloaded Report', module: 'Finance', page: '/finance/trial-balance', timestamp: '2024-01-20 13:30:00', duration: 90, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT005', action: 'Logged In', module: 'System', page: '/auth/login', timestamp: '2024-01-20 09:00:00', duration: 15, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT006', action: 'Updated Settings', module: 'System', page: '/settings', timestamp: '2024-01-19 16:45:00', duration: 120, ipAddress: '192.168.1.45', device: 'Desktop', browser: 'Chrome 120' },
    { id: 'ACT007', action: 'Viewed Dashboard', module: 'Dashboard', page: '/dashboard', timestamp: '2024-01-19 09:05:00', duration: 300, ipAddress: '10.0.0.25', device: 'Mobile', browser: 'Safari 17' }
  ]
};

const moduleUsage = [
  { module: 'Finance', visits: 450, percentage: 45 },
  { module: 'Dashboard', visits: 230, percentage: 23 },
  { module: 'Reports', visits: 180, percentage: 18 },
  { module: 'Settings', visits: 80, percentage: 8 },
  { module: 'Other', visits: 60, percentage: 6 }
];

const dailyActivity = [
  { date: '2024-01-14', sessions: 3, actions: 45 },
  { date: '2024-01-15', sessions: 4, actions: 62 },
  { date: '2024-01-16', sessions: 2, actions: 28 },
  { date: '2024-01-17', sessions: 5, actions: 78 },
  { date: '2024-01-18', sessions: 3, actions: 51 },
  { date: '2024-01-19', sessions: 4, actions: 67 },
  { date: '2024-01-20', sessions: 2, actions: 34 }
];

// ============================================================================
// Sub-Components
// ============================================================================

function ActionIcon({ action }: { action: string }) {
  const iconMap: Record<string, React.ElementType> = {
    'Logged In': LogIn,
    'Logged Out': LogOut,
    'Viewed Report': Eye,
    'Created Entry': FileText,
    'Approved Payment': MousePointer,
    'Downloaded Report': Download,
    'Updated Settings': Activity,
    'Viewed Dashboard': BarChart2
  };

  const Icon = iconMap[action] || Activity;
  return <Icon className="w-4 h-4" />;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserUsagePage() {
  const [dateRange, setDateRange] = useState('7d');
  const [activityFilter, setActivityFilter] = useState('all');
  const user = mockUserUsage;

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return user.activities;
    return user.activities.filter(a => a.module.toLowerCase() === activityFilter);
  }, [activityFilter, user.activities]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{user.email} • {user.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <LogIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.totalSessions}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.avgSessionDuration}m</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Session</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.pagesVisited.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pages Visited</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <MousePointer className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.actionsPerformed.toLocaleString()}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Actions</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.mostUsedModule}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top Module</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Module Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Module Usage</h3>
            <div className="space-y-3">
              {moduleUsage.map((item) => (
                <div key={item.module}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700 dark:text-gray-300">{item.module}</span>
                    <span className="text-gray-500">{item.visits} visits</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Activity Chart */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Activity (Last 7 Days)</h3>
            <div className="flex items-end gap-2 h-40">
              {dailyActivity.map((day) => (
                <div key={day.date} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-blue-500 rounded-t"
                      style={{ height: `${(day.actions / 80) * 100}px` }}
                      title={`${day.actions} actions`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{day.date.split('-')[2]}</p>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                <span className="text-gray-600 dark:text-gray-400">Actions</span>
              </span>
            </div>
          </div>
        </div>

        {/* Activity Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900 dark:text-white">Activity Log</h3>
            <div className="flex gap-2">
              <select
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Modules</option>
                <option value="finance">Finance</option>
                <option value="dashboard">Dashboard</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredActivities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <ActionIcon action={activity.action} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{activity.action}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{activity.page}</p>
                      </div>
                      <div className="text-right text-sm">
                        <p className="text-gray-900 dark:text-white">{activity.timestamp}</p>
                        <p className="text-gray-500">{formatDuration(activity.duration)}</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {activity.ipAddress}
                      </span>
                      <span className="flex items-center gap-1">
                        <Laptop className="w-3 h-3" />
                        {activity.device}
                      </span>
                      <span>{activity.browser}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
