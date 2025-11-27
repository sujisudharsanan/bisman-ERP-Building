/**
 * Chat Module TypeScript Definitions
 */

export interface User {
  id: number
  username: string
  email: string
  role: string
  avatar?: string
}

export interface Thread {
  id: string
  title?: string
  createdById: number
  createdAt: Date
  updatedAt: Date
  createdBy: User
  members: ThreadMember[]
  lastMessage?: Message
}

export interface ThreadMember {
  id: string
  threadId: string
  userId: number
  role: 'member' | 'moderator' | 'admin'
  joinedAt: Date
  leftAt?: Date
  isActive: boolean
  user: User
}

export interface Message {
  id: string
  threadId: string
  userId: number
  content: string
  type: 'text' | 'file' | 'image' | 'system'
  createdAt: Date
  updatedAt: Date
  user: User
  attachments?: Attachment[]
  reactions?: Reaction[]
}

export interface Attachment {
  id: string
  messageId: string
  filename: string
  url: string
  size: number
  mimeType: string
  createdAt: Date
}

export interface Reaction {
  id: string
  messageId: string
  userId: number
  emoji: string
  createdAt: Date
  user: User
}

export interface CallLog {
  id: string
  room_name: string
  thread_id: string
  initiator_id: number
  call_type: 'audio' | 'video'
  status: 'ringing' | 'active' | 'ended' | 'missed' | 'failed'
  started_at: Date
  ended_at?: Date
  duration_seconds?: number
  participants?: CallParticipant[]
  recording_url?: string
  transcript_url?: string
}

export interface CallParticipant {
  user_id: number
  joined_at: Date
  left_at?: Date
}

export interface TypingIndicator {
  threadId: string
  userId: number
  username: string
  isTyping: boolean
}

export interface UserPresence {
  userId: number
  status: 'online' | 'offline' | 'away' | 'busy'
  lastSeen: Date
}

export interface AIMessage {
  id: string
  message: string
  reply: string
  confidence: number
  source: 'database' | 'ai' | 'rule'
  suggestions?: string[]
  createdAt: Date
}

export interface ChatState {
  threads: Thread[]
  activeThread?: Thread
  messages: Message[]
  isLoading: boolean
  error?: string
}

export interface SocketEvents {
  // Outgoing
  'chat:join': (threadId: string) => void
  'chat:leave': (threadId: string) => void
  'chat:message': (data: { threadId: string; content: string }) => void
  'chat:typing': (data: { threadId: string; isTyping: boolean }) => void
  'chat:read': (data: { threadId: string; messageId: string }) => void
  
  // Incoming
  'chat:message:new': (message: Message) => void
  'chat:typing:update': (data: TypingIndicator) => void
  'chat:presence:update': (data: UserPresence) => void
  'chat:thread:updated': (thread: Thread) => void
  'chat:call:start': (call: CallLog) => void
  'chat:call:end': (call: CallLog) => void
}

export interface ChatApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface SendMessagePayload {
  threadId: string
  content: string
  type?: 'text' | 'file' | 'image'
  attachments?: File[]
}

export interface CreateThreadPayload {
  title?: string
  memberIds: number[]
  type?: 'direct' | 'group'
}

export interface InitiateCallPayload {
  threadId: string
  callType: 'audio' | 'video'
}
