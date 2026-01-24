/**
 * Permission Guard Component
 * Checks user permissions before rendering page content
 * Redirects to access-denied if user has no permissions
 * 
 * USES THREE-LAYER INTERSECTION:
 *   effectivePages = subscriptionPages ∩ enterpriseApproved ∩ superadminApproved
 * 
 * ORDER OF CHECKS:
 * 1. Enterprise Admin bypass (full access)
 * 2. Effective Access API check (3-layer intersection)
 * 3. Redirect to access-denied or upgrade-required based on block reason
 */

'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';
import { useEffectiveAccess } from '@/hooks/useEffectiveAccess';

interface PermissionGuardProps {
  children: React.ReactNode;
  requirePermissions?: boolean; // If true, checks if user has any permissions
  pageKey?: string; // If provided, checks access to this specific page
}

// Pages always accessible regardless of permissions
const ALWAYS_ACCESSIBLE = ['dashboard', 'about-me', 'profile', 'settings', 'help', 'support', 'notifications', 'chat'];

export default function PermissionGuard({ 
  children, 
  requirePermissions = true,
  pageKey: explicitPageKey
}: PermissionGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasAccess, setHasAccess] = useState(false);
  
  // Use the new effective access hook (3-layer intersection)
  const { 
    hasPageAccess, 
    getBlockedReason, 
    loading: effectiveAccessLoading,
    layers 
  } = useEffectiveAccess();
  
  // Infer page key from pathname if not explicitly provided
  const pageKey = useMemo(() => {
    if (explicitPageKey) return explicitPageKey;
    const segments = pathname?.split('/').filter(Boolean) || [];
    // Use the last segment as page key (e.g., /finance/invoices -> invoices)
    return segments[segments.length - 1] || 'dashboard';
  }, [pathname, explicitPageKey]);
  
  // Check if user is Enterprise Admin or Super Admin (top-most roles - have access to everything)
  const hasFullAccessRole = useMemo(() => {
    const roleName = String(user?.roleName || user?.role || '').toUpperCase();
    return roleName === 'ENTERPRISE_ADMIN' || roleName === 'SUPER_ADMIN';
  }, [user?.roleName, user?.role]);

  useEffect(() => {
    // Wait for effective access to load
    if (effectiveAccessLoading || authLoading) {
      return;
    }
    
    // No user - let auth handle redirect
    if (!user?.id) {
      setHasAccess(false);
      return;
    }
    
    // ==========================================
    // ENTERPRISE ADMIN / SUPER ADMIN BYPASS - FULL ACCESS
    // ==========================================
    if (hasFullAccessRole) {
      const roleName = String(user?.roleName || user?.role || '').toUpperCase();
      console.log(`[PermissionGuard] ${roleName} - full access`);
      setHasAccess(true);
      return;
    }
    
    // ==========================================
    // ALWAYS ACCESSIBLE PAGES
    // ==========================================
    if (ALWAYS_ACCESSIBLE.includes(pageKey)) {
      setHasAccess(true);
      return;
    }
    
    // ==========================================
    // CHECK EFFECTIVE ACCESS (3-LAYER INTERSECTION)
    // ==========================================
    if (!requirePermissions) {
      setHasAccess(true);
      return;
    }
    
    const hasAccess = hasPageAccess(pageKey);
    
    if (!hasAccess) {
      const reason = getBlockedReason(pageKey);
      console.log(`[PermissionGuard] Access denied to ${pageKey}:`, reason);
      
      // Determine redirect based on reason
      if (reason?.includes('subscription') || reason?.includes('plan')) {
        router.replace(`/upgrade-required?page=${encodeURIComponent(pageKey)}&reason=${encodeURIComponent(reason || 'subscription')}`);
      } else {
        router.replace(`/access-denied?page=${encodeURIComponent(pageKey)}&reason=${encodeURIComponent(reason || 'permission')}`);
      }
      setHasAccess(false);
    } else {
      console.log(`[PermissionGuard] Access granted to ${pageKey}`);
      setHasAccess(true);
    }
  }, [user?.id, hasFullAccessRole, requirePermissions, pageKey, hasPageAccess, getBlockedReason, router, effectiveAccessLoading, authLoading]);

  // Show loading state while checking
  if (effectiveAccessLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Don't render children if no access
  if (!hasAccess) {
    return null;
  }

  // Render children if access granted
  return <>{children}</>;
}
