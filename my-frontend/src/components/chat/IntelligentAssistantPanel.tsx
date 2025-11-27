/**
 * BISMAN ERP - Intelligent Assistant Panel
 * A standalone chat panel for the intelligent assistant
 * Can be used in ChatInterface or as a separate component
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAssistant } from '@/hooks/useAssistant';
import AssistantMessage from './AssistantMessage';
import type { QuickAction } from '@/types/assistant';

interface Props {
  className?: string;
  placeholder?: string;
  showWelcome?: boolean;
}

export const IntelligentAssistantPanel: React.FC<Props> = ({
  className = '',
  placeholder = 'Ask me anything... (e.g., "Show pending COD for Chennai")',
  showWelcome = true,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { messages, isLoading, sendMessage } = useAssistant({
    onError: (error) => {
      console.error('Assistant error:', error);
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Handle sending a message
   */
  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const text = inputText;
    setInputText('');
    
    await sendMessage(text);
    
    // Focus back on input
    inputRef.current?.focus();
  };

  /**
   * Handle quick action clicks
   */
  const handleQuickActionClick = async (action: QuickAction) => {
    // Convert quick action to natural language message
    let message = '';

    switch (action.id) {
      case 'show_today_tasks':
        message = 'Show my tasks for today';
        break;
      case 'show_cod_status':
        message = 'Show COD status';
        break;
      case 'show_dashboard':
        message = 'Open dashboard';
        break;
      case 'cod_chennai':
        message = 'Show COD for Chennai';
        break;
      case 'cod_mumbai':
        message = 'Show COD for Mumbai';
        break;
      case 'cod_bangalore':
        message = 'Show COD for Bangalore';
        break;
      case 'cod_today':
        message = `Show COD for ${action.payload?.branchName || 'today'}`;
        break;
      case 'cod_this_week':
        message = `Show COD for ${action.payload?.branchName} this week`;
        break;
      case 'cod_last_week':
        message = `Show COD for ${action.payload?.branchName} last week`;
        break;
      case 'example_cod':
        message = 'Show pending COD for Chennai last week';
        break;
      case 'example_tasks':
        message = 'Show my overdue tasks';
        break;
      case 'example_invoice':
        message = 'Show invoices for this week';
        break;
      case 'show_help':
        message = 'Help';
        break;
      case 'show_capabilities':
        message = 'What can you do?';
        break;
      default:
        // Generic: use label as message
        message = action.label;
    }

    if (message) {
      await sendMessage(message);
    }
  };

  /**
   * Handle Enter key to send
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {/* Welcome Message */}
        {showWelcome && messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              B
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Bisman Intelligent Assistant
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              I can help you with COD status, tasks, invoices, payments, and more.
              Just ask naturally!
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleQuickActionClick({ id: 'example_cod', label: '💰 COD Example' })}
                className="px-4 py-2 text-sm bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition"
              >
                💰 Show COD
              </button>
              <button
                onClick={() => handleQuickActionClick({ id: 'example_tasks', label: '📋 Tasks Example' })}
                className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/50 transition"
              >
                📋 My Tasks
              </button>
              <button
                onClick={() => handleQuickActionClick({ id: 'show_help', label: 'Help' })}
                className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              >
                ❓ Help
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg) => (
          <div key={msg.id}>
            {msg.from === 'user' ? (
              // User message
              <div className="flex justify-end my-2">
                <div className="max-w-xl px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
                  {msg.text}
                </div>
              </div>
            ) : (
              // Assistant message
              msg.reply && (
                <AssistantMessage
                  reply={msg.reply}
                  onQuickActionClick={handleQuickActionClick}
                  showAvatar
                />
              )
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex items-start gap-3 my-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
              B
            </div>
            <div className="flex gap-1 items-center bg-gray-100 dark:bg-gray-800 px-4 py-3 rounded-2xl">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            rows={1}
            className="
              flex-1 px-4 py-2 
              border border-gray-300 dark:border-gray-600 
              rounded-2xl 
              bg-white dark:bg-gray-900 
              text-gray-800 dark:text-gray-100
              placeholder-gray-400 dark:placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400
              resize-none
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputText.trim()}
            className="
              px-6 py-2 
              bg-gradient-to-r from-indigo-500 to-purple-600 
              text-white font-medium rounded-2xl 
              hover:from-indigo-600 hover:to-purple-700 
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200
              shadow-md hover:shadow-lg
              transform hover:scale-105
            "
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default IntelligentAssistantPanel;
