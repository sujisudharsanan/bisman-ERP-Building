/**
 * Review API Client
 * 
 * API functions for post-completion task reviews.
 * Allows forwarding completed tasks for FYI, confirmation, audit, or knowledge purposes.
 */

import apiClient from '@/services/apiClient';
import {
  TaskReview,
  ReviewComment,
  ReviewPurpose,
  ReviewStats,
  ReviewAuditEntry,
  PendingReviewsResponse,
  ReviewDetailsResponse,
  ReviewAuditResponse,
  ReviewPurposeOption,
} from '@/types/task';

// ============================================
// SEND FOR REVIEW
// ============================================

export interface SendForReviewRequest {
  taskId: number;
  reviewerId?: number;
  reviewerDepartmentId?: string;
  purpose?: ReviewPurpose;
  note?: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  expiryDays?: number;
  priority?: 'low' | 'normal' | 'high';
}

export interface SendForReviewResponse {
  success: boolean;
  message: string;
  review: TaskReview;
}

/**
 * Send a completed task for review
 */
export async function sendForReview(
  request: SendForReviewRequest
): Promise<SendForReviewResponse> {
  const response = await apiClient.post<SendForReviewResponse>(
    '/api/reviews',
    request
  );
  return response.data;
}

// ============================================
// ACKNOWLEDGE REVIEW
// ============================================

export interface AcknowledgeReviewRequest {
  reviewId: string;
  acknowledgmentNote?: string;
}

export interface AcknowledgeReviewResponse {
  success: boolean;
  message: string;
  review: TaskReview;
}

/**
 * Acknowledge a review
 */
export async function acknowledgeReview(
  request: AcknowledgeReviewRequest
): Promise<AcknowledgeReviewResponse> {
  const { reviewId, acknowledgmentNote } = request;
  const response = await apiClient.post<AcknowledgeReviewResponse>(
    `/api/reviews/${reviewId}/acknowledge`,
    { acknowledgmentNote }
  );
  return response.data;
}

// ============================================
// ADD COMMENT
// ============================================

export interface AddReviewCommentRequest {
  reviewId: string;
  content: string;
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size?: number;
  }>;
  parentId?: string;
}

export interface AddReviewCommentResponse {
  success: boolean;
  message: string;
  comment: ReviewComment;
}

/**
 * Add a comment to a review
 */
export async function addReviewComment(
  request: AddReviewCommentRequest
): Promise<AddReviewCommentResponse> {
  const { reviewId, ...body } = request;
  const response = await apiClient.post<AddReviewCommentResponse>(
    `/api/reviews/${reviewId}/comment`,
    body
  );
  return response.data;
}

// ============================================
// CANCEL REVIEW
// ============================================

export interface CancelReviewRequest {
  reviewId: string;
  reason?: string;
}

export interface CancelReviewResponse {
  success: boolean;
  message: string;
  review: TaskReview;
}

/**
 * Cancel a review request
 */
export async function cancelReview(
  request: CancelReviewRequest
): Promise<CancelReviewResponse> {
  const { reviewId, reason } = request;
  const response = await apiClient.post<CancelReviewResponse>(
    `/api/reviews/${reviewId}/cancel`,
    { reason }
  );
  return response.data;
}

// ============================================
// GET PENDING REVIEWS
// ============================================

export interface GetPendingReviewsParams {
  page?: number;
  limit?: number;
}

/**
 * Get pending reviews for the current user
 */
export async function getPendingReviews(
  params: GetPendingReviewsParams = {}
): Promise<PendingReviewsResponse> {
  const { page = 1, limit = 20 } = params;
  const response = await apiClient.get<PendingReviewsResponse>(
    '/api/reviews/pending',
    { params: { page, limit } }
  );
  return response.data;
}

// ============================================
// GET SENT REVIEWS
// ============================================

