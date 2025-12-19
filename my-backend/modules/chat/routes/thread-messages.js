/**
 * =====================================================
 * THREAD MESSAGES API ROUTES
 * =====================================================
 * Handle thread messaging with database persistence
 * =====================================================
 */

const express = require('express');
const router = express.Router();
const messageService = require('../services/messageService');
const { authenticate } = require('../../../middleware/auth');
const { getPrisma } = require('../../../lib/prisma');
const { v4: uuidv4 } = require('uuid');

const prisma = getPrisma();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get the integer user ID for chat/thread operations.
 * Thread/ThreadMember tables use Int for createdById/userId,
 * but User.id is now UUID. Use legacy_id if available.
 */
function getChatUserId(req) {
  // Prefer legacy_id (Int) if available
  if (req.user.legacy_id) {
    return req.user.legacy_id;
  }
  // Try parsing UUID as int (will fail for real UUIDs, returns NaN)
  const parsed = parseInt(req.user.id);
  if (!isNaN(parsed)) {
    return parsed;
  }
  // Fallback - should not reach here in production
  console.warn('[getChatUserId] No valid integer ID found for user:', req.user.email);
  return 0;
}

// ==================== THREADS ====================

/**
 * GET /api/chat/threads
 * Get all threads for the current user
 */
router.get('/threads', async (req, res) => {
  try {
    const userId = getChatUserId(req);

    // Get threads where user is a member or creator
    const threads = await prisma.thread.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isActive: true
          }
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // Format the response with unread counts
    const formattedThreads = await Promise.all(threads.map(async (thread) => {
      // Count unread messages for this user in this thread
      let unreadCount = 0;
      try {
        // Find the user's last sent message in this thread
        const lastUserMessage = await prisma.threadMessage.findFirst({
          where: {
            threadId: thread.id,
            senderId: userId
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });
        
        // Count messages from others after the user's last message
        unreadCount = await prisma.threadMessage.count({
          where: {
            threadId: thread.id,
            senderId: { not: userId },
            createdAt: { gt: lastUserMessage?.createdAt || new Date(0) }
          }
        });
      } catch (e) {
        console.warn('[Threads] Failed to get unread count:', e.message);
      }
      
      return {
        id: thread.id,
        title: thread.title,
        createdById: thread.createdById,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        members: thread.members.map(m => ({
          id: m.id,
          odUserId: m.userId,
          role: m.role,
          isActive: m.isActive
        })),
        lastMessage: thread.messages[0] || null,
        unreadCount
      };
    }));

    res.json({
      success: true,
      data: formattedThreads
    });
  } catch (error) {
    console.error('[Threads] Error fetching threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threads',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/threads/:threadId
 * Get a specific thread
 */
router.get('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = getChatUserId(req);

    const thread = await prisma.thread.findFirst({
      where: {
        id: threadId,
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    if (!thread) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
    }

    res.json({
      success: true,
      data: {
        id: thread.id,
        title: thread.title,
        createdById: thread.createdById,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        members: thread.members.map(m => ({
          id: m.id,
          odUserId: m.userId,
          role: m.role,
          isActive: m.isActive
        }))
      }
    });
  } catch (error) {
    console.error('[Threads] Error fetching thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch thread'
    });
  }
});

/**
 * POST /api/chat/threads
 * Create a new thread
 */
router.post('/threads', async (req, res) => {
  try {
    const { title, memberIds = [] } = req.body;
    const userId = getChatUserId(req);

    // Create thread with creator as member
    const thread = await prisma.thread.create({
      data: {
        id: uuidv4(),
        title: title || 'New Chat',
        createdById: userId,
        members: {
          create: [
            { userId: userId },
            ...memberIds.filter(id => id !== userId).map(id => ({ userId: id }))
          ]
        }
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: thread.id,
        title: thread.title,
        createdById: thread.createdById,
        createdAt: thread.createdAt,
        updatedAt: thread.updatedAt,
        members: thread.members.map(m => ({
          id: m.id,
          odUserId: m.userId,
          role: m.role,
          isActive: m.isActive
        }))
      }
    });
  } catch (error) {
    console.error('[Threads] Error creating thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create thread'
    });
  }
});

/**
 * PUT /api/chat/threads/:threadId
 * Update a thread
 */
router.put('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { title } = req.body;
    const userId = getChatUserId(req);

    // Check ownership
    const existing = await prisma.thread.findFirst({
      where: { id: threadId, createdById: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found or access denied'
      });
    }

    const thread = await prisma.thread.update({
      where: { id: threadId },
      data: { title }
    });

    res.json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('[Threads] Error updating thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update thread'
    });
  }
});

