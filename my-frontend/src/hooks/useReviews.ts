/**
 * Review Hooks
 * 
 * React Query hooks for post-completion task reviews.
 * Manages fetching, caching, and mutations for review operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  sendForReview,
  acknowledgeReview,
  addReviewComment,
  cancelReview,
  getPendingReviews,
  getSentReviews,
  getTaskReviews,
  getReviewDetails,
  getReviewAudit,
  getReviewStats,
  getReviewPurposes,
  SendForReviewRequest,
  AcknowledgeReviewRequest,
  AddReviewCommentRequest,
  CancelReviewRequest,
  GetPendingReviewsParams,
  GetSentReviewsParams,
  GetTaskReviewsParams,
} from '@/api/reviewApi';

// ============================================
// QUERY KEYS
// ============================================

export const reviewKeys = {
  all: ['reviews'] as const,
  pending: (params?: GetPendingReviewsParams) => 
    [...reviewKeys.all, 'pending', params] as const,
  sent: (params?: GetSentReviewsParams) => 
    [...reviewKeys.all, 'sent', params] as const,
  task: (taskId: number, status?: string) => 
    [...reviewKeys.all, 'task', taskId, status] as const,
  detail: (reviewId: string) => 
    [...reviewKeys.all, 'detail', reviewId] as const,
  audit: (reviewId: string) => 
    [...reviewKeys.all, 'audit', reviewId] as const,
  stats: () => [...reviewKeys.all, 'stats'] as const,
  purposes: () => [...reviewKeys.all, 'purposes'] as const,
};

// ============================================
// QUERY HOOKS
// ============================================

/**
 * Get pending reviews for the current user
 */
export function usePendingReviews(params: GetPendingReviewsParams = {}) {
  return useQuery({
    queryKey: reviewKeys.pending(params),
    queryFn: () => getPendingReviews(params),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

/**
 * Get reviews sent by the current user
 */
export function useSentReviews(params: GetSentReviewsParams = {}) {
  return useQuery({
    queryKey: reviewKeys.sent(params),
    queryFn: () => getSentReviews(params),
    staleTime: 30 * 1000,
  });
}

/**
 * Get all reviews for a specific task
 */
export function useTaskReviews(
  taskId: number | undefined,
  options: Omit<GetTaskReviewsParams, 'taskId'> = {}
) {
  return useQuery({
    queryKey: reviewKeys.task(taskId!, options.status),
    queryFn: () => getTaskReviews({ taskId: taskId!, ...options }),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get review details with comments
 */
export function useReviewDetails(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.detail(reviewId!),
    queryFn: () => getReviewDetails(reviewId!),
    enabled: !!reviewId,
    staleTime: 15 * 1000,
  });
}

/**
 * Get audit trail for a review
 */
export function useReviewAudit(reviewId: string | undefined) {
  return useQuery({
    queryKey: reviewKeys.audit(reviewId!),
    queryFn: () => getReviewAudit(reviewId!),
    enabled: !!reviewId,
    staleTime: 30 * 1000,
  });
}

/**
 * Get review statistics for the current user
 */
export function useReviewStats() {
  return useQuery({
    queryKey: reviewKeys.stats(),
    queryFn: () => getReviewStats(),
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000, // Refetch every 2 minutes
  });
}

/**
 * Get available review purposes
 */
export function useReviewPurposes() {
  return useQuery({
    queryKey: reviewKeys.purposes(),
    queryFn: () => getReviewPurposes(),
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - rarely changes
  });
}

// ============================================
// MUTATION HOOKS
// ============================================

/**
 * Send a completed task for review
 */
export function useSendForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SendForReviewRequest) => sendForReview(request),
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.sent() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.task(variables.taskId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.stats() });
      
      // Invalidate task queries to update has_pending_review flag
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] });
      
      toast.success('Task sent for review successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to send task for review');
    },
  });
}

/**
 * Acknowledge a review
 */
export function useAcknowledgeReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AcknowledgeReviewRequest) => acknowledgeReview(request),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.pending() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(data.review.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.task(data.review.taskId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.stats() });
      
      // Invalidate task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.review.taskId] });
      
      toast.success('Review acknowledged successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to acknowledge review');
    },
  });
}

/**
 * Add a comment to a review
 */
export function useAddReviewComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AddReviewCommentRequest) => addReviewComment(request),
    onSuccess: (data, variables) => {
      // Invalidate review details to show new comment
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(variables.reviewId) });
      
      toast.success('Comment added successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add comment');
    },
  });
}

/**
 * Cancel a review request
 */
export function useCancelReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CancelReviewRequest) => cancelReview(request),
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: reviewKeys.sent() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.pending() });
      queryClient.invalidateQueries({ queryKey: reviewKeys.detail(data.review.id) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.task(data.review.taskId) });
      queryClient.invalidateQueries({ queryKey: reviewKeys.stats() });
      
      // Invalidate task queries
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', data.review.taskId] });
      
      toast.success('Review cancelled successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to cancel review');
    },
  });
}

// ============================================
// HELPER HOOKS
// ============================================

/**
 * Check if user has pending reviews (for badge/notification)
 */
export function useHasPendingReviews() {
  const { data, isLoading } = useReviewStats();
  
  return {
    hasPending: (data?.stats?.pendingToReview ?? 0) > 0,
    pendingCount: data?.stats?.pendingToReview ?? 0,
    isLoading,
  };
}

/**
 * Prefetch review details
 */
export function usePrefetchReviewDetails() {
  const queryClient = useQueryClient();
  
  return (reviewId: string) => {
    queryClient.prefetchQuery({
      queryKey: reviewKeys.detail(reviewId),
      queryFn: () => getReviewDetails(reviewId),
      staleTime: 15 * 1000,
    });
  };
}
