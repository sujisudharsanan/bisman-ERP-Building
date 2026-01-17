/**
 * BISMAN ERP - Module Gate Component
 * 
 * A React component that checks subscription-based module access before rendering children.
 * Enforces Free vs Paid module restrictions at the component level.
 * 
 * Usage:
 *   <ModuleGate module="finance">
 *     <FinanceModule />
 *   </ModuleGate>
 * 
 *   <ModuleGate module="hr" requireWrite>
 *     <EditEmployeeButton />
 *   </ModuleGate>
 * 
 * @module components/subscription/ModuleGate
 */

'use client';

import React, { ReactNode, useMemo } from 'react';
import { Lock, ArrowUpCircle, Loader2, Eye, AlertTriangle } from 'lucide-react';
import { useModuleAccess, type ModuleAccessLevel } from '@/hooks/useModuleAccess';
import Link from 'next/link';

// ============================================================================
// TYPES
// ============================================================================

interface ModuleGateProps {
  /** The module code to check (e.g., 'finance', 'hr', 'procurement') */
  module: string;

  /** Children to render when module is accessible */
  children: ReactNode;

  /** Optional fallback to render when module is blocked (default: UpgradePrompt) */
  fallback?: ReactNode;

  /** Require full (write) access? If true, read_only access will be blocked */
  requireWrite?: boolean;

  /** Show loading state while checking? Default: true */
  showLoading?: boolean;

  /** Callback when module is blocked */
  onBlocked?: (moduleId: string, accessLevel: ModuleAccessLevel) => void;

  /** Callback when module is accessible */
  onAllowed?: (moduleId: string, accessLevel: ModuleAccessLevel) => void;

  /** Custom className for the wrapper */
  className?: string;

  /** Force bypass for demo/testing */
  bypass?: boolean;

  /** Render as inline (no wrapper div) */
  inline?: boolean;
}

