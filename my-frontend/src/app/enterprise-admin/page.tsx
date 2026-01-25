'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Enterprise Admin Root Page
 * Redirects to the dashboard as the default landing page
 */
export default function EnterpriseAdminPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/enterprise-admin/dashboard');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-pulse text-gray-500">
        Redirecting to dashboard...
      </div>
    </div>
  );
}
