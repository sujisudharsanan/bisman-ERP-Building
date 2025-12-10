'use client';

import React from 'react';
import { MessageSquare, Paperclip, User, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface TaskCardProps {
  title: string;
  subItems: { id: string, text: string }[];
  progress?: number;
  comments: number;
  attachments: number;
  color: string;
  onClick?: () => void;
  taskData?: any; // Full task object for onClick handler
  taskId?: string | number; // Unique task ID for display
}

// Status configuration with colors and labels
const statusConfig: Record<string, { label: string; bgColor: string; textColor: string; icon: React.ReactNode }> = {
  DRAFT: { label: 'Draft', bgColor: 'bg-gray-500/20', textColor: 'text-gray-400', icon: <Clock size={10} /> },
  OPEN: { label: 'Open', bgColor: 'bg-blue-500/20', textColor: 'text-blue-400', icon: <AlertCircle size={10} /> },
  ASSIGNED: { label: 'Assigned', bgColor: 'bg-indigo-500/20', textColor: 'text-indigo-400', icon: <User size={10} /> },
  IN_PROGRESS: { label: 'In Progress', bgColor: 'bg-yellow-500/20', textColor: 'text-yellow-400', icon: <Clock size={10} /> },
  IN_REVIEW: { label: 'In Review', bgColor: 'bg-purple-500/20', textColor: 'text-purple-400', icon: <AlertCircle size={10} /> },
  BLOCKED: { label: 'Blocked', bgColor: 'bg-red-500/20', textColor: 'text-red-400', icon: <AlertCircle size={10} /> },
  COMPLETED: { label: 'Completed', bgColor: 'bg-green-500/20', textColor: 'text-green-400', icon: <CheckCircle size={10} /> },
  DONE: { label: 'Done', bgColor: 'bg-green-500/20', textColor: 'text-green-400', icon: <CheckCircle size={10} /> },
};

const TaskCard: React.FC<TaskCardProps> = ({ title, subItems, progress, comments, attachments, color, onClick, taskId, taskData }) => {
  // Fixed: Pre-defined Tailwind classes instead of dynamic interpolation
  const colorClasses: Record<string, string> = {
    blue: 'from-blue-500 to-blue-600/70',
    pink: 'from-pink-500 to-pink-600/70',
    purple: 'from-purple-500 to-purple-600/70',
    yellow: 'from-yellow-500 to-yellow-600/70',
    green: 'from-green-500 to-green-600/70',
    cyan: 'from-cyan-500 to-cyan-600/70',
    teal: 'from-teal-500 to-teal-600/70',
    indigo: 'from-indigo-500 to-indigo-600/70',
  };
  
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

  return (
    <div 
      className="bg-panel/60 backdrop-blur-sm rounded-2xl p-3 mb-2.5 shadow-lg hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 border border-theme cursor-pointer"
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
      {/* Task ID and Status Badge Row */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        {displayTaskId && (
          <span className="inline-block px-1.5 py-0.5 text-[10px] font-mono font-medium bg-gray-800/50 text-gray-300 rounded border border-gray-600/50">
            {displayTaskId}
          </span>
        )}
        {/* Status Badge */}
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-semibold rounded ${statusInfo.bgColor} ${statusInfo.textColor}`}>
          {statusInfo.icon}
          {statusInfo.label}
        </span>
      </div>
      
      <h3 className="font-bold mb-2 text-theme text-sm leading-tight">{title}</h3>
      
      <div className="space-y-2">
        {subItems.map(item => (
          <div 
            key={item.id} 
            className={`p-2 rounded-lg bg-gradient-to-r ${colorClasses[color] || colorClasses.blue} text-white text-[12px] font-medium shadow-sm`}
          >
            {item.text}
          </div>
        ))}
      </div>
      
      {/* Assignee Info */}
      {assigneeName && (
        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-gray-400">
          <User size={10} />
          <span>
            {isCreator ? 'Assigned to: ' : isAssignee ? 'From: ' : ''}
            <span className="text-gray-300">{assigneeName}</span>
          </span>
        </div>
      )}
      
      {progress !== undefined && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-green-400 to-green-500 h-1 rounded-full transition-all duration-500" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center mt-2.5 text-gray-400 text-[11px]">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1">
            <MessageSquare size={12} />
            <span>{comments}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Paperclip size={12} />
            <span>{attachments}</span>
          </div>
        </div>
        {/* Role indicator */}
        {(isCreator || isAssignee) && (
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${isCreator ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
            {isCreator ? 'Creator' : 'Assignee'}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
