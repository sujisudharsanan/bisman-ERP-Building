# Chat Database Tables - Analysis 📊

**Date**: November 27, 2025  
**Database**: PostgreSQL (Railway hosted)  
**ORM**: Prisma

---

## ✅ YES - You Have Dedicated Chat Tables!

Your database **DOES** have separate tables for the chat module. Here's what exists:

---

## 📋 Chat-Related Tables in Your Database

### 1. **`threads` Table** ✅
**Purpose**: Store chat threads/conversations

**Schema**:
```prisma
model Thread {
  id          String   @id @default(cuid())
  title       String?  @db.VarChar(200)
  createdById Int
  createdAt   DateTime @default(now()) @db.Timestamp(6)
  updatedAt   DateTime @default(now()) @updatedAt @db.Timestamp(6)

  createdBy User           @relation("ThreadCreatedBy", fields: [createdById], references: [id])
  members   ThreadMember[]
  callLogs  CallLog[]
}
```

**Columns**:
- `id` - Unique thread identifier (CUID)
- `title` - Thread name (optional, max 200 chars)
- `createdById` - User who created the thread
- `createdAt` - Thread creation timestamp
- `updatedAt` - Last update timestamp

**Indexes**:
- `idx_threads_creator` on `createdById`

**Relations**:
- ← User (creator)
- → ThreadMember[] (members)
- → CallLog[] (call history)

---

### 2. **`thread_members` Table** ✅
**Purpose**: Track users in each thread with their roles

**Schema**:
```prisma
model ThreadMember {
  id       String    @id @default(cuid())
  threadId String
  userId   Int
  role     String    @default("member") @db.VarChar(50)
  joinedAt DateTime  @default(now()) @db.Timestamp(6)
  leftAt   DateTime?
  isActive Boolean   @default(true)

  thread Thread @relation(fields: [threadId], references: [id])
  user   User   @relation(fields: [userId], references: [id])
}
```

**Columns**:
- `id` - Unique member record ID
- `threadId` - Reference to thread
- `userId` - User in the thread
- `role` - User role: `member` | `moderator` | `admin`
- `joinedAt` - When user joined
- `leftAt` - When user left (nullable)
- `isActive` - Whether user is currently active

**Indexes**:
- `idx_thread_members_user` on `userId`
- `idx_thread_members_thread` on `threadId`
- `idx_thread_members_role` on `role`

**Unique Constraint**:
- `[threadId, userId]` - One user per thread

---

### 3. **`call_logs` Table** ✅
**Purpose**: Track video/audio calls (Jitsi integration)

**Schema**:
```prisma
model CallLog {
  id               String    @id @default(cuid())
  room_name        String    @db.VarChar(255)
  thread_id        String
  initiator_id     Int
  call_type        String    @default("audio") @db.VarChar(20)
  status           String    @default("ringing") @db.VarChar(30)
  started_at       DateTime  @default(now()) @db.Timestamp(6)
  ended_at         DateTime?
  duration_seconds Int?      @default(0)
  participants     Json?
  recording_url    String?
  transcript_url   String?
  quality_metrics  Json?
  consent_recorded Boolean   @default(false)
  created_at       DateTime  @default(now()) @db.Timestamp(6)
  updated_at       DateTime  @default(now()) @updatedAt @db.Timestamp(6)

  thread    Thread @relation(fields: [thread_id], references: [id])
  initiator User   @relation(fields: [initiator_id], references: [id])
}
```

**Columns**:
- `id` - Unique call log ID
- `room_name` - Jitsi room name (max 255 chars)
- `thread_id` - Associated thread
- `initiator_id` - User who started the call
- `call_type` - `audio` | `video`
- `status` - `ringing` | `active` | `ended` | `missed` | `failed`
- `started_at` - Call start time
- `ended_at` - Call end time (nullable)
- `duration_seconds` - Call duration
- `participants` - JSON array: `[{user_id, joined_at, left_at}]`
- `recording_url` - Call recording link (optional)
- `transcript_url` - Call transcript link (optional)
- `quality_metrics` - JSON: Quality/performance data
- `consent_recorded` - Whether recording consent was obtained

**Indexes**:
- `idx_call_logs_thread` on `thread_id`
- `idx_call_logs_initiator` on `initiator_id`
- `idx_call_logs_room` on `room_name`

---

## ⚠️ Missing: Chat Messages Table

### Current Situation
You have a `messages` table, but it's **specifically for task messages**, not general chat:

```prisma
model Message {
  id       String @id @default(cuid())
  taskId   String  // ← Tied to tasks, not chat threads!
  senderId Int
  body     String? @db.Text
  type     String  @default("TEXT") // TEXT | APPROVAL | SYSTEM | PAYMENT
  // ...
  task   Task @relation(fields: [taskId], references: [id])
}
```

**This table is for**:
- Task comments/updates
- Payment approvals
- System notifications within tasks

**This table is NOT for**:
- General chat conversations
- Thread-based messaging
- AI assistant chat history

---

## 🔧 What You Need to Add

### Recommended: Create `thread_messages` Table

You need a separate table for chat messages within threads:

