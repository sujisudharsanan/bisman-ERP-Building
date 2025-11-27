# Chat Module - Quick Reference 🚀

## 📍 Quick Links

### Backend
- **Base URL**: http://localhost:5000/api/chat
- **Health Check**: http://localhost:5000/api/chat/health
- **Socket.IO Namespace**: `/chat`

### Frontend
- **Messages**: http://localhost:3000/chat
- **AI Assistant**: http://localhost:3000/chat/ai
- **Module Path**: `my-frontend/src/modules/chat/`

---

## 🎯 Common Tasks

### Import Chat Components
```typescript
// Chat Interface
import ChatInterface from '@/modules/chat/components/ChatInterface';

// Chat Guard (shows floating widget)
import ChatGuard from '@/modules/chat/components/ChatGuard';

// AI Widget
import AIWidget from '@/modules/chat/components/AIWidget';

// Floating Widget
import FloatingWidget from '@/modules/chat/components/FloatingWidget';

// Call Controls
import CallControls from '@/modules/chat/components/CallControls';
```

### Use Chat Hooks
```typescript
// Main chat hook
import { useChat } from '@/modules/chat/hooks/useChat';

const {
  threads,
  selectedThread,
  messages,
  loading,
  error,
  loadThreads,
  selectThread,
  sendMessage,
  createThread,
  deleteMessage,
  editMessage
} = useChat();

// Socket.IO hook
import { useSocket } from '@/modules/chat/hooks/useSocket';

const { socket, connected, emit, on, off } = useSocket();
```

### Use Chat API Service
```typescript
import chatApi from '@/modules/chat/services/chatApi';

// Get threads
const threads = await chatApi.getThreads();

// Send message
const message = await chatApi.sendMessage(threadId, {
  content: "Hello!",
  type: "text"
});

// Initiate call
const call = await chatApi.initiateCall(threadId, "video");

// Send AI message
const response = await chatApi.sendAIMessage("How are you?");
```

### Use Chat Types
```typescript
import type {
  Thread,
  Message,
  User,
  CallLog,
  TypingIndicator,
  UserPresence,
  AIMessage
} from '@/modules/chat/types';
```

---

## 🔌 Socket.IO Events

### Client → Server
```typescript
// Join a chat room
socket.emit('chat:join', { threadId: '123' });

// Send message
socket.emit('chat:message', {
  threadId: '123',
  content: 'Hello!',
  type: 'text'
});

// Typing indicator
socket.emit('chat:typing', {
  threadId: '123',
  isTyping: true
});

// Mark as read
socket.emit('chat:read', {
  threadId: '123',
  messageIds: ['msg1', 'msg2']
});

// Update presence
socket.emit('chat:presence', {
  status: 'online',
  activity: 'active'
});

// Leave room
socket.emit('chat:leave', { threadId: '123' });
```

### Server → Client
```typescript
// Listen for new messages
socket.on('chat:message', (message) => {
  console.log('New message:', message);
});

// Listen for typing
socket.on('chat:typing', (data) => {
  console.log(`${data.userName} is typing...`);
});

// Listen for read receipts
socket.on('chat:read', (data) => {
  console.log('Messages read:', data.messageIds);
});

// Listen for presence updates
socket.on('chat:presence', (data) => {
  console.log(`${data.userName} is ${data.status}`);
});
```

---

## 🛣️ API Endpoints

### AI Assistant
```bash
# Send message to AI
POST /api/chat/ai/message
Body: { message: "Hello AI", context: {...} }

# Get AI history
GET /api/chat/ai/history?userId=123&limit=50
```

### Threads
```bash
# Get all threads
GET /api/chat/threads?userId=123

# Create thread
POST /api/chat/threads
Body: { title: "New Chat", type: "direct", members: [...] }

# Get thread details
GET /api/chat/threads/:threadId

# Update thread
PUT /api/chat/threads/:threadId
Body: { title: "Updated Title" }

# Delete thread
DELETE /api/chat/threads/:threadId
```

