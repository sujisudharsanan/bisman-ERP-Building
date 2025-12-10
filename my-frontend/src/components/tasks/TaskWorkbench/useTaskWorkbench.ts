/**
 * Task Workbench Hook
 * 
 * Manages state and API calls for the Task Workbench component.
 * Handles:
 * - Tab switching
 * - Task fetching with pagination
 * - Tab counts
 * - Real-time updates
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Task, TaskStatus } from '@/types/task';

export type WorkbenchTab = 'DRAFT' | 'IN_PROGRESS' | 'NEED_ATTENTION' | 'DONE';

interface TabCounts {
  DRAFT: number;
  IN_PROGRESS: number;
  NEED_ATTENTION: number;
  DONE: number;
}

interface UseTaskWorkbenchReturn {
  activeTab: WorkbenchTab;
  setActiveTab: (tab: WorkbenchTab) => void;
  tasks: WorkbenchTask[];
  loading: boolean;
  error: string | null;
  tabCounts: TabCounts;
  refreshTasks: () => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  loadingMore: boolean;
}

export interface WorkbenchTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: string;
  creatorId: number;
  assigneeId?: number;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  messageCount: number;
  attachmentCount: number;
  isOverdue: boolean;
  isBlocked: boolean;
  needsAttention: boolean;
  creator?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  assignee?: {
    id: number;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

// Map workbench tabs to status filters
function getStatusesForTab(tab: WorkbenchTab): TaskStatus[] {
  switch (tab) {
    case 'DRAFT':
      return [TaskStatus.DRAFT];
    case 'IN_PROGRESS':
      return [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.IN_REVIEW];
    case 'NEED_ATTENTION':
      // This is handled specially - includes overdue + blocked
      return [TaskStatus.BLOCKED];
    case 'DONE':
      return [TaskStatus.COMPLETED];
    default:
      return [];
  }
}

const PAGE_SIZE = 20;

export function useTaskWorkbench(): UseTaskWorkbenchReturn {
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('IN_PROGRESS');
  const [tasks, setTasks] = useState<WorkbenchTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tabCounts, setTabCounts] = useState<TabCounts>({
    DRAFT: 0,
    IN_PROGRESS: 0,
    NEED_ATTENTION: 0,
    DONE: 0,
  });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Fetch tab counts
  const fetchTabCounts = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks/workbench/counts', {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.counts) {
          setTabCounts(data.counts);
        }
      }
    } catch (err) {
      console.error('Failed to fetch tab counts:', err);
    }
  }, []);

  // Fetch tasks for current tab
  const fetchTasks = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    if (!append) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams({
        tab: activeTab,
        page: pageNum.toString(),
        limit: PAGE_SIZE.toString(),
      });

      const response = await fetch(`/api/tasks/workbench?${params}`, {
        credentials: 'include',
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to fetch tasks');
      }

      const data = await response.json();
      
      if (data.success) {
        const newTasks = (data.data || []).map(transformTask);
        
        if (append) {
          setTasks(prev => [...prev, ...newTasks]);
        } else {
          setTasks(newTasks);
        }
        
        setPage(pageNum);
        setHasMore(newTasks.length >= PAGE_SIZE);
      } else {
        throw new Error(data.error || 'Failed to fetch tasks');
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Ignore aborted requests
      }
      console.error('Error fetching tasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeTab]);

  // Transform API response to WorkbenchTask
  function transformTask(apiTask: any): WorkbenchTask {
    const now = new Date();
    const dueDate = apiTask.due_date || apiTask.dueDate;
    const isOverdue = dueDate && new Date(dueDate) < now && 
      !['COMPLETED', 'CANCELLED', 'ARCHIVED'].includes(apiTask.status);
    const isBlocked = apiTask.status === 'BLOCKED';
    
    return {
      id: String(apiTask.id),
      title: apiTask.title,
      description: apiTask.description,
      status: apiTask.status as TaskStatus,
      priority: apiTask.priority || 'MEDIUM',
      creatorId: apiTask.creator_id || apiTask.creatorId,
      assigneeId: apiTask.assignee_id || apiTask.assigneeId,
      createdAt: apiTask.created_at || apiTask.createdAt,
      updatedAt: apiTask.updated_at || apiTask.updatedAt,
      dueDate: dueDate,
      messageCount: apiTask.message_count || apiTask.messageCount || 0,
      attachmentCount: apiTask.attachment_count || apiTask.attachmentCount || 0,
      isOverdue,
      isBlocked,
      needsAttention: isOverdue || isBlocked,
      creator: apiTask.creator ? {
        id: apiTask.creator.id,
        username: apiTask.creator.username || apiTask.creator.name,
        firstName: apiTask.creator.first_name || apiTask.creator.firstName,
        lastName: apiTask.creator.last_name || apiTask.creator.lastName,
      } : undefined,
      assignee: apiTask.assignee ? {
        id: apiTask.assignee.id,
        username: apiTask.assignee.username || apiTask.assignee.name,
        firstName: apiTask.assignee.first_name || apiTask.assignee.firstName,
        lastName: apiTask.assignee.last_name || apiTask.assignee.lastName,
      } : undefined,
    };
  }

  // Refresh tasks
  const refreshTasks = useCallback(async () => {
    await Promise.all([
      fetchTasks(1, false),
      fetchTabCounts(),
    ]);
  }, [fetchTasks, fetchTabCounts]);

  // Load more tasks
  const loadMore = useCallback(async () => {
    if (!loadingMore && hasMore) {
      await fetchTasks(page + 1, true);
    }
  }, [fetchTasks, loadingMore, hasMore, page]);

  // Fetch tasks when tab changes
  useEffect(() => {
    fetchTasks(1, false);
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch tab counts on mount
  useEffect(() => {
    fetchTabCounts();
  }, [fetchTabCounts]);

  // Listen for real-time task updates
  useEffect(() => {
    const handleTaskUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const updatedTask = customEvent.detail;
      
      if (updatedTask) {
        // Refresh the list to ensure correct ordering
        fetchTasks(1, false);
        fetchTabCounts();
      }
    };

    window.addEventListener('workflow-task-updated', handleTaskUpdate);
    window.addEventListener('task-updated', handleTaskUpdate);

    return () => {
      window.removeEventListener('workflow-task-updated', handleTaskUpdate);
      window.removeEventListener('task-updated', handleTaskUpdate);
    };
  }, [fetchTasks, fetchTabCounts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    activeTab,
    setActiveTab,
    tasks,
    loading,
    error,
    tabCounts,
    refreshTasks,
    hasMore,
    loadMore,
    loadingMore,
  };
}

export default useTaskWorkbench;
