'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect to the main Clients management page
 * The actual clients list is at /system/user-management
 */
export default function SystemClientsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/system/user-management');
  }, [router]);

  return (
    <div className="w-full p-6 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400">Redirecting to Clients...</p>
      </div>
    </div>
  );
}

