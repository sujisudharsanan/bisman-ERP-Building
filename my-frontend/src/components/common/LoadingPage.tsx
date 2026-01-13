/**
 * Loading Page Component
 * Standardized loading page for all routes
 */

'use client';

import React from 'react';
import LoadingLogo from './LoadingLogo';

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
  const logoSizes = {
    sm: 60,
    md: 100,
    lg: 140,
  };

  const containerClasses = fullPage
    ? 'min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex flex-col justify-center items-center'
    : 'flex flex-col justify-center items-center p-8';

  return (
    <div className={containerClasses}>
      <div className="text-center">
        <LoadingLogo size={logoSizes[size]} logoSrc="/logo.png" />

        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2 mt-4">{message}</h2>

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Please wait while we load your content.
        </p>
      </div>
    </div>
  );
}

export default LoadingPage;
