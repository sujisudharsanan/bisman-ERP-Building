'use client';

/**
 * My Requests Page
 * 
 * Shows incoming and outgoing task requests based on hierarchical workflow.
 * Incoming: Tasks that others have requested you to do (you are superior)
 * Outgoing: Tasks you have requested from your superiors
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/common/hooks/useAuth';
import MyRequestsView from '@/components/tasks/MyRequestsView';
import { 
  ArrowLeft, 
  RefreshCw, 
  Loader2,
  AlertCircle 
} from 'lucide-react';

// Types for task request
interface TaskRequest {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'DELEGATED' | 'NEED_INFO' | 'DEFERRED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  suggestedDueDate?: string;
  deferredUntil?: string;
  requestorId: number;
  requestorName: string;
  requestorRoleName: string;
  requestedToId: number;
  requestedToName: string;
  requestedToRoleName: string;
  delegatedToId?: number;
  delegatedToName?: string;
  responseNotes?: string;
  clarificationRequest?: string;
  taskId?: number;
}

export default function RequestsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [incomingRequests, setIncomingRequests] = useState<TaskRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<TaskRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch requests
  const fetchRequests = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/task-requests/my-requests', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch requests');
      }

      const data = await response.json();
      
      // Transform the response
      const incoming = (data.incoming || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        suggestedDueDate: r.suggested_due_date,
        deferredUntil: r.deferred_until,
        requestorId: r.requestor_id,
        requestorName: r.requestor_name || `User ${r.requestor_id}`,
        requestorRoleName: r.requestor_role_name || 'Unknown',
        requestedToId: r.requested_to_id,
        requestedToName: r.requested_to_name || `User ${r.requested_to_id}`,
        requestedToRoleName: r.requested_to_role_name || 'Unknown',
        delegatedToId: r.delegated_to_id,
        delegatedToName: r.delegated_to_name,
        responseNotes: r.response_notes,
        clarificationRequest: r.clarification_request,
        taskId: r.task_id,
      }));
      
      const outgoing = (data.outgoing || []).map((r: any) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        priority: r.priority,
        status: r.status,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        suggestedDueDate: r.suggested_due_date,
        deferredUntil: r.deferred_until,
        requestorId: r.requestor_id,
        requestorName: r.requestor_name || `User ${r.requestor_id}`,
        requestorRoleName: r.requestor_role_name || 'Unknown',
        requestedToId: r.requested_to_id,
        requestedToName: r.requested_to_name || `User ${r.requested_to_id}`,
        requestedToRoleName: r.requested_to_role_name || 'Unknown',
        delegatedToId: r.delegated_to_id,
        delegatedToName: r.delegated_to_name,
        responseNotes: r.response_notes,
        clarificationRequest: r.clarification_request,
        taskId: r.task_id,
      }));
      
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
    } catch (err: any) {
      console.error('[RequestsPage] Fetch error:', err);
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    if (user && !authLoading) {
      fetchRequests();
    }
  }, [user, authLoading, fetchRequests]);

  // Handle request selection
  const handleSelectRequest = (request: TaskRequest) => {
    // Navigate to request detail or show modal
    console.log('[RequestsPage] Selected request:', request.id);
    // For now, could navigate to task if accepted
    if (request.taskId) {
      router.push(`/dashboard?task=${request.taskId}`);
    }
  };

  // Handle accept
  const handleAccept = async (requestId: number) => {
    try {
      const response = await fetch(`/api/task-requests/${requestId}/accept`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept request');
      }

      // Refresh the list
      await fetchRequests();
    } catch (err: any) {
      console.error('[RequestsPage] Accept error:', err);
      setError(err.message);
    }
  };

  // Handle reject
  const handleReject = async (requestId: number, reason: string) => {
    try {
      const response = await fetch(`/api/task-requests/${requestId}/reject`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to reject request');
      }

      // Refresh the list
      await fetchRequests();
    } catch (err: any) {
      console.error('[RequestsPage] Reject error:', err);
      setError(err.message);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  My Requests
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Manage task requests and approvals
                </p>
              </div>
            </div>
            <button
              onClick={fetchRequests}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden min-h-[600px]">
          <MyRequestsView
            incomingRequests={incomingRequests}
            outgoingRequests={outgoingRequests}
            loading={loading}
            onRefresh={fetchRequests}
            onSelectRequest={handleSelectRequest}
            onAccept={handleAccept}
            onReject={handleReject}
          />
        </div>
      </div>
    </div>
  );
}
