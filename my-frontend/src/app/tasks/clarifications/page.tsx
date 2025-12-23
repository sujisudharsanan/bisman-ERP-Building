/**
 * Clarifications Page
 * 
 * Lists all pending clarifications for the current user.
 * Allows quick response to clarification requests.
 * 
 * Global UX Rule: All entities displayed with Name • ID format
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  HelpCircle,
  Clock,
  User,
  FileText,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { usePendingClarifications, useTaskClarifications } from '@/hooks/useClarifications';
import { TaskClarification } from '@/types/task';
import { formatDistanceToNow, format } from 'date-fns';
import { RespondToClarificationModal } from '@/components/tasks/clarifications';
import { formatEntityId } from '@/lib/utils/entityDisplay';

// Status colors
const statusConfig: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: 'Pending', color: 'bg-purple-100 text-purple-700 border-purple-300', icon: Clock },
  responded: { label: 'Responded', color: 'bg-green-100 text-green-700 border-green-300', icon: CheckCircle2 },
  expired: { label: 'Expired', color: 'bg-orange-100 text-orange-700 border-orange-300', icon: AlertTriangle },
  cancelled: { label: 'Cancelled', color: 'bg-gray-100 text-gray-600 border-gray-300', icon: XCircle },
};

const urgencyColors: Record<string, string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  critical: 'border-l-red-400',
};

interface ClarificationCardProps {
  clarification: TaskClarification;
  onRespond: (id: string) => void;
  showTaskLink?: boolean;
}

function ClarificationCard({ clarification, onRespond, showTaskLink = true }: ClarificationCardProps) {
  const router = useRouter();
  const config = statusConfig[clarification.status] || statusConfig.pending;
  const StatusIcon = config.icon;
  
  const isExpiringSoon = clarification.expiresAt && 
    new Date(clarification.expiresAt).getTime() - Date.now() < 12 * 60 * 60 * 1000;
  
  return (
    <Card className={`border-l-4 ${urgencyColors[clarification.urgency] || urgencyColors.normal}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            {showTaskLink && (
              <button 
                onClick={() => router.push(`/tasks/${clarification.taskId}`)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline mb-1"
              >
                <FileText className="w-4 h-4" />
                {/* Task Title • TSK-ID format */}
                <span className="flex items-center gap-1.5">
                  <span>{clarification.taskTitle || 'Task'}</span>
                  <span className="text-blue-400">•</span>
                  <span className="font-mono text-xs">{formatEntityId(clarification.taskId, 'TASK')}</span>
                </span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <User className="w-3 h-3" />
              {/* Requester Name • U-ID format */}
              <span className="flex items-center gap-1">
                <span>From:</span>
                <span>{clarification.requesterName || clarification.requesterUsername}</span>
                {clarification.requesterId && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="font-mono text-[10px] text-gray-400">
                      {formatEntityId(clarification.requesterId, 'USER')}
                    </span>
                  </>
                )}
              </span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(clarification.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={config.color}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.label}
            </Badge>
            {clarification.urgency !== 'normal' && (
              <Badge variant="outline" className={
                clarification.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                clarification.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                'bg-gray-100 text-gray-600'
              }>
                {clarification.urgency.charAt(0).toUpperCase() + clarification.urgency.slice(1)}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Question */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3">
          <div className="text-xs font-medium text-purple-600 mb-1 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            Question
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
            {clarification.question}
          </p>
        </div>
        
        {/* Response (if any) */}
        {clarification.status === 'responded' && clarification.response && (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 mb-3 border-l-4 border-green-400">
            <div className="text-xs font-medium text-green-600 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {/* Responder Name • U-ID format */}
              <span className="flex items-center gap-1">
                <span>Response from</span>
                <span>{clarification.respondedByName || clarification.respondedByUsername}</span>
                {clarification.respondedById && (
                  <>
                    <span className="text-green-400">•</span>
                    <span className="font-mono text-[10px]">
                      {formatEntityId(clarification.respondedById, 'USER')}
                    </span>
                  </>
                )}
              </span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
              {clarification.response}
            </p>
          </div>
        )}
        
        {/* Expiry warning & Actions */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {clarification.status === 'pending' && clarification.expiresAt && (
              <span className={isExpiringSoon ? 'text-orange-600 font-medium' : ''}>
                <AlertTriangle className="w-3 h-3 inline mr-1" />
                Expires {formatDistanceToNow(new Date(clarification.expiresAt), { addSuffix: true })}
              </span>
            )}
          </div>
          
          {clarification.status === 'pending' && (
            <Button
              size="sm"
              onClick={() => onRespond(clarification.id)}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              <MessageSquare className="w-4 h-4 mr-1" />
              Respond
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClarificationsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('pending');
  const [respondingToId, setRespondingToId] = useState<string | null>(null);
  
  const { data: pendingData, isLoading: pendingLoading, refetch: refetchPending } = usePendingClarifications({ limit: 50 });
  
  const pendingClarifications = pendingData?.clarifications || [];
  const pendingCount = pendingData?.total || 0;
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-purple-600" />
                Clarification Requests
              </h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Pending clarifications that need your response
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Badge className="bg-purple-600 text-white px-3 py-1">
              {pendingCount} pending
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchPending()}
              disabled={pendingLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${pendingLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
        
        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingCount > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-600 text-white rounded-full">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">All History</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="mt-4">
            {pendingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : pendingClarifications.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <HelpCircle className="w-12 h-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    No Pending Clarifications
                  </h3>
                  <p className="text-gray-500 text-center max-w-md">
                    You don't have any clarification requests waiting for your response.
                    When someone asks you for clarification, it will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {pendingClarifications.map((clarification) => (
                  <ClarificationCard
                    key={clarification.id}
                    clarification={clarification}
                    onRespond={setRespondingToId}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="all" className="mt-4">
            <Card>
              <CardContent className="py-8 text-center text-gray-500">
                <p>Full clarification history coming soon.</p>
                <p className="text-sm mt-2">
                  You can view clarification history on individual task pages.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Respond Modal */}
      <RespondToClarificationModal
        isOpen={!!respondingToId}
        onClose={() => setRespondingToId(null)}
        clarificationId={respondingToId || ''}
        onSuccess={() => {
          setRespondingToId(null);
          refetchPending();
        }}
      />
    </div>
  );
}
