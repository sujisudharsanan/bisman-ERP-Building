/**
 * Task API Service Hook
 * Centralized API calls for task management
 */

'use client';

import { useState, useCallback } from 'react';
import { 
  Task, 
  CreateTaskInput, 
  UpdateTaskInput,
  TaskMessage,
  CreateMessageInput,
  TasksByStatus,
  TaskDashboardStats
} from '@/types/task';

// Use relative URLs to go through Next.js API proxy (which handles auth cookies)
const API_BASE_URL = '';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  warning?: string;
  existingTask?: { id: number; title: string; status: string };
}

// Task creation result including warnings
export interface CreateTaskResult {
  task: Task | null;
  warning?: string;
  existingTask?: { id: number; title: string; status: string };
}

// API fetch wrapper - uses credentials for cookie-based auth
const apiFetch = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: 'include', // Include cookies for auth
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || data.message || `API Error: ${response.status}`);
  }

  return data;
};

export const useTaskAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  // Create task (returns task and optional warning for duplicates)
  // Uses V2 API which has proper hierarchy enforcement for task assignment
  const createTask = useCallback(async (taskData: CreateTaskInput): Promise<CreateTaskResult> => {
    setLoading(true);
    setError(null);
    setWarning(null);
    try {
      const response = await apiFetch<Task>('/api/v2/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      
      // Set warning if duplicate detected
      if (response.warning) {
        setWarning(response.warning);
      }
      
      return {
        task: response.data || null,
        warning: response.warning,
        existingTask: response.existingTask,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      return { task: null };
    } finally {
      setLoading(false);
    }
  }, []);

  // Get dashboard tasks
  const getDashboardTasks = useCallback(async (): Promise<TasksByStatus | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TasksByStatus>('/api/tasks/dashboard');
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch dashboard';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get task statistics
  const getTaskStats = useCallback(async (): Promise<TaskDashboardStats | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TaskDashboardStats>('/api/tasks/stats');
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get single task
  const getTask = useCallback(async (taskId: number): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}`);
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update task
  const updateTask = useCallback(async (taskId: number, updates: UpdateTaskInput): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: number): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch<void>(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Add message to task
  const addMessage = useCallback(async (taskId: number, messageData: CreateMessageInput): Promise<TaskMessage | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<TaskMessage>(`/api/tasks/${taskId}/messages`, {
        method: 'POST',
        body: JSON.stringify(messageData),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add message';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Start task
  const startTask = useCallback(async (taskId: number): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}/start`, {
        method: 'POST',
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Complete task
  const completeTask = useCallback(async (taskId: number, notes?: string): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
        body: JSON.stringify({ notes }),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Approve task
  const approveTask = useCallback(async (taskId: number, comments?: string): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ comments }),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reject task
  const rejectTask = useCallback(async (taskId: number, reason: string): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>(`/api/tasks/${taskId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject task';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get my tasks
  const getMyTasks = useCallback(async (): Promise<Task[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task[]>('/api/tasks/my-tasks');
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch tasks';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Search tasks
  const searchTasks = useCallback(async (query: string): Promise<Task[] | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task[]>(`/api/tasks/search?query=${encodeURIComponent(query)}`);
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search tasks';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Upload attachments
  const uploadAttachments = useCallback(async (taskId: number, files: File[]): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        credentials: 'include', // Use cookie-based auth
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload attachments');
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload attachments';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    warning,
    createTask,
    getDashboardTasks,
    getTaskStats,
    getTask,
    updateTask,
    deleteTask,
    addMessage,
    startTask,
    completeTask,
    approveTask,
    rejectTask,
    getMyTasks,
    searchTasks,
    uploadAttachments,
  };
};
