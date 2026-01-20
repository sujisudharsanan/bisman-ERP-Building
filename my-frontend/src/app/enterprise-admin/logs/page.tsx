"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FiRefreshCw,
  FiFileText,
  FiActivity,
  FiShield,
  FiSearch,
  FiDownload,
  FiAlertTriangle,
  FiInfo,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiUser,
  FiServer,
  FiLock,
  FiUnlock,
  FiEye,
  FiEdit,
  FiTrash2,
  FiLogIn,
  FiLogOut,
} from "react-icons/fi";
import { format } from "date-fns";
import { usePageRefresh, useRefreshTrigger } from "@/contexts/RefreshContext";

// ============================================================================
// TYPES
// ============================================================================

interface SystemLog {
  id: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  ip_address: string;
  user_agent: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

interface SecurityEvent {
  id: string;
  event_type: string;
  severity: "low" | "medium" | "high" | "critical";
  user_id?: string;
  user_email?: string;
  ip_address: string;
  description: string;
  timestamp: string;
  resolved: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const LogLevelBadge: React.FC<{ level: string }> = ({ level }) => {
  const config: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
    info: { bg: "bg-blue-100", text: "text-blue-800", icon: <FiInfo className="h-3 w-3" /> },
    warn: { bg: "bg-yellow-100", text: "text-yellow-800", icon: <FiAlertTriangle className="h-3 w-3" /> },
    error: { bg: "bg-red-100", text: "text-red-800", icon: <FiAlertCircle className="h-3 w-3" /> },
    debug: { bg: "bg-gray-100", text: "text-gray-800", icon: <FiFileText className="h-3 w-3" /> },
  };
  const { bg, text, icon } = config[level] || config.info;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {icon}
      {level.toUpperCase()}
    </span>
  );
};

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const config: Record<string, { bg: string; text: string }> = {
    low: { bg: "bg-green-100", text: "text-green-800" },
    medium: { bg: "bg-yellow-100", text: "text-yellow-800" },
    high: { bg: "bg-orange-100", text: "text-orange-800" },
    critical: { bg: "bg-red-100", text: "text-red-800" },
  };
  const { bg, text } = config[severity] || config.low;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>
      {severity.toUpperCase()}
    </span>
  );
};

const ActionIcon: React.FC<{ action: string }> = ({ action }) => {
  const iconMap: Record<string, React.ReactNode> = {
    login: <FiLogIn className="h-4 w-4 text-green-500" />,
    logout: <FiLogOut className="h-4 w-4 text-gray-500" />,
    create: <FiEdit className="h-4 w-4 text-blue-500" />,
    update: <FiEdit className="h-4 w-4 text-yellow-500" />,
    delete: <FiTrash2 className="h-4 w-4 text-red-500" />,
    view: <FiEye className="h-4 w-4 text-gray-500" />,
    lock: <FiLock className="h-4 w-4 text-orange-500" />,
    unlock: <FiUnlock className="h-4 w-4 text-green-500" />,
  };
  return <>{iconMap[action.toLowerCase()] || <FiActivity className="h-4 w-4 text-gray-400" />}</>;
};

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

const SystemLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState({ level: "all", search: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/enterprise-admin/logs/system", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch system logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Demo data for display
      setLogs([
        { id: "1", level: "info", message: "Server started successfully", source: "server", timestamp: new Date().toISOString() },
        { id: "2", level: "warn", message: "High memory usage detected", source: "monitor", timestamp: new Date().toISOString() },
        { id: "3", level: "error", message: "Database connection timeout", source: "database", timestamp: new Date().toISOString() },
        { id: "4", level: "info", message: "Cache cleared successfully", source: "cache", timestamp: new Date().toISOString() },
        { id: "5", level: "debug", message: "Request processing time: 45ms", source: "api", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (filter.level !== "all" && log.level !== filter.level) return false;
    if (filter.search && !log.message.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filter.level}
          onChange={(e) => setFilter({ ...filter, level: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {["info", "warn", "error", "debug"].map((level) => (
          <div key={level} className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <LogLevelBadge level={level} />
              <span className="text-2xl font-bold">{logs.filter((l) => l.level === level).length}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FiRefreshCw className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : error ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          <p className="font-medium">Using demo data</p>
          <p className="text-sm">{error}</p>
        </div>
      ) : null}

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <FiClock className="h-3 w-3" />
                    {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <LogLevelBadge level={log.level} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FiServer className="h-3 w-3" />
                    {log.source}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ActivityLogsTab: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ action: "all", search: "" });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enterprise-admin/logs/activity", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      // Demo data
      setLogs([
        { id: "1", user_id: "u1", user_name: "John Smith", user_email: "john@example.com", action: "login", entity_type: "session", entity_id: "s1", entity_name: "Web Session", ip_address: "192.168.1.1", user_agent: "Chrome", timestamp: new Date().toISOString() },
        { id: "2", user_id: "u2", user_name: "Jane Doe", user_email: "jane@example.com", action: "create", entity_type: "user", entity_id: "u3", entity_name: "New User", ip_address: "192.168.1.2", user_agent: "Firefox", timestamp: new Date().toISOString() },
        { id: "3", user_id: "u1", user_name: "John Smith", user_email: "john@example.com", action: "update", entity_type: "settings", entity_id: "set1", entity_name: "System Settings", ip_address: "192.168.1.1", user_agent: "Chrome", timestamp: new Date().toISOString() },
        { id: "4", user_id: "u3", user_name: "Bob Wilson", user_email: "bob@example.com", action: "view", entity_type: "report", entity_id: "r1", entity_name: "Monthly Report", ip_address: "192.168.1.3", user_agent: "Safari", timestamp: new Date().toISOString() },
        { id: "5", user_id: "u2", user_name: "Jane Doe", user_email: "jane@example.com", action: "delete", entity_type: "document", entity_id: "d1", entity_name: "Old Document", ip_address: "192.168.1.2", user_agent: "Firefox", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const filteredLogs = logs.filter((log) => {
    if (filter.action !== "all" && log.action !== filter.action) return false;
    if (filter.search && !log.user_name.toLowerCase().includes(filter.search.toLowerCase()) && !log.entity_name.toLowerCase().includes(filter.search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by user or entity..."
            value={filter.search}
            onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filter.action}
          onChange={(e) => setFilter({ ...filter, action: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Actions</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="create">Create</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="view">View</option>
        </select>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FiRefreshCw className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {format(new Date(log.timestamp), "MMM dd, HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                        <FiUser className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user_name}</div>
                        <div className="text-xs text-gray-500">{log.user_email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ActionIcon action={log.action} />
                      <span className="text-sm capitalize">{log.action}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-gray-900">{log.entity_name}</div>
                    <div className="text-xs text-gray-500">{log.entity_type}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{log.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const SecurityOpsTab: React.FC = () => {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ severity: "all", resolved: "all" });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/enterprise-admin/security/events", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      // Demo data
      setEvents([
        { id: "1", event_type: "failed_login", severity: "medium", user_email: "unknown@test.com", ip_address: "203.0.113.1", description: "Multiple failed login attempts detected", timestamp: new Date().toISOString(), resolved: false },
        { id: "2", event_type: "suspicious_activity", severity: "high", user_email: "user@example.com", ip_address: "198.51.100.1", description: "Unusual access pattern from new location", timestamp: new Date().toISOString(), resolved: false },
        { id: "3", event_type: "permission_escalation", severity: "critical", user_email: "admin@example.com", ip_address: "192.168.1.1", description: "Attempted unauthorized role change", timestamp: new Date().toISOString(), resolved: true },
        { id: "4", event_type: "brute_force", severity: "high", ip_address: "203.0.113.50", description: "Brute force attack detected and blocked", timestamp: new Date().toISOString(), resolved: true },
        { id: "5", event_type: "data_export", severity: "low", user_email: "manager@example.com", ip_address: "192.168.1.5", description: "Large data export performed", timestamp: new Date().toISOString(), resolved: false },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = events.filter((e) => {
    if (filter.severity !== "all" && e.severity !== filter.severity) return false;
    if (filter.resolved === "resolved" && !e.resolved) return false;
    if (filter.resolved === "unresolved" && e.resolved) return false;
    return true;
  });

  const stats = {
    critical: events.filter((e) => e.severity === "critical" && !e.resolved).length,
    high: events.filter((e) => e.severity === "high" && !e.resolved).length,
    medium: events.filter((e) => e.severity === "medium" && !e.resolved).length,
    low: events.filter((e) => e.severity === "low" && !e.resolved).length,
  };

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {Object.entries(stats).map(([severity, count]) => (
          <div
            key={severity}
            className={`rounded-lg p-4 border ${
              severity === "critical"
                ? "bg-red-50 border-red-200"
                : severity === "high"
                ? "bg-orange-50 border-orange-200"
                : severity === "medium"
                ? "bg-yellow-50 border-yellow-200"
                : "bg-green-50 border-green-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium capitalize">{severity}</span>
              <span className="text-2xl font-bold">{count}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Unresolved</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filter.severity}
          onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select
          value={filter.resolved}
          onChange={(e) => setFilter({ ...filter, resolved: e.target.value })}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="unresolved">Unresolved</option>
          <option value="resolved">Resolved</option>
        </select>
        <button
          onClick={fetchEvents}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
          <FiDownload />
          Export Report
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <FiRefreshCw className="animate-spin h-8 w-8 text-blue-500" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                    {format(new Date(event.timestamp), "MMM dd, HH:mm:ss")}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityBadge severity={event.severity} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                    {event.event_type.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-md truncate">
                    {event.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{event.ip_address}</td>
                  <td className="px-4 py-3">
                    {event.resolved ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <FiCheckCircle className="h-3 w-3" />
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <FiAlertCircle className="h-3 w-3" />
                        Open
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabType = "system" | "activity" | "security";

export default function UnifiedLogsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("system");
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { isRefreshing, lastRefresh: globalLastRefresh } = useRefreshTrigger();

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "system", label: "System Logs", icon: <FiServer className="h-4 w-4" /> },
    { id: "activity", label: "Activity Logs", icon: <FiActivity className="h-4 w-4" /> },
    { id: "security", label: "Security Operations", icon: <FiShield className="h-4 w-4" /> },
  ];

  // Register this page's refresh handler with global context
  const handleRefreshAll = useCallback(() => {
    setLastRefresh(new Date());
  }, []);

  usePageRefresh("enterprise-admin-logs", handleRefreshAll);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <FiFileText className="h-7 w-7 text-blue-600" />
                Logs & Monitoring
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                System logs, activity tracking, and security operations in one place
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Last refresh: {format(globalLastRefresh || lastRefresh, "HH:mm:ss")}
              </span>
              {isRefreshing && (
                <FiRefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "system" && <SystemLogsTab key={lastRefresh.getTime()} />}
        {activeTab === "activity" && <ActivityLogsTab key={lastRefresh.getTime()} />}
        {activeTab === "security" && <SecurityOpsTab key={lastRefresh.getTime()} />}
      </div>
    </div>
  );
}
