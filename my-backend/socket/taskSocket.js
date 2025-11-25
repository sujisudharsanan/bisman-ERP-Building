/**
 * Socket.IO Task Event Handlers
 * Manages real-time task updates and notifications
 */

const jwt = require('jsonwebtoken');

/**
 * Initialize Socket.IO for task management
 */
const initializeTaskSocket = (io) => {
  // Authentication middleware for Socket.IO
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.username = decoded.username;
      
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.username} (ID: ${socket.userId})`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join task-specific rooms when user requests
    socket.on('task:join', (taskId) => {
      socket.join(`task:${taskId}`);
      console.log(`User ${socket.username} joined task room: ${taskId}`);
    });

    // Leave task room
    socket.on('task:leave', (taskId) => {
      socket.leave(`task:${taskId}`);
      console.log(`User ${socket.username} left task room: ${taskId}`);
    });

    // Typing indicator for task messages
    socket.on('task:typing', ({ taskId, isTyping }) => {
      socket.to(`task:${taskId}`).emit('task:user_typing', {
        taskId,
        userId: socket.userId,
        username: socket.username,
        isTyping
      });
    });

    // Mark user as online
    socket.on('user:online', () => {
      socket.broadcast.emit('user:status_changed', {
        userId: socket.userId,
        username: socket.username,
        status: 'online'
      });
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.username}`);
      
      socket.broadcast.emit('user:status_changed', {
        userId: socket.userId,
        username: socket.username,
        status: 'offline'
      });
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.username}:`, error);
    });
  });

  return io;
};

/**
 * Emit task created event
 */
const emitTaskCreated = (io, task, creatorId) => {
  // Emit to task creator
  io.to(`user:${creatorId}`).emit('task:created', { task, userId: creatorId });
  
  // Emit to assignee
  if (task.assignee_id && task.assignee_id !== creatorId) {
    io.to(`user:${task.assignee_id}`).emit('task:created', { task, userId: creatorId });
  }
  
  // Emit to approver
  if (task.approver_id && task.approver_id !== creatorId && task.approver_id !== task.assignee_id) {
    io.to(`user:${task.approver_id}`).emit('task:created', { task, userId: creatorId });
  }
};

/**
 * Emit task updated event
 */
const emitTaskUpdated = (io, task, updaterId) => {
  // Emit to task room (all participants)
  io.to(`task:${task.id}`).emit('task:updated', { task, userId: updaterId });
  
  // Also emit to specific users if they're not in the room
  io.to(`user:${task.creator_id}`).emit('task:updated', { task, userId: updaterId });
  io.to(`user:${task.assignee_id}`).emit('task:updated', { task, userId: updaterId });
  if (task.approver_id) {
    io.to(`user:${task.approver_id}`).emit('task:updated', { task, userId: updaterId });
  }
};

/**
 * Emit task deleted event
 */
const emitTaskDeleted = (io, taskId, deleterId) => {
  io.to(`task:${taskId}`).emit('task:deleted', { taskId, userId: deleterId });
};

/**
 * Emit new message event
 */
const emitTaskMessage = (io, taskId, message, senderId) => {
  io.to(`task:${taskId}`).emit('task:message', { taskId, message, userId: senderId });
};

/**
 * Emit message updated event
 */
const emitMessageUpdated = (io, taskId, messageId, updaterId) => {
  io.to(`task:${taskId}`).emit('task:message:updated', { taskId, messageId, userId: updaterId });
};

/**
 * Emit message deleted event
 */
const emitMessageDeleted = (io, taskId, messageId, deleterId) => {
  io.to(`task:${taskId}`).emit('task:message:deleted', { taskId, messageId, userId: deleterId });
};

/**
 * Emit status changed event
 */
const emitStatusChanged = (io, task, changerId) => {
  io.to(`task:${task.id}`).emit('task:status_changed', { task, userId: changerId });
  
  // Notify specific users
  io.to(`user:${task.creator_id}`).emit('task:status_changed', { task, userId: changerId });
  io.to(`user:${task.assignee_id}`).emit('task:status_changed', { task, userId: changerId });
  if (task.approver_id) {
    io.to(`user:${task.approver_id}`).emit('task:status_changed', { task, userId: changerId });
  }
};

/**
 * Emit task approved event
 */
const emitTaskApproved = (io, task, approverId) => {
  io.to(`task:${task.id}`).emit('task:approved', { task, userId: approverId });
  io.to(`user:${task.creator_id}`).emit('task:approved', { task, userId: approverId });
  io.to(`user:${task.assignee_id}`).emit('task:approved', { task, userId: approverId });
};

/**
 * Emit task rejected event
 */
const emitTaskRejected = (io, task, rejecterId, reason) => {
  io.to(`task:${task.id}`).emit('task:rejected', { task, userId: rejecterId, reason });
  io.to(`user:${task.creator_id}`).emit('task:rejected', { task, userId: rejecterId, reason });
  io.to(`user:${task.assignee_id}`).emit('task:rejected', { task, userId: rejecterId, reason });
};

/**
 * Emit task reassigned event
 */
const emitTaskReassigned = (io, task, reassignerId, oldAssigneeId, newAssigneeId) => {
  io.to(`task:${task.id}`).emit('task:reassigned', { task, userId: reassignerId, oldAssigneeId, newAssigneeId });
  io.to(`user:${oldAssigneeId}`).emit('task:reassigned', { task, userId: reassignerId, oldAssigneeId, newAssigneeId });
  io.to(`user:${newAssigneeId}`).emit('task:reassigned', { task, userId: reassignerId, oldAssigneeId, newAssigneeId });
};

/**
 * Emit attachments added event
 */
const emitAttachmentsAdded = (io, taskId, attachments, uploaderId) => {
  io.to(`task:${taskId}`).emit('task:attachments:added', { taskId, attachments, userId: uploaderId });
};

/**
 * Emit attachment deleted event
 */
const emitAttachmentDeleted = (io, taskId, attachmentId, deleterId) => {
  io.to(`task:${taskId}`).emit('task:attachment:deleted', { taskId, attachmentId, userId: deleterId });
};

/**
 * Emit bulk tasks updated event
 */
const emitBulkTasksUpdated = (io, taskIds, updates, updaterId) => {
  io.emit('tasks:bulk_updated', { taskIds, updates, userId: updaterId });
};

/**
 * Emit bulk tasks deleted event
 */
const emitBulkTasksDeleted = (io, taskIds, deleterId) => {
  io.emit('tasks:bulk_deleted', { taskIds, userId: deleterId });
};

module.exports = {
  initializeTaskSocket,
  emitTaskCreated,
  emitTaskUpdated,
  emitTaskDeleted,
  emitTaskMessage,
  emitMessageUpdated,
  emitMessageDeleted,
  emitStatusChanged,
  emitTaskApproved,
  emitTaskRejected,
  emitTaskReassigned,
  emitAttachmentsAdded,
  emitAttachmentDeleted,
  emitBulkTasksUpdated,
  emitBulkTasksDeleted
};
