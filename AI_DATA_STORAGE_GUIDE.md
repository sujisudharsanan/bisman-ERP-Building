# 📁 AI Chat History & Timestamp Storage - Complete Guide

## 🗂️ Where Data is Being Saved

### Overview
The Enhanced AI Chat system stores data in **3 locations**:

1. **Memory (Runtime)** - Active during server runtime
2. **JSON Files** - Persistent storage on disk
3. **Database** - For tasks and approvals (via API queries)

---

## 📊 Data Storage Breakdown

### 1. **In-Memory Storage (Runtime)**

Located in: `/my-backend/services/ai/enhancedChatEngine.js`

#### A. Conversation History
```javascript
this.conversationHistory = new Map();
// Structure: Map<userId, Array<Interaction>>
```

**What's stored:**
```javascript
{
  userId: "123",
  conversations: [
    {
      userId: "123",
      timestamp: "2025-11-14T10:30:00.000Z",  // ← TIMESTAMP
      message: "show my tasks",
      intent: "list_tasks",
      entities: { ... },
      response: "Here are your tasks...",
      feedback: "positive"
    },
    // ... more interactions
  ]
}
```

**Where in code:**
```javascript
// File: my-backend/services/ai/enhancedChatEngine.js
// Line: ~328

// Update conversation history
if (!this.conversationHistory.has(userId)) {
  this.conversationHistory.set(userId, []);
}
this.conversationHistory.get(userId).push(interaction);
```

---

#### B. User Preferences
```javascript
this.userPreferences = new Map();
// Structure: Map<userId, Preferences>
```

**What's stored:**
```javascript
{
  userId: "123",
  preferences: {
    firstName: "John",
    lastVisit: "2025-11-14T10:30:00.000Z",  // ← TIMESTAMP
    visitCount: 12
  }
}
```

**Where in code:**
```javascript
// File: my-backend/services/ai/enhancedChatEngine.js
// Line: ~394

// Update last visit
this.userPreferences.set(userId, {
  ...userPrefs,
  lastVisit: now.toISOString(),  // ← SAVES TIMESTAMP
  visitCount: (userPrefs.visitCount || 0) + 1,
  firstName: firstName
});
```

---

### 2. **JSON Files (Persistent Storage)**

Location: `/my-backend/data/`

#### A. Training Data File
**File:** `my-backend/data/chat-training.json`

**What's stored:**
```json
[
  {
    "id": "1731578400000",
    "userId": "123",
    "timestamp": "2025-11-14T10:30:00.000Z",
    "message": "show my tasks",
    "intent": "list_tasks",
    "entities": {},
    "response": "Here are your tasks...",
    "feedback": "positive",
    "source": "user_interaction"
  },
  {
    "id": "correction-456",
    "userId": "123",
    "timestamp": "2025-11-14T10:35:00.000Z",
    "message": "show tax reports",
    "intent": "get_report",
    "source": "user_correction"
  }
]
```

**When saved:**
- Every 10 interactions (automatic)
- When admin adds training examples
- When user submits corrections
- On server shutdown (if implemented)

**Code location:**
```javascript
// File: my-backend/services/ai/enhancedChatEngine.js
// Line: ~649-660

async saveTrainingData() {
  const dirPath = path.join(__dirname, '../../data');
  await fs.mkdir(dirPath, { recursive: true });
  
  const filePath = path.join(dirPath, 'chat-training.json');
  await fs.writeFile(filePath, JSON.stringify(this.trainingData, null, 2));
}
```

---

#### B. Feedback Data File
**File:** `my-backend/data/chat-feedback.json`

**What's stored:**
```json
[
  {
    "userId": "123",
    "messageId": "msg-456",
    "timestamp": "2025-11-14T10:30:00.000Z",
    "helpful": true,
    "type": "user_feedback"
  },
  {
    "id": "correction-789",
    "userId": "123",
    "timestamp": "2025-11-14T10:35:00.000Z",
    "original": "show taks",
    "corrected": "show tax reports",
    "context": { "intent": "get_report" },
    "type": "user_correction",
    "learned": true
  }
]
```

**When saved:**
- When user gives feedback (👍👎)
- When user submits corrections
- When spelling corrections are confirmed

**Code location:**
```javascript
// File: my-backend/services/ai/enhancedChatEngine.js
// Line: ~683-692

async saveFeedback() {
  const dirPath = path.join(__dirname, '../../data');
  await fs.mkdir(dirPath, { recursive: true });
  
  const filePath = path.join(dirPath, 'chat-feedback.json');
  await fs.writeFile(filePath, JSON.stringify(this.feedbackData, null, 2));
}
```

---

### 3. **Database Storage**

Location: PostgreSQL database (via queries)

