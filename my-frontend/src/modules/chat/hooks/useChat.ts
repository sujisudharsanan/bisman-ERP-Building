/**
 * useChat Hook
 * Main hook for chat functionality
 */

import { useState, useEffect, useCallback } from 'react'
import { chatApi } from '../services/chatApi'
import { useSocket } from './useSocket'
import type { Thread, Message, TypingIndicator } from '../types'

interface UseChatOptions {
  threadId?: string
  autoConnect?: boolean
}

interface UseChatReturn {
  // State
  threads: Thread[]
  activeThread: Thread | null
  messages: Message[]
  typingUsers: TypingIndicator[]
  isLoading: boolean
  error: string | null
  
  // Actions
  loadThreads: () => Promise<void>
  selectThread: (threadId: string) => Promise<void>
  sendMessage: (content: string, attachments?: File[]) => Promise<void>
  createThread: (memberIds: number[], title?: string) => Promise<Thread | null>
  deleteThread: (threadId: string) => Promise<void>
  startTyping: () => void
  stopTyping: () => void
  
  // Socket
  isConnected: boolean
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { threadId, autoConnect = true } = options
  
  // State
  const [threads, setThreads] = useState<Thread[]>([])
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [typingUsers, setTypingUsers] = useState<TypingIndicator[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Socket connection
  const { socket, connected: isConnected } = useSocket()
  
  // Load threads
  const loadThreads = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await chatApi.getThreads()
      if (response.success && response.data) {
        setThreads(response.data)
      } else {
        setError(response.error || 'Failed to load threads')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Select thread and load messages
  const selectThread = useCallback(async (newThreadId: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      // Get thread details
      const threadResponse = await chatApi.getThread(newThreadId)
      if (!threadResponse.success || !threadResponse.data) {
        setError(threadResponse.error || 'Failed to load thread')
        return
      }
      
      setActiveThread(threadResponse.data)
      
      // Get messages
      const messagesResponse = await chatApi.getMessages(newThreadId)
      if (messagesResponse.success && messagesResponse.data) {
        setMessages(messagesResponse.data)
      }
      
      // Join socket room
      if (socket) {
        socket.emit('chat:join', newThreadId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }, [socket])
  
  // Send message
  const sendMessage = useCallback(async (content: string, attachments?: File[]) => {
    if (!activeThread) return
    
    try {
      const response = await chatApi.sendMessage({
        threadId: activeThread.id,
        content,
        attachments,
      })
      
      if (response.success && response.data) {
        // Message will be added via socket event
        console.log('[useChat] Message sent:', response.data.id)
      } else {
        setError(response.error || 'Failed to send message')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [activeThread])
  
  // Create thread
  const createThread = useCallback(async (
    memberIds: number[],
    title?: string
  ): Promise<Thread | null> => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await chatApi.createThread({
        memberIds,
        title,
        type: memberIds.length === 1 ? 'direct' : 'group',
      })
      
      if (response.success && response.data) {
        setThreads((prev) => [response.data!, ...prev])
        return response.data
      } else {
        setError(response.error || 'Failed to create thread')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  // Delete thread
  const deleteThread = useCallback(async (deleteThreadId: string) => {
    try {
      const response = await chatApi.deleteThread(deleteThreadId)
      if (response.success) {
        setThreads((prev) => prev.filter((t) => t.id !== deleteThreadId))
        if (activeThread?.id === deleteThreadId) {
          setActiveThread(null)
          setMessages([])
        }
      } else {
        setError(response.error || 'Failed to delete thread')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [activeThread])
  
  // Typing indicators
  const startTyping = useCallback(() => {
    if (socket && activeThread) {
      socket.emit('chat:typing', {
        threadId: activeThread.id,
        isTyping: true,
      })
    }
  }, [socket, activeThread])
  
  const stopTyping = useCallback(() => {
    if (socket && activeThread) {
      socket.emit('chat:typing', {
        threadId: activeThread.id,
        isTyping: false,
      })
    }
  }, [socket, activeThread])
  
  // Socket event handlers
  useEffect(() => {
    if (!socket) return
    
    // New message
    socket.on('chat:message:new', (message: Message) => {
      if (activeThread && message.threadId === activeThread.id) {
        setMessages((prev) => [...prev, message])
      }
      
      // Update thread's last message
      setThreads((prev) =>
        prev.map((t) =>
          t.id === message.threadId
            ? { ...t, lastMessage: message, updatedAt: message.createdAt }
            : t
        )
      )
    })
    
    // Typing indicator
    socket.on('chat:typing:update', (data: TypingIndicator) => {
      if (activeThread && data.threadId === activeThread.id) {
        setTypingUsers((prev) => {
          if (data.isTyping) {
            // Add user if not already typing
            if (!prev.find((u) => u.userId === data.userId)) {
              return [...prev, data]
            }
            return prev
          } else {
            // Remove user from typing list
            return prev.filter((u) => u.userId !== data.userId)
          }
        })
      }
    })
    
    // Thread updated
    socket.on('chat:thread:updated', (thread: Thread) => {
      setThreads((prev) =>
        prev.map((t) => (t.id === thread.id ? thread : t))
      )
      if (activeThread?.id === thread.id) {
        setActiveThread(thread)
      }
    })
    
    return () => {
      socket.off('chat:message:new')
      socket.off('chat:typing:update')
      socket.off('chat:thread:updated')
    }
  }, [socket, activeThread])
  
  // Auto-load threads on mount
  useEffect(() => {
    if (autoConnect) {
      loadThreads()
    }
  }, [autoConnect, loadThreads])
  
  // Auto-select thread if threadId provided
  useEffect(() => {
    if (threadId && threads.length > 0) {
      selectThread(threadId)
    }
  }, [threadId, threads.length, selectThread])
  
  return {
    threads,
    activeThread,
    messages,
    typingUsers,
    isLoading,
    error,
    loadThreads,
    selectThread,
    sendMessage,
    createThread,
    deleteThread,
    startTyping,
    stopTyping,
    isConnected,
  }
}
