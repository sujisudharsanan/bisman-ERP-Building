// Chat Socket.IO Hook for Realtime Messaging
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import io, { Socket } from 'socket.io-client';

export interface IncomingCallData {
  callId: string;
  roomName: string;
  threadId: string;
  callType: 'audio' | 'video';
  callerId: number;
  callerName: string;
  timestamp: Date;
}

interface UseChatSocketOptions {
  token?: string;
  onNewMessage?: (data: { threadId: string; message: any }) => void;
  onTyping?: (data: { userId: string; username: string; threadId: string; isTyping: boolean }) => void;
  onUserJoined?: (data: { userId: string; username: string; threadId: string }) => void;
  onUserLeft?: (data: { userId: string; username: string; threadId: string }) => void;
  onPresenceUpdate?: (data: { userId: string; status: string; lastSeen: Date }) => void;
  onIncomingCall?: (data: IncomingCallData) => void;
  onCallAccepted?: (data: { callId: string; roomName: string; acceptedBy: number; acceptedByName: string }) => void;
  onCallRejected?: (data: { callId: string; rejectedBy: number; rejectedByName: string; reason: string }) => void;
  onCallEnded?: (data: { callId: string; endedBy: number; endedByName: string; duration: number }) => void;
}

interface UseChatSocketReturn {
  connected: boolean;
  socket: Socket | null;
  joinThread: (threadId: string) => void;
  leaveThread: (threadId: string) => void;
  sendTyping: (threadId: string, isTyping: boolean) => void;
  markRead: (threadId: string, messageId: string) => void;
}