#### Pending Tasks
```sql
-- Query in: my-backend/routes/ai-training.js
-- Line: ~222-233

SELECT id, title, description, due_date, priority, status 
FROM tasks 
WHERE assigned_to = $1 
  AND status IN ('pending', 'in_progress')
ORDER BY priority, due_date
```

#### Pending Approvals
```sql
-- Query in: my-backend/routes/ai-training.js
-- Line: ~236-247

SELECT id, request_type, requester_id, description, 
       created_at, priority
FROM approval_requests 
WHERE approver_id = $1 
  AND status = 'pending'
ORDER BY priority, created_at DESC
```

#### New Approvals (Since Last Visit)
```sql
-- Query in: my-backend/routes/ai-training.js
-- Line: ~183-187

SELECT COUNT(*) as count 
FROM approval_requests 
WHERE approver_id = $1 
  AND created_at > $2  -- Last visit timestamp
```

---

## 🔄 Data Flow: When & How Data is Saved

### Timeline of a Conversation

```
1. User Opens Chat
   ├─> Frontend calls: POST /api/ai/chat { message: "hello" }
   └─> Backend:
       ├─> Gets user preferences from MEMORY
       ├─> Updates lastVisit timestamp (IN MEMORY)
       ├─> Queries database for pending items
       └─> Returns personalized greeting

2. User Sends Message
   ├─> Frontend calls: POST /api/ai/chat { message: "show tasks" }
   └─> Backend:
       ├─> Processes message
       ├─> Stores interaction in MEMORY (conversationHistory)
       ├─> Stores in trainingData array (MEMORY)
       └─> Returns response

3. Every 10 Interactions
   └─> Automatically saves to FILE:
       └─> /my-backend/data/chat-training.json

4. User Gives Feedback (👍/👎)
   ├─> Frontend calls: POST /api/ai/feedback
   └─> Backend:
       ├─> Adds to feedbackData array (MEMORY)
       └─> Saves to FILE:
           └─> /my-backend/data/chat-feedback.json

5. User Submits Correction
   ├─> Frontend calls: POST /api/ai/user-correction
   └─> Backend:
       ├─> Stores in feedbackData (MEMORY)
       ├─> Adds to trainingData (MEMORY)
       ├─> Saves both FILES immediately
       └─> Updates classifier (MEMORY)
```

---

## 📍 Exact File Paths

### Storage Locations on Disk

```
/Users/abhi/Desktop/BISMAN ERP/
└── my-backend/
    └── data/                              ← Created automatically
        ├── chat-training.json            ← Training data + all interactions
        └── chat-feedback.json            ← User feedback + corrections
```

**Initial state:** These files don't exist until first save

**Auto-created when:**
- First interaction is stored (after 10 interactions)
- First feedback is given
- First correction is submitted

---

## 📝 Code Locations - Quick Reference

### Saving Functions

| Function | File | Line | What it Saves |
|----------|------|------|---------------|
| `saveTrainingData()` | enhancedChatEngine.js | ~649 | Training data to JSON |
| `saveFeedback()` | enhancedChatEngine.js | ~683 | Feedback data to JSON |
| `learnFromInteraction()` | enhancedChatEngine.js | ~312 | Stores in memory + training |
| `storeUserCorrection()` | enhancedChatEngine.js | ~420 | Correction + auto-save |

### Loading Functions

| Function | File | Line | What it Loads |
|----------|------|------|---------------|
| `loadTrainingData()` | enhancedChatEngine.js | ~634 | Loads from chat-training.json |
| `loadUserFeedback()` | enhancedChatEngine.js | ~664 | Loads from chat-feedback.json |
| `init()` | enhancedChatEngine.js | ~70 | Initializes and loads all data |

---

## 🔍 How to View Saved Data

### Method 1: Check Files Directly

```bash
# View training data
cat /Users/abhi/Desktop/BISMAN\ ERP/my-backend/data/chat-training.json

# View feedback data
cat /Users/abhi/Desktop/BISMAN\ ERP/my-backend/data/chat-feedback.json

# Pretty print
cat my-backend/data/chat-training.json | python3 -m json.tool
```

### Method 2: Use API Endpoints

```bash
# Get user history
curl http://localhost:3000/api/ai/user-history/123

# Get training data
curl http://localhost:3000/api/ai/training

# Get statistics
curl http://localhost:3000/api/ai/stats
```

### Method 3: Admin Dashboard

```
Navigate to: http://localhost:3000/ai-training
- View all training data
- See statistics
- Export/download data
```

---

## 💾 Data Persistence

### What Survives Server Restart

✅ **Persists (Saved to Disk):**
- Training data → `chat-training.json`
- User feedback → `chat-feedback.json`
- User corrections → `chat-training.json`

❌ **Lost on Restart (In-Memory Only):**
- conversationHistory Map
- userPreferences Map
- commonMistakes Map
- stats object

