/**
 * Loading Page Component
 * Standardized loading page for all routes
 */

'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingPageProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  fullPage?: boolean;
}

export function LoadingPage({
  message = 'Loading...',
  size = 'md',
  fullPage = true,
}: LoadingPageProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  const containerClasses = fullPage
    ? 'min-h-screen bg-gray-50 flex flex-col justify-center items-center'
    : 'flex flex-col justify-center items-center p-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <div className="mb-4">
          <Loader2
            className={`${sizeClasses[size]} animate-spin text-indigo-600 mx-auto`}
          />
        </div>

        <h2 className="text-lg font-medium text-gray-900 mb-2">{message}</h2>

        <p className="text-sm text-gray-600">
          Please wait while we load your content.
        </p>
      </div>
    </div>
  );
}

export default LoadingPage;
