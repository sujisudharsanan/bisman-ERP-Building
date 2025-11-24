/**
 * Error Boundary for System Health Dashboard
 * Catches React errors and displays a fallback UI
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class SystemHealthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('System Health Dashboard Error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // Log to error tracking service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      // window.Sentry?.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack } } });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="flex items-center justify-center mb-6">
              <div className="p-4 bg-red-100 rounded-full">
                <AlertTriangle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            <h1 className="text-2xl font-bold text-gray-900 text-center mb-4">
              System Health Dashboard Error
            </h1>

            <p className="text-gray-600 text-center mb-6">
              An unexpected error occurred while loading the dashboard. Our team has been notified.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Error Details (Development Only):</h3>
                <pre className="text-xs text-red-700 overflow-auto max-h-40 whitespace-pre-wrap">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo && (
                  <details className="mt-2">
                    <summary className="text-xs text-red-700 cursor-pointer hover:text-red-900">
                      Component Stack
                    </summary>
                    <pre className="text-xs text-red-600 mt-2 overflow-auto max-h-40 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Reload Dashboard</span>
              </button>

              <button
                onClick={() => (window.location.href = '/enterprise-admin/dashboard')}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Main Dashboard
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">Troubleshooting Steps:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                <li>Check your internet connection</li>
                <li>Clear your browser cache and cookies</li>
                <li>Ensure the backend server is running</li>
                <li>Try accessing the dashboard in an incognito window</li>
                <li>Contact support if the issue persists</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default SystemHealthErrorBoundary;
