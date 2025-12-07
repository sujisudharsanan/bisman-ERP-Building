/**
 * Deployment Center - Pipelines Tab
 * Shows deployment pipelines with run/view actions
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeploymentPipeline, DeploymentHistory, Environment } from '@/types/deployment';
import { getDeploymentPipelines, triggerDeployment, getDeploymentHistory } from '@/services/deploymentService';
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
  XCircle,
  Clock,
  Eye,
} from '@/lib/ssr-safe-icons';

interface PipelinesTabProps {
  tenantId: string;
}

// Status badge component
function StatusBadge({ status, size = 'sm' }: { status: string | null; size?: 'sm' | 'md' }) {
  const getStatusConfig = (s: string | null) => {
    switch (s) {
      case 'success':
        return { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle };
      case 'failed':
        return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: XCircle };
      case 'in_progress':
      case 'pending':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Clock };
      default:
        return { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300', icon: Clock };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center gap-1 ${sizeClass} font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {status ? status.replace('_', ' ').toUpperCase() : '—'}
    </span>
  );
}

// Pipeline detail side panel
function PipelineDetailPanel({
  isOpen,
  onClose,
  pipelineId,
  tenantId,
}: {
  isOpen: boolean;
  onClose: () => void;
  pipelineId: string | null;
  tenantId: string;
}) {
  const [history, setHistory] = useState<DeploymentHistory[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && pipelineId) {
      setLoading(true);
      getDeploymentHistory(tenantId, 1)
        .then((res) => {
          // Filter history for this pipeline (if backend supports it)
          setHistory(res.items.slice(0, 5));
        })
        .catch(() => setHistory([]))
        .finally(() => setLoading(false));
    }
  }, [isOpen, pipelineId, tenantId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30">
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl h-full overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pipeline Run History</h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📋</div>
              <p className="text-gray-600 dark:text-gray-400">No run history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((run) => (
                <div
                  key={run.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{run.version}</span>
                    <StatusBadge status={run.status} />
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(run.deployedAt).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    By: {run.initiatedBy}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelinesTab({ tenantId }: PipelinesTabProps) {
  const [pipelines, setPipelines] = useState<DeploymentPipeline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningPipeline, setRunningPipeline] = useState<string | null>(null);
  const [selectedPipeline, setSelectedPipeline] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPipelines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeploymentPipelines(tenantId);
      setPipelines(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load pipelines');
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const handleRunPipeline = async (pipeline: DeploymentPipeline) => {
    try {
      setRunningPipeline(pipeline.id);
      await triggerDeployment({
        tenantId,
        environment: pipeline.environment,
        pipelineId: pipeline.id,
        branch: pipeline.branch,
      });
      showToast('success', `Pipeline "${pipeline.name}" started successfully`);
      await fetchPipelines();
    } catch (err: any) {
      showToast('error', err?.message || 'Failed to run pipeline');
    } finally {
      setRunningPipeline(null);
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load Pipelines</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchPipelines}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (pipelines.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">⚙️</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Deployment Pipelines</h3>
        <p className="text-gray-600 dark:text-gray-400">
          No deployment pipelines are configured yet. Configure pipelines in your CI/CD settings.
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

      {/* Refresh button */}
      <div className="flex justify-end">
        <button
          onClick={fetchPipelines}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Pipelines Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Branch/Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Environment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Run Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Last Run At
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {pipelines.map((pipeline) => (
              <tr key={pipeline.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{pipeline.name}</span>
                    {pipeline.isActive ? (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        INACTIVE
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 font-mono">
                  {pipeline.branch}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {pipeline.environment}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={pipeline.lastRunStatus} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDate(pipeline.lastRunAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleRunPipeline(pipeline)}
                      disabled={runningPipeline === pipeline.id || !pipeline.isActive}
                      className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {runningPipeline === pipeline.id && <RefreshCw className="w-3 h-3 animate-spin" />}
                      Run Pipeline
                    </button>
                    <button
                      onClick={() => setSelectedPipeline(pipeline.id)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" />
                      View Last Run
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Side Panel */}
      <PipelineDetailPanel
        isOpen={!!selectedPipeline}
        onClose={() => setSelectedPipeline(null)}
        pipelineId={selectedPipeline}
        tenantId={tenantId}
      />
    </div>
  );
}
