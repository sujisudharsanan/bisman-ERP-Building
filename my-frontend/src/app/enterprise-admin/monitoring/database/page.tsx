'use client';

import React, { useState } from 'react';
import { FiDatabase, FiActivity, FiAlertCircle, FiExternalLink, FiRefreshCw, FiServer } from 'react-icons/fi';

export default function DatabaseHealthPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grafana dashboard URL (Database & Cache)
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';
  const dashboardUid = 'bisman-erp-database'; // From 03-database-cache.json
  const dashboardUrl = `${grafanaUrl}/d/${dashboardUid}/bisman-erp-database-cache-metrics?orgId=1&refresh=30s&kiosk=tv`;

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
    const iframe = document.getElementById('grafana-iframe') as HTMLIFrameElement;
    if (iframe) {
      iframe.src = iframe.src;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-green-50/30 to-gray-50 dark:from-gray-900 dark:via-green-900/10 dark:to-gray-900 p-6">
      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 bg-green-500/10 dark:bg-green-500/20 rounded-xl">
                  <FiDatabase className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Database & Cache Health
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    PostgreSQL and Redis performance metrics
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
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FiDatabase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">PostgreSQL</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Connection Pool</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <FiActivity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Transactions</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Commit/Rollback</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <FiServer className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Redis Cache</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Hit Ratio</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <FiDatabase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">DB Size</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Growth Tracking</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dashboard Iframe */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-lg">
          {isLoading && (
            <div className="flex items-center justify-center h-[800px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-500 mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Loading Database Health Dashboard...</p>
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
            title="Database & Cache Health Dashboard"
            sandbox="allow-same-origin allow-scripts allow-forms"
          />
        </div>

        {/* Help Text */}
        <div className="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-green-900 dark:text-green-200">
              <p className="font-semibold mb-1">Database Health Dashboard Includes:</p>
              <ul className="list-disc list-inside space-y-1 text-green-800 dark:text-green-300">
                <li><strong>PostgreSQL:</strong> Active connections, connection pool limits, transaction rate (commits/rollbacks)</li>
                <li><strong>Throughput:</strong> Rows fetched, inserted, updated, deleted per second</li>
                <li><strong>Cache Performance:</strong> Database cache hits vs disk reads (buffer cache efficiency)</li>
                <li><strong>Redis:</strong> Command rate, memory usage, cache hit ratio, connected clients</li>
                <li><strong>Storage:</strong> Database size growth over time for capacity planning</li>
              </ul>
              <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/40 rounded">
                <p className="font-semibold text-green-900 dark:text-green-100">Optimization Tips:</p>
                <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                  <li>Maintain Redis cache hit ratio &gt; 85% for optimal performance</li>
                  <li>Keep DB connections below 80% of max_connections</li>
                  <li>Monitor slow queries (duration &gt; 500ms) and optimize with indexes</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
