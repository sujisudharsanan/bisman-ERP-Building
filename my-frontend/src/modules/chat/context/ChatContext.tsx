/**
 * =====================================================
 * CHAT CONTEXT - Global Chat State Management
 * =====================================================
 * This provider MUST be mounted at the app root level to:
 * 1. Keep socket listener alive even when chat window is closed
 * 2. Maintain chat state across page navigation
 * 3. Handle delta sync on app launch
 * 4. Update unread badges in real-time
 * =====================================================
 */

'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { io, Socket } from 'socket.io-client';
import {
  StoredMessage,
  StoredThread,
  getLocalThreads,
  getLocalMessages,
  saveThreads,
  saveMessages,
  addMessage,
  updateThreadLastMessage,
  clearThreadUnread,
  getSyncMeta,
  updateSyncMeta,
  hasLocalData,
  clearAllChatData,
  getTotalUnreadCount,
  getUnreadCounts,
} from '../store/chatStore';

// ==================== TYPES ====================

export interface ChatContextValue {
  // Connection state
  connected: boolean;
  socket: Socket | null;

  // Thread state
  threads: StoredThread[];
  activeThreadId: string | null;
  setActiveThreadId: (id: string | null) => void;

  // Message state
  messages: Map<string, StoredMessage[]>; // threadId -> messages
  getThreadMessages: (threadId: string) => StoredMessage[];

  // Unread state
  totalUnreadCount: number;
  unreadCounts: Record<string, number>;
  markThreadAsRead: (threadId: string) => void;

  // Sync state
  isSyncing: boolean;
  lastSyncAt: string | null;
  syncNow: () => Promise<void>;

  // Actions
  sendMessage: (threadId: string, content: string, type?: string) => Promise<void>;
  refreshThreads: () => Promise<void>;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  sendTyping: (threadId: string, isTyping: boolean) => void;

  // Lifecycle
  clearLocalData: () => Promise<void>;
}

interface IncomingMessagePayload {
  threadId: string;
  message: StoredMessage;
  unreadCount?: number;
}

// ==================== CONTEXT ====================

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}

// Optional: Safe hook that returns null if not in provider
export function useChatContextOptional(): ChatContextValue | null {
  return useContext(ChatContext);
}

// ==================== PROVIDER ====================

interface ChatProviderProps {
  children: React.ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  // Socket state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedThreadsRef = useRef<Set<string>>(new Set());

