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
    
    // Join user's personal room (always use string for consistency)
    const userRoom = `user:${String(socket.userId)}`;
    socket.join(userRoom);
    console.log(`[Chat] User ${socket.username} joined personal room: ${userRoom}`);
    
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
    
    // ===== CALL SIGNALING =====
    
    // Initiate a call - notify the target user(s)
    socket.on('chat:call:invite', (data) => {
      const { threadId, roomName, callType, targetUserIds } = data;
      
      console.log(`[Chat] 📞 Call invite from ${socket.username} (ID: ${socket.userId})`);
      console.log(`[Chat] Target users:`, targetUserIds, `(types: ${targetUserIds?.map(id => typeof id)})`);
      console.log(`[Chat] All connected sockets in /chat namespace:`);
      
      // Debug: List all connected sockets and their rooms
      chatNamespace.sockets.forEach((s, id) => {
        const rooms = Array.from(s.rooms);
        console.log(`  - Socket ${id}: user=${s.userId} (${s.username}), rooms=[${rooms.join(', ')}]`);
      });
      
      const callData = {
        callId: roomName,
        roomName,
        threadId,
        callType,
        callerId: socket.userId,
        callerName: socket.username,
        timestamp: new Date()
      };
      
      // Notify each target user about the incoming call
      if (targetUserIds && Array.isArray(targetUserIds)) {
        targetUserIds.forEach(userId => {
          // Convert both to same type for comparison
          const targetId = String(userId);
          const callerId = String(socket.userId);
          
          if (targetId !== callerId) {
            console.log(`[Chat] Emitting to room: user:${targetId}`);
            chatNamespace.to(`user:${targetId}`).emit('chat:call:incoming', callData);
            console.log(`[Chat] ✅ Call notification sent to user:${targetId}`);
          }
        });
      }
      
      // Also broadcast to the thread
      socket.to(`thread:${threadId}`).emit('chat:call:incoming', callData);
    });
    
    // Accept a call - notify the caller
    socket.on('chat:call:accept', (data) => {
      const { callId, roomName, callerId } = data;
      
      console.log(`[Chat] Call accepted by ${socket.username} for call ${callId}`);
      
      // Notify the caller that their call was accepted
      chatNamespace.to(`user:${callerId}`).emit('chat:call:accepted', {
        callId,
        roomName,
        acceptedBy: socket.userId,
        acceptedByName: socket.username,
        timestamp: new Date()
      });
    });
    
    // Reject a call - notify the caller
    socket.on('chat:call:reject', (data) => {
      const { callId, callerId, reason = 'declined' } = data;
      
      console.log(`[Chat] Call rejected by ${socket.username} for call ${callId}`);
      
      // Notify the caller that their call was rejected
      chatNamespace.to(`user:${callerId}`).emit('chat:call:rejected', {
        callId,
        rejectedBy: socket.userId,
        rejectedByName: socket.username,
        reason,
        timestamp: new Date()
      });
    });
    
    // End a call - notify all participants
    socket.on('chat:call:end', (data) => {
      const { callId, threadId, duration } = data;
      
      console.log(`[Chat] Call ended by ${socket.username}: ${callId}`);
      
      // Notify everyone in the thread that the call has ended
      chatNamespace.to(`thread:${threadId}`).emit('chat:call:ended', {
        callId,
        endedBy: socket.userId,
        endedByName: socket.username,
        duration,
        timestamp: new Date()
      });
    });
    
    // ===== END CALL SIGNALING =====
    
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
