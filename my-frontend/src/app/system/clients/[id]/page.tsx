"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import API_BASE from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// Types
// ============================================================================

interface ClientUser {
  id: number | string;
  name: string;
  username?: string;
  email: string;
  role: string;
  status: string;
  is_active?: boolean;
  last_login?: string | null;
  created_at?: string;
  hasPassword?: boolean;
}

interface Subscription {
  planId?: number;
  planCode: string;
  planName: string;
  priceMonthly?: number;
  priceYearly?: number;
  state?: string;
  startedAt?: string;
  expiresAt?: string;
  trialEndDate?: string;
  isActive?: boolean;
}

interface ClientRole {
  id: number;
  name: string;
  display_name?: string;
  level?: number;
  userCount?: number;
}

interface RoleUtilization {
  id: number;
  name: string;
  display_name?: string;
  level?: number;
  assigned: number;
  limit: number;
  percentage: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  date: string;
}

interface ClientDetails {
  id: string;
  name: string;
  legal_name?: string;
  trade_name?: string;
  client_code?: string;
  status: string;
  client_type?: string;
  industry?: string;
  business_size?: string;
  tax_id?: string;
  email?: string;
  phone?: string;
  created_at?: string;
  
  // Subscription info from API
  currentSubscription?: Subscription;
  subscriptionPlan?: string;
  trial_start_date?: string;
  trial_end_date?: string;
  
  // Related data
  admin_users?: ClientUser[];
  users?: ClientUser[];
  roles?: ClientRole[];
  invoices?: Invoice[];
  
  // User counts from API
  total_users?: number;
  active_users?: number;
  modules_enabled?: string[];
  
  // Settings from enterprise
  settings?: {
    enterprise?: {
      legal_name?: string;
      trade_name?: string;
      client_code?: string;
      client_type?: string;
      tax_id?: string;
      industry?: string;
      business_size?: string;
      status?: string;
      contacts?: Array<{
        name?: string;
        email?: string;
        phone?: string;
        role?: string;
        primary?: boolean;
      }>;
      addresses?: Array<{
        line1?: string;
        city?: string;
        state?: string;
        country?: string;
        pincode?: string;
      }>;
      [key: string]: any;
    };
    max_users?: number;
    storage_limit_gb?: number;
    [key: string]: any;
  };
}

// ============================================================================
// Tab Types
// ============================================================================

type TabId = 'overview' | 'users' | 'subscription' | 'roles' | 'utilization';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// Icons
// ============================================================================

const Icons = {
  ArrowLeft: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  ),
  Refresh: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4h-1a2 2 0 00-2 2v1M21 11l-8 8-4 1 1-4 8-8" />
    </svg>
  ),
  Overview: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  Users: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  CreditCard: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Chart: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Ban: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  Key: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  ),
};

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: string;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

