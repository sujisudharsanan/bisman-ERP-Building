// Chat Socket.IO Hook for Realtime Messaging
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseChatSocketOptions {
  token?: string;
  onNewMessage?: (data: { threadId: string; message: any }) => void;
  onTyping?: (data: { userId: string; username: string; threadId: string; isTyping: boolean }) => void;
  onUserJoined?: (data: { userId: string; username: string; threadId: string }) => void;
  onUserLeft?: (data: { userId: string; username: string; threadId: string }) => void;
  onPresenceUpdate?: (data: { userId: string; status: string; lastSeen: Date }) => void;
}

interface UseChatSocketReturn {
  connected: boolean;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  sendTyping: (threadId: string, isTyping: boolean) => void;
  markRead: (threadId: string, messageId: string) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}): UseChatSocketReturn {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const joinedThreadsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Get API URL for Socket.IO - connect to /chat namespace
    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                   process.env.NEXT_PUBLIC_API_URL || 
                   'https://bisman-erp-backend-production.up.railway.app';
    
    // Get token from cookie or options
    const token = options.token || document.cookie
      .split('; ')
      .find(row => row.startsWith('accessToken='))
      ?.split('=')[1];

    // Initialize Socket.IO client to /chat namespace
    const socket = io(`${apiUrl}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: {
        token
      }
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('[ChatSocket] Connected:', socket.id);
      setConnected(true);
      
      // Rejoin previously joined threads
      joinedThreadsRef.current.forEach(threadId => {
        socket.emit('chat:join', threadId);
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[ChatSocket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('[ChatSocket] Connection error:', error.message);
      setConnected(false);
    });

    // Chat event handlers
    socket.on('chat:message:new', (data) => {
      console.log('[ChatSocket] New message:', data);
      options.onNewMessage?.(data);
    });

    // Also listen for the event from REST API
    socket.on('chat:message', (data) => {
      console.log('[ChatSocket] Message from API:', data);
      options.onNewMessage?.(data);
    });

    socket.on('chat:typing:update', (data) => {
      console.log('[ChatSocket] Typing update:', data);
      options.onTyping?.(data);
    });

    socket.on('chat:user:joined', (data) => {
      console.log('[ChatSocket] User joined:', data);
      options.onUserJoined?.(data);
    });

    socket.on('chat:user:left', (data) => {
      console.log('[ChatSocket] User left:', data);
      options.onUserLeft?.(data);
    });

    socket.on('chat:presence:update', (data) => {
      console.log('[ChatSocket] Presence update:', data);
      options.onPresenceUpdate?.(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[ChatSocket] Disconnecting...');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [options.token]); // Only reconnect if token changes

  // Update callbacks when they change
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Remove old listeners and add new ones
    const handleNewMessage = (data: any) => {
      console.log('[ChatSocket] New message (callback):', data);
      options.onNewMessage?.(data);
    };

    socket.off('chat:message:new');
    socket.off('chat:message');
    socket.on('chat:message:new', handleNewMessage);
    socket.on('chat:message', handleNewMessage);
  }, [options.onNewMessage]);

  // Join a thread room
  const joinThread = useCallback((threadId: string) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:join', threadId);
      joinedThreadsRef.current.add(threadId);
      console.log('[ChatSocket] Joining thread:', threadId);
    }
  }, [connected]);

  // Leave a thread room
  const leaveThread = useCallback((threadId: string) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:leave', threadId);
      joinedThreadsRef.current.delete(threadId);
      console.log('[ChatSocket] Leaving thread:', threadId);
    }
  }, [connected]);

  // Send typing indicator
  const sendTyping = useCallback((threadId: string, isTyping: boolean) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:typing', { threadId, isTyping });
    }
  }, [connected]);

  // Mark message as read
  const markRead = useCallback((threadId: string, messageId: string) => {
    if (socketRef.current && connected) {
      socketRef.current.emit('chat:read', { threadId, messageId });
    }
  }, [connected]);

  return {
    connected,
    joinThread,
    leaveThread,
    sendTyping,
    markRead
  };
}
