/**
 * Permission Context
 * Provides permission checking functionality throughout the app
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LoadingPage } from '@/components/common/LoadingPage';
import { ForbiddenPage } from '@/components/common/ForbiddenPage';

interface PermissionContextType {
  hasPermission: (featureKey: string, action: string) => boolean;
  loading: boolean;
  permissions: string[];
  refreshPermissions: () => Promise<void>;
}

const PermissionContext = createContext<PermissionContextType | null>(null);

interface PermissionProviderProps {
  children: React.ReactNode;
}

export function PermissionProvider({ children }: PermissionProviderProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);

  const fetchPermissions = useCallback(async () => {
    if (!user) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const baseURL =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      const response = await fetch(`${baseURL}/api/auth/permissions`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPermissions(data.permissions || []);
      } else {
        // Failed to fetch permissions - reset to empty
        setPermissions([]);
      }
    } catch {
      // Error fetching permissions - reset to empty
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const hasPermission = (featureKey: string, action: string): boolean => {
    if (loading) return false;
    if (!user) return false;

    // Super admin has all permissions
    if (user.roleName === 'SUPER_ADMIN') return true;

    // Create permission key in format: route.action
    const permissionKey = `${featureKey}.${action}`;

    // Check if user has this specific permission
    return (
      permissions.includes(permissionKey) ||
      permissions.includes(`${featureKey}.*`) ||
      permissions.includes('*.*')
    );
  };

  const refreshPermissions = async () => {
    await fetchPermissions();
  };

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const value: PermissionContextType = {
    hasPermission,
    loading,
    permissions,
    refreshPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export { PermissionContext };

export function RequirePermission({ children, action, route }: { children: React.ReactNode; action: string; route?: string }) {
  const ctx = usePermission();
  // Simplified: if loading, show loading; if no permission, show Forbidden
  if (ctx.loading) return <LoadingPage />;
  const allowed = ctx.hasPermission(action, 'view');
  if (!allowed) return <ForbiddenPage />;
  return <>{children}</>;
}

export function usePermission() {
  const context = useContext(PermissionContext);

  if (!context) {
    throw new Error('usePermission must be used within a PermissionProvider');
  }

  return context;
}
