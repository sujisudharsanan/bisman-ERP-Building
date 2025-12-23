/**
 * Read-Only Task View for Clarification Responders
 * 
 * Shows task details in a read-only format for users responding to clarifications.
 * Clearly indicates that no actions can be taken on the task.
 */

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Lock,
  FileText,
  User,
  Calendar,
  Clock,
  Flag,
  Tag,
  MessageSquare,
  Paperclip,
  Eye,
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types/task';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { PriorityBadge } from '@/components/tasks/PriorityBadge';
import { formatDistanceToNow, format } from 'date-fns';

interface ReadOnlyTaskViewProps {
  task: {
    id: number;
    title: string;
    description?: string | null;
    status: TaskStatus | string;
    priority?: TaskPriority | string;
    creatorName?: string;
    assigneeName?: string;
    dueDate?: string | null;
    createdAt: string;
    updatedAt?: string;
    messageCount?: number;
    attachmentCount?: number;
    tags?: string[];
  };
  className?: string;
}

export function ReadOnlyTaskView({ task, className = '' }: ReadOnlyTaskViewProps) {
  return (
    <Card className={`border-purple-200 dark:border-purple-800 ${className}`}>
      {/* Read-only indicator */}
      <div className="bg-purple-50 dark:bg-purple-900/30 px-4 py-2 border-b border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
          <Eye className="w-4 h-4" />
          <span className="font-medium">Read-Only View</span>
          <span className="text-purple-600 dark:text-purple-400">
            — You can view this task for clarification purposes only
          </span>
        </div>
      </div>
      
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="w-3 h-3" />
              Task #{task.id}
            </div>
            <CardTitle className="text-lg">{task.title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status as TaskStatus} />
            {task.priority && <PriorityBadge priority={task.priority as TaskPriority} />}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Description */}
        {task.description && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </h4>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
              <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-400">
                {task.description}
              </p>
            </div>
          </div>
        )}
        
        <Separator />
        
        {/* Task Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Creator */}
          {task.creatorName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Created by:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {task.creatorName}
              </span>
            </div>
          )}
          
          {/* Assignee */}
          {task.assigneeName && (
            <div className="flex items-center gap-2 text-sm">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Assigned to:</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {task.assigneeName}
              </span>
            </div>
          )}
          
          {/* Due Date */}
          {task.dueDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Due:</span>
              <span className={`font-medium ${
                new Date(task.dueDate) < new Date() 
                  ? 'text-red-600 dark:text-red-400' 
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {format(new Date(task.dueDate), 'MMM d, yyyy')}
              </span>
            </div>
          )}
          
          {/* Created At */}
          <div className="flex items-center gap-2 text-sm">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-gray-500">Created:</span>
            <span className="text-gray-700 dark:text-gray-300">
              {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          {task.messageCount !== undefined && (
            <div className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              <span>{task.messageCount} messages</span>
            </div>
          )}
          {task.attachmentCount !== undefined && (
            <div className="flex items-center gap-1">
              <Paperclip className="w-4 h-4" />
              <span>{task.attachmentCount} attachments</span>
            </div>
          )}
        </div>
        
        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Tag className="w-4 h-4 text-gray-400" />
            {task.tags.map((tag, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
        
        {/* No Actions Notice */}
        <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
          <Lock className="h-4 w-4 text-purple-600" />
          <AlertDescription className="text-sm text-purple-700 dark:text-purple-300">
            <strong>View Only:</strong> You cannot modify this task. Task ownership, assignment, 
            and approval chain remain unchanged. Please respond to the clarification request only.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default ReadOnlyTaskView;