export function useChatSocket(options: UseChatSocketOptions = {}): UseChatSocketReturn {
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedThreadsRef = useRef<Set<string>>(new Set());
  const connectionAttemptedRef = useRef(false);
  
  // Use refs for callbacks to avoid re-registering listeners
  const onNewMessageRef = useRef(options.onNewMessage);
  const onTypingRef = useRef(options.onTyping);
  const onUserJoinedRef = useRef(options.onUserJoined);
  const onUserLeftRef = useRef(options.onUserLeft);
  const onPresenceUpdateRef = useRef(options.onPresenceUpdate);
  const onIncomingCallRef = useRef(options.onIncomingCall);
  const onCallAcceptedRef = useRef(options.onCallAccepted);
  const onCallRejectedRef = useRef(options.onCallRejected);
  const onCallEndedRef = useRef(options.onCallEnded);
  
  // Keep refs updated with latest callbacks
  useEffect(() => {
    onNewMessageRef.current = options.onNewMessage;
    onTypingRef.current = options.onTyping;
    onUserJoinedRef.current = options.onUserJoined;
    onUserLeftRef.current = options.onUserLeft;
    onPresenceUpdateRef.current = options.onPresenceUpdate;
    onIncomingCallRef.current = options.onIncomingCall;
    onCallAcceptedRef.current = options.onCallAccepted;
    onCallRejectedRef.current = options.onCallRejected;
    onCallEndedRef.current = options.onCallEnded;
  });

  useEffect(() => {
    // Prevent double connection attempts in development
    if (connectionAttemptedRef.current) return;
    connectionAttemptedRef.current = true;

    // Get API URL for Socket.IO - connect to /chat namespace
    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 
                   process.env.NEXT_PUBLIC_API_URL || 
                   'https://bisman-erp-backend-production.up.railway.app';
    
    // Get token from multiple possible sources
    const getCookie = (name: string) => {
      if (typeof document === 'undefined') return undefined;
      const value = document.cookie
        .split('; ')
        .find(row => row.startsWith(`${name}=`))
        ?.split('=')[1];
      return value;
    };
    
    const isValidToken = (token: string | null | undefined): boolean => {
      // Token must exist, not be 'cookie-based', and look like a JWT (has dots)
      return !!token && token !== 'cookie-based' && token.includes('.');
    };
    
    const getStorageToken = () => {
      if (typeof window === 'undefined') return undefined;
      const tokens = [
        localStorage.getItem('accessToken'),
        localStorage.getItem('token'),
        localStorage.getItem('authToken'),
        sessionStorage.getItem('authToken')
      ];
      return tokens.find(t => isValidToken(t)) || undefined;
    };
    
    const token = options.token || 
                  getCookie('access_token') ||  // Backend uses underscore format
                  getCookie('accessToken') || 
                  getCookie('token') || 
                  getCookie('authToken') ||
                  getStorageToken();

    // Don't attempt connection if no token is available
    if (!token || !isValidToken(token)) {
      console.warn('[ChatSocket] No authentication token found in cookies or localStorage, skipping connection');
      return;
    }

    console.log('[ChatSocket] Token found, connecting to:', `${apiUrl}/chat`);

    // Initialize Socket.IO client to /chat namespace
    const newSocket = io(`${apiUrl}/chat`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      timeout: 10000,
      auth: {
        token
      },
      // Also send token in query for backends that expect it there
      query: {
        token
      }
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[ChatSocket] ✅ Connected to /chat namespace:', newSocket.id);
      console.log('[ChatSocket] Socket is now available for receiving calls');
      setConnected(true);
      
      // Emit user online status for presence tracking
      newSocket.emit('user:online');
      
      // Rejoin previously joined threads on reconnect
      joinedThreadsRef.current.forEach(threadId => {
        newSocket.emit('chat:join', threadId);
        console.log('[ChatSocket] Rejoined thread on connect:', threadId);
      });
    });

    // Handle reconnection specifically
    newSocket.on('reconnect', (attemptNumber) => {
      console.log('[ChatSocket] 🔄 Reconnected after', attemptNumber, 'attempts');
      
      // Re-emit online status
      newSocket.emit('user:online');
      
      // Rejoin all tracked threads
      joinedThreadsRef.current.forEach(threadId => {
        newSocket.emit('chat:join', threadId);
        console.log('[ChatSocket] Rejoined thread on reconnect:', threadId);
      });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[ChatSocket] ❌ Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('[ChatSocket] Connection error:', error.message);
      setConnected(false);
      // Don't spam reconnection attempts on auth errors
      if (error.message.includes('Authentication') || error.message.includes('auth')) {
        console.warn('[ChatSocket] Auth error - stopping reconnection attempts');
        newSocket.disconnect();
      }
    });

    // Chat event handlers - use refs to always get latest callbacks
    newSocket.on('chat:message:new', (data) => {
      console.log('[ChatSocket] New message:', data);
      onNewMessageRef.current?.(data);
    });

    // Also listen for the event from REST API
    newSocket.on('chat:message', (data) => {
      console.log('[ChatSocket] Message from API:', data);
      onNewMessageRef.current?.(data);
    });

    newSocket.on('chat:typing:update', (data) => {
      console.log('[ChatSocket] Typing update:', data);
      onTypingRef.current?.(data);
    });

    newSocket.on('chat:user:joined', (data) => {
      console.log('[ChatSocket] User joined:', data);
      onUserJoinedRef.current?.(data);
    });

    newSocket.on('chat:user:left', (data) => {
      console.log('[ChatSocket] User left:', data);
      onUserLeftRef.current?.(data);
    });

    newSocket.on('chat:presence:update', (data) => {
      console.log('[ChatSocket] Presence update:', data);
      onPresenceUpdateRef.current?.(data);
    });

    // Call signaling events
    newSocket.on('chat:call:incoming', (data) => {
      console.log('[ChatSocket] Incoming call:', data);
      onIncomingCallRef.current?.(data);
    });

    newSocket.on('chat:call:accepted', (data) => {
      console.log('[ChatSocket] Call accepted:', data);
      onCallAcceptedRef.current?.(data);
    });

    newSocket.on('chat:call:rejected', (data) => {
      console.log('[ChatSocket] Call rejected:', data);
      onCallRejectedRef.current?.(data);
    });

    newSocket.on('chat:call:ended', (data) => {
      console.log('[ChatSocket] Call ended:', data);
      onCallEndedRef.current?.(data);
    });

    // Cleanup on unmount
    return () => {
      console.log('[ChatSocket] Disconnecting...');
      newSocket.disconnect();
      socketRef.current = null;
      setSocket(null);
      connectionAttemptedRef.current = false;
    };
  }, [options.token]); // Only reconnect if token changes

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
    socket,
    joinThread,
    leaveThread,
    sendTyping,
    markRead
  };
}
