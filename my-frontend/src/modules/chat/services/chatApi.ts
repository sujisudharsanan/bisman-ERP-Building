/**
 * Chat API Service
 * Handles all HTTP requests for chat functionality
 */

import type {
  Thread,
  Message,
  CallLog,
  ChatApiResponse,
  SendMessagePayload,
  CreateThreadPayload,
  InitiateCallPayload,
  AIMessage,
} from '../types'

// Use empty string for relative URLs - requests will go through Next.js API proxy
const API_BASE = ''

class ChatApiService {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<ChatApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        credentials: 'include', // Include cookies for auth
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({
          message: response.statusText,
        }))
        return {
          success: false,
          error: error.message || 'Request failed',
        }
      }

      const data = await response.json()
      return {
        success: true,
        data,
      }
    } catch (error) {
      console.error('[ChatAPI] Request error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ==================== THREADS ====================

  async getThreads(): Promise<ChatApiResponse<Thread[]>> {
    return this.request<Thread[]>('/api/chat/threads')
  }

  async getThread(threadId: string): Promise<ChatApiResponse<Thread>> {
    return this.request<Thread>(`/api/chat/threads/${threadId}`)
  }

  async createThread(
    payload: CreateThreadPayload
  ): Promise<ChatApiResponse<Thread>> {
    return this.request<Thread>('/api/chat/threads', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async updateThread(
    threadId: string,
    updates: Partial<Thread>
  ): Promise<ChatApiResponse<Thread>> {
    return this.request<Thread>(`/api/chat/threads/${threadId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteThread(threadId: string): Promise<ChatApiResponse<void>> {
    return this.request<void>(`/api/chat/threads/${threadId}`, {
      method: 'DELETE',
    })
  }

  async addThreadMember(
    threadId: string,
    userId: number
  ): Promise<ChatApiResponse<Thread>> {
    return this.request<Thread>(`/api/chat/threads/${threadId}/members`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  }

  async removeThreadMember(
    threadId: string,
    userId: number
  ): Promise<ChatApiResponse<void>> {
    return this.request<void>(
      `/api/chat/threads/${threadId}/members/${userId}`,
      {
        method: 'DELETE',
      }
    )
  }

  // ==================== MESSAGES ====================

  async getMessages(threadId: string): Promise<ChatApiResponse<Message[]>> {
    return this.request<Message[]>(`/api/chat/threads/${threadId}/messages`)
  }

  async sendMessage(
    payload: SendMessagePayload
  ): Promise<ChatApiResponse<Message>> {
    const { threadId, content, type = 'text', attachments } = payload

    // If attachments, use FormData
    if (attachments && attachments.length > 0) {
      const formData = new FormData()
      formData.append('content', content)
      formData.append('type', type)
      attachments.forEach((file) => {
        formData.append('attachments', file)
      })

      const response = await fetch(
        `${this.baseUrl}/api/chat/threads/${threadId}/messages`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      )

      if (!response.ok) {
        return {
          success: false,
          error: 'Failed to send message with attachments',
        }
      }

      return {
        success: true,
        data: await response.json(),
      }
    }

    // Text-only message
    return this.request<Message>(
      `/api/chat/threads/${threadId}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({ content, type }),
      }
    )
  }

  async deleteMessage(
    threadId: string,
    messageId: string
  ): Promise<ChatApiResponse<void>> {
    return this.request<void>(
      `/api/chat/threads/${threadId}/messages/${messageId}`,
      {
        method: 'DELETE',
      }
    )
  }

  async editMessage(
    threadId: string,
    messageId: string,
    content: string
  ): Promise<ChatApiResponse<Message>> {
    return this.request<Message>(
      `/api/chat/threads/${threadId}/messages/${messageId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ content }),
      }
    )
  }

  async addReaction(
    messageId: string,
    emoji: string
  ): Promise<ChatApiResponse<void>> {
    return this.request<void>(`/api/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    })
  }

  // ==================== CALLS ====================

  async getCalls(threadId?: string): Promise<ChatApiResponse<CallLog[]>> {
    const endpoint = threadId
      ? `/api/chat/calls?threadId=${threadId}`
      : '/api/chat/calls'
    return this.request<CallLog[]>(endpoint)
  }

  async initiateCall(
    payload: InitiateCallPayload
  ): Promise<ChatApiResponse<CallLog>> {
    return this.request<CallLog>('/api/chat/calls', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async endCall(callId: string): Promise<ChatApiResponse<CallLog>> {
    return this.request<CallLog>(`/api/chat/calls/${callId}/end`, {
      method: 'POST',
    })
  }

  // ==================== AI ASSISTANT ====================

  async sendAIMessage(message: string): Promise<ChatApiResponse<AIMessage>> {
    return this.request<AIMessage>('/api/chat/message', {
      method: 'POST',
      body: JSON.stringify({ message }),
    })
  }

  async getAIHistory(limit: number = 50): Promise<ChatApiResponse<AIMessage[]>> {
    return this.request<AIMessage[]>(`/api/chat/ai/history?limit=${limit}`)
  }

  // ==================== SEARCH ====================

  async searchMessages(
    query: string,
    threadId?: string
  ): Promise<ChatApiResponse<Message[]>> {
    const params = new URLSearchParams({ query })
    if (threadId) params.append('threadId', threadId)
    return this.request<Message[]>(`/api/chat/search?${params}`)
  }

  // ==================== PRESENCE ====================

  async updatePresence(status: 'online' | 'away' | 'busy'): Promise<ChatApiResponse<void>> {
    return this.request<void>('/api/chat/presence', {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
  }
}

// Export singleton instance
export const chatApi = new ChatApiService()

// Export class for testing
export { ChatApiService }
