/**
 * useSubscriptionLimits Hook
 * 
 * Fetches and provides subscription-based user limits for the current tenant.
 * Used by Admin UI to:
 * - Show remaining user slots
 * - Disable "Add User" when limit reached
 * - Display upgrade prompts
 */

import { useState, useEffect, useCallback } from 'react';

export interface SubscriptionLimitsInfo {
  has_subscription: boolean;
  plan_name?: string;
  plan_id?: number;
  subscription_status?: string;
  max_users?: number;
  current_user_count?: number;
  current_active_user_count?: number;
  remaining_slots?: number | 'unlimited';
  can_create_user: boolean;
  can_activate_user: boolean;
  limit_message?: string;
  usage_percentage?: number;
  message?: string;
}

interface UseSubscriptionLimitsResult {
  limits: SubscriptionLimitsInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Convenience derived values
  canCreateUser: boolean;
  canActivateUser: boolean;
  isLimitReached: boolean;
  usagePercentage: number;
  remainingSlots: number | 'unlimited';
  // Additional convenience values for UI
  activeUsers: number;
  maxUsers: number | null;
  planName: string | null;
}

export function useSubscriptionLimits(): UseSubscriptionLimitsResult {
  const [limits, setLimits] = useState<SubscriptionLimitsInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/system/users/subscription-info', {
        credentials: 'include',
      });

      if (!response.ok) {
        // Non-critical - allow action but log
        console.warn('[useSubscriptionLimits] Failed to fetch limits:', response.status);
        setLimits({
          has_subscription: false,
          can_create_user: false,
          can_activate_user: false,
        });
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setLimits(data.data);
      } else {
        // SECURITY FIX: Fail-closed on API error response
        setLimits({
          has_subscription: false,
          can_create_user: false,
          can_activate_user: false,
        });
      }
    } catch (err) {
      console.error('[useSubscriptionLimits] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription limits');
      // SECURITY FIX: Fail-closed - deny action on error instead of allowing
      setLimits({
        has_subscription: false,
        can_create_user: false,
        can_activate_user: false,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  // Derived values with safe defaults
  const canCreateUser = limits?.can_create_user ?? true;
  const canActivateUser = limits?.can_activate_user ?? true;
  const isLimitReached = !canCreateUser;
  const usagePercentage = limits?.usage_percentage ?? 0;
  const remainingSlots = limits?.remaining_slots ?? 'unlimited';
  const activeUsers = limits?.current_active_user_count ?? limits?.current_user_count ?? 0;
  const maxUsers = limits?.max_users === -1 ? null : (limits?.max_users ?? null);
  const planName = limits?.plan_name ?? null;

  return {
    limits,
    loading,
    error,
    refresh: fetchLimits,
    canCreateUser,
    canActivateUser,
    isLimitReached,
    usagePercentage,
    remainingSlots,
    activeUsers,
    maxUsers,
    planName,
  };
}
