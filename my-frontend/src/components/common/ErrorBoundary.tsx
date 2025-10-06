/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import Link from 'next/link';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    // console.error('ErrorBoundary caught an error:', error, errorInfo);

    // TODO: Send to error reporting service
    // errorReportingService.captureException(error, {
    //   extra: errorInfo,
    //   tags: { component: 'ErrorBoundary' }
    // })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* Error Icon */}
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
                  <AlertTriangle className="h-10 w-10 text-red-600" />
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Oops! Something went wrong
                </h2>

                {/* Error Message */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">
                    We&apos;re sorry for the inconvenience. Please try refreshing the
                    page.
                  </p>

                  {/* Show error details in development */}
                  {process.env.NODE_ENV === 'development' &&
                    this.state.error && (
                      <details className="mt-4 p-3 bg-gray-100 rounded text-left">
                        <summary className="cursor-pointer text-sm font-medium text-gray-700">
                          Error Details (Development Only)
                        </summary>
                        <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap">
                          {this.state.error.message}
                        </pre>
                        {this.state.errorInfo && (
                          <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                            {this.state.errorInfo.componentStack}
                          </pre>
                        )}
                      </details>
                    )}
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <button
                    onClick={this.handleReset}
                    className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </button>

                  <Link
                    href="/dashboard"
                    className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Home className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Link>
                </div>

                {/* Support Contact */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <p className="text-xs text-gray-500">
                    If this problem persists, please contact support.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
