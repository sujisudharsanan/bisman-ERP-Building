"use client";

import Sidebar from './Sidebar';
import { useRouter } from 'next/navigation';
import api from '../../lib/api/axios';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await api.post('/api/logout');
    } catch (e) {
      // ignore errors; still redirect
      console.error('logout failed', e);
    }
    // redirect to login page
    router.replace('/login');
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <header className="flex items-center justify-end p-4 border-b">
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            aria-label="Logout"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
