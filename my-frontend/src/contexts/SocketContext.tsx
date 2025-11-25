/**
 * Socket.IO Context for Real-Time Task Updates
 * Manages WebSocket connection and task-related events
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Task, TaskEvent } from '@/types/task';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  isConnected: boolean;
  joinTaskRoom: (taskId: number) => void;
  leaveTaskRoom: (taskId: number) => void;
  sendTypingIndicator: (taskId: number, isTyping: boolean) => void;
  onTaskEvent: (event: string, callback: (data: any) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;

  // Initialize Socket.IO connection
  useEffect(() => {
    // Helper function to get cookie value
    const getCookie = (name: string): string | null => {
      if (typeof document === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
      return null;
    };

    // Try to get auth token from cookies (authToken, token, or access_token)
    const token = getCookie('authToken') || getCookie('token') || getCookie('access_token');
    
    if (!token) {
      console.warn('[Socket] No auth token found in cookies, connection will be skipped');
      console.log('[Socket] This is normal if you are not logged in yet');
      // Don't show available cookies for security reasons in production
      if (process.env.NODE_ENV === 'development') {
        const cookieNames = document.cookie.split(';').map(c => c.trim().split('=')[0]).filter(Boolean);
        console.log('[Socket] Available cookie names:', cookieNames.length > 0 ? cookieNames.join(', ') : 'none');
      }
      return;
    }

    // Determine backend URL
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    
    console.log('[Socket] Connecting to:', backendUrl);
    console.log('[Socket] Auth token found, establishing connection...');

    // Create socket connection
    const newSocket = io(backendUrl, {
      auth: {
        token
      },
      withCredentials: true, // Important: send cookies with the connection
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 10000
    });

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('[Socket] ✅ Connected successfully');
      setConnected(true);
      reconnectAttempts.current = 0;
      
      // Emit online status
      newSocket.emit('user:online');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[Socket] ❌ Disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      reconnectAttempts.current++;
      console.error('[Socket] Connection error:', error.message);
      
      if (reconnectAttempts.current >= maxReconnectAttempts) {
        console.error('[Socket] Max reconnection attempts reached');
        newSocket.disconnect();
      }
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket] Reconnection attempt ${attemptNumber}...`);
    });

    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`[Socket] ✅ Reconnected after ${attemptNumber} attempts`);
      reconnectAttempts.current = 0;
    });

    newSocket.on('error', (error) => {
      console.error('[Socket] Socket error:', error);
    });

    // Task event listeners
    newSocket.on('task:created', (data: TaskEvent) => {
      console.log('[Socket] Task created:', data);
    });

    newSocket.on('task:updated', (data: TaskEvent) => {
      console.log('[Socket] Task updated:', data);
    });

    newSocket.on('task:deleted', (data: { taskId: number; userId: number }) => {
      console.log('[Socket] Task deleted:', data);
    });

    newSocket.on('task:message', (data: any) => {
      console.log('[Socket] New message:', data);
    });

    newSocket.on('task:status_changed', (data: TaskEvent) => {
      console.log('[Socket] Status changed:', data);
    });

    newSocket.on('task:approved', (data: TaskEvent) => {
      console.log('[Socket] Task approved:', data);
    });

    newSocket.on('task:rejected', (data: any) => {
      console.log('[Socket] Task rejected:', data);
    });

    newSocket.on('task:reassigned', (data: any) => {
      console.log('[Socket] Task reassigned:', data);
    });

    newSocket.on('user:status_changed', (data: any) => {
      console.log('[Socket] User status changed:', data);
    });

    newSocket.on('task:user_typing', (data: any) => {
      console.log('[Socket] User typing:', data);
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('[Socket] Disconnecting...');
      newSocket.disconnect();
    };
  }, []); // Only run once on mount

  // Join a task room
  const joinTaskRoom = useCallback((taskId: number) => {
    if (socket && connected) {
      socket.emit('task:join', taskId);
      console.log('[Socket] Joined task room:', taskId);
    }
  }, [socket, connected]);

  // Leave a task room
  const leaveTaskRoom = useCallback((taskId: number) => {
    if (socket && connected) {
      socket.emit('task:leave', taskId);
      console.log('[Socket] Left task room:', taskId);
    }
  }, [socket, connected]);

  // Send typing indicator
  const sendTypingIndicator = useCallback((taskId: number, isTyping: boolean) => {
    if (socket && connected) {
      socket.emit('task:typing', { taskId, isTyping });
    }
  }, [socket, connected]);

  // Subscribe to task events
  const onTaskEvent = useCallback((event: string, callback: (data: any) => void) => {
    if (!socket) return () => {};

    socket.on(event, callback);

    // Return cleanup function
    return () => {
      socket.off(event, callback);
    };
  }, [socket]);

  const value: SocketContextValue = {
    socket,
    connected,
    isConnected: connected,
    joinTaskRoom,
    leaveTaskRoom,
    sendTypingIndicator,
    onTaskEvent
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
      {/* Connection Status Indicator (optional) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            right: 10,
            padding: '8px 12px',
            borderRadius: 4,
            backgroundColor: connected ? '#10b981' : '#ef4444',
            color: 'white',
            fontSize: 12,
            fontWeight: 'bold',
            zIndex: 9999,
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
          }}
        >
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </div>
      )}
    </SocketContext.Provider>
  );
};

/**
 * Custom hook for task-specific events
 */
