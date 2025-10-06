'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ManagerLoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new standard login page
    router.push('/auth/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to standard login...</p>
      </div>
    </div>
  );
}
