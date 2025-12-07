/**
 * Recovery Actions Tab
 * Main place to run safe recovery flows including rollback and technical recovery tools
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
  ArrowLeft,
  Trash2,
  Zap,
  ChevronRight,
  Play,
} from '@/lib/ssr-safe-icons';
import {
  getLastSuccessfulDeployment,
  getFailedDeployments,
  rollbackDeployment,
  clearCache,
  restartServices,
} from '@/services/fallbackService';
import type { DeploymentSummary, RollbackResponse, OperationResult } from '@/types/fallback';

interface RecoveryActionsTabProps {
  onNavigateToDiagnostics: () => void;
}

// Format date helper
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Status badge for deployments
function DeploymentStatusBadge({ status }: { status: string }) {
  const config = {
    success: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
    in_progress: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: RefreshCw },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
    cancelled: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: AlertTriangle },
  }[status] || { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Clock };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// Rollback confirmation modal
function RollbackModal({
  isOpen,
  onClose,
  onConfirm,
  deployment,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  deployment: DeploymentSummary | null;
  loading: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !deployment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Confirm Rollback
          </h3>
        </div>

        <div className="space-y-4">
          {/* Deployment info */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Version</span>
                <div className="font-medium text-gray-900 dark:text-gray-100">{deployment.version}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Build ID</span>
                <div className="font-mono text-gray-900 dark:text-gray-100">{deployment.buildId}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Deployed At</span>
                <div className="text-gray-900 dark:text-gray-100">{formatDate(deployment.deployedAt)}</div>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Environment</span>
                <div className="capitalize text-gray-900 dark:text-gray-100">{deployment.environment}</div>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
              Warning: This action may temporarily impact live users.
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 space-y-1">
              <li>Services may restart briefly</li>
              <li>Active sessions may be interrupted</li>
              <li>Recent changes after this deployment may be lost</li>
            </ul>
          </div>

          {/* Reason input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for rollback (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Critical bug affecting user authentication"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              disabled={loading}
            />
          </div>

          {/* Acknowledgment */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand this may briefly impact live users and I have verified this is necessary.
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
              onClick={() => onConfirm(reason)}
              disabled={!acknowledged || loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {loading ? 'Rolling Back...' : 'Confirm Rollback'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Toast notification component
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
      ${type === 'success' 
        ? 'bg-green-600 text-white' 
        : 'bg-red-600 text-white'
      }
    `}>
      {type === 'success' ? (
        <CheckCircle className="w-5 h-5" />
      ) : (
        <AlertCircle className="w-5 h-5" />
      )}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-80">
        ×
      </button>
    </div>
  );
}

export default function RecoveryActionsTab({ onNavigateToDiagnostics }: RecoveryActionsTabProps) {
  // State
  const [lastSuccessful, setLastSuccessful] = useState<DeploymentSummary | null>(null);
  const [failedDeployments, setFailedDeployments] = useState<DeploymentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [rollbackModalOpen, setRollbackModalOpen] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);

  // Tool operation states
  const [clearCacheLoading, setClearCacheLoading] = useState(false);
  const [restartLoading, setRestartLoading] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [successfulDep, failedDeps] = await Promise.all([
        getLastSuccessfulDeployment(),
        getFailedDeployments(),
      ]);
      setLastSuccessful(successfulDep);
      setFailedDeployments(failedDeps);
    } catch (err) {
      console.error('Failed to fetch deployment data:', err);
      setError('Failed to load deployment data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Show toast helper
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
  };

  // Rollback handler
  const handleRollback = async (reason: string) => {
    if (!lastSuccessful) return;

    setRollbackLoading(true);
    try {
      const result = await rollbackDeployment({
        deploymentId: lastSuccessful.id,
        reason: reason || undefined,
      });
      
      if (result.success) {
        showToast('success', result.message || 'Rollback initiated successfully');
        setRollbackModalOpen(false);
        // Refresh data
        await fetchData();
      } else {
        showToast('error', result.message || 'Rollback failed');
      }
    } catch (err: any) {
      console.error('Rollback failed:', err);
      showToast('error', err?.message || 'Failed to initiate rollback');
    } finally {
      setRollbackLoading(false);
    }
  };

  // Clear cache handler
  const handleClearCache = async () => {
    setClearCacheLoading(true);
    try {
      const result = await clearCache();
      if (result.success) {
        showToast('success', result.message || 'Cache cleared successfully');
      } else {
        showToast('error', result.message || 'Failed to clear cache');
      }
    } catch (err: any) {
      console.error('Clear cache failed:', err);
      showToast('error', err?.message || 'Failed to clear cache');
    } finally {
      setClearCacheLoading(false);
    }
  };

  // Restart services handler
  const handleRestartServices = async () => {
    setRestartLoading(true);
    try {
      const result = await restartServices();
      if (result.success) {
        showToast('success', result.message || 'Services restarted successfully');
      } else {
        showToast('error', result.message || 'Failed to restart services');
      }
    } catch (err: any) {
      console.error('Restart services failed:', err);
      showToast('error', err?.message || 'Failed to restart services');
    } finally {
      setRestartLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">
          Failed to Load Recovery Data
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchData}
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
      {/* Section A: Suggested Recovery Path */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Recommended Recovery Steps
        </h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Step 1 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                1
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Review Failed Deployment</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Check what went wrong with the last failed deployment.
            </p>
            <button
              onClick={() => {
                const firstFailed = failedDeployments[0];
                if (firstFailed) {
                  // Could open a details modal here
                  showToast('success', `Viewing deployment ${firstFailed.id}`);
                } else {
                  showToast('error', 'No failed deployments to review');
                }
              }}
              disabled={failedDeployments.length === 0}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Open Failed Deployment
            </button>
          </div>

          {/* Step 2 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                2
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Rollback to Stable</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Revert to the last known stable version.
            </p>
            <button
              onClick={() => setRollbackModalOpen(true)}
              disabled={!lastSuccessful}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Rollback Now
            </button>
          </div>

          {/* Step 3 */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-sm">
                3
              </div>
              <h4 className="font-medium text-gray-900 dark:text-gray-100">Run Health Check</h4>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Verify system health after recovery.
            </p>
            <button
              onClick={onNavigateToDiagnostics}
              className="w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
            >
              Run Health Check
            </button>
          </div>
        </div>
      </div>

      {/* Section B: Rollback to Last Stable Build */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Rollback to Last Stable Build
        </h3>
        
        {lastSuccessful ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <DeploymentStatusBadge status={lastSuccessful.status} />
                <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {lastSuccessful.environment}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Version</span>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{lastSuccessful.version}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Build ID</span>
                  <p className="font-mono text-gray-900 dark:text-gray-100">{lastSuccessful.buildId}</p>
                </div>
                <div>
                  <span className="text-gray-500 dark:text-gray-400">Deployed At</span>
                  <p className="text-gray-900 dark:text-gray-100">{formatDate(lastSuccessful.deployedAt)}</p>
                </div>
                {lastSuccessful.initiatedBy && (
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Deployed By</span>
                    <p className="text-gray-900 dark:text-gray-100">{lastSuccessful.initiatedBy}</p>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setRollbackModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Rollback to This Version
            </button>
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Stable Deployment Found
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              There is no previous successful deployment available for rollback.
            </p>
          </div>
        )}
      </div>

      {/* Section C: Technical Recovery Tools */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Technical Recovery Tools
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Use these tools to perform quick fixes without a full rollback.
        </p>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearCache}
            disabled={clearCacheLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium"
          >
            {clearCacheLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            {clearCacheLoading ? 'Clearing...' : 'Clear Application Cache'}
          </button>

          <button
            onClick={handleRestartServices}
            disabled={restartLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors font-medium"
          >
            {restartLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {restartLoading ? 'Restarting...' : 'Restart Application Services'}
          </button>
        </div>
      </div>

      {/* Failed Deployments List */}
      {failedDeployments.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Recent Failed Deployments
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Deployed At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Version
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Build ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {failedDeployments.map((deployment) => (
                  <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(deployment.deployedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {deployment.version}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600 dark:text-gray-400">
                      {deployment.buildId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {deployment.environment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <DeploymentStatusBadge status={deployment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      <RollbackModal
        isOpen={rollbackModalOpen}
        onClose={() => setRollbackModalOpen(false)}
        onConfirm={handleRollback}
        deployment={lastSuccessful}
        loading={rollbackLoading}
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
