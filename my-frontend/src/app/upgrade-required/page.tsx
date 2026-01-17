'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';

function UpgradeRequiredContent() {
  const searchParams = useSearchParams();
  const module = searchParams?.get('module') || 'this feature';
  const currentPlan = searchParams?.get('plan') || 'FREE';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
          {/* Icon */}
          <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade Required
          </h1>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The <span className="font-semibold text-gray-900 dark:text-white">{module}</span> module 
            is not available in your current <span className="font-semibold text-amber-600">{currentPlan}</span> plan.
          </p>

          {/* Plan comparison hint */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Upgrade to <span className="font-semibold text-emerald-600">STANDARD</span> or higher 
              to unlock this feature and many more.
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Link
              href="/billing/plans"
              className="block w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              View Upgrade Options
            </Link>
            
            <Link
              href="/dashboard"
              className="block w-full py-3 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
            >
              Return to Dashboard
            </Link>
          </div>

          {/* Contact support */}
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-500">
            Need help? <a href="/support" className="text-blue-600 hover:underline">Contact support</a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function UpgradeRequiredPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    }>
      <UpgradeRequiredContent />
    </Suspense>
  );
}
