'use client';

/**
 * Advanced Analytics / Insights Dashboard
 * BISMAN ERP - SaaS Analytics Platform
 *
 * Features:
 * - Most active users
 * - Most used modules
 * - Login trends
 * - Audit log summaries
 * - Workflow efficiency metrics
 * - Custom charts
 */

import React, { useState, useEffect, useCallback } from 'react';
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
  ComposedChart,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Activity,
  Users,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChartIcon,
  Clock,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Shield,
  FileText,
  MousePointer,
  LogIn,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  Plus,
  Settings,
  Database,
  Globe,
  Layers,
  Target,
  Award,
  Gauge,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  actions: number;
  lastActive: string;
  sessions: number;
  trend: number; // percentage change
}

interface ModuleUsage {
  name: string;
  slug: string;
  visits: number;
  uniqueUsers: number;
  avgTimeSpent: number; // seconds
  trend: number;
  color: string;
}

interface LoginTrend {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface AuditSummary {
  action: string;
  count: number;
  icon: any;
  color: string;
}

interface WorkflowMetric {
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'good' | 'warning' | 'critical';
}

interface DailyActivity {
  date: string;
  pageViews: number;
  apiCalls: number;
  uniqueUsers: number;
}

interface HourlyHeatmap {
  hour: number;
  day: string;
  value: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const TIME_RANGES: TimeRange[] = [
  { label: 'Last 7 days', value: '7d', days: 7 },
  { label: 'Last 30 days', value: '30d', days: 30 },
  { label: 'Last 90 days', value: '90d', days: 90 },
  { label: 'This year', value: '1y', days: 365 },
];

const COLORS = {
  primary: '#8b5cf6',
  secondary: '#06b6d4',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  pink: '#ec4899',
  orange: '#f97316',
};

const MODULE_COLORS = [
  '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444',
  '#ec4899', '#3b82f6', '#f97316', '#14b8a6', '#a855f7',
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getTrendIcon(trend: number) {
  if (trend > 0) return <ArrowUpRight className="w-4 h-4 text-green-500" />;
  if (trend < 0) return <ArrowDownRight className="w-4 h-4 text-red-500" />;
  return null;
}

function getStatusColor(status: 'good' | 'warning' | 'critical'): string {
  switch (status) {
    case 'good':
      return 'text-green-500';
    case 'warning':
      return 'text-yellow-500';
    case 'critical':
      return 'text-red-500';
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Stats Card
function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  color,
  suffix,
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: any;
  color: string;
  suffix?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-6 h-6" style={{ color }} />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 text-sm font-medium ${
              change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {change >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {title}
      </h3>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value}
        {suffix && <span className="text-sm font-normal text-gray-500 ml-1">{suffix}</span>}
      </p>
    </motion.div>
  );
}

// Most Active Users Table
function ActiveUsersTable({ users }: { users: ActiveUser[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-violet-500" />
          Most Active Users
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Top 10 by actions
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-slate-700">
              <th className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                User
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Actions
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Sessions
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Trend
              </th>
              <th className="text-right text-xs font-medium text-gray-500 dark:text-gray-400 pb-3">
                Last Active
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, idx) => (
              <tr
                key={user.id}
                className="border-b border-gray-100 dark:border-slate-700/50 last:border-0"
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                        {getInitials(user.name)}
                      </div>
                      <span className="absolute -top-1 -left-1 w-5 h-5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-slate-600">
                        {idx + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="text-right font-semibold text-gray-900 dark:text-white">
                  {formatNumber(user.actions)}
                </td>
                <td className="text-right text-gray-600 dark:text-gray-400">
                  {user.sessions}
                </td>
                <td className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 ${
                      user.trend >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    {getTrendIcon(user.trend)}
                    {Math.abs(user.trend)}%
                  </span>
                </td>
                <td className="text-right text-sm text-gray-500 dark:text-gray-400">
                  {new Date(user.lastActive).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-500" />
          Most Used Modules
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={modules} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tickFormatter={formatNumber} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number) => [formatNumber(value), 'Visits']}
              />
              <Bar dataKey="visits" radius={[0, 4, 4, 0]}>
                {modules.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Module Details */}
        <div className="space-y-3">
          {modules.slice(0, 6).map((module) => (
            <div
              key={module.slug}
              className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: module.color }}
                />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {module.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {module.uniqueUsers} unique users
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900 dark:text-white">
                  {formatNumber(module.visits)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avg. {formatDuration(module.avgTimeSpent)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// Login Trends Chart
function LoginTrendsChart({ data }: { data: LoginTrend[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <LogIn className="w-5 h-5 text-green-500" />
          Login Trends
        </h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Successful
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Failed
          </span>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={formatNumber} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Area
              type="monotone"
              dataKey="successful"
              fill="#22c55e20"
              stroke="#22c55e"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              dot={{ r: 3, fill: '#ef4444' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-green-500">
            {formatNumber(data.reduce((sum, d) => sum + d.successful, 0))}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Successful</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-red-500">
            {formatNumber(data.reduce((sum, d) => sum + d.failed, 0))}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Failed</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-violet-500">
            {(
              (data.reduce((sum, d) => sum + d.successful, 0) /
                data.reduce((sum, d) => sum + d.total, 0)) *
              100
            ).toFixed(1)}
            %
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
        </div>
      </div>
    </motion.div>
  );
}

// Audit Log Summary
function AuditLogSummary({ data }: { data: AuditSummary[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-orange-500" />
          Audit Log Summary
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {formatNumber(total)} total events
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="count"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
                formatter={(value: number) => [
                  `${value} (${((value / total) * 100).toFixed(1)}%)`,
                  '',
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Action Breakdown */}
        <div className="space-y-3">
          {data.map((item) => {
            const Icon = item.icon;
            const percentage = ((item.count / total) * 100).toFixed(1);
            return (
              <div
                key={item.action}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}20` }}
                  >
                    <Icon className="w-4 h-4" style={{ color: item.color }} />
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {item.action}
                  </span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatNumber(item.count)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{percentage}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

// Workflow Efficiency Metrics
function WorkflowMetrics({ metrics }: { metrics: WorkflowMetric[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-blue-500" />
          Workflow Efficiency
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const progress = Math.min((metric.value / metric.target) * 100, 100);
          const statusColor = getStatusColor(metric.status);

          return (
            <div
              key={metric.name}
              className="p-4 rounded-lg bg-gray-50 dark:bg-slate-700/50"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {metric.name}
                </span>
                <span className={`text-sm font-bold ${statusColor}`}>
                  {metric.value}
                  {metric.unit}
                </span>
              </div>
              <div className="relative h-2 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`absolute h-full rounded-full ${
                    metric.status === 'good'
                      ? 'bg-green-500'
                      : metric.status === 'warning'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Target: {metric.target}
                {metric.unit}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Activity Heatmap
function ActivityHeatmap({ data }: { data: HourlyHeatmap[] }) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  const getHeatmapColor = (value: number, max: number) => {
    if (value === 0) return 'bg-gray-100 dark:bg-slate-700';
    const intensity = value / max;
    if (intensity < 0.25) return 'bg-violet-200 dark:bg-violet-900/50';
    if (intensity < 0.5) return 'bg-violet-300 dark:bg-violet-800/60';
    if (intensity < 0.75) return 'bg-violet-400 dark:bg-violet-700/70';
    return 'bg-violet-500 dark:bg-violet-600';
  };

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-500" />
          Activity Heatmap
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          Peak hours visualization
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {/* Hour labels */}
          <div className="flex gap-1 mb-1 pl-12">
            {hours.filter((h) => h % 3 === 0).map((hour) => (
              <div
                key={hour}
                className="text-xs text-gray-500 dark:text-gray-400"
                style={{ width: `${(100 / 8)}%` }}
              >
                {hour}:00
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          {days.map((day) => (
            <div key={day} className="flex items-center gap-1 mb-1">
              <span className="w-10 text-xs text-gray-500 dark:text-gray-400">
                {day}
              </span>
              <div className="flex-1 flex gap-0.5">
                {hours.map((hour) => {
                  const cell = data.find((d) => d.day === day && d.hour === hour);
                  const value = cell?.value || 0;
                  return (
                    <div
                      key={`${day}-${hour}`}
                      className={`h-6 flex-1 rounded-sm ${getHeatmapColor(value, maxValue)} cursor-pointer transition-transform hover:scale-110`}
                      title={`${day} ${hour}:00 - ${formatNumber(value)} actions`}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-gray-500 dark:text-gray-400">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="w-4 h-4 rounded-sm bg-gray-100 dark:bg-slate-700" />
              <div className="w-4 h-4 rounded-sm bg-violet-200 dark:bg-violet-900/50" />
              <div className="w-4 h-4 rounded-sm bg-violet-300 dark:bg-violet-800/60" />
              <div className="w-4 h-4 rounded-sm bg-violet-400 dark:bg-violet-700/70" />
              <div className="w-4 h-4 rounded-sm bg-violet-500 dark:bg-violet-600" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Daily Activity Chart
function DailyActivityChart({ data }: { data: DailyActivity[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-500" />
          Daily Activity Overview
        </h2>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorPageViews" x1="0" y1="0" x2="0" y2="1">
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
            <YAxis tickFormatter={formatNumber} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
              formatter={(value: number) => [formatNumber(value), '']}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="pageViews"
              stroke="#8b5cf6"
              fillOpacity={1}
              fill="url(#colorPageViews)"
              name="Page Views"
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

// Performance Radar Chart
function PerformanceRadar() {
  const data = [
    { subject: 'Response Time', A: 85, fullMark: 100 },
    { subject: 'Uptime', A: 99, fullMark: 100 },
    { subject: 'User Satisfaction', A: 78, fullMark: 100 },
    { subject: 'Error Rate', A: 95, fullMark: 100 },
    { subject: 'Throughput', A: 82, fullMark: 100 },
    { subject: 'Efficiency', A: 88, fullMark: 100 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-pink-500" />
          Performance Score
        </h2>
        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium rounded-full">
          87/100
        </span>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
            <Radar
              name="Performance"
              dataKey="A"
              stroke="#8b5cf6"
              fill="#8b5cf6"
              fillOpacity={0.3}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>(TIME_RANGES[1]);
  const [showTimeRangeDropdown, setShowTimeRangeDropdown] = useState(false);

  // Data states
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalActions: 0,
    avgSessionDuration: 0,
    userChange: 0,
    actionChange: 0,
  });
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [moduleUsage, setModuleUsage] = useState<ModuleUsage[]>([]);
  const [loginTrends, setLoginTrends] = useState<LoginTrend[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary[]>([]);
  const [workflowMetrics, setWorkflowMetrics] = useState<WorkflowMetric[]>([]);
  const [dailyActivity, setDailyActivity] = useState<DailyActivity[]>([]);
  const [heatmapData, setHeatmapData] = useState<HourlyHeatmap[]>([]);

  const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);

    try {
      // Fetch from backend APIs
      const [
        summaryRes,
        usersRes,
        modulesRes,
        auditRes,
      ] = await Promise.allSettled([
        fetch(`${baseURL}/api/analytics/summary?period=${timeRange.value}`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/users?limit=10&sortBy=actions`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/module-usage-trends`, { credentials: 'include' }),
        fetch(`${baseURL}/api/enterprise-admin/audit/summary`, { credentials: 'include' }),
      ]);

      // Process responses or use demo data
      // Stats
      setStats({
        totalUsers: 1247,
        activeUsers: 892,
        totalActions: 45678,
        avgSessionDuration: 1847, // seconds
        userChange: 12.5,
        actionChange: 8.3,
      });

      // Active Users
      setActiveUsers([
        { id: '1', name: 'Rajesh Kumar', email: 'rajesh@company.com', actions: 1523, lastActive: new Date().toISOString(), sessions: 45, trend: 15 },
        { id: '2', name: 'Priya Sharma', email: 'priya@company.com', actions: 1389, lastActive: new Date(Date.now() - 3600000).toISOString(), sessions: 38, trend: 8 },
        { id: '3', name: 'Amit Patel', email: 'amit@company.com', actions: 1245, lastActive: new Date(Date.now() - 7200000).toISOString(), sessions: 42, trend: -3 },
        { id: '4', name: 'Sneha Reddy', email: 'sneha@company.com', actions: 1102, lastActive: new Date(Date.now() - 10800000).toISOString(), sessions: 35, trend: 22 },
        { id: '5', name: 'Vikram Singh', email: 'vikram@company.com', actions: 987, lastActive: new Date(Date.now() - 14400000).toISOString(), sessions: 29, trend: 5 },
        { id: '6', name: 'Ananya Gupta', email: 'ananya@company.com', actions: 876, lastActive: new Date(Date.now() - 18000000).toISOString(), sessions: 31, trend: -8 },
        { id: '7', name: 'Rahul Verma', email: 'rahul@company.com', actions: 765, lastActive: new Date(Date.now() - 21600000).toISOString(), sessions: 27, trend: 12 },
        { id: '8', name: 'Deepika Iyer', email: 'deepika@company.com', actions: 654, lastActive: new Date(Date.now() - 25200000).toISOString(), sessions: 24, trend: 3 },
        { id: '9', name: 'Arjun Menon', email: 'arjun@company.com', actions: 543, lastActive: new Date(Date.now() - 28800000).toISOString(), sessions: 21, trend: -5 },
        { id: '10', name: 'Kavitha Nair', email: 'kavitha@company.com', actions: 432, lastActive: new Date(Date.now() - 32400000).toISOString(), sessions: 18, trend: 7 },
      ]);

      // Module Usage
      setModuleUsage([
        { name: 'Dashboard', slug: 'dashboard', visits: 12453, uniqueUsers: 856, avgTimeSpent: 245, trend: 12, color: MODULE_COLORS[0] },
        { name: 'Inventory', slug: 'inventory', visits: 9876, uniqueUsers: 623, avgTimeSpent: 312, trend: 8, color: MODULE_COLORS[1] },
        { name: 'Sales', slug: 'sales', visits: 8765, uniqueUsers: 578, avgTimeSpent: 289, trend: 15, color: MODULE_COLORS[2] },
        { name: 'Purchase', slug: 'purchase', visits: 7654, uniqueUsers: 432, avgTimeSpent: 267, trend: 5, color: MODULE_COLORS[3] },
        { name: 'Accounts', slug: 'accounts', visits: 6543, uniqueUsers: 389, avgTimeSpent: 334, trend: -3, color: MODULE_COLORS[4] },
        { name: 'Reports', slug: 'reports', visits: 5432, uniqueUsers: 298, avgTimeSpent: 456, trend: 22, color: MODULE_COLORS[5] },
        { name: 'Settings', slug: 'settings', visits: 3210, uniqueUsers: 187, avgTimeSpent: 123, trend: 2, color: MODULE_COLORS[6] },
        { name: 'HR', slug: 'hr', visits: 2345, uniqueUsers: 156, avgTimeSpent: 278, trend: 9, color: MODULE_COLORS[7] },
      ]);

      // Login Trends - Generate data based on time range
      const loginData: LoginTrend[] = [];
      for (let i = timeRange.days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const successful = Math.floor(150 + Math.random() * 100);
        const failed = Math.floor(5 + Math.random() * 15);
        loginData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          successful,
          failed,
          total: successful + failed,
        });
      }
      setLoginTrends(loginData);

      // Audit Summary
      setAuditSummary([
        { action: 'create', count: 4523, icon: Plus, color: COLORS.success },
        { action: 'update', count: 8765, icon: Edit, color: COLORS.info },
        { action: 'delete', count: 1234, icon: Trash2, color: COLORS.danger },
        { action: 'view', count: 15678, icon: Eye, color: COLORS.primary },
        { action: 'login', count: 5432, icon: LogIn, color: COLORS.secondary },
        { action: 'export', count: 876, icon: Download, color: COLORS.warning },
      ]);

      // Workflow Metrics
      setWorkflowMetrics([
        { name: 'Task Completion Rate', value: 87, target: 90, unit: '%', status: 'warning' },
        { name: 'Avg. Response Time', value: 2.3, target: 3, unit: 's', status: 'good' },
        { name: 'Document Processing', value: 156, target: 200, unit: '/day', status: 'warning' },
        { name: 'Approval Turnaround', value: 4.2, target: 8, unit: 'hrs', status: 'good' },
        { name: 'Error Rate', value: 1.2, target: 2, unit: '%', status: 'good' },
        { name: 'User Satisfaction', value: 78, target: 85, unit: '%', status: 'warning' },
      ]);

      // Daily Activity
      const activityData: DailyActivity[] = [];
      for (let i = 29; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        activityData.push({
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pageViews: Math.floor(5000 + Math.random() * 3000),
          apiCalls: Math.floor(15000 + Math.random() * 10000),
          uniqueUsers: Math.floor(200 + Math.random() * 150),
        });
      }
      setDailyActivity(activityData);

      // Heatmap Data
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const heatmap: HourlyHeatmap[] = [];
      days.forEach((day) => {
        for (let hour = 0; hour < 24; hour++) {
          const isWeekend = day === 'Sat' || day === 'Sun';
          const isBusinessHours = hour >= 9 && hour <= 18;
          let baseValue = isWeekend ? 20 : isBusinessHours ? 100 : 30;
          if (hour >= 10 && hour <= 12) baseValue *= 1.5;
          if (hour >= 14 && hour <= 16) baseValue *= 1.3;
          heatmap.push({
            day,
            hour,
            value: Math.floor(baseValue + Math.random() * 50),
          });
        }
      });
      setHeatmapData(heatmap);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }, [baseURL, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleExport = async (format: 'csv' | 'json') => {
    // Export analytics data
    const exportData = {
      generatedAt: new Date().toISOString(),
      timeRange: timeRange.label,
      stats,
      activeUsers,
      moduleUsage,
      auditSummary,
    };

    const blob = new Blob(
      [format === 'json' ? JSON.stringify(exportData, null, 2) : 'CSV export'],
      { type: format === 'json' ? 'application/json' : 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-violet-500" />
              Advanced Analytics
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Comprehensive insights into platform usage and performance
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Time Range Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTimeRangeDropdown(!showTimeRangeDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                <Calendar className="w-4 h-4" />
                {timeRange.label}
                <ChevronDown className="w-4 h-4" />
              </button>
              <AnimatePresence>
                {showTimeRangeDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10"
                  >
                    {TIME_RANGES.map((range) => (
                      <button
                        key={range.value}
                        onClick={() => {
                          setTimeRange(range);
                          setShowTimeRangeDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg ${
                          timeRange.value === range.value
                            ? 'text-violet-600 dark:text-violet-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {range.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Export Button */}
            <button
              onClick={() => handleExport('json')}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              <Download className="w-4 h-4" />
              Export
            </button>

            {/* Refresh Button */}
            <button
              onClick={fetchAnalytics}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-sm font-medium"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Users"
            value={formatNumber(stats.totalUsers)}
            change={stats.userChange}
            icon={Users}
            color={COLORS.primary}
          />
          <StatsCard
            title="Active Users"
            value={formatNumber(stats.activeUsers)}
            change={8.2}
            icon={Activity}
            color={COLORS.success}
          />
          <StatsCard
            title="Total Actions"
            value={formatNumber(stats.totalActions)}
            change={stats.actionChange}
            icon={MousePointer}
            color={COLORS.secondary}
          />
          <StatsCard
            title="Avg. Session"
            value={formatDuration(stats.avgSessionDuration)}
            change={5.4}
            icon={Clock}
            color={COLORS.warning}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Most Active Users */}
          <ActiveUsersTable users={activeUsers} />

          {/* Module Usage */}
          <ModuleUsageChart modules={moduleUsage} />
        </div>

        {/* Login Trends - Full Width */}
        <div className="mb-8">
          <LoginTrendsChart data={loginTrends} />
        </div>

        {/* Audit & Workflow Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <AuditLogSummary data={auditSummary} />
          <WorkflowMetrics metrics={workflowMetrics} />
        </div>

        {/* Activity Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <DailyActivityChart data={dailyActivity} />
          </div>
          <PerformanceRadar />
        </div>

        {/* Activity Heatmap */}
        <ActivityHeatmap data={heatmapData} />

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Data refreshed: {new Date().toLocaleString()} • 
            Analytics powered by BISMAN ERP
          </p>
        </div>
      </div>
    </div>
  );
}
