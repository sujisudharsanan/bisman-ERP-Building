'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  ChevronRight,
  UserPlus,
  Users,
  Mail,
  Shield,
  Building2,
  Edit3,
  Key
} from 'lucide-react';
import apiClient from '@/services/apiClient';

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

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  role_name?: string;
  department?: string;
  status?: string;
  avatar?: string;
  lastActive?: string;
  last_login?: string;
  created_at?: string;
  phone?: string;
  totalSessions?: number;
  avgSessionDuration?: number;
  pagesVisited?: number;
  actionsPerformed?: number;
  mostUsedModule?: string;
  activities?: UsageActivity[];
}

// ============================================================================
// Activity Data - Will be fetched from API or shown as empty
// ============================================================================

// Empty placeholder - real data would come from analytics API
const emptyActivities: UsageActivity[] = [];

const emptyModuleUsage: { module: string; visits: number; percentage: number }[] = [];

const emptyDailyActivity: { date: string; sessions: number; actions: number }[] = [];

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

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400';
    case 'suspended': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    default: return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  }
}

// ============================================================================
// Main Component
// ============================================================================

export default function UserUsagePage() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState('7d');
  const [activityFilter, setActivityFilter] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch users from API
  useEffect(() => {
    async function fetchUsers() {
      try {
        setLoading(true);
        const response = await apiClient.get('/api/users');
        const rawUsers = response.data?.users || response.data?.data || response.data || [];
        
        // Transform user data to match our interface
        const userData = (Array.isArray(rawUsers) ? rawUsers : []).map((u: any) => ({
          id: u.id,
          name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || 'Unknown',
          email: u.email,
          role: u.role,
          role_name: u.role_name || u.role,
          department: u.department,
          status: u.is_active !== false ? 'active' : 'inactive',
          avatar: u.profile_pic_url,
          lastActive: u.last_login,
          last_login: u.last_login,
          created_at: u.created_at,
          phone: u.phone,
          totalSessions: 0,
          avgSessionDuration: 0,
          pagesVisited: 0,
          actionsPerformed: 0,
          mostUsedModule: '-',
          activities: [],
        }));
        
        setUsers(userData);
        // Select first user by default
        if (userData.length > 0 && !selectedUser) {
          setSelectedUser(userData[0]);
        }
      } catch (error) {
        console.error('Failed to fetch users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(u => 
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.role?.toLowerCase().includes(query) ||
      u.role_name?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  // Get display data for selected user
  const user = selectedUser || {
    id: '',
    name: 'Select a User',
    email: 'No user selected',
    role: '-',
    totalSessions: 0,
    avgSessionDuration: 0,
    pagesVisited: 0,
    actionsPerformed: 0,
    mostUsedModule: '-',
    activities: emptyActivities
  };

  const activities = user.activities || emptyActivities;

  const filteredActivities = useMemo(() => {
    if (activityFilter === 'all') return activities;
    return activities.filter(a => a.module.toLowerCase() === activityFilter);
  }, [activityFilter, activities]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
              {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2) : 'U'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{user.email} • {user.role_name || user.role}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link
              href="/system/user-creation"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create User
            </Link>
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

      <div className="flex gap-6 p-6 pt-0">
        {/* Main Content - Left Side */}
        <div className="flex-1">
          {/* Summary Stats */}
          <div className="grid grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <LogIn className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.totalSessions || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.avgSessionDuration || 0}m</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(user.pagesVisited || 0).toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{(user.actionsPerformed || 0).toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.mostUsedModule || '-'}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Top Module</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 mb-6">
          {/* Module Usage */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Module Usage</h3>
            {emptyModuleUsage.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No usage data available</p>
              </div>
            ) : (
            <div className="space-y-3">
              {emptyModuleUsage.map((item) => (
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
            )}
          </div>

          {/* Daily Activity Chart */}
          <div className="col-span-2 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Daily Activity (Last 7 Days)</h3>
            {emptyDailyActivity.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity data available</p>
                <p className="text-xs mt-1">Activity tracking will appear here once users start using the system</p>
              </div>
            ) : (
            <div className="flex items-end gap-2 h-40">
              {emptyDailyActivity.map((day) => (
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
            )}
            {emptyDailyActivity.length > 0 && (
            <div className="flex justify-center gap-6 mt-4 text-sm">
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 bg-blue-500 rounded"></span>
                <span className="text-gray-600 dark:text-gray-400">Actions</span>
              </span>
            </div>
            )}
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
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity logs available</p>
                <p className="text-xs mt-1">User activity will be recorded here</p>
              </div>
            ) : (
            filteredActivities.map((activity) => (
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
            ))
            )}
          </div>
        </div>
        </div>
        {/* End Main Content */}

        {/* Right Side - User List Panel */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 sticky top-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  All Users
                </h3>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded-full">
                  {users.length}
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                />
              </div>
            </div>
            <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-500">
                  <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  No users found
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUser(u)}
                      onDoubleClick={() => router.push(`/admin/user-usage/${u.id}`)}
                      title="Click to select, double-click to edit"
                      className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        selectedUser?.id === u.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                          {u.name ? u.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{u.name || 'Unknown'}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(u.status)}`}>
                              {u.status || 'active'}
                            </span>
                            <span className="text-xs text-gray-400">{u.role_name || u.role}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Selected User Details Card */}
          {selectedUser && (
            <div className="mt-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900 dark:text-white">User Details</h4>
                <button
                  onClick={() => router.push(`/admin/user-usage/${selectedUser.id}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit User
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{selectedUser.email}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Shield className="w-4 h-4" />
                  <span>{selectedUser.role_name || selectedUser.role}</span>
                </div>
                {selectedUser.department && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Building2 className="w-4 h-4" />
                    <span>{selectedUser.department}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4" />
                  <span>Joined: {formatDate(selectedUser.created_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>Last login: {formatDate(selectedUser.last_login)}</span>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${getStatusColor(selectedUser.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                    {selectedUser.status || 'Active'}
                  </span>
                  <button
                    onClick={() => router.push(`/admin/user-usage/${selectedUser.id}?action=reset-password`)}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    title="Reset Password"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Reset Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
