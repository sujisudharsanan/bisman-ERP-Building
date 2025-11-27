/**
 * Chat Messages Service
 * Handles CRUD operations for thread messages
 */

const { getPrisma } = require('../../../lib/prisma');
const prisma = getPrisma();

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
    prisma.threadMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            profile_pic_url: true,
            role: true
          }
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    }),
    prisma.threadMessage.count({ where })
  ]);

  return {
    messages: messages.reverse(), // Return in chronological order
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

  const message = await prisma.threadMessage.create({
    data: {
      threadId,
      senderId,
      content,
      type,
      attachments,
      replyToId
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          email: true,
          profile_pic_url: true,
          role: true
        }
      },
      replyTo: {
        select: {
          id: true,
          content: true,
          sender: {
            select: {
              id: true,
              username: true
            }
          }
        }
      }
    }
  });

  // Update thread's updatedAt timestamp
  await prisma.thread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() }
  });

  return message;
}

/**
 * Edit a message
 */
async function editMessage(messageId, userId, newContent) {
  // Verify ownership
  const message = await prisma.threadMessage.findUnique({
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

  return await prisma.threadMessage.update({
    where: { id: messageId },
    data: {
      content: newContent,
      isEdited: true,
      editedAt: new Date(),
      updatedAt: new Date()
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          email: true,
          profile_pic_url: true
        }
      }
    }
  });
}

/**
 * Delete a message (soft delete)
 */
async function deleteMessage(messageId, userId) {
  // Verify ownership
  const message = await prisma.threadMessage.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  if (message.senderId !== userId) {
    throw new Error('Unauthorized: You can only delete your own messages');
  }

  return await prisma.threadMessage.update({
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
  const message = await prisma.threadMessage.findUnique({
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

  return await prisma.threadMessage.update({
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
  const message = await prisma.threadMessage.findUnique({
    where: { id: messageId }
  });

  if (!message) {
    throw new Error('Message not found');
  }

  const reactions = message.reactions || [];
  const updatedReactions = reactions.filter(
    r => !(r.userId === userId && r.emoji === emoji)
  );

  return await prisma.threadMessage.update({
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
  const messages = await prisma.threadMessage.findMany({
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

    return prisma.threadMessage.update({
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

  const messages = await prisma.threadMessage.findMany({
    where,
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          email: true,
          profile_pic_url: true
        }
      },
      thread: {
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

  return messages;
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