```prisma
model ThreadMessage {
  id         String    @id @default(cuid())
  threadId   String
  senderId   Int
  content    String    @db.Text
  type       String    @default("text") @db.VarChar(50)
  // text | image | file | audio | video | system
  
  attachments Json? // [{name, url, type, size, mimeType}]
  replyToId   String?   // For threading/replies
  reactions   Json?     // [{emoji, userId, createdAt}]
  
  isEdited    Boolean   @default(false)
  editedAt    DateTime?
  isDeleted   Boolean   @default(false)
  deletedAt   DateTime?
  
  readBy      Json?     // [{userId, readAt}]
  
  createdAt   DateTime  @default(now()) @db.Timestamp(6)
  updatedAt   DateTime  @default(now()) @updatedAt @db.Timestamp(6)

  thread     Thread         @relation(fields: [threadId], references: [id], onDelete: Cascade)
  sender     User           @relation("ThreadMessageSender", fields: [senderId], references: [id])
  replyTo    ThreadMessage? @relation("MessageReplies", fields: [replyToId], references: [id])
  replies    ThreadMessage[] @relation("MessageReplies")

  @@index([threadId], map: "idx_thread_messages_thread")
  @@index([senderId], map: "idx_thread_messages_sender")
  @@index([createdAt], map: "idx_thread_messages_created")
  @@index([type], map: "idx_thread_messages_type")
  @@map("thread_messages")
}
```

### Optional: AI Chat History Table

For storing AI assistant conversations separately:

```prisma
model AIChatHistory {
  id        String   @id @default(cuid())
  userId    Int
  message   String   @db.Text
  response  String   @db.Text
  model     String?  @db.VarChar(100) // e.g., "llama3", "gpt-4"
  tokens    Int?     // Token count
  duration  Int?     // Response time in ms
  context   Json?    // Conversation context
  feedback  String?  @db.VarChar(20) // helpful | not-helpful
  createdAt DateTime @default(now()) @db.Timestamp(6)

  user User @relation("AIChatHistory", fields: [userId], references: [id])

  @@index([userId], map: "idx_ai_chat_user")
  @@index([createdAt], map: "idx_ai_chat_created")
  @@map("ai_chat_history")
}
```

---

## 📝 Migration Steps

### 1. Update Prisma Schema

Add the new models to `my-backend/prisma/schema.prisma`:

```bash
cd my-backend
# Edit schema.prisma and add ThreadMessage and AIChatHistory models
```

### 2. Create Migration

```bash
npx prisma migrate dev --name add_chat_messages_tables
```

This will:
- Generate SQL migration files
- Apply changes to your local database
- Update Prisma Client types

### 3. Push to Railway (Production)

```bash
npx prisma migrate deploy
```

Or let Railway auto-migrate on next deployment.

---

## 🔍 Current Table Summary

| Table | Purpose | Status | Used By |
|-------|---------|--------|---------|
| `threads` | Chat conversations | ✅ Exists | Chat module |
| `thread_members` | Thread participants | ✅ Exists | Chat module |
| `call_logs` | Video/audio calls | ✅ Exists | Jitsi integration |
| `messages` | **Task messages only** | ✅ Exists | Task workflow |
| `thread_messages` | **Chat messages** | ❌ **MISSING** | **Needs creation** |
| `ai_chat_history` | AI conversations | ❌ Optional | AI assistant |

---

## 🚀 What This Means for Your Chat Module

### Currently Working ✅
- Thread creation and management
- User membership tracking
- Call initiation and logging
- Call participant tracking
- Call recording/transcript metadata

### Needs Database Update ⚠️
- **Sending/receiving messages in threads** - No table to store them!
- Message history retrieval
- Message editing/deletion
- Message reactions
- Read receipts
- Message search

### Temporary Workaround
Your chat routes might currently be:
1. Using in-memory storage (data lost on restart)
2. Using the task `messages` table (incorrect usage)
3. Storing in Redis/cache (not persistent)
4. Not persisting messages at all (real-time only)

---

## 🎯 Recommendation

**Priority: HIGH** 🔴

You should create the `thread_messages` table **as soon as possible** because:

1. **Data Persistence**: Messages won't survive server restarts
2. **Message History**: Users can't see past conversations
3. **Search**: Can't search through chat history
4. **Analytics**: Can't track message patterns
5. **Audit Trail**: No record of communications

---

## 📋 Quick Action Checklist

- [ ] Create `thread_messages` model in Prisma schema
- [ ] (Optional) Create `ai_chat_history` model
- [ ] Run `npx prisma migrate dev`
- [ ] Test locally with message sending
- [ ] Update chat routes to use new table
- [ ] Deploy migration to Railway
- [ ] Verify in production

---

## 💡 Example Migration File

File: `my-backend/prisma/migrations/YYYYMMDD_add_chat_messages/migration.sql`

```sql
-- CreateTable
CREATE TABLE "thread_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "attachments" JSONB,
    "replyToId" TEXT,
    "reactions" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(6),
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(6),
    "readBy" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thread_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_thread_messages_thread" ON "thread_messages"("threadId");
CREATE INDEX "idx_thread_messages_sender" ON "thread_messages"("senderId");
CREATE INDEX "idx_thread_messages_created" ON "thread_messages"("createdAt");
CREATE INDEX "idx_thread_messages_type" ON "thread_messages"("type");

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_threadId_fkey" 
    FOREIGN KEY ("threadId") REFERENCES "threads"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thread_messages" ADD CONSTRAINT "thread_messages_senderId_fkey" 
    FOREIGN KEY ("senderId") REFERENCES "users"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 🔗 Related Documentation

- Schema file: `my-backend/prisma/schema.prisma`
- Chat routes: `my-backend/modules/chat/routes/messages.js`
- Frontend service: `my-frontend/src/modules/chat/services/chatApi.ts`

---

**Summary**: You have chat infrastructure tables (threads, members, calls) but are **missing the actual messages table**. This needs to be added for full chat functionality.
