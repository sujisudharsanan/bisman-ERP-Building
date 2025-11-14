# 🤖 Intelligent ERP Chat Engine + Task Creator

A production-ready, AI-powered chat engine for internal ERP systems that **does not require** any external AI APIs (no OpenAI, Anthropic, Ollama, or LLMs).

## ✨ Features

### 🧠 Intelligent Processing
- **Fuzzy Matching** - Handles typos and spelling errors (e.g., "paymnt" → "payment")
- **Intent Detection** - Identifies user intent with confidence scoring (18+ intents)
- **Entity Extraction** - Extracts dates, times, amounts, names, IDs automatically
- **Multi-turn Conversations** - Asks clarifying questions when needed
- **Context Awareness** - Remembers conversation history
- **Confidence-based Responses** - Different actions based on confidence levels

### 📋 Task Management
- Create tasks via natural language
- Schedule tasks with dates and times
- Set priorities (low, medium, high, urgent)
- View pending tasks
- Task statistics and tracking
- Automatic reminders

### 🎯 Supported Intents

1. **Task Management**
   - `show_pending_tasks` - View your pending tasks
   - `create_task` - Create new tasks with deadlines

2. **Finance**
   - `create_payment_request` - Submit payment requests
   - `vendor_payments` - Check vendor payment status
   - `fuel_expense` - Record fuel expenses
   - `salary_info` - View salary information

3. **HR Operations**
   - `check_attendance` - View attendance records
   - `request_leave` - Apply for leave
   
4. **Inventory & Operations**
   - `check_inventory` - Check stock levels
   - `vehicle_info` - Vehicle tracking
   - `hub_info` - Hub/branch information

5. **Reports & Admin**
   - `view_dashboard` - Open dashboard
   - `view_reports` - View analytics
   - `get_approval_status` - Check approval status
   - `search_user` - Find users/employees

6. **General**
   - `schedule_meeting` - Schedule meetings
   - `check_notifications` - View notifications
   - `update_profile` - Update user profile

## 🏗️ Architecture

```
/services/chat/
├── chatService.ts       # Main orchestrator
├── intentService.ts     # Intent detection engine
├── fuzzyService.ts      # Typo correction & fuzzy matching
├── entityService.ts     # Entity extraction
└── taskService.ts       # Task CRUD operations

/routes/
└── chatRoutes.ts        # Express API endpoints

/utils/
└── dateParser.ts        # Natural language date parsing
```

## 🚀 Installation & Setup

### 1. Database Setup

The system uses PostgreSQL. Run this to create the tasks table:

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMP,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('chat', 'manual', 'system')),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
```

### 2. Integrate Routes

Add to your main Express app:

```typescript
import chatRoutes from './routes/chatRoutes';

app.use('/api/chat', chatRoutes);
```

### 3. Initialize Task Service

In your app initialization:

```typescript
import { taskService } from './services/chat/taskService';

// Ensure tasks table exists
await taskService.ensureTableExists();
```

## 📡 API Endpoints

### Send Message
```http
POST /api/chat/message
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "create a task for tomorrow 5pm to approve bills"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reply": "✅ Task created successfully for tomorrow at 17:00!\n\n📝 \"approve bills\"\n🆔 Task ID: 123\n⚡ Priority: MEDIUM",
    "intent": "create_task",
    "confidence": 0.95,
    "entities": {
      "date": "2025-11-15T00:00:00.000Z",
      "time": "17:00"
    },
    "nextAction": "EXECUTE",
    "data": {
      "task": { /* task object */ }
    }
  }
}
```

### Get Pending Tasks
```http
GET /api/chat/tasks/pending?limit=10
Authorization: Bearer <token>
```

### Get Task Statistics
```http
GET /api/chat/tasks/stats
Authorization: Bearer <token>
```

### Create Task (Direct API)
```http
POST /api/chat/tasks
Content-Type: application/json
Authorization: Bearer <token>

{
  "description": "Review Q4 reports",
  "dueDate": "2025-11-20T14:00:00Z",
  "priority": "high"
}
```

### Update Task Status
```http
PATCH /api/chat/tasks/123/status
Content-Type: application/json
Authorization: Bearer <token>

{
  "status": "completed"
}
```

## 💬 Example Conversations

### Task Creation
```
User: "create a task for tomorrow 5pm to approve bills"
Bot: ✅ Task created successfully for tomorrow at 17:00!
     📝 "approve bills"
     🆔 Task ID: 123
     ⚡ Priority: MEDIUM

User: "remind me to check inventory next Monday"
Bot: ✅ Task created successfully for next Monday!
     📝 "check inventory"
     🆔 Task ID: 124
     ⚡ Priority: MEDIUM
```

### View Tasks
```
User: "show my pending tasks"
Bot: 📋 Your Pending Tasks (3 total):

     1. 🔴 Approve budget - Due: today
     2. 🟡 Review reports - Due: tomorrow
     3. 🟢 Team meeting - Due: in 3 days

     ⚠️ 1 task(s) overdue
     📅 1 task(s) due today
