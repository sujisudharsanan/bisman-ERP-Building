'use client';

import React, { useState } from 'react';
import { FiMonitor, FiActivity, FiAlertCircle, FiExternalLink, FiRefreshCw } from 'react-icons/fi';

export default function MonitoringPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grafana dashboard URL (System Overview)
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';
  const dashboardUid = 'bisman-erp-overview'; // From 01-system-overview.json
  const dashboardUrl = `${grafanaUrl}/d/${dashboardUid}/bisman-erp-system-overview?orgId=1&refresh=10s&kiosk=tv`;

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setError('Unable to load Grafana dashboard. Please ensure monitoring stack is running.');
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setError(null);
    // Force iframe reload
    const iframe = document.getElementById('grafana-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-900 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
                  <FiMonitor className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    System Monitoring
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    Real-time system health and performance metrics
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                title="Refresh Dashboard"
              >
                <FiRefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <a
                href={`${grafanaUrl}/d/${dashboardUid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiExternalLink className="w-4 h-4" />
                <span className="hidden sm:inline">Open in Grafana</span>
              </a>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FiActivity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">All Systems Operational</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FiMonitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Monitoring</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Prometheus + Grafana</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FiAlertCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Active Alerts</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">View in Dashboard</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <FiRefreshCw className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Refresh Rate</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">10 seconds</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Iframe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
          {isLoading && (
            <div className="flex items-center justify-center h-[800px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading System Overview Dashboard...</p>
              </div>
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-center h-[800px]">
              <div className="text-center max-w-md">
                <FiAlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Dashboard Unavailable
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <div className="space-y-2 text-sm text-left bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                  <p className="font-semibold">To start the monitoring stack:</p>
                  <code className="block bg-gray-800 text-green-400 p-2 rounded">
                    docker-compose -f docker-compose.monitoring.yml up -d
                  </code>
                  <p className="text-xs text-gray-500 mt-2">
                    See MONITORING_SETUP_GUIDE.md for detailed instructions
                  </p>
                </div>
              </div>
            </div>
          )}

          <iframe
            id="grafana-iframe"
            src={dashboardUrl}
            className={`w-full h-[800px] border-0 ${isLoading || error ? 'hidden' : ''}`}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            title="System Monitoring Dashboard"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-200">
              <p className="font-semibold mb-1">Dashboard Features:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800 dark:text-blue-300">
                <li>Real-time CPU, Memory, and Disk usage gauges</li>
                <li>API request rate and response time (P95 latency)</li>
                <li>Database connections and Redis memory usage</li>
                <li>Auto-refreshes every 10 seconds</li>
              </ul>
              <p className="mt-2">
                For more dashboards, use the sidebar to access Performance Metrics and Database Health.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
