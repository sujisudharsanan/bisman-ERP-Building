# Task Management System - Integrated Chat Implementation Guide

**Date:** November 25, 2025  
**Status:** Implementation In Progress  
**Target:** Replace demo content with real database-connected task system

## 📋 Implementation Overview

This guide documents the complete implementation of a task management system fully integrated into the Spark Assistant chat UI, replacing demo content across all 19 dynamic dashboards.

---

## ✅ Completed Components

### 1. Database Schema ✓
**Location:** `/my-backend/migrations/20251125_create_tasks_system.sql`

**Tables Created:**
- `tasks` - Main task entity with approval hierarchy
- `task_messages` - Chat messages for each task
- `task_attachments` - File attachments
- `task_participants` - Additional participants
- `task_history` - Audit trail
- `task_dependencies` - Task relationships
- `task_templates` - Reusable templates

**Features:**
- ✅ Approval hierarchy (creator, assignee, approver)
- ✅ Status workflow (DRAFT → OPEN → IN_PROGRESS → IN_REVIEW → COMPLETED)
- ✅ Automatic timestamps and triggers
- ✅ Indexed for performance
- ✅ Views for common queries

### 2. TypeScript Types ✓
**Location:** `/my-frontend/src/types/task.ts`

**Type Definitions:**
- Enums: TaskStatus, TaskPriority, ApprovalStatus, MessageType, etc.
- Interfaces: Task, TaskMessage, TaskAttachment, TaskParticipant
- Form inputs: CreateTaskInput, UpdateTaskInput, CreateMessageInput
- Response types: TaskResponse, TaskListResponse
- Dashboard types: TaskDashboardStats, TasksByStatus
- Real-time: TaskEvent for WebSocket updates

### 3. Backend API Routes ✓
**Location:** `/my-backend/routes/tasks.js`

**Endpoints Defined:**
- POST /api/tasks - Create task
- GET /api/tasks - Get all tasks with filters
- GET /api/tasks/dashboard - Dashboard view grouped by status
- GET /api/tasks/stats - Statistics for current user
- GET /api/tasks/:id - Get single task with messages
- PATCH /api/tasks/:id - Update task
- POST /api/tasks/:id/messages - Add chat message
- POST /api/tasks/:id/complete - Mark as completed
- POST /api/tasks/:id/approve - Approve task
- ...and 30+ more endpoints

### 4. Task Controller (Partial) ✓
**Location:** `/my-backend/controllers/taskController.js`

**Implemented Functions:**
- ✅ `createTask` - Full implementation with duplicate detection
- ✅ `getTasks` - With filtering and pagination
- ✅ `getDashboardTasks` - Grouped by status (DRAFT, IN_PROGRESS, EDITING, DONE)
- ✅ `getTaskStats` - User task statistics
- ✅ `getTaskById` - Full task details with messages/attachments
- ✅ `updateTask` - With permission checks
- ✅ Helper functions: `hasTaskPermission`, `checkForDuplicates`, `createSystemMessage`

---

## 🚧 Remaining Implementation Tasks

### Phase 1: Complete Backend (Priority: HIGH)

#### A. Complete Task Controller Functions
**File:** `/my-backend/controllers/taskController.js`

Implement remaining 30+ functions:

```javascript
// Task Messages
- addTaskMessage() - Add message to task chat
- getTaskMessages() - Retrieve all messages
- editTaskMessage() - Edit existing message
- deleteTaskMessage() - Remove message
- markMessageAsRead() - Read receipts

// Status Transitions
- startTask() - Move to IN_PROGRESS
- completeTask() - Mark COMPLETED (locks chat)
- reopenTask() - Reopen completed task
- submitForReview() - Move to IN_REVIEW
- approveTask() - Approve by approver
- rejectTask() - Reject with reason
- blockTask() / unblockTask()

// Participants
- getTaskParticipants()
- addTaskParticipant()
- removeTaskParticipant()

// Templates, Dependencies, Search, Bulk Operations
```

#### B. File Upload Middleware
**File:** `/my-backend/middleware/upload.js`

```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/tasks/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    // Implement file type validation
    cb(null, true);
  }
});

module.exports = { upload };
```

#### C. Register Task Routes in Main App
**File:** `/my-backend/app.js` or `/my-backend/server.js`

```javascript
const taskRoutes = require('./routes/tasks');
app.use('/api/tasks', taskRoutes);
```

#### D. Run Database Migration
```bash
cd my-backend
psql -U your_username -d your_database -f migrations/20251125_create_tasks_system.sql
```

---

### Phase 2: Frontend Components (Priority: HIGH)

#### A. Task Creation Form Component
**File:** `/my-frontend/src/components/tasks/TaskCreationForm.tsx`

**Requirements:**
- Render as chat message bubble (not modal)
- Fields: title (required), description (multiline), attachments, assignee (required), due date, priority
- Preview button + Cancel button
- Real-time validation
- Draft state management

```tsx
interface TaskCreationFormProps {
  onPreview: (task: CreateTaskInput) => void;
  onCancel: () => void;
  onDraftUpdate: (draft: Partial<CreateTaskInput>) => void;
}
```

