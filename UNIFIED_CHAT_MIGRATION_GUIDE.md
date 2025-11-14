# 🚀 UNIFIED CHAT SYSTEM - Complete Migration Guide

## 📋 Overview

You currently have **MULTIPLE chat implementations** scattered across your codebase:

### Current Chat Implementations Found:

1. **✅ Enhanced AI Chat** (`/api/ai`) - File-based, self-learning
2. **✅ Intelligent Chat Engine** (`/api/chat`) - Pattern matching + NLP
3. **✅ AI Module Chat** (`/api/ai`) - Duplicate route!
4. **✅ Copilate Smart Chat** (`/api/copilate`) - Smart chat
5. **✅ Various Chat Components** - Multiple frontend implementations

### ⚠️ Problems with Current Setup:

- **Data scattered** in JSON files AND database
- **Duplicate routes** (`/api/ai` used twice!)
- **No unified RBAC** checking
- **Inconsistent user data** storage
- **Multiple chat engines** doing similar things
- **File + DB hybrid** = data sync issues

---

## 🎯 NEW: Unified Chat System

### ✨ Features:

✅ **Single Database-Driven Engine** - All data in PostgreSQL  
✅ **RBAC Permission Checking** - Role-based access control  
✅ **Dynamic Responses** - Fetches real-time data (tasks, approvals)  
✅ **User Data Persistence** - All user info saved to DB  
✅ **Self-Learning** - Learns from user corrections  
✅ **Spell Checking** - Auto-correct with database  
✅ **Analytics** - Track usage, intents, feedback  
✅ **Conversation History** - Full history in database  

---

## 📦 What's Included

### 1. Database Schema
**File:** `my-backend/database/migrations/006_unified_chat_system.sql`

**Tables Created:**
- `chat_conversations` - User conversations
- `chat_messages` - All messages (user + assistant)
- `chat_user_preferences` - User settings, visit tracking
- `chat_training_data` - Dynamic training patterns
- `chat_user_corrections` - User corrections for learning
- `chat_feedback` - Thumbs up/down feedback
- `chat_analytics` - Usage analytics
- `chat_common_mistakes` - Spell check database

**Views:**
- `v_user_chat_summary` - User stats
- `v_chat_intent_analytics` - Intent usage by role

**Functions:**
- `check_chat_permission(userId, permission)` - RBAC check

### 2. Backend Engine
**File:** `my-backend/services/ai/unifiedChatEngine.js`

**Key Methods:**
```javascript
// Main entry point
await chat.processMessage(userId, message, conversationId)

// Get personalized greeting
await chat.generateGreeting(userId)

// Store corrections
await chat.storeCorrection(userId, messageId, original, corrected, ...)

// Submit feedback
await chat.submitFeedback(userId, messageId, helpful, type, comment)

// Get history
await chat.getUserHistory(userId, limit)

// Get analytics
await chat.getAnalytics(userId)
```

### 3. API Routes
**File:** `my-backend/routes/unified-chat.js`

**Endpoints:**
```
POST   /api/unified-chat/message      - Send message
POST   /api/unified-chat/greeting     - Get greeting
POST   /api/unified-chat/feedback     - Submit feedback
POST   /api/unified-chat/correction   - Submit correction
GET    /api/unified-chat/history      - Get history
GET    /api/unified-chat/conversations - Get conversations
GET    /api/unified-chat/conversation/:id - Get specific conversation
GET    /api/unified-chat/analytics    - Get analytics
GET    /api/unified-chat/suggestions  - Get suggestions
POST   /api/unified-chat/training     - Add training (admin)
GET    /api/unified-chat/health       - Health check
```

---

## 🔧 Installation Steps

### Step 1: Run Database Migration

```bash
cd /Users/abhi/Desktop/BISMAN\ ERP

# Connect to your database and run:
psql -d your_database_name -f my-backend/database/migrations/006_unified_chat_system.sql

# OR if using Railway/Heroku:
cat my-backend/database/migrations/006_unified_chat_system.sql | psql $DATABASE_URL
```

**What it does:**
- Creates 8 new tables
- Inserts default training data (greetings, tasks, approvals, reports)
- Inserts common spelling mistakes
- Creates triggers for auto-updates
- Seeds chat preferences for existing users

### Step 2: Install Dependencies

```bash
cd my-backend

# These should already be installed from previous chat implementations
npm install natural compromise pg

# Verify
npm list natural compromise pg
```

### Step 3: Add Route to app.js

**File:** `my-backend/app.js`

Add this **AFTER line 462** (after AI Training routes):

```javascript
// Unified Chat System (consolidates all chat implementations)
try {
  const unifiedChatRoutes = require('./routes/unified-chat')
  app.use('/api/unified-chat', unifiedChatRoutes)
  console.log('✅ Unified Chat System routes loaded at /api/unified-chat')
} catch (e) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn('Unified Chat routes not loaded:', e && e.message)
  }
}
```

