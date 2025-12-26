'use client';

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BISMAN ERP - Professional Backup & Restore Dashboard
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * LIVE API INTEGRATION - No mock data
 * 
 * Features:
 * - Summary card with last backup status (green/yellow/red)
 * - Tabs: All Clients, This Org, Failed Backups
 * - Manual Backup (full/incremental/config only)
 * - Timeline view of recent backups with Git commit tags
 * - Restore options: full, partial, sandbox
 * - Git deployment logs integration
 * - Linked storage (AWS S3, SFTP, Azure)
 * - Schedule viewer for auto-backup settings
 * - Log table with user triggers and results
 * 
 * Brand Colors: #FEC925 (yellow), #16325C (navy blue), white, light gray
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
// Note: Layout is provided by /app/system/layout.tsx
import BackupRestoreIllustration from '@/components/illustrations/BackupRestoreIllustration';
import { 
  Database,
  Cloud,
  Server,
  HardDrive,
  Clock,
  Calendar,
  GitBranch,
  GitCommit,
  RefreshCw,
  Download,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronRight,
  Play,
  Pause,
  Archive,
  FileCode,
  History,
  Shield,
  Layers,
  Box,
  ExternalLink,
  Filter,
  Search,
  MoreVertical,
  Eye,
  RotateCcw,
  Trash2,
  User,
  Building2,
  AlertCircle,
  Zap,
  Link2,
  Loader2,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

type BackupStatus = 'success' | 'warning' | 'failed' | 'in_progress' | 'in-progress';
type BackupType = 'full' | 'incremental' | 'config' | 'database' | 'files';
type RestoreType = 'full' | 'partial' | 'sandbox';
type TabType = 'all' | 'this-org' | 'failed';

interface BackupRecord {
  id: string;
  timestamp: string;
  type: BackupType;
  triggerType: 'manual' | 'scheduled' | 'pre-deploy';
  status: BackupStatus;
  size: string;
  duration: string | null;
  gitCommit?: string | null;
  gitBranch?: string | null;
  triggeredBy: string;
  orgName?: string;
  orgId?: string | null;
  errorMessage?: string | null;
  storageLocation: string;
  retentionDays: number;
  description?: string;
  restores?: RestoreRecord[];
}

interface RestoreRecord {
  id: string;
  backupId: string;
  timestamp: string;
  status: string;
  targetEnv: string;
  restoreType: string;
  initiatedBy: string;
  completedAt: string | null;
  errorMessage: string | null;
}

interface StorageProvider {
  id: string;
  name: string;
  type: string;
  status: string;
  usedSpace: string;
  totalSpace: string;
  lastSync: string | null;
  path?: string;
  bucket?: string | null;
  container?: string | null;
  host?: string | null;
}

interface ScheduleConfig {
  id: string;
  name: string;
  type: string;
  frequency: string;
  nextRun: string;
  retentionDays: number;
  enabled: boolean;
  storageTargets: string[];
}

interface BackupStats {
  total: number;
  success: number;
  failed: number;
  warning: number;
  totalSize: string;
}

interface ActivityLog {
  id: string;
  type: string;
  action: string;
  backupType: string;
  timestamp: string;
  status: string;
  user: string;
  details: string;
  size?: string;
  duration?: string | null;
  errorMessage?: string | null;
  backupId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// API SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

const backupApi = {
  // Get all backups
  list: async (params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return fetchWithAuth(`/api/backup?${query.toString()}`);
  },

  // Get status summary
  getSummary: async () => {
    return fetchWithAuth('/api/backup/status/summary');
  },

  // Trigger manual backup
  trigger: async (type: string, description?: string) => {
    return fetchWithAuth('/api/backup/trigger', {
      method: 'POST',
      body: JSON.stringify({ type, description }),
    });
  },

  // Restore from backup
  restore: async (backupId: string, targetEnv: string, restoreType: string, confirmProduction?: boolean) => {
    return fetchWithAuth(`/api/backup/${backupId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ targetEnv, restoreType, confirmProduction }),
    });
  },

  // Get storage providers
  getStorageProviders: async () => {
    return fetchWithAuth('/api/backup/storage/providers');
  },

  // Get schedules
  getSchedules: async () => {
    return fetchWithAuth('/api/backup/schedules/list');
  },

  // Get activity log
  getActivityLog: async (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', params.limit.toString());
    if (params?.offset) query.set('offset', params.offset.toString());
    
    return fetchWithAuth(`/api/backup/activity-log?${query.toString()}`);
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

const formatDateTime = (isoString: string) => {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    relative: getRelativeTime(date),
  };
};

const getRelativeTime = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const normalizeStatus = (status: string): BackupStatus => {
  if (status === 'in_progress') return 'in-progress';
  return status as BackupStatus;
};

const getStatusColor = (status: BackupStatus | string) => {
  const normalized = normalizeStatus(status as BackupStatus);
  switch (normalized) {
    case 'success':
      return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500' };
    case 'warning':
      return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500' };
    case 'failed':
      return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
    case 'in-progress':
      return { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
    default:
      return { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', dot: 'bg-gray-500' };
  }
};

const getBackupTypeInfo = (type: BackupType | string) => {
  switch (type) {
    case 'full':
      return { label: 'Full Backup', icon: Database, color: 'text-[#16325C]' };
    case 'incremental':
      return { label: 'Incremental', icon: Layers, color: 'text-blue-600' };
    case 'config':
      return { label: 'Config Only', icon: Settings, color: 'text-purple-600' };
    case 'database':
      return { label: 'Database', icon: Server, color: 'text-indigo-600' };
    case 'files':
      return { label: 'Files Only', icon: Archive, color: 'text-teal-600' };
    default:
      return { label: type, icon: Box, color: 'text-gray-600' };
  }
};

const getStorageIcon = (type: string) => {
  switch (type) {
    case 'aws-s3':
      return Cloud;
    case 'azure':
      return Cloud;
    case 'sftp':
      return Server;
    case 'local':
      return HardDrive;
    default:
      return HardDrive;
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// Loading Skeleton
function LoadingSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
  );
}

// Error Alert
function ErrorAlert({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-red-800">Error loading data</p>
        <p className="text-sm text-red-600">{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-lg hover:bg-red-200"
        >
          Retry
        </button>
      )}
    </div>
  );
}

// Empty State
function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-12">
      <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
  );
}

// Status Summary Card
function StatusSummaryCard({ 
  lastBackup, 
  loading 
}: { 
  lastBackup: BackupRecord | null; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LoadingSkeleton className="h-4 w-32 mb-4" />
        <LoadingSkeleton className="h-8 w-24 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          <LoadingSkeleton className="h-12" />
          <LoadingSkeleton className="h-12" />
          <LoadingSkeleton className="h-12" />
        </div>
      </div>
    );
  }

  if (!lastBackup) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Last Backup Status</h3>
        <div className="text-center py-4">
          <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No backups found</p>
          <p className="text-xs text-gray-400">Run your first backup to get started</p>
        </div>
      </div>
    );
  }

  const statusColors = getStatusColor(lastBackup.status);
  const formatted = formatDateTime(lastBackup.timestamp);

  return (
    <div className={`relative overflow-hidden rounded-xl border-2 ${statusColors.border} bg-white p-6`}>
      <div className="absolute top-0 right-0 w-32 h-32 opacity-5">
        <Database className="w-full h-full text-[#16325C]" />
      </div>

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Last Backup Status</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-3 h-3 rounded-full ${statusColors.dot} animate-pulse`} />
              <span className={`text-lg font-bold ${statusColors.text} capitalize`}>
                {normalizeStatus(lastBackup.status).replace('-', ' ')}
              </span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${statusColors.bg}`}>
            {lastBackup.status === 'success' && <CheckCircle className={`w-8 h-8 ${statusColors.text}`} />}
            {lastBackup.status === 'warning' && <AlertTriangle className={`w-8 h-8 ${statusColors.text}`} />}
            {lastBackup.status === 'failed' && <XCircle className={`w-8 h-8 ${statusColors.text}`} />}
            {(lastBackup.status === 'in-progress' || lastBackup.status === 'in_progress') && (
              <RefreshCw className={`w-8 h-8 ${statusColors.text} animate-spin`} />
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 mb-1">Timestamp</p>
            <p className="text-sm font-semibold text-[#16325C]">{formatted.date}</p>
            <p className="text-xs text-gray-500">{formatted.time}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Size</p>
            <p className="text-sm font-semibold text-[#16325C]">{lastBackup.size || '—'}</p>
            <p className="text-xs text-gray-500">{lastBackup.duration || 'In progress'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Type</p>
            <p className="text-sm font-semibold text-[#16325C] capitalize">{lastBackup.type}</p>
            <p className="text-xs text-gray-500">{lastBackup.triggerType}</p>
          </div>
        </div>

        {lastBackup.gitCommit && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs">
              <GitCommit className="w-4 h-4 text-gray-400" />
              <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-[#16325C]">{lastBackup.gitCommit}</code>
              <span className="text-gray-400">on</span>
              <span className="text-[#16325C] font-medium">{lastBackup.gitBranch || 'main'}</span>
            </div>
          </div>
        )}

        {lastBackup.errorMessage && (
          <div className="mt-4 pt-4 border-t border-red-100">
            <div className="flex items-start gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{lastBackup.errorMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Manual Backup Button with Dropdown
function ManualBackupButton({ onBackupTriggered }: { onBackupTriggered: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBackup = async (type: BackupType) => {
    setIsBackingUp(true);
    setIsOpen(false);
    setError(null);
    
    try {
      await backupApi.trigger(type, `Manual ${type} backup triggered from dashboard`);
      onBackupTriggered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger backup');
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isBackingUp}
        className="flex items-center gap-2 px-5 py-2.5 bg-[#16325C] hover:bg-[#122548] text-white font-medium rounded-lg shadow-sm transition-all disabled:opacity-70"
      >
        {isBackingUp ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Backing Up...</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Manual Backup</span>
            <ChevronRight className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </>
        )}
      </button>

      {error && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-red-50 border border-red-200 rounded-lg p-3 z-50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {isOpen && !isBackingUp && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-50">
          <button
            onClick={() => handleBackup('full')}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <Database className="w-5 h-5 text-[#16325C]" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Full Backup</p>
              <p className="text-xs text-gray-500">Complete system snapshot</p>
            </div>
          </button>
          <button
            onClick={() => handleBackup('incremental')}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <Layers className="w-5 h-5 text-blue-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Incremental</p>
              <p className="text-xs text-gray-500">Changes since last backup</p>
            </div>
          </button>
          <button
            onClick={() => handleBackup('config')}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <Settings className="w-5 h-5 text-purple-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Config Only</p>
              <p className="text-xs text-gray-500">Settings & configurations</p>
            </div>
          </button>
          <div className="border-t border-gray-100 my-2" />
          <button
            onClick={() => handleBackup('database')}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <Server className="w-5 h-5 text-indigo-600" />
            <div className="text-left">
              <p className="text-sm font-medium text-gray-900">Database Only</p>
              <p className="text-xs text-gray-500">PostgreSQL dump</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// Restore Options Panel
function RestoreOptionsPanel({ 
  selectedBackup,
  onRestore 
}: { 
  selectedBackup: BackupRecord | null;
  onRestore: (backupId: string, targetEnv: string, restoreType: string) => Promise<void>;
}) {
  const [selectedRestore, setSelectedRestore] = useState<RestoreType | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const restoreOptions = [
    {
      type: 'full' as RestoreType,
      title: 'Full Restore',
      description: 'Restore entire system to a previous state',
      icon: RotateCcw,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      warning: 'This will overwrite all current data',
    },
    {
      type: 'partial' as RestoreType,
      title: 'Partial Restore',
      description: 'Restore specific modules or data',
      icon: Layers,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      warning: 'Select modules to restore',
    },
    {
      type: 'sandbox' as RestoreType,
      title: 'Sandbox Restore',
      description: 'Restore to isolated test environment',
      icon: Box,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      warning: 'Safe for testing - no production impact',
    },
  ];

  const handleRestore = async () => {
    if (!selectedBackup || !selectedRestore) return;
    
    setIsRestoring(true);
    setError(null);
    
    try {
      const targetEnv = selectedRestore === 'sandbox' ? 'sandbox' : 'production';
      await onRestore(selectedBackup.id, targetEnv, selectedRestore);
      setSelectedRestore(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#16325C]">Restore Options</h3>
          <p className="text-sm text-gray-500">
            {selectedBackup 
              ? `Selected: ${selectedBackup.type} backup from ${formatDateTime(selectedBackup.timestamp).relative}`
              : 'Select a backup from the list to restore'
            }
          </p>
        </div>
        <Shield className="w-6 h-6 text-gray-400" />
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {restoreOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedRestore === option.type;

          return (
            <button
              key={option.type}
              onClick={() => setSelectedRestore(isSelected ? null : option.type)}
              disabled={!selectedBackup || isRestoring}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                isSelected
                  ? `${option.borderColor} ${option.bgColor}`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              } ${!selectedBackup ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Icon className={`w-6 h-6 ${option.color} mb-3`} />
              <h4 className="font-semibold text-gray-900 mb-1">{option.title}</h4>
              <p className="text-xs text-gray-500 mb-2">{option.description}</p>
              <p className={`text-xs ${isSelected ? option.color : 'text-gray-400'}`}>
                {option.warning}
              </p>
            </button>
          );
        })}
      </div>

      {selectedRestore && selectedBackup && (
        <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={handleRestore}
            disabled={isRestoring}
            className="px-6 py-2.5 bg-[#16325C] text-white rounded-lg font-medium hover:bg-[#122548] disabled:opacity-70 flex items-center gap-2"
          >
            {isRestoring ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Restoring...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Start {selectedRestore.charAt(0).toUpperCase() + selectedRestore.slice(1)} Restore</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// Storage Providers Section
function StorageProvidersSection({ 
  providers, 
  loading 
}: { 
  providers: StorageProvider[]; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LoadingSkeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#16325C]">Storage Providers</h3>
          <p className="text-sm text-gray-500">Connected backup destinations</p>
        </div>
        <Link2 className="w-5 h-5 text-gray-400" />
      </div>

      {providers.length === 0 ? (
        <EmptyState 
          title="No storage providers" 
          description="Configure storage providers to enable backups" 
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {providers.map((provider) => {
            const Icon = getStorageIcon(provider.type);
            const isConnected = provider.status === 'connected';

            return (
              <div
                key={provider.id}
                className={`p-4 rounded-xl border ${
                  isConnected ? 'border-gray-200' : 'border-orange-200 bg-orange-50'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${isConnected ? 'bg-[#16325C]/10' : 'bg-orange-100'}`}>
                    <Icon className={`w-5 h-5 ${isConnected ? 'text-[#16325C]' : 'text-orange-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{provider.name}</p>
                    <p className={`text-xs ${isConnected ? 'text-green-600' : 'text-orange-600'}`}>
                      {provider.status === 'connected' ? 'Connected' : 
                       provider.status === 'not_configured' ? 'Not Configured' : 'Disconnected'}
                    </p>
                  </div>
                </div>

                {isConnected && (
                  <>
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>Storage</span>
                        <span>{provider.usedSpace} / {provider.totalSpace}</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#FEC925] rounded-full"
                          style={{ 
                            width: `${Math.min(
                              (parseFloat(provider.usedSpace) / parseFloat(provider.totalSpace)) * 100, 
                              100
                            )}%` 
                          }}
                        />
                      </div>
                    </div>
                    {provider.lastSync && (
                      <p className="text-xs text-gray-400">
                        Last sync: {formatDateTime(provider.lastSync).relative}
                      </p>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Schedule Viewer
function ScheduleViewer({ 
  schedules, 
  loading 
}: { 
  schedules: ScheduleConfig[]; 
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <LoadingSkeleton className="h-6 w-40 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <LoadingSkeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-[#16325C]">Backup Schedules</h3>
          <p className="text-sm text-gray-500">Automated backup configurations</p>
        </div>
        <Calendar className="w-5 h-5 text-gray-400" />
      </div>

      {schedules.length === 0 ? (
        <EmptyState 
          title="No schedules configured" 
          description="Set up automated backup schedules" 
        />
      ) : (
        <div className="space-y-3">
          {schedules.map((schedule) => {
            const typeInfo = getBackupTypeInfo(schedule.type);
            const TypeIcon = typeInfo.icon;

            return (
              <div
                key={schedule.id}
                className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl"
              >
                <div className={`p-2 rounded-lg bg-white`}>
                  <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{schedule.name}</p>
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      schedule.enabled 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {schedule.enabled ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{schedule.frequency}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Next run</p>
                  <p className="text-sm font-medium text-[#16325C]">
                    {formatDateTime(schedule.nextRun).relative}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Retention</p>
                  <p className="text-sm font-medium text-gray-700">{schedule.retentionDays}d</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Activity Log Table
function ActivityLogTable({ 
  activities, 
  loading,
  pagination,
  onPageChange 
}: { 
  activities: ActivityLog[];
  loading: boolean;
  pagination: { total: number; limit: number; offset: number; hasMore: boolean };
  onPageChange: (offset: number) => void;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="p-6">
          <LoadingSkeleton className="h-6 w-40 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <LoadingSkeleton key={i} className="h-12" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#16325C]">Activity Log</h3>
        <p className="text-sm text-gray-500">Recent backup and restore operations</p>
      </div>

      {activities.length === 0 ? (
        <div className="p-6">
          <EmptyState 
            title="No activity yet" 
            description="Backup and restore operations will appear here" 
          />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Operation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Timestamp
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {activities.map((activity) => {
                  const statusColors = getStatusColor(activity.status);
                  const formatted = formatDateTime(activity.timestamp);

                  return (
                    <tr key={activity.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {activity.type === 'backup' ? (
                            <Upload className="w-4 h-4 text-[#16325C]" />
                          ) : (
                            <Download className="w-4 h-4 text-purple-600" />
                          )}
                          <span className="text-sm font-medium text-gray-900">
                            {activity.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600 capitalize">
                          {activity.backupType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusColors.dot}`} />
                          {activity.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{activity.user}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-600">{activity.size || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm text-gray-900">{formatted.relative}</p>
                          <p className="text-xs text-gray-500">{formatted.date} {formatted.time}</p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing <span className="font-medium">{pagination.offset + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.offset + pagination.limit, pagination.total)}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(0, pagination.offset - pagination.limit))}
                disabled={pagination.offset === 0}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => onPageChange(pagination.offset + pagination.limit)}
                disabled={!pagination.hasMore}
                className="px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Backup List Table
function BackupListTable({
  backups,
  loading,
  selectedBackup,
  onSelectBackup,
}: {
  backups: BackupRecord[];
  loading: boolean;
  selectedBackup: BackupRecord | null;
  onSelectBackup: (backup: BackupRecord) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <LoadingSkeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  if (backups.length === 0) {
    return (
      <EmptyState 
        title="No backups found" 
        description="Run a backup to see it here" 
      />
    );
  }

  return (
    <div className="space-y-3">
      {backups.map((backup) => {
        const statusColors = getStatusColor(backup.status);
        const typeInfo = getBackupTypeInfo(backup.type);
        const TypeIcon = typeInfo.icon;
        const formatted = formatDateTime(backup.timestamp);
        const isSelected = selectedBackup?.id === backup.id;

        return (
          <div
            key={backup.id}
            onClick={() => onSelectBackup(backup)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              isSelected 
                ? 'border-[#FEC925] bg-[#FEC925]/5' 
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${statusColors.bg}`}>
                <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {backup.type} Backup
                  </span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${statusColors.bg} ${statusColors.text}`}>
                    {normalizeStatus(backup.status)}
                  </span>
                  {backup.triggerType === 'manual' && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                      Manual
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>{formatted.relative}</span>
                  <span>{backup.size}</span>
                  {backup.duration && <span>{backup.duration}</span>}
                  {backup.triggeredBy && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {backup.triggeredBy}
                    </span>
                  )}
                </div>
              </div>

              {backup.gitCommit && (
                <div className="flex items-center gap-2 text-xs">
                  <GitCommit className="w-4 h-4 text-gray-400" />
                  <code className="bg-gray-100 px-2 py-0.5 rounded font-mono text-gray-600">
                    {backup.gitCommit}
                  </code>
                </div>
              )}

              <ChevronRight className={`w-5 h-5 transition-colors ${
                isSelected ? 'text-[#FEC925]' : 'text-gray-400'
              }`} />
            </div>

            {backup.errorMessage && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex items-start gap-2 text-xs text-red-600">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{backup.errorMessage}</span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export default function BackupRestorePage() {
  // State
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [stats, setStats] = useState<BackupStats>({ total: 0, success: 0, failed: 0, warning: 0, totalSize: '0 B' });
  const [storageProviders, setStorageProviders] = useState<StorageProvider[]>([]);
  const [schedules, setSchedules] = useState<ScheduleConfig[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [activityPagination, setActivityPagination] = useState({ total: 0, limit: 20, offset: 0, hasMore: false });
  const [selectedBackup, setSelectedBackup] = useState<BackupRecord | null>(null);
  
  // Loading states
  const [loadingBackups, setLoadingBackups] = useState(true);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(true);
  const [loadingActivities, setLoadingActivities] = useState(true);
  
  // Error states
  const [error, setError] = useState<string | null>(null);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const response = await backupApi.list({ limit: 50 });
      if (response.success) {
        setBackups(response.data.backups);
        setStats(response.data.stats);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load backups');
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  // Fetch storage providers
  const fetchStorageProviders = useCallback(async () => {
    setLoadingProviders(true);
    try {
      const response = await backupApi.getStorageProviders();
      if (response.success) {
        setStorageProviders(response.data);
      }
    } catch (err) {
      console.error('Failed to load storage providers:', err);
    } finally {
      setLoadingProviders(false);
    }
  }, []);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoadingSchedules(true);
    try {
      const response = await backupApi.getSchedules();
      if (response.success) {
        setSchedules(response.data);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  // Fetch activity log
  const fetchActivities = useCallback(async (offset = 0) => {
    setLoadingActivities(true);
    try {
      const response = await backupApi.getActivityLog({ limit: 20, offset });
      if (response.success) {
        setActivities(response.data.activities);
        setActivityPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load activities:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchBackups();
    fetchStorageProviders();
    fetchSchedules();
    fetchActivities();
  }, [fetchBackups, fetchStorageProviders, fetchSchedules, fetchActivities]);

  // Handle restore
  const handleRestore = async (backupId: string, targetEnv: string, restoreType: string) => {
    const confirmProduction = targetEnv === 'production';
    await backupApi.restore(backupId, targetEnv, restoreType, confirmProduction);
    // Refresh data after restore
    fetchBackups();
    fetchActivities();
  };

  // Filter backups based on active tab
  const filteredBackups = backups.filter((backup) => {
    if (activeTab === 'failed') return backup.status === 'failed';
    if (activeTab === 'this-org') return backup.orgName === 'BISMAN Corp' || !backup.orgId;
    return true;
  });

  const lastBackup = backups.length > 0 ? backups[0] : null;

  return (
    <div className="w-full">
      <div className="w-full py-6 space-y-6">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#16325C] dark:text-[#FEC925]">Backup & Restore</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Manage system backups, restore points, and data recovery</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => {
                fetchBackups();
                fetchActivities();
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingBackups ? 'animate-spin' : ''}`} />
              Refresh
            </button>
              <ManualBackupButton onBackupTriggered={() => {
                fetchBackups();
                fetchActivities();
              }} />
            </div>
          </div>

          {/* Error Alert */}
          {error && (
            <ErrorAlert 
              message={error} 
              onRetry={() => {
                setError(null);
                fetchBackups();
              }} 
            />
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatusSummaryCard lastBackup={lastBackup} loading={loadingBackups} />
            
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Backups</p>
                  <p className="text-3xl font-bold text-[#16325C] mt-1">
                    {loadingBackups ? '—' : stats.total}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#16325C]/10">
                  <Database className="w-6 h-6 text-[#16325C]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">All time</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Success Rate</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">
                    {loadingBackups || stats.total === 0 
                      ? '—' 
                      : `${Math.round((stats.success / stats.total) * 100)}%`
                    }
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">{stats.failed} failed backups</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Storage Used</p>
                  <p className="text-3xl font-bold text-[#FEC925] mt-1">
                    {loadingBackups ? '—' : stats.totalSize}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[#FEC925]/20">
                  <HardDrive className="w-6 h-6 text-[#FEC925]" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3">Across all providers</p>
            </div>
          </div>

          {/* Workflow Illustration */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-hidden">
            <BackupRestoreIllustration className="max-w-4xl mx-auto" showTitle={true} />
          </div>

          {/* Tabs & Backup List */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="border-b border-gray-200">
              <div className="flex items-center gap-1 p-1">
                {[
                  { key: 'all' as TabType, label: 'All Backups', count: backups.length },
                  { key: 'this-org' as TabType, label: 'This Org', count: backups.filter(b => b.orgName === 'BISMAN Corp' || !b.orgId).length },
                  { key: 'failed' as TabType, label: 'Failed', count: stats.failed },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      activeTab === tab.key
                        ? 'bg-[#16325C] text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTab === tab.key
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-6">
              <BackupListTable
                backups={filteredBackups}
                loading={loadingBackups}
                selectedBackup={selectedBackup}
                onSelectBackup={setSelectedBackup}
              />
            </div>
          </div>

          {/* Restore Options */}
          <RestoreOptionsPanel 
            selectedBackup={selectedBackup} 
            onRestore={handleRestore}
          />

          {/* Storage & Schedules Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StorageProvidersSection 
              providers={storageProviders} 
              loading={loadingProviders} 
            />
            <ScheduleViewer 
              schedules={schedules} 
              loading={loadingSchedules} 
            />
          </div>

          {/* Activity Log */}
          <ActivityLogTable
            activities={activities}
            loading={loadingActivities}
          pagination={activityPagination}
          onPageChange={(offset) => fetchActivities(offset)}
        />

      </div>
    </div>
  );
}
