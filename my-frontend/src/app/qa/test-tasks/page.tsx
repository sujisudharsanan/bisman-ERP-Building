'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQATasks, TaskFilters } from '@/hooks/useQA';
import { StatusBadge, SeverityBadge, ModuleTag, UserAvatar } from '@/components/qa';

const STATUSES = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'skipped', label: 'Skipped' },
];

const PRIORITIES = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const MODULES = [
  { value: '', label: 'All Modules' },
  { value: 'sales', label: 'Sales' },
  { value: 'inventory', label: 'Inventory' },
  { value: 'billing', label: 'Billing' },
  { value: 'hr', label: 'HR' },
  { value: 'finance', label: 'Finance' },
  { value: 'crm', label: 'CRM' },
  { value: 'reports', label: 'Reports' },
  { value: 'settings', label: 'Settings' },
  { value: 'auth', label: 'Auth' },
];

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function TestTasksPage() {
  const searchParams = useSearchParams();
  const initialFilter = searchParams?.get('filter') || '';

  const [filters, setFilters] = useState<TaskFilters>({
    status: initialFilter === 'my' ? 'pending' : '',
    priority: '',
    module: '',
  });

  const { tasks, loading, error, refresh } = useQATasks(filters);

  const updateFilter = (key: keyof TaskFilters, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  // Stats
  const stats = useMemo(() => {
    const all = tasks.length;
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const inProgress = tasks.filter((t) => t.status === 'in_progress').length;
    const passed = tasks.filter((t) => t.status === 'passed').length;
    const failed = tasks.filter((t) => t.status === 'failed').length;
    return { all, pending, inProgress, passed, failed };
  }, [tasks]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Test Tasks</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage and track testing tasks
            </p>
          </div>
          <Link
            href="/qa/test-tasks/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'All', value: stats.all, color: 'bg-gray-100 dark:bg-gray-700' },
            { label: 'Pending', value: stats.pending, color: 'bg-slate-100 dark:bg-slate-800' },
            { label: 'In Progress', value: stats.inProgress, color: 'bg-yellow-100 dark:bg-yellow-900/30' },
            { label: 'Passed', value: stats.passed, color: 'bg-green-100 dark:bg-green-900/30' },
            { label: 'Failed', value: stats.failed, color: 'bg-red-100 dark:bg-red-900/30' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-lg p-3 text-center`}>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Priority
              </label>
              <select
                value={filters.priority || ''}
                onChange={(e) => updateFilter('priority', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Module
              </label>
              <select
                value={filters.module || ''}
                onChange={(e) => updateFilter('module', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md
                         bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {MODULES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', priority: '', module: '' })}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-600 dark:text-red-400">
            {error}
            <button onClick={refresh} className="ml-2 underline">Retry</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Title</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Module</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Priority</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Assignee</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Due Date</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 ml-auto" /></td>
                    </tr>
                  ))
                ) : tasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <div className="text-4xl mb-2">📋</div>
                      <p>No tasks found</p>
                      <Link href="/qa/test-tasks/new" className="text-blue-600 dark:text-blue-400 hover:underline mt-2 inline-block">
                        Create your first task →
                      </Link>
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr
                      key={task.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/qa/test-tasks/${task.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          {task.title}
                        </Link>
                        {task.test_type && (
                          <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 capitalize">
                            ({task.test_type})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {task.module ? <ModuleTag module={task.module} size="sm" /> : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <SeverityBadge level={task.priority} type="priority" size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={task.status} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {task.assignee ? (
                          <UserAvatar
                            userId={task.assignee.id}
                            name={task.assignee.name}
                            size="xs"
                            showName
                          />
                        ) : (
                          <span className="text-gray-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {formatDate(task.due_date)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/qa/test-tasks/${task.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  );
}
