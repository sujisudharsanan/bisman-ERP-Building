/**
 * =====================================================
 * CHAT STORE - IndexedDB Persistence Layer
 * =====================================================
 * Uses localforage for IndexedDB storage with localStorage fallback.
 * This is the "database in the browser" - chat data persists across refreshes.
 * 
 * Key concepts:
 * - Messages/threads are saved locally for instant load (0ms)
 * - Last sync timestamp is tracked for delta sync
 * - Unread counts persist across sessions
 * =====================================================
 */

import localforage from 'localforage';

// Initialize localforage with a dedicated database
const chatDB = localforage.createInstance({
  name: 'bisman-chat',
  storeName: 'chat_data',
  description: 'Chat messages and threads cache'
});

const syncDB = localforage.createInstance({
  name: 'bisman-chat',
  storeName: 'sync_meta',
  description: 'Sync metadata and timestamps'
});

// ==================== TYPES ====================

export interface StoredMessage {
  id: string;
  threadId: string;
  senderId: number;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  createdAt: string;
  updatedAt?: string;
  sender: {
    id: number;
    username: string;
    email?: string;
    profile_pic_url?: string;
    role?: string;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: { id: number; username: string };
  } | null;
  attachments?: any[];
  reactions?: any[];
}

export interface StoredThread {
  id: string;
  title?: string;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  members: {
    id: number;
    username: string;
    email?: string;
    profilePic?: string;
  }[];
  lastMessage?: {
    id: string;
    content: string;
    createdAt: string;
    senderId?: number;
  } | null;
  unreadCount: number;
}

export interface SyncMeta {
  lastSyncAt: string | null;
  lastMessageId: string | null;
  version: number;
}

// ==================== MESSAGES ====================

/**
 * Get all messages for a thread from local storage
 */
export async function getLocalMessages(threadId: string): Promise<StoredMessage[]> {
  try {
    const key = `messages:${threadId}`;
    const messages = await chatDB.getItem<StoredMessage[]>(key);
    return messages || [];
  } catch (error) {
    console.error('[ChatStore] Error getting local messages:', error);
    return [];
  }
}

/**
 * Save messages to local storage (appends new, updates existing)
 */
export async function saveMessages(threadId: string, newMessages: StoredMessage[]): Promise<void> {
  try {
    const key = `messages:${threadId}`;
    const existing = await chatDB.getItem<StoredMessage[]>(key) || [];
    
    // Create a map for quick lookup
    const messageMap = new Map(existing.map(m => [m.id, m]));
    
    // Add or update messages
    for (const msg of newMessages) {
      messageMap.set(msg.id, msg);
    }
    
    // Convert back to array, sorted by createdAt
    const allMessages = Array.from(messageMap.values()).sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    
    // Keep only last 500 messages per thread to prevent bloat
    const trimmed = allMessages.slice(-500);
    
    await chatDB.setItem(key, trimmed);
  } catch (error) {
    console.error('[ChatStore] Error saving messages:', error);
  }
}

/**
 * Add a single message (for real-time updates)
 */
export async function addMessage(threadId: string, message: StoredMessage): Promise<void> {
  await saveMessages(threadId, [message]);
}

/**
 * Delete a message locally
 */
export async function deleteMessage(threadId: string, messageId: string): Promise<void> {
  try {
    const key = `messages:${threadId}`;
    const messages = await chatDB.getItem<StoredMessage[]>(key) || [];
    const filtered = messages.filter(m => m.id !== messageId);
    await chatDB.setItem(key, filtered);
  } catch (error) {
    console.error('[ChatStore] Error deleting message:', error);
  }
}

// ==================== THREADS ====================

/**
 * Get all threads from local storage
 */
export async function getLocalThreads(): Promise<StoredThread[]> {
  try {
    const threads = await chatDB.getItem<StoredThread[]>('threads');
    return threads || [];
  } catch (error) {
    console.error('[ChatStore] Error getting local threads:', error);
    return [];
  }
}

/**
 * Save/update threads to local storage
 */
