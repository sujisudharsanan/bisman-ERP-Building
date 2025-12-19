/**
 * Admin Creation & Subscription Management Hook
 * ==============================================
 * Custom hook for managing admin creation with subscription assignment
 */

import { useState, useCallback } from 'react';
import type {
  SubscriptionPlan,
  AdminCreationRequest,
  AdminCreationResponse,
  EmailCheckResponse,
  Organization,
  OrganizationListResponse,
  OrganizationDetailResponse,
  SubscriptionUpgradeRequest,
  SubscriptionUpgradeResponse,
  UpdateSubscriptionRequest,
  UpdateSubscriptionResponse,
  PlansResponse,
  UsageLimits,
} from '@/types/subscription';

// ============================================================================
// API BASE URL
// ============================================================================

const getApiUrl = () => process.env.NEXT_PUBLIC_API_URL || '';

// ============================================================================
// HOOK: useAdminCreation
// ============================================================================

export function useAdminCreation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);

  // Fetch available subscription plans
  const fetchPlans = useCallback(async (): Promise<SubscriptionPlan[]> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/api/admin-creation/plans`, {
        method: 'GET',
        credentials: 'include',
      });

      const data: PlansResponse = await response.json();

      if (!data.ok) {
        throw new Error('Failed to fetch plans');
      }

      setPlans(data.plans);
      return data.plans;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch plans';
      setError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Check email availability
  const checkEmailAvailability = useCallback(async (email: string): Promise<EmailCheckResponse> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/admin-creation/check-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (err) {
      return {
        ok: false,
        available: false,
        message: 'Failed to check email availability',
      };
    }
  }, []);

  // Validate admin input
  const validateInput = useCallback(
    async (input: Partial<AdminCreationRequest>): Promise<{ valid: boolean; errors: { field: string; message: string }[] }> => {
      try {
        const response = await fetch(`${getApiUrl()}/api/admin-creation/validate`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        });

        const data = await response.json();
        return {
          valid: data.valid ?? false,
          errors: data.errors ?? [],
        };
      } catch (err) {
        return {
          valid: false,
          errors: [{ field: 'general', message: 'Validation failed' }],
        };
      }
    },
    []
  );

  // Create admin with subscription
  const createAdmin = useCallback(async (request: AdminCreationRequest): Promise<AdminCreationResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/api/admin-creation/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const data: AdminCreationResponse = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to create admin');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create admin';
      setError(message);
      return { ok: false, error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    plans,
    fetchPlans,
    checkEmailAvailability,
    validateInput,
    createAdmin,
  };
}

// ============================================================================
// HOOK: useOrganizations
// ============================================================================

export function useOrganizations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  });

  // Fetch organizations list
  const fetchOrganizations = useCallback(
    async (page = 1, search?: string): Promise<Organization[]> => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pagination.pageSize),
        });
        if (search) {
          params.append('search', search);
        }

        const response = await fetch(`${getApiUrl()}/api/admin-creation/organizations?${params}`, {
          method: 'GET',
          credentials: 'include',
        });

        const data: OrganizationListResponse = await response.json();

        if (!data.ok) {
          throw new Error('Failed to fetch organizations');
        }

        setOrganizations(data.organizations);
        setPagination(data.pagination);
        return data.organizations;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch organizations';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [pagination.pageSize]
  );

  // Get organization detail
  const getOrganization = useCallback(async (orgId: string): Promise<OrganizationDetailResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/api/admin-creation/organizations/${orgId}`, {
        method: 'GET',
        credentials: 'include',
      });

      const data: OrganizationDetailResponse = await response.json();

      if (!data.ok) {
        throw new Error('Failed to fetch organization');
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch organization';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get organization usage
  const getOrganizationUsage = useCallback(async (orgId: string): Promise<UsageLimits | null> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/admin-creation/organizations/${orgId}/usage`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error('Failed to fetch usage');
      }

      return data.usage;
    } catch (err) {
      return null;
    }
  }, []);

  // Toggle organization status
  const toggleOrganizationStatus = useCallback(
    async (orgId: string, isActive: boolean, reason?: string): Promise<boolean> => {
      setLoading(true);
      try {
        const response = await fetch(`${getApiUrl()}/api/admin-creation/organizations/${orgId}/toggle-status`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isActive, reason }),
        });

        const data = await response.json();
        return data.ok ?? false;
      } catch (err) {
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    organizations,
    pagination,
    fetchOrganizations,
    getOrganization,
    getOrganizationUsage,
    toggleOrganizationStatus,
  };
}

// ============================================================================
// HOOK: useSubscriptionManagement
// ============================================================================

export function useSubscriptionManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Upgrade subscription
  const upgradeSubscription = useCallback(
    async (request: SubscriptionUpgradeRequest): Promise<SubscriptionUpgradeResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${getApiUrl()}/api/admin-creation/organizations/${request.organizationId}/subscription`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              planCode: request.newPlanCode,
              billingCycle: request.billingCycle,
              action: 'UPGRADE',
            }),
          }
        );

        const data: SubscriptionUpgradeResponse = await response.json();

        if (!data.ok) {
          throw new Error(data.error || 'Failed to upgrade subscription');
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to upgrade subscription';
        setError(message);
        return { ok: false, error: message };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Update subscription (generic)
  const updateSubscription = useCallback(
    async (request: UpdateSubscriptionRequest): Promise<UpdateSubscriptionResponse> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `${getApiUrl()}/api/admin-creation/organizations/${request.organizationId}/subscription`,
          {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(request),
          }
        );

        const data: UpdateSubscriptionResponse = await response.json();

        if (!data.ok) {
          throw new Error('Failed to update subscription');
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update subscription';
        setError(message);
        return {
          ok: false,
          message,
          subscription: {} as any,
        };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Cancel subscription
  const cancelSubscription = useCallback(async (organizationId: string, reason?: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/admin-creation/organizations/${organizationId}/subscription`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'CANCEL', reason }),
        }
      );

      const data = await response.json();
      return data.ok ?? false;
    } catch (err) {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reactivate subscription
  const reactivateSubscription = useCallback(async (organizationId: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(
        `${getApiUrl()}/api/admin-creation/organizations/${organizationId}/subscription`,
        {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'REACTIVATE' }),
        }
      );

      const data = await response.json();
      return data.ok ?? false;
    } catch (err) {
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    upgradeSubscription,
    updateSubscription,
    cancelSubscription,
    reactivateSubscription,
  };
}

// ============================================================================
// HOOK: useSubscriptionEnforcement
// ============================================================================

export function useSubscriptionEnforcement() {
  // Check if a feature is available
  const checkFeature = useCallback(async (feature: string): Promise<boolean> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/subscription/check-feature`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feature }),
      });

      const data = await response.json();
      return data.hasAccess ?? false;
    } catch (err) {
      return false;
    }
  }, []);

  // Check if user is within limits
  const checkLimit = useCallback(
    async (limitType: 'users' | 'branches' | 'storage' | 'api_calls'): Promise<{ allowed: boolean; current: number; max: number }> => {
      try {
        const response = await fetch(`${getApiUrl()}/api/subscription/check-limit`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ limitType }),
        });

        const data = await response.json();
        return {
          allowed: data.allowed ?? false,
          current: data.current ?? 0,
          max: data.max ?? 0,
        };
      } catch (err) {
        return { allowed: false, current: 0, max: 0 };
      }
    },
    []
  );

  // Get current usage limits
  const getCurrentUsage = useCallback(async (): Promise<UsageLimits | null> => {
    try {
      const response = await fetch(`${getApiUrl()}/api/subscription/usage`, {
        method: 'GET',
        credentials: 'include',
      });

      const data = await response.json();

      if (!data.ok) {
        return null;
      }

      return data.usage;
    } catch (err) {
      return null;
    }
  }, []);

  return {
    checkFeature,
    checkLimit,
    getCurrentUsage,
  };
}