### Solution: Save Preferences to File

To make user preferences persistent, we need to add save/load functions. Let me create that:

---

## 🔧 Making User Preferences Persistent

### Current Issue
User preferences (firstName, lastVisit, visitCount) are only in memory and lost on server restart.

### Recommended Solution
Add a third JSON file for preferences:

```javascript
// File: my-backend/data/user-preferences.json
{
  "user_123": {
    "firstName": "John",
    "lastVisit": "2025-11-14T10:30:00.000Z",
    "visitCount": 12
  },
  "user_456": {
    "firstName": "Sarah",
    "lastVisit": "2025-11-14T11:00:00.000Z",
    "visitCount": 5
  }
}
```

Would you like me to implement persistent storage for user preferences?

---

## 📊 Summary Table

| Data Type | Storage Location | Format | Persistent? | Auto-Save? |
|-----------|-----------------|--------|-------------|------------|
| Conversations | Memory (Map) | JavaScript Object | ❌ No | N/A |
| User Preferences | Memory (Map) | JavaScript Object | ❌ No | N/A |
| Training Data | JSON File | chat-training.json | ✅ Yes | Every 10 interactions |
| User Feedback | JSON File | chat-feedback.json | ✅ Yes | On each feedback |
| User Corrections | JSON File | chat-training.json | ✅ Yes | Immediately |
| Pending Tasks | Database | PostgreSQL | ✅ Yes | Real-time |
| Pending Approvals | Database | PostgreSQL | ✅ Yes | Real-time |

---

## 🎯 Key Timestamps Tracked

### 1. Interaction Timestamp
```javascript
timestamp: "2025-11-14T10:30:00.000Z"
```
- Saved in: conversationHistory (memory)
- Saved in: chat-training.json (file)
- Format: ISO 8601

### 2. Last Visit Timestamp
```javascript
lastVisit: "2025-11-14T10:30:00.000Z"
```
- Saved in: userPreferences (memory)
- **Not persistent currently**
- Used for: "Welcome back! It's been X days"

### 3. Created At (Approvals)
```sql
created_at TIMESTAMP
```
- Saved in: approval_requests table (database)
- Used for: "X new approvals received"

---

## 🚀 Quick Commands

### View Current Data
```bash
# Check if files exist
ls -la my-backend/data/

# View training data
cat my-backend/data/chat-training.json

# Count interactions
cat my-backend/data/chat-training.json | grep "timestamp" | wc -l

# View recent feedback
tail -20 my-backend/data/chat-feedback.json
```

### Backup Data
```bash
# Backup all AI data
cp -r my-backend/data my-backend/data-backup-$(date +%Y%m%d)

# Export via API
curl http://localhost:3000/api/ai/training/export > backup.json
```

---

## ✅ Complete Data Storage Map

```
┌─────────────────────────────────────────────────────┐
│              USER INTERACTS WITH AI                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│                  MEMORY (Runtime)                   │
│  ┌───────────────────────────────────────────────┐ │
│  │ conversationHistory Map                       │ │
│  │ ├─ user_123: [                                │ │
│  │ │   { timestamp: "...", message: "..." }     │ │
│  │ │ ]                                           │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ userPreferences Map                           │ │
│  │ ├─ user_123:                                  │ │
│  │ │   { lastVisit: "...", visitCount: 12 }     │ │
│  └───────────────────────────────────────────────┘ │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼ (Auto-save every 10 interactions)
┌─────────────────────────────────────────────────────┐
│              DISK (JSON Files)                      │
│  ┌───────────────────────────────────────────────┐ │
│  │ chat-training.json                            │ │
│  │ [{ timestamp: "...", message: "..." }]        │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ chat-feedback.json                            │ │
│  │ [{ timestamp: "...", helpful: true }]         │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
                 │
                 ▼ (Queried on demand)
┌─────────────────────────────────────────────────────┐
│           DATABASE (PostgreSQL)                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ tasks table                                   │ │
│  │ └─ created_at, updated_at timestamps          │ │
│  └───────────────────────────────────────────────┘ │
│                                                     │
│  ┌───────────────────────────────────────────────┐ │
│  │ approval_requests table                       │ │
│  │ └─ created_at timestamp                       │ │
│  └───────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

**📍 Bottom Line:**

**History is saved in:**
1. Memory (temporary): `conversationHistory` Map
2. File (permanent): `/my-backend/data/chat-training.json`

**Timestamps are saved in:**
1. Every interaction: `timestamp: new Date().toISOString()`
2. Last visit: `lastVisit: now.toISOString()`
3. Database records: `created_at` columns

**Currently persistent:** Training data, feedback
**Currently non-persistent:** User preferences, conversation history

Would you like me to make user preferences and conversation history persistent as well?