function StatCard({ label, value, icon, trend, color = 'blue' }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {label}
        </span>
        {icon && <span className={iconColorClasses[color]}>{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
      </div>
      {trend && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {trend}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Role Utilization Bar
// ============================================================================

function RoleUtilizationBar({ role }: { role: RoleUtilization }) {
  const maxAllowed = role.limit || 10;
  const percentage = Math.min(100, (role.assigned / maxAllowed) * 100);
  
  return (
    <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {role.display_name || role.name}
          </span>
          {role.level && (
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
              L{role.level}
            </span>
          )}
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {role.assigned} / {maxAllowed}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all ${
            percentage > 80 ? 'bg-orange-500' : percentage > 50 ? 'bg-blue-500' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClientDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const clientId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<ClientDetails | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview', icon: <Icons.Overview /> },
    { id: 'users', label: 'Users', icon: <Icons.Users /> },
    { id: 'subscription', label: 'Subscription', icon: <Icons.CreditCard /> },
    { id: 'roles', label: 'Roles & Permissions', icon: <Icons.Shield /> },
    { id: 'utilization', label: 'Utilization', icon: <Icons.Chart /> },
  ];

  // Fetch client details
  async function fetchClient() {
    try {
      setLoading(true);
      
      // Fetch client details (includes admin_users and currentSubscription)
      const res = await fetch(`${API_BASE}/api/system/clients/${clientId}`, { credentials: 'include' });
      const json = await res.json();
      
      if (!res.ok) throw new Error(json.error || 'Failed to load client');
      
      const data = json.data || json;
      console.log('[ClientDetails] Loaded client data:', data);
      
      // Fetch additional data in parallel
      const [rolesRes, subscriptionRes, allUsersRes] = await Promise.all([
        fetch(`${API_BASE}/api/system/clients/${clientId}/roles`, { credentials: 'include' }).catch(() => null),
        fetch(`${API_BASE}/api/system/clients/${clientId}/subscription`, { credentials: 'include' }).catch(() => null),
        // Fetch all users for this client/tenant
        fetch(`${API_BASE}/api/enterprise/users?tenant_id=${clientId}`, { credentials: 'include' }).catch(() => null),
      ]);

      let roles: ClientRole[] = [];
      let allUsers: ClientUser[] = [];

      // Parse roles response
      if (rolesRes?.ok) {
        const rolesJson = await rolesRes.json();
        roles = (rolesJson.roles || rolesJson.data || []).map((r: any) => ({
          id: r.id,
          name: r.name,
          display_name: r.display_name || r.name,
          level: r.level,
          userCount: r.userCount || 0,
        }));
        console.log('[ClientDetails] Loaded roles:', roles.length);
      }

      // Parse subscription response (more detailed than what's in client data)
      let subscriptionData = data.currentSubscription;
      if (subscriptionRes?.ok) {
        const subJson = await subscriptionRes.json();
        if (subJson.planId || subJson.planCode) {
          subscriptionData = {
            planId: subJson.planId || subJson.plan_id,
            planCode: subJson.planCode || subJson.plan_code,
            planName: subJson.planName || subJson.plan_name,
            priceMonthly: subJson.priceMonthly || subJson.price_monthly,
            priceYearly: subJson.priceYearly || subJson.price_yearly,
            state: subJson.state,
            startedAt: subJson.startedAt || subJson.started_at,
            expiresAt: subJson.expiresAt || subJson.expires_at,
            isActive: subJson.isActive ?? subJson.is_active,
          };
        }
        console.log('[ClientDetails] Loaded subscription:', subscriptionData);
      }

      // Parse all users response - first try from main client API, then fallback to users API
      // The main client API now returns users array with all users
      if (data.users && data.users.length > 0) {
        allUsers = data.users.map((u: any) => ({
          id: u.id,
          name: u.name || u.username || u.email?.split('@')[0],
          username: u.username,
          email: u.email,
          role: u.role || 'User',
          status: u.is_active ? 'Active' : 'Inactive',
          is_active: u.is_active,
          last_login: u.last_login,
          created_at: u.created_at,
          hasPassword: u.hasPassword,
        }));
        console.log('[ClientDetails] Loaded users from client API:', allUsers.length);
      } else if (allUsersRes?.ok) {
        const usersJson = await allUsersRes.json();
        allUsers = (usersJson.users || usersJson.data || []).map((u: any) => ({
          id: u.id,
          name: u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username || u.name || u.email?.split('@')[0],
          username: u.username,
          email: u.email,
          role: u.role || 'User',
          status: u.is_active ? 'Active' : 'Inactive',
          is_active: u.is_active,
          last_login: u.last_login,
          created_at: u.created_at,
        }));
        console.log('[ClientDetails] Loaded all users from users API:', allUsers.length);
      }

      // Use admin_users from client data
      const adminUsers = (data.admin_users || []).map((u: any) => ({
        id: u.id,
        name: u.name || u.username || u.email?.split('@')[0],
        email: u.email,
        role: u.role || 'Admin',
        status: 'Active',
        is_active: true,
        hasPassword: u.hasPassword,
      }));

      // Use allUsers directly if available, otherwise fall back to merged users
      const finalUsers = allUsers.length > 0 ? allUsers : adminUsers;

      // Extract enterprise settings for display
      const enterprise = data.settings?.enterprise || {};
      
      setClient({
        ...data,
        // Override with enterprise settings if available
        legal_name: enterprise.legal_name || data.legal_name || data.name,
        trade_name: enterprise.trade_name || data.trade_name,
        client_code: enterprise.client_code || data.client_code,
        client_type: enterprise.client_type || data.client_type,
        tax_id: enterprise.tax_id || data.tax_id,
        industry: enterprise.industry || data.industry,
        business_size: enterprise.business_size || data.business_size,
        status: enterprise.status || data.status || 'Active',
        // Get contact info from enterprise contacts
        email: enterprise.contacts?.[0]?.email || data.email,
        phone: enterprise.contacts?.[0]?.phone || data.phone,
        // Use API counts if available, otherwise compute
        total_users: data.total_users ?? finalUsers.length,
        active_users: data.active_users ?? finalUsers.filter((u: ClientUser) => u.is_active).length,
        // Use enhanced data
        currentSubscription: subscriptionData,
        users: finalUsers,
        admin_users: adminUsers,
        roles,
      });
    } catch (e: any) {
      console.error('Failed to fetch client:', e);
      // Don't alert, just set error state
      setClient(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await fetchClient();
    setRefreshing(false);
  }

  useEffect(() => {
    if (clientId) {
      fetchClient();
    }
  }, [clientId]);

  // Computed values
  const subscriptionInfo = useMemo(() => {
    if (!client) return null;
    const sub = client.currentSubscription;
    return {
      planName: sub?.planName || client.subscriptionPlan || 'Free',
      planCode: sub?.planCode || 'free',
      state: sub?.state || 'active',
      priceMonthly: sub?.priceMonthly || 0,
      priceYearly: sub?.priceYearly || 0,
      startDate: sub?.startedAt || client.trial_start_date,
      endDate: sub?.expiresAt || client.trial_end_date,
      isActive: sub?.isActive ?? true,
    };
  }, [client]);

  // Calculate user counts - prefer API counts, fallback to computed
  const userCounts = useMemo(() => {
    // Use API-provided counts if available (most accurate)
    if (client?.total_users !== undefined) {
      return { 
        total: client.total_users, 
        active: client.active_users ?? client.total_users 
      };
    }
    // Fallback to counting from users array
    const users = client?.users || [];
    const total = users.length;
    const active = users.filter(u => u.is_active || u.status === 'Active' || u.status === 'active').length;
    return { total, active };
  }, [client?.total_users, client?.active_users, client?.users]);

  // Get enabled modules count
  const enabledModulesCount = useMemo(() => {
    return (client?.modules_enabled || []).length;
  }, [client?.modules_enabled]);

  // Role summary
  const roleSummary = useMemo(() => {
    if (!client?.roles) return { count: 0, roles: [] };
    return {
      count: client.roles.length,
      roles: client.roles,
    };
  }, [client?.roles]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-700 dark:text-gray-300">Loading client details...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Client not found</p>
        <Link
          href="/system/user-management"
          className="text-blue-600 hover:text-blue-700 flex items-center gap-2"
        >
          <Icons.ArrowLeft /> Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 -mx-4 -mt-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            {/* Back button */}
            <Link
              href="/system/user-management"
              className="mt-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Back to Clients"
            >
              <Icons.ArrowLeft />
            </Link>
            
            <div>
              {/* Client Name */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.legal_name || client.name}
              </h1>
              
              {/* Client Code */}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {client.client_code || client.id}
                {client.client_type && (
                  <span className="ml-2">• {client.client_type}</span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              client.status === 'Active' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
            }`}>
              {client.status || 'Active'}
            </span>
            
            {/* Action Buttons */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                refreshing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <span className={refreshing ? 'animate-spin' : ''}><Icons.Refresh /></span>
              <span className="hidden sm:inline">Refresh</span>
            </button>
            
            <Link
              href={`/system/user-management?edit=${client.id}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Icons.Edit />
              <span className="hidden sm:inline">Edit Client</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors
                  ${isActive 
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'
                  }
                `}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Subscription Plan"
                value={subscriptionInfo?.planName || 'Free'}
                icon={<Icons.CreditCard />}
                color="purple"
              />
              <StatCard
                label="Expiry Date"
                value={subscriptionInfo?.endDate 
                  ? new Date(subscriptionInfo.endDate).toLocaleDateString()
                  : 'N/A'}
                icon={<Icons.CreditCard />}
                color={subscriptionInfo?.isActive ? 'green' : 'orange'}
              />
              <StatCard
                label="Total Users"
                value={userCounts.total}
                icon={<Icons.Users />}
                color="blue"
              />
              <StatCard
                label="Active Users"
                value={userCounts.active}
                icon={<Icons.Users />}
                color="green"
              />
              <StatCard
                label="Assigned Roles"
                value={roleSummary.count}
                icon={<Icons.Shield />}
                color="purple"
              />
            </div>

            {/* Roles Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Assigned Roles
              </h3>
              {roleSummary.count === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No roles assigned to this client yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {roleSummary.roles.map((role) => (
                    <span
                      key={role.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm"
                    >
                      <Icons.Shield />
                      {role.display_name || role.name}
                      {role.level && (
                        <span className="text-xs px-1 py-0.5 rounded bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                          L{role.level}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4">
                <Link
                  href="#"
                  onClick={(e) => { e.preventDefault(); setActiveTab('roles'); }}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  View Details →
                </Link>
              </div>
            </div>

            {/* Client Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Business Information
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Legal Name</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.legal_name || client.name || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Trade Name</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.trade_name || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Industry</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.industry || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Business Size</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.business_size || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Tax ID</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.tax_id || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Contact Information
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Email</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.email || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Phone</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.phone || '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Users ({client.users?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {(client.users || []).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                        No users found
                      </td>
                    </tr>
                  ) : (
                    (client.users || []).map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {u.name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {u.email}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            u.status === 'active' || u.status === 'Active'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {u.last_login 
                            ? new Date(u.last_login).toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              title="View User"
                            >
                              <Icons.Eye />
                            </button>
                            <button 
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              title="Disable User"
                            >
                              <Icons.Ban />
                            </button>
                            <button 
                              className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                              title="Reset Password"
                            >
                              <Icons.Key />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Subscription Tab */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            {/* Current Plan */}
            <div className={`bg-gradient-to-br ${
              subscriptionInfo?.isActive 
                ? 'from-purple-600 to-blue-600' 
                : 'from-gray-600 to-gray-700'
            } rounded-xl p-6 text-white`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-purple-200 text-sm mb-1">Current Plan</p>
                  <h3 className="text-3xl font-bold">{subscriptionInfo?.planName || 'Free'}</h3>
                  {(subscriptionInfo?.priceMonthly || subscriptionInfo?.priceYearly) ? (
                    <p className="text-purple-200 mt-2">
                      ₹{subscriptionInfo.priceMonthly?.toLocaleString() || 0}/month
                      {subscriptionInfo.priceYearly ? ` or ₹${subscriptionInfo.priceYearly.toLocaleString()}/year` : ''}
                    </p>
                  ) : (
                    <p className="text-purple-200 mt-2">Free tier</p>
                  )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscriptionInfo?.isActive || subscriptionInfo?.state === 'active'
                    ? 'bg-green-500/20 text-green-100'
                    : 'bg-yellow-500/20 text-yellow-100'
                }`}>
                  {subscriptionInfo?.state?.charAt(0).toUpperCase() + (subscriptionInfo?.state?.slice(1) || '') || 'Active'}
                </span>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Subscription Details
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Plan Code</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {subscriptionInfo?.planCode || '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Status</dt>
                    <dd className="text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        subscriptionInfo?.isActive || subscriptionInfo?.state === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {subscriptionInfo?.state || (subscriptionInfo?.isActive ? 'Active' : 'Inactive')}
                      </span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Start Date</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {subscriptionInfo?.startDate 
                        ? new Date(subscriptionInfo.startDate).toLocaleDateString()
                        : '-'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Expiry Date</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {subscriptionInfo?.endDate 
                        ? new Date(subscriptionInfo.endDate).toLocaleDateString()
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Plan Limits
                </h3>
                <dl className="space-y-3">
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Max Users</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.settings?.max_users || 'Unlimited'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Storage Limit</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.settings?.storage_limit_gb ? `${client.settings.storage_limit_gb} GB` : 'Unlimited'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm text-gray-500 dark:text-gray-400">Created At</dt>
                    <dd className="text-sm text-gray-900 dark:text-white font-medium">
                      {client.created_at 
                        ? new Date(client.created_at).toLocaleDateString()
                        : '-'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Invoice History */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Invoice History
                </h3>
              </div>
              <div className="p-6">
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  Invoice history is managed through the billing system.
                  <br />
                  <span className="text-xs">Contact support for billing inquiries.</span>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Roles & Permissions Tab */}
        {activeTab === 'roles' && (
          <div className="space-y-6">
            {/* Assigned Roles */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Assigned Roles
                </h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {roleSummary.count} roles assigned
                </span>
              </div>
              
              <div className="space-y-3">
                {roleSummary.count === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No roles assigned to this client.
                    <br />
                    <span className="text-xs">Use the Manage Roles button to assign roles.</span>
                  </p>
                ) : (
                  roleSummary.roles.map((role) => (
                    <div 
                      key={role.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Icons.Shield />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {role.display_name || role.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Role ID: {role.id}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {role.level && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              Level {role.level}
                            </span>
                          )}
                          {role.userCount !== undefined && (
                            <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {role.userCount} users
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Manage Roles Button */}
            <div className="flex justify-end">
              <Link
                href={`/system/permission-manager?client=${client.id}`}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Icons.Shield />
                Manage Roles
              </Link>
            </div>
          </div>
        )}

        {/* Utilization Tab */}
        {activeTab === 'utilization' && (
          <div className="space-y-6">
            {/* Module Usage */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Module Usage
              </h3>
              
              {(client.modules_enabled || []).length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No modules enabled
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {(client.modules_enabled || []).map((moduleKey) => (
                    <div 
                      key={moduleKey}
                      className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                          {moduleKey.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Active
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Usage Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Page Access (Last 30 Days)
                </h3>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Icons.Chart />
                  <p className="mt-2">Analytics data coming soon</p>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  API Usage (Last 30 Days)
                </h3>
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Icons.Chart />
                  <p className="mt-2">Analytics data coming soon</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
