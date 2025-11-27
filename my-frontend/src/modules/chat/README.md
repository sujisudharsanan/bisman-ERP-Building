# 💬 Chat Module

## Overview

The Chat Module provides comprehensive messaging, AI assistance, and communication features for BISMAN ERP.

## Features

- **AI Assistant** - Intelligent chat with natural language processing
- **Team Messaging** - Thread-based conversations
- **Video/Audio Calls** - Integrated with Jitsi Meet
- **Real-time Updates** - Socket.IO powered live messaging
- **File Sharing** - Attachment support
- **User Presence** - Online/offline status tracking

## Structure

```
modules/chat/
├── pages/              # Route pages
├── components/         # UI components
├── hooks/             # React hooks
├── services/          # API & business logic
├── types/             # TypeScript definitions
└── utils/             # Helper functions
```

## Usage

```typescript
import { ChatInterface } from '@/modules/chat/components'
import { useChat } from '@/modules/chat/hooks'

function MyComponent() {
  const { messages, sendMessage } = useChat()
  
  return <ChatInterface messages={messages} onSend={sendMessage} />
}
```

## Routes

- `/chat` - Main chat interface
- `/chat/ai` - AI Assistant
- `/chat/threads` - Thread list
- `/chat/calls` - Call history
- `/chat/settings` - Chat settings

## API Endpoints

- `POST /api/chat/message` - Send message
- `GET /api/chat/threads` - List threads
- `POST /api/chat/threads` - Create thread
- `GET /api/chat/calls` - List calls
- `POST /api/chat/calls` - Initiate call

## Socket Events

- `chat:message` - New message received
- `chat:typing` - User typing indicator
- `chat:presence` - User status changed
- `chat:call:start` - Call initiated
- `chat:call:end` - Call ended

## Environment Variables

```bash
# Frontend
NEXT_PUBLIC_ENABLE_CHAT=true
NEXT_PUBLIC_API_URL=http://localhost:5000

# Backend
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000
```

## Development

```bash
# Run dev server
npm run dev:both

# Test chat
npm test modules/chat

# Build
npm run build
```

## Migration Status

- ✅ Directory structure created
- ⏳ Components migration in progress
- ⏳ Backend routes migration pending
- ⏳ Tests to be added

## Related Documentation

- [Chat Architecture Decision](../../CHAT_MODULE_ARCHITECTURE_DECISION.md)
- [Chat System Configuration](../../CHAT_SYSTEM_CONFIGURATION.md)
- [Socket.IO Documentation](../../docs/socket-io.md)
