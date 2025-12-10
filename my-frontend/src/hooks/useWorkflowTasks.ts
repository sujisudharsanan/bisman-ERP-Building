// Workflow Tasks Hook
'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'confirmed' | 'in_progress' | 'editing' | 'done';
  creator_id: string;
  creator_type: string;
  current_approver_level: number;
  approver_id?: string;
  approver_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
  confirmed_at?: string;
  completed_at?: string;
}

export interface UseWorkflowTasksReturn {
  tasks: WorkflowTask[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (task: Partial<WorkflowTask>) => Promise<WorkflowTask | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  groupedTasks: {
    draft: any[];
    confirmed: any[];
    in_progress: any[];
    editing: any[];
    done: any[];
  };
}

export function useWorkflowTasks(): UseWorkflowTasksReturn {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tasks
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/tasks', {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await res.json();
      // Handle API response format: { success: true, data: [...] }
      const taskList = Array.isArray(data) ? data : (data.data || []);
      setTasks(taskList);
    } catch (err) {
      console.error('Error fetching workflow tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  // Create new task
  const createTask = useCallback(async (task: Partial<WorkflowTask>): Promise<WorkflowTask | null> => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(task)
      });

      if (!res.ok) {
        throw new Error('Failed to create task');
      }

      const response = await res.json();
      // Handle API response format: { success: true, data: {...} }
      const newTask = response.data || response;
      setTasks(prev => [newTask, ...prev]);
      return newTask;
    } catch (err) {
      console.error('Error creating task:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
      return null;
    }
  }, []);

  // Delete task
  const deleteTask = useCallback(async (taskId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete task');
      }

      setTasks(prev => prev.filter(t => t.id !== taskId));
      return true;
    } catch (err) {
      console.error('Error deleting task:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete task');
      return false;
    }
  }, []);

  // Listen for realtime updates
  useEffect(() => {
    const handleTaskUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedTask = customEvent.detail;
      
      setTasks(prev => {
        const index = prev.findIndex(t => t.id === updatedTask.id);
        if (index !== -1) {
          // Update existing task
          const newTasks = [...prev];
          newTasks[index] = updatedTask;
          return newTasks;
        } else {
          // Add new task
          return [updatedTask, ...prev];
        }
      });
    };

    window.addEventListener('workflow-task-updated', handleTaskUpdate);
    return () => {
      window.removeEventListener('workflow-task-updated', handleTaskUpdate);
    };
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Helper to transform task to Kanban format
  const transformTaskForKanban = (task: WorkflowTask) => {
    const priorityColors: Record<string, string> = {
      low: 'blue',
      medium: 'yellow',
      high: 'purple',
      urgent: 'pink'
    };

  const base = {
      subItems: [
        {
          id: `${task.id}-desc`,
          text: task.description || 'No description'
        }
      ],
      progress: task.status === 'done' ? 100 : 
                task.status === 'in_progress' ? (task.current_approver_level * 25) : 
                task.status === 'confirmed' ? 25 : 0,
      comments: 0, // Will be populated by API if needed
      attachments: 0, // Will be populated by API if needed
      color: priorityColors[task.priority || 'medium'],
  } as const;
  // Keep original task data for drawer; avoid overwriting id/title explicitly
  return { ...base, ...task };
  };

  // Ensure tasks is always an array
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Group tasks by status and transform for Kanban
  // Map backend status (OPEN, IN_PROGRESS, etc) to frontend status (draft, in_progress, etc)
  const statusMap: Record<string, string> = {
    'OPEN': 'draft',
    'PENDING': 'confirmed',
    'IN_PROGRESS': 'in_progress',
    'UNDER_REVIEW': 'editing',
    'COMPLETED': 'done',
    'CLOSED': 'done',
    'CANCELLED': 'done'
  };

  const getStatus = (task: WorkflowTask) => {
    const status = task.status?.toUpperCase() || 'OPEN';
    return statusMap[status] || task.status?.toLowerCase() || 'draft';
  };

  const groupedTasks = {
    draft: safeTasks.filter(t => getStatus(t) === 'draft').map(transformTaskForKanban),
    confirmed: safeTasks.filter(t => getStatus(t) === 'confirmed').map(transformTaskForKanban),
    in_progress: safeTasks.filter(t => getStatus(t) === 'in_progress').map(transformTaskForKanban),
    editing: safeTasks.filter(t => getStatus(t) === 'editing').map(transformTaskForKanban),
    done: safeTasks.filter(t => getStatus(t) === 'done').map(transformTaskForKanban)
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    deleteTask,
    groupedTasks
  };
}
