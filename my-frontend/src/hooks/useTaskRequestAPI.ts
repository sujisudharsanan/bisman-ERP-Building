/**
 * Task Request API Hook
 * Handles hierarchical task request workflow
 */

import { useState, useCallback } from 'react';

// Request Status enum
export const RequestStatus = {
  REQUESTED: 'REQUESTED',
  NEED_INFO: 'NEED_INFO',
  DEFERRED: 'DEFERRED',
  ACCEPTED: 'ACCEPTED',
  DELEGATED: 'DELEGATED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
} as const;

export type RequestStatusType = typeof RequestStatus[keyof typeof RequestStatus];

// Request interface
export interface TaskRequest {
  id: number;
  request_number: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  suggested_due_date?: string;
  requested_by: number;
  requested_to: number;
  requester_role_level: number;
  target_role_level: number;
  status: RequestStatusType;
  resolved_at?: string;
  resolved_by?: number;
  resolution_action?: string;
  resolution_reason?: string;
  converted_task_id?: number;
  delegated_to?: number;
  deferred_until?: string;
  clarification_count: number;
  last_clarification_at?: string;
  watcher_ids: number[];
  tags: string[];
  tenant_id?: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  requester_name?: string;
  requester_email?: string;
  requester_role?: string;
  target_name?: string;
  target_email?: string;
  target_role?: string;
  message_count?: number;
  unread_count?: number;
}

// Hierarchy check result
export interface HierarchyCheckResult {
  canAssignDirectly: boolean;
  requiresRequest: boolean;
  reason: string;
  creatorLevel?: number;
  assigneeLevel?: number;
  creatorRoleName?: string;
  assigneeRoleName?: string;
}

// Request permissions
export interface RequestPermissions {
  isRequester: boolean;
  isTarget: boolean;
  canModify: boolean;
  availableActions: string[];
}

