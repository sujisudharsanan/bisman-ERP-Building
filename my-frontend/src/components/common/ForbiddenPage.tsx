/**
 * Forbidden Page Component
 * Full page component for when users don't have access
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Home } from 'lucide-react';

interface ForbiddenPageProps {
  title?: string;
  message?: string;
  showBackButton?: boolean;
  backHref?: string;
}

export function ForbiddenPage({
  title = 'Access Denied',
  message = "You don't have permission to access this page.",
  showBackButton = true,
  backHref = '/dashboard',
}: ForbiddenPageProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Icon */}
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-100 mb-6">
              <Shield className="h-10 w-10 text-red-600" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 mb-4">{title}</h2>

            {/* Message */}
            <p className="text-sm text-gray-600 mb-8">{message}</p>

            {/* Actions */}
            <div className="space-y-3">
              {showBackButton && (
                <Link
                  href={backHref}
                  className="w-full flex justify-center items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Dashboard
                </Link>
              )}

              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Go Back
              </button>
            </div>

            {/* Contact Admin */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Need access? Contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForbiddenPage;
