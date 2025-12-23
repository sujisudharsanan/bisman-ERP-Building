/**
 * Pending Clarifications Badge
 * 
 * Shows count of pending clarifications in navigation/header.
 * Includes dropdown with quick view of pending items.
 */

'use client';

import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  HelpCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Loader2,
  User,
  FileText,
} from 'lucide-react';
import { usePendingClarifications } from '@/hooks/useClarifications';
import { TaskClarification } from '@/types/task';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { RespondToClarificationModal } from './RespondToClarificationModal';

interface PendingClarificationsBadgeProps {
  className?: string;
  showLabel?: boolean;
}

const urgencyColors: Record<string, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-400',
};

export function PendingClarificationsBadge({
  className = '',
  showLabel = false,
}: PendingClarificationsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  
  const { data, isLoading } = usePendingClarifications({ limit: 5 });
  
  const count = data?.total ?? 0;
  const clarifications = data?.clarifications ?? [];
  
  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className={className}>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    );
  }
  
  if (count === 0) {
    return null; // Don't show if no pending clarifications
  }
  
  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative ${className}`}
          >
            <HelpCircle className="w-5 h-5 text-purple-600" />
            {showLabel && <span className="ml-2">Clarifications</span>}
            {count > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 px-1.5 py-0.5 text-xs bg-purple-600 text-white"
              >
                {count > 99 ? '99+' : count}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          {/* Header */}
          <div className="px-4 py-3 border-b bg-purple-50 dark:bg-purple-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-sm text-purple-700 dark:text-purple-300">
                  Pending Clarifications
                </span>
              </div>
              <Badge variant="outline" className="text-purple-600">
                {count}
              </Badge>
            </div>
          </div>
          
          {/* List */}
          <ScrollArea className="max-h-[300px]">
            <div className="divide-y">
              {clarifications.map((clarification) => (
                <ClarificationItem
                  key={clarification.id}
                  clarification={clarification}
                  onRespond={(id) => {
                    setRespondingToId(id);
                    setIsOpen(false);
                  }}
                />
              ))}
            </div>
          </ScrollArea>
          
          {/* Footer */}
          {count > 5 && (
            <div className="px-4 py-3 border-t bg-gray-50 dark:bg-gray-800">
              <Link href="/tasks/clarifications" onClick={() => setIsOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full">
                  View all {count} clarifications
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          )}
        </PopoverContent>
      </Popover>
      
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

interface ClarificationItemProps {
  clarification: TaskClarification;
  onRespond: (id: string) => void;
}

function ClarificationItem({ clarification, onRespond }: ClarificationItemProps) {
  const isExpiringSoon = clarification.expiresAt && 
    new Date(clarification.expiresAt).getTime() - Date.now() < 12 * 60 * 60 * 1000;
  
  return (
    <div 
      className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-l-4 ${
        urgencyColors[clarification.urgency] || urgencyColors.normal
      }`}
      onClick={() => onRespond(clarification.id)}
    >
      {/* Task title */}
      <div className="flex items-center gap-2 text-sm font-medium truncate">
        <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span className="truncate">{clarification.taskTitle || 'Task'}</span>
      </div>
      
      {/* Question preview */}
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
        {clarification.question}
      </p>
      
      {/* Meta */}
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <User className="w-3 h-3" />
          {clarification.requesterName || clarification.requesterUsername}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(clarification.createdAt), { addSuffix: true })}
        </span>
        {isExpiringSoon && (
          <span className="flex items-center gap-1 text-orange-600">
            <AlertTriangle className="w-3 h-3" />
            Expiring soon
          </span>
        )}
      </div>
    </div>
  );
}

export default PendingClarificationsBadge;
