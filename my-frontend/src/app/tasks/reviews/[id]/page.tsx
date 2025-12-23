/**
 * Review Detail Page
 * 
 * Shows full details of a review including task info,
 * comments, and action buttons.
 */

'use client';

import React, { useState, use } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Separator } from '@/components/ui/Separator';
import { Skeleton } from '@/components/ui/Skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Eye,
  CheckCircle2,
  MessageSquare,
  Clock,
  XCircle,
  Info,
  FileSearch,
  GraduationCap,
  ArrowLeft,
  Send,
  History,
  Loader2,
} from 'lucide-react';
import {
  useReviewDetails,
  useReviewAudit,
  useAcknowledgeReview,
  useAddReviewComment,
  useCancelReview,
} from '@/hooks/useReviews';
import { ReviewStatus, ReviewPurpose } from '@/types/task';
import { getPurposeLabel, getPurposeBadgeColor, canAcknowledge, canComment, canCancel } from '@/api/reviewApi';
import { ReviewerTaskView, AcknowledgeReviewModal } from '@/components/tasks/reviews';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

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
  [ReviewPurpose.FYI]: <Info className="w-4 h-4" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle2 className="w-4 h-4" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-4 h-4" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-4 h-4" />,
};

interface ReviewDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReviewDetailPage({ params }: ReviewDetailPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [commentText, setCommentText] = useState('');

  const { data, isLoading, error } = useReviewDetails(id);
  const { data: auditData, isLoading: auditLoading } = useReviewAudit(id);
  const { mutate: addComment, isPending: isAddingComment } = useAddReviewComment();
  const { mutate: cancel, isPending: isCancelling } = useCancelReview();

  const review = data?.review;
  const comments = review?.comments || [];
  const auditEntries = auditData?.audit || [];

  const handleAddComment = () => {
    if (!commentText.trim() || !review) return;

    addComment(
      {
        reviewId: review.id,
        content: commentText.trim(),
      },
      {
        onSuccess: () => {
          setCommentText('');
        },
      }
    );
  };

  const handleCancel = () => {
    if (!review) return;
    cancel({ reviewId: review.id });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <Card>
          <CardContent className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !review) {
    return (
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="text-center py-12">
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Review Not Found
          </h2>
          <p className="text-gray-500 mb-4">
            The review you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link href="/tasks/reviews">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Reviews
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isActive = review.status === ReviewStatus.PENDING || review.status === ReviewStatus.COMMENTED;

  return (
    <div className="container mx-auto py-6 px-4 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/tasks/reviews"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Reviews
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className={`
            p-3 rounded-lg
            ${isActive 
              ? 'bg-amber-100 dark:bg-amber-900/30' 
              : 'bg-gray-100 dark:bg-gray-800'
            }
          `}>
            <Eye className={`w-6 h-6 ${isActive ? 'text-amber-600' : 'text-gray-400'}`} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Review Request
            </h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge className={getPurposeBadgeColor(review.purpose)} variant="outline">
                {purposeIcons[review.purpose]}
                <span className="ml-1">{getPurposeLabel(review.purpose)}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                {statusIcons[review.status]}
                {statusLabels[review.status]}
              </Badge>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {canAcknowledge(review) && (
            <Button
              onClick={() => setShowAcknowledgeModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
          )}
          {canCancel(review) && (
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={isCancelling}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              {isCancelling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Cancel
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="task" className="space-y-6">
        <TabsList>
          <TabsTrigger value="task" className="flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Task Details
          </TabsTrigger>
          <TabsTrigger value="comments" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Comments ({comments.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Task Tab */}
        <TabsContent value="task">
          <ReviewerTaskView review={review} />
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comment Input */}
              {canComment(review) && (
                <div className="space-y-3">
                  <Textarea
                    placeholder="Add a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddComment}
                      disabled={!commentText.trim() || isAddingComment}
                    >
                      {isAddingComment ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Add Comment
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Comments List */}
              {comments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No comments yet
                </div>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                            {comment.authorName?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {comment.authorName || 'Unknown'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300">
                        {comment.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Tab */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5" />
                Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : auditEntries.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No audit entries
                </div>
              ) : (
                <div className="space-y-4">
                  {auditEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-3 p-3 border-l-2 border-amber-200 dark:border-amber-800 bg-gray-50 dark:bg-gray-800/50 rounded-r-lg"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gray-200 dark:bg-gray-700 text-xs">
                          {entry.actorName?.substring(0, 2).toUpperCase() || 'S'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm">
                          <span className="font-medium">{entry.actorName || 'System'}</span>
                          {' '}
                          <span className="text-gray-600 dark:text-gray-400">
                            {entry.action === 'send' && 'sent this task for review'}
                            {entry.action === 'view' && 'viewed this review'}
                            {entry.action === 'comment' && 'added a comment'}
                            {entry.action === 'acknowledge' && 'acknowledged this review'}
                            {entry.action === 'cancel' && 'cancelled this review'}
                            {entry.action === 'expire' && 'review expired'}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(entry.createdAt), 'PPp')}
                        </p>
                        {entry.comment && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 italic">
                            &quot;{entry.comment}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Acknowledge Modal */}
      {showAcknowledgeModal && (
        <AcknowledgeReviewModal
          isOpen={showAcknowledgeModal}
          onClose={() => setShowAcknowledgeModal(false)}
          review={review}
        />
      )}
    </div>
  );
}