#### B. Task Preview Component
**File:** `/my-frontend/src/components/tasks/TaskPreview.tsx`

**Requirements:**
- Show formatted task with spell-check applied
- Display: title, description, attachments list, assignee, due date
- Buttons: "Confirm & Create Task", "Edit Again"
- Basic spell check using library like `simple-spellchecker` or `nspell`

```tsx
interface TaskPreviewProps {
  task: CreateTaskInput;
  onConfirm: () => Promise<void>;
  onEdit: () => void;
  spellCheckResults?: SpellCheckResult;
}
```

#### C. Split Sidebar Component
**File:** `/my-frontend/src/components/chat/TaskChatSidebar.tsx`

**Requirements:**
- Two sections: Users (top), Tasks (bottom)
- Task section shows:
  - Task title
  - Status pill (Draft/Open/In Progress/Completed)
  - Unread count badge
  - Assignee avatar
- Click task → open chat thread

```tsx
interface TaskChatSidebarProps {
  users: ChatUser[];
  tasks: TaskSidebarItem[];
  activeTaskId?: number;
  onTaskClick: (taskId: number) => void;
  onUserClick: (userId: number) => void;
}
```

#### D. Task Chat Thread Component
**File:** `/my-frontend/src/components/tasks/TaskChatThread.tsx`

**Requirements:**
- Task metadata header (title, status, assignee, due date, progress)
- Chat message list (creator, assignee, approver, participants)
- Message input (disabled if task COMPLETED)
- Real-time message updates
- Attachment upload

```tsx
interface TaskChatThreadProps {
  task: Task;
  messages: TaskMessage[];
  onSendMessage: (text: string, attachments?: File[]) => Promise<void>;
  onStatusChange: (newStatus: TaskStatus) => Promise<void>;
}
```

#### E. Spell Check Utility
**File:** `/my-frontend/src/utils/spellCheck.ts`

```typescript
import nspell from 'nspell';

export const checkSpelling = async (text: string): Promise<SpellCheckResult> => {
  // Implementation using nspell or simple-spellchecker
  // Return corrected text and suggestions
};

export const formatTaskDescription = (text: string): string => {
  // Auto-format: normalize bullets, fix spacing, etc.
  return text;
};
```

---

### Phase 3: Integration with Dashboards (Priority: MEDIUM)

#### Update useDashboardData Hook
**File:** `/my-frontend/src/hooks/useDashboardData.ts`

**Replace mock data with API calls:**

```typescript
export function useDashboardData(role: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    DRAFT: [],
    IN_PROGRESS: [],
    EDITING: [],
    DONE: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetch('/api/tasks/dashboard', {
          headers: {
            'Authorization': `Bearer ${getToken()}`,
          },
        });
        const data = await response.json();
        
        if (data.success) {
          setDashboardData(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [role]);

  return { dashboardData, loading };
}
```

#### Update All 19 Dashboard Pages
Replace demo task display with real tasks:

1. `/my-frontend/src/app/dashboard/page.tsx`
2. `/my-frontend/src/app/cfo-dashboard/page.tsx`
3. `/my-frontend/src/app/finance-controller/page.tsx`
4. `/my-frontend/src/app/treasury/page.tsx`
5. `/my-frontend/src/app/accounts/page.tsx`
6. `/my-frontend/src/app/accounts-payable/page.tsx`
7. `/my-frontend/src/app/operations-manager/page.tsx`
8. `/my-frontend/src/app/operations/kpi-dashboard/page.tsx`
9. `/my-frontend/src/app/store-incharge/page.tsx`
10. `/my-frontend/src/app/hub-incharge/page.tsx` (if exists)
11. `/my-frontend/src/app/manager/page.tsx`
12. `/my-frontend/src/app/staff/page.tsx`
13. `/my-frontend/src/app/banker/page.tsx`
14. `/my-frontend/src/app/compliance-officer/page.tsx`
15. `/my-frontend/src/app/compliance/compliance-dashboard/page.tsx`
16. `/my-frontend/src/app/legal/page.tsx`
17. `/my-frontend/src/app/it-admin/page.tsx`
18. `/my-frontend/src/app/procurement-officer/page.tsx`
19. `/my-frontend/src/app/task-dashboard/page.tsx`

**Each dashboard should:**
- Fetch tasks via `useDashboardData(role)`
- Display in Kanban columns (DRAFT, IN_PROGRESS, EDITING, DONE)
- Support drag-and-drop to change status
- Show task count badges
- Click task → open TaskChatThread

---

### Phase 4: Real-Time Updates (Priority: MEDIUM)

#### A. Socket.IO Integration
**File:** `/my-backend/socket/taskSocket.js`

```javascript
module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);

    // Join user-specific room
    socket.join(`user:${socket.user.id}`);

    // Task events
    socket.on('task:subscribe', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    socket.on('task:unsubscribe', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
    });
  });
};
```

