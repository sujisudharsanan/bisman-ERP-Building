/**
 * Chat Socket.IO Handlers
 * Manages real-time chat events
 */

const initializeChatSocket = (io) => {
  // Create chat namespace
  const chatNamespace = io.of('/chat');
  
  // Authentication middleware
  chatNamespace.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || 
                    socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }
      
      // Verify JWT token
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
      
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.username = decoded.username || decoded.email;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });
  
  chatNamespace.on('connection', (socket) => {
    console.log(`[Chat] User connected: ${socket.username} (ID: ${socket.userId})`);
    
    // Join user's personal room
    socket.join(`user:${socket.userId}`);
    
    // Join a thread
    socket.on('chat:join', (threadId) => {
      socket.join(`thread:${threadId}`);
      console.log(`[Chat] User ${socket.username} joined thread: ${threadId}`);
      
      // Notify others in the thread
      socket.to(`thread:${threadId}`).emit('chat:user:joined', {
        userId: socket.userId,
        username: socket.username,
        threadId
      });
    });
    
    // Leave a thread
    socket.on('chat:leave', (threadId) => {
      socket.leave(`thread:${threadId}`);
      console.log(`[Chat] User ${socket.username} left thread: ${threadId}`);
      
      // Notify others in the thread
      socket.to(`thread:${threadId}`).emit('chat:user:left', {
        userId: socket.userId,
        username: socket.username,
        threadId
      });
    });
    
    // Send message (emit to thread)
    socket.on('chat:message', async (data) => {
      const { threadId, content, type = 'text' } = data;
      
      // In a real implementation, save to database here
      const message = {
        id: `msg_${Date.now()}`,
        threadId,
        userId: socket.userId,
        content,
        type,
        createdAt: new Date(),
        user: {
          id: socket.userId,
          username: socket.username
        }
      };
      
      // Broadcast to all users in the thread
      chatNamespace.to(`thread:${threadId}`).emit('chat:message:new', message);
      
      console.log(`[Chat] Message sent by ${socket.username} in thread ${threadId}`);
    });
    
    // Typing indicator
    socket.on('chat:typing', (data) => {
      const { threadId, isTyping } = data;
      
      // Broadcast typing status to others in the thread (not to sender)
      socket.to(`thread:${threadId}`).emit('chat:typing:update', {
        userId: socket.userId,
        username: socket.username,
        threadId,
        isTyping
      });
    });
    
    // Mark message as read
    socket.on('chat:read', (data) => {
      const { threadId, messageId } = data;
      
      // Broadcast read status
      chatNamespace.to(`thread:${threadId}`).emit('chat:message:read', {
        userId: socket.userId,
        threadId,
        messageId
      });
    });
    
    // Presence updates
    socket.on('chat:presence', (status) => {
      // Update user presence and broadcast to relevant threads
      socket.broadcast.emit('chat:presence:update', {
        userId: socket.userId,
        status,
        lastSeen: new Date()
      });
    });
    
    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Chat] User ${socket.username} disconnected: ${reason}`);
      
      // Broadcast offline status
      socket.broadcast.emit('chat:presence:update', {
        userId: socket.userId,
        status: 'offline',
        lastSeen: new Date()
      });
    });
    
    // Error handling
    socket.on('error', (error) => {
      console.error(`[Chat] Socket error for user ${socket.username}:`, error);
    });
  });
  
  console.log('[Chat] ✅ Socket.IO chat handlers initialized');
  
  return chatNamespace;
};

module.exports = { initializeChatSocket };
