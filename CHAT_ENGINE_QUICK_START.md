# 🚀 Quick Start - Intelligent Chat Engine

Get your AI-powered chat system running in 5 minutes!

## ✅ Prerequisites

- Node.js 16+
- PostgreSQL database
- Existing Express.js app
- TypeScript configured

## 📦 Step 1: Files Added

The following files have been created:

```
my-backend/src/
├── services/chat/
│   ├── chatService.ts       # Main orchestrator ✅
│   ├── intentService.ts     # Intent detection ✅
│   ├── fuzzyService.ts      # Typo correction ✅
│   ├── entityService.ts     # Entity extraction ✅
│   └── taskService.ts       # Task management ✅
├── routes/
│   └── chatRoutes.ts        # API endpoints ✅
├── utils/
│   └── dateParser.ts        # Date parsing ✅
└── examples/
    └── chatExamples.ts      # Usage examples ✅
```

## 🔧 Step 2: Database Setup

Run this SQL in your PostgreSQL database:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending',
  priority VARCHAR(10) DEFAULT 'medium',
  source VARCHAR(20) DEFAULT 'manual',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
```

## 🔌 Step 3: Integrate Routes

Find your main Express app file (usually `app.ts` or `server.ts`) and add:

```typescript
import chatRoutes from './routes/chatRoutes';

// Add this line with your other routes
app.use('/api/chat', chatRoutes);
```

## 🎯 Step 4: Initialize (Optional)

Initialize the tasks table on startup:

```typescript
import { taskService } from './services/chat/taskService';

// In your app initialization
await taskService.ensureTableExists();
console.log('✅ Chat engine ready!');
```

## 🧪 Step 5: Test It!

### Test with cURL:

```bash
# Send a message
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "create a task for tomorrow 5pm to approve bills"}'

# Get pending tasks
curl http://localhost:3000/api/chat/tasks/pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get task stats
curl http://localhost:3000/api/chat/tasks/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Expected Response:

```json
{
  "success": true,
  "data": {
    "reply": "✅ Task created successfully for tomorrow at 17:00!\n\n📝 \"approve bills\"\n🆔 Task ID: 1\n⚡ Priority: MEDIUM",
    "intent": "create_task",
    "confidence": 0.95,
    "entities": {
      "date": "2025-11-15T00:00:00.000Z",
      "time": "17:00"
    },
    "nextAction": "EXECUTE",
    "data": {
      "task": {
        "id": 1,
        "user_id": 1,
        "description": "approve bills",
        "due_date": "2025-11-15T17:00:00.000Z",
        "status": "pending",
        "priority": "medium"
      }
    }
  }
}
```

## 💬 Try These Messages:

```
✅ "create a task for tomorrow 5pm to approve bills"
✅ "show my pending tasks"
✅ "create payment request for Rs.50000"
✅ "check inventory"
✅ "request leave for tomorrow"
✅ "view dashboard"
✅ "chek my atendance" (with typos - still works!)
```

## 🎨 Frontend Integration

### React Example:

```typescript
const sendChatMessage = async (message: string) => {
  const response = await fetch('/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  
  const data = await response.json();
  return data.data; // Contains reply, intent, entities, etc.
};

// Usage
const response = await sendChatMessage("create task tomorrow");
console.log(response.reply); // Display to user
```

### Vue Example:

```typescript
const chatStore = {
  async sendMessage(message: string) {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({ message }),
    });
    return await response.json();
  }
};
```

## 📊 API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat/message` | Send chat message |
| GET | `/api/chat/history` | Get conversation history |
| DELETE | `/api/chat/history` | Clear conversation history |
| GET | `/api/chat/tasks` | Get all tasks (with filters) |
| GET | `/api/chat/tasks/pending` | Get pending tasks |
| GET | `/api/chat/tasks/stats` | Get task statistics |
| GET | `/api/chat/tasks/:id` | Get task by ID |
| POST | `/api/chat/tasks` | Create task manually |
| PUT | `/api/chat/tasks/:id` | Update task |
| PATCH | `/api/chat/tasks/:id/status` | Update task status |
| DELETE | `/api/chat/tasks/:id` | Delete task |
| GET | `/api/chat/health` | Health check |

## 🎯 Supported Intents (18+)

- ✅ Task Management (create, view)
- ✅ Payment Requests
- ✅ Inventory Checks
- ✅ Attendance & Leave
- ✅ Dashboard & Reports
- ✅ User Search
- ✅ Approval Status
- ✅ Salary Info
- ✅ Vehicle Tracking
- ✅ Hub Information
- ✅ Fuel Expenses
- ✅ Vendor Payments
- ✅ Meeting Scheduling
- ✅ Notifications
- ✅ Profile Updates

## 🔍 Entity Extraction

Automatically extracts:
- 💰 Amounts (Rs.500, $100, ₹1000)
- 📅 Dates (tomorrow, next Monday, 12/25/2024)
- ⏰ Times (5pm, 17:00, 2:30 PM)
- 📄 Invoice IDs (PR-123, INV-456)
- 🚗 Vehicle IDs (MH12AB1234)
- 👤 Names
- 📍 Locations
- ⚡ Priorities (urgent, high, low)
- 📆 Durations (3 days, 2 weeks)

## 🧠 Intelligence Features

### 1. Typo Correction
```
User: "chek paymnt status"  ❌
Bot understands: "check payment status"  ✅
```

### 2. Confidence Levels
- **High (>0.85)**: Executes immediately
- **Medium (0.6-0.85)**: Asks confirmation
- **Low (<0.6)**: Asks clarifying questions

### 3. Context Awareness
Remembers last 10 messages for context

### 4. Multi-turn Conversations
Can ask follow-up questions

## 🚨 Troubleshooting

### Issue: Routes not working
**Solution**: Make sure you registered the routes:
```typescript
app.use('/api/chat', chatRoutes);
```

### Issue: Database errors
**Solution**: Run the SQL script to create the `tasks` table

### Issue: Auth errors
**Solution**: Make sure your `authMiddleware` is working and sets `req.user.id`

### Issue: TypeScript errors
**Solution**: Make sure you have proper type definitions and imports

## 📚 Next Steps

1. ✅ **Test the basic functionality** - Send a few messages
2. ✅ **Integrate with frontend** - Add chat UI component
3. ✅ **Customize intents** - Add your specific business intents
4. ✅ **Add custom entities** - Extract domain-specific data
5. ✅ **Enhance responses** - Customize reply messages
6. ✅ **Add logging** - Track usage and improve

## 🎓 Learn More

- **Full Documentation**: `INTELLIGENT_CHAT_ENGINE_README.md`
- **Examples**: `my-backend/src/examples/chatExamples.ts`
- **API Details**: Check `my-backend/src/routes/chatRoutes.ts`

## 💡 Quick Tips

1. **No AI API needed** - Everything runs locally!
2. **Handles typos** - Fuzzy matching built-in
3. **Fast responses** - No external API delays
4. **Highly customizable** - Add your own intents easily
5. **Production ready** - Includes error handling, logging, validation

## 🎉 You're Ready!

Start sending messages and see the magic happen! 

```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"message": "create a task for tomorrow"}'
```

---

**Questions?** Check `INTELLIGENT_CHAT_ENGINE_README.md` for detailed documentation.

**Built for BISMAN ERP** 🚀