export const useTaskEvents = (taskId?: number) => {
  const { socket, connected, joinTaskRoom, leaveTaskRoom, onTaskEvent } = useSocket();
  const [events, setEvents] = useState<TaskEvent[]>([]);

  // Auto join/leave task room when taskId changes
  useEffect(() => {
    if (taskId && connected) {
      joinTaskRoom(taskId);
      return () => leaveTaskRoom(taskId);
    }
  }, [taskId, connected, joinTaskRoom, leaveTaskRoom]);

  // Listen to all task events
  useEffect(() => {
    if (!socket) return;

    const unsubscribers = [
      onTaskEvent('task:created', (data) => {
        const event: TaskEvent = { 
          type: 'TASK_CREATED', 
          taskId: data.taskId || taskId, 
          timestamp: data.timestamp || new Date().toISOString(),
          userId: data.userId,
          data 
        };
        setEvents(prev => [...prev, event]);
      }),
      onTaskEvent('task:updated', (data) => {
        const event: TaskEvent = { 
          type: 'TASK_UPDATED', 
          taskId: data.taskId || taskId, 
          timestamp: data.timestamp || new Date().toISOString(),
          userId: data.userId,
          data 
        };
        setEvents(prev => [...prev, event]);
      }),
      onTaskEvent('task:deleted', (data) => {
        const event: TaskEvent = { 
          type: 'TASK_DELETED', 
          taskId: data.taskId || taskId, 
          timestamp: data.timestamp || new Date().toISOString(),
          userId: data.userId,
          data 
        };
        setEvents(prev => [...prev, event]);
      }),
      onTaskEvent('task:message', (data) => {
        const event: TaskEvent = { 
          type: 'MESSAGE_ADDED', 
          taskId: data.taskId || taskId, 
          timestamp: data.timestamp || new Date().toISOString(),
          userId: data.userId,
          data 
        };
        setEvents(prev => [...prev, event]);
      }),
      onTaskEvent('task:status_changed', (data) => {
        const event: TaskEvent = { 
          type: 'STATUS_CHANGED', 
          taskId: data.taskId || taskId, 
          timestamp: data.timestamp || new Date().toISOString(),
          userId: data.userId,
          data 
        };
        setEvents(prev => [...prev, event]);
      })
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [socket, onTaskEvent]);

  return { events, connected };
};

/**
 * Custom hook for typing indicators
 */
export const useTypingIndicator = (taskId: number) => {
  const { sendTypingIndicator, onTaskEvent } = useSocket();
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const cleanup = onTaskEvent('task:user_typing', (data: any) => {
      if (data.taskId !== taskId) return;

      if (data.isTyping) {
        setTypingUsers(prev => {
          if (!prev.includes(data.username)) {
            return [...prev, data.username];
          }
          return prev;
        });
      } else {
        setTypingUsers(prev => prev.filter(u => u !== data.username));
      }
    });

    return cleanup;
  }, [taskId, onTaskEvent]);

  const startTyping = useCallback(() => {
    sendTypingIndicator(taskId, true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Stop typing after 3 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(taskId, false);
    }, 3000);
  }, [taskId, sendTypingIndicator]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingIndicator(taskId, false);
  }, [taskId, sendTypingIndicator]);

  return { typingUsers, startTyping, stopTyping };
};
