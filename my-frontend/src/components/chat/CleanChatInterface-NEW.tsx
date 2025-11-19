'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  Sparkles,
  MoreVertical
} from 'lucide-react';

interface Message {
  id: string;
  message: string;
  user_id: string;
  create_at: number;
  username?: string;
  isBot?: boolean;
}

export default function CleanChatInterface() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (user) {
      const userName = (user as any).name || (user as any).fullName || (user as any).username || 'there';
      const welcomeMessage: Message = {
        id: `bot-welcome-${Date.now()}`,
        message: `Hey ${userName}! 👋 I'm Mira, your operations assistant. How can I help you today?`,
        user_id: 'mira',
        create_at: Date.now(),
        username: 'Mira',
        isBot: true
      };
      setMessages([welcomeMessage]);
    }
  }, [user]);

  // Send a message to the intelligent chat engine
  const sendMessage = async () => {
    if (!newMessage.trim() || thinking) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      message: newMessage,
      user_id: (user as any)?.id || 'current-user',
      create_at: Date.now(),
      username: 'You'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = newMessage;
    setNewMessage('');
    setThinking(true);

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSend,
          userId: (user as any)?.id || 'guest',
          userName: (user as any)?.name || (user as any)?.fullName || 'User',
          context: {
            role: (user as any)?.role || (user as any)?.roleName,
            email: (user as any)?.email
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          message: data.reply || data.message || "I'm here to help! Could you rephrase that?",
          user_id: 'mira',
          create_at: Date.now(),
          username: data.persona?.name || 'Mira',
          isBot: true
        };

        setMessages(prev => [...prev, botMessage]);
      } else {
        // Error response
        const botMessage: Message = {
          id: `bot-error-${Date.now()}`,
          message: "Oops! Something went wrong on my end. Mind trying that again? 😅",
          user_id: 'mira',
          create_at: Date.now(),
          username: 'Mira',
          isBot: true
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      const botMessage: Message = {
        id: `bot-error-${Date.now()}`,
        message: "Hmm, I'm having trouble connecting right now. Can you try again in a moment?",
        user_id: 'mira',
        create_at: Date.now(),
        username: 'Mira',
        isBot: true
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setThinking(false);
    }
  };

  const getUserInitials = (username?: string) => {
    if (!username || username === 'You') {
      const name = (user as any)?.name || (user as any)?.fullName || (user as any)?.username;
      if (!name) return 'U';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Please log in to use chat
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Mira - AI Assistant
              </h3>
              <p className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Online · Ready to help
              </p>
            </div>
          </div>
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-gray-50/50 to-transparent dark:from-gray-800/20">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-3 ${message.isBot ? 'items-start' : 'items-start'}`}
            >
              {/* Avatar */}
              {message.isBot ? (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden shadow-md">
                  {(user as any)?.profile_pic_url ? (
                    <img 
                      src={(user as any).profile_pic_url.replace('/uploads/', '/api/secure-files/')} 
                      alt={message.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-xs font-bold">
                      {getUserInitials(message.username)}
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div className="flex-1 max-w-2xl">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    {message.username || 'Unknown User'}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTime(message.create_at)}
                  </span>
                </div>
                <div 
                  className={`rounded-2xl px-4 py-2.5 ${
                    message.isBot 
                      ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  <p className={`text-sm whitespace-pre-wrap ${
                    message.isBot ? 'text-gray-700 dark:text-gray-300' : 'text-white'
                  }`}>
                    {message.message}
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {/* Thinking indicator */}
          {thinking && (
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <Sparkles className="w-4 h-4 animate-pulse" />
              </div>
              <div className="flex-1 max-w-2xl">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    Mira
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    thinking...
                  </span>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="flex items-end gap-2">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
              <textarea
                ref={textareaRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask me anything... Try 'show my pending tasks' or 'create a task'"
                rows={1}
                disabled={thinking}
                className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-gray-900 dark:text-white max-h-32 overflow-y-auto disabled:opacity-50"
                style={{ minHeight: '44px' }}
              />
            </div>
            <button
              onClick={sendMessage}
              disabled={!newMessage.trim() || thinking}
              className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 text-white rounded-2xl transition-all shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:shadow-none transform active:scale-95"
            >
              <Send className={`w-5 h-5 ${thinking ? 'animate-pulse' : ''}`} />
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setNewMessage('Show my pending tasks')}
              disabled={thinking}
              className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
            >
              📋 Show pending tasks
            </button>
            <button
              onClick={() => setNewMessage('Create a task to review invoices')}
              disabled={thinking}
              className="px-3 py-1.5 text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
            >
              ✨ Create task
            </button>
            <button
              onClick={() => setNewMessage('What can you help me with?')}
              disabled={thinking}
              className="px-3 py-1.5 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50"
            >
              💡 What can you do?
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
