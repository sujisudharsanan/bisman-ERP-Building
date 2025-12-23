/**
 * Acknowledge Review Modal
 * 
 * Modal for acknowledging a review with an optional note.
 * No approve/reject buttons - just acknowledge and comment.
 */

'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Eye,
  Info,
  Loader2,
  FileSearch,
  GraduationCap,
} from 'lucide-react';
import { TaskReview, ReviewPurpose } from '@/types/task';
import { useAcknowledgeReview } from '@/hooks/useReviews';
import { getPurposeLabel, getPurposeBadgeColor } from '@/api/reviewApi';

interface AcknowledgeReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: TaskReview;
}

const purposeIcons: Record<ReviewPurpose, React.ReactNode> = {
  [ReviewPurpose.FYI]: <Info className="w-4 h-4" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle2 className="w-4 h-4" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-4 h-4" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-4 h-4" />,
};

export function AcknowledgeReviewModal({
  isOpen,
  onClose,
  review,
}: AcknowledgeReviewModalProps) {
  const [acknowledgmentNote, setAcknowledgmentNote] = useState('');

  const { mutate: acknowledge, isPending } = useAcknowledgeReview();

  const handleSubmit = () => {
    acknowledge(
      {
        reviewId: review.id,
        acknowledgmentNote: acknowledgmentNote.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setAcknowledgmentNote('');
    onClose();
  };

  // Determine note requirement based on purpose
  const noteRequired = review.purpose === ReviewPurpose.CONFIRMATION;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <DialogTitle>Acknowledge Review</DialogTitle>
              <DialogDescription>
                Confirm that you have reviewed this task
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Task</p>
            <p className="font-medium">{review.taskTitle || `Task #${review.taskId}`}</p>
          </div>

          {/* Review Info */}
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm">
                <span className="text-gray-500">From:</span>{' '}
                <span className="font-medium">{review.senderName || 'Unknown'}</span>
              </p>
            </div>
            <Badge className={getPurposeBadgeColor(review.purpose)} variant="outline">
              {purposeIcons[review.purpose]}
              <span className="ml-1">{getPurposeLabel(review.purpose)}</span>
            </Badge>
          </div>

          {/* Sender's Note */}
          {review.note && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 mb-1">Sender&apos;s Note:</p>
              <p className="text-sm">{review.note}</p>
            </div>
          )}

          {/* Purpose-specific guidance */}
          {review.purpose === ReviewPurpose.CONFIRMATION && (
            <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-300">
                This review requests your <strong>confirmation</strong>. Please add a note
                confirming you have reviewed and understood the task.
              </AlertDescription>
            </Alert>
          )}

          {/* Acknowledgment Note */}
          <div className="space-y-2">
            <Label htmlFor="acknowledgmentNote">
              Your Note {noteRequired ? '(Required)' : '(Optional)'}
            </Label>
            <Textarea
              id="acknowledgmentNote"
              placeholder={
                review.purpose === ReviewPurpose.CONFIRMATION
                  ? 'I have reviewed and understood the task...'
                  : 'Add an optional note about your review...'
              }
              value={acknowledgmentNote}
              onChange={(e) => setAcknowledgmentNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Info about what happens */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Acknowledging will mark this review as complete. The sender will be notified.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isPending || (noteRequired && !acknowledgmentNote.trim())}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Acknowledging...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Acknowledge
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