/**
 * DELETE /api/chat/threads/:threadId
 * Delete a thread
 */
router.delete('/threads/:threadId', async (req, res) => {
  try {
    const { threadId } = req.params;
    const userId = getChatUserId(req);

    // Check ownership
    const existing = await prisma.thread.findFirst({
      where: { id: threadId, createdById: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found or access denied'
      });
    }

    await prisma.thread.delete({
      where: { id: threadId }
    });

    res.json({
      success: true,
      message: 'Thread deleted'
    });
  } catch (error) {
    console.error('[Threads] Error deleting thread:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete thread'
    });
  }
});

/**
 * POST /api/chat/threads/:threadId/members
 * Add members to a thread
 */
router.post('/threads/:threadId/members', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { memberIds } = req.body;
    const userId = getChatUserId(req);

    // Check ownership or membership
    const existing = await prisma.thread.findFirst({
      where: {
        id: threadId,
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found or access denied'
      });
    }

    // Add new members
    await prisma.threadMember.createMany({
      data: memberIds.map(id => ({ threadId, userId: id })),
      skipDuplicates: true
    });

    const thread = await prisma.thread.findUnique({
      where: { id: threadId },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isActive: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: thread
    });
  } catch (error) {
    console.error('[Threads] Error adding members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add members'
    });
  }
});

/**
 * DELETE /api/chat/threads/:threadId/members/:userId
 * Remove a member from a thread
 */
router.delete('/threads/:threadId/members/:memberId', async (req, res) => {
  try {
    const { threadId, memberId } = req.params;
    const userId = getChatUserId(req);

    // Check ownership
    const existing = await prisma.thread.findFirst({
      where: { id: threadId, createdById: userId }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found or access denied'
      });
    }

    await prisma.threadMember.deleteMany({
      where: { threadId, userId: parseInt(memberId) }
    });

    res.json({
      success: true,
      message: 'Member removed'
    });
  } catch (error) {
    console.error('[Threads] Error removing member:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove member'
    });
  }
});

// ==================== MESSAGES ====================

/**
 * GET /api/chat/threads/:threadId/messages
 * Get messages for a specific thread
 */
router.get('/threads/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const includeDeleted = req.query.includeDeleted === 'true';

    const result = await messageService.getThreadMessages(threadId, {
      limit,
      offset,
      includeDeleted
    });

    res.json(result);
  } catch (error) {
    console.error('[Messages] Error fetching messages:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      message: error.message 
    });
  }
});

/**
 * POST /api/chat/threads/:threadId/messages
 * Send a new message in a thread
 */
