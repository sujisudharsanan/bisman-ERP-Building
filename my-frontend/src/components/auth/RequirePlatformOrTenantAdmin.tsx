"use client";
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
const ADMIN_ROLES = ['PLATFORM_ADMIN','SUPER_ADMIN','ADMIN','ENTERPRISE_ADMIN','TENANT_ADMIN'];
export default function RequirePlatformOrTenantAdmin({ children, fallback }: Props) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-4 text-sm text-gray-500">Checking access...</div>;
  const role = (user as any)?.role || (user as any)?.roleName;
  if (!role || !ADMIN_ROLES.includes(role)) {
    return fallback || <div className="p-4 text-sm text-red-600" role="alert">Access denied: Admin privileges required.</div>;
  }
  return <>{children}</>;
}
