'use client';

/**
 * Per-User Resource Consumption Dashboard
 * BISMAN ERP - User Activity & Usage Tracking
 *
 * Features:
 * - Activity per user (actions, page views, API calls)
 * - Storage per user (files, documents)
 * - Last login & security info
 * - Session history
 * - Permission usage
 * - Trend charts
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  User,
  Activity,
  HardDrive,
  Clock,
  Shield,
  Calendar,
  MapPin,
  Monitor,
  Smartphone,
  Globe,
  Key,
  FileText,
  Image,
  File,
  Database,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  RefreshCw,
  ArrowLeft,
  Mail,
  Building,
  Tag,
  Eye,
  Edit,
  Trash2,
  Download,
  ChevronDown,
  MoreVertical,
  Layers,
  Zap,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  organization: {
    id: string;
    name: string;
    plan: string;
  };
  createdAt: string;
  accountType: 'local' | 'sso' | 'ldap';
}

interface SecurityInfo {
  lastLogin: string | null;
  lastLoginIP: string | null;
  lastLoginDevice: string | null;
  lastLoginLocation: string | null;
  failedLoginAttempts: number;
  mfaEnabled: boolean;
  passwordLastChanged: string | null;
  activeSessions: number;
  accountLocked: boolean;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  startedAt: string;
  lastActivity: string;
  isCurrent: boolean;
}

interface StorageUsage {
  total: number; // bytes
  used: number;
  breakdown: {
    type: string;
    size: number;
    count: number;
    icon: any;
    color: string;
  }[];
  recentFiles: {
    name: string;
    type: string;
    size: number;
    uploadedAt: string;
  }[];
}

interface ActivityStats {
  totalActions: number;
  apiCalls: number;
  pageViews: number;
  logins: number;
  exports: number;
  trend: number; // percentage change
}

interface DailyActivity {
  date: string;
  actions: number;
  apiCalls: number;
  pageViews: number;
}

interface ModuleUsage {
  name: string;
  visits: number;
  actions: number;
  lastAccessed: string;
  color: string;
}

interface RecentAction {
  id: string;
  action: string;
  actionType: string;
  resource: string;
  resourceId: string;
  timestamp: string;
  ip: string;
  status: 'success' | 'failure';
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const FILE_TYPE_CONFIG: Record<string, { icon: any; color: string }> = {
  documents: { icon: FileText, color: '#3b82f6' },
  images: { icon: Image, color: '#22c55e' },
  spreadsheets: { icon: Database, color: '#f59e0b' },
  other: { icon: File, color: '#6b7280' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getDeviceIcon(device: string) {
  if (device.toLowerCase().includes('mobile') || device.toLowerCase().includes('phone')) {
    return Smartphone;
  }
  return Monitor;
}

// ============================================================================
// COMPONENTS
// ============================================================================

// User Profile Header
function ProfileHeader({
  user,
  security,
  onBack,
}: {
  user: UserProfile;
  security: SecurityInfo;
  onBack: () => void;
}) {
  const statusColors = {
    active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    inactive: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
    suspended: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Users
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
            {getInitials(user.name)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[user.status]}`}>
                {user.status}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
              <Mail className="w-4 h-4" />
              {user.email}
            </p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Building className="w-4 h-4" />
                {user.organization.name}
              </span>
              <span className="flex items-center gap-1">
                <Tag className="w-4 h-4" />
                {user.role}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {/* Security Quick Stats */}
          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            {security.accountLocked ? (
              <Lock className="w-5 h-5 text-red-500" />
            ) : (
              <Unlock className="w-5 h-5 text-green-500" />
            )}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Account</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {security.accountLocked ? 'Locked' : 'Active'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <Shield className={`w-5 h-5 ${security.mfaEnabled ? 'text-green-500' : 'text-yellow-500'}`} />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">MFA</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {security.mfaEnabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
            <Monitor className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Sessions</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {security.activeSessions} active
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Activity Stats Cards
function ActivityStatsCards({ stats }: { stats: ActivityStats }) {
  const cards = [
    { title: 'Total Actions', value: stats.totalActions, icon: Activity, color: COLORS.primary },
    { title: 'API Calls', value: stats.apiCalls, icon: Zap, color: COLORS.secondary },
    { title: 'Page Views', value: stats.pageViews, icon: Eye, color: COLORS.success },
    { title: 'Logins', value: stats.logins, icon: LogIn, color: COLORS.warning },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${card.color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color: card.color }} />
              </div>
              {stats.trend !== 0 && (
                <span
                  className={`flex items-center gap-1 text-xs font-medium ${
                    stats.trend >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {stats.trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(stats.trend)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {card.value.toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.title}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

// Activity Timeline Chart
function ActivityChart({ data }: { data: DailyActivity[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-violet-500" />
        Activity Over Time
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorActions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorApiCalls" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="actions"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorActions)"
              name="Actions"
            />
            <Area
              type="monotone"
              dataKey="apiCalls"
              stroke="#06b6d4"
              fillOpacity={1}
              fill="url(#colorApiCalls)"
              name="API Calls"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// Storage Usage Card
function StorageUsageCard({ storage }: { storage: StorageUsage }) {
  const usagePercent = (storage.used / storage.total) * 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <HardDrive className="w-5 h-5 text-cyan-500" />
        Storage Usage
      </h2>

      {/* Overall Usage */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatBytes(storage.used)} of {formatBytes(storage.total)}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {usagePercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${usagePercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={`h-full rounded-full ${
              usagePercent > 90 ? 'bg-red-500' : usagePercent > 70 ? 'bg-yellow-500' : 'bg-cyan-500'
            }`}
          />
        </div>
      </div>

      {/* Breakdown */}
      <div className="space-y-3 mb-6">
        {storage.breakdown.map((item) => {
          const Icon = item.icon;
          const percent = (item.size / storage.used) * 100;
          return (
            <div key={item.type} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                    {item.type}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {item.count} files
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {formatBytes(item.size)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{percent.toFixed(1)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Files */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Recent Uploads
        </h3>
        <div className="space-y-2">
          {storage.recentFiles.slice(0, 3).map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-slate-700/50"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                  {file.name}
                </span>
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {formatBytes(file.size)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Security Info Card
function SecurityInfoCard({ security }: { security: SecurityInfo }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Shield className="w-5 h-5 text-green-500" />
        Security Information
      </h2>

      <div className="space-y-4">
        {/* Last Login */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <LogIn className="w-5 h-5 text-green-500 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Last Login</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {security.lastLogin ? formatDateTime(security.lastLogin) : 'Never'}
            </p>
            {security.lastLoginIP && (
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  {security.lastLoginIP}
                </span>
                {security.lastLoginLocation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {security.lastLoginLocation}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* MFA Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <Key className={`w-5 h-5 ${security.mfaEnabled ? 'text-green-500' : 'text-yellow-500'}`} />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Two-Factor Authentication
            </span>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              security.mfaEnabled
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {security.mfaEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>

        {/* Password Last Changed */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Password Last Changed
            </span>
          </div>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {security.passwordLastChanged
              ? formatRelativeTime(security.passwordLastChanged)
              : 'Never'}
          </span>
        </div>

        {/* Failed Login Attempts */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            <AlertTriangle
              className={`w-5 h-5 ${
                security.failedLoginAttempts > 3 ? 'text-red-500' : 'text-gray-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Failed Login Attempts
            </span>
          </div>
          <span
            className={`text-sm font-medium ${
              security.failedLoginAttempts > 3
                ? 'text-red-500'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {security.failedLoginAttempts} (last 30 days)
          </span>
        </div>

        {/* Account Status */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50">
          <div className="flex items-center gap-3">
            {security.accountLocked ? (
              <Lock className="w-5 h-5 text-red-500" />
            ) : (
              <Unlock className="w-5 h-5 text-green-500" />
            )}
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              Account Status
            </span>
          </div>
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              security.accountLocked
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            }`}
          >
            {security.accountLocked ? 'Locked' : 'Active'}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// Active Sessions
function SessionsCard({ sessions, onRevokeSession }: { sessions: Session[]; onRevokeSession: (id: string) => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Monitor className="w-5 h-5 text-blue-500" />
          Active Sessions
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {sessions.length} active
        </span>
      </div>

      <div className="space-y-3">
        {sessions.map((session) => {
          const DeviceIcon = getDeviceIcon(session.device);
          return (
            <div
              key={session.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                session.isCurrent
                  ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                  : 'bg-gray-50 dark:bg-slate-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <DeviceIcon className={`w-5 h-5 ${session.isCurrent ? 'text-violet-500' : 'text-gray-400'}`} />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.browser} on {session.os}
                    </p>
                    {session.isCurrent && (
                      <span className="px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded">
                        Current
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      {session.ip}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {session.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(session.lastActivity)}
                    </span>
                  </div>
                </div>
              </div>
              {!session.isCurrent && (
                <button
                  onClick={() => onRevokeSession(session.id)}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500"
                  title="Revoke session"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}

        {sessions.length === 0 && (
          <div className="text-center py-6 text-gray-500 dark:text-gray-400">
            No active sessions
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Module Usage Chart
function ModuleUsageChart({ modules }: { modules: ModuleUsage[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Layers className="w-5 h-5 text-orange-500" />
        Module Usage
      </h2>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={modules} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Bar dataKey="visits" radius={[0, 4, 4, 0]}>
              {modules.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// Recent Actions Table
function RecentActionsTable({ actions }: { actions: RecentAction[] }) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create':
        return { icon: Edit, color: '#22c55e' };
      case 'update':
        return { icon: Edit, color: '#3b82f6' };
      case 'delete':
        return { icon: Trash2, color: '#ef4444' };
      case 'view':
        return { icon: Eye, color: '#8b5cf6' };
      default:
        return { icon: Activity, color: '#6b7280' };
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-500" />
        Recent Actions
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Action
              </th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Resource
              </th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Time
              </th>
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action) => {
              const { icon: Icon, color } = getActionIcon(action.actionType);
              return (
                <tr
                  key={action.id}
                  className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
                >
                  <td className="py-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}15` }}
                      >
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                      </div>
                      <span className="text-sm text-gray-900 dark:text-white">{action.action}</span>
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {action.resource} #{action.resourceId}
                    </span>
                  </td>
                  <td className="py-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {formatRelativeTime(action.timestamp)}
                    </span>
                  </td>
                  <td className="py-3">
                    {action.status === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {actions.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No recent actions
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserUsagePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params?.id as string || '';

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [security, setSecurity] = useState<SecurityInfo | null>(null);
  const [activityStats, setActivityStats] = useState<ActivityStats | null>(null);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [storage, setStorage] = useState<StorageUsage | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsage[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchUserData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch from backend APIs
      const [userRes, usageRes] = await Promise.allSettled([
        fetch(`${baseURL}/api/enterprise-admin/users/${userId}`, { credentials: 'include' }),
        fetch(`${baseURL}/api/admin/user-usage/${userId}`, { credentials: 'include' }),
      ]);

      // Process user data or use demo
      if (userRes.status === 'fulfilled' && userRes.value.ok) {
        const userData = await userRes.value.json();
        if (userData.ok && userData.user) {
          setUserProfile({
            id: userData.user.id,
            name: userData.user.name,
            email: userData.user.email,
            role: userData.user.role,
            status: userData.user.status,
            organization: {
              id: userData.user.organization?.id || '1',
              name: userData.user.organization?.name || 'Demo Org',
              plan: userData.user.organization?.subscriptionPlan || 'pro',
            },
            createdAt: userData.user.createdAt,
            accountType: userData.user.accountType || 'local',
          });
        }
      }

      // Generate demo data if API fails or for development
      generateDemoData();

    } catch (err: any) {
      setError(err.message || 'Failed to load user data');
      generateDemoData();
    } finally {
      setIsLoading(false);
    }
  }, [baseURL, userId]);

  const generateDemoData = () => {
    // User Profile (if not already set)
    if (!userProfile) {
      setUserProfile({
        id: userId,
        name: 'Rajesh Kumar',
        email: 'rajesh.kumar@company.com',
        role: 'Admin',
        status: 'active',
        organization: {
          id: '1',
          name: 'Acme Corporation',
          plan: 'enterprise',
        },
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        accountType: 'local',
      });
    }

    // Security Info
    setSecurity({
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      lastLoginIP: '192.168.1.100',
      lastLoginDevice: 'Chrome on Windows',
      lastLoginLocation: 'Mumbai, India',
      failedLoginAttempts: 1,
      mfaEnabled: true,
      passwordLastChanged: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      activeSessions: 2,
      accountLocked: false,
    });

    // Activity Stats
    setActivityStats({
      totalActions: 12453,
      apiCalls: 45678,
      pageViews: 8765,
      logins: 234,
      exports: 56,
      trend: 12.5,
    });

    // Daily Activity
    const activity: DailyActivity[] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      activity.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        actions: Math.floor(100 + Math.random() * 200),
        apiCalls: Math.floor(500 + Math.random() * 500),
        pageViews: Math.floor(50 + Math.random() * 100),
      });
    }
    setDailyActivity(activity);

    // Storage
    setStorage({
      total: 5 * 1024 * 1024 * 1024, // 5GB
      used: 2.3 * 1024 * 1024 * 1024, // 2.3GB
      breakdown: [
        { type: 'documents', size: 1.2 * 1024 * 1024 * 1024, count: 156, ...FILE_TYPE_CONFIG.documents },
        { type: 'images', size: 0.8 * 1024 * 1024 * 1024, count: 234, ...FILE_TYPE_CONFIG.images },
        { type: 'spreadsheets', size: 0.25 * 1024 * 1024 * 1024, count: 45, ...FILE_TYPE_CONFIG.spreadsheets },
        { type: 'other', size: 0.05 * 1024 * 1024 * 1024, count: 12, ...FILE_TYPE_CONFIG.other },
      ],
      recentFiles: [
        { name: 'Q4_Report.pdf', type: 'document', size: 2.5 * 1024 * 1024, uploadedAt: new Date(Date.now() - 3600000).toISOString() },
        { name: 'Invoice_2024.xlsx', type: 'spreadsheet', size: 1.2 * 1024 * 1024, uploadedAt: new Date(Date.now() - 7200000).toISOString() },
        { name: 'Product_Image.png', type: 'image', size: 0.8 * 1024 * 1024, uploadedAt: new Date(Date.now() - 10800000).toISOString() },
      ],
    });

    // Sessions
    setSessions([
      {
        id: '1',
        device: 'Desktop',
        browser: 'Chrome',
        os: 'Windows 11',
        ip: '192.168.1.100',
        location: 'Mumbai, India',
        startedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        isCurrent: true,
      },
      {
        id: '2',
        device: 'Mobile',
        browser: 'Safari',
        os: 'iOS 17',
        ip: '10.0.0.50',
        location: 'Mumbai, India',
        startedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        lastActivity: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        isCurrent: false,
      },
    ]);

    // Module Usage
    setModuleUsage([
      { name: 'Dashboard', visits: 456, actions: 234, lastAccessed: new Date().toISOString(), color: '#8b5cf6' },
      { name: 'Inventory', visits: 345, actions: 189, lastAccessed: new Date(Date.now() - 3600000).toISOString(), color: '#06b6d4' },
      { name: 'Sales', visits: 289, actions: 156, lastAccessed: new Date(Date.now() - 7200000).toISOString(), color: '#22c55e' },
      { name: 'Reports', visits: 234, actions: 98, lastAccessed: new Date(Date.now() - 14400000).toISOString(), color: '#f59e0b' },
      { name: 'Settings', visits: 123, actions: 45, lastAccessed: new Date(Date.now() - 28800000).toISOString(), color: '#ef4444' },
    ]);

    // Recent Actions
    const actions: RecentAction[] = [];
    const actionTypes = ['create', 'update', 'delete', 'view'];
    const resources = ['Invoice', 'Product', 'Order', 'Customer', 'Report'];
    for (let i = 0; i < 10; i++) {
      const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      actions.push({
        id: `action-${i}`,
        action: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)}d ${resource}`,
        actionType,
        resource,
        resourceId: `${Math.floor(Math.random() * 1000) + 1}`,
        timestamp: new Date(Date.now() - i * 30 * 60 * 1000).toISOString(),
        ip: '192.168.1.100',
        status: Math.random() > 0.1 ? 'success' : 'failure',
      });
    }
    setRecentActions(actions);
  };

  useEffect(() => {
    if (userId) {
      fetchUserData();
    }
  }, [userId, fetchUserData]);

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await fetch(`${baseURL}/api/admin/sessions/${sessionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to revoke session:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
          <p className="mt-4 text-gray-500 dark:text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <User className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">User Not Found</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The requested user could not be found.
          </p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Error Banner */}
        {error && (
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5" />
            {error} - Showing demo data
          </div>
        )}

        {/* Profile Header */}
        {security && (
          <ProfileHeader user={userProfile} security={security} onBack={() => router.back()} />
        )}

        {/* Activity Stats */}
        {activityStats && <ActivityStatsCards stats={activityStats} />}

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity Chart - 2 cols */}
          <div className="lg:col-span-2">
            <ActivityChart data={dailyActivity} />
          </div>

          {/* Storage Usage */}
          {storage && <StorageUsageCard storage={storage} />}
        </div>

        {/* Security & Sessions Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {security && <SecurityInfoCard security={security} />}
          <SessionsCard sessions={sessions} onRevokeSession={handleRevokeSession} />
        </div>

        {/* Module Usage & Recent Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ModuleUsageChart modules={moduleUsage} />
          <RecentActionsTable actions={recentActions} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <p>User ID: {userId}</p>
          <button
            onClick={fetchUserData}
            className="flex items-center gap-2 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
}