### Step 4: Update Environment Variables

**File:** `.env` (if not already set)

```bash
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=development
```

### Step 5: Restart Server

```bash
# Stop current server (Ctrl+C)

# Start backend
cd my-backend
npm run dev

# Should see:
# ✅ Unified Chat System routes loaded at /api/unified-chat
```

---

## 🧪 Testing

### Test 1: Health Check

```bash
curl http://localhost:3000/api/unified-chat/health
```

**Expected Response:**
```json
{
  "success": true,
  "status": "healthy",
  "initialized": true,
  "stats": {
    "totalMessages": 0,
    "totalCorrections": 0,
    "totalTrainingExamples": 15
  }
}
```

### Test 2: Send a Message

```bash
curl -X POST http://localhost:3000/api/unified-chat/message \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1" \
  -d '{
    "message": "show my tasks"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "response": "Here are your tasks:\n\n📋 You have 3 pending task(s):\n1. Complete report (high priority)\n2. Review approvals (medium priority)\n3. Update database (low priority)",
  "intent": "list_tasks",
  "confidence": 0.95,
  "spellCheck": {
    "original": "show my tasks",
    "corrected": "show my tasks",
    "hasCorrections": false,
    "corrections": []
  },
  "entities": {},
  "conversationId": 1,
  "messageId": 2,
  "hasPermission": true,
  "data": {
    "tasks": [...]
  },
  "stats": {
    "responseTime": 45,
    "totalMessages": 1
  }
}
```

### Test 3: Get Personalized Greeting

```bash
curl -X POST http://localhost:3000/api/unified-chat/greeting \
  -H "Content-Type: application/json" \
  -H "x-user-id: 1"
```

**Expected Response:**
```json
{
  "success": true,
  "greeting": "Hello John! Welcome! I'm your AI assistant. I can help you with tasks, approvals, reports, and more.",
  "userContext": {
    "firstName": "John",
    "visitCount": 1,
    "lastVisit": null,
    "roleName": "Manager",
    "roleId": 2,
    "isNew": false
  },
  "newItems": null
}
```

---

## 🎨 Frontend Integration

### React/Next.js Component Example

```typescript
// my-frontend/src/components/UnifiedChatInterface.tsx

'use client';

import { useState, useEffect } from 'react';
import { Send, ThumbsUp, ThumbsDown } from 'lucide-react';

interface Message {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  messageId?: number;
}

export default function UnifiedChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Get greeting on mount
  useEffect(() => {
    fetchGreeting();
  }, []);

  const fetchGreeting = async () => {
    try {
      const response = await fetch('/api/unified-chat/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      
      if (data.success) {
        setMessages([{
          id: Date.now(),
          role: 'assistant',
          content: data.greeting
        }]);
      }
    } catch (error) {
      console.error('Error fetching greeting:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/unified-chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          conversationId
        })
      });

      const data = await response.json();

      if (data.success) {
        setConversationId(data.conversationId);
        
        const assistantMessage: Message = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          intent: data.intent,
          messageId: data.messageId
        };
        
        setMessages(prev => [...prev, assistantMessage]);

        // Show spell check if needed
        if (data.spellCheck.hasCorrections) {
          console.log('Spell corrections:', data.spellCheck.corrections);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async (messageId: number, helpful: boolean) => {
    try {
      await fetch('/api/unified-chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId,
          helpful,
          feedbackType: helpful ? 'thumbs_up' : 'thumbs_down'
        })
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-4 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {msg.role === 'assistant' && msg.messageId && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => submitFeedback(msg.messageId!, true)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => submitFeedback(msg.messageId!, false)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 border rounded-lg px-4 py-2"
          disabled={loading}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
```

---

## 🔒 RBAC Permission Checking

### How It Works:

1. **Training data** includes `requires_permission` field
2. **Engine checks** user's role permissions before responding
3. **Denies access** if user lacks permission

### Example Training Data:

```sql
INSERT INTO chat_training_data (pattern, intent, requires_permission) VALUES
('show.*task', 'list_tasks', 'view_tasks'),
('create.*task', 'create_task', 'create_task'),
('approve', 'approve_request', 'approve_request');
```

### Permission Check Function:

```sql
SELECT check_chat_permission(user_id, 'view_tasks');
-- Returns: true/false
```

---

## 📊 Data Flow