```

### Payment Request
```
User: "create payment request for Rs.50000 to vendor ABC"
Bot: 💰 Creating payment request:
     💵 Amount: ₹50,000
     👤 Vendor: ABC
     📄 Invoice: new
     ✅ Payment request will be submitted for approval.
```

### Typo Handling
```
User: "chek my atendance"  (typos: chek → check, atendance → attendance)
Bot: 📅 Opening your attendance record...
     ℹ️ You can view your attendance history, present days, and leave balance.
```

### Low Confidence
```
User: "something about the stuff"
Bot: I didn't fully understand that. Did you mean:
     1) Create task
     2) Check payment
     3) Search user
     
     Or you can tell me more.
```

## 🎯 Confidence Levels

The system uses three confidence thresholds:

1. **< 0.6 (Low)** - Asks clarifying questions or suggests options
2. **0.6 - 0.85 (Medium)** - Asks for confirmation
3. **> 0.85 (High)** - Executes intent immediately

## 🔧 Entity Extraction Examples

The system automatically extracts:

| Entity Type | Examples |
|------------|----------|
| **Amount** | $100, Rs.500, ₹1000, 500 rupees |
| **Date** | today, tomorrow, next Monday, 12/25/2024 |
| **Time** | 5pm, 17:00, 2:30 PM |
| **Invoice ID** | PR-123, INV-456, bill #789 |
| **Vehicle ID** | MH12AB1234, vehicle #V123 |
| **Priority** | urgent, high, low priority |
| **Duration** | 3 days, 2 weeks, 1 month |
| **Leave Type** | sick leave, casual leave |

## 🧪 Testing

### Test Intent Detection
```typescript
import { intentService } from './services/chat/intentService';

const result = intentService.detectIntent("create a task for tomorrow");
console.log(result);
// { intent: 'create_task', confidence: 0.95, ... }
```

### Test Entity Extraction
```typescript
import { entityService } from './services/chat/entityService';

const entities = entityService.extractEntities(
  "create payment of Rs.5000 for tomorrow 5pm"
);
console.log(entities);
// { amount: 5000, currency: 'INR', date: Date, time: '17:00', ... }
```

### Test Fuzzy Matching
```typescript
import { fuzzyService } from './services/chat/fuzzyService';

const corrected = fuzzyService.correctSentence("chek my paymnt status");
console.log(corrected);
// "check my payment status"
```

## 📊 Response Structure

All chat responses follow this structure:

```typescript
{
  reply: string;              // User-facing message
  intent: string;             // Detected intent
  confidence: number;         // 0-1 confidence score
  entities: object;           // Extracted entities
  nextAction: string;         // ASK_CLARIFICATION | EXECUTE | FALLBACK | SUGGEST_OPTIONS
  suggestions?: string[];     // Suggested actions
  data?: any;                // Additional data (tasks, etc.)
  requiresAuth?: boolean;    // Requires authentication
}
```

## 🔐 Security

- All endpoints require authentication via `authMiddleware`
- User can only access their own tasks
- SQL injection protection via parameterized queries
- Input validation on all endpoints

## 📈 Performance

- **No external API calls** - Everything runs locally
- **Fast intent detection** - Pattern matching + fuzzy logic
- **Optimized database queries** - Indexed columns
- **Conversation context caching** - In-memory storage

## 🛠️ Customization

### Add New Intent

1. Add pattern to `intentService.ts`:
```typescript
{
  intent: 'custom_intent',
  patterns: [/\bcustom\s+action\b/i],
  keywords: ['custom', 'action'],
  weight: 1.0,
}
```

2. Add handler in `chatService.ts`:
```typescript
case 'custom_intent':
  return this.handleCustomIntent(userId, entities);
```

### Add Custom Dictionary Words

```typescript
import { fuzzyService } from './services/chat/fuzzyService';

fuzzyService.addToDictionary(['newword1', 'newword2']);
```

## 🎨 Frontend Integration Example

```typescript
// Send message
const sendMessage = async (message: string) => {
  const response = await fetch('/api/chat/message', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ message }),
  });
  
  const data = await response.json();
  return data.data; // ChatResponse object
};

// Usage
const response = await sendMessage("create a task for tomorrow");
console.log(response.reply); // Display to user
```

## 📝 Logging

All operations are logged:
- Intent detection results
- Entity extraction
- Task creation/updates
- Errors and failures

## 🚨 Error Handling

The system includes comprehensive error handling:
- Database connection errors
- Invalid input validation
- Authentication failures
- Graceful fallbacks

## 📚 Additional Resources

- `CHAT_QUICK_START.md` - Quick start guide
- `CHAT_INTERFACE_DOCUMENTATION.md` - UI integration guide
- API documentation - See route comments in `chatRoutes.ts`

## 🤝 Contributing

To add new features:
1. Add intent patterns
2. Add entity extraction logic
3. Add handler in chat service
4. Update documentation

## 📄 License

Internal use only - BISMAN ERP

---

**Built with ❤️ for BISMAN ERP** - No AI models required! 🎉
