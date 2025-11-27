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

// Apply authentication to all routes
router.use(authenticate);

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
      io.to(`/chat`).emit('chat:message', {
        threadId,
        message
      });
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
    if (io) {
      io.to(`/chat`).emit('chat:message:edited', {
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

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`/chat`).emit('chat:message:deleted', {
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
