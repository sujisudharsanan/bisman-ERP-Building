/**
 * Task Socket Hook
 * Real-time task updates via Socket.IO
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '@/hooks/useAuth';
import { useTaskInvalidation } from '@/hooks/useTasks';
import { Task, TaskMessage, TaskAttachment } from '@/lib/api/taskApi';

interface TaskSocketEvents {
  'task:created': (data: { task: Task }) => void;
  'task:updated': (data: { task: Task; updatedBy: number }) => void;
  'task:statusChanged': (data: { task: Task; previousStatus: string; newStatus: string; updatedBy: number }) => void;
  'task:positionChanged': (data: { taskId: string; status: string; position: number }) => void;
  'task:deleted': (data: { taskId: string; deletedBy: number }) => void;
  'task:newMessage': (data: { taskId: string; message: TaskMessage }) => void;
  'task:newAttachment': (data: { taskId: string; attachment: TaskAttachment }) => void;
  'task:userTyping': (data: { taskId: string; userId: number; isTyping: boolean; userName: string }) => void;
  'task:onlineUsers': (data: { taskId: string; users: { userId: number; name: string }[] }) => void;
}

interface UseTaskSocketOptions {
  taskId?: string;
  enabled?: boolean;
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onTaskMoved?: (data: { taskId: string; status: string; position: number }) => void;
  onNewMessage?: (taskId: string, message: TaskMessage) => void;
  onNewAttachment?: (taskId: string, attachment: TaskAttachment) => void;
  onUserTyping?: (data: { userId: number; isTyping: boolean; userName: string }) => void;
}

export function useTaskSocket(options: UseTaskSocketOptions = {}) {
  const { 
    taskId, 
    enabled = true, 
    onTaskCreated, 
    onTaskUpdated, 
    onTaskDeleted, 
    onTaskMoved,
    onNewMessage, 
    onNewAttachment, 
    onUserTyping 
  } = options;
  const { user, isAuthenticated } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const {
    invalidateTask,
    invalidateKanban,
    invalidateLists,
    invalidateMessages,
    invalidateAttachments,
    updateTaskInCache,
    addMessageToCache,
    addAttachmentToCache,
  } = useTaskInvalidation();

  // Initialize socket connection
  useEffect(() => {
    // Only connect if authenticated and enabled
    if (!isAuthenticated || !user || !enabled) return;

    // Helper to validate token format (should be JWT with dots)
    const isValidToken = (t: string | null | undefined): boolean => {
      return !!t && t !== 'cookie-based' && t.includes('.');
    };

    // Get auth token from localStorage or cookies
    const getToken = (): string | null => {
      if (typeof window === 'undefined') return null;
      const tokens = [
        localStorage.getItem('accessToken'),
        localStorage.getItem('token'),
        document.cookie.split(';').find(c => c.trim().startsWith('accessToken='))?.split('=')[1],
        document.cookie.split(';').find(c => c.trim().startsWith('access_token='))?.split('=')[1]
      ];
      return tokens.find(t => isValidToken(t)) || null;
    };
    
    const token = getToken();

    if (!token) {
      console.warn('[TaskSocket] No auth token found, skipping real-time connection');
      return;
    }

    // Socket server runs on the backend, not the frontend
    // Use same logic as ChatProvider - detect production from window.location
    let socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
    
    // In production, derive from current hostname if env vars not set
    if (typeof window !== 'undefined' && (!socketUrl || socketUrl.includes('localhost'))) {
      const hostname = window.location.hostname;
      if (hostname.includes('railway.app') || hostname.includes('bisman')) {
        socketUrl = 'https://bisman-erp-backend-production.up.railway.app';
      } else if (!socketUrl) {
        socketUrl = 'http://localhost:5000';
      }
    }
    
    // Skip socket connection if URL is empty or not configured properly
    if (!socketUrl || socketUrl === '') {
      console.warn('[TaskSocket] No socket URL configured, skipping real-time updates');
      return;
    }
    
    console.log('[TaskSocket] Connecting to:', socketUrl);
    
    // Connect to root namespace with auth token
    const socket = io(socketUrl, {
      auth: { token },
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 5,
      timeout: 10000,
    });

    socket.on('connect', () => {
      console.log('[TaskSocket] Connected');
      setConnected(true);
    });

    socket.on('disconnect', (reason) => {
      console.log('[TaskSocket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      // Don't spam console with connection errors - socket is optional for basic functionality
      if (error.message !== 'Authentication error: No token provided') {
        console.warn('[TaskSocket] Connection failed (real-time updates disabled):', error.message);
      }
      // Socket connection is optional - dashboard works without it
      setConnected(false);
    });

    // Store socket reference
    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, user]);

  // Join/leave task room
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected || !taskId) return;

    socket.emit('task:join', { taskId });

    return () => {
      socket.emit('task:leave', { taskId });
    };
  }, [taskId, connected]);

  // Set up event handlers
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    // Task created
    socket.on('task:created', ({ task }) => {
      console.log('[TaskSocket] Task created:', task.id);
      invalidateKanban();
      invalidateLists();
      onTaskCreated?.(task);
    });

    // Task updated
    socket.on('task:updated', ({ task, updatedBy }) => {
      console.log('[TaskSocket] Task updated:', task.id, 'by:', updatedBy);
      updateTaskInCache(task);
      invalidateKanban();
      onTaskUpdated?.(task);
    });

    // Status changed (camelCase - legacy)
    socket.on('task:statusChanged', ({ task, previousStatus, newStatus }) => {
      console.log('[TaskSocket] Status changed:', task.id, previousStatus, '->', newStatus);
      updateTaskInCache(task);
      invalidateKanban();
      onTaskUpdated?.(task);
    });

    // Status changed (snake_case - backend)
    socket.on('task:status_changed', ({ task }) => {
      console.log('[TaskSocket] Status changed (backend):', task?.id);
      if (task) {
        updateTaskInCache(task);
        invalidateKanban();
        onTaskUpdated?.(task);
      }
    });

    // Task approved (maker-checker workflow)
    socket.on('task:approved', ({ task }) => {
      console.log('[TaskSocket] Task approved:', task?.id);
      if (task) {
        updateTaskInCache(task);
        invalidateKanban();
        onTaskUpdated?.(task);
      }
    });

    // Task rejected (maker-checker workflow)
    socket.on('task:rejected', ({ task, reason }) => {
      console.log('[TaskSocket] Task rejected:', task?.id, 'reason:', reason);
      if (task) {
        updateTaskInCache(task);
        invalidateKanban();
        onTaskUpdated?.(task);
      }
    });

    // Task sent for review - specifically for creators to see tasks needing their review
    socket.on('task:review_requested', ({ task, requestedBy, message }) => {
      console.log('[TaskSocket] Review requested for task:', task?.id, 'by:', requestedBy);
      if (task) {
        updateTaskInCache(task);
        invalidateKanban();
        onTaskUpdated?.(task);
      }
    });

    // Task reassigned
    socket.on('task:reassigned', ({ task }) => {
      console.log('[TaskSocket] Task reassigned:', task?.id);
      if (task) {
        updateTaskInCache(task);
        invalidateKanban();
        onTaskUpdated?.(task);
      }
    });

    // Position changed
    socket.on('task:positionChanged', ({ taskId: changedTaskId, status, position }) => {
      console.log('[TaskSocket] Position changed:', changedTaskId, status, position);
      // Don't invalidate if we triggered this change (handled by optimistic update)
      // Only invalidate if it's from another user
      invalidateKanban();
      onTaskMoved?.({ taskId: changedTaskId, status, position });
    });

    // Task deleted
    socket.on('task:deleted', ({ taskId: deletedId }) => {
      console.log('[TaskSocket] Task deleted:', deletedId);
      invalidateKanban();
      invalidateLists();
      onTaskDeleted?.(deletedId);
    });

    // New message (camelCase - legacy)
    socket.on('task:newMessage', ({ taskId: msgTaskId, message }) => {
      console.log('[TaskSocket] New message on task:', msgTaskId);
      addMessageToCache(msgTaskId, message);
      invalidateTask(msgTaskId); // Update message count
      onNewMessage?.(msgTaskId, message);
    });

    // New message (snake_case - backend)
    socket.on('task:message', ({ taskId: msgTaskId, message }) => {
      console.log('[TaskSocket] New message (backend) on task:', msgTaskId);
      if (message) {
        addMessageToCache(msgTaskId, message);
        invalidateTask(msgTaskId);
        invalidateMessages(msgTaskId);
        onNewMessage?.(msgTaskId, message);
      }
    });

    // Message updated
    socket.on('task:message:updated', ({ taskId: msgTaskId }) => {
      console.log('[TaskSocket] Message updated on task:', msgTaskId);
      invalidateMessages(msgTaskId);
    });

    // Message deleted
    socket.on('task:message:deleted', ({ taskId: msgTaskId }) => {
      console.log('[TaskSocket] Message deleted on task:', msgTaskId);
      invalidateMessages(msgTaskId);
    });

    // New attachment
    socket.on('task:newAttachment', ({ taskId: attTaskId, attachment }) => {
      console.log('[TaskSocket] New attachment on task:', attTaskId);
      addAttachmentToCache(attTaskId, attachment);
      invalidateTask(attTaskId); // Update attachment count
      onNewAttachment?.(attTaskId, attachment);
    });

    // User typing
    socket.on('task:userTyping', ({ taskId: typingTaskId, userId, isTyping, userName }) => {
      if (taskId === typingTaskId) {
        setTypingUsers((prev) => {
          const newMap = new Map(prev);
          if (isTyping) {
            newMap.set(userId, userName);
          } else {
            newMap.delete(userId);
          }
          return newMap;
        });
        onUserTyping?.({ userId, isTyping, userName });
      }
    });

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:statusChanged');
      socket.off('task:status_changed');
      socket.off('task:approved');
      socket.off('task:rejected');
      socket.off('task:reassigned');
      socket.off('task:positionChanged');
      socket.off('task:deleted');
      socket.off('task:newMessage');
      socket.off('task:message');
      socket.off('task:message:updated');
      socket.off('task:message:deleted');
      socket.off('task:newAttachment');
      socket.off('task:userTyping');
    };
  }, [
    taskId,
    invalidateTask,
    invalidateKanban,
    invalidateLists,
    invalidateMessages,
    invalidateAttachments,
    updateTaskInCache,
    addMessageToCache,
    addAttachmentToCache,
    onTaskCreated,
    onTaskUpdated,
    onTaskDeleted,
    onTaskMoved,
    onNewMessage,
    onNewAttachment,
    onUserTyping,
  ]);

  // Send typing indicator
  const sendTyping = useCallback((isTyping: boolean) => {
    const socket = socketRef.current;
    if (!socket || !taskId) return;
    
    socket.emit('task:typing', { taskId, isTyping });
  }, [taskId]);

  // Get online users for current task
  const getOnlineUsers = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !taskId) return;
    
    socket.emit('task:getOnlineUsers', { taskId });
  }, [taskId]);

  return {
    connected,
    typingUsers: Array.from(typingUsers.entries()).map(([userId, name]) => ({ userId, name })),
    sendTyping,
    getOnlineUsers,
  };
}

export default useTaskSocket;