export async function saveThreads(newThreads: StoredThread[]): Promise<void> {
  try {
    const existing = await chatDB.getItem<StoredThread[]>('threads') || [];
    const threadMap = new Map(existing.map(t => [t.id, t]));
    
    for (const thread of newThreads) {
      threadMap.set(thread.id, thread);
    }
    
    // Sort by updatedAt (most recent first)
    const allThreads = Array.from(threadMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    
    await chatDB.setItem('threads', allThreads);
  } catch (error) {
    console.error('[ChatStore] Error saving threads:', error);
  }
}

/**
 * Update a single thread
 */
export async function updateThread(thread: StoredThread): Promise<void> {
  await saveThreads([thread]);
}

/**
 * Update thread's last message and unread count
 */
export async function updateThreadLastMessage(
  threadId: string, 
  lastMessage: StoredThread['lastMessage'],
  incrementUnread: boolean = false
): Promise<void> {
  try {
    const threads = await getLocalThreads();
    const threadIndex = threads.findIndex(t => t.id === threadId);
    
    if (threadIndex >= 0) {
      threads[threadIndex].lastMessage = lastMessage;
      threads[threadIndex].updatedAt = new Date().toISOString();
      if (incrementUnread) {
        threads[threadIndex].unreadCount = (threads[threadIndex].unreadCount || 0) + 1;
      }
      await chatDB.setItem('threads', threads);
    }
  } catch (error) {
    console.error('[ChatStore] Error updating thread last message:', error);
  }
}

/**
 * Reset unread count for a thread
 */
export async function clearThreadUnread(threadId: string): Promise<void> {
  try {
    const threads = await getLocalThreads();
    const threadIndex = threads.findIndex(t => t.id === threadId);
    
    if (threadIndex >= 0) {
      threads[threadIndex].unreadCount = 0;
      await chatDB.setItem('threads', threads);
    }
  } catch (error) {
    console.error('[ChatStore] Error clearing thread unread:', error);
  }
}

// ==================== UNREAD COUNTS ====================

/**
 * Get all unread counts (threadId -> count)
 */
export async function getUnreadCounts(): Promise<Record<string, number>> {
  try {
    const threads = await getLocalThreads();
    const counts: Record<string, number> = {};
    for (const thread of threads) {
      if (thread.unreadCount > 0) {
        counts[thread.id] = thread.unreadCount;
      }
    }
    return counts;
  } catch (error) {
    console.error('[ChatStore] Error getting unread counts:', error);
    return {};
  }
}

/**
 * Get total unread count across all threads
 */
export async function getTotalUnreadCount(): Promise<number> {
  const counts = await getUnreadCounts();
  return Object.values(counts).reduce((sum, count) => sum + count, 0);
}

// ==================== SYNC METADATA ====================

const DEFAULT_SYNC_META: SyncMeta = {
  lastSyncAt: null,
  lastMessageId: null,
  version: 1
};

/**
 * Get sync metadata
 */
export async function getSyncMeta(): Promise<SyncMeta> {
  try {
    const meta = await syncDB.getItem<SyncMeta>('sync_meta');
    return meta || DEFAULT_SYNC_META;
  } catch (error) {
    console.error('[ChatStore] Error getting sync meta:', error);
    return DEFAULT_SYNC_META;
  }
}

/**
 * Update sync metadata after successful sync
 */
export async function updateSyncMeta(updates: Partial<SyncMeta>): Promise<void> {
  try {
    const current = await getSyncMeta();
    await syncDB.setItem('sync_meta', { ...current, ...updates });
  } catch (error) {
    console.error('[ChatStore] Error updating sync meta:', error);
  }
}

// ==================== UTILITIES ====================

/**
 * Clear all chat data (for logout)
 */
export async function clearAllChatData(): Promise<void> {
  try {
    await chatDB.clear();
    await syncDB.clear();
    console.log('[ChatStore] All chat data cleared');
  } catch (error) {
    console.error('[ChatStore] Error clearing chat data:', error);
  }
}

/**
 * Check if we have any local data (for initial vs delta sync decision)
 */
export async function hasLocalData(): Promise<boolean> {
  try {
    const meta = await getSyncMeta();
    return meta.lastSyncAt !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get storage stats for debugging
 */
export async function getStorageStats(): Promise<{
  threadsCount: number;
  messageThreads: number;
  lastSync: string | null;
}> {
  try {
    const threads = await getLocalThreads();
    const keys = await chatDB.keys();
    const messageKeys = keys.filter(k => k.startsWith('messages:'));
    const meta = await getSyncMeta();
    
    return {
      threadsCount: threads.length,
      messageThreads: messageKeys.length,
      lastSync: meta.lastSyncAt
    };
  } catch (error) {
    return {
      threadsCount: 0,
      messageThreads: 0,
      lastSync: null
    };
  }
}

export default {
  // Messages
  getLocalMessages,
  saveMessages,
  addMessage,
  deleteMessage,
  
  // Threads
  getLocalThreads,
  saveThreads,
  updateThread,
  updateThreadLastMessage,
  clearThreadUnread,
  
  // Unread
  getUnreadCounts,
  getTotalUnreadCount,
  
  // Sync
  getSyncMeta,
  updateSyncMeta,
  hasLocalData,
  
  // Utilities
  clearAllChatData,
  getStorageStats
};
