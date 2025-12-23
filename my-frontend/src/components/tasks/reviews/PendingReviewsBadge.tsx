/**
 * Pending Reviews Badge
 * 
 * Shows pending review count in header/navigation.
 * Yellow theme to match review visual identity.
 */

'use client';

import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/Popover';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  Eye,
  ChevronRight,
  Info,
  CheckCircle,
  FileSearch,
  GraduationCap,
} from 'lucide-react';
import { usePendingReviews, useReviewStats } from '@/hooks/useReviews';
import { ReviewPurpose } from '@/types/task';
import { getPurposeLabel } from '@/api/reviewApi';
import Link from 'next/link';

interface PendingReviewsBadgeProps {
  showLabel?: boolean;
  className?: string;
}

const purposeIcons: Record<ReviewPurpose, React.ReactNode> = {
  [ReviewPurpose.FYI]: <Info className="w-3 h-3" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle className="w-3 h-3" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-3 h-3" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-3 h-3" />,
};

export function PendingReviewsBadge({ showLabel = false, className = '' }: PendingReviewsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: statsData, isLoading: statsLoading } = useReviewStats();
  const { data: reviewsData, isLoading: reviewsLoading } = usePendingReviews({ limit: 5 });

  const pendingCount = statsData?.stats?.pendingToReview ?? 0;
  const reviews = reviewsData?.reviews ?? [];

  if (statsLoading) {
    return <Skeleton className="h-8 w-8 rounded-full" />;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`relative ${className}`}
          aria-label={`${pendingCount} pending reviews`}
        >
          <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
          {showLabel && <span className="ml-2">Reviews</span>}
          {pendingCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 flex items-center justify-center bg-amber-500 hover:bg-amber-500"
            >
              {pendingCount > 99 ? '99+' : pendingCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                Pending Reviews
              </h3>
            </div>
            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
              {pendingCount}
            </Badge>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[300px] overflow-y-auto">
          {reviewsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <div className="p-6 text-center">
              <Eye className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No pending reviews</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {reviews.map((review) => (
                <Link
                  key={review.id}
                  href={`/tasks/reviews/${review.id}`}
                  onClick={() => setIsOpen(false)}
                  className="block p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="p-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30">
                        {purposeIcons[review.purpose]}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {review.taskTitle || `Task #${review.taskId}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        From: {review.senderName || 'Unknown'} • {getPurposeLabel(review.purpose)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {pendingCount > 0 && (
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <Link
              href="/tasks/reviews"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 w-full text-sm text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300 font-medium"
            >
              View All Reviews
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
