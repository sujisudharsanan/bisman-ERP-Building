'use client';

/**
 * My Requests View
 * 
 * Tabbed interface showing:
 * 1. Incoming Requests - Tasks others have requested from you
 * 2. Outgoing Requests - Tasks you have requested from others
 */

import React, { useState, useMemo } from 'react';
import {
  Inbox,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  HelpCircle,
  Filter,
  RefreshCw,
  ChevronRight,
  AlertCircle,
  Calendar
} from 'lucide-react';

interface TaskRequest {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: 'REQUESTED' | 'ACCEPTED' | 'DELEGATED' | 'NEED_INFO' | 'DEFERRED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  suggestedDueDate?: string;
  deferredUntil?: string;
  requestorId: number;
  requestorName: string;
  requestorRoleName: string;
  requestedToId: number;
  requestedToName: string;
  requestedToRoleName: string;
  delegatedToId?: number;
  delegatedToName?: string;
  responseNotes?: string;
  clarificationRequest?: string;
  taskId?: number; // Present if request was accepted and task created
}

interface MyRequestsViewProps {
  incomingRequests: TaskRequest[];
  outgoingRequests: TaskRequest[];
  loading?: boolean;
  onRefresh: () => void;
  onSelectRequest: (request: TaskRequest) => void;
  onAccept?: (requestId: number) => Promise<void>;
  onReject?: (requestId: number, reason: string) => Promise<void>;
}

const statusConfig: Record<string, {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ElementType;
}> = {
  REQUESTED: {
    label: 'Pending',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: Clock
  },
  ACCEPTED: {
    label: 'Accepted',
    color: 'text-green-700 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    icon: CheckCircle
  },
  DELEGATED: {
    label: 'Delegated',
    color: 'text-purple-700 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    icon: ArrowRight
  },
  NEED_INFO: {
    label: 'Info Needed',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: HelpCircle
  },
  DEFERRED: {
    label: 'Deferred',
    color: 'text-gray-700 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
    icon: Calendar
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: XCircle
  }
};

const priorityColors: Record<string, string> = {
  CRITICAL: 'bg-red-600',
  URGENT: 'bg-orange-500',
  HIGH: 'bg-amber-500',
  MEDIUM: 'bg-blue-500',
  LOW: 'bg-gray-400'
};

type Tab = 'incoming' | 'outgoing';
type StatusFilter = 'all' | 'pending' | 'resolved';

export default function MyRequestsView({
  incomingRequests,
  outgoingRequests,
  loading = false,
  onRefresh,
  onSelectRequest,
  onAccept,
  onReject
}: MyRequestsViewProps) {
  const [activeTab, setActiveTab] = useState<Tab>('incoming');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredRequests = useMemo(() => {
    const requests = activeTab === 'incoming' ? incomingRequests : outgoingRequests;
    
    if (statusFilter === 'all') return requests;
    if (statusFilter === 'pending') {
      return requests.filter(r => ['REQUESTED', 'NEED_INFO', 'DEFERRED'].includes(r.status));
    }
    return requests.filter(r => ['ACCEPTED', 'DELEGATED', 'REJECTED'].includes(r.status));
  }, [activeTab, incomingRequests, outgoingRequests, statusFilter]);

  const pendingIncoming = useMemo(() => 
    incomingRequests.filter(r => r.status === 'REQUESTED').length,
    [incomingRequests]
  );

  const pendingOutgoing = useMemo(() =>
    outgoingRequests.filter(r => ['REQUESTED', 'NEED_INFO'].includes(r.status)).length,
    [outgoingRequests]
  );

  const renderRequestCard = (request: TaskRequest) => {
    const status = statusConfig[request.status];
    const StatusIcon = status.icon;
    const isIncoming = activeTab === 'incoming';

    return (
      <div
        key={request.id}
        onClick={() => onSelectRequest(request)}
        className="group bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Priority indicator + Title */}
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${priorityColors[request.priority] || priorityColors.MEDIUM}`} />
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {request.title}
              </h4>
            </div>

            {/* Description */}
            {request.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {request.description}
              </p>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {isIncoming ? 'From' : 'To'}: <span className="font-medium text-gray-700 dark:text-gray-300">
                  {isIncoming ? request.requestorName : request.requestedToName}
                </span>
              </span>
              <span>•</span>
              <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              {request.suggestedDueDate && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Due {new Date(request.suggestedDueDate).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>

            {/* Response notes or clarification */}
            {request.clarificationRequest && request.status === 'NEED_INFO' && (
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-l-2 border-blue-500">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Question: </span>
                  {request.clarificationRequest}
                </p>
              </div>
            )}

            {request.responseNotes && request.status === 'REJECTED' && (
              <div className="mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-2 border-red-500">
                <p className="text-xs text-red-700 dark:text-red-300">
                  <span className="font-medium">Reason: </span>
                  {request.responseNotes}
                </p>
              </div>
            )}

            {request.delegatedToName && request.status === 'DELEGATED' && (
              <div className="mt-3 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-l-2 border-purple-500">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  <span className="font-medium">Delegated to: </span>
                  {request.delegatedToName}
                </p>
              </div>
            )}
          </div>

          {/* Status badge + Arrow */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${status.bgColor} ${status.color}`}>
              <StatusIcon className="w-3 h-3" />
              {status.label}
            </span>
            <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">My Requests</h2>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('incoming')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'incoming'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Incoming
            {pendingIncoming > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'incoming' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-purple-600 text-white'
              }`}>
                {pendingIncoming}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'outgoing'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
            }`}
          >
            <Send className="w-4 h-4" />
            Outgoing
            {pendingOutgoing > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'outgoing'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-500 text-white'
              }`}>
                {pendingOutgoing}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex-shrink-0 px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="flex gap-1">
            {(['all', 'pending', 'resolved'] as StatusFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === filter
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mb-4">
              {activeTab === 'incoming' ? (
                <Inbox className="w-8 h-8 text-gray-400" />
              ) : (
                <Send className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              No {statusFilter !== 'all' ? statusFilter : ''} {activeTab} requests
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {activeTab === 'incoming'
                ? 'Task requests from your team will appear here'
                : 'Requests you send to senior colleagues will appear here'
              }
            </p>
          </div>
        ) : (
          filteredRequests.map(renderRequestCard)
        )}
      </div>

      {/* Action Required Banner */}
      {activeTab === 'incoming' && pendingIncoming > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pendingIncoming} request{pendingIncoming > 1 ? 's' : ''} awaiting your response
            </span>
          </div>
        </div>
      )}

      {activeTab === 'outgoing' && pendingOutgoing > 0 && (
        <div className="flex-shrink-0 px-6 py-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">
              {pendingOutgoing} request{pendingOutgoing > 1 ? 's' : ''} pending response
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