### Messages
```bash
# Get messages
GET /api/chat/threads/:threadId/messages?limit=50&offset=0

# Send message
POST /api/chat/threads/:threadId/messages
Body: {
  content: "Hello!",
  type: "text",
  attachments: []
}

# Edit message
PUT /api/chat/messages/:messageId
Body: { content: "Updated content" }

# Delete message
DELETE /api/chat/messages/:messageId

# Add reaction
POST /api/chat/messages/:messageId/reactions
Body: { emoji: "👍" }
```

### Calls
```bash
# Start call
POST /api/chat/calls/start
Body: {
  thread_id: "123",
  call_type: "video" | "audio"
}

# End call
POST /api/chat/calls/end
Body: { call_id: "456" }

# Get call logs
GET /api/chat/calls/logs?threadId=123

# Get Jitsi JWT
GET /api/chat/calls/jwt?roomName=room123
```

---

## 🎨 Component Examples

### Basic Chat Interface
```tsx
'use client';

import ChatInterface from '@/modules/chat/components/ChatInterface';

export default function ChatPage() {
  const handleClose = () => {
    // Handle close logic
  };

  return (
    <div className="h-screen">
      <ChatInterface onClose={handleClose} />
    </div>
  );
}
```

### AI Widget
```tsx
import AIWidget from '@/modules/chat/components/AIWidget';

<AIWidget 
  position="bottom-right"
  theme="light"
  initialMessage="How can I help you today?"
/>
```

### Call Controls
```tsx
import CallControls from '@/modules/chat/components/CallControls';

<CallControls
  callId="call-123"
  threadId="thread-456"
  onEndCall={handleEndCall}
  isMuted={false}
  isVideoOff={false}
/>
```

---

## 🧪 Testing Commands

### Backend
```bash
# Start backend
cd my-backend
PORT=5000 NODE_ENV=development node index.js

# Test health
curl http://localhost:5000/api/chat/health

# Test AI endpoint (requires auth)
curl -X POST http://localhost:5000/api/chat/ai/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "Hello AI"}'
```

### Frontend
```bash
# Start frontend
cd my-frontend
npm run dev

# Visit pages
open http://localhost:3000/chat
open http://localhost:3000/chat/ai
```

---

## 🔧 Configuration

### Environment Variables

**Backend (.env.local)**:
```env
PORT=5000
NODE_ENV=development
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
OLLAMA_HOST=http://localhost:11434
```

**Frontend (.env.local)**:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
OLLAMA_HOST=http://localhost:11434
```

---

## 📱 Navigation Setup

Chat is available for these roles:
- **MANAGER**: Messages + AI Assistant
- **STAFF**: Messages + AI Assistant

Menu items automatically added to sidebar navigation.

---

## 🎯 Key Features

✅ **Real-time Messaging** - Socket.IO powered  
✅ **AI Assistant** - Ollama/rule-based responses  
✅ **Video/Audio Calls** - Jitsi Meet integration  
✅ **Thread Management** - Organize conversations  
✅ **Typing Indicators** - See who's typing  
✅ **Read Receipts** - Message delivery status  
✅ **User Presence** - Online/offline status  
✅ **Message Reactions** - Emoji reactions  
✅ **File Attachments** - Share files in chat  
✅ **Search** - Find messages across threads  

---

## 🚨 Troubleshooting

### Backend not loading chat module
- Check: `✅ 🎯 CHAT MODULE loaded at /api/chat` in logs
- Verify: `my-backend/modules/chat/routes/index.js` exists
- Test: `curl http://localhost:5000/api/chat/health`

### Frontend import errors
- Ensure all paths use `@/modules/chat/...`
- Run: `cd my-frontend && npm run type-check`
- Check: `tsconfig.json` has correct path aliases

### Socket.IO not connecting
- Check browser console for connection messages
- Verify CORS settings in `server.js`
- Ensure backend is running on correct port

---

**Need Help?** Check `CHAT_MODULE_MIGRATION_COMPLETE.md` for detailed migration info.
