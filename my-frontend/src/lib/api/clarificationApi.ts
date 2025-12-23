/**
 * Clarification API Functions
 * 
 * API client for task clarification operations
 */

import { 
  TaskClarification, 
  ClarificationAuditEntry,
  PendingClarificationsResponse,
  ClarificationStats,
  ClarificationUrgency,
} from '@/types/task';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// Helper for API calls
async function apiCall<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}/api/clarifications${endpoint}`, {
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
// REQUEST CLARIFICATION
// ============================================

export interface RequestClarificationParams {
  taskId: number;
  responderId?: number;
  responderDepartmentId?: string;
  question: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
  pauseSla?: boolean;
  expiryHours?: number;
  urgency?: ClarificationUrgency;
}

export interface RequestClarificationResponse {
  success: boolean;
  clarification: TaskClarification;
  message: string;
}

export async function requestClarification(
  params: RequestClarificationParams
): Promise<RequestClarificationResponse> {
  return apiCall<RequestClarificationResponse>('', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

// ============================================
// RESPOND TO CLARIFICATION
// ============================================

export interface RespondToClarificationParams {
  clarificationId: string;
  response: string;
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    type: string;
  }>;
}

export interface RespondToClarificationResponse {
  success: boolean;
  taskResumed: boolean;
  remainingPending: number;
  message: string;
}

export async function respondToClarification(
  params: RespondToClarificationParams
): Promise<RespondToClarificationResponse> {
  const { clarificationId, ...body } = params;
  return apiCall<RespondToClarificationResponse>(`/${clarificationId}/respond`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ============================================
// CANCEL CLARIFICATION
// ============================================

export interface CancelClarificationParams {
  clarificationId: string;
  reason?: string;
}

export interface CancelClarificationResponse {
  success: boolean;
  taskResumed: boolean;
  message: string;
}

export async function cancelClarification(
  params: CancelClarificationParams
): Promise<CancelClarificationResponse> {
  const { clarificationId, ...body } = params;
  return apiCall<CancelClarificationResponse>(`/${clarificationId}/cancel`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ============================================
// GET CLARIFICATIONS
// ============================================

export async function getClarificationById(
  clarificationId: string
): Promise<{ success: boolean; clarification: TaskClarification }> {
  return apiCall<{ success: boolean; clarification: TaskClarification }>(
    `/${clarificationId}`
  );
}

export async function getTaskClarifications(
  taskId: number,
  options?: { status?: string; includeResponded?: boolean }
): Promise<{ success: boolean; clarifications: TaskClarification[]; count: number }> {
  const params = new URLSearchParams();
  if (options?.status) params.set('status', options.status);
  if (options?.includeResponded !== undefined) {
    params.set('includeResponded', String(options.includeResponded));
  }
  
  const query = params.toString();
  return apiCall<{ success: boolean; clarifications: TaskClarification[]; count: number }>(
    `/task/${taskId}${query ? `?${query}` : ''}`
  );
}

export async function getPendingClarifications(
  options?: { page?: number; limit?: number }
): Promise<PendingClarificationsResponse> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  
  const query = params.toString();
  return apiCall<PendingClarificationsResponse>(
    `/pending${query ? `?${query}` : ''}`
  );
}

export async function getClarificationAuditLog(
  clarificationId: string
): Promise<{ success: boolean; auditLog: ClarificationAuditEntry[] }> {
  return apiCall<{ success: boolean; auditLog: ClarificationAuditEntry[] }>(
    `/${clarificationId}/audit`
  );
}

export async function getClarificationStats(): Promise<{
  success: boolean;
  stats: ClarificationStats;
}> {
  return apiCall<{ success: boolean; stats: ClarificationStats }>('/stats');
}
