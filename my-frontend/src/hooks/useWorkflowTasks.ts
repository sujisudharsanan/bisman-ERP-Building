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
      setTasks(data);
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

      const newTask = await res.json();
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

    return {
      id: task.id,
      title: task.title,
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
      // Keep original task data for drawer
      ...task
    };
  };

  // Group tasks by status and transform for Kanban
  const groupedTasks = {
    draft: tasks.filter(t => t.status === 'draft').map(transformTaskForKanban),
    confirmed: tasks.filter(t => t.status === 'confirmed').map(transformTaskForKanban),
    in_progress: tasks.filter(t => t.status === 'in_progress').map(transformTaskForKanban),
    editing: tasks.filter(t => t.status === 'editing').map(transformTaskForKanban),
    done: tasks.filter(t => t.status === 'done').map(transformTaskForKanban)
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
