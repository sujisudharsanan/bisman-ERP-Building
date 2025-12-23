/**
 * Send For Review Modal
 * 
 * Modal for sending a completed task for review.
 * Only visible on COMPLETED tasks.
 * Yellow theme to distinguish from other workflows.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Eye,
  Send,
  Info,
  CheckCircle,
  FileSearch,
  GraduationCap,
  User,
  Building2,
  Loader2,
} from 'lucide-react';
import { ReviewPurpose } from '@/types/task';
import { useSendForReview } from '@/hooks/useReviews';
import { getPurposeLabel, getPurposeDescription } from '@/api/reviewApi';

interface SendForReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  availableUsers?: Array<{
    id: number;
    name: string;
    email: string;
    department?: string;
  }>;
  availableDepartments?: Array<{
    id: string;
    name: string;
  }>;
}

const purposeIcons: Record<ReviewPurpose, React.ReactNode> = {
  [ReviewPurpose.FYI]: <Info className="w-4 h-4" />,
  [ReviewPurpose.CONFIRMATION]: <CheckCircle className="w-4 h-4" />,
  [ReviewPurpose.AUDIT]: <FileSearch className="w-4 h-4" />,
  [ReviewPurpose.KNOWLEDGE]: <GraduationCap className="w-4 h-4" />,
};

export function SendForReviewModal({
  isOpen,
  onClose,
  taskId,
  taskTitle,
  availableUsers = [],
  availableDepartments = [],
}: SendForReviewModalProps) {
  const [reviewerType, setReviewerType] = useState<'user' | 'department'>('user');
  const [reviewerId, setReviewerId] = useState<string>('');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [purpose, setPurpose] = useState<ReviewPurpose>(ReviewPurpose.FYI);
  const [note, setNote] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [expiryDays, setExpiryDays] = useState<string>('');

  const { mutate: sendReview, isPending } = useSendForReview();

  const handleSubmit = () => {
    if (reviewerType === 'user' && !reviewerId) {
      return;
    }
    if (reviewerType === 'department' && !departmentId) {
      return;
    }

    sendReview(
      {
        taskId,
        reviewerId: reviewerType === 'user' ? parseInt(reviewerId) : undefined,
        reviewerDepartmentId: reviewerType === 'department' ? departmentId : undefined,
        purpose,
        note: note.trim() || undefined,
        priority,
        expiryDays: expiryDays ? parseInt(expiryDays) : undefined,
      },
      {
        onSuccess: () => {
          handleClose();
        },
      }
    );
  };

  const handleClose = () => {
    setReviewerType('user');
    setReviewerId('');
    setDepartmentId('');
    setPurpose(ReviewPurpose.FYI);
    setNote('');
    setPriority('normal');
    setExpiryDays('');
    onClose();
  };

  const isValid =
    (reviewerType === 'user' && reviewerId) ||
    (reviewerType === 'department' && departmentId);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
              <Eye className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <DialogTitle>Send for Review</DialogTitle>
              <DialogDescription>
                Forward this completed task for review
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Info */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-500 dark:text-gray-400">Task</p>
            <p className="font-medium">{taskTitle}</p>
          </div>

          {/* Info Banner */}
          <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              This task will remain <strong>COMPLETED</strong>. The reviewer will have
              read-only access and can only acknowledge or comment.
            </AlertDescription>
          </Alert>

          {/* Review Purpose */}
          <div className="space-y-3">
            <Label>Review Purpose</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.values(ReviewPurpose).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={`
                    p-3 rounded-lg border-2 text-left transition-all
                    ${
                      purpose === p
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`${
                        purpose === p
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-gray-500'
                      }`}
                    >
                      {purposeIcons[p]}
                    </span>
                    <span className="font-medium text-sm">{getPurposeLabel(p)}</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {getPurposeDescription(p)}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Reviewer Selection */}
          <div className="space-y-3">
            <Label>Send To</Label>
            <RadioGroup
              value={reviewerType}
              onValueChange={(v) => setReviewerType(v as 'user' | 'department')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="user" id="user" />
                <Label htmlFor="user" className="flex items-center gap-1 cursor-pointer">
                  <User className="w-4 h-4" />
                  Specific User
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="department" id="department" />
                <Label htmlFor="department" className="flex items-center gap-1 cursor-pointer">
                  <Building2 className="w-4 h-4" />
                  Department
                </Label>
              </div>
            </RadioGroup>

            {reviewerType === 'user' ? (
              <Select value={reviewerId} onValueChange={setReviewerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reviewer" />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        {user.department && (
                          <span className="text-xs text-gray-500">{user.department}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {availableDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Note (Optional)</Label>
            <Textarea
              id="note"
              placeholder="Add context about why you're sending this for review..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
            />
          </div>

          {/* Priority and Expiry */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as 'low' | 'normal' | 'high')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiry">Expires After (Days)</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger>
                  <SelectValue placeholder="No expiry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No expiry</SelectItem>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isPending}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Send for Review
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
