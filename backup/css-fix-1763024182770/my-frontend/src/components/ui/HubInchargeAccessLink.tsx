'use client';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Users } from 'lucide-react';

export default function HubInchargeAccessLink() {
  const { user } = useAuth();

  // Only show for Admin and Manager roles
  if (!user || (user.roleName !== 'ADMIN' && user.roleName !== 'MANAGER')) {
    return null;
  }

  return (
    <div className="fixed top-20 right-6 z-40">
      <Link
        href="/hub-incharge"
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-200 text-sm font-medium"
      >
        <Users size={16} />
        <span className="hidden sm:inline">Hub Incharge View</span>
        <span className="sm:hidden">Hub View</span>
      </Link>
    </div>
  );
}
