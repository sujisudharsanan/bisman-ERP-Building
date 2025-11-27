/**
 * BISMAN ERP - Assistant Message Component
 * Displays assistant messages with tone-based styling and quick action chips
 */

import React from 'react';
import type { ChatReply, QuickAction } from '@/types/assistant';

interface Props {
  reply: ChatReply;
  onQuickActionClick: (action: QuickAction) => void;
  showAvatar?: boolean;
}

// Tone-based styling for message bubbles
const toneStyles: Record<ChatReply['tone'], { bg: string; border: string; text: string; icon: string }> = {
  friendly: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-gray-800 dark:text-gray-100',
    icon: '😊',
  },
  alert: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-300 dark:border-yellow-700',
    text: 'text-gray-800 dark:text-gray-100',
    icon: '⚠️',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-gray-800 dark:text-gray-100',
    icon: '❌',
  },
  info: {
    bg: 'bg-gray-50 dark:bg-gray-900/50',
    border: 'border-gray-200 dark:border-gray-700',
    text: 'text-gray-800 dark:text-gray-100',
    icon: 'ℹ️',
  },
};

export const AssistantMessage: React.FC<Props> = ({
  reply,
  onQuickActionClick,
  showAvatar = true,
}) => {
  const styles = toneStyles[reply.tone];

  return (
    <div className="flex items-start gap-3 my-3 animate-fade-in">
      {/* Avatar */}
      {showAvatar && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
          B
        </div>
      )}

      <div className="flex-1 max-w-2xl">
        {/* Header: Name + Context Info */}
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Bisman Assistant
          </span>
          {reply.contextInfo && (
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
              {reply.contextInfo}
            </span>
          )}
        </div>

        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 rounded-2xl border shadow-sm
            ${styles.bg} ${styles.border} ${styles.text}
            whitespace-pre-line
          `}
        >
          {reply.text}
        </div>

        {/* Quick Action Chips */}
        {reply.quickActions && reply.quickActions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {reply.quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => onQuickActionClick(action)}
                className="
                  group
                  text-xs px-3 py-1.5 rounded-full
                  border border-gray-300 dark:border-gray-600
                  bg-white dark:bg-gray-800
                  hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50
                  dark:hover:from-indigo-950/50 dark:hover:to-purple-950/50
                  hover:border-indigo-300 dark:hover:border-indigo-700
                  text-gray-700 dark:text-gray-300
                  hover:text-indigo-700 dark:hover:text-indigo-300
                  transition-all duration-200
                  shadow-sm hover:shadow-md
                  transform hover:scale-105
                  font-medium
                "
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AssistantMessage;