// API response types
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function useTaskRequestAPI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper for API calls
  const apiCall = useCallback(async <T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Request failed');
    }

    return data;
  }, []);

  /**
   * Check if direct assignment is allowed or request is required
   */
  const checkHierarchy = useCallback(async (assigneeId: number | string): Promise<HierarchyCheckResult> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{ success: boolean } & HierarchyCheckResult>(
        '/api/task-requests/check-hierarchy',
        {
          method: 'POST',
          body: JSON.stringify({ assigneeId })
        }
      );

      return {
        canAssignDirectly: result.canAssignDirectly,
        requiresRequest: result.requiresRequest,
        reason: result.reason,
        creatorLevel: result.creatorLevel,
        assigneeLevel: result.assigneeLevel,
        creatorRoleName: result.creatorRoleName,
        assigneeRoleName: result.assigneeRoleName
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Get user's role level
   */
  const getUserRoleLevel = useCallback(async (userId: number): Promise<{ level: number; roleName: string }> => {
    const result = await apiCall<{
      success: boolean;
      level: number;
      roleName: string;
    }>(`/api/task-requests/user-role-level/${userId}`);

    return { level: result.level, roleName: result.roleName };
  }, [apiCall]);

  /**
   * Create a task request
   */
  const createRequest = useCallback(async (data: {
    title: string;
    description?: string;
    priority?: string;
    suggestedDueDate?: string;
    requestedTo: number;
    tags?: string[];
  }): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{ success: boolean; request: TaskRequest }>(
        '/api/task-requests',
        {
          method: 'POST',
          body: JSON.stringify(data)
        }
      );

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Get inbox requests (received as superior)
   */
  const getInbox = useCallback(async (filters?: {
    status?: string | string[];
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskRequest[]> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          filters.status.forEach(s => params.append('status', s));
        } else {
          params.append('status', filters.status);
        }
      }
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const result = await apiCall<{ success: boolean; requests: TaskRequest[] }>(
        `/api/task-requests/inbox?${params.toString()}`
      );

      return result.requests;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Get outbox requests (sent as subordinate)
   */
  const getOutbox = useCallback(async (filters?: {
    status?: string | string[];
    priority?: string;
    limit?: number;
    offset?: number;
  }): Promise<TaskRequest[]> => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters?.status) {
        if (Array.isArray(filters.status)) {
          filters.status.forEach(s => params.append('status', s));
        } else {
          params.append('status', filters.status);
        }
      }
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.limit) params.append('limit', String(filters.limit));
      if (filters?.offset) params.append('offset', String(filters.offset));

      const result = await apiCall<{ success: boolean; requests: TaskRequest[] }>(
        `/api/task-requests/outbox?${params.toString()}`
      );

      return result.requests;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Get request counts for badges
   */
  const getRequestCounts = useCallback(async (): Promise<{
    inbox_pending: number;
    inbox_need_info: number;
    outbox_pending: number;
    outbox_need_info: number;
    outbox_deferred: number;
  }> => {
    try {
      const result = await apiCall<{
        success: boolean;
        counts: {
          inbox_pending: number;
          inbox_need_info: number;
          outbox_pending: number;
          outbox_need_info: number;
          outbox_deferred: number;
        };
      }>('/api/task-requests/counts');

      return result.counts;
    } catch (err: any) {
      return {
        inbox_pending: 0,
        inbox_need_info: 0,
        outbox_pending: 0,
        outbox_need_info: 0,
        outbox_deferred: 0
      };
    }
  }, [apiCall]);

  /**
   * Get single request by ID
   */
  const getRequest = useCallback(async (requestId: number): Promise<{
    request: TaskRequest;
    permissions: RequestPermissions;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        permissions: RequestPermissions;
      }>(`/api/task-requests/${requestId}`);

      return { request: result.request, permissions: result.permissions };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Get request messages
   */
  const getMessages = useCallback(async (requestId: number): Promise<any[]> => {
    const result = await apiCall<{ success: boolean; messages: any[] }>(
      `/api/task-requests/${requestId}/messages`
    );
    return result.messages;
  }, [apiCall]);

  /**
   * Get request audit history
   */
  const getHistory = useCallback(async (requestId: number): Promise<any[]> => {
    const result = await apiCall<{ success: boolean; history: any[] }>(
      `/api/task-requests/${requestId}/history`
    );
    return result.history;
  }, [apiCall]);

  // ============================================
  // SUPERIOR ACTIONS
  // ============================================

  /**
   * Accept request and convert to task
   */
  const acceptRequest = useCallback(async (requestId: number, reason?: string): Promise<{
    request: TaskRequest;
    task: any;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        task: any;
        message: string;
      }>(`/api/task-requests/${requestId}/accept`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      return { request: result.request, task: result.task };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Delegate request to a subordinate
   */
  const delegateRequest = useCallback(async (
    requestId: number,
    delegateToId: number,
    reason?: string
  ): Promise<{
    request: TaskRequest;
    task: any;
    delegatedTo: number;
  }> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        task: any;
        delegatedTo: number;
        message: string;
      }>(`/api/task-requests/${requestId}/delegate`, {
        method: 'POST',
        body: JSON.stringify({ delegateToId, reason })
      });

      return { request: result.request, task: result.task, delegatedTo: result.delegatedTo };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Reject request (reason required)
   */
  const rejectRequest = useCallback(async (requestId: number, reason: string): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        message: string;
      }>(`/api/task-requests/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Defer request for later
   */
  const deferRequest = useCallback(async (
    requestId: number,
    deferredUntil?: string,
    reason?: string
  ): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        message: string;
      }>(`/api/task-requests/${requestId}/defer`, {
        method: 'POST',
        body: JSON.stringify({ deferredUntil, reason })
      });

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Ask for clarification
   */
  const askClarification = useCallback(async (requestId: number, question: string): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        message: string;
      }>(`/api/task-requests/${requestId}/ask-clarification`, {
        method: 'POST',
        body: JSON.stringify({ question })
      });

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // ============================================
  // REQUESTER ACTIONS
  // ============================================

  /**
   * Provide clarification response
   */
  const provideClarification = useCallback(async (requestId: number, response: string): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        message: string;
      }>(`/api/task-requests/${requestId}/provide-clarification`, {
        method: 'POST',
        body: JSON.stringify({ response })
      });

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  /**
   * Cancel request
   */
  const cancelRequest = useCallback(async (requestId: number, reason?: string): Promise<TaskRequest> => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall<{
        success: boolean;
        request: TaskRequest;
        message: string;
      }>(`/api/task-requests/${requestId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });

      return result.request;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return {
    loading,
    error,
    // Hierarchy
    checkHierarchy,
    getUserRoleLevel,
    // CRUD
    createRequest,
    getInbox,
    getOutbox,
    getRequestCounts,
    getRequest,
    getMessages,
    getHistory,
    // Superior actions
    acceptRequest,
    delegateRequest,
    rejectRequest,
    deferRequest,
    askClarification,
    // Requester actions
    provideClarification,
    cancelRequest
  };
}
