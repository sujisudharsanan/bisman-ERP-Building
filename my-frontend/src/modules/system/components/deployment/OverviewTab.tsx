/**
 * Deployment Center - Overview Tab
 * Shows current deployment status, actions, and health check
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeploymentStatus, HealthCheckResult, Environment } from '@/types/deployment';
import {
  getDeploymentStatus,
  runHealthCheck,
  triggerDeployment,
  runBackup,
} from '@/services/deploymentService';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
} from '@/lib/ssr-safe-icons';

interface OverviewTabProps {
  tenantId: string;
  onDeploySuccess?: () => void;
}

// Status badge component
function StatusBadge({ status, size = 'md' }: { status: string | null; size?: 'sm' | 'md' }) {
  const getStatusConfig = (s: string | null) => {
    switch (s) {
      case 'success':
      case 'ok':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-300 dark:border-green-700', icon: CheckCircle };
      case 'warning':
        return { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-300 dark:border-yellow-700', icon: AlertCircle };
      case 'failed':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-300 dark:border-red-700', icon: XCircle };
      case 'in_progress':
      case 'pending':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', icon: Clock };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClass} font-medium rounded-full border ${config.bg} ${config.text} ${config.border}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {status ? status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
    </span>
  );
}

// Health service row
function HealthServiceRow({ name, health }: { name: string; health: { status: string; latency?: number; message?: string } }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">{name}</span>
      <div className="flex items-center gap-3">
        {health.latency !== undefined && (
          <span className="text-xs text-gray-500 dark:text-gray-400">{health.latency}ms</span>
        )}
        <StatusBadge status={health.status} size="sm" />
      </div>
    </div>
  );
}

// Deploy confirmation dialog
function DeployDialog({
  isOpen,
  onClose,
  onConfirm,
  environments,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (env: Environment, requireBackup: boolean) => void;
  environments: Environment[];
  loading: boolean;
}) {
  const [selectedEnv, setSelectedEnv] = useState<Environment>(environments[0] || 'staging');
  const [requireBackup, setRequireBackup] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Deploy Latest Build
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Environment
            </label>
            <select
              value={selectedEnv}
              onChange={(e) => setSelectedEnv(e.target.value as Environment)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              disabled={loading}
            >
              {environments.map((env) => (
                <option key={env} value={env}>
                  {env.charAt(0).toUpperCase() + env.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={requireBackup}
              onChange={(e) => setRequireBackup(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Require backup before deploy
            </span>
          </label>
          {selectedEnv === 'production' && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                ⚠️ You are about to deploy to <strong>Production</strong>. Please ensure all tests have passed.
              </p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(selectedEnv, requireBackup)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Deploying...' : 'Deploy Now'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OverviewTab({ tenantId, onDeploySuccess }: OverviewTabProps) {
  const [status, setStatus] = useState<DeploymentStatus | null>(null);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [deployLoading, setDeployLoading] = useState(false);
  const [showDeployDialog, setShowDeployDialog] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeploymentStatus(tenantId);
      setStatus(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load deployment status');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleHealthCheck = async () => {
    try {
      setHealthLoading(true);
      const result = await runHealthCheck(tenantId);
      setHealthResult(result);
      showToast('success', 'Health check completed');
    } catch (err: any) {
      showToast('error', err?.message || 'Health check failed');
    } finally {
      setHealthLoading(false);
    }
  };

  const handleBackup = async () => {
    try {
      setBackupLoading(true);
      const result = await runBackup(tenantId);
      if (result.status === 'success') {
        showToast('success', `Backup completed: ${result.backupId}`);
      } else {
        showToast('error', result.message || 'Backup failed');
      }
    } catch (err: any) {
      showToast('error', err?.message || 'Backup failed');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleDeploy = async (env: Environment, requireBackup: boolean) => {
    try {
      setDeployLoading(true);
      if (requireBackup) {
        await runBackup(tenantId);
      }
      const result = await triggerDeployment({
        tenantId,
        environment: env,
        requireBackup,
      });
      showToast('success', result.message || 'Deployment started successfully');
      setShowDeployDialog(false);
      onDeploySuccess?.();
      await fetchStatus();
    } catch (err: any) {
      showToast('error', err?.message || 'Deployment failed');
    } finally {
      setDeployLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load Status</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchStatus}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📦</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Deployment Data</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          No deployment information available for this tenant yet.
        </p>
        <button
          onClick={() => setShowDeployDialog(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Deploy First Build
        </button>
      </div>
    );
  }

  const environments: Environment[] = ['staging', 'production', 'development', 'uat'];

  return (
    <div className="space-y-6">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/50 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Version</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {status.currentVersion || '—'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Environment</div>
          <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 capitalize">
            {status.environment || '—'}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Last Deployment</div>
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {formatDate(status.lastDeploymentTime)}
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Deployment Status</div>
          <StatusBadge status={status.lastDeploymentStatus} />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">Health Status</div>
          <StatusBadge status={status.healthStatus} />
        </div>
      </div>

      {/* Actions Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowDeployDialog(true)}
            disabled={deployLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {deployLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            Deploy Latest Build
          </button>
          <button
            onClick={handleBackup}
            disabled={backupLoading}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
          >
            {backupLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {backupLoading ? 'Running Backup...' : 'Run Backup Before Deploy'}
          </button>
          <button
            onClick={handleHealthCheck}
            disabled={healthLoading}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
          >
            {healthLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {healthLoading ? 'Checking...' : 'Run Health Check'}
          </button>
          <button
            onClick={fetchStatus}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Status
          </button>
        </div>
      </div>

      {/* Health Check Results */}
      {healthResult && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Health Check Summary</h3>
            <StatusBadge status={healthResult.overall} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Last checked: {formatDate(healthResult.timestamp)}
          </div>
          <div className="space-y-1">
            <HealthServiceRow name="API" health={healthResult.services.api} />
            <HealthServiceRow name="Database" health={healthResult.services.database} />
            <HealthServiceRow name="Cache" health={healthResult.services.cache} />
            <HealthServiceRow name="Queue" health={healthResult.services.queue} />
          </div>
        </div>
      )}

      {/* Deploy Dialog */}
      <DeployDialog
        isOpen={showDeployDialog}
        onClose={() => setShowDeployDialog(false)}
        onConfirm={handleDeploy}
        environments={environments}
        loading={deployLoading}
      />
    </div>
  );
}