  // Thread/message state
  const [threads, setThreads] = useState<StoredThread[]>([]);
  const [messages, setMessages] = useState<Map<string, StoredMessage[]>>(new Map());
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  // Unread state
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);

  // Refs to track initialization
  const initializedRef = useRef(false);
  const syncInProgressRef = useRef(false);

  // ==================== HELPER: Get auth token ====================
  const getAuthToken = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    const getCookie = (name: string) => {
      const value = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`))
        ?.split('=')[1];
      return value;
    };

    const isValidToken = (token: string | null | undefined): boolean => {
      return !!token && token !== 'cookie-based' && token.includes('.');
    };

    // Try multiple token sources
    const sources = [
      getCookie('access_token'),
      getCookie('accessToken'),
      getCookie('token'),
      getCookie('authToken'),
      localStorage.getItem('accessToken'),
      localStorage.getItem('token'),
      localStorage.getItem('authToken'),
    ];

    return sources.find((t) => isValidToken(t)) || null;
  }, []);

  // ==================== LOAD LOCAL DATA ON MOUNT ====================
  useEffect(() => {
    const loadLocalData = async () => {
      try {
        // Load threads from IndexedDB
        const localThreads = await getLocalThreads();
        setThreads(localThreads);

        // Load unread counts
        const counts = await getUnreadCounts();
        setUnreadCounts(counts);
        const total = await getTotalUnreadCount();
        setTotalUnreadCount(total);

        // Load sync metadata
        const meta = await getSyncMeta();
        setLastSyncAt(meta.lastSyncAt);

        console.log('[ChatProvider] Loaded local data:', {
          threads: localThreads.length,
          totalUnread: total,
          lastSync: meta.lastSyncAt,
        });
      } catch (error) {
        console.error('[ChatProvider] Error loading local data:', error);
      }
    };

    loadLocalData();
  }, []);

  // ==================== DELTA SYNC LOGIC ====================
  const syncNow = useCallback(async () => {
    if (syncInProgressRef.current) {
      console.log('[ChatProvider] Sync already in progress, skipping');
      return;
    }

    const token = getAuthToken();
    if (!token) {
      console.log('[ChatProvider] No auth token, skipping sync');
      return;
    }

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const hasData = await hasLocalData();
      const meta = await getSyncMeta();

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      let response: Response;

      if (!hasData) {
        // Initial sync - get everything
        console.log('[ChatProvider] Performing initial sync...');
        response = await fetch(`${apiUrl}/api/chat/sync/initial?messages_per_thread=20`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      } else {
        // Delta sync - only get new messages
        console.log('[ChatProvider] Performing delta sync since:', meta.lastMessageId);
        const params = new URLSearchParams();
        if (meta.lastMessageId) {
          params.set('since_id', meta.lastMessageId);
        } else if (meta.lastSyncAt) {
          params.set('since_time', meta.lastSyncAt);
        }

        response = await fetch(`${apiUrl}/api/chat/sync?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
      }

      if (!response.ok) {
        throw new Error(`Sync failed with status ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data) {
        const { threads: newThreads, messages: newMessages, syncedAt, lastMessageId } = result.data;

        // Handle initial sync (threads include messages)
        if (!hasData && newThreads) {
          for (const thread of newThreads) {
            if (thread.messages && thread.messages.length > 0) {
              await saveMessages(thread.id, thread.messages);
              // Update local state
              setMessages((prev) => {
                const next = new Map(prev);
                next.set(thread.id, thread.messages);
                return next;
              });
            }
            // Remove messages from thread object before saving
            delete thread.messages;
          }
          await saveThreads(newThreads);
          setThreads(newThreads);
        } else {
          // Delta sync - save new messages
          if (newMessages && newMessages.length > 0) {
            // Group messages by thread
            const messagesByThread: Record<string, StoredMessage[]> = {};
            for (const msg of newMessages) {
              if (!messagesByThread[msg.threadId]) {
                messagesByThread[msg.threadId] = [];
              }
              messagesByThread[msg.threadId].push(msg);
            }

            // Save each thread's messages
            for (const [threadId, msgs] of Object.entries(messagesByThread)) {
              await saveMessages(threadId, msgs);
              setMessages((prev) => {
                const next = new Map(prev);
                const existing = next.get(threadId) || [];
                // Merge and deduplicate
                const merged = [...existing];
                for (const msg of msgs) {
                  if (!merged.find((m) => m.id === msg.id)) {
                    merged.push(msg);
                  }
                }
                merged.sort(
                  (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                next.set(threadId, merged);
                return next;
              });
            }
          }

          // Update threads if provided
          if (newThreads && newThreads.length > 0) {
            await saveThreads(newThreads);
            setThreads((prev) => {
              const threadMap = new Map(prev.map((t) => [t.id, t]));
              for (const thread of newThreads) {
                threadMap.set(thread.id, thread);
              }
              return Array.from(threadMap.values()).sort(
                (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
              );
            });
          }
        }

        // Update sync metadata
        await updateSyncMeta({
          lastSyncAt: syncedAt,
          lastMessageId: lastMessageId || meta.lastMessageId,
        });
        setLastSyncAt(syncedAt);

        // Recalculate unread counts
        const counts = await getUnreadCounts();
        setUnreadCounts(counts);
        const total = await getTotalUnreadCount();
        setTotalUnreadCount(total);

        console.log('[ChatProvider] Sync completed:', {
          newThreads: newThreads?.length || 0,
          newMessages: newMessages?.length || 0,
          syncedAt,
        });
      }
    } catch (error) {
      console.error('[ChatProvider] Sync error:', error);
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [getAuthToken]);

  // ==================== SOCKET CONNECTION ====================
  useEffect(() => {
    if (initializedRef.current) return;

    const token = getAuthToken();
    if (!token) {
      console.log('[ChatProvider] No token, skipping socket connection');
      return;
    }

    initializedRef.current = true;

    const apiUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'https://bisman-erp-backend-production.up.railway.app';

    console.log('[ChatProvider] Connecting to chat socket:', `${apiUrl}/chat`);

    const newSocket = io(`${apiUrl}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      timeout: 10000,
      auth: { token },
      query: { token },
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection handlers
    newSocket.on('connect', () => {
      console.log('[ChatProvider] ✅ Socket connected:', newSocket.id);
      setConnected(true);

      // Emit online status
      newSocket.emit('user:online');

      // Rejoin threads
      joinedThreadsRef.current.forEach((threadId) => {
        newSocket.emit('chat:join', threadId);
      });

      // Trigger delta sync on connect
      syncNow();
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[ChatProvider] ❌ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[ChatProvider] 🔄 Reconnected after', attemptNumber, 'attempts');
      newSocket.emit('user:online');
      joinedThreadsRef.current.forEach((threadId) => {
        newSocket.emit('chat:join', threadId);
      });
    });

    newSocket.on('connect_error', (error) => {
      console.warn('[ChatProvider] Connection error:', error.message);
      setConnected(false);
    });

    // ==================== MESSAGE HANDLERS (GLOBAL LISTENER) ====================
    // This is the critical part - these listeners stay alive even when ChatWindow is closed

    newSocket.on('chat:message:new', async (payload: IncomingMessagePayload) => {
      console.log('[ChatProvider] 📨 New message received:', payload);

      const { threadId, message, unreadCount } = payload;

      // 1. Save to IndexedDB immediately
      await addMessage(threadId, message);

      // 2. Update local state
      setMessages((prev) => {
        const next = new Map(prev);
        const existing = next.get(threadId) || [];
        if (!existing.find((m) => m.id === message.id)) {
          next.set(threadId, [...existing, message]);
        }
        return next;
      });

      // 3. Update thread's last message
      await updateThreadLastMessage(
        threadId,
        {
          id: message.id,
          content: message.content,
          createdAt: message.createdAt,
          senderId: message.senderId,
        },
        threadId !== activeThreadId // Increment unread only if not viewing this thread
      );

      // 4. Update threads state
      setThreads((prev) => {
        const updated = prev.map((t) => {
          if (t.id === threadId) {
            return {
              ...t,
              lastMessage: {
                id: message.id,
                content: message.content,
                createdAt: message.createdAt,
                senderId: message.senderId,
              },
              updatedAt: new Date().toISOString(),
              unreadCount: threadId !== activeThreadId ? (t.unreadCount || 0) + 1 : t.unreadCount,
            };
          }
          return t;
        });
        // Re-sort by updatedAt
        return updated.sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });

      // 5. Update unread counts
      if (threadId !== activeThreadId) {
        setUnreadCounts((prev) => ({
          ...prev,
          [threadId]: unreadCount ?? (prev[threadId] || 0) + 1,
        }));
        setTotalUnreadCount((prev) => prev + 1);
      }

      // 6. Emit event for UI components (e.g., scroll to bottom, play sound)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('chat:newMessage', {
            detail: { threadId, message },
          })
        );
      }
    });

    // Also listen for the alternative event name
    newSocket.on('chat:message', async (payload: IncomingMessagePayload) => {
      // Forward to the same handler
      newSocket.emit('chat:message:new', payload);
    });

    // Cleanup on unmount
    return () => {
      console.log('[ChatProvider] Disconnecting socket...');
      newSocket.disconnect();
      socketRef.current = null;
      initializedRef.current = false;
    };
  }, [getAuthToken, syncNow, activeThreadId]);

  // ==================== MESSAGE ACTIONS ====================
  const getThreadMessages = useCallback(
    (threadId: string): StoredMessage[] => {
      return messages.get(threadId) || [];
    },
    [messages]
  );

  const loadThreadMessages = useCallback(async (threadId: string) => {
    // First check local cache
    let localMsgs = messages.get(threadId);

    if (!localMsgs || localMsgs.length === 0) {
      // Load from IndexedDB
      localMsgs = await getLocalMessages(threadId);
      if (localMsgs.length > 0) {
        setMessages((prev) => {
          const next = new Map(prev);
          next.set(threadId, localMsgs!);
          return next;
        });
      }
    }

    return localMsgs;
  }, [messages]);

  const sendMessage = useCallback(
    async (threadId: string, content: string, type: string = 'text') => {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

      const response = await fetch(`${apiUrl}/api/chat/threads/${threadId}/messages`, {
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

      // Add to local state immediately (optimistic)
      await addMessage(threadId, message);
      setMessages((prev) => {
        const next = new Map(prev);
        const existing = next.get(threadId) || [];
        if (!existing.find((m) => m.id === message.id)) {
          next.set(threadId, [...existing, message]);
        }
        return next;
      });

      return message;
    },
    [getAuthToken]
  );

  // ==================== THREAD ACTIONS ====================
  const refreshThreads = useCallback(async () => {
    const token = getAuthToken();
    if (!token) return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

    try {
      const response = await fetch(`${apiUrl}/api/chat/threads`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          await saveThreads(result.data);
          setThreads(result.data);
        }
      }
    } catch (error) {
      console.error('[ChatProvider] Error refreshing threads:', error);
    }
  }, [getAuthToken]);

  const markThreadAsRead = useCallback(
    async (threadId: string) => {
      // Update local state
      await clearThreadUnread(threadId);

      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[threadId];
        return next;
      });

      setTotalUnreadCount((prev) => {
        const threadUnread = unreadCounts[threadId] || 0;
        return Math.max(0, prev - threadUnread);
      });

      setThreads((prev) =>
        prev.map((t) => (t.id === threadId ? { ...t, unreadCount: 0 } : t))
      );

      // Notify server (fire and forget)
      const token = getAuthToken();
      if (token && socketRef.current) {
        socketRef.current.emit('chat:read', { threadId });
      }
    },
    [getAuthToken, unreadCounts]
  );

  // ==================== SOCKET ACTIONS ====================
  const joinThread = useCallback((threadId: string) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:join', threadId);
      joinedThreadsRef.current.add(threadId);
      console.log('[ChatProvider] Joined thread:', threadId);
    }
  }, [connected]);

  const leaveThread = useCallback((threadId: string) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:leave', threadId);
      joinedThreadsRef.current.delete(threadId);
      console.log('[ChatProvider] Left thread:', threadId);
    }
  }, [connected]);

  const sendTyping = useCallback(
    (threadId: string, isTyping: boolean) => {
      if (socketRef.current && connected) {
        socketRef.current.emit('chat:typing', { threadId, isTyping });
      }
    },
    [connected]
  );

  // ==================== LIFECYCLE ====================
  const clearLocalData = useCallback(async () => {
    await clearAllChatData();
    setThreads([]);
    setMessages(new Map());
    setUnreadCounts({});
    setTotalUnreadCount(0);
    setLastSyncAt(null);
    console.log('[ChatProvider] Local data cleared');
  }, []);

  // When active thread changes, mark it as read
  useEffect(() => {
    if (activeThreadId) {
      markThreadAsRead(activeThreadId);
      // Also load messages for this thread if not loaded
      loadThreadMessages(activeThreadId);
    }
  }, [activeThreadId, markThreadAsRead, loadThreadMessages]);

  // ==================== CONTEXT VALUE ====================
  const value: ChatContextValue = {
    // Connection
    connected,
    socket,

    // Threads
    threads,
    activeThreadId,
    setActiveThreadId,

    // Messages
    messages,
    getThreadMessages,

    // Unread
    totalUnreadCount,
    unreadCounts,
    markThreadAsRead,

    // Sync
    isSyncing,
    lastSyncAt,
    syncNow,

    // Actions
    sendMessage,
    refreshThreads,
    joinThread,
    leaveThread,
    sendTyping,

    // Lifecycle
    clearLocalData,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export default ChatContext;
