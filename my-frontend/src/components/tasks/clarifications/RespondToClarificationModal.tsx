/**
 * Respond to Clarification Modal
 * 
 * Modal for responding to a clarification request.
 * Shows read-only task context and allows submitting a response.
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/Dialog';
import Button from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import Badge from '@/components/ui/Badge';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import { Separator } from '@/components/ui/Separator';
import {
  MessageSquare,
  User,
  Clock,
  AlertCircle,
  Loader2,
  FileText,
  Lock,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { useRespondToClarification, useClarification } from '@/hooks/useClarifications';
import { TaskClarification, ClarificationUrgency } from '@/types/task';
import { formatDistanceToNow, format } from 'date-fns';

interface RespondToClarificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clarificationId: string;
  onSuccess?: () => void;
}

const urgencyColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 border-gray-300',
  normal: 'bg-blue-100 text-blue-700 border-blue-300',
  high: 'bg-orange-100 text-orange-700 border-orange-300',
  critical: 'bg-red-100 text-red-700 border-red-300',
};

export function RespondToClarificationModal({
  isOpen,
  onClose,
  clarificationId,
  onSuccess,
}: RespondToClarificationModalProps) {
  const [response, setResponse] = useState('');
  
  const { data: clarificationData, isLoading } = useClarification(
    isOpen ? clarificationId : null
  );
  const clarification = clarificationData?.clarification;
  
  const respondToClarification = useRespondToClarification();
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setResponse('');
    }
  }, [isOpen]);
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!response.trim()) return;
    
    respondToClarification.mutate(
      {
        clarificationId,
        response: response.trim(),
      },
      {
        onSuccess: () => {
          onClose();
          onSuccess?.();
        },
      }
    );
  };
  
  const isExpiringSoon = clarification?.expiresAt && 
    new Date(clarification.expiresAt).getTime() - Date.now() < 12 * 60 * 60 * 1000; // 12 hours
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
            <MessageSquare className="w-5 h-5" />
            Respond to Clarification Request
          </DialogTitle>
          <DialogDescription>
            Review the question and provide your response.
            You have read-only access to this task.
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : clarification ? (
          <>
            {/* Read-only notice */}
            <Alert className="border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800">
              <Lock className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-700 dark:text-purple-300">
                You can only respond to this clarification. Task ownership and approval
                chain remain with the original assignees.
              </AlertDescription>
            </Alert>
            
            {/* Task Context */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <FileText className="w-4 h-4" />
                <span className="font-medium">Task:</span>
                <span>{clarification.taskTitle || 'Task details'}</span>
              </div>
              {clarification.taskPriority && (
                <Badge variant="outline" className="text-xs">
                  Priority: {clarification.taskPriority}
                </Badge>
              )}
            </div>
            
            <Separator />
            
            {/* Clarification Details */}
            <div className="space-y-4">
              {/* Requester info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">
                    <strong>From:</strong> {clarification.requesterName || clarification.requesterUsername}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={urgencyColors[clarification.urgency] || urgencyColors.normal}
                  >
                    {clarification.urgency.charAt(0).toUpperCase() + clarification.urgency.slice(1)}
                  </Badge>
                </div>
              </div>
              
              {/* Timing */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Asked {formatDistanceToNow(new Date(clarification.createdAt), { addSuffix: true })}
                </span>
                {clarification.expiresAt && (
                  <span className={`flex items-center gap-1 ${isExpiringSoon ? 'text-orange-600 font-medium' : ''}`}>
                    <AlertCircle className="w-3 h-3" />
                    Expires {formatDistanceToNow(new Date(clarification.expiresAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              
              {/* Question */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-purple-700 dark:text-purple-400">
                  <HelpCircle className="w-4 h-4" />
                  Question
                </Label>
                <div className="bg-white dark:bg-gray-900 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{clarification.question}</p>
                </div>
              </div>
              
              {/* Attachments (if any) */}
              {clarification.attachments && clarification.attachments.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Attachments</Label>
                  <div className="flex flex-wrap gap-2">
                    {clarification.attachments.map((att, index) => (
                      <a
                        key={att.id || index}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <FileText className="w-3 h-3" />
                        {att.name}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <Separator />
              
              {/* Response Input */}
              <div className="space-y-2">
                <Label htmlFor="response" className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Your Response
                </Label>
                <Textarea
                  id="response"
                  placeholder="Type your response to the clarification question..."
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={5}
                  className="resize-none"
                  autoFocus
                />
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Clarification request not found.
          </div>
        )}
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!response.trim() || respondToClarification.isPending}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {respondToClarification.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Response
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default RespondToClarificationModal;