router.post('/threads/:threadId/messages', async (req, res) => {
  try {
    const { threadId } = req.params;
    const { content, type, attachments, replyToId } = req.body;
    const senderId = req.user.id;

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        error: 'Message content is required' 
      });
    }

    const message = await messageService.createMessage({
      threadId,
      senderId,
      content: content.trim(),
      type: type || 'text',
      attachments,
      replyToId
    });

    // Emit real-time event if socket.io is available
    const io = req.app.get('io');
    if (io) {
      const chatNamespace = io.of('/chat');
      
      // Emit to the thread room (for users who have joined the thread)
      chatNamespace.to(`thread:${threadId}`).emit('chat:message:new', {
        threadId,
        message
      });
      console.log(`[Socket] Emitting message to thread:${threadId}`);
      
      // ALSO emit to individual user rooms for ALL thread members
      // This ensures users receive messages even if they haven't joined the thread room yet
      try {
        const threadMembers = await prisma.threadMember.findMany({
          where: { threadId },
          select: { userId: true }
        });
        
        // Calculate unread counts for each member and emit with message
        for (const member of threadMembers) {
          // Don't emit to sender (they already have the message locally)
          if (member.userId !== senderId) {
            // Get unread count for this user in this thread
            let unreadCount = 0;
            try {
              unreadCount = await prisma.message.count({
                where: {
                  threadId,
                  senderId: { not: member.userId },
                  createdAt: {
                    gt: (await prisma.threadMember.findUnique({
                      where: {
                        threadId_userId: { threadId, userId: member.userId }
                      },
                      select: { lastReadAt: true }
                    }))?.lastReadAt || new Date(0)
                  }
                }
              });
            } catch (countErr) {
              console.warn(`[Socket] Could not calculate unread count for user ${member.userId}:`, countErr.message);
            }
            
            const userRoom = `user:${String(member.userId)}`;
            chatNamespace.to(userRoom).emit('chat:message:new', {
              threadId,
              message,
              unreadCount // Include unread count in payload
            });
            console.log(`[Socket] Emitting message to user room: ${userRoom} (unread: ${unreadCount})`);
          }
        }
      } catch (memberErr) {
        console.error('[Socket] Error fetching thread members for broadcast:', memberErr);
        // Continue - the thread room broadcast already happened
      }
    }

    res.status(201).json(message);
  } catch (error) {
    console.error('[Messages] Error creating message:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      message: error.message 
    });
  }
});

/**
 * PUT /api/chat/messages/:messageId
 * Edit a message
 */
router.put('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = getChatUserId(req);

    if (!content || content.trim() === '') {
      return res.status(400).json({ 
        error: 'Message content is required' 
      });
    }

    const updatedMessage = await messageService.editMessage(
      messageId, 
      userId, 
      content.trim()
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io && updatedMessage.threadId) {
      const chatNamespace = io.of('/chat');
      chatNamespace.to(`thread:${updatedMessage.threadId}`).emit('chat:message:edited', {
        messageId,
        message: updatedMessage
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('[Messages] Error editing message:', error);
    const statusCode = error.message.includes('Unauthorized') ? 403 : 500;
    res.status(statusCode).json({ 
      error: 'Failed to edit message',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/chat/messages/:messageId
 * Delete a message (soft delete)
 */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = getChatUserId(req);

    await messageService.deleteMessage(messageId, userId);

    // Emit real-time event - note: we don't have threadId here easily
    const io = req.app.get('io');
    if (io) {
      // For delete, broadcast to all connections in chat namespace
      const chatNamespace = io.of('/chat');
      chatNamespace.emit('chat:message:deleted', {
        messageId
      });
    }

    res.json({ 
      success: true,
      message: 'Message deleted successfully' 
    });
  } catch (error) {
    console.error('[Messages] Error deleting message:', error);
    const statusCode = error.message.includes('Unauthorized') ? 403 : 500;
    res.status(statusCode).json({ 
      error: 'Failed to delete message',
      message: error.message 
    });
  }
});

/**
 * POST /api/chat/messages/:messageId/reactions
 * Add a reaction to a message
 */
router.post('/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = getChatUserId(req);

    if (!emoji) {
      return res.status(400).json({ 
        error: 'Emoji is required' 
      });
    }

    const updatedMessage = await messageService.addReaction(
      messageId, 
      userId, 
      emoji
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`/chat`).emit('chat:reaction:added', {
        messageId,
        userId,
        emoji
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('[Messages] Error adding reaction:', error);
    res.status(500).json({ 
      error: 'Failed to add reaction',
      message: error.message 
    });
  }
});

/**
 * DELETE /api/chat/messages/:messageId/reactions
 * Remove a reaction from a message
 */
router.delete('/messages/:messageId/reactions', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = getChatUserId(req);

    if (!emoji) {
      return res.status(400).json({ 
        error: 'Emoji is required' 
      });
    }

    const updatedMessage = await messageService.removeReaction(
      messageId, 
      userId, 
      emoji
    );

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`/chat`).emit('chat:reaction:removed', {
        messageId,
        userId,
        emoji
      });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('[Messages] Error removing reaction:', error);
    res.status(500).json({ 
      error: 'Failed to remove reaction',
      message: error.message 
    });
  }
});

