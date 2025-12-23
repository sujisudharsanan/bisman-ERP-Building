/**
 * Review List Component
 * 
 * Displays all reviews for a task in a timeline format.
 * Yellow theme for visual distinction from clarifications and approvals.
 */

'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Eye,
  CheckCircle2,
  MessageSquare,
  Clock,
  XCircle,
  Info,
  FileSearch,
  GraduationCap,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { TaskReview, ReviewStatus, ReviewPurpose } from '@/types/task';
import { useTaskReviews } from '@/hooks/useReviews';
import { getPurposeLabel, getPurposeBadgeColor } from '@/api/reviewApi';
import Link from 'next/link';

interface ReviewListProps {
  taskId: number;
  currentUserId?: number;
  canSendForReview?: boolean;
  onSendForReview?: () => void;
}

const statusIcons: Record<ReviewStatus, React.ReactNode> = {
  [ReviewStatus.PENDING]: <Clock className="w-4 h-4 text-amber-500" />,
  [ReviewStatus.ACKNOWLEDGED]: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  [ReviewStatus.COMMENTED]: <MessageSquare className="w-4 h-4 text-blue-500" />,
  [ReviewStatus.EXPIRED]: <Clock className="w-4 h-4 text-gray-400" />,
  [ReviewStatus.CANCELLED]: <XCircle className="w-4 h-4 text-gray-400" />,
};

const statusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.PENDING]: 'Pending',
  [ReviewStatus.ACKNOWLEDGED]: 'Acknowledged',
  [ReviewStatus.COMMENTED]: 'Commented',
  [ReviewStatus.EXPIRED]: 'Expired',
  [ReviewStatus.CANCELLED]: 'Cancelled',
};

const purposeIcons: Record<ReviewPurpose, React.ReactNode> = {
  [ReviewPurpose.FYI]: <Info className="w-3 h-3" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle2 className="w-3 h-3" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-3 h-3" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-3 h-3" />,
};

function ReviewCard({ review }: { review: TaskReview }) {
  const isActive = review.status === ReviewStatus.PENDING || review.status === ReviewStatus.COMMENTED;
  
  return (
    <div
      className={`
        relative p-4 rounded-lg border-2 transition-all
        ${isActive 
          ? 'border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10' 
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-xs">
              {review.senderName?.substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{review.senderName || 'Unknown User'}</p>
            <p className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getPurposeBadgeColor(review.purpose)} variant="outline">
            <span className="mr-1">{purposeIcons[review.purpose]}</span>
            {getPurposeLabel(review.purpose)}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {statusIcons[review.status]}
            {statusLabels[review.status]}
          </Badge>
        </div>
      </div>

      {/* Reviewer Info */}
      <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
        <Eye className="w-4 h-4" />
        <span>
          Sent to:{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {review.reviewerName || review.reviewerDepartmentId || 'Unknown'}
          </span>
        </span>
      </div>

      {/* Note */}
      {review.note && (
        <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm">{review.note}</p>
        </div>
      )}

      {/* Acknowledgment */}
      {review.status === ReviewStatus.ACKNOWLEDGED && review.acknowledgedAt && (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              Acknowledged by {review.acknowledgedByName || 'User'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(review.acknowledgedAt), { addSuffix: true })}
          </p>
          {review.acknowledgmentNote && (
            <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
              {review.acknowledgmentNote}
            </p>
          )}
        </div>
      )}

      {/* Comment Count */}
      {(review.commentCount ?? 0) > 0 && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
          <MessageSquare className="w-4 h-4" />
          <span>{review.commentCount} comment{(review.commentCount ?? 0) > 1 ? 's' : ''}</span>
        </div>
      )}

      {/* View Details Link */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
        <Link
          href={`/tasks/reviews/${review.id}`}
          className="inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300"
        >
          View Details
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}

function ReviewListSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2].map((i) => (
        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ canSendForReview, onSendForReview }: { canSendForReview?: boolean; onSendForReview?: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/20 mb-4">
        <Eye className="w-6 h-6 text-amber-600 dark:text-amber-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
        No Reviews Yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        This task hasn&apos;t been sent for review yet.
      </p>
      {canSendForReview && onSendForReview && (
        <Button
          variant="outline"
          onClick={onSendForReview}
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          Send for Review
        </Button>
      )}
    </div>
  );
}

export function ReviewList({
  taskId,
  currentUserId,
  canSendForReview = false,
  onSendForReview,
}: ReviewListProps) {
  const { data, isLoading, error } = useTaskReviews(taskId);

  if (isLoading) {
    return <ReviewListSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        Failed to load reviews. Please try again.
      </div>
    );
  }

  const reviews = data?.reviews || [];

  if (reviews.length === 0) {
    return <EmptyState canSendForReview={canSendForReview} onSendForReview={onSendForReview} />;
  }

  return (
    <div className="space-y-4">
      {/* Header with action button */}
      {canSendForReview && onSendForReview && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onSendForReview}
            className="border-amber-300 text-amber-700 hover:bg-amber-50"
          >
            <Plus className="w-4 h-4 mr-2" />
            Send for Review
          </Button>
        </div>
      )}

      {/* Reviews Timeline */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}
