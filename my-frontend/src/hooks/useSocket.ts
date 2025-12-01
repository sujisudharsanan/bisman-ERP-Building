// Socket.IO Hook for Realtime Updates
'use client';

import { useEffect, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  emit: (event: string, data: any) => void;
  on: (event: string, callback: (...args: any[]) => void) => void;
  off: (event: string, callback?: (...args: any[]) => void) => void;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Get API URL from environment or default
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Initialize Socket.IO client
    const socketInstance = io(apiUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    // Connection event handlers
    socketInstance.on('connect', () => {
      console.log('[Socket.IO] Connected:', socketInstance.id);
      setConnected(true);
    });

    socketInstance.on('connected', (data) => {
      console.log('[Socket.IO] Server says:', data.message);
    });

    socketInstance.on('disconnect', (reason) => {
      console.log('[Socket.IO] Disconnected:', reason);
      setConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('[Socket.IO] Connection error:', error.message);
      setConnected(false);
    });

    socketInstance.on('error', (error) => {
      console.error('[Socket.IO] Error:', error);
    });

    // Task workflow events
    socketInstance.on('task_updated', (task) => {
      console.log('[Socket.IO] Task updated:', task);
      // Dispatch custom event for components to listen
      window.dispatchEvent(new CustomEvent('workflow-task-updated', { detail: task }));
    });

    socketInstance.on('task_comment_added', (data) => {
      console.log('[Socket.IO] Comment added:', data);
      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('workflow-task-comment-added', { detail: data }));
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      console.log('[Socket.IO] Disconnecting...');
      socketInstance.disconnect();
    };
  }, []);

  // Helper to emit events
  const emit = useCallback((event: string, data: any) => {
    if (socket && connected) {
      socket.emit(event, data);
    } else {
      console.warn('[Socket.IO] Cannot emit, not connected');
    }
  }, [socket, connected]);

  // Helper to listen to events
  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  }, [socket]);

  // Helper to remove event listeners
  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socket) {
      if (callback) {
        socket.off(event, callback);
      } else {
        socket.off(event);
      }
    }
  }, [socket]);

  return {
    socket,
    connected,
    emit,
    on,
    off
  };
}
