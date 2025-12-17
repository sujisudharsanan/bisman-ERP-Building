/**
 * 🎯 BISMAN ERP – usePlaybooks Hook
 * 
 * React hook for managing support playbooks data.
 * 
 * Features:
 * - Fetch all playbooks with filtering
 * - Get single playbook
 * - Create/Update/Delete (ENTERPRISE_ADMIN only)
 * - Caching and loading states
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// ============================================
// TYPES
// ============================================

export interface PlaybookStep {
  step: number;
  action: string;
  details?: string;
  auditRequired?: boolean;
}

export interface PlaybookRule {
  type: 'do' | 'dont';
  text: string;
}

export interface Playbook {
  id: string;
  title: string;
  category: 'access' | 'billing' | 'permissions' | 'support' | 'security';
  situation: string;
  steps: PlaybookStep[];
  rules: PlaybookRule[];
  auditNotes: string[];
  relatedLinks: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PlaybookFilters {
  category?: string;
  search?: string;
}

export interface CreatePlaybookData {
  title: string;
  category: Playbook['category'];
  situation: string;
  steps: PlaybookStep[];
  rules?: PlaybookRule[];
  auditNotes?: string[];
  relatedLinks?: string[];
}

export interface UpdatePlaybookData extends Partial<CreatePlaybookData> {}

// ============================================
// API FUNCTIONS
// ============================================

const API_BASE = '/api/internal/playbooks';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ============================================
// HOOK: usePlaybooks
// ============================================

export function usePlaybooks(filters?: PlaybookFilters) {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybooks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters?.category) params.set('category', filters.category);
      if (filters?.search) params.set('search', filters.search);

      const queryString = params.toString();
      const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

      const result = await fetchWithAuth(url);
      setPlaybooks(result.data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playbooks';
      setError(message);
      console.error('[usePlaybooks] Error:', message);
    } finally {
      setLoading(false);
    }
  }, [filters?.category, filters?.search]);

  useEffect(() => {
    fetchPlaybooks();
  }, [fetchPlaybooks]);

  return {
    playbooks,
    loading,
    error,
    refetch: fetchPlaybooks,
  };
}

// ============================================
// HOOK: usePlaybook (single)
// ============================================

export function usePlaybook(id: string | null) {
  const [playbook, setPlaybook] = useState<Playbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlaybook = useCallback(async () => {
    if (!id) {
      setPlaybook(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchWithAuth(`${API_BASE}/${id}`);
      setPlaybook(result.data || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch playbook';
      setError(message);
      console.error('[usePlaybook] Error:', message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPlaybook();
  }, [fetchPlaybook]);

  return {
    playbook,
    loading,
    error,
    refetch: fetchPlaybook,
  };
}

// ============================================
// HOOK: usePlaybookMutations
// ============================================

export function usePlaybookMutations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const canManage = user?.role === 'ENTERPRISE_ADMIN';

  const createPlaybook = useCallback(async (data: CreatePlaybookData): Promise<Playbook | null> => {
    if (!canManage) {
      setError('Only ENTERPRISE_ADMIN can create playbooks');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchWithAuth(API_BASE, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create playbook';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const updatePlaybook = useCallback(async (id: string, data: UpdatePlaybookData): Promise<Playbook | null> => {
    if (!canManage) {
      setError('Only ENTERPRISE_ADMIN can update playbooks');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const result = await fetchWithAuth(`${API_BASE}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });

      return result.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update playbook';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  const deletePlaybook = useCallback(async (id: string): Promise<boolean> => {
    if (!canManage) {
      setError('Only ENTERPRISE_ADMIN can delete playbooks');
      return false;
    }

    try {
      setLoading(true);
      setError(null);

      await fetchWithAuth(`${API_BASE}/${id}`, {
        method: 'DELETE',
      });

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete playbook';
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [canManage]);

  return {
    createPlaybook,
    updatePlaybook,
    deletePlaybook,
    loading,
    error,
    canManage,
  };
}

// ============================================
// HOOK: usePlaybookCategories
// ============================================

export const PLAYBOOK_CATEGORIES = [
  { id: 'access', label: 'Access Issues', color: 'blue' },
  { id: 'billing', label: 'Billing', color: 'green' },
  { id: 'permissions', label: 'Permissions', color: 'purple' },
  { id: 'support', label: 'Support Sessions', color: 'orange' },
  { id: 'security', label: 'Security', color: 'red' },
] as const;

export function usePlaybookCategories() {
  return {
    categories: PLAYBOOK_CATEGORIES,
    getCategory: (id: string) => PLAYBOOK_CATEGORIES.find(c => c.id === id),
  };
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default usePlaybooks;
