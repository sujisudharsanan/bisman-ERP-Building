'use client';

import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/qa';

// Types
export interface QADashboardStats {
  myTasks: number;
  myOpenIssues: number;
  assignedToMe: number;
  retestPending: number;
}

export interface QATask {
  id: number;
  tenant_id: string;
  title: string;
  description?: string;
  module?: string;
  test_type: string;
  priority: string;
  status: string;
  assigned_to?: number;
  due_date?: string;
  test_steps?: string;
  expected_result?: string;
  actual_result?: string;
  created_by?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  assignee?: { id: number; name: string };
  creator?: { id: number; name: string };
}

export interface QAIssue {
  id: number;
  tenant_id: string;
  issue_code: string;
  title: string;
  description?: string;
  steps_to_reproduce?: string;
  expected_behavior?: string;
  actual_behavior?: string;
  module?: string;
  severity: string;
  priority: string;
  issue_type: string;
  status: string;
  related_task_id?: number;
  opened_by?: number;
  assigned_to?: number;
  environment?: string;
  browser?: string;
  os?: string;
  attachments?: string[];
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  closed_at?: string;
  opener?: { id: number; name: string };
  assignee?: { id: number; name: string };
  history?: QAIssueHistory[];
}

export interface QAIssueHistory {
  id: number;
  issue_id: number;
  changed_by?: number;
  changed_at: string;
  field_name: string;
  old_value?: string;
  new_value?: string;
  comment?: string;
  changer?: { id: number; name: string };
}

// Generic fetch helper
async function qaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { error: errorData.error || `HTTP ${response.status}` };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' };
  }
}

// ============================================================================
// DASHBOARD HOOK
// ============================================================================
export function useQADashboard() {
  const [stats, setStats] = useState<QADashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<QAIssueHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    const { data, error } = await qaFetch<{
      stats: QADashboardStats;
      recentActivity: QAIssueHistory[];
    }>('/dashboard');

    if (error) {
      setError(error);
    } else if (data) {
      setStats(data.stats);
      setRecentActivity(data.recentActivity || []);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return { stats, recentActivity, loading, error, refresh: fetchDashboard };
}

// ============================================================================
// TASKS HOOK
// ============================================================================
export interface TaskFilters {
  status?: string;
  priority?: string;
  module?: string;
  assignedTo?: number;
}

export function useQATasks(filters?: TaskFilters) {
  const [tasks, setTasks] = useState<QATask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.module) params.append('module', filters.module);
    if (filters?.assignedTo) params.append('assignedTo', String(filters.assignedTo));

    const endpoint = `/tasks${params.toString() ? `?${params}` : ''}`;
    const { data, error } = await qaFetch<{ tasks: QATask[] }>(endpoint);

    if (error) {
      setError(error);
    } else if (data) {
      setTasks(data.tasks || []);
      setError(null);
    }
    setLoading(false);
  }, [filters?.status, filters?.priority, filters?.module, filters?.assignedTo]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return { tasks, loading, error, refresh: fetchTasks };
}

export function useQATask(taskId: number | string | null) {
  const [task, setTask] = useState<QATask | null>(null);
  const [relatedIssues, setRelatedIssues] = useState<QAIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = useCallback(async () => {
    if (!taskId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await qaFetch<{ task: QATask; relatedIssues?: QAIssue[] }>(
      `/tasks/${taskId}`
    );

    if (error) {
      setError(error);
    } else if (data) {
      setTask(data.task);
      setRelatedIssues(data.relatedIssues || []);
      setError(null);
    }
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  const updateTask = async (updates: Partial<QATask>) => {
    if (!taskId) return { error: 'No task ID' };
    
    const { data, error } = await qaFetch<{ task: QATask }>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (data) {
      setTask(data.task);
    }
    return { data, error };
  };

  return { task, relatedIssues, loading, error, refresh: fetchTask, updateTask };
}

export async function createTask(taskData: Partial<QATask>) {
  return qaFetch<{ task: QATask }>('/tasks', {
    method: 'POST',
    body: JSON.stringify(taskData),
  });
}

// ============================================================================
// ISSUES HOOK
// ============================================================================
export interface IssueFilters {
  status?: string;
  severity?: string;
  priority?: string;
  module?: string;
  assignedTo?: number;
  openedBy?: number;
}

export function useQAIssues(filters?: IssueFilters) {
  const [issues, setIssues] = useState<QAIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.module) params.append('module', filters.module);
    if (filters?.assignedTo) params.append('assignedTo', String(filters.assignedTo));
    if (filters?.openedBy) params.append('openedBy', String(filters.openedBy));

    const endpoint = `/issues${params.toString() ? `?${params}` : ''}`;
    const { data, error } = await qaFetch<{ issues: QAIssue[] }>(endpoint);

    if (error) {
      setError(error);
    } else if (data) {
      setIssues(data.issues || []);
      setError(null);
    }
    setLoading(false);
  }, [filters?.status, filters?.severity, filters?.priority, filters?.module, filters?.assignedTo, filters?.openedBy]);

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

  return { issues, loading, error, refresh: fetchIssues };
}

export function useQAIssue(issueId: number | string | null) {
  const [issue, setIssue] = useState<QAIssue | null>(null);
  const [history, setHistory] = useState<QAIssueHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchIssue = useCallback(async () => {
    if (!issueId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await qaFetch<{ issue: QAIssue; history?: QAIssueHistory[] }>(
      `/issues/${issueId}`
    );

    if (error) {
      setError(error);
    } else if (data) {
      setIssue(data.issue);
      setHistory(data.history || data.issue.history || []);
      setError(null);
    }
    setLoading(false);
  }, [issueId]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const updateIssue = async (updates: Partial<QAIssue> & { gitCommit?: string; comment?: string }) => {
    if (!issueId) return { error: 'No issue ID' };
    
    const { data, error } = await qaFetch<{ issue: QAIssue; history?: QAIssueHistory[] }>(
      `/issues/${issueId}`,
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );

    if (data) {
      setIssue(data.issue);
      if (data.history) setHistory(data.history);
      else fetchIssue(); // Refresh to get updated history
    }
    return { data, error };
  };

  const addComment = async (content: string) => {
    if (!issueId) return { error: 'No issue ID' };
    
    const { data, error } = await qaFetch<{ comment: QAIssueHistory }>(
      `/issues/${issueId}/comment`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );

    if (data) {
      fetchIssue(); // Refresh to get updated history
    }
    return { data, error };
  };

  return { issue, history, loading, error, refresh: fetchIssue, updateIssue, addComment };
}

export async function createIssue(issueData: Partial<QAIssue>) {
  return qaFetch<{ issue: QAIssue }>('/issues', {
    method: 'POST',
    body: JSON.stringify(issueData),
  });
}

// ============================================================================
// USERS HOOK (for assignee dropdowns)
// ============================================================================
export function useQAUsers() {
  const [users, setUsers] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      // Try to fetch from users endpoint
      const { data } = await qaFetch<{ users: { id: number; name: string }[] }>('/users');
      if (data?.users) {
        setUsers(data.users);
      }
      setLoading(false);
    };
    fetchUsers();
  }, []);

  return { users, loading };
}
