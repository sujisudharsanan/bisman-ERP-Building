'use client';

/**
 * Request Action Buttons
 * 
 * Displayed to a superior when viewing a task request
 * Provides actions: Accept, Delegate, Need Info, Defer, Reject
 */

import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  ArrowRight,
  HelpCircle,
  Clock,
  MessageCircle,
  ChevronDown
} from 'lucide-react';

interface RequestActionButtonsProps {
  requestId: number;
  requestStatus: string;
  onAccept: (requestId: number) => Promise<void>;
  onDelegate: (requestId: number, delegateToId: number, reason: string) => Promise<void>;
  onReject: (requestId: number, reason: string) => Promise<void>;
  onDefer: (requestId: number, deferUntil: string, reason: string) => Promise<void>;
  onNeedInfo: (requestId: number, questions: string) => Promise<void>;
  // Optional: list of users the request can be delegated to
  delegatableUsers?: Array<{ id: number; name: string; roleName: string }>;
  loading?: boolean;
}

export default function RequestActionButtons({
  requestId,
  requestStatus,
  onAccept,
  onDelegate,
  onReject,
  onDefer,
  onNeedInfo,
  delegatableUsers = [],
  loading = false
}: RequestActionButtonsProps) {
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [delegateUserId, setDelegateUserId] = useState<number | null>(null);
  const [reason, setReason] = useState('');
  const [deferDate, setDeferDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  // Only show if request is in REQUESTED or NEED_INFO status
  if (requestStatus !== 'REQUESTED' && requestStatus !== 'NEED_INFO') {
    return (
      <div className="bg-gray-100 dark:bg-slate-700 rounded-lg p-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          This request has already been {requestStatus.toLowerCase()}.
        </p>
      </div>
    );
  }

  const handleAction = async () => {
    setIsSubmitting(true);
    try {
      switch (activeAction) {
        case 'accept':
          await onAccept(requestId);
          break;
        case 'delegate':
          if (delegateUserId) {
            await onDelegate(requestId, delegateUserId, reason);
          }
          break;
        case 'reject':
          await onReject(requestId, reason);
          break;
        case 'defer':
          await onDefer(requestId, deferDate, reason);
          break;
        case 'needInfo':
          await onNeedInfo(requestId, reason);
          break;
      }
      setActiveAction(null);
      setReason('');
      setDeferDate('');
      setDelegateUserId(null);
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderActionForm = () => {
    if (!activeAction) return null;

    return (
      <div className="mt-4 p-4 bg-gray-50 dark:bg-slate-700/50 rounded-lg space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
        {activeAction === 'delegate' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Delegate to:
            </label>
            <select
              value={delegateUserId || ''}
              onChange={(e) => setDelegateUserId(Number(e.target.value))}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Select team member...</option>
              {delegatableUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.roleName})
                </option>
              ))}
            </select>
          </div>
        )}

        {activeAction === 'defer' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Defer until:
            </label>
            <input
              type="date"
              value={deferDate}
              onChange={(e) => setDeferDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}

        {(activeAction === 'delegate' || activeAction === 'reject' || activeAction === 'defer' || activeAction === 'needInfo') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {activeAction === 'needInfo' ? 'What information do you need?' : 'Reason (optional):'}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                activeAction === 'needInfo' 
                  ? 'Please clarify the priority and expected timeline...'
                  : activeAction === 'reject'
                    ? 'Explain why this request cannot be fulfilled...'
                    : 'Add a note...'
              }
              rows={3}
              className="w-full px-3 py-2 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => {
              setActiveAction(null);
              setReason('');
              setDeferDate('');
              setDelegateUserId(null);
            }}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAction}
            disabled={
              isSubmitting ||
              (activeAction === 'delegate' && !delegateUserId) ||
              (activeAction === 'defer' && !deferDate) ||
              (activeAction === 'needInfo' && !reason.trim())
            }
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeAction === 'reject'
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : activeAction === 'accept'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-purple-600 hover:bg-purple-700 text-white'
            } disabled:opacity-50`}
          >
            {isSubmitting && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            Confirm {activeAction === 'needInfo' ? 'Request Info' : activeAction?.charAt(0).toUpperCase() + activeAction?.slice(1)}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Primary Action: Accept */}
        <button
          onClick={() => {
            setActiveAction('accept');
            handleAction(); // Direct action without form
          }}
          disabled={loading || isSubmitting}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <CheckCircle className="w-4 h-4" />
          Accept & Start
        </button>

        {/* Delegate */}
        {delegatableUsers.length > 0 && (
          <button
            onClick={() => setActiveAction(activeAction === 'delegate' ? null : 'delegate')}
            disabled={loading || isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeAction === 'delegate'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50'
            } disabled:opacity-50`}
          >
            <ArrowRight className="w-4 h-4" />
            Delegate
          </button>
        )}

        {/* More Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowMoreActions(!showMoreActions)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            More Actions
            <ChevronDown className={`w-4 h-4 transition-transform ${showMoreActions ? 'rotate-180' : ''}`} />
          </button>

          {showMoreActions && (
            <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-lg z-10 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => {
                  setActiveAction('needInfo');
                  setShowMoreActions(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <HelpCircle className="w-4 h-4 text-blue-500" />
                Need More Info
              </button>
              <button
                onClick={() => {
                  setActiveAction('defer');
                  setShowMoreActions(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <Clock className="w-4 h-4 text-amber-500" />
                Defer Until Later
              </button>
              <div className="border-t border-gray-200 dark:border-slate-700 my-1" />
              <button
                onClick={() => {
                  setActiveAction('reject');
                  setShowMoreActions(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Reject Request
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Action Form */}
      {renderActionForm()}

      {/* Request Info Badge */}
      {requestStatus === 'NEED_INFO' && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-blue-700 dark:text-blue-300">
            Awaiting clarification from requester
          </span>
        </div>
      )}
    </div>
  );
}