/**
 * POST /api/chat/messages/read
 * Mark messages as read
 */
router.post('/messages/read', async (req, res) => {
  try {
    const { messageIds } = req.body;
    const userId = getChatUserId(req);

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ 
        error: 'messageIds array is required' 
      });
    }

    await messageService.markAsRead(messageIds, userId);

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`/chat`).emit('chat:messages:read', {
        messageIds,
        userId
      });
    }

    res.json({ 
      success: true,
      message: 'Messages marked as read' 
    });
  } catch (error) {
    console.error('[Messages] Error marking messages as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark messages as read',
      message: error.message 
    });
  }
});

/**
 * GET /api/chat/messages/search
 * Search messages across threads
 */
router.get('/messages/search', async (req, res) => {
  try {
    const { q: query, threadId, limit, offset } = req.query;

    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        error: 'Search query is required' 
      });
    }

    const messages = await messageService.searchMessages(query.trim(), {
      threadId,
      userId: null, // Search all users' messages, not just current user
      limit: parseInt(limit) || 50,
      offset: parseInt(offset) || 0
    });

    res.json({
      query,
      results: messages,
      total: messages.length
    });
  } catch (error) {
    console.error('[Messages] Error searching messages:', error);
    res.status(500).json({ 
      error: 'Failed to search messages',
      message: error.message 
    });
  }
});

// ==================== DELTA SYNC ====================

/**
 * GET /api/chat/sync
 * Delta sync - get all messages after a given message ID
 * This is the key endpoint for efficient chat sync:
 * - Frontend stores last_message_id locally
 * - On app launch, asks "give me everything after this ID"
 * - Server returns only new messages (fast and cheap)
 * 
 * Query params:
 * - since_id: Get messages created after this message ID
 * - since_time: Alternative - get messages after this timestamp (ISO string)
 * - limit: Max messages to return (default 100, max 500)
 */
router.get('/sync', async (req, res) => {
  try {
    const userId = getChatUserId(req);
    const { since_id, since_time, limit: limitParam } = req.query;
    const limit = Math.min(parseInt(limitParam) || 100, 500);

    // Get all threads the user is a member of
    const userThreads = await prisma.thread.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      select: { id: true }
    });

    const threadIds = userThreads.map(t => t.id);

    if (threadIds.length === 0) {
      return res.json({
        success: true,
        data: {
          messages: [],
          threads: [],
          syncedAt: new Date().toISOString(),
          hasMore: false
        }
      });
    }

    // Build the where clause for messages
    const messagesWhere = {
      threadId: { in: threadIds },
      isDeleted: false
    };

    // If since_id provided, get the timestamp of that message first
    if (since_id) {
      const sinceMessage = await prisma.threadMessage.findUnique({
        where: { id: since_id },
        select: { createdAt: true }
      });
      
      if (sinceMessage) {
        messagesWhere.createdAt = { gt: sinceMessage.createdAt };
      }
    } else if (since_time) {
      // Use since_time if provided
      const sinceDate = new Date(since_time);
      if (!isNaN(sinceDate.getTime())) {
        messagesWhere.createdAt = { gt: sinceDate };
      }
    }

    // Fetch new messages
    // Note: ThreadMessage.senderId is Int, no direct relation to User (UUID id)
    // Sender info must be fetched separately or cached
    const newMessages = await prisma.threadMessage.findMany({
      where: messagesWhere,
      include: {
        replyTo: {
          select: {
            id: true,
            content: true,
            senderId: true
          }
        }
      },
      orderBy: { createdAt: 'asc' },
      take: limit + 1 // Fetch one extra to check if there's more
    });

    const hasMore = newMessages.length > limit;
    const messages = hasMore ? newMessages.slice(0, limit) : newMessages;

    // Get updated thread info for threads with new messages
    const affectedThreadIds = [...new Set(messages.map(m => m.threadId))];
    
    const updatedThreads = await Promise.all(
      affectedThreadIds.map(async (threadId) => {
        const thread = await prisma.thread.findUnique({
          where: { id: threadId },
          include: {
            members: {
              select: {
                id: true,
                userId: true,
                role: true,
                isActive: true
              }
            },
            messages: {
              take: 1,
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true
              }
            }
          }
        });

        if (!thread) return null;

        // Calculate unread count for this user
        let unreadCount = 0;
        try {
          const memberRecord = await prisma.threadMember.findUnique({
            where: {
              threadId_userId: { threadId, userId: userId }
            },
            select: { lastReadAt: true }
          });

          unreadCount = await prisma.threadMessage.count({
            where: {
              threadId,
              senderId: { not: userId },
              isDeleted: false,
              createdAt: { gt: memberRecord?.lastReadAt || new Date(0) }
            }
          });
        } catch (e) {
          console.warn('[Sync] Failed to get unread count:', e.message);
        }

        return {
          id: thread.id,
          title: thread.title,
          createdById: thread.createdById,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          // Member IDs only - client should cache user info separately
          members: thread.members.map(m => ({
            id: m.id,
            odUserId: m.userId,
            role: m.role,
            isActive: m.isActive
          })),
          lastMessage: thread.messages[0] || null,
          unreadCount
        };
      })
    );

    res.json({
      success: true,
      data: {
        messages,
        threads: updatedThreads.filter(Boolean),
        syncedAt: new Date().toISOString(),
        hasMore,
        // Include the last message ID for next sync
        lastMessageId: messages.length > 0 ? messages[messages.length - 1].id : since_id || null
      }
    });
  } catch (error) {
    console.error('[Sync] Error syncing messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync messages',
      message: error.message
    });
  }
});

