/**
 * Clarification Hooks
 * 
 * React Query hooks for task clarification operations
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './useToast';
import {
  requestClarification,
  respondToClarification,
  cancelClarification,
  getClarificationById,
  getTaskClarifications,
  getPendingClarifications,
  getClarificationAuditLog,
  getClarificationStats,
  RequestClarificationParams,
  RespondToClarificationParams,
  CancelClarificationParams,
} from '@/lib/api/clarificationApi';

// Query keys
export const clarificationKeys = {
  all: ['clarifications'] as const,
  pending: () => [...clarificationKeys.all, 'pending'] as const,
  stats: () => [...clarificationKeys.all, 'stats'] as const,
  byId: (id: string) => [...clarificationKeys.all, 'detail', id] as const,
  byTask: (taskId: number) => [...clarificationKeys.all, 'task', taskId] as const,
  audit: (id: string) => [...clarificationKeys.all, 'audit', id] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get pending clarifications for the current user
 */
export function usePendingClarifications(options?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: [...clarificationKeys.pending(), options],
    queryFn: () => getPendingClarifications(options),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get clarification by ID
 */
export function useClarification(clarificationId: string | null) {
  return useQuery({
    queryKey: clarificationKeys.byId(clarificationId || ''),
    queryFn: () => getClarificationById(clarificationId!),
    enabled: !!clarificationId,
  });
}

/**
 * Get all clarifications for a task
 */
export function useTaskClarifications(
  taskId: number | null,
  options?: { status?: string; includeResponded?: boolean }
) {
  return useQuery({
    queryKey: [...clarificationKeys.byTask(taskId || 0), options],
    queryFn: () => getTaskClarifications(taskId!, options),
    enabled: !!taskId,
  });
}

/**
 * Get clarification audit log
 */
export function useClarificationAuditLog(clarificationId: string | null) {
  return useQuery({
    queryKey: clarificationKeys.audit(clarificationId || ''),
    queryFn: () => getClarificationAuditLog(clarificationId!),
    enabled: !!clarificationId,
  });
}

/**
 * Get clarification statistics
 */
export function useClarificationStats() {
  return useQuery({
    queryKey: clarificationKeys.stats(),
    queryFn: getClarificationStats,
    staleTime: 60000, // 1 minute
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Request clarification on a task
 */
export function useRequestClarification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: RequestClarificationParams) => requestClarification(params),
    onSuccess: (data, variables) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: clarificationKeys.byTask(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: clarificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['tasks', variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: 'Clarification Requested',
        description: data.message || 'Your clarification request has been sent.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Request Failed',
        description: error.message || 'Failed to request clarification.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Respond to a clarification request
 */
export function useRespondToClarification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: RespondToClarificationParams) => respondToClarification(params),
    onSuccess: (data, variables) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: clarificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: 'Response Submitted',
        description: data.message || 'Your response has been recorded.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Response Failed',
        description: error.message || 'Failed to submit response.',
        variant: 'destructive',
      });
    },
  });
}

/**
 * Cancel a pending clarification
 */
export function useCancelClarification() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: (params: CancelClarificationParams) => cancelClarification(params),
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: clarificationKeys.all });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      toast({
        title: 'Clarification Cancelled',
        description: data.message || 'The clarification request has been cancelled.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Cancellation Failed',
        description: error.message || 'Failed to cancel clarification.',
        variant: 'destructive',
      });
    },
  });
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Hook to check if current user has pending clarifications
 */
export function useHasPendingClarifications() {
  const { data } = usePendingClarifications({ limit: 1 });
  return (data?.total ?? 0) > 0;
}

/**
 * Hook to get pending clarification count
 */
export function usePendingClarificationCount() {
  const { data, isLoading } = usePendingClarifications({ limit: 1 });
  return {
    count: data?.total ?? 0,
    isLoading,
  };
}
