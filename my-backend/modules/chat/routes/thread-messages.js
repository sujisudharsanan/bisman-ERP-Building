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

// ==================== THREADS ====================

/**
 * GET /api/chat/threads
 * Get all threads for the current user
 */
router.get('/threads', async (req, res) => {
  try {
    const userId = req.user.id;

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
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile_pic_url: true
              }
            }
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

    // Format the response
    const formattedThreads = threads.map(thread => ({
      id: thread.id,
      title: thread.title,
      createdById: thread.createdById,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
      members: thread.members.map(m => ({
        id: m.user.id,
        username: m.user.username,
        email: m.user.email,
        profilePic: m.user.profile_pic_url
      })),
      lastMessage: thread.messages[0] || null
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
    const userId = req.user.id;

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
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile_pic_url: true
              }
            }
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
          id: m.user.id,
          username: m.user.username,
          email: m.user.email,
          profilePic: m.user.profile_pic_url
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
    const userId = req.user.id;

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
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile_pic_url: true
              }
            }
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
          id: m.user.id,
          username: m.user.username,
          email: m.user.email,
          profilePic: m.user.profile_pic_url
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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                profile_pic_url: true
              }
            }
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
    const userId = req.user.id;

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
      // Emit to the chat namespace's thread room
      const chatNamespace = io.of('/chat');
      chatNamespace.to(`thread:${threadId}`).emit('chat:message:new', {
        threadId,
        message
      });
      console.log(`[Socket] Emitting message to thread:${threadId}`);
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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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
    const userId = req.user.id;

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

module.exports = router;
