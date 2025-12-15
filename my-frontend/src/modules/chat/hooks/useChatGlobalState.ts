/**
 * =====================================================
 * USE CHAT GLOBAL STATE HOOK
 * =====================================================
 * Bridge hook for ChatInterface to consume ChatContext.
 * Provides all the state and actions needed for the chat UI
 * while maintaining backward compatibility with existing code.
 * =====================================================
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useChatContextOptional } from '../context/ChatContext';
import { StoredMessage, StoredThread, getLocalMessages } from '../store/chatStore';

export interface UseChatGlobalStateReturn {
  // Connection
  isConnected: boolean;

  // Threads
  threads: StoredThread[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;
  refreshThreads: () => Promise<void>;

  // Messages for active thread
  messages: StoredMessage[];
  loadingMessages: boolean;
  sendMessage: (content: string, type?: string) => Promise<void>;

  // Unread
  totalUnreadCount: number;
  getUnreadCount: (threadId: string) => number;
  markAsRead: (threadId: string) => void;

  // Sync
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;

  // Socket actions
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  sendTyping: (isTyping: boolean) => void;

  // Context availability
  isContextAvailable: boolean;
}

/**
 * Hook for ChatInterface to consume global chat state
 * Falls back gracefully if context is not available
 */
export function useChatGlobalState(initialThreadId?: string | null): UseChatGlobalStateReturn {
  const context = useChatContextOptional();
  const [localMessages, setLocalMessages] = useState<StoredMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [localActiveThreadId, setLocalActiveThreadId] = useState<string | null>(
    initialThreadId || null
  );

  const isContextAvailable = context !== null;
  const activeThreadId = context?.activeThreadId ?? localActiveThreadId;

  // Load messages when active thread changes
  useEffect(() => {
    if (!activeThreadId) {
      setLocalMessages([]);
      return;
    }

    const loadMessages = async () => {
      setLoadingMessages(true);
      try {
        // First try from context
        if (context) {
          const contextMessages = context.getThreadMessages(activeThreadId);
          if (contextMessages.length > 0) {
            setLocalMessages(contextMessages);
            setLoadingMessages(false);
            return;
          }
        }

        // Fall back to loading from IndexedDB
        const stored = await getLocalMessages(activeThreadId);
        setLocalMessages(stored);
      } catch (error) {
        console.error('[useChatGlobalState] Error loading messages:', error);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadMessages();
  }, [activeThreadId, context]);

  // Listen for new messages and update local state
  useEffect(() => {
    if (!activeThreadId) return;

    const handleNewMessage = (e: Event) => {
      const { threadId, message } = (e as CustomEvent).detail;
      if (threadId === activeThreadId) {
        setLocalMessages((prev) => {
          if (prev.find((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    window.addEventListener('chat:newMessage', handleNewMessage);
    return () => window.removeEventListener('chat:newMessage', handleNewMessage);
  }, [activeThreadId]);

  // Sync messages from context when it updates
  useEffect(() => {
    if (context && activeThreadId) {
      const contextMessages = context.getThreadMessages(activeThreadId);
      if (contextMessages.length > 0) {
        setLocalMessages(contextMessages);
      }
    }
  }, [context, activeThreadId, context?.messages]);

  // Set active thread ID
  const setActiveThreadId = useCallback(
    (id: string | null) => {
      if (context) {
        context.setActiveThreadId(id);
      }
      setLocalActiveThreadId(id);
    },
    [context]
  );

  // Send message
  const sendMessage = useCallback(
    async (content: string, type: string = 'text') => {
      if (!activeThreadId) {
        throw new Error('No active thread');
      }

      if (context) {
        await context.sendMessage(activeThreadId, content, type);
      } else {
        // Fallback: direct API call
        const token = getAuthToken();
        if (!token) throw new Error('Not authenticated');

        const response = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ content, type }),
        });

        if (!response.ok) {
          throw new Error(`Failed to send message: ${response.status}`);
        }

        const message = await response.json();
        setLocalMessages((prev) => [...prev, message]);
      }
    },
    [activeThreadId, context]
  );

  // Refresh threads
  const refreshThreads = useCallback(async () => {
    if (context) {
      await context.refreshThreads();
    }
  }, [context]);

  // Get unread count for a thread
  const getUnreadCount = useCallback(
    (threadId: string): number => {
      if (context) {
        return context.unreadCounts[threadId] || 0;
      }
      return 0;
    },
    [context]
  );

  // Mark thread as read
  const markAsRead = useCallback(
    (threadId: string) => {
      if (context) {
        context.markThreadAsRead(threadId);
      }
    },
    [context]
  );

  // Sync now
  const syncNow = useCallback(async () => {
    if (context) {
      await context.syncNow();
    }
  }, [context]);

  // Join thread
  const joinThread = useCallback(
    (threadId: string) => {
      if (context) {
        context.joinThread(threadId);
      }
    },
    [context]
  );

  // Leave thread
  const leaveThread = useCallback(
    (threadId: string) => {
      if (context) {
        context.leaveThread(threadId);
      }
    },
    [context]
  );

  // Send typing indicator
  const sendTyping = useCallback(
    (isTyping: boolean) => {
      if (context && activeThreadId) {
        context.sendTyping(activeThreadId, isTyping);
      }
    },
    [context, activeThreadId]
  );

  return {
    // Connection
    isConnected: context?.connected ?? false,

    // Threads
    threads: context?.threads ?? [],
    activeThreadId,
    setActiveThreadId,
    refreshThreads,

    // Messages
    messages: localMessages,
    loadingMessages,
    sendMessage,

    // Unread
    totalUnreadCount: context?.totalUnreadCount ?? 0,
    getUnreadCount,
    markAsRead,

    // Sync
    isSyncing: context?.isSyncing ?? false,
    lastSyncAt: context?.lastSyncAt ?? null,
    syncNow,

    // Socket actions
    joinThread,
    leaveThread,
    sendTyping,

    // Context availability
    isContextAvailable,
  };
}

// Helper to get auth token
function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  const getCookie = (name: string) => {
    const value = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${name}=`))
      ?.split('=')[1];
    return value;
  };

  const sources = [
    getCookie('access_token'),
    getCookie('accessToken'),
    getCookie('token'),
    localStorage.getItem('accessToken'),
    localStorage.getItem('token'),
  ];

  return sources.find((t) => t && t !== 'cookie-based' && t.includes('.')) || null;
}

export default useChatGlobalState;
