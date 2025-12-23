/**
 * Reviewer Task View
 * 
 * Read-only view of a task for reviewers.
 * Clearly indicates read-only status with yellow theme.
 * No edit/approve/reject buttons - only acknowledge and comment.
 */

'use client';

import React from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Separator } from '@/components/ui/Separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Eye,
  Lock,
  Calendar,
  User,
  FileText,
  Flag,
  Clock,
  CheckCircle2,
  Info,
  FileSearch,
  GraduationCap,
} from 'lucide-react';
import { TaskReview, ReviewPurpose, TaskStatus, TaskPriority } from '@/types/task';
import { StatusBadge } from '@/components/tasks/StatusBadge';
import { getPurposeLabel, getPurposeBadgeColor } from '@/api/reviewApi';

interface ReviewerTaskViewProps {
  review: TaskReview;
}

const purposeIcons: Record<ReviewPurpose, React.ReactNode> = {
  [ReviewPurpose.FYI]: <Info className="w-4 h-4" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle2 className="w-4 h-4" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-4 h-4" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-4 h-4" />,
};

const priorityColors: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
  CRITICAL: 'bg-red-200 text-red-800',
};

export function ReviewerTaskView({ review }: ReviewerTaskViewProps) {
  return (
    <div className="space-y-6">
      {/* Read-Only Banner */}
      <Alert className="border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20">
        <Lock className="h-5 w-5 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-300">
          Read-Only View
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-400">
          You are viewing this task for review purposes only. You cannot make changes
          to the task. You can acknowledge the review and add comments.
        </AlertDescription>
      </Alert>

      {/* Review Context */}
      <Card className="border-amber-200 dark:border-amber-800">
        <CardHeader className="bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-800">
                <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Review Request</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  From {review.senderName || 'Unknown'} •{' '}
                  {format(new Date(review.createdAt), 'PPp')}
                </p>
              </div>
            </div>
            <Badge className={getPurposeBadgeColor(review.purpose)} variant="outline">
              {purposeIcons[review.purpose]}
              <span className="ml-1">{getPurposeLabel(review.purpose)}</span>
            </Badge>
          </div>
        </CardHeader>
        {review.note && (
          <CardContent className="pt-4">
            <p className="text-sm text-gray-500 mb-1">Sender&apos;s Note:</p>
            <p className="text-gray-700 dark:text-gray-300">{review.note}</p>
          </CardContent>
        )}
      </Card>

      {/* Task Details */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl mb-2">
                {review.taskTitle || `Task #${review.taskId}`}
              </CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={review.taskStatus as TaskStatus || 'COMPLETED'} />
                {review.taskPriority && (
                  <Badge
                    variant="outline"
                    className={priorityColors[review.taskPriority] || priorityColors.MEDIUM}
                  >
                    <Flag className="w-3 h-3 mr-1" />
                    {review.taskPriority}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Description */}
          {review.taskDescription && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Description
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {review.taskDescription}
                </p>
              </div>
            </div>
          )}

          <Separator />

          {/* Task Metadata */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Completed Date */}
            {review.taskCompletedAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Completed</p>
                  <p className="text-sm font-medium">
                    {format(new Date(review.taskCompletedAt), 'PP')}
                  </p>
                </div>
              </div>
            )}

            {/* Sender */}
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                  {review.senderName?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sent By</p>
                <p className="text-sm font-medium">{review.senderName || 'Unknown'}</p>
              </div>
            </div>

            {/* Expiry */}
            {review.expiresAt && (
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                  <Clock className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                  <p className="text-sm font-medium">
                    {format(new Date(review.expiresAt), 'PP')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Purpose-specific guidance */}
          <div className="mt-6 p-4 rounded-lg border-2 border-dashed border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10">
            <h4 className="font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-2">
              {purposeIcons[review.purpose]}
              What&apos;s Expected
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {review.purpose === ReviewPurpose.FYI && (
                <>This is for your information only. No specific action is required, but you should acknowledge that you&apos;ve seen it.</>
              )}
              {review.purpose === ReviewPurpose.CONFIRMATION && (
                <>Please review the task and confirm that you have understood the content. Add a note with your confirmation.</>
              )}
              {review.purpose === ReviewPurpose.AUDIT && (
                <>This task has been sent for audit/compliance purposes. Review the task and acknowledge for the audit trail.</>
              )}
              {review.purpose === ReviewPurpose.KNOWLEDGE && (
                <>This task has been shared for knowledge/training purposes. Review it as a reference for future work.</>
              )}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
