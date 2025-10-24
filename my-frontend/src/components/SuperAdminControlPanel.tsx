'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import ResponsiveDashboardLayout from '@/components/layouts/ResponsiveDashboardLayout';
import DarkModeToggle from '@/components/ui/DarkModeToggle';
import DynamicSidebar from '@/common/components/DynamicSidebar';

const HeaderLogo: React.FC = () => {
  const [logoError, setLogoError] = useState(false);

  if (logoError) {
    return (
      <div className="mr-3 w-7 h-7 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs text-gray-500 dark:text-gray-400">
        B
      </div>
    );
  }

  return (
    <Image
      src="/brand/logo.svg"
      alt="Company logo"
      title="Company logo"
      width={80}
      height={80}
      className="mr-3 h-10 w-auto object-contain align-middle shrink-0 filter-none invert-0 dark:invert-0"
      priority
      onError={() => setLogoError(true)}
    />
  );
};
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
  LogOut,
  LayoutDashboard,
} from 'lucide-react';

// ✅ PERFORMANCE: Lazy load heavy components with dynamic imports
// This reduces initial bundle size from 12MB to ~3-4MB
const TopNavDbIndicator = dynamic(
  () => import('@/components/user-management').then(mod => ({ default: mod.TopNavDbIndicator })),
  { 
    loading: () => <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />,
    ssr: false 
  }
);

const InviteUserModal = dynamic(
  () => import('@/components/user-management').then(mod => ({ default: mod.InviteUserModal })),
  { ssr: false }
);

const CreateFullUserModal = dynamic(
  () => import('@/components/user-management').then(mod => ({ default: mod.CreateFullUserModal })),
  { ssr: false }
);

const KycReviewDrawer = dynamic(
  () => import('@/components/user-management').then(mod => ({ default: mod.KycReviewDrawer })),
  { ssr: false }
);

const UserProfile = dynamic(
  () => import('@/components/user-management').then(mod => ({ default: mod.UserProfile })),
  { ssr: false }
);

const PrivilegeManagement = dynamic(
  () => import('@/components/privilege-management').then(mod => ({ default: mod.PrivilegeManagement })),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
);

const DatabaseBrowser = dynamic(
  () => import('@/components/database-browser/DatabaseBrowser'),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
);

const ActivityLogViewer = dynamic(
  () => import('@/components/activity-log/ActivityLogViewer'),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
);

const SecurityMonitor = dynamic(
  () => import('@/components/security/SecurityMonitor'),
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
);

const LazyPageDirectory = dynamic(
  () => import('@/components/settings/PageDirectory'), 
  { 
    loading: () => <div className="flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>,
    ssr: false 
  }
);

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

// Central purpose/description mapping for roles (case-insensitive)
const ROLE_PURPOSE: Record<string, string> = {
  'SUPER_ADMIN': 'Full system access with authority to manage all modules, users, roles, and system configurations. Responsible for overall administration and security. Elevated administrative access for overseeing ERP operations and high-level configurations',
  'ADMIN': 'Administrative role for managing key modules, user permissions, and operational settings in the ERP.',
  'SYSTEM ADMINISTRATOR': 'Manages the ERP system’s infrastructure, technical settings, and overall system health.',
  'IT ADMIN': 'Responsible for IT infrastructure, ERP security, and technical support for users.',
  'OPERATIONS MANAGER': 'Supervises day-to-day operational processes and ensures smooth workflow across departments.',
  'MANAGER': 'Mid-level manager overseeing departments and assisting in decision-making.',
  'STAFF': 'General staff role with specific permissions to perform daily operational tasks.',
  'CFO': 'Oversees all financial operations, accounting, and reporting within the ERP.',
  'FINANCE CONTROLLER': 'Monitors financial processes, budgets, and compliance with accounting standards.',
  'TREASURY': 'Manages treasury operations, cash flow, and financial transactions.',
  'ACCOUNTS': 'Maintains accounting records and handles financial transactions in the ERP.',
  'ACCOUNTS PAYABLE': 'Responsible for managing vendor payments and accounts payable processes.',
  'BANKER': 'Manages banking operations, reconciliations, and financial liaison activities.',
  'PROCUREMENT OFFICER': 'Handles purchasing of goods/services and manages supplier relationships.',
  'STORE INCHARGE': 'Manages inventory, stock movement, and store operations in the ERP.',
  'HUB INCHARGE': 'Manages hub operations, logistics, or departmental workflows efficiently.',
  'COMPLIANCE': 'Ensures organizational adherence to legal, regulatory, and internal policies.',
  'LEGAL': 'Provides legal support and guidance for ERP processes, contracts, and compliance.',
  'USER': 'Basic ERP user with minimal permissions, able to access only specific modules/features allowed.',
  // Variants can be mapped by normalizing names to uppercase when looking up
};

