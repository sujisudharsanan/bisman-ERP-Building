/**
 * BISMAN Internal Operations Hooks
 * 
 * React Query hooks for internal staff operations.
 * These APIs are only accessible to BISMAN internal roles.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// ============================================
// TYPES
// ============================================

export type InternalRole = 
  | 'BISMAN_FINANCE'
  | 'BISMAN_BILLING'
  | 'BISMAN_SUPPORT'
  | 'BISMAN_ENGINEERING'
  | 'BISMAN_CUSTOMER_CARE'
  | 'ENTERPRISE_ADMIN';

export interface InternalTeamMember {
  id: string;
  userId: number;
  name: string;
  email: string;
  role: InternalRole;
  isActive: boolean;
  createdAt: string;
  profilePicUrl: string | null;
  userType: 'ENTERPRISE_ADMIN' | 'INTERNAL_STAFF';
}

export interface SupportSession {
  id: number;
  support_user_id: number;
  target_client_id: string;
  reason: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  ended_at: string | null;
  client_name?: string;
  client_code?: string;
  support_user_name?: string;
  support_user_email?: string;
}

export interface Customer {
  id: string;
  name: string;
  client_code: string | null;
  status: string;
  productType: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  created_at: string;
  last_activity_date: string | null;
}

export interface AuditLogEntry {
  id: number;
  user_id: number;
  action: string;
  table_name: string | null;
  record_id: number | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

// ============================================
// TEAM MANAGEMENT HOOKS
// ============================================

export function useInternalTeam() {
  return useQuery({
    queryKey: ['internal', 'team'],
    queryFn: async () => {
      const { data } = await api.get('/api/internal/team');
      return data as {
        ok: boolean;
        team: InternalTeamMember[];
        roles: InternalRole[];
        permissions: Record<InternalRole, string[]>;
      };
    },
    staleTime: 30000,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { email: string; name: string; role: InternalRole; password?: string }) => {
      const { data } = await api.post('/api/internal/team', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal', 'team'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { userId: number; role?: InternalRole; isActive?: boolean }) => {
      const { data } = await api.patch(`/api/internal/team/${params.userId}`, {
        role: params.role,
        isActive: params.isActive,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal', 'team'] });
    },
  });
}

// ============================================
// SUPPORT SESSION HOOKS
// ============================================

export function useSupportSessions(options?: { status?: 'all' | 'active' | 'expired'; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['internal', 'support-sessions', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.status) params.set('status', options.status);
      if (options?.page) params.set('page', options.page.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      
      const { data } = await api.get(`/api/internal/support-sessions?${params}`);
      return data as {
        ok: boolean;
        sessions: SupportSession[];
        pagination: { page: number; limit: number; total: number };
      };
    },
    staleTime: 10000,
  });
}

export function useActiveSession() {
  return useQuery({
    queryKey: ['internal', 'support-session', 'active'],
    queryFn: async () => {
      const { data } = await api.get('/api/internal/support-session/active');
      return data as { ok: boolean; session: SupportSession | null };
    },
    refetchInterval: 30000, // Check every 30 seconds for session expiry
  });
}

export function useStartSupportSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: { clientId: string; reason: string; durationMinutes?: number }) => {
      const { data } = await api.post('/api/internal/support-session', params);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal', 'support-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['internal', 'support-session', 'active'] });
    },
  });
}

export function useEndSupportSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (sessionId: number) => {
      const { data } = await api.delete(`/api/internal/support-session/${sessionId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internal', 'support-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['internal', 'support-session', 'active'] });
    },
  });
}

// ============================================
// CUSTOMER ASSISTANCE HOOKS
// ============================================

export function useCustomers(options?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['internal', 'customers', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', options.page.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.search) params.set('search', options.search);
      
      const { data } = await api.get(`/api/internal/customers?${params}`);
      return data as {
        ok: boolean;
        customers: Customer[];
        pagination: { page: number; limit: number; total: number };
      };
    },
    staleTime: 30000,
  });
}

export function useCustomerDetail(clientId: string | undefined) {
  return useQuery({
    queryKey: ['internal', 'customer', clientId],
    queryFn: async () => {
      if (!clientId) throw new Error('Client ID required');
      const { data } = await api.get(`/api/internal/customers/${clientId}`);
      return data as {
        ok: boolean;
        customer: Customer & { users?: Array<{ id: number; username: string; email: string; role: string; is_active: boolean }> };
        supportModeActive: boolean;
        accessLevel: 'full' | 'readonly';
      };
    },
    enabled: !!clientId,
    staleTime: 10000,
  });
}

// ============================================
// BILLING & USAGE HOOKS
// ============================================

export function useBillingOverview() {
  return useQuery({
    queryKey: ['internal', 'billing', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/api/internal/billing/overview');
      return data;
    },
    staleTime: 60000,
  });
}

export function useUsageStats(period: '7d' | '30d' | '90d' = '30d') {
  return useQuery({
    queryKey: ['internal', 'usage', period],
    queryFn: async () => {
      const { data } = await api.get(`/api/internal/usage?period=${period}`);
      return data;
    },
    staleTime: 60000,
  });
}

// ============================================
// SYSTEM HEALTH HOOKS
// ============================================

export function useSystemHealth() {
  return useQuery({
    queryKey: ['internal', 'system-health'],
    queryFn: async () => {
      const { data } = await api.get('/api/internal/system-health');
      return data;
    },
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

// ============================================
// AUDIT LOGS HOOKS
// ============================================

export function useInternalAuditLogs(options?: {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['internal', 'audit-logs', options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.page) params.set('page', options.page.toString());
      if (options?.limit) params.set('limit', options.limit.toString());
      if (options?.userId) params.set('userId', options.userId.toString());
      if (options?.action) params.set('action', options.action);
      if (options?.startDate) params.set('startDate', options.startDate);
      if (options?.endDate) params.set('endDate', options.endDate);
      
      const { data } = await api.get(`/api/internal/audit-logs?${params}`);
      return data as {
        ok: boolean;
        logs: AuditLogEntry[];
        pagination: { page: number; limit: number; total: number };
      };
    },
    staleTime: 10000,
  });
}

// ============================================
// UTILITY HOOKS
// ============================================

export function useInternalRolePermissions() {
  const { data } = useInternalTeam();
  
  const hasPermission = (permission: string): boolean => {
    if (!data?.permissions) return false;
    // This would need to be combined with current user's role
    // For now, just return the permission matrix
    return true;
  };
  
  return {
    permissions: data?.permissions || {},
    roles: data?.roles || [],
    hasPermission,
  };
}