export interface GetSentReviewsParams {
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * Get reviews sent by the current user
 */
export async function getSentReviews(
  params: GetSentReviewsParams = {}
): Promise<PendingReviewsResponse> {
  const { page = 1, limit = 20, status } = params;
  const response = await apiClient.get<PendingReviewsResponse>(
    '/api/reviews/sent',
    { params: { page, limit, status } }
  );
  return response.data;
}

// ============================================
// GET TASK REVIEWS
// ============================================

export interface GetTaskReviewsParams {
  taskId: number;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface GetTaskReviewsResponse {
  success: boolean;
  reviews: TaskReview[];
}

/**
 * Get all reviews for a specific task
 */
export async function getTaskReviews(
  params: GetTaskReviewsParams
): Promise<GetTaskReviewsResponse> {
  const { taskId, status, limit = 50, offset = 0 } = params;
  const response = await apiClient.get<GetTaskReviewsResponse>(
    `/api/reviews/task/${taskId}`,
    { params: { status, limit, offset } }
  );
  return response.data;
}

// ============================================
// GET REVIEW DETAILS
// ============================================

/**
 * Get review details with comments
 */
export async function getReviewDetails(
  reviewId: string
): Promise<ReviewDetailsResponse> {
  const response = await apiClient.get<ReviewDetailsResponse>(
    `/api/reviews/${reviewId}`
  );
  return response.data;
}

// ============================================
// GET REVIEW AUDIT
// ============================================

/**
 * Get audit trail for a review
 */
export async function getReviewAudit(
  reviewId: string
): Promise<ReviewAuditResponse> {
  const response = await apiClient.get<ReviewAuditResponse>(
    `/api/reviews/${reviewId}/audit`
  );
  return response.data;
}

// ============================================
// GET REVIEW STATS
// ============================================

export interface GetReviewStatsResponse {
  success: boolean;
  stats: ReviewStats;
}

/**
 * Get review statistics for the current user
 */
export async function getReviewStats(): Promise<GetReviewStatsResponse> {
  const response = await apiClient.get<GetReviewStatsResponse>(
    '/api/reviews/stats'
  );
  return response.data;
}

// ============================================
// GET REVIEW PURPOSES
// ============================================

export interface GetReviewPurposesResponse {
  success: boolean;
  purposes: ReviewPurposeOption[];
}

/**
 * Get available review purposes with descriptions
 */
export async function getReviewPurposes(): Promise<GetReviewPurposesResponse> {
  const response = await apiClient.get<GetReviewPurposesResponse>(
    '/api/reviews/meta/purposes'
  );
  return response.data;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get purpose display label
 */
export function getPurposeLabel(purpose: ReviewPurpose): string {
  const labels: Record<ReviewPurpose, string> = {
    [ReviewPurpose.FYI]: 'For Information Only',
    [ReviewPurpose.CONFIRMATION]: 'Request Confirmation',
    [ReviewPurpose.AUDIT]: 'Audit Review',
    [ReviewPurpose.KNOWLEDGE]: 'Knowledge Sharing',
  };
  return labels[purpose] || purpose;
}

/**
 * Get purpose description
 */
export function getPurposeDescription(purpose: ReviewPurpose): string {
  const descriptions: Record<ReviewPurpose, string> = {
    [ReviewPurpose.FYI]: 'No action required, just informing',
    [ReviewPurpose.CONFIRMATION]: 'Please confirm you have reviewed and understood',
    [ReviewPurpose.AUDIT]: 'For compliance or audit documentation',
    [ReviewPurpose.KNOWLEDGE]: 'For training or future reference',
  };
  return descriptions[purpose] || '';
}

/**
 * Get purpose badge color
 */
export function getPurposeBadgeColor(purpose: ReviewPurpose): string {
  const colors: Record<ReviewPurpose, string> = {
    [ReviewPurpose.FYI]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    [ReviewPurpose.CONFIRMATION]: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    [ReviewPurpose.AUDIT]: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    [ReviewPurpose.KNOWLEDGE]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  };
  return colors[purpose] || 'bg-gray-100 text-gray-700';
}

/**
 * Check if review can be acknowledged
 */
export function canAcknowledge(review: TaskReview): boolean {
  return review.status === 'PENDING' || review.status === 'COMMENTED';
}

/**
 * Check if review can be cancelled
 */
export function canCancel(review: TaskReview): boolean {
  return review.status === 'PENDING' || review.status === 'COMMENTED';
}

/**
 * Check if review can receive comments
 */
export function canComment(review: TaskReview): boolean {
  return review.status !== 'CANCELLED' && review.status !== 'EXPIRED';
}
