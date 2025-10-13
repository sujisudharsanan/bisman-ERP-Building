'use client';

import { useRouter } from 'next/navigation';
import LogoutButton from '@/components/ui/LogoutButton';

export default function HubInchargeLoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      {/* Show Logout exclusively on this login page */}
      <LogoutButton position="top-right" variant="default" hideOnLogin={false} />
      <div className="max-w-md w-full text-center text-white">
        <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-6 flex items-center justify-center backdrop-blur-sm">
          <span className="text-2xl">🏷️</span>
        </div>
        <h1 className="text-3xl font-bold mb-2">Hub Incharge Login</h1>
        <p className="text-blue-200 mb-8">Sign in to continue to your hub dashboard</p>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
          <p className="text-blue-100 mb-4">Use the standard login to access your account.</p>
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            Go to Standard Login
          </button>
        </div>
      </div>
    </div>
  );
}
