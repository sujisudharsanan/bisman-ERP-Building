/**
 * Incident Summary Tab
 * Shows current incident status, incident details, and recent incidents table
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Clock,
  ExternalLink,
  X,
  ChevronRight,
  RefreshCw,
} from '@/lib/ssr-safe-icons';
import {
  getCurrentIncident,
  getIncidents,
  getIncidentById,
} from '@/services/fallbackService';
import type { Incident, IncidentSeverity, IncidentStatus } from '@/types/fallback';

interface IncidentSummaryTabProps {
  onNavigateToRecovery: () => void;
}

// Severity badge component
function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const config = {
    critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
    high: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300' },
    medium: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300' },
    low: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  }[severity];

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      {severity.toUpperCase()}
    </span>
  );
}

// Status badge component
function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = {
    investigating: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: AlertCircle },
    identified: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: AlertTriangle },
    mitigated: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', icon: Clock },
    monitoring: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: Clock },
    resolved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', icon: CheckCircle },
  }[status];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
      <Icon className="w-3 h-3" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// Format date helper
function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
}

// Format relative time
function formatRelativeTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

// Incident Details Slide Panel
function IncidentDetailsPanel({
  incident,
  onClose,
  loading,
}: {
  incident: Incident | null;
  onClose: () => void;
  loading: boolean;
}) {
  if (!incident && !loading) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Panel */}
      <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Incident Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
          ) : incident ? (
            <>
              {/* Incident Header */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <SeverityBadge severity={incident.severity} />
                  <StatusBadge status={incident.status} />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {incident.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {incident.id}
                </p>
              </div>

              {/* Summary */}
              {incident.rootCauseSummary && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Root Cause Summary
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {incident.rootCauseSummary}
                  </p>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Started At</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {formatDate(incident.startedAt)}
                  </p>
                </div>
                {incident.resolvedAt && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Resolved At</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {formatDate(incident.resolvedAt)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Environment</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {incident.affectedEnvironment}
                  </p>
                </div>
                {incident.relatedDeploymentId && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Related Deployment</span>
                    <a 
                      href={`/super-admin/deployment?id=${incident.relatedDeploymentId}`}
                      className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      {incident.relatedDeploymentId.slice(0, 8)}...
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
                {incident.relatedBackupId && (
                  <div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Related Backup</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {incident.relatedBackupId.slice(0, 8)}...
                    </p>
                  </div>
                )}
              </div>

              {/* Timeline */}
              {incident.timeline && incident.timeline.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Timeline
                  </h4>
                  <div className="space-y-3">
                    {incident.timeline.map((event, idx) => (
                      <div key={event.id || idx} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          {idx < incident.timeline!.length - 1 && (
                            <div className="w-0.5 h-full bg-gray-200 dark:bg-gray-600" />
                          )}
                        </div>
                        <div className="flex-1 pb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <StatusBadge status={event.status} />
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {formatRelativeTime(event.timestamp)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {event.message}
                          </p>
                          {event.updatedBy && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              by {event.updatedBy}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remediation Steps */}
              {incident.remediationSteps && incident.remediationSteps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Remediation Steps
                  </h4>
                  <ol className="list-decimal list-inside space-y-2">
                    {incident.remediationSteps.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-600 dark:text-gray-400">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Notes */}
              {incident.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                    {incident.notes}
                  </p>
                </div>
              )}

              {/* Empty Timeline State */}
              {(!incident.timeline || incident.timeline.length === 0) && (
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No timeline events recorded for this incident.
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No incident data available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function IncidentSummaryTab({ onNavigateToRecovery }: IncidentSummaryTabProps) {
  // State
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null);
  const [hasActiveIncident, setHasActiveIncident] = useState(false);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Details panel state
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch current incident
  const fetchCurrentIncident = useCallback(async () => {
    try {
      const response = await getCurrentIncident();
      setHasActiveIncident(response.hasActiveIncident);
      setCurrentIncident(response.incident || null);
    } catch (err) {
      console.error('Failed to fetch current incident:', err);
      // Don't set error for current incident - it's okay if there's none
      setHasActiveIncident(false);
      setCurrentIncident(null);
    }
  }, []);

  // Fetch recent incidents
  const fetchRecentIncidents = useCallback(async () => {
    try {
      const response = await getIncidents({ status: 'recent', pageSize: 10 });
      setRecentIncidents(response.incidents || []);
    } catch (err) {
      console.error('Failed to fetch recent incidents:', err);
      setRecentIncidents([]);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([fetchCurrentIncident(), fetchRecentIncidents()]);
      } catch (err) {
        setError('Failed to load incident data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [fetchCurrentIncident, fetchRecentIncidents]);

  // Fetch incident details
  const handleViewDetails = async (incidentId: string) => {
    setSelectedIncidentId(incidentId);
    setDetailsLoading(true);
    try {
      const incident = await getIncidentById(incidentId);
      setSelectedIncident(incident);
    } catch (err) {
      console.error('Failed to fetch incident details:', err);
      // Try to find in existing data
      const found = recentIncidents.find(i => i.id === incidentId) || 
                    (currentIncident?.id === incidentId ? currentIncident : null);
      setSelectedIncident(found || null);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleCloseDetails = () => {
    setSelectedIncidentId(null);
    setSelectedIncident(null);
  };

  // Retry handler
  const handleRetry = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchCurrentIncident(), fetchRecentIncidents()]);
    } catch (err) {
      setError('Failed to load incident data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
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
          Failed to Load Incidents
        </h3>
        <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
        <button
          onClick={handleRetry}
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
      {/* Active Incident Banner */}
      {hasActiveIncident && currentIncident ? (
        <div className={`
          rounded-lg p-6 border
          ${currentIncident.severity === 'critical' 
            ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' 
            : currentIncident.severity === 'high'
            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
          }
        `}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`
                p-3 rounded-full
                ${currentIncident.severity === 'critical' 
                  ? 'bg-red-100 dark:bg-red-900/40' 
                  : currentIncident.severity === 'high'
                  ? 'bg-orange-100 dark:bg-orange-900/40'
                  : 'bg-yellow-100 dark:bg-yellow-900/40'
                }
              `}>
                <AlertTriangle className={`
                  w-6 h-6
                  ${currentIncident.severity === 'critical' 
                    ? 'text-red-600 dark:text-red-400' 
                    : currentIncident.severity === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                  }
                `} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`
                    text-sm font-semibold
                    ${currentIncident.severity === 'critical' 
                      ? 'text-red-700 dark:text-red-300' 
                      : currentIncident.severity === 'high'
                      ? 'text-orange-700 dark:text-orange-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                    }
                  `}>
                    Active Incident
                  </span>
                  <StatusBadge status={currentIncident.status} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {currentIncident.title}
                </h3>
                {currentIncident.rootCauseSummary && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {currentIncident.rootCauseSummary}
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="capitalize">{currentIncident.affectedEnvironment}</span>
                  <span>Started {formatRelativeTime(currentIncident.startedAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => handleViewDetails(currentIncident.id)}
                className="inline-flex items-center gap-1 px-3 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium transition-colors"
              >
                View Details
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                onClick={onNavigateToRecovery}
                className="inline-flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
              >
                Go to Recovery Actions
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/40 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-700 dark:text-green-300">
                No Active Incidents
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                All systems are operating normally. No critical issues detected.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recent Incidents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Recent Incidents
          </h3>
        </div>
        
        {recentIncidents.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Incidents Recorded
            </h4>
            <p className="text-gray-500 dark:text-gray-400">
              No incidents have been recorded yet. This is good!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Started At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {recentIncidents.map((incident) => (
                  <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatDate(incident.startedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {incident.affectedEnvironment}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <SeverityBadge severity={incident.severity} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={incident.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {incident.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewDetails(incident.id)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Details Panel */}
      {selectedIncidentId && (
        <IncidentDetailsPanel
          incident={selectedIncident}
          onClose={handleCloseDetails}
          loading={detailsLoading}
        />
      )}
    </div>
  );
}
