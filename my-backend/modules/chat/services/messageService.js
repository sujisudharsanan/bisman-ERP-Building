/**
 * Chat Messages Service
 * Handles CRUD operations for thread messages
 */

const { getPrisma } = require('../../../lib/prisma');
const prisma = getPrisma();

/**
 * Helper to fetch sender info by legacy_id (INT in chat tables, STRING in users_enhanced)
 */
async function getSenderInfo(senderId) {
  if (!senderId) return null;
  // legacy_id is stored as string in users_enhanced
  const user = await prisma.users_enhanced.findFirst({
    where: { legacy_id: String(senderId) },
    select: {
      id: true,
      username: true,
      email: true,
      profile_pic_url: true,
      role: true,
      first_name: true,
      last_name: true,
      legacy_id: true
    }
  });
  return user;
}

/**
 * Enrich messages with sender data
 */
async function enrichMessagesWithSenders(messages) {
  // Collect unique sender IDs (as strings for lookup)
  const senderIds = [...new Set(messages.map(m => String(m.senderId)).filter(Boolean))];
  
  // Fetch all senders at once
  const senders = await prisma.users_enhanced.findMany({
    where: { legacy_id: { in: senderIds } },
    select: {
      id: true,
      legacy_id: true,
      username: true,
      email: true,
      profile_pic_url: true,
      role: true,
      first_name: true,
      last_name: true
    }
  });
  
  // Create lookup map by legacy_id (string)
  const senderMap = {};
  senders.forEach(s => { senderMap[s.legacy_id] = s; });
  
  // Attach sender to each message (convert senderId to string for lookup)
  return messages.map(m => ({
    ...m,
    sender: senderMap[String(m.senderId)] || null
  }));
}

/**
 * Get messages for a thread with pagination
 */
async function getThreadMessages(threadId, options = {}) {
  const {
    limit = 50,
    offset = 0,
    includeDeleted = false
  } = options;

  const where = {
    threadId,
    ...(includeDeleted ? {} : { isDeleted: false })
  };

  const [messages, total] = await Promise.all([
    prisma.thread_messages.findMany({
      where,
      include: {
        thread_messages: {  // replyTo
          select: {
            id: true,
            content: true,
            senderId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    }),
    prisma.thread_messages.count({ where })
  ]);

  // Enrich with sender data
  const enrichedMessages = await enrichMessagesWithSenders(messages);
  
  // Also enrich reply sender if exists
  for (const msg of enrichedMessages) {
    if (msg.thread_messages?.senderId) {
      msg.replyTo = {
        id: msg.thread_messages.id,
        content: msg.thread_messages.content,
        sender: await getSenderInfo(msg.thread_messages.senderId)
      };
    }
    delete msg.thread_messages;  // Clean up
  }

  return {
    messages: enrichedMessages.reverse(), // Return in chronological order
    total,
    hasMore: offset + limit < total
  };
}

/**
 * Create a new message in a thread
 */
async function createMessage(data) {
  const {
    threadId,
    senderId,
    content,
    type = 'text',
    attachments = null,
    replyToId = null
  } = data;

  const message = await prisma.thread_messages.create({
    data: {
      threadId,
      senderId,
      content,
      type,
      attachments,
      replyToId
    }
  });

  // Fetch sender info
  const sender = await getSenderInfo(senderId);
  
  // Fetch replyTo if exists
  let replyTo = null;
  if (replyToId) {
    const replyMsg = await prisma.thread_messages.findUnique({
      where: { id: replyToId },
      select: { id: true, content: true, senderId: true }
    });
    if (replyMsg) {
      replyTo = {
        id: replyMsg.id,
        content: replyMsg.content,
        sender: await getSenderInfo(replyMsg.senderId)
      };
    }
  }

  // Update thread's updatedAt timestamp
  await prisma.threads.update({
    where: { id: threadId },
    data: { updatedAt: new Date() }
  });

  return { ...message, sender, replyTo };
}

/**
 * Edit a message
 */
async function editMessage(messageId, userId, newContent) {
  // Verify ownership
  const message = await prisma.thread_messages.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId !== userId) {
    throw new Error('Unauthorized: You can only edit your own messages');
  }

  if (message.isDeleted) {
    throw new Error('Cannot edit deleted message');
  }

  const updated = await prisma.thread_messages.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
      updatedAt: new Date()
    }
  });
  
  // Fetch sender info
  const sender = await getSenderInfo(updated.senderId);
  return { ...updated, sender };
}

/**
 * Delete a message (soft delete)
 */
async function deleteMessage(messageId, userId) {
  // Verify ownership
  const message = await prisma.thread_messages.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId !== userId) {
    throw new Error('Unauthorized: You can only delete your own messages');
  }

  return await prisma.thread_messages.update({
    where: { id: messageId },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      updatedAt: new Date()
    }
  });
}

/**
 * Add a reaction to a message
 */
async function addReaction(messageId, userId, emoji) {
  const message = await prisma.thread_messages.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const reactions = message.reactions || [];
  
  // Check if user already reacted with this emoji
  const existingReaction = reactions.find(
    r => r.userId === userId && r.emoji === emoji
  );

  if (existingReaction) {
    return message; // Already reacted
  }

  reactions.push({
    emoji,
    userId,
    createdAt: new Date().toISOString()
  });

  return await prisma.thread_messages.update({
    where: { id: messageId },
    data: {
      reactions,
      updatedAt: new Date()
    }
  });
}

/**
 * Remove a reaction from a message
 */
async function removeReaction(messageId, userId, emoji) {
  const message = await prisma.thread_messages.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const reactions = message.reactions || [];
  const updatedReactions = reactions.filter(
    r => !(r.userId === userId && r.emoji === emoji)
  );

  return await prisma.thread_messages.update({
    where: { id: messageId },
    data: {
      reactions: updatedReactions,
      updatedAt: new Date()
    }
  });
}

/**
 * Mark messages as read by a user
 */
async function markAsRead(messageIds, userId) {
  const messages = await prisma.thread_messages.findMany({
    where: {
      id: { in: messageIds }
    }
  });

  const updates = messages.map(message => {
    const readBy = message.readBy || [];
    
    // Check if already marked as read
    const alreadyRead = readBy.find(r => r.userId === userId);
    if (alreadyRead) {
      return null; // Skip
    }

    readBy.push({
      userId,
      readAt: new Date().toISOString()
    });

    return prisma.thread_messages.update({
      where: { id: message.id },
      data: {
        readBy,
        updatedAt: new Date()
      }
    });
  }).filter(Boolean);

  return await Promise.all(updates);
}

/**
 * Search messages in threads
 */
async function searchMessages(query, options = {}) {
  const {
    threadId = null,
    userId = null,
    limit = 50,
    offset = 0
  } = options;

  const where = {
    content: {
      contains: query,
      mode: 'insensitive'
    },
    isDeleted: false,
    ...(threadId && { threadId }),
    ...(userId && { senderId: userId })
  };

  const messages = await prisma.thread_messages.findMany({
    where,
    include: {
      threads: {
        select: {
          id: true,
          title: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: limit,
    skip: offset
  });

  // Enrich with sender data
  const enrichedMessages = await enrichMessagesWithSenders(messages);
  
  return enrichedMessages;
}

module.exports = {
  getThreadMessages,
  createMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
  markAsRead,
  searchMessages
};
