/**
 * BISMAN ERP - Feature Gate Component
 * 
 * A React component that checks feature access before rendering children.
 * Integrates with the micro-unlock subscription system.
 * 
 * Usage:
 *   <FeatureGate feature="task_creation">
 *     <CreateTaskButton />
 *   </FeatureGate>
 * 
 * @module components/subscription/FeatureGate
 */

'use client';

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { Lock, Unlock, AlertTriangle, Loader2, CreditCard } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureAccessResult {
  allowed: boolean;
  reason: 'unlocked' | 'plan_included' | 'within_limit' | 'limit_exceeded' | 'feature_not_found' | 'check_failed';
  message: string;
  current_usage?: number;
  usage_limit?: number;
  reset_in_seconds?: number;
  unlock_price?: number;
  canUnlock?: boolean;
}

interface FeatureGateProps {
  /** The feature code to check (e.g., 'task_creation', 'payment_approval') */
  feature: string;
  
  /** Children to render when feature is accessible */
  children: ReactNode;
  
  /** Optional fallback to render when feature is blocked (default: LimitReachedMessage) */
  fallback?: ReactNode;
  
  /** Show loading state while checking? Default: true */
  showLoading?: boolean;
  
  /** Show unlock prompt for admins? Default: true */
  showUnlockPrompt?: boolean;
  
  /** Callback when feature is blocked */
  onBlocked?: (result: FeatureAccessResult) => void;
  
  /** Callback when feature is accessible */
  onAllowed?: () => void;
  
  /** Custom className for the wrapper */
  className?: string;
  
  /** Force bypass for demo/testing */
  bypass?: boolean;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

async function checkFeatureAccess(featureKey: string): Promise<FeatureAccessResult> {
  try {
    const response = await fetch(`${getApiUrl()}/api/micro-unlock/check/${featureKey}`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // If the API returns 429 (rate limited), parse the body for unlock info
      if (response.status === 429) {
        const data = await response.json();
        return {
          allowed: false,
          reason: 'limit_exceeded',
          message: data.message || 'Usage limit reached',
          current_usage: data.currentUsage,
          usage_limit: data.usageLimit,
          reset_in_seconds: data.resetInSeconds,
          unlock_price: data.unlockPrompt?.price,
          canUnlock: true,
        };
      }
      throw new Error('Feature check failed');
    }

    const data = await response.json();
    return {
      allowed: data.allowed ?? false,
      reason: data.reason || 'check_failed',
      message: data.message || 'Unknown status',
      current_usage: data.current_usage,
      usage_limit: data.usage_limit,
      reset_in_seconds: data.reset_in_seconds,
      unlock_price: data.unlock_price,
      canUnlock: data.canUnlock,
    };
  } catch (error) {
    console.error(`[FeatureGate] Error checking ${featureKey}:`, error);
    // On error, allow the feature to prevent blocking users
    return {
      allowed: true,
      reason: 'check_failed',
      message: 'Could not verify access',
    };
  }
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** Loading spinner shown while checking feature access */
function LoadingState() {
  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      <span className="ml-2 text-sm text-gray-500">Checking access...</span>
    </div>
  );
}

/** Default message shown when feature limit is reached */
function LimitReachedMessage({ 
  feature, 
  result,
  showUnlockPrompt 
}: { 
  feature: string; 
  result: FeatureAccessResult;
  showUnlockPrompt: boolean;
}) {
  const formatResetTime = (seconds?: number) => {
    if (!seconds) return 'soon';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes} minutes`;
    return 'less than a minute';
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-800 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <Lock className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Usage Limit Reached
          </h4>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {result.message || 'You have reached your daily limit for this feature.'}
          </p>
          
          {result.current_usage !== undefined && result.usage_limit !== undefined && (
            <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <span>Used: {result.current_usage}/{result.usage_limit}</span>
              {result.reset_in_seconds && (
                <>
                  <span>•</span>
                  <span>Resets in: {formatResetTime(result.reset_in_seconds)}</span>
                </>
              )}
            </div>
          )}
          
          {showUnlockPrompt && result.canUnlock && result.unlock_price && (
            <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
              <button
                onClick={() => {
                  // Navigate to unlock page or open modal
                  window.location.href = `/billing?unlock=${feature}`;
                }}
                className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100 bg-amber-100 hover:bg-amber-200 dark:bg-amber-800/50 dark:hover:bg-amber-800 rounded-md transition"
              >
                <CreditCard className="w-4 h-4" />
                Unlock Unlimited (₹{result.unlock_price}/mo)
              </button>
            </div>
          )}
          
          {!showUnlockPrompt && (
            <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
              Contact your administrator to unlock this feature.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeatureGate({
  feature,
  children,
  fallback,
  showLoading = true,
  showUnlockPrompt = true,
  onBlocked,
  onAllowed,
  className,
  bypass = false,
}: FeatureGateProps) {
  const [loading, setLoading] = useState(!bypass);
  const [accessResult, setAccessResult] = useState<FeatureAccessResult | null>(null);

  const checkAccess = useCallback(async () => {
    if (bypass) {
      setAccessResult({ allowed: true, reason: 'unlocked', message: 'Bypass enabled' });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const result = await checkFeatureAccess(feature);
      setAccessResult(result);
      
      if (result.allowed) {
        onAllowed?.();
      } else {
        onBlocked?.(result);
      }
    } catch (error) {
      // On error, allow access to prevent blocking
      setAccessResult({ allowed: true, reason: 'check_failed', message: 'Could not verify' });
    } finally {
      setLoading(false);
    }
  }, [feature, bypass, onAllowed, onBlocked]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  // Loading state
  if (loading && showLoading) {
    return <LoadingState />;
  }

  // Access granted
  if (accessResult?.allowed) {
    return <>{children}</>;
  }

  // Access denied - show fallback or default message
  if (fallback) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      <LimitReachedMessage 
        feature={feature} 
        result={accessResult || { allowed: false, reason: 'check_failed', message: 'Access denied' }}
        showUnlockPrompt={showUnlockPrompt}
      />
    </div>
  );
}

// ============================================================================
// HOOK: useFeatureAccess
// ============================================================================

/**
 * Hook to check feature access programmatically
 * 
 * Usage:
 *   const { allowed, loading, checkAccess } = useFeatureAccess('task_creation');
 *   if (!allowed) return <UpgradePrompt />;
 */
export function useFeatureAccess(featureKey: string) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FeatureAccessResult | null>(null);

  const checkAccess = useCallback(async () => {
    setLoading(true);
    try {
      const accessResult = await checkFeatureAccess(featureKey);
      setResult(accessResult);
      return accessResult;
    } finally {
      setLoading(false);
    }
  }, [featureKey]);

  useEffect(() => {
    checkAccess();
  }, [checkAccess]);

  return {
    allowed: result?.allowed ?? true,
    loading,
    result,
    checkAccess,
    currentUsage: result?.current_usage,
    usageLimit: result?.usage_limit,
    canUnlock: result?.canUnlock,
    unlockPrice: result?.unlock_price,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default FeatureGate;