// Module display names for user-friendly messages
const MODULE_DISPLAY_NAMES: Record<string, string> = {
  finance: 'Finance & Accounting',
  operations: 'Operations Management',
  procurement: 'Procurement',
  hr: 'Human Resources',
  admin: 'Administration',
  reports: 'Advanced Reports',
  analytics: 'Analytics & BI',
  quality: 'Quality Control',
  compliance: 'Compliance',
  inventory: 'Inventory Management',
  transport: 'Transport & Logistics',
  sales: 'Sales Management',
  crm: 'Customer Relations',
  marketing: 'Marketing',
  production: 'Production',
  project: 'Project Management',
  field_ops: 'Field Operations',
  integrations: 'Integrations',
  api_access: 'API Access',
  audit: 'Audit Trail',
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Loading spinner shown while checking module access */
function LoadingState() {
  return (
    <div className="flex items-center justify-center p-6">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
        Checking access...
      </span>
    </div>
  );
}

/** Default message shown when module is not available in current plan */
function UpgradePrompt({
  module,
  planName,
  displayName,
}: {
  module: string;
  planName: string;
  displayName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="w-16 h-16 mb-4 flex items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
        <Lock className="w-8 h-8 text-orange-500" />
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {displayName} is Locked
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-6">
        The <strong>{displayName}</strong> module is not available in your{' '}
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {planName}
        </span>{' '}
        plan. Upgrade your subscription to unlock this feature.
      </p>

      <div className="flex gap-3">
        <Link
          href="/settings/subscription"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <ArrowUpCircle className="w-4 h-4 mr-2" />
          Upgrade Plan
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          View Plans
        </Link>
      </div>
    </div>
  );
}

/** Message shown when user has read-only access but write access is required */
function ReadOnlyMessage({
  module,
  planName,
  displayName,
}: {
  module: string;
  planName: string;
  displayName: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
      <div className="w-12 h-12 mb-3 flex items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
        <Eye className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
      </div>

      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        Read-Only Access
      </h3>

      <p className="text-sm text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
        Your <strong>{planName}</strong> plan provides read-only access to{' '}
        <strong>{displayName}</strong>. Upgrade to make changes.
      </p>

      <Link
        href="/settings/subscription"
        className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 hover:bg-yellow-200 dark:hover:bg-yellow-900/50 rounded-md transition-colors"
      >
        <ArrowUpCircle className="w-4 h-4 mr-1.5" />
        Upgrade for Full Access
      </Link>
    </div>
  );
}

/** Inline badge for read-only modules */
function ReadOnlyBadge({ displayName }: { displayName: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
      <Eye className="w-3 h-3 mr-1" />
      Read-Only
    </span>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ModuleGate({
  module,
  children,
  fallback,
  requireWrite = false,
  showLoading = true,
  onBlocked,
  onAllowed,
  className,
  bypass = false,
  inline = false,
}: ModuleGateProps) {
  const { checkModuleAccess, loading } = useModuleAccess();

  const accessResult = useMemo(() => {
    return checkModuleAccess(module);
  }, [checkModuleAccess, module]);

  const displayName =
    MODULE_DISPLAY_NAMES[module.toLowerCase()] || module;

  // Handle bypass
  if (bypass) {
    return <>{children}</>;
  }

  // Handle loading state
  if (loading && showLoading) {
    if (inline) {
      return <Loader2 className="w-4 h-4 animate-spin text-gray-400" />;
    }
    return (
      <div className={className}>
        <LoadingState />
      </div>
    );
  }

  // Check access
  const hasAccess = accessResult.hasAccess;
  const accessLevel = accessResult.accessLevel;

  // Handle no access
  if (!hasAccess) {
    onBlocked?.(module, accessLevel);

    if (fallback) {
      return <>{fallback}</>;
    }

    if (inline) {
      return (
        <span className="text-gray-400 dark:text-gray-600" title={accessResult.message}>
          <Lock className="w-4 h-4 inline" />
        </span>
      );
    }

    return (
      <div className={className}>
        <UpgradePrompt
          module={module}
          planName={accessResult.planName}
          displayName={displayName}
        />
      </div>
    );
  }

  // Handle read-only access when write is required
  if (requireWrite && accessLevel === 'read_only') {
    onBlocked?.(module, accessLevel);

    if (fallback) {
      return <>{fallback}</>;
    }

    if (inline) {
      return <ReadOnlyBadge displayName={displayName} />;
    }

    return (
      <div className={className}>
        <ReadOnlyMessage
          module={module}
          planName={accessResult.planName}
          displayName={displayName}
        />
      </div>
    );
  }

  // Access granted
  onAllowed?.(module, accessLevel);

  // If read-only access, wrap children with indicator
  if (accessLevel === 'read_only' && !requireWrite) {
    return (
      <div className={className}>
        <div className="relative">
          {!inline && (
            <div className="absolute top-2 right-2 z-10">
              <ReadOnlyBadge displayName={displayName} />
            </div>
          )}
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

/**
 * Higher-order component version of ModuleGate
 */
export function withModuleAccess<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  module: string,
  options: Partial<ModuleGateProps> = {}
) {
  return function WithModuleAccess(props: P) {
    return (
      <ModuleGate module={module} {...options}>
        <WrappedComponent {...props} />
      </ModuleGate>
    );
  };
}

/**
 * Simple hook-based check for inline usage
 */
export function useModuleGate(module: string, requireWrite = false) {
  const { checkModuleAccess, loading } = useModuleAccess();

  const accessResult = useMemo(() => {
    return checkModuleAccess(module);
  }, [checkModuleAccess, module]);

  const hasAccess =
    accessResult.hasAccess &&
    (!requireWrite || accessResult.accessLevel === 'full');

  return {
    hasAccess,
    loading,
    accessLevel: accessResult.accessLevel,
    planName: accessResult.planName,
    upgradeRequired: accessResult.upgradeRequired,
    message: accessResult.message,
  };
}

export default ModuleGate;
