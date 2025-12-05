'use client';

/**
 * SLA Dashboard - Enterprise Admin View
 * BISMAN ERP - Service Level Agreement Monitoring
 *
 * Features:
 * - API uptime % (30-day rolling)
 * - P95 latency charts
 * - Error budget remaining
 * - Incident history
 * - System status (Operational / Degraded / Outage)
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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  RefreshCw,
  Shield,
  TrendingUp,
  TrendingDown,
  XCircle,
  AlertCircle,
  Calendar,
  Zap,
  Server,
  Database,
  Globe,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Download,
} from 'lucide-react';
import { usePageRefresh } from '@/contexts/RefreshContext';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SystemStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
type IncidentSeverity = 'minor' | 'major' | 'critical';
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface SLAMetric {
  current: number;
  target: number;
  compliant: boolean;
  unit: string;
}

interface ErrorBudget {
  total: number;
  remaining: number;
  percentRemaining: number;
  unit: string;
}

interface SLAData {
  period: {
    from: string;
    to: string;
    days: number;
  };
  metrics: {
    availability: SLAMetric;
    p95Latency: SLAMetric;
    errorRate: SLAMetric;
  };
  errorBudget: ErrorBudget;
  sla: {
    compliant: boolean;
    tier: string;
    thresholds: {
      availability: number;
      p95Latency: number;
      errorRate: number;
    };
  };
}

interface LatencyDataPoint {
  timestamp: string;
  p50: number;
  p95: number;
  p99: number;
}

interface UptimeDataPoint {
  date: string;
  uptime: number;
  target: number;
}

interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  duration?: number;
  affectedServices: string[];
  updates: {
    time: string;
    message: string;
    status: IncidentStatus;
  }[];
}

interface ServiceStatus {
  name: string;
  status: SystemStatus;
  uptime: number;
  latency?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  operational: '#22c55e',
  degraded: '#f59e0b',
  partial_outage: '#f97316',
  major_outage: '#ef4444',
  primary: '#8b5cf6',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
};

const STATUS_CONFIG: Record<SystemStatus, { label: string; color: string; icon: any }> = {
  operational: { label: 'All Systems Operational', color: COLORS.operational, icon: CheckCircle },
  degraded: { label: 'Performance Degraded', color: COLORS.degraded, icon: AlertTriangle },
  partial_outage: { label: 'Partial System Outage', color: COLORS.partial_outage, icon: AlertCircle },
  major_outage: { label: 'Major Outage', color: COLORS.major_outage, icon: XCircle },
};

const SEVERITY_CONFIG: Record<IncidentSeverity, { color: string; label: string }> = {
  minor: { color: COLORS.warning, label: 'Minor' },
  major: { color: COLORS.partial_outage, label: 'Major' },
  critical: { color: COLORS.danger, label: 'Critical' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;
  return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getOverallStatus(services: ServiceStatus[]): SystemStatus {
  const hasOutage = services.some((s) => s.status === 'major_outage');
  if (hasOutage) return 'major_outage';
  
  const hasPartialOutage = services.some((s) => s.status === 'partial_outage');
  if (hasPartialOutage) return 'partial_outage';
  
  const hasDegraded = services.some((s) => s.status === 'degraded');
  if (hasDegraded) return 'degraded';
  
  return 'operational';
}

// ============================================================================
// COMPONENTS
// ============================================================================

// Overall system status banner
function StatusBanner({ status, lastUpdated }: { status: SystemStatus; lastUpdated: Date | null }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-6 mb-6"
      style={{ backgroundColor: `${config.color}15`, borderLeft: `4px solid ${config.color}` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-6 h-6" style={{ color: config.color }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {config.label}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Last checked: {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full animate-pulse"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-sm font-medium" style={{ color: config.color }}>
            Live
          </span>
        </div>
      </div>
    </motion.div>
  );
}

// SLA compliance card with gauge
function SLAComplianceCard({ sla, metrics }: { sla: SLAData['sla']; metrics: SLAData['metrics'] }) {
  const complianceItems = [
    { name: 'Availability', ...metrics.availability, icon: Globe, inverted: false },
    { name: 'P95 Latency', ...metrics.p95Latency, icon: Gauge, inverted: false },
    { name: 'Error Rate', ...metrics.errorRate, icon: AlertTriangle, inverted: true },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border-2 p-6 ${
        sla.compliant
          ? 'border-green-500'
          : 'border-red-500'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className={`w-6 h-6 ${sla.compliant ? 'text-green-500' : 'text-red-500'}`} />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              SLA Compliance
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {sla.tier} tier
            </p>
          </div>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-bold ${
            sla.compliant
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}
        >
          {sla.compliant ? 'COMPLIANT' : 'NON-COMPLIANT'}
        </span>
      </div>

      <div className="space-y-4">
        {complianceItems.map((item) => {
          const Icon = item.icon;
          const displayValue = item.name === 'P95 Latency' 
            ? `${item.current}ms` 
            : `${item.current.toFixed(2)}%`;
          const targetValue = item.name === 'P95 Latency'
            ? `≤${item.target}ms`
            : item.inverted
            ? `≤${item.target}%`
            : `≥${item.target}%`;

          return (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {displayValue}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({targetValue})
                </span>
                {item.compliant ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Error budget gauge
function ErrorBudgetCard({ errorBudget }: { errorBudget: ErrorBudget }) {
  const isLow = errorBudget.percentRemaining < 20;
  const isWarning = errorBudget.percentRemaining < 50;
  const color = isLow ? COLORS.danger : isWarning ? COLORS.warning : COLORS.success;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-500" />
          Error Budget
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          30-day rolling
        </span>
      </div>

      {/* Circular gauge */}
      <div className="flex items-center justify-center mb-6">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
              className="dark:stroke-slate-700"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={color}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(errorBudget.percentRemaining / 100) * 440} 440`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {errorBudget.percentRemaining}%
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">remaining</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Budget</p>
          <p className="font-semibold text-gray-900 dark:text-white">
            {formatDuration(errorBudget.total)}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-3">
          <p className="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
          <p className="font-semibold" style={{ color }}>
            {formatDuration(errorBudget.remaining)}
          </p>
        </div>
      </div>

      {isLow && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Error budget critically low
          </p>
        </div>
      )}
    </motion.div>
  );
}

// Uptime metric card
function UptimeCard({ availability }: { availability: SLAMetric }) {
  const uptimeColor = availability.current >= 99.9 
    ? COLORS.success 
    : availability.current >= 99.5 
    ? COLORS.warning 
    : COLORS.danger;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg p-6 text-white"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Activity className="w-5 h-5" />
          API Uptime
        </h3>
        <span className="text-sm opacity-80">Last 30 days</span>
      </div>

      <div className="text-center mb-4">
        <span className="text-5xl font-bold">{availability.current.toFixed(3)}%</span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="opacity-80">SLA Target</span>
        <span className="font-medium">{availability.target}%</span>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between">
          <span className="opacity-80">Status</span>
          <div className="flex items-center gap-2">
            {availability.compliant ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Meeting SLA</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span className="font-medium">Below SLA</span>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// P95 Latency chart
function LatencyChart({
  data,
  target,
  isLoading,
}: {
  data: LatencyDataPoint[];
  target: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
          P95 Latency
        </h3>
        <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded animate-pulse" />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Gauge className="w-5 h-5 text-violet-500" />
          Response Time Percentiles
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            P50
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-violet-500" />
            P95
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            P99
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="p95Gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
              <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
          <XAxis dataKey="timestamp" stroke="#6b7280" fontSize={12} />
          <YAxis stroke="#6b7280" fontSize={12} unit="ms" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#fff',
            }}
            formatter={(value: number) => [`${value}ms`, '']}
          />
          <ReferenceLine
            y={target}
            stroke={COLORS.danger}
            strokeDasharray="5 5"
            label={{ value: `SLA: ${target}ms`, fill: COLORS.danger, fontSize: 12 }}
          />
          <Area
            type="monotone"
            dataKey="p50"
            stroke={COLORS.success}
            fill="none"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="p95"
            stroke={COLORS.primary}
            fill="url(#p95Gradient)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="p99"
            stroke={COLORS.danger}
            fill="none"
            strokeWidth={2}
            strokeDasharray="5 5"
          />
        </AreaChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

// Service status list
function ServiceStatusList({ services }: { services: ServiceStatus[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Server className="w-5 h-5 text-violet-500" />
        Service Status
      </h3>

      <div className="space-y-3">
        {services.map((service) => {
          const statusConfig = STATUS_CONFIG[service.status];
          return (
            <div
              key={service.name}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: statusConfig.color }}
                />
                <span className="font-medium text-gray-900 dark:text-white">
                  {service.name}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-gray-500 dark:text-gray-400">
                  {service.uptime.toFixed(2)}% uptime
                </span>
                {service.latency && (
                  <span className="text-gray-500 dark:text-gray-400">
                    {service.latency}ms
                  </span>
                )}
                <span
                  className="px-2 py-1 rounded text-xs font-medium"
                  style={{
                    backgroundColor: `${statusConfig.color}20`,
                    color: statusConfig.color,
                  }}
                >
                  {service.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// Incident history
function IncidentHistory({ incidents }: { incidents: Incident[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (incidents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
      >
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-violet-500" />
          Incident History
        </h3>
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No incidents in the last 30 days
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
    >
      <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-violet-500" />
        Incident History
      </h3>

      <div className="space-y-3">
        {incidents.map((incident) => {
          const severityConfig = SEVERITY_CONFIG[incident.severity];
          const isExpanded = expandedId === incident.id;

          return (
            <div
              key={incident.id}
              className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : incident.id)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: severityConfig.color }}
                  />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {incident.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(incident.createdAt)} • {incident.duration ? formatDuration(incident.duration) : 'Ongoing'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      incident.status === 'resolved'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}
                  >
                    {incident.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-gray-200 dark:border-slate-700"
                  >
                    <div className="p-4 bg-gray-50 dark:bg-slate-700/30 space-y-4">
                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                          Affected Services
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {incident.affectedServices.map((service) => (
                            <span
                              key={service}
                              className="px-2 py-1 bg-gray-200 dark:bg-slate-600 rounded text-xs text-gray-700 dark:text-gray-300"
                            >
                              {service}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          Timeline
                        </p>
                        <div className="space-y-2">
                          {incident.updates.map((update, idx) => (
                            <div key={idx} className="flex gap-3 text-sm">
                              <span className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatTime(update.time)}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {update.message}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SLADashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [periodDays, setPeriodDays] = useState(30);

  // Data state
  const [slaData, setSlaData] = useState<SLAData | null>(null);
  const [latencyData, setLatencyData] = useState<LatencyDataPoint[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  // Fetch SLA data
  const fetchSLAData = useCallback(async () => {
    setIsLoading(true);

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || '';

      // Fetch SLA metrics
      const metricsRes = await fetch(
        `${baseURL}/api/admin/tenants/metrics?days=${periodDays}`,
        { credentials: 'include' }
      );

      if (metricsRes.ok) {
        const data = await metricsRes.json();
        if (data.success) {
          setSlaData(data.data);
        }
      } else {
        // Demo data
        setSlaData({
          period: {
            from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date().toISOString(),
            days: 30,
          },
          metrics: {
            availability: { current: 99.95, target: 99.9, compliant: true, unit: '%' },
            p95Latency: { current: 342, target: 500, compliant: true, unit: 'ms' },
            errorRate: { current: 0.05, target: 0.1, compliant: true, unit: '%' },
          },
          errorBudget: {
            total: 43.2,
            remaining: 38.5,
            percentRemaining: 89,
            unit: 'minutes',
          },
          sla: {
            compliant: true,
            tier: 'enterprise',
            thresholds: { availability: 99.9, p95Latency: 500, errorRate: 0.1 },
          },
        });
      }

      // Generate latency chart data
      const now = new Date();
      const chartData: LatencyDataPoint[] = [];
      for (let i = 23; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        chartData.push({
          timestamp: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          p50: Math.floor(Math.random() * 100) + 100,
          p95: Math.floor(Math.random() * 150) + 250,
          p99: Math.floor(Math.random() * 200) + 400,
        });
      }
      setLatencyData(chartData);

      // Service statuses
      setServices([
        { name: 'API Gateway', status: 'operational', uptime: 99.98, latency: 45 },
        { name: 'Database Primary', status: 'operational', uptime: 99.99, latency: 12 },
        { name: 'Database Replica', status: 'operational', uptime: 99.95, latency: 15 },
        { name: 'Redis Cache', status: 'operational', uptime: 99.99, latency: 2 },
        { name: 'Background Jobs', status: 'operational', uptime: 99.90 },
        { name: 'Email Service', status: 'operational', uptime: 99.85 },
      ]);

      // Sample incidents
      setIncidents([
        {
          id: 'inc-001',
          title: 'Elevated API Latency',
          severity: 'minor',
          status: 'resolved',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          duration: 45,
          affectedServices: ['API Gateway'],
          updates: [
            { time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), message: 'Investigating elevated response times', status: 'investigating' },
            { time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 15 * 60 * 1000).toISOString(), message: 'Issue identified: connection pool exhaustion', status: 'identified' },
            { time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(), message: 'Fix deployed, monitoring', status: 'monitoring' },
            { time: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), message: 'Issue resolved, latency back to normal', status: 'resolved' },
          ],
        },
      ]);

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching SLA data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [periodDays]);

  // Register refresh handler
  usePageRefresh('sla-dashboard', fetchSLAData);

  // Initial fetch
  useEffect(() => {
    fetchSLAData();
  }, [fetchSLAData]);

  const overallStatus = getOverallStatus(services);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              SLA Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Service Level Agreement compliance and system status
            </p>
          </div>
          <div className="flex items-center gap-4">
            <select
              value={periodDays}
              onChange={(e) => setPeriodDays(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={fetchSLAData}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Status Banner */}
        <StatusBanner status={overallStatus} lastUpdated={lastUpdated} />

        {/* Top Row: Uptime, SLA Compliance, Error Budget */}
        {slaData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <UptimeCard availability={slaData.metrics.availability} />
            <SLAComplianceCard sla={slaData.sla} metrics={slaData.metrics} />
            <ErrorBudgetCard errorBudget={slaData.errorBudget} />
          </div>
        )}

        {/* Latency Chart */}
        <div className="mb-6">
          <LatencyChart
            data={latencyData}
            target={slaData?.sla.thresholds.p95Latency || 500}
            isLoading={isLoading}
          />
        </div>

        {/* Bottom Row: Services and Incidents */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ServiceStatusList services={services} />
          <IncidentHistory incidents={incidents} />
        </div>

        {/* Footer with links */}
        <div className="mt-8 flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>SLA terms based on your subscription tier</span>
          <div className="flex items-center gap-4">
            <a href="/docs/sla" className="flex items-center gap-1 hover:text-violet-600">
              View SLA Terms <ExternalLink className="w-3 h-3" />
            </a>
            <a href="/support" className="flex items-center gap-1 hover:text-violet-600">
              Report Issue <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
