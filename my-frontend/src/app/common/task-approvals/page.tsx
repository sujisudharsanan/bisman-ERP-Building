/**
 * Task Approvals page - Redirects to the main approval queue
 * The main implementation is in /finance/payment-approval-queue
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Page() {
  const router = useRouter();
  
  useEffect(() => {
    // Redirect to the main task approval queue
    router.replace('/finance/payment-approval-queue');
  }, [router]);
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
      <div className="text-center">
        <p className="text-gray-600 dark:text-gray-400">Redirecting to Task Approvals...</p>
      </div>
    </div>
  );
}
