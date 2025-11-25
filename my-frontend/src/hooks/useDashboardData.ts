'use client';

import { useState, useEffect } from 'react';
import { useTaskAPI } from './useTaskAPI';
import { useSocket } from '@/contexts/SocketContext';

interface Task {
  id: string;
  title: string;
  subItems: { id: string; text: string }[];
  progress?: number;
  comments: number;
  attachments: number;
  color: string;
  status: 'draft' | 'in_progress' | 'editing' | 'done';
}

interface DashboardData {
  DRAFT: Task[];
  IN_PROGRESS: Task[];
  EDITING: Task[];
  DONE: Task[];
}

// Status mapping from backend to frontend
const STATUS_MAP: { [key: string]: keyof DashboardData } = {
  'DRAFT': 'DRAFT',
  'OPEN': 'DRAFT',
  'IN_PROGRESS': 'IN_PROGRESS',
  'IN_REVIEW': 'EDITING',
  'BLOCKED': 'IN_PROGRESS',
  'COMPLETED': 'DONE',
  'CANCELLED': 'DONE',
  'ARCHIVED': 'DONE',
};

// Color palette for tasks
const COLORS = ['blue', 'purple', 'indigo', 'pink', 'cyan', 'teal', 'yellow'];

export function useDashboardData(role: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    DRAFT: [],
    IN_PROGRESS: [],
    EDITING: [],
    DONE: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getDashboardTasks } = useTaskAPI();
  const { socket, isConnected } = useSocket();

  // Convert backend task to frontend task format
  const convertTask = (backendTask: any, index: number): Task => {
    const subItems = backendTask.description 
      ? backendTask.description.split('\n').filter((line: string) => line.trim()).map((text: string, i: number) => ({
          id: `sub-${backendTask.id}-${i}`,
          text: text.trim(),
        }))
      : [];

    return {
      id: backendTask.id.toString(),
      title: backendTask.title,
      subItems: subItems.length > 0 ? subItems : [{ id: `sub-${backendTask.id}-0`, text: 'No description' }],
      progress: backendTask.progressPercentage || undefined,
      comments: backendTask.messageCount || 0,
      attachments: backendTask.attachmentCount || 0,
      color: COLORS[index % COLORS.length],
      status: STATUS_MAP[backendTask.status]?.toLowerCase() as Task['status'] || 'draft',
    };
  };

  // Load tasks from API
  const loadTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const tasksByStatus = await getDashboardTasks();
      
      if (tasksByStatus) {
        // Group tasks by status
        const grouped: DashboardData = {
          DRAFT: [],
          IN_PROGRESS: [],
          EDITING: [],
          DONE: [],
        };

        // Convert backend TasksByStatus to frontend DashboardData
        let taskIndex = 0;
        
        // Process each status
        Object.entries(tasksByStatus).forEach(([status, tasks]) => {
          if (Array.isArray(tasks)) {
            tasks.forEach((task: any) => {
              const mappedStatus = STATUS_MAP[task.status] || 'DRAFT';
              const convertedTask = convertTask(task, taskIndex++);
              grouped[mappedStatus].push(convertedTask);
            });
          }
        });

        // Role-based filtering
        if (role === 'STAFF') {
          grouped.DRAFT = grouped.DRAFT.slice(0, 2);
          grouped.IN_PROGRESS = grouped.IN_PROGRESS.slice(0, 2);
        }

        setDashboardData(grouped);
      }
    } catch (err) {
      console.error('Failed to load dashboard tasks:', err);
      setError('Failed to load tasks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadTasks();
  }, [role]);

  // Socket.IO real-time updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleTaskCreated = (data: any) => {
      console.log('Task created:', data);
      loadTasks(); // Reload all tasks
    };

    const handleTaskUpdated = (data: any) => {
      console.log('Task updated:', data);
      loadTasks(); // Reload all tasks
    };

    const handleTaskDeleted = (data: any) => {
      console.log('Task deleted:', data);
      loadTasks(); // Reload all tasks
    };

    const handleStatusChanged = (data: any) => {
      console.log('Task status changed:', data);
      loadTasks(); // Reload all tasks
    };

    // Subscribe to events
    socket.on('task:created', handleTaskCreated);
    socket.on('task:updated', handleTaskUpdated);
    socket.on('task:deleted', handleTaskDeleted);
    socket.on('task:statusChanged', handleStatusChanged);

    // Cleanup
    return () => {
      socket.off('task:created', handleTaskCreated);
      socket.off('task:updated', handleTaskUpdated);
      socket.off('task:deleted', handleTaskDeleted);
      socket.off('task:statusChanged', handleStatusChanged);
    };
  }, [socket, isConnected]);

  return { dashboardData, loading, error, reload: loadTasks };
}
