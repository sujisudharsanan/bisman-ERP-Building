/**
 * Task Stats Panel Component
 * Displays SLA compliance metrics, performance badges, and task statistics
 */

'use client';

import React, { useMemo } from 'react';
import { 
  Trophy, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Timer
} from 'lucide-react';
import { 
  calculateSLACompliance, 
  getPerformanceBadge,
  calculateTimeStatus 
} from '@/lib/utils/timeTracking';

interface Task {
  id: string | number;
  status: string;
  dueDate?: string | Date | null;
  due_date?: string | Date | null;
  completedAt?: string | Date | null;
  completed_at?: string | Date | null;
}

interface TaskStatsPanelProps {
  tasks: Task[];
  userName?: string;
  compact?: boolean;
}

export function TaskStatsPanel({ tasks, userName, compact = false }: TaskStatsPanelProps) {
  // Calculate SLA compliance
  const slaStats = useMemo(() => {
    const normalizedTasks = tasks.map(t => ({
      dueDate: t.dueDate || t.due_date,
      completedAt: t.completedAt || t.completed_at,
      status: t.status,
    }));
    return calculateSLACompliance(normalizedTasks);
  }, [tasks]);

  // Get performance badge
  const performanceBadge = useMemo(() => {
    return getPerformanceBadge(slaStats.compliancePercentage);
  }, [slaStats.compliancePercentage]);

  // Count tasks by status
  const statusCounts = useMemo(() => {
    const counts = {
      total: tasks.length,
      completed: 0,
      inProgress: 0,
      overdue: 0,
      assigned: 0,
    };

    tasks.forEach(task => {
      if (['DONE', 'COMPLETED'].includes(task.status)) {
        counts.completed++;
      } else if (task.status === 'IN_PROGRESS') {
        counts.inProgress++;
      } else if (task.status === 'ASSIGNED') {
        counts.assigned++;
      }
      
      // Check if overdue (not completed and past due)
      const dueDate = task.dueDate || task.due_date;
      if (dueDate && !['DONE', 'COMPLETED', 'CANCELLED'].includes(task.status)) {
        const timeStatus = calculateTimeStatus(dueDate, null, task.status);
        if (timeStatus?.isOverdue) {
          counts.overdue++;
        }
      }
    });

    return counts;
  }, [tasks]);

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm">
        {/* Performance Badge */}
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${performanceBadge.bgColor}`}>
          <span>{performanceBadge.icon}</span>
          <span className={`font-medium ${performanceBadge.color}`}>{performanceBadge.label}</span>
        </div>
        
        {/* On Time */}
        <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
          <CheckCircle size={14} />
          <span>{slaStats.compliancePercentage}%</span>
        </div>
        
        {/* Late */}
        {slaStats.lateCount > 0 && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertTriangle size={14} />
            <span>{slaStats.lateCount}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Performance Badge Header */}
      <div className={`p-4 rounded-xl ${performanceBadge.bgColor} border border-current/10`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{performanceBadge.icon}</span>
            <div>
              <p className={`text-lg font-bold ${performanceBadge.color}`}>
                {performanceBadge.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {userName ? `${userName}'s` : 'Your'} performance this week
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-2xl font-bold ${performanceBadge.color}`}>
              {slaStats.compliancePercentage}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">SLA Compliance</p>
          </div>
        </div>
      </div>

      {/* SLA Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* On Time */}
        <div className="p-3 bg-green-50 dark:bg-green-500/10 rounded-lg border border-green-200 dark:border-green-500/20">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium text-green-700 dark:text-green-400">On Time</span>
          </div>
          <p className="text-2xl font-bold text-green-700 dark:text-green-400">
            {slaStats.onTimeCount}
          </p>
          <p className="text-[10px] text-green-600/70 dark:text-green-400/70">
            tasks completed on time
          </p>
        </div>

        {/* Late/Overdue */}
        <div className={`p-3 rounded-lg border ${
          slaStats.lateCount > 0 
            ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20' 
            : 'bg-gray-50 dark:bg-gray-500/10 border-gray-200 dark:border-gray-500/20'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className={`w-4 h-4 ${
              slaStats.lateCount > 0 
                ? 'text-red-600 dark:text-red-400 animate-pulse' 
                : 'text-gray-500 dark:text-gray-400'
            }`} />
            <span className={`text-xs font-medium ${
              slaStats.lateCount > 0 
                ? 'text-red-700 dark:text-red-400' 
                : 'text-gray-600 dark:text-gray-400'
            }`}>Late/Overdue</span>
          </div>
          <p className={`text-2xl font-bold ${
            slaStats.lateCount > 0 
              ? 'text-red-700 dark:text-red-400' 
              : 'text-gray-600 dark:text-gray-400'
          }`}>
            {slaStats.lateCount}
          </p>
          <p className={`text-[10px] ${
            slaStats.lateCount > 0 
              ? 'text-red-600/70 dark:text-red-400/70' 
              : 'text-gray-500/70 dark:text-gray-400/70'
          }`}>
            tasks need attention
          </p>
        </div>
      </div>

      {/* Task Status Overview */}
      <div className="p-3 bg-gray-50 dark:bg-slate-800/50 rounded-lg">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-3">Task Overview</p>
        <div className="space-y-2">
          {/* Completed */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">Completed</span>
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {statusCounts.completed}
            </span>
          </div>
          
          {/* In Progress */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">In Progress</span>
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {statusCounts.inProgress}
            </span>
          </div>
          
          {/* Assigned */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs text-gray-600 dark:text-gray-300">Assigned</span>
            </div>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
              {statusCounts.assigned}
            </span>
          </div>
          
          {/* Overdue - only show if > 0 */}
          {statusCounts.overdue > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs text-red-600 dark:text-red-400 font-medium">Overdue</span>
              </div>
              <span className="text-xs font-bold text-red-600 dark:text-red-400">
                {statusCounts.overdue}
              </span>
            </div>
          )}
        </div>
        
        {/* Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
            <div 
              className="bg-green-500 transition-all duration-500"
              style={{ width: `${(statusCounts.completed / Math.max(statusCounts.total, 1)) * 100}%` }}
            />
            <div 
              className="bg-amber-500 transition-all duration-500"
              style={{ width: `${(statusCounts.inProgress / Math.max(statusCounts.total, 1)) * 100}%` }}
            />
            <div 
              className="bg-blue-500 transition-all duration-500"
              style={{ width: `${(statusCounts.assigned / Math.max(statusCounts.total, 1)) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      {slaStats.compliancePercentage >= 90 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-lg border border-amber-200 dark:border-amber-500/20">
          <div className="flex items-start gap-2">
            <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                Outstanding Performance! 🎉
              </p>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
                You're crushing it! Keep up the excellent work.
              </p>
            </div>
          </div>
        </div>
      )}

      {slaStats.lateCount > 3 && (
        <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-lg border border-red-200 dark:border-red-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Attention Needed
              </p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-0.5">
                You have {slaStats.lateCount} overdue tasks. Consider prioritizing them.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaskStatsPanel;
