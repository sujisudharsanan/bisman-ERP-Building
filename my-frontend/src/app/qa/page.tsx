'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useQADashboard, useQATasks, useQAIssues } from '@/hooks/useQA';
import { StatusBadge, SeverityBadge, ModuleTag, UserAvatar, TaskCard, IssueCard } from '@/components/qa';

// Icons
const ClipboardIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
);

const BugIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const UserIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);

const RetestIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const RefreshIcon = ({ spinning = false }: { spinning?: boolean }) => (
  <svg className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: 'blue' | 'orange' | 'green' | 'purple';
  href?: string;
  loading?: boolean;
}

function StatCard({ title, value, icon, color, href, loading }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  const iconBgClasses = {
    blue: 'bg-blue-100 dark:bg-blue-900/50',
    orange: 'bg-orange-100 dark:bg-orange-900/50',
    green: 'bg-green-100 dark:bg-green-900/50',
    purple: 'bg-purple-100 dark:bg-purple-900/50',
  };

  const content = (
    <div className={`rounded-xl border p-5 ${colorClasses[color]} transition-all hover:shadow-md ${href ? 'cursor-pointer' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="text-3xl font-bold mt-1">
            {loading ? <span className="animate-pulse">...</span> : value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgClasses[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function QADashboardPage() {
  const { user } = useAuth();
  const { stats, loading: statsLoading, refresh: refreshStats } = useQADashboard();
  const { tasks, loading: tasksLoading } = useQATasks({ status: 'pending' });
  const { issues, loading: issuesLoading } = useQAIssues({ status: 'open' });

  const loading = statsLoading || tasksLoading || issuesLoading;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              QA Dashboard
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Welcome back, {user?.name || 'Tester'} 👋
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refreshStats()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                       bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg
                       hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <RefreshIcon spinning={loading} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="My Testing Tasks"
            value={stats?.myTasks ?? 0}
            icon={<ClipboardIcon />}
            color="blue"
            href="/qa/test-tasks?filter=my"
            loading={statsLoading}
          />
          <StatCard
            title="My Open Issues"
            value={stats?.myOpenIssues ?? 0}
            icon={<BugIcon />}
            color="orange"
            href="/qa/issues?filter=my-open"
            loading={statsLoading}
          />
          <StatCard
            title="Assigned to Me"
            value={stats?.assignedToMe ?? 0}
            icon={<UserIcon />}
            color="green"
            href="/qa/issues?filter=assigned"
            loading={statsLoading}
          />
          <StatCard
            title="Retest Pending"
            value={stats?.retestPending ?? 0}
            icon={<RetestIcon />}
            color="purple"
            href="/qa/issues?status=resolved"
            loading={statsLoading}
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/qa/test-tasks/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg
                       hover:bg-blue-700 transition-colors font-medium"
            >
              <PlusIcon />
              Create New Task
            </Link>
            <Link
              href="/qa/issues/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg
                       hover:bg-orange-700 transition-colors font-medium"
            >
              <PlusIcon />
              Report New Issue
            </Link>
            <Link
              href="/qa/test-tasks"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                       transition-colors font-medium"
            >
              View All Tasks
            </Link>
            <Link
              href="/qa/issues"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 
                       text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 
                       transition-colors font-medium"
            >
              View All Issues
            </Link>
          </div>
        </div>

        {/* Recent Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Tasks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pending Tasks
              </h2>
              <Link 
                href="/qa/test-tasks" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {tasksLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg h-24" />
                  ))}
                </div>
              ) : tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <ClipboardIcon />
                  <p className="mt-2">No pending tasks</p>
                </div>
              ) : (
                tasks.slice(0, 5).map((task) => (
                  <TaskCard
                    key={task.id}
                    task={{
                      id: task.id,
                      title: task.title,
                      description: task.description,
                      module: task.module,
                      priority: task.priority,
                      status: task.status,
                      dueDate: task.due_date,
                      assignedTo: task.assignee,
                    }}
                    compact
                  />
                ))
              )}
            </div>
          </div>

          {/* Open Issues */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Open Issues
              </h2>
              <Link 
                href="/qa/issues" 
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                View all →
              </Link>
            </div>
            <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
              {issuesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-lg h-24" />
                  ))}
                </div>
              ) : issues.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <BugIcon />
                  <p className="mt-2">No open issues</p>
                </div>
              ) : (
                issues.slice(0, 5).map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={{
                      id: issue.id,
                      issueCode: issue.issue_code,
                      title: issue.title,
                      description: issue.description,
                      module: issue.module,
                      severity: issue.severity,
                      status: issue.status,
                      issueType: issue.issue_type,
                      assignedTo: issue.assignee,
                      createdAt: issue.created_at,
                    }}
                    compact
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h2 className="text-lg font-semibold mb-3">📊 Today&apos;s Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Tasks Completed</p>
              <p className="text-2xl font-bold">
                {tasks.filter(t => t.status === 'passed').length}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Issues Reported</p>
              <p className="text-2xl font-bold">{issues.length}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Issues Resolved</p>
              <p className="text-2xl font-bold">
                {issues.filter(i => i.status === 'resolved').length}
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Critical Issues</p>
              <p className="text-2xl font-bold">
                {issues.filter(i => i.severity === 'critical').length}
              </p>
            </div>
          </div>
        </div>
      </div>
  );
}
