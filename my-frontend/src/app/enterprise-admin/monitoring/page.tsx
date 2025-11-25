'use client';

import React, { useState, useEffect } from 'react';
import { FiMonitor, FiActivity, FiAlertCircle, FiExternalLink, FiRefreshCw, FiServer, FiDatabase } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

export default function MonitoringPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGrafanaAvailable, setIsGrafanaAvailable] = useState(false);

  // Grafana dashboard URL (System Overview)
  const grafanaUrl = process.env.NEXT_PUBLIC_GRAFANA_URL || 'http://localhost:3001';
  const dashboardUid = 'bisman-erp-overview'; // From 01-system-overview.json
  const dashboardUrl = `${grafanaUrl}/d/${dashboardUid}/bisman-erp-system-overview?orgId=1&refresh=10s&kiosk=tv`;

  // Check if Grafana is available
  useEffect(() => {
    const checkGrafana = async () => {
      try {
        const response = await fetch(grafanaUrl, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        // Check if response is actually from Grafana (not Node.js API)
        setIsGrafanaAvailable(response.ok && !contentType?.includes('application/json'));
      } catch {
        setIsGrafanaAvailable(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkGrafana();
  }, [grafanaUrl]);

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

  // Show Docker not installed warning
  if (!isGrafanaAvailable && !isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-50 dark:from-gray-900 dark:via-blue-900/10 dark:to-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 rounded-xl">
                <FiActivity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
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

          {/* Docker Not Installed Notice */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              <FiAlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                  Advanced Monitoring Requires Docker
                </h3>
                <p className="text-yellow-800 dark:text-yellow-300 mb-4">
                  The advanced Grafana + Prometheus monitoring stack requires Docker to be installed.
                  In the meantime, you can use the System Health Dashboard for monitoring.
                </p>
                <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
                    To enable advanced monitoring:
                  </p>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-yellow-800 dark:text-yellow-300">
                    <li>Install Docker Desktop: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">brew install --cask docker</code></li>
                    <li>Start Docker Desktop application</li>
                    <li>Run: <code className="bg-yellow-200 dark:bg-yellow-800 px-2 py-0.5 rounded">docker-compose -f docker-compose.monitoring.yml up -d</code></li>
                    <li>Refresh this page</li>
                  </ol>
                </div>
                <p className="text-xs text-yellow-700 dark:text-yellow-400">
                  See <code>MONITORING_FIX_GUIDE.md</code> for detailed instructions
                </p>
              </div>
            </div>
          </div>

          {/* Available Monitoring Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* System Health Dashboard */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow cursor-pointer"
                 onClick={() => router.push('/enterprise-admin/monitoring/system-health')}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <FiServer className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    System Health Dashboard
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 mb-3">
                    ✓ Available Now
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Basic system monitoring with performance metrics, implementation status, and alerts.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      API Performance Metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Database Health Check
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      System Alerts
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Implementation Status
                    </li>
                  </ul>
                  <button className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    Open Dashboard →
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced Monitoring (Requires Docker) */}
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6 border border-gray-300 dark:border-gray-700 opacity-60">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gray-300/50 dark:bg-gray-700/50 rounded-lg">
                  <FiDatabase className="w-6 h-6 text-gray-500 dark:text-gray-500" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Advanced Monitoring
                  </h3>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-400 mb-3">
                    ⊘ Requires Docker
                  </span>
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                    Full monitoring stack with Grafana dashboards, Prometheus metrics, and alerting.
                  </p>
                  <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-500">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Real-time CPU, Memory, Disk Usage
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Database Query Performance
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Redis Cache Metrics
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                      Custom Alert Rules
                    </li>
                  </ul>
                  <button className="mt-4 w-full px-4 py-2 bg-gray-300 text-gray-600 dark:bg-gray-700 dark:text-gray-500 rounded-lg cursor-not-allowed" disabled>
                    Install Docker to Enable
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Setup Instructions */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h4 className="text-md font-semibold text-blue-900 dark:text-blue-200 mb-3">
              📚 Setup Instructions
            </h4>
            <div className="space-y-3 text-sm text-blue-800 dark:text-blue-300">
              <div>
                <p className="font-semibold mb-1">Current Setup:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>✅ Backend API running on port 5000</li>
                  <li>✅ Frontend running on port 3000</li>
                  <li>✅ System Health Dashboard available</li>
                  <li>❌ Docker not installed (required for Grafana)</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold mb-1">To enable advanced monitoring:</p>
                <ol className="list-decimal list-inside ml-2 space-y-1">
                  <li>Install Docker Desktop for macOS</li>
                  <li>Start Docker Desktop application</li>
                  <li>Run the monitoring stack startup command</li>
                  <li>Access Grafana at http://localhost:3001</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original Grafana iframe code (when Docker is installed)
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
