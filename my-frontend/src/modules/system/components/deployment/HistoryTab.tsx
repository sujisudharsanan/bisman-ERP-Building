/**
 * Deployment Center - History Tab
 * Shows paginated deployment history with details modal
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { DeploymentHistory, DeploymentHistoryPage } from '@/types/deployment';
import { getDeploymentHistory, getDeploymentDetail, triggerDeployment } from '@/services/deploymentService';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  ChevronLeft,
  ChevronRight,
} from '@/lib/ssr-safe-icons';

interface HistoryTabProps {
  tenantId: string;
}

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const getStatusConfig = (s: string) => {
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

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

// Deployment detail modal
function DeploymentDetailModal({
  isOpen,
  onClose,
  deploymentId,
  tenantId,
}: {
  isOpen: boolean;
  onClose: () => void;
  deploymentId: string | null;
  tenantId: string;
}) {
  const [detail, setDetail] = useState<DeploymentHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'info' | 'logs' | 'notes' | 'health'>('info');

  useEffect(() => {
    if (isOpen && deploymentId) {
      setLoading(true);
      setActiveDetailTab('info');
      getDeploymentDetail(tenantId, deploymentId)
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoading(false));
    }
  }, [isOpen, deploymentId, tenantId]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Deployment Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
          ) : !detail ? (
            <div className="text-center py-12">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Failed to load deployment details</p>
            </div>
          ) : (
            <div className="p-6">
              {/* Detail Tabs */}
              <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
                {(['info', 'logs', 'notes', 'health'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveDetailTab(tab)}
                    className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
                      activeDetailTab === tab
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                    }`}
                  >
                    {tab === 'notes' ? 'Release Notes' : tab === 'health' ? 'Health Check' : tab}
                  </button>
                ))}
              </div>

              {activeDetailTab === 'info' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Version</label>
                      <div className="font-medium text-gray-900 dark:text-gray-100">{detail.version}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Build ID</label>
                      <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{detail.buildId}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Environment</label>
                      <div className="capitalize text-gray-900 dark:text-gray-100">{detail.environment}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Status</label>
                      <div className="mt-1"><StatusBadge status={detail.status} /></div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Deployed At</label>
                      <div className="text-gray-900 dark:text-gray-100">{formatDate(detail.deployedAt)}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Initiated By</label>
                      <div className="text-gray-900 dark:text-gray-100">{detail.initiatedBy}</div>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 dark:text-gray-400">Backup Taken</label>
                      <div className="text-gray-900 dark:text-gray-100">{detail.backupTaken ? 'Yes' : 'No'}</div>
                    </div>
                    {detail.duration && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Duration</label>
                        <div className="text-gray-900 dark:text-gray-100">{detail.duration}s</div>
                      </div>
                    )}
                    {detail.branch && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Branch</label>
                        <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{detail.branch}</div>
                      </div>
                    )}
                    {detail.commit && (
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400">Commit</label>
                        <div className="font-mono text-sm text-gray-900 dark:text-gray-100">{detail.commit.substring(0, 8)}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDetailTab === 'logs' && (
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-sm text-green-400 font-mono whitespace-pre-wrap">
                    {detail.logs || 'No logs available for this deployment.'}
                  </pre>
                </div>
              )}

              {activeDetailTab === 'notes' && (
                <div className="prose dark:prose-invert max-w-none">
                  {detail.releaseNotes ? (
                    <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {detail.releaseNotes}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No release notes available.</p>
                  )}
                </div>
              )}

              {activeDetailTab === 'health' && (
                <div>
                  {detail.healthCheckSummary ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="font-medium text-gray-900 dark:text-gray-100">Overall Status</span>
                        <StatusBadge status={detail.healthCheckSummary.overall} />
                      </div>
                      {Object.entries(detail.healthCheckSummary.services).map(([key, service]) => (
                        <div key={key} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">{key}</span>
                          <div className="flex items-center gap-3">
                            {service.latency && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">{service.latency}ms</span>
                            )}
                            <StatusBadge status={service.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 dark:text-gray-400">No health check data available.</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function HistoryTab({ tenantId }: HistoryTabProps) {
  const [historyPage, setHistoryPage] = useState<DeploymentHistoryPage | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDeploymentHistory(tenantId, page);
      setHistoryPage(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load deployment history');
    } finally {
      setLoading(false);
    }
  }, [tenantId, page]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return dateStr;
    }
  };

  if (loading && !historyPage) {
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Failed to Load History</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
        <button
          onClick={fetchHistory}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!historyPage || historyPage.items.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📜</div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Deployments Recorded</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          No deployment history available for this tenant yet.
        </p>
        <button
          onClick={() => {
            triggerDeployment({ tenantId, environment: 'staging' })
              .then(() => fetchHistory())
              .catch(() => {});
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Deploy Latest Build
        </button>
      </div>
    );
  }

  const { items, totalPages } = historyPage;

  return (
    <div className="space-y-4">
      {/* Refresh button */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Showing {items.length} of {historyPage.totalCount} deployments
        </p>
        <button
          onClick={fetchHistory}
          disabled={loading}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-900/50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Deployed At
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Version / Build ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Environment
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Initiated By
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Backup
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((deployment) => (
              <tr key={deployment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(deployment.deployedAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{deployment.version}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">{deployment.buildId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                  {deployment.environment}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                  {deployment.initiatedBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={deployment.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {deployment.backupTaken ? (
                    <span className="text-green-600 dark:text-green-400">Yes</span>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">No</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => setSelectedDeploymentId(deployment.id)}
                    className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-1 ml-auto"
                  >
                    <Eye className="w-3 h-3" />
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-2 rounded border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Detail Modal */}
      <DeploymentDetailModal
        isOpen={!!selectedDeploymentId}
        onClose={() => setSelectedDeploymentId(null)}
        deploymentId={selectedDeploymentId}
        tenantId={tenantId}
      />
    </div>
  );
}
