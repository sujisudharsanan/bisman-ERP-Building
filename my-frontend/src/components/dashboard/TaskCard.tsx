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
  onClick?: () => void;
  taskData?: any;
  taskId?: string | number;
}

// Refined status configuration with proper color semantics
const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; borderColor: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', bgColor: 'bg-slate-500/10', textColor: 'text-slate-400', borderColor: 'border-l-slate-400', icon: <Clock size={10} /> },
  OPEN: { label: 'Open', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-l-blue-400', icon: <AlertCircle size={10} /> },
  ASSIGNED: { label: 'Assigned', bgColor: 'bg-blue-500/10', textColor: 'text-blue-400', borderColor: 'border-l-blue-400', icon: <User size={10} /> },
  IN_PROGRESS: { label: 'In Progress', bgColor: 'bg-amber-500/10', textColor: 'text-amber-400', borderColor: 'border-l-amber-400', icon: <Clock size={10} /> },
  IN_REVIEW: { label: 'Awaiting Approval', bgColor: 'bg-purple-500/10', textColor: 'text-purple-400', borderColor: 'border-l-purple-400', icon: <Clock size={10} /> },
  NEED_ATTENTION: { label: 'Needs Attention', bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-l-red-400', icon: <AlertTriangle size={10} /> },
  EDITING: { label: 'Needs Revision', bgColor: 'bg-orange-500/10', textColor: 'text-orange-400', borderColor: 'border-l-orange-400', icon: <AlertTriangle size={10} /> },
  BLOCKED: { label: 'Blocked', bgColor: 'bg-red-500/10', textColor: 'text-red-400', borderColor: 'border-l-red-500', icon: <AlertCircle size={10} /> },
  COMPLETED: { label: 'Done', bgColor: 'bg-green-500/10', textColor: 'text-green-400', borderColor: 'border-l-green-400', icon: <CheckCircle size={10} /> },
  DONE: { label: 'Done', bgColor: 'bg-green-500/10', textColor: 'text-green-400', borderColor: 'border-l-green-400', icon: <CheckCircle size={10} /> },
};

const TaskCard: React.FC<TaskCardProps> = ({ title, subItems, progress, comments, attachments, onClick, taskId, taskData }) => {
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

  return (
    <div 
      className={`bg-gray-50 dark:bg-slate-700 rounded-lg p-4 hover:bg-gray-100 dark:hover:bg-slate-600 hover:scale-[1.01] transition-all duration-200 cursor-pointer border border-gray-200 dark:border-slate-600/50 border-l-[3px] ${statusInfo.borderColor}`}
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
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full ${statusInfo.bgColor} ${statusInfo.textColor}`}>
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
      
      {/* Title - Most Prominent */}
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug mb-2">{title}</h3>
      
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
      
      {/* Footer: Assignee, Comments, Attachments */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-slate-600/30">
        {/* Assignee */}
        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 dark:text-slate-400">
          <User size={11} className="text-gray-400 dark:text-slate-500" />
          {assigneeName ? (
            <span className="text-gray-700 dark:text-slate-300">{assigneeName}</span>
          ) : (
            <span className="text-gray-400 dark:text-slate-500">Unassigned</span>
          )}
        </div>
        
        {/* Meta: Comments & Attachments */}
        <div className="flex items-center gap-3 text-[10px] text-gray-400 dark:text-slate-500">
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
          {/* Role indicator */}
          {(isCreator || isAssignee) && (
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
              isCreator ? 'bg-blue-500/20 text-blue-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {isCreator ? 'Creator' : 'Assignee'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