// Extend role for UI-only fields
type UIRole = UserRole & { is_active?: boolean }

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
  const [roles, setRoles] = useState<UIRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pendingKyc, setPendingKyc] = useState<KycSubmission[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  
  // Modal and UI State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedKycSubmission, setSelectedKycSubmission] = useState<KycSubmissionWithRelations | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const [roleInfoTarget, setRoleInfoTarget] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // For Privilege Management deep-linking from Role Management "Edit Role"
  const [privInitialRoleId, setPrivInitialRoleId] = useState<string | number | null>(searchParams?.get('role') || null);

  // API Base URL
  const API_BASE_URL = '/api';

  // Role table helpers
  const [totalPermissions, setTotalPermissions] = useState<number>(0);
  const [rolePermCounts, setRolePermCounts] = useState<Record<string, number>>({});
  const MAX_PERMISSIONS = 10; // fallback denominator for permission fraction
  const getPermissionCount = (r: any): number => {
    // Prefer backend-provided counts; otherwise infer from arrays/objects; fallback to 0
    if (typeof r?.permission_count === 'number') return r.permission_count;
    if (Array.isArray(r?.permissions)) return r.permissions.length;
    if (r?.permissions && typeof r.permissions === 'object') {
      try { return Object.keys(r.permissions).length; } catch { /* ignore */ }
    }
    return 0;
  };

  const getUserCountForRole = (r: any): number => {
    // Prefer backend count if available; else compute from loaded users state
    if (typeof r?.user_count === 'number') return r.user_count;
    const roleId = String(r?.id || r?.role_id || r?.code || r?.name || '');
    const roleName = String(r?.name || r?.code || '').toLowerCase();
    try {
      return users.filter(u =>
        Array.isArray(u.roles) && u.roles.some((ur: any) => {
          const urId = String(ur?.id || ur?.code || ur?.name || '');
          const urName = String(ur?.name || ur?.code || '').toLowerCase();
          return (
            (urId && urId === roleId) ||
            (urName && urName === roleName)
          );
        })
      ).length;
    } catch {
      return 0;
    }
  };

  // Helper to open Privilege Management focused on a role
  const openPrivilegeEditorForRole = useCallback((role: any) => {
    const rid = String(role?.id ?? '');
    setPrivInitialRoleId(rid);
    setActiveTab('privileges');
  // Persist for future opens and refreshes
  try { localStorage.setItem('privilegeEditor.lastRoleId', rid); } catch { /* noop */ }
    // Update URL with tab and role params for shareable deep link
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'privileges');
      url.searchParams.set('role', rid);
      router.replace(url.pathname + url.search, { scroll: false });
    } catch { /* noop */ }
  }, [router]);

  // When leaving Privileges tab, clear role param from URL to avoid stale selection
  useEffect(() => {
    if (activeTab !== 'privileges') {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has('role')) {
          url.searchParams.delete('role');
          router.replace(url.pathname + url.search, { scroll: false });
        }
        // Do not clear privInitialRoleId here; keep remembered selection
      } catch { /* noop */ }
    }
  }, [activeTab, router]);

  // On mount or when search params change, if there is no role param, restore last used role
  useEffect(() => {
    try {
      const urlRole = searchParams?.get && searchParams.get('role');
      if (!urlRole && (privInitialRoleId == null || privInitialRoleId === '')) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('privilegeEditor.lastRoleId') : null;
        if (saved) {
          setPrivInitialRoleId(saved);
          // If already on privileges tab, add role back to URL for consistency
          if (activeTab === 'privileges') {
            const url = new URL(window.location.href);
            url.searchParams.set('role', saved);
            router.replace(url.pathname + url.search, { scroll: false });
          }
        }
      }
    } catch { /* noop */ }
  }, [searchParams, activeTab, privInitialRoleId, router]);

  const getApprovalLevel = (r: any): number => {
    // Use explicit level if provided; else map by known role names; else fallback by order
    if (typeof r?.level === 'number') return r.level;
    const code = String(r?.code || r?.id || r?.name || '').toUpperCase();
    const name = String(r?.name || '').toUpperCase();
    const key = code || name;
    const map: Record<string, number> = {
      'SUPER_ADMIN': 4,
      'ADMIN': 3,
      'MANAGER': 2,
      'STAFF': 1,
    };
    if (map[key] != null) return map[key];
    if (map[name] != null) return map[name];
    // Fallback: derive from position to keep deterministic but low impact
    const idx = roles.findIndex(x => String(x.id) === String(r.id));
    return idx >= 0 ? Math.max(1, roles.length - idx) : 1;
  };

  const normalizeRoleKey = (name: string | undefined | null) => String(name || '').trim().toUpperCase();
  const getRolePurpose = (name: string | undefined | null) => ROLE_PURPOSE[normalizeRoleKey(name)] || 'No description available for this role.';

  const openRoleInfo = (role: any) => {
    setRoleInfoTarget(role);
    setShowRoleInfo(true);
  };
  const closeRoleInfo = () => {
    setShowRoleInfo(false);
    setRoleInfoTarget(null);
  };

  // Backend-driven permission totals
  const fetchTotalPermissions = async (): Promise<number> => {
    try {
      // This endpoint returns { features, privileges } where features is the universe of permissions
      const res = await fetch('/api/privileges/privileges', { credentials: 'include' });
      if (!res.ok) throw new Error('features fetch failed');
      const payload = await res.json();
      const features = (payload?.data?.features || payload?.features || []) as any[];
      return Array.isArray(features) ? features.length : 0;
    } catch {
      return 0;
    }
  };

  const fetchRolePermissionCount = async (roleId: string): Promise<number> => {
    try {
      const res = await fetch(`/api/privileges/privileges?role=${encodeURIComponent(roleId)}`, { credentials: 'include' });
      if (!res.ok) throw new Error('role privileges fetch failed');
      const payload = await res.json();
      const rows = (payload?.data?.privileges || payload?.privileges || []) as any[];
      if (!Array.isArray(rows)) return 0;
      // Count features where any permission flag is true
      return rows.reduce((acc, row) => {
        const rp = row?.role_privilege;
        const anyTrue = !!(rp && (rp.can_view || rp.can_create || rp.can_edit || rp.can_delete || rp.can_hide));
        return acc + (anyTrue ? 1 : 0);
      }, 0);
    } catch {
      return 0;
    }
  };

  const enrichRolePermissionMeta = async (roleList: any[]) => {
    // If backend already sent counts, use them directly
    const allHaveCounts = roleList.every(r => typeof r.permission_count === 'number');
    const anyHasTotal = roleList.some(r => typeof r.total_permissions === 'number' && r.total_permissions > 0);
    if (allHaveCounts) {
      const map: Record<string, number> = {};
      roleList.forEach(r => { map[String(r.id)] = Number(r.permission_count || 0); });
      setRolePermCounts(map);
      if (anyHasTotal) {
        // Use the maximum reported total across roles (should be same)
        const maxTotal = Math.max(...roleList.map(r => Number(r.total_permissions || 0)));
        if (maxTotal > 0) setTotalPermissions(maxTotal);
      } else {
        const total = await fetchTotalPermissions();
        if (total > 0) setTotalPermissions(total);
      }
      return;
    }
    // Otherwise, fetch totals and counts
    const total = await fetchTotalPermissions();
    if (total > 0) setTotalPermissions(total);
    const pairs = await Promise.all(roleList.map(async r => [String(r.id), await fetchRolePermissionCount(String(r.id))] as const));
    const map: Record<string, number> = {};
    for (const [rid, cnt] of pairs) map[rid] = cnt;
    setRolePermCounts(map);
  };

  // Small logout handler
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    } catch (e) { /* ignore */ }
    // Redirect to login
    try { router.push('/auth/login'); } catch { window.location.href = '/auth/login'; }
  };

  // API Functions
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const response = await fetch(
      `/api/v1/super-admin${endpoint}`,
      {
        credentials: 'include',
        headers: {
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
        fetch('/api/v1/super-admin/dashboard/stats', { credentials: 'include' }),
        fetch('/api/v1/super-admin/activity?limit=10', { credentials: 'include' }),
      ]);

  const statsJson = await statsRes.json();
  const actJson = await activityRes.json();
  setStats(statsJson.data || statsJson);
  const acts = (actJson && (actJson.data || actJson)) || [];
  setActivities(Array.isArray(acts) ? acts : []);
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
      // Use super-admin API and include cookies for auth
  const res = await fetch('/api/v1/super-admin/users', { credentials: 'include' });
      if (!res.ok) throw new Error('Users fetch failed');
      const payload = await res.json();
      const list = (payload && (payload.data?.users || payload.data || payload.users)) || [];
      // Map backend user shape -> UI UserType
      const mapped = list.map((u: any) => ({
        id: String(u.id ?? u.user_id ?? ''),
        first_name: u.first_name || u.username || '',
        last_name: u.last_name || '',
        email: u.email || '',
        status: (u.status || 'invited') as any,
        last_login: u.last_login || u.lastLogin || null,
        roles: Array.isArray(u.roles)
          ? u.roles
          : (u.role ? [{ id: u.role_id || u.role, name: u.role }] : []),
        is_first_login: false,
        meta: {},
        created_at: String(u.createdAt || u.created_at || ''),
        updated_at: String(u.updatedAt || u.updated_at || ''),
      }));
      setUsers(mapped);
    } catch (_err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = async () => {
    try {
  // Use privilege management roles endpoint; it gracefully falls back when DB isn't ready
  const res = await fetch('/api/privileges/roles?limit=100', { credentials: 'include' });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError('Authentication required to view roles. Please log in.');
          setRoles([] as any);
          return;
        }
        throw new Error('Roles fetch failed');
      }
      const payload = await res.json();
      // Accept multiple shapes: {data:{rows:[]}} | {data:[]} | {rows:[]} | []
      let rows = (payload && (payload.data?.rows || payload.data || payload.rows || payload)) || [];
      if (!Array.isArray(rows)) {
        // Some APIs return {success, data: [...]}; ensure rows is array
        rows = Array.isArray(payload?.data) ? payload.data : [];
      }
      const mapped: any[] = rows.map((r: any) => ({
        id: String(r.id || r.role_id || r.code || r.name || ''),
        name: r.name || r.code || r.role || 'ROLE',
        permissions: {},
        is_system_role: Boolean(r.is_system_role),
        is_active: typeof r.is_active === 'boolean' ? r.is_active : (r.status ? String(r.status).toLowerCase() !== 'inactive' : true),
        created_at: String(r.created_at || r.createdAt || ''),
        updated_at: String(r.updated_at || r.updatedAt || ''),
        // RBAC extras when available
        level: typeof r.level === 'number' ? r.level : undefined,
        user_count: typeof r.user_count === 'number' ? r.user_count : undefined,
        permission_count: typeof r.permission_count === 'number' ? r.permission_count : undefined,
        total_permissions: typeof r.total_permissions === 'number' ? r.total_permissions : undefined,
      }));
      setRoles(mapped as any);
  // Enrich with real permission counts in the background
  enrichRolePermissionMeta(mapped);
    } catch (_err) {
      console.error('Failed to load roles');
    }
  };

  const loadBranches = async () => {
    try {
  const res = await fetch('/api/v1/super-admin/tables/branches?limit=200', { credentials: 'include' });
      const payload = await res.json();
      const rows = payload?.data?.rows || [];
      const mapped = rows.map((b: any) => ({ id: String(b.id), name: b.name, code: b.code, is_active: !!b.is_active, created_at: String(b.created_at || ''), updated_at: String(b.updated_at || '') }));
      setBranches(mapped as any);
    } catch (_err) {
      console.error('Failed to load branches');
    }
  };

  const loadPendingKyc = async () => {
    try {
  const res = await fetch('/api/v1/super-admin/tables/kyc_submissions?limit=100&status=awaiting_approval', { credentials: 'include' });
      const payload = await res.json();
      const rows = payload?.data?.rows || [];
      const mapped = rows.map((r: any) => ({ id: String(r.id), user_id: String(r.user_id || ''), first_name: r.first_name, last_name: r.last_name, email: r.email, status: r.status || 'awaiting_approval', submitted_at: String(r.submitted_at || r.created_at || ''), custom_fields: {}, files: {}, qualifications: [], employment_history: [], family_details: [], consent_given: true, created_at: String(r.created_at || ''), updated_at: String(r.updated_at || '') }));
      setPendingKyc(mapped as any);
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
    } else if (activeTab === 'users' || activeTab === 'all-users') {
      // Load data needed for Role Management view
      loadUsers(); // still used for KYC/invitations/profile drawers
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
              className="bg-white dark:bg-slate-800 rounded-lg shadow dark:shadow-slate-900/50 p-6 border-l-4 border-l-blue-500 dark:border-l-slate-700"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className={`h-8 w-8 text-${stat.color}-600 dark:text-${stat.color}-400`} />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {stat.label}
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-gray-100">
                      {stat.value}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 mb-4">
            <Activity className="inline w-5 h-5 mr-2" />
            Recent Activity
          </h3>
          <div className="space-y-3">
            {(Array.isArray(activities) ? activities : []).map(activity => (
              <div
                key={activity.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-800"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {activity.action.includes('create') && (
                      <Plus className="w-4 h-4 text-green-500 dark:text-green-400" />
                    )}
                    {activity.action.includes('update') && (
                      <Edit3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    )}
                    {activity.action.includes('delete') && (
                      <XCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {activity.username || 'System'} {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.entity_type} {activity.entity_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
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

  // Users Management Tab (repurposed as Role Management view)
  const UsersTab = () => (
    <div className="space-y-3">
      {/* Header with Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-3">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Total Roles</dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">{roles.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-3">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Pending KYC</dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">{pendingKyc.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-3">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Active Roles</dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">{roles.length}</dd>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-3">
              <dt className="text-xs font-medium text-gray-500 dark:text-gray-400">Invitations</dt>
              <dd className="text-xl font-bold text-gray-900 dark:text-gray-100">{invitations.length}</dd>
            </div>
          </div>
        </div>
      </div>

  {/* Action Controls moved inside the card header on the right of tabs */}

      {/* Main Content Tabs with actions on the right */}
      <div className="bg-white dark:bg-slate-800 shadow dark:shadow-slate-900/50 rounded-lg">
  <div className="border-b border-gray-200 dark:border-slate-800">
          <div className="px-6 py-3 flex items-center justify-between gap-3 flex-wrap">
            <nav className="-mb-px flex space-x-8">
              {[ 
                { id: 'all-users', label: 'All Roles', icon: Shield },
                { id: 'pending-kyc', label: 'Pending KYC', icon: AlertTriangle },
                { id: 'invitations', label: 'Invitations', icon: Activity },
              ].map(tab => (
                <button
                  key={tab.id}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 dark:border-slate-400 text-blue-600 dark:text-blue-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-slate-700'
                  }`}
                  onClick={() => handleTabChange(tab.id)}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80 md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              <button
                onClick={loadUsers}
                className="bg-blue-600 dark:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 dark:bg-blue-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Invite User</span>
              </button>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="bg-green-600 dark:bg-green-500 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 dark:hover:bg-green-600 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Create User</span>
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
                <p className="text-red-700 dark:text-red-300">{error}</p>
                <button
                  onClick={() => setError(null)}
                  className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="ml-2 text-gray-600 dark:text-gray-400">Loading...</span>
            </div>
          ) : (
            <>
              {/* All Roles Table */}
              {(activeTab === 'users' || activeTab === 'all-users') && (
                <div className="overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Permission
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Users
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Level
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-slate-800">
                      {roles.map(role => (
                        <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                  {role.name}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">ID: {role.id}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {`${(rolePermCounts[String(role.id)] ?? (role as any).permission_count ?? getPermissionCount(role))}/${(role as any).total_permissions || totalPermissions || MAX_PERMISSIONS}`}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {getUserCountForRole(role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-gray-300">
                            {getApprovalLevel(role)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${(role as any).is_active === false ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' : 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300'}`} title="Role status">
                                {(role as any).is_active === false ? 'Inactive' : 'Active'}
                              </span>
                              <button
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300"
                                title="View Role"
                                onClick={() => openRoleInfo(role)}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300"
                                title="Edit Role"
                                onClick={() => openPrivilegeEditorForRole(role)}
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                                title={(role as any).is_active === false ? 'Enable Role' : 'Disable Role'}
                                onClick={async () => {
                                  try {
                  await fetch(`/api/privileges/roles/${role.id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active: (role as any).is_active === false ? true : false }) });
                                    loadRoles();
                                  } catch {}
                                }}
                              >
                {(role as any).is_active === false ? 'Enable' : 'Disable'}
                              </button>
                              {/* Delete Role action removed per requirement */}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {roles.length === 0 && (
                    <div className="text-center py-8">
                      <Shield className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No roles found</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {error?.toLowerCase().includes('auth')
                          ? 'You must be logged in to view roles.'
                          : 'Define roles to manage access across the system.'}
                      </p>
                      {error?.toLowerCase().includes('auth') && (
                        <a
                          href="/auth/login"
                          className="inline-flex items-center px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600"
                        >
                          Go to Login
                        </a>
                      )}
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
                      className="border border-gray-200 dark:border-slate-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                      onClick={() => setSelectedKycSubmission({
                        ...submission,
                        user: users.find(u => u.id === submission.user_id) || {} as UserType,
                        files: [],
                        approval_logs: []
                      })}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {submission.first_name} {submission.last_name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{submission.personal_email}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Submitted {new Date(submission.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs rounded-full">
                            Pending Review
                          </span>
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {pendingKyc.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-green-400 dark:text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">All caught up!</h3>
                      <p className="text-gray-600 dark:text-gray-400">No pending KYC submissions to review.</p>
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
                      className="border border-gray-200 dark:border-slate-800 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {invitation.invitee_name}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{invitation.invitee_email}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                            {invitation.expires_at && (
                              <> • Expires {new Date(invitation.expires_at).toLocaleDateString()}</>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            invitation.status === 'pending_kyc'
                              ? 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300'
                              : invitation.status === 'kyc_submitted'
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300'
                              : invitation.status === 'expired'
                              ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                              : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300'
                          }`}>
                            {invitation.status}
                          </span>
                          {invitation.role && (
                            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 text-xs rounded-full">
                              {invitation.role.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {invitations.length === 0 && (
                    <div className="text-center py-8">
                      <Activity className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No invitations</h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">Start by inviting users to join your organization.</p>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="bg-blue-600 dark:bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Send Invitation
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Role Info Modal */}
              {showRoleInfo && roleInfoTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/30 dark:bg-black/60" onClick={closeRoleInfo} />
                  <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-lg dark:shadow-gray-900/50 w-full max-w-lg mx-4 p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg"><Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" /></div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{roleInfoTarget.name}</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Role ID: {String(roleInfoTarget.id)}</p>
                        </div>
                      </div>
                      <button onClick={closeRoleInfo} className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Purpose</h4>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{getRolePurpose(roleInfoTarget.name)}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {(() => {
                          const granted = (rolePermCounts[String(roleInfoTarget.id)] ?? roleInfoTarget.permission_count ?? getPermissionCount(roleInfoTarget)) as number;
                          const total = (roleInfoTarget.total_permissions || totalPermissions || MAX_PERMISSIONS) as number;
                          const pct = total > 0 ? Math.round((granted / total) * 100) : 0;
                          return (
                            <div className="col-span-2 bg-gray-50 dark:bg-slate-700 rounded-md p-3 border border-gray-100 dark:border-slate-800">
                              <div className="flex items-center justify-between mb-1">
                                <div className="text-xs text-gray-500 dark:text-gray-400">Permission space used</div>
                                <div className="text-xs text-gray-700 dark:text-gray-300 font-medium">{pct}%</div>
                              </div>
                              <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded">
                                <div className="h-2 bg-blue-600 dark:bg-blue-500 rounded" style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                              </div>
                            </div>
                          );
                        })()}
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-md p-3 border border-gray-100 dark:border-slate-800">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total Permissions (granted)</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                            {(rolePermCounts[String(roleInfoTarget.id)] ?? roleInfoTarget.permission_count ?? getPermissionCount(roleInfoTarget))}
                            <span className="text-sm text-gray-500 dark:text-gray-400"> / {(roleInfoTarget.total_permissions || totalPermissions || MAX_PERMISSIONS)}</span>
                          </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-md p-3 border border-gray-100 dark:border-slate-800">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Total Users under this role</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{getUserCountForRole(roleInfoTarget)}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-md p-3 border border-gray-100 dark:border-slate-800">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Approval Level</div>
                          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">{getApprovalLevel(roleInfoTarget)}</div>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-md p-3 border border-gray-100 dark:border-slate-800">
                          <div className="text-xs text-gray-500 dark:text-gray-400">Created / Updated</div>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {roleInfoTarget.created_at ? new Date(roleInfoTarget.created_at).toLocaleString() : '-'}
                            <span className="text-gray-400 dark:text-gray-500"> • </span>
                            {roleInfoTarget.updated_at ? new Date(roleInfoTarget.updated_at).toLocaleString() : '-'}
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Levels indicate seniority; permissions reflect explicit grants. Totals may grow as routes/actions increase.</p>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-end space-x-2">
                      <button onClick={closeRoleInfo} className="px-4 py-2 text-sm rounded-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">Close</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-gray-50 dark:bg-slate-900">
      {/* Fixed Top Bar */}
  <div className="fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-transparent z-50 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              {/* Mobile menu button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <HeaderLogo />
              <h1 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
                Super Admin Control Panel
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <TopNavDbIndicator />
              <button
                onClick={() => window.location.reload()}
                className="bg-blue-600 dark:bg-blue-500 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Refresh"
                title="Refresh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={handleLogout}
                className="bg-gray-700 dark:bg-gray-600 text-white px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-800 dark:hover:bg-gray-700 transition-colors flex items-center gap-1.5 text-xs font-medium shadow-sm"
                aria-label="Logout"
                title="Logout"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
              <DarkModeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-14 left-0 bottom-0 w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-transparent overflow-y-auto z-40 transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <DynamicSidebar className="h-full" />
      </aside>

      {/* Main Content */}
      <div className="pt-14 lg:pl-64 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-slate-800 rounded-lg p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 dark:text-red-500" />
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        )}

        {!loading && (
          <>
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'orders' && (
              <div className="text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Order Management
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Access the comprehensive Super Admin Order Management System
                </p>
                <a
                  href="/super-admin/orders"
                  className="inline-flex items-center px-6 py-3 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Open Order Management
                </a>
              </div>
            )}
            {activeTab === 'users' && <UsersTab />}
            {activeTab === 'privileges' && (
              <PrivilegeManagement initialRoleId={privInitialRoleId} />
            )}
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
              <SecurityMonitor />
            )}
            {activeTab === 'settings' && (
              <div className="h-full">
                {/* System Settings: Page Directory */}
                {/* PageDirectory loaded client-side to scan server */}
                <div id="system-settings-root">
                  <LazyPageDirectory />
                </div>
              </div>
            )}
          </>
        )}
        </div>
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
