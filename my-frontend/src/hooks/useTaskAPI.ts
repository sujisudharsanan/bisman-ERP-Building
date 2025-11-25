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

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get auth token
const getAuthToken = () => {
  return localStorage.getItem('token');
};

// API fetch wrapper
const apiFetch = async <T,>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getAuthToken();
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || `API Error: ${response.status}`);
  }

  return data;
};

export const useTaskAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create task
  const createTask = useCallback(async (taskData: CreateTaskInput): Promise<Task | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch<Task>('/api/tasks', {
        method: 'POST',
        body: JSON.stringify(taskData),
      });
      return response.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      return null;
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
      const token = getAuthToken();
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
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