/**
 * GET /api/chat/sync/initial
 * Initial sync - get threads with their last N messages for first load
 * Used when user has no local data (fresh install/cleared cache)
 */
router.get('/sync/initial', async (req, res) => {
  try {
    const userId = getChatUserId(req);
    const messagesPerThread = Math.min(parseInt(req.query.messages_per_thread) || 20, 50);

    // Get all threads for user with members
    const threads = await prisma.thread.findMany({
      where: {
        OR: [
          { createdById: userId },
          { members: { some: { userId: userId } } }
        ]
      },
      include: {
        members: {
          select: {
            id: true,
            userId: true,
            role: true,
            isActive: true
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    // For each thread, get recent messages and unread count
    const threadsWithMessages = await Promise.all(
      threads.map(async (thread) => {
        const messages = await prisma.threadMessage.findMany({
          where: {
            threadId: thread.id,
            isDeleted: false
          },
          include: {
            replyTo: {
              select: {
                id: true,
                content: true,
                senderId: true
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          take: messagesPerThread
        });

        // Calculate unread count
        let unreadCount = 0;
        try {
          const memberRecord = await prisma.threadMember.findUnique({
            where: {
              threadId_userId: { threadId: thread.id, userId }
            },
            select: { lastReadAt: true }
          });

          unreadCount = await prisma.threadMessage.count({
            where: {
              threadId: thread.id,
              senderId: { not: userId },
              isDeleted: false,
              createdAt: { gt: memberRecord?.lastReadAt || new Date(0) }
            }
          });
        } catch (e) {
          console.warn('[Sync] Failed to get unread count:', e.message);
        }

        return {
          id: thread.id,
          title: thread.title,
          createdById: thread.createdById,
          createdAt: thread.createdAt,
          updatedAt: thread.updatedAt,
          members: thread.members.map(m => ({
            id: m.id,
            odUserId: m.userId,
            role: m.role,
            isActive: m.isActive
          })),
          lastMessage: messages[0] || null,
          unreadCount,
          messages: messages.reverse() // Return in chronological order
        };
      })
    );

    res.json({
      success: true,
      data: {
        threads: threadsWithMessages,
        syncedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('[Sync] Error initial sync:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform initial sync',
      message: error.message
    });
  }
});

module.exports = router;
