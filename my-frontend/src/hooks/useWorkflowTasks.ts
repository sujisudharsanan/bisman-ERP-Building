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
  statusInfo?: {
    isCreator: boolean;
    isAssignee: boolean;
    canComplete: boolean;
    canCancel: boolean;
  };
}

// Helper to transform task to Kanban format (moved to top level)
const transformTaskForKanban = (task: any) => {
  const priorityColors: Record<string, string> = {
    LOW: 'blue',
    MEDIUM: 'yellow',
    HIGH: 'purple',
    URGENT: 'pink'
  };

  const base = {
    subItems: [
      {
        id: `${task.id}-desc`,
        text: task.description || 'No description'
      }
    ],
    progress: task.status === 'COMPLETED' ? 100 : 
              task.status === 'IN_PROGRESS' ? 50 : 
              task.status === 'IN_REVIEW' ? 75 : 0,
    comments: task.message_count || 0,
    attachments: task.attachment_count || 0,
    color: priorityColors[task.priority?.toUpperCase() || 'MEDIUM'] || 'yellow',
  };
  // Keep original task data for drawer
  return { ...base, ...task };
};

export interface UseWorkflowTasksReturn {
  tasks: WorkflowTask[];
  loading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  createTask: (task: Partial<WorkflowTask>) => Promise<WorkflowTask | null>;
  deleteTask: (taskId: string) => Promise<boolean>;
  groupedTasks: {
    ASSIGNED: any[];
    IN_PROGRESS: any[];
    EDITING: any[];
    DONE: any[];
  };
}

export function useWorkflowTasks(): UseWorkflowTasksReturn {
  const [tasks, setTasks] = useState<WorkflowTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedTasks, setGroupedTasks] = useState<{
    ASSIGNED: any[];
    IN_PROGRESS: any[];
    EDITING: any[];
    DONE: any[];
  }>({
    ASSIGNED: [],
    IN_PROGRESS: [],
    EDITING: [],
    DONE: []
  });

  // Fetch all tasks from dashboard endpoint (pre-grouped by backend)
  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/tasks/dashboard', {
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await res.json();
      
      // Backend returns grouped tasks: { success: true, data: { ASSIGNED: [], IN_PROGRESS: [], EDITING: [], DONE: [] } }
      if (data.success && data.data) {
        setGroupedTasks({
          ASSIGNED: (data.data.ASSIGNED || []).map(transformTaskForKanban),
          IN_PROGRESS: (data.data.IN_PROGRESS || []).map(transformTaskForKanban),
          EDITING: (data.data.EDITING || []).map(transformTaskForKanban),
          DONE: (data.data.DONE || []).map(transformTaskForKanban)
        });
        
        // Flatten for tasks array
        const allTasks = [
          ...(data.data.ASSIGNED || []),
          ...(data.data.IN_PROGRESS || []),
          ...(data.data.EDITING || []),
          ...(data.data.DONE || [])
        ];
        setTasks(allTasks);
      }
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
