/**
 * Backups & Restore Tab
 * Manage backups and initiate restore operations with safety controls
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  Database,
  HardDrive,
  Download,
  X,
  Filter,
  ChevronDown,
  ExternalLink,
} from '@/lib/ssr-safe-icons';
import {
  getBackups,
  getBackupById,
  restoreBackup,
} from '@/services/fallbackService';
import type { Backup, BackupType, BackupStatus, Environment, RestoreResponse } from '@/types/fallback';

// Format date helper
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Format file size
function formatSize(bytes?: number): string {
  if (!bytes) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

// Backup type badge
function BackupTypeBadge({ type }: { type: BackupType }) {
  const config = {
    full: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
    incremental: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
    database: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
    files: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
    config: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
  }[type];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
    </span>
  );
}

// Backup status badge
function BackupStatusBadge({ status }: { status: BackupStatus }) {
  const config = {
    available: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: RefreshCw },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
    expired: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Clock },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className={`w-3 h-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
      {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
    </span>
  );
}

// Backup details panel
function BackupDetailsPanel({
  backup,
  onClose,
  loading,
}: {
  backup: Backup | null;
  onClose: () => void;
  loading: boolean;
}) {
  if (!backup && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Backup Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : backup ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <BackupTypeBadge type={backup.type} />
                <BackupStatusBadge status={backup.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Backup ID</span>
                  <p className="font-mono text-gray-900 dark:text-gray-100">{backup.id}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Created At</span>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(backup.createdAt)}</p>
                </div>
                {backup.createdBy && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Created By</span>
                    <p className="text-gray-900 dark:text-gray-100">{backup.createdBy}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Environment</span>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{backup.environment}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Size</span>
                  <p className="text-gray-900 dark:text-gray-100">{backup.sizeFormatted || formatSize(backup.size)}</p>
                </div>
                {backup.tenantName && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Tenant</span>
                    <p className="text-gray-900 dark:text-gray-100">{backup.tenantName}</p>
                  </div>
                )}
                {backup.storageLocation && (
                  <div className="col-span-2">
                    <span className="text-gray-500 dark:text-gray-400">Storage Location</span>
                    <p className="font-mono text-gray-900 dark:text-gray-100 text-xs break-all">{backup.storageLocation}</p>
                  </div>
                )}
                {backup.expiresAt && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Expires At</span>
                    <p className="text-gray-900 dark:text-gray-100">{formatDate(backup.expiresAt)}</p>
                  </div>
                )}
              </div>

              {/* Integrity Status */}
              {backup.integrityChecked !== undefined && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Integrity Check
                  </h4>
                  <div className="flex items-center gap-2">
                    {backup.integrityStatus === 'valid' ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-green-700 dark:text-green-300">Verified and valid</span>
                      </>
                    ) : backup.integrityStatus === 'invalid' ? (
                      <>
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <span className="text-red-700 dark:text-red-300">Integrity check failed</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-5 h-5 text-gray-500" />
                        <span className="text-gray-600 dark:text-gray-400">Not yet verified</span>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Linked Resources */}
              {(backup.linkedDeploymentId || backup.linkedIncidentId) && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Linked Resources
                  </h4>
                  {backup.linkedDeploymentId && (
                    <a
                      href={`/super-admin/deployment?id=${backup.linkedDeploymentId}`}
                      className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Deployment: {backup.linkedDeploymentId.slice(0, 8)}...
                    </a>
                  )}
                  {backup.linkedIncidentId && (
                    <p className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <AlertTriangle className="w-4 h-4" />
                      Incident: {backup.linkedIncidentId.slice(0, 8)}...
                    </p>
                  )}
                </div>
              )}

              {/* Notes */}
              {backup.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {backup.notes}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No backup data available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Restore confirmation modal
function RestoreModal({
  isOpen,
  onClose,
  onConfirm,
  backup,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: { targetEnvironment: Environment; restartServices: boolean }) => void;
  backup: Backup | null;
  loading: boolean;
}) {
  const [targetEnvironment, setTargetEnvironment] = useState<Environment>('staging');
  const [restartServices, setRestartServices] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen && backup) {
      setTargetEnvironment(backup.environment);
      setRestartServices(false);
      setAcknowledged(false);
    }
  }, [isOpen, backup]);

  if (!isOpen || !backup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Restore from Backup
          </h3>
        </div>

        <div className="space-y-4">
          {/* Backup info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <BackupTypeBadge type={backup.type} />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(backup.createdAt)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Size: {backup.sizeFormatted || formatSize(backup.size)}
            </p>
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
              Warning: This is a destructive operation.
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
              <li>Current data will be overwritten</li>
              <li>Active sessions may be terminated</li>
              <li>Changes made after this backup will be lost</li>
            </ul>
          </div>

          {/* Target environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Environment
            </label>
            <select
              value={targetEnvironment}
              onChange={(e) => setTargetEnvironment(e.target.value as Environment)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={loading}
            >
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="uat">UAT</option>
              <option value="development">Development</option>
            </select>
          </div>

          {/* Restart services option */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={restartServices}
              onChange={(e) => setRestartServices(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Restart services after restore
            </span>
          </label>

          {/* Acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 rounded focus:ring-red-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand this will overwrite current data and may cause downtime.
            </span>
          </label>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm({ targetEnvironment, restartServices })}
              disabled={!acknowledged || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? 'Restoring...' : 'Start Restore'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast component
function Toast({ 
  type, 
  message, 
  onClose 
}: { 
  type: 'success' | 'error'; 
  message: string; 
  onClose: () => void 
}) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`
      fixed bottom-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
      ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}
    `}>
      {type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">×</button>
    </div>
  );
}

export default function BackupsRestoreTab() {
  // State
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [environmentFilter, setEnvironmentFilter] = useState<Environment | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BackupType | 'all'>('all');

  // Details panel state
  const [selectedBackupId, setSelectedBackupId] = useState<string | null>(null);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Restore modal state
  const [restoreBackupData, setRestoreBackupData] = useState<Backup | null>(null);
  const [restoreLoading, setRestoreLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch backups
  const fetchBackups = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { environment?: Environment; type?: string } = {};
      if (environmentFilter !== 'all') params.environment = environmentFilter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const response = await getBackups(params);
      setBackups(response.backups || []);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
      setError('Failed to load backups. Please try again.');
      setBackups([]);
    } finally {
      setLoading(false);
    }
  }, [environmentFilter, typeFilter]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  // View backup details
  const handleViewDetails = async (backupId: string) => {
    setSelectedBackupId(backupId);
    setDetailsLoading(true);
    try {
      const backup = await getBackupById(backupId);
      setSelectedBackup(backup);
    } catch (err) {
      console.error('Failed to fetch backup details:', err);
      const found = backups.find(b => b.id === backupId);
      setSelectedBackup(found || null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedBackupId(null);
    setSelectedBackup(null);
  };

  // Restore handlers
  const handleRestoreClick = (backup: Backup) => {
    setRestoreBackupData(backup);
  };

  const handleRestoreConfirm = async (options: { targetEnvironment: Environment; restartServices: boolean }) => {
    if (!restoreBackupData) return;

    setRestoreLoading(true);
    try {
      const result = await restoreBackup({
        backupId: restoreBackupData.id,
        targetEnvironment: options.targetEnvironment,
        restartServicesAfter: options.restartServices,
      });

      if (result.success) {
        setToast({ 
          type: 'success', 
          message: result.message || `Restore initiated. Job ID: ${result.restoreJobId}` 
        });
        setRestoreBackupData(null);
      } else {
        setToast({ type: 'error', message: result.message || 'Restore failed' });
      }
    } catch (err: any) {
      console.error('Restore failed:', err);
      setToast({ type: 'error', message: err?.message || 'Failed to initiate restore' });
    } finally {
      setRestoreLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Failed to Load Backups
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchBackups}
          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Environment:</label>
            <select
              value={environmentFilter}
              onChange={(e) => setEnvironmentFilter(e.target.value as Environment | 'all')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="uat">UAT</option>
              <option value="development">Development</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Type:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as BackupType | 'all')}
              className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="all">All Types</option>
              <option value="full">Full</option>
              <option value="incremental">Incremental</option>
              <option value="database">Database</option>
              <option value="files">Files</option>
              <option value="config">Config</option>
            </select>
          </div>

          <button
            onClick={fetchBackups}
            className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Backups Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Backups Available for Restore
          </h3>
        </div>

        {backups.length === 0 ? (
          <div className="p-12 text-center">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Backups Available
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              No backups are available for the selected filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {backups.map((backup) => (
                  <tr key={backup.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(backup.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BackupTypeBadge type={backup.type} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {backup.environment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                      {backup.sizeFormatted || formatSize(backup.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <BackupStatusBadge status={backup.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRestoreClick(backup)}
                          disabled={backup.status !== 'available'}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() => handleViewDetails(backup.id)}
                          className="px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                        >
                          Details
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

      {/* Details Panel */}
      {selectedBackupId && (
        <BackupDetailsPanel
          backup={selectedBackup}
          onClose={handleCloseDetails}
          loading={detailsLoading}
        />
      )}

      {/* Restore Modal */}
      <RestoreModal
        isOpen={!!restoreBackupData}
        onClose={() => setRestoreBackupData(null)}
        onConfirm={handleRestoreConfirm}
        backup={restoreBackupData}
        loading={restoreLoading}
      />

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
