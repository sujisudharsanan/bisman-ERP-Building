/**
 * ModuleGate Component
 * Layout-level subscription plan gating for module access.
 * 
 * USE THIS AT LAYOUT LEVEL to prevent:
 * - Broken UI states when users directly navigate via URL
 * - Unnecessary API calls to protected endpoints
 * - Confusing 403 errors inside pages
 * 
 * Example usage in layout.tsx:
 * ```tsx
 * import ModuleGate from '@/common/components/ModuleGate';
 * 
 * export default function FinanceLayout({ children }) {
 *   return (
 *     <ModuleGate module="finance">
 *       {children}
 *     </ModuleGate>
 *   );
 * }
 * ```
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';
import { useModuleAccess } from '@/hooks/useModuleAccess';
import { Loader2, Lock, AlertTriangle } from 'lucide-react';

interface ModuleGateProps {
  children: React.ReactNode;
  module: string;
  /** If true, allows read_only access (shows content but may have disabled actions) */
  allowReadOnly?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
  /** If true, shows inline blocked message instead of redirect */
  inline?: boolean;
}

// Modules always accessible regardless of subscription plan
const ALWAYS_ACCESSIBLE = [
  'dashboard', 'common', 'chat', 'support', 'help', 
  'auth', 'public', 'onboarding', 'profile', 'settings'
];

// Roles that bypass all plan restrictions
const BYPASS_ROLES = ['ENTERPRISE_ADMIN', 'SUPER_ADMIN'];

/**
 * Default loading state while checking access
 */
const DefaultLoader = () => (
  <div className="flex items-center justify-center min-h-[400px] bg-slate-900/50">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-slate-400 text-sm">Checking access...</span>
    </div>
  </div>
);

/**
 * Inline blocked message (when inline=true)
 */
const InlineBlocked = ({ module, planName }: { module: string; planName: string }) => (
  <div className="flex items-center justify-center min-h-[400px] bg-slate-900/50 rounded-lg border border-slate-700">
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center">
        <Lock className="w-8 h-8 text-amber-500" />
      </div>
      <h3 className="text-xl font-semibold text-white">Module Locked</h3>
      <p className="text-slate-400 max-w-md">
        The <span className="text-amber-400 font-medium">{module}</span> module 
        is not included in your current <span className="text-blue-400">{planName}</span> plan.
      </p>
      <a 
        href={`/upgrade-required?module=${encodeURIComponent(module)}&plan=${encodeURIComponent(planName)}`}
        className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
      >
        View Upgrade Options
      </a>
    </div>
  </div>
);

export default function ModuleGate({ 
  children, 
  module,
  allowReadOnly = true,
  loadingComponent,
  inline = false,
}: ModuleGateProps) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { 
    hasAccess, 
    getAccessLevel, 
    loading: moduleLoading, 
    planName 
  } = useModuleAccess();
  
  const [gateState, setGateState] = useState<'loading' | 'allowed' | 'blocked'>('loading');

  useEffect(() => {
    // Still loading auth or module access
    if (authLoading || moduleLoading) {
      setGateState('loading');
      return;
    }

    // No user - let auth handle redirect
    if (!user?.id) {
      setGateState('loading');
      return;
    }

    // Check for bypass roles (Enterprise Admin, Super Admin)
    const userRole = String(user.roleName || user.role || '').toUpperCase();
    if (BYPASS_ROLES.includes(userRole)) {
      console.log(`[ModuleGate] ${userRole} bypass - full access to ${module}`);
      setGateState('allowed');
      return;
    }

    // Check if module is always accessible
    if (ALWAYS_ACCESSIBLE.includes(module.toLowerCase())) {
      setGateState('allowed');
      return;
    }

    // Check subscription-based module access
    const moduleAccessResult = hasAccess(module);
    const moduleAccessLevel = getAccessLevel(module);
    
    if (!moduleAccessResult) {
      console.log(`[ModuleGate] Access denied: module=${module}, plan=${planName}, level=${moduleAccessLevel}`);
      
      if (inline) {
        setGateState('blocked');
      } else {
        // Redirect to upgrade page
        router.replace(
          `/upgrade-required?module=${encodeURIComponent(module)}&plan=${encodeURIComponent(planName || 'FREE')}`
        );
      }
      return;
    }

    // Check read_only restriction
    if (moduleAccessLevel === 'read_only' && !allowReadOnly) {
      console.log(`[ModuleGate] Read-only access denied: module=${module}`);
      if (inline) {
        setGateState('blocked');
      } else {
        router.replace(
          `/upgrade-required?module=${encodeURIComponent(module)}&plan=${encodeURIComponent(planName || 'FREE')}&reason=read_only`
        );
      }
      return;
    }

    // Access granted
    setGateState('allowed');
  }, [
    user, 
    authLoading, 
    moduleLoading, 
    module, 
    hasAccess, 
    getAccessLevel, 
    planName, 
    allowReadOnly, 
    inline, 
    router
  ]);

  // Loading state
  if (gateState === 'loading') {
    return <>{loadingComponent || <DefaultLoader />}</>;
  }

  // Blocked state (inline only)
  if (gateState === 'blocked' && inline) {
    return <InlineBlocked module={module} planName={planName || 'FREE'} />;
  }

  // Allowed - render children
  return <>{children}</>;
}

/**
 * Hook version for conditional rendering within components
 */
export function useModuleGate(module: string) {
  const { user } = useAuth();
  const { hasAccess, getAccessLevel, loading, planName } = useModuleAccess();
  
  const userRole = String(user?.roleName || user?.role || '').toUpperCase();
  const isBypassRole = BYPASS_ROLES.includes(userRole);
  const isAlwaysAccessible = ALWAYS_ACCESSIBLE.includes(module.toLowerCase());
  
  const allowed = isBypassRole || isAlwaysAccessible || hasAccess(module);
  const level = isBypassRole ? 'full' : getAccessLevel(module);
  
  return {
    loading,
    allowed,
    accessLevel: level,
    planName,
    isReadOnly: level === 'read_only',
    canWrite: level === 'full',
  };
}
