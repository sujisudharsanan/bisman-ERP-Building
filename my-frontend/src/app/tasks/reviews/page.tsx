/**
 * Reviews Page
 * 
 * Main page for viewing and managing post-completion task reviews.
 * Shows pending reviews to respond to and reviews sent by the user.
 */

'use client';

import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Eye,
  Search,
  CheckCircle2,
  Clock,
  MessageSquare,
  XCircle,
  Info,
  FileSearch,
  GraduationCap,
  ChevronRight,
  Filter,
  Send,
} from 'lucide-react';
import {
  usePendingReviews,
  useSentReviews,
  useReviewStats,
} from '@/hooks/useReviews';
import { TaskReview, ReviewStatus, ReviewPurpose } from '@/types/task';
import { getPurposeLabel, getPurposeBadgeColor } from '@/api/reviewApi';
import Link from 'next/link';

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

interface ReviewCardProps {
  review: TaskReview;
  showSender?: boolean;
  showReviewer?: boolean;
}

function ReviewCard({ review, showSender = true, showReviewer = false }: ReviewCardProps) {
  const isActive = review.status === ReviewStatus.PENDING || review.status === ReviewStatus.COMMENTED;
  
  return (
    <Link href={`/tasks/reviews/${review.id}`}>
      <Card
        className={`
          cursor-pointer transition-all hover:shadow-md
          ${isActive 
            ? 'border-amber-200 dark:border-amber-800 hover:border-amber-300' 
            : 'hover:border-gray-300'
          }
        `}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`
              p-3 rounded-lg flex-shrink-0
              ${isActive 
                ? 'bg-amber-100 dark:bg-amber-900/30' 
                : 'bg-gray-100 dark:bg-gray-800'
              }
            `}>
              <Eye className={`w-5 h-5 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Task Title */}
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                {review.taskTitle || `Task #${review.taskId}`}
              </h3>

              {/* Meta Info */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Badge className={getPurposeBadgeColor(review.purpose)} variant="outline">
                  {purposeIcons[review.purpose]}
                  <span className="ml-1">{getPurposeLabel(review.purpose)}</span>
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  {statusIcons[review.status]}
                  {statusLabels[review.status]}
                </Badge>
                {review.priority === 'high' && (
                  <Badge variant="destructive" className="text-xs">High Priority</Badge>
                )}
              </div>

              {/* Person Info */}
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                {showSender && (
                  <div className="flex items-center gap-1">
                    <span>From:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {review.senderName || 'Unknown'}
                    </span>
                  </div>
                )}
                {showReviewer && (
                  <div className="flex items-center gap-1">
                    <span>To:</span>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      {review.reviewerName || review.reviewerDepartmentId || 'Unknown'}
                    </span>
                  </div>
                )}
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Note Preview */}
              {review.note && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                  {review.note}
                </p>
              )}
            </div>

            {/* Arrow */}
            <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function StatsCards() {
  const { data, isLoading } = useReviewStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-4 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="border-amber-200 dark:border-amber-800">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Eye className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats?.pendingToReview ?? 0}</p>
              <p className="text-sm text-gray-500">To Review</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{stats?.pendingSent ?? 0}</p>
              <p className="text-sm text-gray-500">Pending Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats?.totalAcknowledged ?? 0}</p>
              <p className="text-sm text-gray-500">Acknowledged</p>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <Send className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{stats?.totalSent ?? 0}</p>
              <p className="text-sm text-gray-500">Total Sent</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PendingReviewsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = usePendingReviews({ page, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <Eye className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No Pending Reviews
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You don&apos;t have any reviews waiting for your attention.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} showSender />
      ))}
      
      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-500">
            Page {page} of {data.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function SentReviewsList() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useSentReviews({ page, limit: 20 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
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
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
          <Send className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
          No Reviews Sent
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          You haven&apos;t sent any tasks for review yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard key={review.id} review={review} showSender={false} showReviewer />
      ))}
      
      {/* Pagination */}
      {data?.pagination && data.pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-500">
            Page {page} of {data.pagination.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= data.pagination.pages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-amber-100 dark:bg-amber-900/30">
            <Eye className="w-6 h-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Task Reviews
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              View and manage post-completion task reviews
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-8">
        <StatsCards />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <TabsList>
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              To Review
            </TabsTrigger>
            <TabsTrigger value="sent" className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Sent by Me
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
        </div>

        <TabsContent value="pending">
          <PendingReviewsList />
        </TabsContent>

        <TabsContent value="sent">
          <SentReviewsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