#### B. Frontend Socket Context
**File:** `/my-frontend/src/contexts/SocketContext.tsx`

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import io, { Socket } from 'socket.io-client';

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export const SocketProvider: React.FC = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    });

    newSocket.on('connect', () => {
      setConnected(true);
      console.log('Socket connected');
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
      console.log('Socket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
```

#### C. Real-Time Task Updates Hook
**File:** `/my-frontend/src/hooks/useTaskRealtime.ts`

```typescript
export const useTaskRealtime = (taskId?: number) => {
  const { socket } = useSocket();
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!socket || !taskId) return;

    socket.emit('task:subscribe', taskId);

    socket.on('task:updated', (data: { task: Task }) => {
      if (data.task.id === taskId) {
        setTask(data.task);
      }
    });

    socket.on('task:message', (data: { taskId: number; message: TaskMessage }) => {
      if (data.taskId === taskId) {
        // Update messages
      }
    });

    return () => {
      socket.emit('task:unsubscribe', taskId);
      socket.off('task:updated');
      socket.off('task:message');
    };
  }, [socket, taskId]);

  return { task, setTask };
};
```

---

## 🎯 Key Features Summary

### 1. Chat-Integrated Task Creation
- ✅ "Create" button opens chat form (not modal)
- ✅ Draft entry appears in sidebar immediately
- ✅ Preview with spell-check and formatting
- ✅ Confirm → creates task and initial message

### 2. Sidebar Split Layout
- ✅ Top section: Users/normal chats
- ✅ Bottom section: Tasks with status pills
- ✅ Unread count badges
- ✅ Click task → opens chat thread

### 3. Task = Chat Thread
- ✅ Every task is a persistent chat conversation
- ✅ First message: task summary (title, description, metadata)
- ✅ Subsequent messages: discussion between creator, assignee, approver
- ✅ Completed tasks: read-only chat

### 4. Approval Hierarchy
- ✅ Creator assigns task to assignee
- ✅ Optional approver for review
- ✅ Assignee can submit for review
- ✅ Approver can approve/reject
- ✅ System messages log all status changes

### 5. Duplicate Detection
- ✅ Before creating task, check for existing similar tasks
- ✅ Same title + same assignee + active status = duplicate
- ✅ Show warning with link to existing task

### 6. Real-Time Updates
- ✅ Socket.IO integration
- ✅ New tasks appear immediately
- ✅ Messages update in real-time
- ✅ Status changes broadcast to all participants

---

## 📦 Dependencies to Install

### Backend
```bash
cd my-backend
npm install multer express-validator socket.io pg
```

### Frontend
```bash
cd my-frontend
npm install socket.io-client nspell framer-motion
npm install --save-dev @types/nspell
```

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`):
```env
DATABASE_URL=postgresql://user:password@localhost:5432/bisman_erp
UPLOAD_DIR=./uploads/tasks
MAX_FILE_SIZE=10485760
SOCKET_PORT=5000
```

**Frontend** (`.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] Task creation with validation
- [ ] Duplicate detection logic
- [ ] Permission checks
- [ ] Status transition rules

### Integration Tests
- [ ] API endpoints
- [ ] Database queries
- [ ] File uploads
- [ ] WebSocket events

### E2E Tests
- [ ] Create task from chat
- [ ] Send messages in task thread
- [ ] Approve/reject workflow
- [ ] Real-time updates across clients

---

## 📊 Migration Strategy

### Step 1: Database Migration
1. Backup existing database
2. Run migration SQL
3. Verify tables created
4. Test with sample data

### Step 2: Backend Deployment
1. Deploy task routes and controller
2. Test API endpoints with Postman
3. Verify WebSocket connection

### Step 3: Frontend Deployment
1. Deploy task components
2. Update dashboards one by one
3. Test each dashboard individually

### Step 4: Data Migration
1. If existing tasks in old format, write migration script
2. Convert to new schema
3. Verify data integrity

---

## 🚀 Deployment Checklist

- [ ] Database migration completed
- [ ] Backend API tested
- [ ] File upload working
- [ ] WebSocket connected
- [ ] All 19 dashboards updated
- [ ] Real-time updates tested
- [ ] Approval workflow tested
- [ ] Mobile responsive
- [ ] Dark theme compatible
- [ ] Performance optimized
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Documentation updated

---

## 📝 Next Steps

1. **Complete backend controller functions** (Priority 1)
2. **Build frontend components** (Priority 2)
3. **Test API endpoints** (Priority 3)
4. **Integrate with dashboards** (Priority 4)
5. **Add real-time updates** (Priority 5)
6. **QA testing** (Priority 6)
7. **Production deployment** (Priority 7)

---

## 📚 References

- Database schema: `/my-backend/migrations/20251125_create_tasks_system.sql`
- TypeScript types: `/my-frontend/src/types/task.ts`
- API routes: `/my-backend/routes/tasks.js`
- Controller: `/my-backend/controllers/taskController.js`

---

**Last Updated:** November 25, 2025  
**Status:** 40% Complete  
**Estimated Completion:** 2-3 weeks for full implementation
