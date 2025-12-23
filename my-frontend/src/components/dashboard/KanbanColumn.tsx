'use client';

import React from 'react';
import TaskCard from './TaskCard';
import { CheckCircle, AlertTriangle, Clock, PlayCircle, HelpCircle } from 'lucide-react';

interface KanbanColumnProps {
  title: string;
  tasks: any[];
  showCreate?: boolean;
  onCreate?: () => void;
  onTaskClick?: (task: any) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, showCreate = false, onCreate, onTaskClick }) => {
  // Refined color semantics: Green for Done, Orange/Red for Need Attention, Purple for Clarification
  // Using colors that work well in both light and dark modes
  const getColumnStyle = (title: string) => {
    const styles: Record<string, { textColor: string; badgeBg: string; badgeText: string; borderColor: string }> = {
      'ASSIGNED': { textColor: 'text-blue-600 dark:text-blue-400', badgeBg: 'bg-blue-500', badgeText: 'text-white', borderColor: 'border-l-blue-500' },
      'DRAFT': { textColor: 'text-gray-600 dark:text-gray-400', badgeBg: 'bg-gray-500', badgeText: 'text-white', borderColor: 'border-l-gray-500' },
      'IN PROGRESS': { textColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'bg-amber-500', badgeText: 'text-white', borderColor: 'border-l-amber-500' },
      'EDITING': { textColor: 'text-orange-600 dark:text-orange-400', badgeBg: 'bg-orange-500', badgeText: 'text-white', borderColor: 'border-l-orange-500' },
      'NEED ATTENTION': { textColor: 'text-red-600 dark:text-red-400', badgeBg: 'bg-red-500', badgeText: 'text-white', borderColor: 'border-l-red-500' },
      'DONE': { textColor: 'text-green-600 dark:text-green-400', badgeBg: 'bg-green-500', badgeText: 'text-white', borderColor: 'border-l-green-500' },
      'WAITING FOR CLARIFICATION': { textColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-500', badgeText: 'text-white', borderColor: 'border-l-purple-500' },
      'CLARIFICATION': { textColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'bg-purple-500', badgeText: 'text-white', borderColor: 'border-l-purple-500' },
    };
    return styles[title] || { textColor: 'text-gray-600 dark:text-gray-400', badgeBg: 'bg-gray-500', badgeText: 'text-white', borderColor: 'border-l-gray-500' };
  };

  // Empty state content per column
  const getEmptyState = (title: string) => {
    const emptyStates: Record<string, { icon: React.ReactNode; message: string }> = {
      'ASSIGNED': { 
        icon: <PlayCircle className="w-8 h-8 text-blue-500/30" />, 
        message: 'No tasks waiting to start' 
      },
      'IN PROGRESS': { 
        icon: <Clock className="w-8 h-8 text-amber-500/30" />, 
        message: 'No tasks in progress' 
      },
      'NEED ATTENTION': { 
        icon: <AlertTriangle className="w-8 h-8 text-red-500/30" />, 
        message: 'No tasks need attention' 
      },
      'DONE': { 
        icon: <CheckCircle className="w-8 h-8 text-green-500/30" />, 
        message: 'Completed tasks appear here' 
      },
      'WAITING FOR CLARIFICATION': { 
        icon: <HelpCircle className="w-8 h-8 text-purple-500/30" />, 
        message: 'Tasks awaiting clarification appear here' 
      },
    };
    return emptyStates[title] || { icon: <Clock className="w-8 h-8 text-gray-500/30" />, message: 'No tasks' };
  };

  const columnStyle = getColumnStyle(title);
  const emptyState = getEmptyState(title);

  // Count tasks awaiting approval (IN_REVIEW status shown in IN PROGRESS column)
  const awaitingApprovalCount = tasks.filter(t => t.status === 'IN_REVIEW').length;

  return (
    <div className="relative flex flex-col flex-1 min-w-[13rem] max-w-[17rem] max-h-[calc(100vh-200px)] p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700/50 shadow-sm">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 flex-wrap">
          <h2 className={`font-semibold text-sm uppercase tracking-wide ${columnStyle.textColor}`}>{title}</h2>
          {/* Count badge */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${columnStyle.badgeBg} ${columnStyle.badgeText}`}>
            {tasks.length}
          </span>
          {/* Awaiting approval indicator for IN PROGRESS column */}
          {title === 'IN PROGRESS' && awaitingApprovalCount > 0 && (
            <span className="text-purple-300 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30">
              {awaitingApprovalCount} awaiting
            </span>
          )}
        </div>
        {showCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center justify-center text-xs px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-medium rounded-lg transition-colors"
          >
            + Create
          </button>
        )}
      </div>
      
      {/* Task Cards or Empty State - Scrollable container with max height */}
      <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            {emptyState.icon}
            <p className="mt-2 text-xs text-gray-400 dark:text-slate-500">{emptyState.message}</p>
          </div>
        ) : (
          tasks.map(task => (
            <TaskCard 
              key={task.id}
              title={task.title}
              subItems={task.subItems}
              progress={task.progress}
              comments={task.comments}
              attachments={task.attachments}
              color={task.color}
              columnBorderColor={columnStyle.borderColor}
              onClick={() => onTaskClick?.(task)}
              taskData={task}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
