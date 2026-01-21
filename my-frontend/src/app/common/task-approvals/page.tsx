/**
 * Task Approvals page - Redirects to the main governance-first approval page
 * 
 * GOVERNANCE PRINCIPLE:
 * This page represents AUTHORITY, not WORKLOAD.
 * "Show me all tasks that require MY decision, review, or acknowledgment."
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the governance-first task approval page
    router.replace('/approvals');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-slate-900 p-6">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting to Task Approvals...</p>
      </div>
    </div>
  );
}
