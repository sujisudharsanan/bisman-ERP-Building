'use client';

import React from 'react';
import { MessageSquare, Paperclip, User, Clock, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';

interface TaskCardProps {
  title: string;
  subItems: { id: string, text: string }[];
  progress?: number;
  comments: number;
  attachments: number;
  color: string;
  columnBorderColor?: string;
  onClick?: () => void;
  taskData?: any;
  taskId?: string | number;
}

// Refined status configuration with proper color semantics - shortened labels for compact display
// Using specific colors that work in both light and dark modes
const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', bgColor: 'bg-slate-100 dark:bg-slate-500/10', textColor: 'text-slate-600 dark:text-slate-400', borderColor: 'border-l-slate-400', icon: <Clock size={10} /> },
  OPEN: { label: 'Open', bgColor: 'bg-blue-100 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-400', icon: <AlertCircle size={10} /> },
  ASSIGNED: { label: 'Assigned', bgColor: 'bg-blue-100 dark:bg-blue-500/10', textColor: 'text-blue-600 dark:text-blue-400', borderColor: 'border-l-blue-400', icon: <User size={10} /> },
  IN_PROGRESS: { label: 'Working', bgColor: 'bg-amber-100 dark:bg-amber-500/10', textColor: 'text-amber-600 dark:text-amber-400', borderColor: 'border-l-amber-400', icon: <Clock size={10} /> },
  IN_REVIEW: { label: 'Review', bgColor: 'bg-purple-100 dark:bg-purple-500/10', textColor: 'text-purple-600 dark:text-purple-400', borderColor: 'border-l-purple-400', icon: <Clock size={10} /> },
  NEED_ATTENTION: { label: 'Attention', bgColor: 'bg-red-100 dark:bg-red-500/10', textColor: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-400', icon: <AlertTriangle size={10} /> },
  EDITING: { label: 'Revise', bgColor: 'bg-orange-100 dark:bg-orange-500/10', textColor: 'text-orange-600 dark:text-orange-400', borderColor: 'border-l-orange-400', icon: <AlertTriangle size={10} /> },
  BLOCKED: { label: 'Blocked', bgColor: 'bg-red-100 dark:bg-red-500/10', textColor: 'text-red-600 dark:text-red-400', borderColor: 'border-l-red-500', icon: <AlertCircle size={10} /> },
  COMPLETED: { label: 'Done', bgColor: 'bg-green-100 dark:bg-green-500/10', textColor: 'text-green-600 dark:text-green-400', borderColor: 'border-l-green-400', icon: <CheckCircle size={10} /> },
  DONE: { label: 'Done', bgColor: 'bg-green-100 dark:bg-green-500/10', textColor: 'text-green-600 dark:text-green-400', borderColor: 'border-l-green-400', icon: <CheckCircle size={10} /> },
};

const TaskCard: React.FC<TaskCardProps> = ({ title, subItems, progress, comments, attachments, onClick, taskId, taskData, columnBorderColor }) => {
  // Generate display ID from taskId, taskData, or fallback
  const displayTaskId = taskId || taskData?.unique_id || taskData?.serialNumber || 
    (taskData?.id ? `TSK-${String(taskData.id).padStart(5, '0')}` : null);

  // Get status info
  const taskStatus = taskData?.status || 'DRAFT';
  const statusInfo = statusConfig[taskStatus] || statusConfig.DRAFT;
  
  // Get assignee name
  const assigneeName = taskData?.assignee_name || taskData?.assignee?.username || null;
  
  // Check if current user is creator or assignee
  const isCreator = taskData?.statusInfo?.isCreator;
  const isAssignee = taskData?.statusInfo?.isAssignee;

  // Only show progress if > 0
  const showProgress = progress !== undefined && progress > 0;

  // Use column border color if provided, otherwise use status-based border
  const borderColorClass = columnBorderColor || statusInfo.borderColor;

  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-slate-700 hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-gray-200/80 dark:border-slate-600/60 shadow-sm hover:shadow-md border-l-[3px] ${borderColorClass}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Header Row: Status Badge + Task ID */}
      <div className="flex items-center justify-between gap-2 mb-2">
        {/* Status Badge - Primary */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full whitespace-nowrap ${statusInfo.bgColor} ${statusInfo.textColor}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
        {/* Task ID - Muted */}
        {displayTaskId && (
          <span className="text-[10px] font-mono text-gray-400 dark:text-slate-500">
            {displayTaskId}
          </span>
        )}
      </div>
      
      {/* Title - Most Prominent, Capitalized */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mb-2 capitalize">{title}</h3>
      
      {/* Description/SubItems - Subtle background */}
      {subItems && subItems.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {subItems.slice(0, 2).map(item => (
            <div 
              key={item.id} 
              className="px-2.5 py-1.5 rounded-md bg-gray-100 dark:bg-slate-600/50 text-gray-600 dark:text-slate-300 text-[11px] leading-relaxed border-l-2 border-gray-300 dark:border-slate-500/50"
            >
              {item.text}
            </div>
          ))}
          {subItems.length > 2 && (
            <span className="text-[10px] text-gray-400 dark:text-slate-500">+{subItems.length - 2} more</span>
          )}
        </div>
      )}
      
      {/* Progress - Only show if > 0 */}
      {showProgress && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-400 mb-1">
            <span>Progress</span>
            <span className="font-medium text-gray-700 dark:text-slate-300">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-400 h-1.5 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Footer: By Assignee Name, Comments, Attachments */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-600/30">
        {/* By Assignee Name */}
        <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-slate-400 min-w-0 flex-1 mr-2">
          <span className="text-gray-400 dark:text-slate-500 shrink-0">By</span>
          {assigneeName ? (
            <span className="text-gray-700 dark:text-slate-300 truncate">{assigneeName}</span>
          ) : (
            <span className="text-gray-400 dark:text-slate-500 italic">Unassigned</span>
          )}
        </div>
        
        {/* Meta: Comments & Attachments */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 dark:text-slate-500 shrink-0">
          {comments > 0 && (
            <div className="flex items-center gap-1">
              <MessageSquare size={11} />
              <span>{comments}</span>
            </div>
          )}
          {attachments > 0 && (
            <div className="flex items-center gap-1">
              <Paperclip size={11} />
              <span>{attachments}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
