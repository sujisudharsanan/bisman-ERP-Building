/**
 * Clarification List Component
 * 
 * Displays list of clarifications for a task with timeline view.
 * Shows pending, responded, expired, and cancelled clarifications.
 */

'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  HelpCircle,
  MessageSquare,
  Clock,
  User,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye,
} from 'lucide-react';
import { useTaskClarifications, useCancelClarification } from '@/hooks/useClarifications';
import { TaskClarification, ClarificationStatus } from '@/types/task';
import { formatDistanceToNow, format } from 'date-fns';
import { RespondToClarificationModal } from './RespondToClarificationModal';

interface ClarificationListProps {
  taskId: number;
  currentUserId?: number;
  canRequestClarification?: boolean;
  onRequestClarification?: () => void;
}

const statusConfig: Record<string, { 
  label: string; 
  icon: React.ComponentType<{ className?: string }>; 
  color: string;
  bgColor: string;
}> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/50 border-purple-200 dark:border-purple-800',
  },
  responded: {
    label: 'Responded',
    icon: CheckCircle2,
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
  },
  expired: {
    label: 'Expired',
    icon: AlertTriangle,
    color: 'text-orange-700 dark:text-orange-400',
    bgColor: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
  },
};

interface ClarificationItemProps {
  clarification: TaskClarification;
  currentUserId?: number;
  onRespond?: (id: string) => void;
  onCancel?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

function ClarificationItem({
  clarification,
  currentUserId,
  onRespond,
  onCancel,
  isExpanded = false,
  onToggleExpand,
}: ClarificationItemProps) {
  const config = statusConfig[clarification.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  
  const isRequester = clarification.requesterId === currentUserId;
  const isResponder = clarification.responderId === currentUserId;
  const canRespond = clarification.status === 'pending' && isResponder;
  const canCancelRequest = clarification.status === 'pending' && isRequester;
  
  const cancelMutation = useCancelClarification();
  
  return (
    <div className={`rounded-lg border p-4 ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <StatusIcon className={`w-5 h-5 ${config.color}`} />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">
                {isRequester ? 'You asked' : clarification.requesterName || clarification.requesterUsername}
              </span>
              <span className="text-xs text-gray-500">→</span>
              <span className="text-sm">
                {isResponder ? 'You' : clarification.responderName || clarification.responderUsername}
                {clarification.responderType === 'department' && (
                  <Badge variant="outline" className="ml-1 text-xs">
                    <Building2 className="w-3 h-3 mr-1" />
                    Dept
                  </Badge>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
              <span>{formatDistanceToNow(new Date(clarification.createdAt), { addSuffix: true })}</span>
              {clarification.status === 'pending' && clarification.expiresAt && (
                <>
                  <span>•</span>
                  <span className="text-orange-600">
                    Expires {formatDistanceToNow(new Date(clarification.expiresAt), { addSuffix: true })}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.color}>
            {config.label}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleExpand}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
      
      {/* Expandable content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Question */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3">
            <div className="text-xs font-medium text-purple-600 mb-1 flex items-center gap-1">
              <HelpCircle className="w-3 h-3" />
              Question
            </div>
            <p className="text-sm whitespace-pre-wrap">{clarification.question}</p>
          </div>
          
          {/* Response (if any) */}
          {clarification.status === 'responded' && clarification.response && (
            <div className="bg-white dark:bg-gray-900 rounded-lg p-3 border-l-4 border-green-400">
              <div className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                Response from {clarification.respondedByName || clarification.respondedByUsername}
                {clarification.respondedAt && (
                  <span className="text-gray-400 ml-2">
                    {formatDistanceToNow(new Date(clarification.respondedAt), { addSuffix: true })}
                  </span>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{clarification.response}</p>
            </div>
          )}
          
          {/* SLA info */}
          {clarification.pauseSla && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              SLA paused: {clarification.slaPausedHours?.toFixed(1) || '—'} hours
            </div>
          )}
          
          {/* Actions */}
          {(canRespond || canCancelRequest) && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              {canRespond && (
                <Button
                  size="sm"
                  onClick={() => onRespond?.(clarification.id)}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Respond
                </Button>
              )}
              {canCancelRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onCancel?.(clarification.id)}
                  disabled={cancelMutation.isPending}
                >
                  {cancelMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-1" />
                  )}
                  Cancel Request
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ClarificationList({
  taskId,
  currentUserId,
  canRequestClarification = true,
  onRequestClarification,
}: ClarificationListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  
  const { data, isLoading, error } = useTaskClarifications(taskId);
  const cancelMutation = useCancelClarification();
  
  const clarifications = data?.clarifications || [];
  const pendingCount = clarifications.filter(c => c.status === 'pending').length;
  
  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  const handleCancel = (id: string) => {
    if (confirm('Are you sure you want to cancel this clarification request?')) {
      cancelMutation.mutate({ clarificationId: id });
    }
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2 text-purple-700 dark:text-purple-400">
              <HelpCircle className="w-5 h-5" />
              Clarifications
              {pendingCount > 0 && (
                <Badge className="bg-purple-600">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            {canRequestClarification && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRequestClarification}
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                <HelpCircle className="w-4 h-4 mr-1" />
                Request Clarification
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {clarifications.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No clarifications requested</p>
              {canRequestClarification && (
                <p className="text-xs mt-1">
                  Need input from someone? Request a clarification above.
                </p>
              )}
            </div>
          ) : (
            clarifications.map((clarification) => (
              <ClarificationItem
                key={clarification.id}
                clarification={clarification}
                currentUserId={currentUserId}
                onRespond={setRespondingToId}
                onCancel={handleCancel}
                isExpanded={expandedIds.has(clarification.id)}
                onToggleExpand={() => toggleExpand(clarification.id)}
              />
            ))
          )}
        </CardContent>
      </Card>
      
      {/* Respond Modal */}
      <RespondToClarificationModal
        isOpen={!!respondingToId}
        onClose={() => setRespondingToId(null)}
        clarificationId={respondingToId || ''}
        onSuccess={() => setRespondingToId(null)}
      />
    </>
  );
}

export default ClarificationList;
