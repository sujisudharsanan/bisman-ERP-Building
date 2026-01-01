"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useAuth } from "@/common/hooks/useAuth";
import { useRouter } from 'next/navigation';
import { getRoleDisplayName } from '@/utils/roleDisplay';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { CreateFullUserModal } from '@/components/user-management';
import {
  Key,
  UserPlus,
  Users,
  Edit2,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
  Search,
  X,
  Check,
  Crown,
} from "lucide-react";

type Msg = { type: "success" | "error"; text: string } | null;

export default function UserSettingsPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Check if user has admin permissions
  const isAdmin = useMemo(() => {
    const role = (user as any)?.role || (user as any)?.roleName || '';
    return ['SUPER_ADMIN', 'ADMIN', 'ENTERPRISE_ADMIN', 'HR', 'HR_MANAGER', 'SYSTEM_ADMIN'].includes(role);
  }, [user]);

  // Check if user is super admin (can assign any role)
  const isSuperAdmin = useMemo(() => {
    const role = (user as any)?.role || (user as any)?.roleName || '';
    return ['SUPER_ADMIN', 'ENTERPRISE_ADMIN'].includes(role);
  }, [user]);

  // Create user modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);

  // Subscription limits for admin view
  const { 
    canCreateUser,
    usagePercentage,
    remainingSlots,
    activeUsers,
    maxUsers,
    planName,
    refresh: refreshSubscription,
  } = useSubscriptionLimits();

  // Roles that only super admins can assign
  const SUPER_ADMIN_ONLY_ROLES = ['SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'SUPER ADMIN', 'ENTERPRISE ADMIN'];

  // User Management state
  interface ManagedUser {
    id: string;
    username: string;
    email: string;
    role: string;
    is_active: boolean;
    created_at?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    mobile?: string;
    reporting_authority_id?: string;
    branch_id?: string;
  }
  interface AvailableRole {
    id: string;
    name: string;
  }
  const [usersList, setUsersList] = useState<ManagedUser[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersSearchQuery, setUsersSearchQuery] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<string>('');
  
  // Edit User Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserData, setEditUserData] = useState<{
    id: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
    is_active: boolean;
    reporting_authority_id?: string;
    branch_id?: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Available users for reporting authority dropdown
  const [availableManagers, setAvailableManagers] = useState<{ id: string; name: string; role: string }[]>([]);
  // Available branches
  const [availableBranches, setAvailableBranches] = useState<{ id: string; name: string }[]>([]);

  // Fetch users list (include inactive for admin management, include_self to show all users including current admin)
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(usersSearchQuery)}&limit=100&include_inactive=true&include_self=true`, {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data.users || data || []);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch available roles
  const fetchRoles = async () => {
    try {
      const res = await fetch('/api/roles', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        let roles = data.roles || data || [];
        
        // Filter out super admin roles for non-super-admin users
        if (!isSuperAdmin) {
          roles = roles.filter((r: any) => {
            const roleName = (r.name || '').toUpperCase().replace(/\s+/g, '_');
            return !SUPER_ADMIN_ONLY_ROLES.includes(roleName) && 
                   !SUPER_ADMIN_ONLY_ROLES.includes(r.name);
          });
        }
        
        setAvailableRoles(roles.map((r: any) => ({ id: String(r.id || r.name), name: r.name })));
      }
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }
  };
  
  // Fetch available managers (for reporting authority dropdown)
  const fetchManagers = async () => {
    try {
      const res = await fetch('/api/users/search?limit=100&include_self=true', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const users = data.users || data || [];
        setAvailableManagers(users.map((u: any) => ({ 
          id: u.id, 
          name: u.fullName || u.username || u.email,
          role: u.role || u.roleName || ''
        })));
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };
  
  // Fetch available branches (with fallback to office locations from contracts)
  const fetchBranches = async () => {
    try {
      // First try to fetch from branches endpoint
      const res = await fetch('/api/branches', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const branches = data.branches || data.data || data || [];
        if (branches.length > 0) {
          setAvailableBranches(branches.map((b: any) => ({ 
            id: String(b.id), 
            name: b.name || b.branchName || b.branch_name 
          })));
          return;
        }
      }
      
      // Fallback: fetch office locations from RENT contracts (same as user creation page)
      const locRes = await fetch('/api/admin/contracts?contract_type=RENT', { credentials: 'include' });
      if (locRes.ok) {
        const locData = await locRes.json();
        const allContracts = locData.data?.contracts || locData.contracts || [];
        // Filter to only ACTIVE or DRAFT status
        const contracts = allContracts.filter((c: any) => 
          c.status === 'ACTIVE' || c.status === 'DRAFT'
        );
        if (contracts.length > 0) {
          setAvailableBranches(contracts.map((c: any) => ({ 
            id: String(c.id), 
            name: c.party_name || c.title || c.rent_details?.property_address || 'Unknown Location'
          })));
        }
      }
    } catch (err) {
      console.error('Failed to fetch branches:', err);
    }
  };

  // Load users on mount for admins
  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchRoles();
      fetchManagers();
      fetchBranches();
    }
  }, [isAdmin, isSuperAdmin]);

  // Handle role update
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Role updated successfully' });
        setEditingUserId(null);
        fetchUsers();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to update role' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update role' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle user disable/enable toggle
  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: currentStatus ? 'User disabled' : 'User enabled' });
        fetchUsers();
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to update status' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to update status' });
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit modal for a user
  const handleOpenEditModal = (user: ManagedUser) => {
    console.log('[EditUser] Opening modal for user:', user);
    console.log('[EditUser] User reporting_authority_id:', user.reporting_authority_id, typeof user.reporting_authority_id);
    console.log('[EditUser] User branch_id:', user.branch_id, typeof user.branch_id);
    setEditUserData({
      id: user.id,
      username: user.username,
      email: user.email,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phone || user.mobile || '',
      role: user.role,
      is_active: user.is_active,
      reporting_authority_id: user.reporting_authority_id ? String(user.reporting_authority_id) : '',
      branch_id: user.branch_id ? String(user.branch_id) : '',
    });
    setShowEditModal(true);
  };

  // Save user edits
  const handleSaveUserEdit = async () => {
    if (!editUserData) return;
    
    setActionLoading(editUserData.id);
    try {
      console.log('[EditUser] Saving user:', editUserData.id, {
        first_name: editUserData.first_name,
        last_name: editUserData.last_name,
        phone: editUserData.phone,
        role: editUserData.role,
        reporting_authority_id: editUserData.reporting_authority_id,
        branch_id: editUserData.branch_id,
      });
      
      const res = await fetch(`/api/system/users/${editUserData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          first_name: editUserData.first_name || null,
          last_name: editUserData.last_name || null,
          phone: editUserData.phone || null,
          role: editUserData.role,
          reporting_authority_id: editUserData.reporting_authority_id || null,
          branch_id: editUserData.branch_id || null,
        }),
      });
      
      console.log('[EditUser] Response status:', res.status);
      const responseData = await res.json();
      console.log('[EditUser] Response data:', responseData);
      
      if (res.ok && responseData.success) {
        setMessage({ type: 'success', text: 'User updated successfully' });
        setShowEditModal(false);
        setEditUserData(null);
        fetchUsers();
      } else {
        setMessage({ type: 'error', text: responseData.error || responseData.message || 'Failed to update user' });
      }
    } catch (err) {
      console.error('[EditUser] Error:', err);
      setMessage({ type: 'error', text: 'Failed to update user' });
    } finally {
      setActionLoading(null);
    }
  };

  // Handle password reset
  const handlePasswordReset = async (userId: string, email: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/auth/admin-password-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ user_id: userId, email }),
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Password reset link sent to user email' });
      } else {
        const errData = await res.json();
        setMessage({ type: 'error', text: errData.message || 'Failed to send reset link' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to send reset link' });
    } finally {
      setActionLoading(null);
    }
  };

  // Message state for notifications
  const [message, setMessage] = useState<Msg>(null);

  return (
    <div className="space-y-6">
      {/* Main Content Container */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
        {/* Messages */}
        {message && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200"
              }`}
            >
              {message.text}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {isAdmin ? (
            <div className="space-y-6">
              {/* Subscription Overview Strip */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-100 dark:border-blue-800">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <Users className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                        User Management
                      </h2>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium">{planName || 'Free Plan'}</span>
                        </span>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span>Renewal: Active</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    disabled={!canCreateUser}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Create User
                  </button>
                </div>

                {/* Resource Usage Breakdown */}
                <div className="bg-white/70 dark:bg-gray-800/70 rounded-lg p-4 space-y-4">
                  {/* Users Resource */}
                  <div className="flex items-center gap-4">
                    <div className="w-24 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Users
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${
                              usagePercentage >= 90 ? 'bg-red-500' : 
                              usagePercentage >= 75 ? 'bg-amber-500' : 'bg-blue-500'
                            }`}
                            style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[80px]">
                          {activeUsers} / {maxUsers || '∞'}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 min-w-[140px] text-right">
                      {remainingSlots === 'unlimited' 
                        ? 'Unlimited (Fair use)' 
                        : `Can create ${remainingSlots} more`
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Utilization Charts */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Plan vs Usage Chart */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Plan vs Usage
                  </h3>
                  <div className="flex items-center justify-center">
                    <div className="relative w-32 h-32">
                      {/* Circular Progress */}
                      <svg className="w-32 h-32 transform -rotate-90">
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-gray-200 dark:text-gray-700"
                        />
                        <circle
                          cx="64"
                          cy="64"
                          r="56"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={`${(usagePercentage || 0) * 3.52} 352`}
                          className={`${
                            usagePercentage >= 90 ? 'text-red-500' : 
                            usagePercentage >= 75 ? 'text-amber-500' : 'text-blue-500'
                          }`}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                          {Math.round(usagePercentage || 0)}%
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Used</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                        Active Users
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{activeUsers}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                        <span className="w-3 h-3 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                        Available Slots
                      </span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {remainingSlots === 'unlimited' ? '∞' : remainingSlots}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Resource Allocation */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Resource Allocation
                  </h3>
                  <div className="space-y-4">
                    {/* User Slots Bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                        <span>User Slots</span>
                        <span>{activeUsers}/{maxUsers || '∞'}</span>
                      </div>
                      <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden flex">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 flex items-center justify-end pr-2"
                          style={{ width: `${Math.min(usagePercentage || 0, 100)}%` }}
                        >
                          {usagePercentage >= 20 && (
                            <span className="text-xs text-white font-medium">{activeUsers}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Plan Capacity Indicator */}
                    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {planName || 'Free Plan'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{maxUsers || '∞'}</div>
                          <div className="text-gray-500 dark:text-gray-400">Max Users</div>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center">
                          <div className="text-lg font-bold text-green-600 dark:text-green-400">
                            {remainingSlots === 'unlimited' ? '∞' : remainingSlots}
                          </div>
                          <div className="text-gray-500 dark:text-gray-400">Available</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan Comparison */}
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
                    Plan Comparison
                  </h3>
                  <div className="space-y-3">
                    {/* Current Plan Highlight */}
                    <div className={`rounded-lg p-3 border-2 ${
                      (planName || 'Free').toLowerCase().includes('enterprise') 
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                        : (planName || 'Free').toLowerCase().includes('pro') 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Crown className={`w-4 h-4 ${
                            (planName || 'Free').toLowerCase().includes('enterprise') 
                              ? 'text-purple-500' 
                              : (planName || 'Free').toLowerCase().includes('pro') 
                                ? 'text-blue-500'
                                : 'text-gray-400'
                          }`} />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {planName || 'Free Plan'}
                          </span>
                        </div>
                        <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                          Current
                        </span>
                      </div>
                    </div>

                    {/* Usage Trend Indicator */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        usagePercentage >= 90 ? 'bg-red-100 dark:bg-red-900/30' :
                        usagePercentage >= 75 ? 'bg-amber-100 dark:bg-amber-900/30' :
                        'bg-green-100 dark:bg-green-900/30'
                      }`}>
                        {usagePercentage >= 90 ? (
                          <span className="text-lg">⚠️</span>
                        ) : usagePercentage >= 75 ? (
                          <span className="text-lg">📊</span>
                        ) : (
                          <span className="text-lg">✓</span>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {usagePercentage >= 90 ? 'Near Limit' :
                           usagePercentage >= 75 ? 'Growing Usage' :
                           'Healthy Usage'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {usagePercentage >= 90 
                            ? 'Consider upgrading your plan'
                            : usagePercentage >= 75 
                              ? 'Monitor your usage closely'
                              : 'Plenty of capacity available'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users List with Actions */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      All Users
                    </h3>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search users..."
                          value={usersSearchQuery}
                          onChange={(e) => setUsersSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                          className="pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <button
                        onClick={fetchUsers}
                        disabled={usersLoading}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-4 h-4 ${usersLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {usersLoading ? (
                  <div className="p-8 text-center">
                    <RefreshCw className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">Loading users...</p>
                  </div>
                ) : usersList.length === 0 ? (
                  <div className="p-8 text-center">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No users found. Click refresh to load users.</p>
                    <button
                      onClick={fetchUsers}
                      className="mt-4 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                      Load Users
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                          <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                                  {(u.username || u.email || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                                    {u.username || 'No username'}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {u.email}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              {editingUserId === u.id ? (
                                <div className="flex items-center gap-2">
                                  <select
                                    value={editingRole}
                                    onChange={(e) => setEditingRole(e.target.value)}
                                    className="text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                  >
                                    {availableRoles.map((r) => (
                                      <option key={r.id} value={r.name}>{r.name}</option>
                                    ))}
                                  </select>
                                  <button
                                    onClick={() => handleRoleUpdate(u.id, editingRole)}
                                    disabled={actionLoading === u.id}
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                                    title="Save"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => setEditingUserId(null)}
                                    className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                                    title="Cancel"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200">
                                  {u.role || 'No Role'}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                u.is_active
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                              }`}>
                                {u.is_active ? 'Active' : 'Disabled'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {/* Edit User - Opens Modal */}
                                <button
                                  onClick={() => handleOpenEditModal(u)}
                                  disabled={actionLoading === u.id}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Edit User"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Toggle Active Status */}
                                <button
                                  onClick={() => handleToggleActive(u.id, u.is_active)}
                                  disabled={actionLoading === u.id}
                                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                                    u.is_active
                                      ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                                      : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                                  }`}
                                  title={u.is_active ? 'Disable User' : 'Enable User'}
                                >
                                  {u.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                                </button>

                                {/* Password Reset */}
                                <button
                                  onClick={() => handlePasswordReset(u.id, u.email)}
                                  disabled={actionLoading === u.id}
                                  className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors disabled:opacity-50"
                                  title="Reset Password"
                                >
                                  <Key className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* More Options Links */}
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  More Options
                </h3>
                <div className="space-y-3">
                  <a
                    href="/system/permission-manager"
                    className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-orange-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Permission Manager</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Manage user permissions and access</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                  <a
                    href="/system/roles-users-report"
                    className="flex items-center justify-between py-3 hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-blue-600" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-gray-100">Roles & Users Report</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">View all roles and assigned users</div>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Access Restricted
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                You don&apos;t have permission to access user management. Please contact your administrator if you need access.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {showEditModal && editUserData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowEditModal(false)}>
          <div 
            className="bg-white dark:bg-gray-900 rounded-xl shadow-xl w-full max-w-md mx-4 p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Edit User</h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Username - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={editUserData.username}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* Email - Read Only */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={editUserData.email}
                  readOnly
                  disabled
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                />
              </div>

              {/* First Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  value={editUserData.first_name}
                  onChange={(e) => setEditUserData({ ...editUserData, first_name: e.target.value })}
                  placeholder="Enter first name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editUserData.last_name}
                  onChange={(e) => setEditUserData({ ...editUserData, last_name: e.target.value })}
                  placeholder="Enter last name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Phone/Mobile */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone / Mobile
                </label>
                <input
                  type="tel"
                  value={editUserData.phone}
                  onChange={(e) => setEditUserData({ ...editUserData, phone: e.target.value })}
                  placeholder="Enter phone number"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={editUserData.role}
                  onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  {availableRoles.map((r) => (
                    <option key={r.id} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </div>

              {/* Reporting Authority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reporting Authority
                </label>
                <select
                  value={editUserData.reporting_authority_id || ''}
                  onChange={(e) => setEditUserData({ ...editUserData, reporting_authority_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Reporting Authority</option>
                  {availableManagers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Branch
                </label>
                <select
                  value={editUserData.branch_id || ''}
                  onChange={(e) => setEditUserData({ ...editUserData, branch_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Branch</option>
                  {availableBranches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              {/* Status Display */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                  editUserData.is_active 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
                }`}>
                  {editUserData.is_active ? 'Active' : 'Disabled'}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Use the toggle button in the users list to change status
                </p>
              </div>

              {/* Password Reset */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password Reset
                </label>
                <button
                  onClick={() => handlePasswordReset(editUserData.id, editUserData.email)}
                  disabled={actionLoading === editUserData.id}
                  className="w-full px-3 py-2 text-sm font-medium text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Key className="w-4 h-4" />
                  Send Password Reset Link
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  An email will be sent to {editUserData.email}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUserEdit}
                disabled={actionLoading === editUserData.id || !editUserData.role}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === editUserData.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <CreateFullUserModal
        isOpen={showCreateUserModal}
        onClose={() => setShowCreateUserModal(false)}
        onSuccess={() => {
          setShowCreateUserModal(false);
          fetchUsers();
          refreshSubscription();
        }}
      />
    </div>
  );
}
