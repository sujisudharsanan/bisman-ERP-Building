# Chat Module - Backend

## Overview

Backend implementation of the Chat Module for BISMAN ERP.

## Structure

```
modules/chat/
├── routes/            # API endpoints
│   ├── index.js      # Main router
│   ├── ai.js         # AI chat routes
│   ├── messages.js   # Thread & message routes
│   └── calls.js      # Video/audio call routes
├── controllers/       # Business logic (to be created)
├── services/         # Service layer (to be created)
├── socket/           # Socket.IO handlers
│   ├── chatSocket.js # Chat real-time events
│   └── presence.js   # User presence tracking
└── middleware/       # Auth & validation (to be created)
```

## Integration

To integrate this module into your Express app:

```javascript
// app.js or server.js
const chatRoutes = require('./modules/chat/routes');
const { initializeChatSocket } = require('./modules/chat/socket/chatSocket');

// Mount routes
app.use('/api/chat', chatRoutes);

// Initialize Socket.IO
const io = new Server(server);
initializeChatSocket(io);
```

## API Endpoints

### AI Chat
- `POST /api/chat/message` - Send message to AI assistant
- `GET /api/chat/ai/history` - Get AI conversation history

### Threads & Messages
- `GET /api/chat/threads` - List user's threads
- `POST /api/chat/threads` - Create new thread
- `GET /api/chat/threads/:id` - Get thread details
- `GET /api/chat/threads/:id/messages` - Get messages
- `POST /api/chat/threads/:id/messages` - Send message

### Calls
- `GET /api/chat/calls` - List call history
- `POST /api/chat/calls` - Initiate call
- `POST /api/chat/calls/:id/end` - End call

### Health
- `GET /api/chat/health` - Module health check

## Socket.IO Events

### Client → Server
- `chat:join` - Join thread room
- `chat:leave` - Leave thread room
- `chat:message` - Send message
- `chat:typing` - Start/stop typing
- `chat:read` - Mark message as read
- `chat:presence` - Update presence status

### Server → Client
- `chat:message:new` - New message received
- `chat:typing:update` - Typing indicator
- `chat:presence:update` - User status changed
- `chat:user:joined` - User joined thread
- `chat:user:left` - User left thread

## Database Models

Uses existing Prisma models:
- `Thread` - Chat conversations
- `ThreadMember` - Thread participants
- `CallLog` - Audio/video call history

## Environment Variables

```bash
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

## Testing

```bash
# Run module tests
npm test modules/chat

# Test specific feature
npm test modules/chat/socket
```

## Migration Status

- ✅ Routes copied from `/routes`
- ✅ Socket handlers created
- ✅ Module structure established
- ⏳ Controllers to be extracted
- ⏳ Services to be extracted
- ⏳ Tests to be added
