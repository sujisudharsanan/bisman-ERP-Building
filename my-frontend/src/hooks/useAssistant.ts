/**
 * BISMAN ERP - Intelligent Assistant Hook
 * React hook for communicating with the intelligent assistant backend
 */

import { useState, useCallback } from 'react';
import type { ChatReply, ChatMessage, AssistantMemory, AssistantCapabilities } from '@/types/assistant';

interface UseAssistantOptions {
  onError?: (error: Error) => void;
}

export function useAssistant(options?: UseAssistantOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  /**
   * Send a message to the assistant
   */
  const sendMessage = useCallback(async (text: string, context?: { branchId?: number; branchName?: string }): Promise<ChatReply | null> => {
    if (!text.trim()) return null;

    setIsLoading(true);

    try {
      // Add user message immediately
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        from: 'user',
        text: text.trim(),
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Call backend API
      const response = await fetch('/api/chat/assistant/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          message: text.trim(),
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const reply: ChatReply = await response.json();

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        from: 'assistant',
        text: reply.text,
        reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      return reply;
    } catch (error) {
      console.error('Error sending message to assistant:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        from: 'assistant',
        text: 'Sorry, I encountered an error processing your request. Please try again.',
        reply: {
          text: 'Sorry, I encountered an error processing your request. Please try again.',
          tone: 'error',
        },
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);

      if (options?.onError && error instanceof Error) {
        options.onError(error);
      }

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  /**
   * Get assistant memory
   */
  const getMemory = useCallback(async (): Promise<AssistantMemory | null> => {
    try {
      const response = await fetch('/api/chat/assistant/memory', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch memory');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching memory:', error);
      return null;
    }
  }, []);

  /**
   * Reset assistant memory
   */
  const resetMemory = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/chat/assistant/memory', {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to reset memory');
      }

      return true;
    } catch (error) {
      console.error('Error resetting memory:', error);
      return false;
    }
  }, []);

  /**
   * Get assistant capabilities
   */
  const getCapabilities = useCallback(async (): Promise<AssistantCapabilities | null> => {
    try {
      const response = await fetch('/api/chat/assistant/capabilities', {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch capabilities');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching capabilities:', error);
      return null;
    }
  }, []);

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    getMemory,
    resetMemory,
    getCapabilities,
    clearMessages,
  };
}