```
1. USER SENDS MESSAGE
   ↓
2. API: POST /api/unified-chat/message
   ↓
3. UnifiedChatEngine.processMessage()
   ├─ Get user context from DB
   ├─ Spell check (DB common_mistakes)
   ├─ Classify intent (Bayes + patterns)
   ├─ Check RBAC permission (DB function)
   ├─ Generate response (dynamic data)
   ├─ Save to DB (messages, analytics)
   └─ Return response
   ↓
4. FRONTEND displays response
   ↓
5. USER gives feedback (👍/👎)
   ↓
6. Saved to chat_feedback table
```

---

## 🔄 Migration from Old Systems

### Option A: Keep Both (Recommended for Testing)

```javascript
// app.js - Keep old routes temporarily

// OLD: Enhanced AI Training
app.use('/api/ai', aiTrainingRoutes)

// OLD: Intelligent Chat
app.use('/api/chat', chatRoutes)

// NEW: Unified Chat (test alongside old)
app.use('/api/unified-chat', unifiedChatRoutes)
```

**Then gradually migrate users to `/api/unified-chat`**

### Option B: Full Replace

1. **Backup old data:**
```bash
# Export old JSON files
cp my-backend/data/chat-training.json chat-training-backup.json
cp my-backend/data/chat-feedback.json chat-feedback-backup.json
```

2. **Migrate data to database:**
```sql
-- Import old training data
INSERT INTO chat_training_data (pattern, intent, response_template, examples)
SELECT ...FROM old_data;
```

3. **Update frontend to use new API**
4. **Remove old routes from app.js**

---

## 📈 Analytics & Monitoring

### View User Summary:

```sql
SELECT * FROM v_user_chat_summary WHERE user_id = 1;
```

**Returns:**
- Total conversations
- Total messages
- Positive/negative feedback
- Visit count
- Last visit

### View Popular Intents by Role:

```sql
SELECT * FROM v_chat_intent_analytics
WHERE role_name = 'Manager'
ORDER BY usage_count DESC;
```

**Returns:**
- Intent usage count
- Unique users
- Average response time
- Feedback stats

### View Analytics via API:

```bash
curl http://localhost:3000/api/unified-chat/analytics \
  -H "x-user-id: 1"
```

---

## 🐛 Troubleshooting

### Issue: "Chat not initialized"

**Solution:**
```javascript
const chat = getUnifiedChat();
await chat.init(); // Force initialization
```

### Issue: "Permission denied"

**Check:**
1. User has correct role assigned
2. Role has permission in `rbac_route_permissions`
3. Training data `requires_permission` is correct

**Debug:**
```sql
SELECT check_chat_permission(1, 'view_tasks');
```

### Issue: "No training data loaded"

**Check:**
```sql
SELECT COUNT(*) FROM chat_training_data WHERE is_active = true;
```

**Re-run migration if needed**

### Issue: "Spell check not working"

**Check:**
```sql
SELECT COUNT(*) FROM chat_common_mistakes WHERE is_active = true;
```

**Add more mistakes:**
```sql
INSERT INTO chat_common_mistakes (incorrect_word, correct_word, frequency)
VALUES ('taks', 'task', 10);
```

---

## 📚 API Reference

### POST /api/unified-chat/message

**Request:**
```json
{
  "message": "show my tasks",
  "conversationId": 123 // optional
}
```

**Response:**
```json
{
  "success": true,
  "response": "Here are your tasks...",
  "intent": "list_tasks",
  "confidence": 0.95,
  "spellCheck": {
    "original": "shwo my taks",
    "corrected": "show my tasks",
    "hasCorrections": true,
    "corrections": [
      {"incorrect": "shwo", "correct": "show"},
      {"incorrect": "taks", "correct": "task"}
    ]
  },
  "entities": {},
  "conversationId": 123,
  "messageId": 456,
  "hasPermission": true,
  "data": { ... },
  "stats": {
    "responseTime": 45,
    "totalMessages": 10
  }
}
```

---

## ✅ Next Steps

1. ✅ **Run database migration** (Step 1)
2. ✅ **Add route to app.js** (Step 3)
3. ✅ **Test health endpoint** (Test 1)
4. ✅ **Test with real messages** (Test 2)
5. ⏳ **Create frontend component** (See Frontend Integration)
6. ⏳ **Add more training data** (Admin interface)
7. ⏳ **Monitor analytics** (View usage)
8. ⏳ **Gradually migrate users** (From old chat)

---

## 🎯 Summary

### Before (Multiple Chats):
- ❌ Data in JSON files
- ❌ No RBAC checks
- ❌ Multiple engines
- ❌ Duplicate routes
- ❌ Inconsistent responses

### After (Unified Chat):
- ✅ All data in database
- ✅ RBAC permission checks
- ✅ Single engine
- ✅ One API endpoint
- ✅ Dynamic responses
- ✅ Self-learning
- ✅ Full analytics

---

**Need help? Check the troubleshooting section or review the code comments!**
