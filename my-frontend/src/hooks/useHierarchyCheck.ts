/**
 * useHierarchyCheck Hook
 * 
 * Checks if assigning a task to a user violates the hierarchy rule
 * (subordinates cannot assign directly to superiors)
 * 
 * Returns hierarchy info to be used by TaskRequestModal
 */

import { useState, useCallback } from 'react';

export interface HierarchyCheckResult {
  isViolation: boolean;
  creatorLevel: number;
  assigneeLevel: number;
  creatorRoleName: string;
  assigneeRoleName: string;
}

export interface HierarchyUser {
  id: string;  // UUID string
  username?: string;
  fullName?: string;
  role?: string;
  roleName?: string;
  roleLevel?: number;
}

interface UseHierarchyCheckReturn {
  checkHierarchy: (assigneeId: string) => Promise<HierarchyCheckResult | null>;
  loading: boolean;
  error: string | null;
  lastCheck: HierarchyCheckResult | null;
  clearCheck: () => void;
}

export function useHierarchyCheck(): UseHierarchyCheckReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<HierarchyCheckResult | null>(null);

  const checkHierarchy = useCallback(async (assigneeId: string): Promise<HierarchyCheckResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/task-requests/check-hierarchy/${assigneeId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to check hierarchy');
      }

      const data = await response.json();
      
      const result: HierarchyCheckResult = {
        isViolation: data.isViolation || false,
        creatorLevel: data.creatorLevel || 0,
        assigneeLevel: data.assigneeLevel || 0,
        creatorRoleName: data.creatorRoleName || 'Unknown',
        assigneeRoleName: data.assigneeRoleName || 'Unknown',
      };

      setLastCheck(result);
      return result;
    } catch (err: any) {
      console.error('[useHierarchyCheck] Error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearCheck = useCallback(() => {
    setLastCheck(null);
    setError(null);
  }, []);

  return {
    checkHierarchy,
    loading,
    error,
    lastCheck,
    clearCheck,
  };
}

export default useHierarchyCheck;
