'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Shield,
  Users,
  User,
  Database,
  Activity,
  Settings,
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server,
  Key,
  Route,
  BarChart3,
  ShoppingCart,
} from 'lucide-react';

// Import our new user management components
import { 
  TopNavDbIndicator, 
  InviteUserModal, 
  CreateFullUserModal, 
  KycReviewDrawer,
  UserProfile 
} from '@/components/user-management';
import { PrivilegeManagement } from '@/components/privilege-management';
import DatabaseBrowser from '@/components/database-browser/DatabaseBrowser';
import ActivityLogViewer from '@/components/activity-log/ActivityLogViewer';
import type { 
  User as UserType, 
  UserRole, 
  Branch, 
  KycSubmission,
  KycSubmissionWithRelations, 
  Invitation 
} from '@/types/user-management';

interface SuperAdminStats {
  users: number;
  roles: number;
  routes: number;
  permissions: number;
  activities: number;
  tables: number;
}

interface ActivityLog {
  id: string;
  user_id: number | null;
  username: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface LegacyUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

const SuperAdminControlPanel: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get initial tab from URL or default to 'dashboard'
  const initialTab = (searchParams?.get('tab')) || 'dashboard';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update URL when tab changes
  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tabId);
    router.replace(url.pathname + url.search, { scroll: false });
  }, [router]);

  // Dashboard Data
  const [stats, setStats] = useState<SuperAdminStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Legacy User Management (for old API compatibility)
  const [legacyUsers, setLegacyUsers] = useState<LegacyUser[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // New User Management State
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pendingKyc, setPendingKyc] = useState<KycSubmission[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Modal and UI State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedKycSubmission, setSelectedKycSubmission] = useState<KycSubmissionWithRelations | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // API Base URL
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // API Functions
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:3001/api/v1/super-admin${endpoint}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      }
    );

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  };

  // Load Dashboard Stats
  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [statsRes, activityRes] = await Promise.all([
        apiCall('/dashboard/stats'),
        apiCall('/activity?limit=10'),
      ]);

      setStats(statsRes.data);
      setActivities(activityRes.data);
    } catch (_err) {
      setError('Failed to load dashboard data');
      // Error is handled by setting error state
    } finally {
      setLoading(false);
    }
  };

  // Load Users (Legacy API for backward compatibility)
  const loadLegacyUsers = async () => {
    try {
      setLoading(true);
      const response = await apiCall(`/users?search=${userSearch}&limit=100`);
      setLegacyUsers(response.data);
    } catch (_err) {
      setError('Failed to load users');
      // Error is handled by setting error state
    } finally {
      setLoading(false);
    }
  };

  // New User Management API calls
  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (_err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
      const response = await fetch('/api/roles');
      const data = await response.json();
      setRoles(data.roles || []);
    } catch (_err) {
      console.error('Failed to load roles');
    }
  };

  const loadBranches = async () => {
    try {
      const response = await fetch('/api/branches');
      const data = await response.json();
      setBranches(data.branches || []);
    } catch (_err) {
      console.error('Failed to load branches');
    }
  };

  const loadPendingKyc = async () => {
    try {
      const response = await fetch('/api/kyc/pending');
      const data = await response.json();
      setPendingKyc(data.submissions || []);
    } catch (_err) {
      console.error('Failed to load pending KYC');
    }
  };

  const loadInvitations = async () => {
    try {
      const response = await fetch('/api/invitations');
      const data = await response.json();
      setInvitations(data.invitations || []);
    } catch (_err) {
      console.error('Failed to load invitations');
    }
  };

  // Initialize
  useEffect(() => {
    if (activeTab === 'dashboard') {
      loadDashboardStats();
    } else if (activeTab === 'users') {
      loadUsers();
      loadRoles();
      loadBranches();
      loadPendingKyc();
      loadInvitations();
    }
  }, [activeTab]);

  // Dashboard Tab Component
  const DashboardTab = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats &&
          [
            {
              label: 'Total Users',
              value: stats.users,
              icon: Users,
              color: 'blue',
            },
            {
              label: 'Active Roles',
              value: stats.roles,
              icon: Shield,
              color: 'green',
            },
            {
              label: 'Routes',
              value: stats.routes,
              icon: Route,
              color: 'purple',
            },
            {
              label: 'Permissions',
              value: stats.permissions,
              icon: Key,
              color: 'orange',
            },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-l-blue-500"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 text-${stat.color}-600`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            <Activity className="inline w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {activities.map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-gray-100"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {activity.action.includes('create') && (
                      <Plus className="w-4 h-4 text-green-500" />
                    )}
                    {activity.action.includes('update') && (
                      <Edit3 className="w-4 h-4 text-blue-500" />
                    )}
                    {activity.action.includes('delete') && (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {activity.username || 'System'} {activity.action}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.entity_type} {activity.entity_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  {new Date(activity.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  // Users Management Tab - Complete User Management System
  const UsersTab = () => (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Total Users</dt>
              <dd className="text-2xl font-bold text-gray-900">{users.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Pending KYC</dt>
              <dd className="text-2xl font-bold text-gray-900">{pendingKyc.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Active Roles</dt>
              <dd className="text-2xl font-bold text-gray-900">{roles.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500">Invitations</dt>
              <dd className="text-2xl font-bold text-gray-900">{invitations.length}</dd>
            </div>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={loadUsers}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => setShowInviteModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Invite User</span>
          </button>
          
          <button
            onClick={() => setShowCreateUserModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Main Content Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'all-users', label: 'All Users', icon: Users },
              { id: 'pending-kyc', label: 'Pending KYC', icon: AlertTriangle },
              { id: 'invitations', label: 'Invitations', icon: Activity },
            ].map(tab => (
              <button
                key={tab.id}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => handleTabChange(tab.id)}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600 hover:text-red-800"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading...</span>
            </div>
          ) : (
            <>
              {/* All Users Table */}
              {(activeTab === 'users' || activeTab === 'all-users') && (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Roles
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Login
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map(user => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                  <User className="h-6 w-6 text-gray-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {user.first_name} {user.last_name}
                                </div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex space-x-1">
                              {user.roles.map(role => (
                                <span
                                  key={role.id}
                                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {role.name}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.status === 'active' 
                                ? 'bg-green-100 text-green-800'
                                : user.status === 'provisionally_active' 
                                ? 'bg-yellow-100 text-yellow-800'
                                : user.status === 'invited'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {user.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {user.last_login
                              ? new Date(user.last_login).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setSelectedUserId(user.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="View Profile"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className="text-green-600 hover:text-green-900"
                                title="Edit User"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                className="text-red-600 hover:text-red-900"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {users.length === 0 && (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                      <p className="text-gray-600 mb-4">Get started by creating your first user.</p>
                      <button
                        onClick={() => setShowCreateUserModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Create User
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Pending KYC Section */}
              {activeTab === 'pending-kyc' && (
                <div className="space-y-4">
                  {pendingKyc.map(submission => (
                    <div
                      key={submission.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedKycSubmission({
                        ...submission,
                        user: users.find(u => u.id === submission.user_id) || {} as UserType,
                        files: [],
                        approval_logs: []
                      })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {submission.first_name} {submission.last_name}
                          </h4>
                          <p className="text-sm text-gray-500">{submission.personal_email}</p>
                          <p className="text-xs text-gray-400">
                            Submitted {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                            Pending Review
                          </span>
                          <Eye className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pendingKyc.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">All caught up!</h3>
                      <p className="text-gray-600">No pending KYC submissions to review.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Invitations Section */}
              {activeTab === 'invitations' && (
                <div className="space-y-4">
                  {invitations.map(invitation => (
                    <div
                      key={invitation.id}
                      className="border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {invitation.invitee_name}
                          </h4>
                          <p className="text-sm text-gray-500">{invitation.invitee_email}</p>
                          <p className="text-xs text-gray-400">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                            {invitation.expires_at && (
                              <> • Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invitation.status === 'pending_kyc'
                              ? 'bg-yellow-100 text-yellow-800'
                              : invitation.status === 'kyc_submitted'
                              ? 'bg-blue-100 text-blue-800'
                              : invitation.status === 'expired'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {invitation.status}
                          </span>
                          {invitation.role && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {invitation.role.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {invitations.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations</h3>
                      <p className="text-gray-600 mb-4">Start by inviting users to join your organization.</p>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Send Invitation
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'orders', label: 'Order Management', icon: ShoppingCart },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'privileges', label: 'Privilege Management', icon: Shield },
    { id: 'activity', label: 'Activity Log', icon: Activity },
    { id: 'database', label: 'Database Browser', icon: Database },
    { id: 'security', label: 'Security Monitor', icon: Server },
    { id: 'settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-red-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">
                Super Admin Control Panel
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <TopNavDbIndicator />
              <button
                onClick={() => window.location.reload()}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-red-500 text-red-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'orders' && (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Order Management
                </h3>
                <p className="text-gray-500 mb-6">
                  Access the comprehensive Super Admin Order Management System
                </p>
                <a
                  href="/super-admin/orders"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Open Order Management
                </a>
              </div>
            )}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'privileges' && <PrivilegeManagement />}
            {activeTab === 'activity' && (
              <div className="h-full">
                <ActivityLogViewer />
              </div>
            )}
            {activeTab === 'database' && (
              <div className="h-full">
                <DatabaseBrowser />
              </div>
            )}
            {activeTab === 'security' && (
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Security Monitoring</h3>
                  <a
                    href="/super-admin/security"
                    className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Open Security Dashboard
                  </a>
                </div>
                <p className="text-gray-600">
                  Access comprehensive security audit results, real-time monitoring, 
                  and security metrics. Monitor authentication attempts, detect anomalies, 
                  and review security compliance status.
                </p>
              </div>
            )}
            {activeTab === 'settings' && (
              <div className="text-center py-12 text-gray-500">
                System Settings component coming soon...
              </div>
            )}
          </>
        )}
      </div>
      
      {/* User Management Modals and Components */}
      {showInviteModal && (
        <InviteUserModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            loadInvitations();
          }}
          roles={roles}
        />
      )}

      {showCreateUserModal && (
        <CreateFullUserModal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          onSuccess={() => {
            setShowCreateUserModal(false);
            loadUsers();
          }}
          roles={roles}
          branches={branches}
        />
      )}

      {selectedKycSubmission && (
        <KycReviewDrawer
          submission={selectedKycSubmission}
          isOpen={!!selectedKycSubmission}
          onClose={() => setSelectedKycSubmission(null)}
          onApprove={async (submissionId: string, notes?: string) => {
            // Handle KYC approval
            try {
              const response = await fetch(`/api/kyc/${submissionId}/approve`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notes }),
              });
              if (response.ok) {
                loadPendingKyc();
                loadUsers();
              }
            } catch (error) {
              console.error('Failed to approve KYC:', error);
            }
          }}
          onReject={async (submissionId: string, reason: string) => {
            // Handle KYC rejection
            try {
              const response = await fetch(`/api/kyc/${submissionId}/reject`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
              });
              if (response.ok) {
                loadPendingKyc();
              }
            } catch (error) {
              console.error('Failed to reject KYC:', error);
            }
          }}
        />
      )}

      {selectedUserId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <UserProfile
            userId={selectedUserId}
            currentUser={users.find(u => u.id === selectedUserId)}
          />
          <button
            onClick={() => setSelectedUserId(null)}
            className="fixed top-4 right-4 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100"
          >
            <XCircle className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SuperAdminControlPanel;
