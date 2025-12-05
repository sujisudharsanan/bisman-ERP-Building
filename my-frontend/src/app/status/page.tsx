'use client';

/**
 * Public Status Page
 * BISMAN ERP - System Status & Uptime
 *
 * Public-facing status page showing:
 * - Overall system health
 * - Service component status
 * - Active incidents
 * - Historical uptime
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Clock,
  Calendar,
} from 'lucide-react';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type SystemStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';
type IncidentSeverity = 'minor' | 'major' | 'critical';
type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';

interface ServiceStatus {
  name: string;
  status: SystemStatus;
  description?: string;
}

interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: string;
  resolvedAt?: string;
  message: string;
  updates: {
    time: string;
    message: string;
    status: IncidentStatus;
  }[];
}

interface DailyUptime {
  date: string;
  uptime: number;
  hasIncident: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COLORS = {
  operational: '#22c55e',
  degraded: '#f59e0b',
  partial_outage: '#f97316',
  major_outage: '#ef4444',
};

const STATUS_CONFIG: Record<SystemStatus, { label: string; color: string; icon: any; description: string }> = {
  operational: { 
    label: 'All Systems Operational', 
    color: COLORS.operational, 
    icon: CheckCircle,
    description: 'All services are running normally'
  },
  degraded: { 
    label: 'Performance Degraded', 
    color: COLORS.degraded, 
    icon: AlertTriangle,
    description: 'Some services are experiencing slower than normal response times'
  },
  partial_outage: { 
    label: 'Partial System Outage', 
    color: COLORS.partial_outage, 
    icon: AlertCircle,
    description: 'Some services are currently unavailable'
  },
  major_outage: { 
    label: 'Major Outage', 
    color: COLORS.major_outage, 
    icon: XCircle,
    description: 'A major outage is affecting multiple services'
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
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

// Main status hero
function StatusHero({ status }: { status: SystemStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-12 rounded-2xl mb-8"
      style={{ backgroundColor: `${config.color}10` }}
    >
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
        style={{ backgroundColor: `${config.color}20` }}
      >
        <Icon className="w-10 h-10" style={{ color: config.color }} />
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {config.label}
      </h1>
      <p className="text-gray-600 dark:text-gray-400">
        {config.description}
      </p>
    </motion.div>
  );
}

// Component status row
function ComponentRow({ service }: { service: ServiceStatus }) {
  const config = STATUS_CONFIG[service.status];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200 dark:border-slate-700 last:border-0">
      <div className="flex items-center gap-3">
        <span className="font-medium text-gray-900 dark:text-white">
          {service.name}
        </span>
        {service.description && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            — {service.description}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span
          className="text-sm font-medium capitalize"
          style={{ color: config.color }}
        >
          {service.status.replace('_', ' ')}
        </span>
        <Icon className="w-5 h-5" style={{ color: config.color }} />
      </div>
    </div>
  );
}

// Uptime calendar
function UptimeCalendar({ data }: { data: DailyUptime[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          90-Day Uptime
        </h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {data.length > 0 && (
            <>
              {(data.reduce((sum, d) => sum + d.uptime, 0) / data.length).toFixed(2)}% average
            </>
          )}
        </span>
      </div>

      <div className="flex gap-1 flex-wrap justify-center">
        {data.map((day, idx) => {
          const color = day.uptime >= 99.9
            ? COLORS.operational
            : day.uptime >= 99
            ? COLORS.degraded
            : day.uptime >= 95
            ? COLORS.partial_outage
            : COLORS.major_outage;

          return (
            <div
              key={idx}
              className="w-3 h-8 rounded-sm cursor-pointer transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
              title={`${formatDate(day.date)}: ${day.uptime.toFixed(2)}%`}
            />
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 mt-4 text-xs text-gray-500 dark:text-gray-400">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.operational }} />
          100%
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.degraded }} />
          99%+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.partial_outage }} />
          95%+
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.major_outage }} />
          &lt;95%
        </span>
      </div>
    </motion.div>
  );
}

// Active incident banner
function ActiveIncidentBanner({ incident }: { incident: Incident }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-8 overflow-hidden"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-800 dark:text-yellow-300">
              {incident.title}
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              Started {formatDateTime(incident.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 text-xs font-medium rounded capitalize">
            {incident.status}
          </span>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-yellow-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-yellow-600" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-yellow-200 dark:border-yellow-800"
          >
            <div className="p-4 space-y-4">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                {incident.message}
              </p>

              <div className="space-y-3">
                {incident.updates.map((update, idx) => (
                  <div key={idx} className="flex gap-3 text-sm">
                    <span className="text-yellow-600 dark:text-yellow-500 whitespace-nowrap">
                      {formatDateTime(update.time)}
                    </span>
                    <div>
                      <span className="px-1.5 py-0.5 bg-yellow-200/50 text-yellow-700 text-xs rounded capitalize mr-2">
                        {update.status}
                      </span>
                      <span className="text-yellow-700 dark:text-yellow-400">
                        {update.message}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Past incidents list
function PastIncidents({ incidents }: { incidents: Incident[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (incidents.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-500" />
          Past Incidents
        </h2>
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">
            No incidents in the last 14 days
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
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Clock className="w-5 h-5 text-gray-500" />
        Past Incidents
      </h2>

      <div className="space-y-4">
        {incidents.map((incident) => (
          <div
            key={incident.id}
            className="border border-gray-200 dark:border-slate-700 rounded-lg overflow-hidden"
          >
            <button
              onClick={() => setExpanded(expanded === incident.id ? null : incident.id)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-700/50"
            >
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {incident.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(incident.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded">
                  Resolved
                </span>
                {expanded === incident.id ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </button>

            <AnimatePresence>
              {expanded === incident.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-gray-200 dark:border-slate-700 p-4 bg-gray-50 dark:bg-slate-700/30"
                >
                  <div className="space-y-2">
                    {incident.updates.map((update, idx) => (
                      <div key={idx} className="flex gap-3 text-sm">
                        <span className="text-gray-500 whitespace-nowrap">
                          {formatDateTime(update.time)}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {update.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PublicStatusPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [uptimeData, setUptimeData] = useState<DailyUptime[]>([]);
  const [activeIncidents, setActiveIncidents] = useState<Incident[]>([]);
  const [pastIncidents, setPastIncidents] = useState<Incident[]>([]);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);

    try {
      // In production, fetch from /api/status endpoint
      // For now, use demo data

      // Services
      setServices([
        { name: 'BISMAN ERP Platform', status: 'operational' },
        { name: 'API Services', status: 'operational' },
        { name: 'Web Application', status: 'operational' },
        { name: 'Database', status: 'operational' },
        { name: 'Authentication', status: 'operational' },
        { name: 'File Storage', status: 'operational' },
        { name: 'Email Notifications', status: 'operational' },
        { name: 'Background Jobs', status: 'operational' },
      ]);

      // Generate 90 days of uptime data
      const uptime: DailyUptime[] = [];
      for (let i = 89; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
        const uptimeValue = 99.5 + Math.random() * 0.5; // 99.5-100%
        uptime.push({
          date: date.toISOString(),
          uptime: Math.min(100, uptimeValue),
          hasIncident: uptimeValue < 99.9,
        });
      }
      setUptimeData(uptime);

      // No active incidents
      setActiveIncidents([]);

      // Past incidents
      setPastIncidents([
        {
          id: 'inc-001',
          title: 'Elevated API Latency',
          severity: 'minor',
          status: 'resolved',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(),
          message: 'We experienced elevated API response times due to database connection pool saturation.',
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
      console.error('Error fetching status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const overallStatus = getOverallStatus(services);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              BISMAN ERP Status
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Real-time system status and uptime
            </p>
          </div>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Status Hero */}
        <StatusHero status={overallStatus} />

        {/* Active Incidents */}
        {activeIncidents.map((incident) => (
          <ActiveIncidentBanner key={incident.id} incident={incident} />
        ))}

        {/* Components */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Components
          </h2>
          <div>
            {services.map((service) => (
              <ComponentRow key={service.name} service={service} />
            ))}
          </div>
        </motion.div>

        {/* Uptime Calendar */}
        <UptimeCalendar data={uptimeData} />

        {/* Past Incidents */}
        <PastIncidents incidents={pastIncidents} />

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Last updated: {lastUpdated ? lastUpdated.toLocaleString() : '—'}
          </p>
          <p className="mt-2">
            Subscribe to updates via{' '}
            <a href="/status/rss" className="text-violet-600 hover:underline">
              RSS
            </a>{' '}
            or{' '}
            <a href="/status/subscribe" className="text-violet-600 hover:underline">
              Email
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
