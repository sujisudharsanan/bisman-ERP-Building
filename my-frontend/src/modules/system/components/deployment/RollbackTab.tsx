/**
 * Deployment Center - Rollback Tab
 * Shows rollback candidates with confirmation dialogs
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeploymentHistory, DeploymentHistoryPage } from '@/types/deployment';
import { getDeploymentHistory, rollbackDeployment } from '@/services/deploymentService';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from '@/lib/ssr-safe-icons';

interface RollbackTabProps {
  tenantId: string;
  onRollbackSuccess?: () => void;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'success':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle };
      case 'failed':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// Rollback confirmation dialog
function RollbackDialog({
  isOpen,
  onClose,
  onConfirm,
  deployment,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  deployment: DeploymentHistory | null;
  loading: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setAcknowledged(false);
      setReason('');
    }
  }, [isOpen]);

  if (!isOpen || !deployment) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
            <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Confirm Rollback
          </h3>
        </div>

        <div className="space-y-4">
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

          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Warning:</strong> Rolling back to a previous version may cause:
            </p>
            <ul className="list-disc list-inside text-sm text-red-600 dark:text-red-400 mt-2 space-y-1">
              <li>Temporary service disruption</li>
              <li>Loss of data created after this deployment</li>
              <li>Feature incompatibilities with newer clients</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Reason for rollback (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Critical bug in production affecting payments"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
              disabled={loading}
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 text-red-600 rounded focus:ring-red-500"
              disabled={loading}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              I understand this may cause downtime and have notified relevant stakeholders.
            </span>
          </label>
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
            onClick={() => onConfirm(reason)}
            disabled={!acknowledged || loading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
            {loading ? 'Rolling Back...' : 'Confirm Rollback'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RollbackTab({ tenantId, onRollbackSuccess }: RollbackTabProps) {
  const [candidates, setCandidates] = useState<DeploymentHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeployment, setSelectedDeployment] = useState<DeploymentHistory | null>(null);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeploymentHistory(tenantId, 1);
      // Filter for successful deployments only (rollback candidates)
      const successfulDeployments = data.items.filter((d: DeploymentHistory) => d.status === 'success');
      // Exclude the most recent deployment (current version)
      setCandidates(successfulDeployments.slice(1));
    } catch (err: any) {
      setError(err?.message || 'Failed to load rollback candidates');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  const handleRollback = async (reason: string) => {
    if (!selectedDeployment) return;

    try {
      setRollbackLoading(true);
      const result = await rollbackDeployment({
        tenantId,
        deploymentId: selectedDeployment.id,
        reason: reason || undefined,
      });
      showToast('success', result.message || 'Rollback initiated successfully');
      setSelectedDeployment(null);
      onRollbackSuccess?.();
      await fetchCandidates();
    } catch (err: any) {
      showToast('error', err?.message || 'Rollback failed');
    } finally {
      setRollbackLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load Rollback Candidates</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchCandidates}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⏪</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Rollback Candidates</h3>
        <p className="text-gray-600 dark:text-gray-400">
          No previous successful deployments available for rollback.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
          You need at least two successful deployments to perform a rollback.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm ${
          toast.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/50 border border-green-300 text-green-700 dark:text-green-300'
            : 'bg-red-50 dark:bg-red-900/50 border border-red-300 text-red-700 dark:text-red-300'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Info banner */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">Rollback to Previous Version</h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Select a previous successful deployment to rollback to. The current deployment will be replaced.
            </p>
          </div>
        </div>
      </div>

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={fetchCandidates}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Candidates Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version / Build ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Deployed At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Environment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Backup Available
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {candidates.map((deployment) => (
              <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{deployment.version}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{deployment.buildId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {formatDate(deployment.deployedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {deployment.environment}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={deployment.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {deployment.backupTaken ? (
                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => setSelectedDeployment(deployment)}
                    className="px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 flex items-center gap-1 ml-auto"
                  >
                    Rollback
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Rollback Dialog */}
      <RollbackDialog
        isOpen={!!selectedDeployment}
        onClose={() => setSelectedDeployment(null)}
        onConfirm={handleRollback}
        deployment={selectedDeployment}
        loading={rollbackLoading}
      />
    </div>
  );
}
